import type { Session, Note, Image } from "../entities";

/**
 * SyncDelta - represents changes to be synced between local and cloud
 */
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
    created: Array<{
      id: string;
      sessionId: string;
      contentType: string;
      createdAt: number;
      driveFileId?: string;
    }>;
    updated: Array<{
      id: string;
      sessionId: string;
      contentType: string;
      createdAt: number;
      driveFileId?: string;
    }>;
    deleted: string[]; // IDs
  };
  metadata: {
    lastLocalChangeTimestamp: number;
    syncVersion: number;
  };
}

