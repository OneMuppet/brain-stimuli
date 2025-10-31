import * as db from "./db";
import { getDB } from "./db";
import type { Session, Note, Image } from "./db";
import { getSyncMetadata } from "./syncMetadata";

export interface SyncDelta {
  sessions: {
    created: Session[];
    updated: Session[];
    deleted: string[]; // IDs
  };
  notes: {
    created: Note[];
    updated: Note[];
    deleted: string[]; // IDs
  };
  images: {
    created: Array<{ id: string; sessionId: string; contentType: string; createdAt: number; driveFileId?: string }>;
    updated: Array<{ id: string; sessionId: string; contentType: string; createdAt: number; driveFileId?: string }>;
    deleted: string[]; // IDs
  };
  metadata: {
    lastLocalChangeTimestamp: number;
    syncVersion: number;
  };
}

export async function generateLocalDelta(sinceTimestamp: number): Promise<SyncDelta> {
  const sessions = await db.listSessions();
  const allNotes: Note[] = [];
  const allImages: Image[] = [];
  
  // Get all notes and images
  for (const session of sessions) {
    const notes = await db.listNotes(session.id);
    const images = await db.listImages(session.id);
    allNotes.push(...notes);
    allImages.push(...images);
  }
  
  const syncMetadata = await getSyncMetadata();
  
  // Filter by lastModified > sinceTimestamp (or created > sinceTimestamp for new items)
  const delta: SyncDelta = {
    sessions: {
      created: sessions.filter(s => {
        // New session created after sync timestamp
        return s.createdAt > sinceTimestamp && s.createdAt === s.lastModified;
      }),
      updated: sessions.filter(s => {
        // Session modified after sync timestamp (and not just created)
        return s.lastModified > sinceTimestamp && s.createdAt !== s.lastModified;
      }),
      deleted: [], // Deleted items tracked separately in pending changes
    },
    notes: {
      created: allNotes.filter(n => {
        return n.createdAt > sinceTimestamp && n.createdAt === n.lastModified;
      }),
      updated: allNotes.filter(n => {
        return n.lastModified > sinceTimestamp && n.createdAt !== n.lastModified;
      }),
      deleted: [],
    },
    images: {
      created: allImages
        .filter(img => {
          const createdAt = img.createdAt || img.timestamp;
          return createdAt > sinceTimestamp && 
                 (!img.syncTimestamp || img.syncTimestamp === 0);
        })
        .map(img => ({
          id: img.id,
          sessionId: img.sessionId,
          contentType: img.contentType,
          createdAt: img.createdAt || img.timestamp,
          driveFileId: img.driveFileId,
        })),
      updated: allImages
        .filter(img => {
          const createdAt = img.createdAt || img.timestamp;
           return img.syncTimestamp && 
                  img.syncTimestamp > 0 && 
                  img.syncTimestamp < (img.timestamp || createdAt || 0);
        })
        .map(img => ({
          id: img.id,
          sessionId: img.sessionId,
          contentType: img.contentType,
          createdAt: img.createdAt || img.timestamp,
          driveFileId: img.driveFileId,
        })),
      deleted: [],
    },
    metadata: {
      lastLocalChangeTimestamp: syncMetadata?.lastLocalChangeTimestamp || 0,
      syncVersion: (syncMetadata?.syncVersion || 0) + 1,
    },
  };
  
  return delta;
}

