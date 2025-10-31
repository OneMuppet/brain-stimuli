import { openDB, DBSchema, IDBPDatabase } from "idb";
import { markLocalChange } from "./syncMetadata";
import { addPendingChange } from "./pendingChanges";
import { triggerSync } from "./syncTrigger";

export interface Session {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  updatedAt?: number;
  score: number;
  syncVersion?: number;
  syncTimestamp?: number;
}

export interface Note {
  id: string;
  sessionId: string;
  content: string;
  createdAt: number;
  lastModified: number;
  updatedAt?: number;
  syncVersion?: number;
  syncTimestamp?: number;
}

export interface Image {
  id: string;
  sessionId: string;
  data: Blob;
  contentType: string;
  timestamp: number;
  createdAt?: number;
  syncVersion?: number;
  syncTimestamp?: number;
  driveFileId?: string;
}

export interface SyncMetadata {
  id: string;
  lastSyncTimestamp: number;
  lastLocalChangeTimestamp: number;
  lastCloudTimestamp: number;
  syncVersion: number;
}

export interface PendingChange {
  id: string;
  entityType: "session" | "note" | "image";
  entityId: string;
  operation: "create" | "update" | "delete";
  timestamp: number;
  data?: any;
  retryCount: number;
}

interface BrainStimuliDB extends DBSchema {
  sessions: {
    key: string;
    value: Session;
    indexes: { createdAt: number; lastModified: number };
  };
  notes: {
    key: string;
    value: Note;
    indexes: { sessionId: string; createdAt: number; lastModified: number };
  };
  images: {
    key: string;
    value: Image;
    indexes: { sessionId: string; timestamp: number };
  };
  syncMetadata: {
    key: string;
    value: SyncMetadata;
  };
  pendingChanges: {
    key: string;
    value: PendingChange;
    indexes: { timestamp: number; entityType: string };
  };
}

let dbPromise: Promise<IDBPDatabase<BrainStimuliDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BrainStimuliDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BrainStimuliDB>("brain-stimuli-db", 2, {
      upgrade(db, oldVersion) {
        // Create sessions store (if migrating from v0)
        if (oldVersion < 1) {
          const sessionsStore = db.createObjectStore("sessions", {
            keyPath: "id",
          });
          sessionsStore.createIndex("createdAt", "createdAt");
          sessionsStore.createIndex("lastModified", "lastModified");

          // Notes store
          const notesStore = db.createObjectStore("notes", {
            keyPath: "id",
          });
          notesStore.createIndex("sessionId", "sessionId");
          notesStore.createIndex("createdAt", "createdAt");
          notesStore.createIndex("lastModified", "lastModified");

          // Images store
          const imagesStore = db.createObjectStore("images", {
            keyPath: "id",
          });
          imagesStore.createIndex("sessionId", "sessionId");
          imagesStore.createIndex("timestamp", "timestamp");
        }
        
        // Migrate from version 1 to 2 - add sync stores
        if (oldVersion < 2) {
          // Create new stores for sync
          const syncMetadataStore = db.createObjectStore("syncMetadata", {
            keyPath: "id",
          });
          
          const pendingChangesStore = db.createObjectStore("pendingChanges", {
            keyPath: "id",
          });
          pendingChangesStore.createIndex("timestamp", "timestamp");
          pendingChangesStore.createIndex("entityType", "entityType");
        }
      },
    });
  }
  return dbPromise;
}

