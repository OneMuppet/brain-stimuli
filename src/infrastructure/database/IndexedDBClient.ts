import { openDB, DBSchema, IDBPDatabase } from "idb";
import type { Session, Note, Image, SyncMetadata, PendingChange } from "@/domain/entities";
import { CONSTANTS } from "@/shared/config/constants";

/**
 * Database schema for IndexedDB
 */
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

/**
 * Get or create the IndexedDB database instance
 */
export function getDB(): Promise<IDBPDatabase<BrainStimuliDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BrainStimuliDB>(CONSTANTS.DB_NAME, CONSTANTS.DB_VERSION, {
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