export async function applyCloudDelta(
  cloudDelta: SyncDelta,
  mergeStrategy: "last-write-wins" | "manual-merge" = "last-write-wins"
): Promise<{ conflicts: string[] }> {
  const conflicts: string[] = [];
  
  // Merge sessions
  for (const session of [...cloudDelta.sessions.created, ...cloudDelta.sessions.updated]) {
    const existing = await db.getSession(session.id);
    
    if (!existing) {
      // New session - add it
      const database = await getDB();
      await database.add("sessions", session);
    } else {
      // Conflict resolution: last-write-wins
      const localLastModified = existing.lastModified || existing.createdAt;
      const cloudLastModified = session.lastModified || session.createdAt;
      const localNewer = localLastModified > cloudLastModified;
      
      if (localNewer && mergeStrategy === "last-write-wins") {
        // Keep local version, but update sync metadata
        await db.updateSession(session.id, {
          syncVersion: session.syncVersion,
          syncTimestamp: Date.now(),
        });
        conflicts.push(`session:${session.id}`);
      } else {
        // Cloud version is newer - apply it (skip sync tracking since this is from cloud)
        await db.updateSession(session.id, {
          ...session,
          lastModified: Math.max(localLastModified, cloudLastModified),
          syncVersion: session.syncVersion,
          syncTimestamp: Date.now(),
        });
      }
    }
  }
  
  // Merge notes
  for (const note of [...cloudDelta.notes.created, ...cloudDelta.notes.updated]) {
    const existing = await db.getNote(note.id);
    
    if (!existing) {
      // Create note
      const database = await getDB();
      await database.add("notes", note);
    } else {
      const localLastModified = existing.lastModified || existing.createdAt;
      const cloudLastModified = note.lastModified || note.createdAt;
      const localNewer = localLastModified > cloudLastModified;
      
      if (localNewer && mergeStrategy === "last-write-wins") {
        // Keep local content, update sync metadata
        await db.updateNote(note.id, existing.content, true); // skipSync = true
        conflicts.push(`note:${note.id}`);
      } else {
        // Apply cloud version (skip sync tracking since this is from cloud)
        await db.updateNote(note.id, note.content, true); // skipSync = true
      }
    }
  }
  
  // Handle deletions
  for (const sessionId of cloudDelta.sessions.deleted) {
    try {
      await db.deleteSession(sessionId);
    } catch {
      // Session might already be deleted
    }
  }
  
  for (const noteId of cloudDelta.notes.deleted) {
    try {
      await db.deleteNote(noteId);
    } catch {
      // Note might already be deleted
    }
  }
  
  // Handle image metadata (images themselves are synced separately)
  for (const imageMeta of [...cloudDelta.images.created, ...cloudDelta.images.updated]) {
    const existing = await db.getImage(imageMeta.id);
    
    if (!existing) {
      // Image metadata exists in cloud but not local
      // This means we need to fetch the image blob from Drive
      // For now, just store the metadata
      // TODO: Implement image fetch on-demand
    } else {
      // Update local metadata with cloud info (driveFileId, etc.)
      await db.updateImage(imageMeta.id, {
        driveFileId: imageMeta.driveFileId,
        syncTimestamp: Date.now(),
      });
    }
  }
  
  return { conflicts };
}

export async function mergeLocalAndCloud(
  localDelta: SyncDelta,
  cloudDelta: SyncDelta
): Promise<SyncDelta> {
  // Create merged delta that combines local and cloud changes
  // For conflicts, prefer local (client writes take precedence initially)
  
  const merged: SyncDelta = {
    sessions: {
      created: [...localDelta.sessions.created, ...cloudDelta.sessions.created.filter(
        s => !localDelta.sessions.created.find(ls => ls.id === s.id)
      )],
      updated: [
        ...localDelta.sessions.updated,
        ...cloudDelta.sessions.updated.filter(
          s => !localDelta.sessions.updated.find(ls => ls.id === s.id)
        ),
      ],
      deleted: [...new Set([...localDelta.sessions.deleted, ...cloudDelta.sessions.deleted])],
    },
    notes: {
      created: [...localDelta.notes.created, ...cloudDelta.notes.created.filter(
        n => !localDelta.notes.created.find(ln => ln.id === n.id)
      )],
      updated: [
        ...localDelta.notes.updated,
        ...cloudDelta.notes.updated.filter(
          n => !localDelta.notes.updated.find(ln => ln.id === n.id)
        ),
      ],
      deleted: [...new Set([...localDelta.notes.deleted, ...cloudDelta.notes.deleted])],
    },
    images: {
      created: [...localDelta.images.created, ...cloudDelta.images.created.filter(
        i => !localDelta.images.created.find(li => li.id === i.id)
      )],
      updated: [
        ...localDelta.images.updated,
        ...cloudDelta.images.updated.filter(
          i => !localDelta.images.updated.find(li => li.id === i.id)
        ),
      ],
      deleted: [...new Set([...localDelta.images.deleted, ...cloudDelta.images.deleted])],
    },
    metadata: {
      lastLocalChangeTimestamp: Math.max(
        localDelta.metadata.lastLocalChangeTimestamp,
        cloudDelta.metadata.lastLocalChangeTimestamp || 0
      ),
      syncVersion: Math.max(localDelta.metadata.syncVersion, cloudDelta.metadata.syncVersion || 0),
    },
  };
  
  return merged;
}