export async function createSession(title: string): Promise<Session> {
  const db = await getDB();
  const now = Date.now();
  const session: Session = {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    createdAt: now,
    lastModified: now,
    score: 0,
  };

  await db.add("sessions", session);
  
  // Track for sync
  await addPendingChange("session", session.id, "create", session);
  await markLocalChange();
  triggerSync(); // Trigger sync after change
  
  return session;
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDB();
  const sessions = await db.getAll("sessions");
  return sessions.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
  const db = await getDB();
  const session = await db.get("sessions", id);
  
  if (!session) {
    return undefined;
  }

  const updated = {
    ...session,
    ...updates,
    lastModified: updates.lastModified || Date.now(), // Allow override for sync
  };

  await db.put("sessions", updated);
  
  // Track for sync (only if not a sync operation itself)
  if (!updates.syncTimestamp && !updates.syncVersion) {
    await addPendingChange("session", id, "update", updated);
    await markLocalChange();
    triggerSync(); // Trigger sync after change
  }
  
  return updated;
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  const session = await db.get("sessions", id);
  
  const tx = db.transaction(["sessions", "notes", "images"], "readwrite");
  
  // Delete session
  await tx.objectStore("sessions").delete(id);
  
  // Delete all notes for this session
  const notesIndex = tx.objectStore("notes").index("sessionId");
  for await (const cursor of notesIndex.iterate(id)) {
    await cursor.delete();
  }
  
  // Delete all images for this session
  const imagesIndex = tx.objectStore("images").index("sessionId");
  for await (const cursor of imagesIndex.iterate(id)) {
    await cursor.delete();
  }
  
  await tx.done;
  
  // Track for sync
  if (session) {
    await addPendingChange("session", id, "delete");
    await markLocalChange();
    triggerSync(); // Trigger sync after change
  }
}

export async function createNote(sessionId: string, content: string): Promise<Note> {
  const db = await getDB();
  const now = Date.now();
  const note: Note = {
    id: `note_${now}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    content,
    createdAt: now,
    lastModified: now,
  };

  await db.add("notes", note);
  
  // Track for sync
  await addPendingChange("note", note.id, "create", note);
  await markLocalChange();
  triggerSync(); // Trigger sync after change
  
  return note;
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get("notes", id);
}

export async function listNotes(sessionId: string): Promise<Note[]> {
  const db = await getDB();
  const index = db.transaction("notes").store.index("sessionId");
  const notes = await index.getAll(sessionId);
  return notes.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateNote(id: string, content: string, skipSync?: boolean): Promise<Note | undefined> {
  const db = await getDB();
  const note = await db.get("notes", id);
  
  if (!note) {
    return undefined;
  }

  const updated = {
    ...note,
    content,
    lastModified: Date.now(),
  };

  await db.put("notes", updated);
  
  // Track for sync (only if not a sync operation itself)
  if (!skipSync) {
    await addPendingChange("note", id, "update", updated);
    await markLocalChange();
    triggerSync(); // Trigger sync after change
  }
  
  return updated;
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  const note = await db.get("notes", id);
  await db.delete("notes", id);
  
  // Track for sync
  if (note) {
    await addPendingChange("note", id, "delete");
    await markLocalChange();
    triggerSync(); // Trigger sync after change
  }
}

export async function createImage(sessionId: string, data: Blob, contentType: string): Promise<Image> {
  const db = await getDB();
  const now = Date.now();
  const image: Image = {
    id: `img_${now}_${Math.random().toString(36).substr(2, 9)}`,
    sessionId,
    data,
    contentType,
    timestamp: now,
    createdAt: now,
  };

  await db.add("images", image);
  
  // Track for sync (metadata only, not blob)
  await addPendingChange("image", image.id, "create", {
    id: image.id,
    sessionId: image.sessionId,
    contentType: image.contentType,
    createdAt: image.createdAt,
  });
  await markLocalChange();
  triggerSync(); // Trigger sync after change
  
  return image;
}

export async function getImage(id: string): Promise<Image | undefined> {
  const db = await getDB();
  return db.get("images", id);
}

export async function listImages(sessionId: string): Promise<Image[]> {
  const db = await getDB();
  const index = db.transaction("images").store.index("sessionId");
  const images = await index.getAll(sessionId);
  return images.sort((a, b) => b.timestamp - a.timestamp);
}

export async function updateImage(id: string, updates: Partial<Image>): Promise<Image | undefined> {
  const db = await getDB();
  const image = await db.get("images", id);
  
  if (!image) {
    return undefined;
  }

  const updated = {
    ...image,
    ...updates,
  };

  await db.put("images", updated);
  return updated;
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("images", id);
}

export async function getImageUrl(image: Image): Promise<string> {
  return URL.createObjectURL(image.data);
}
