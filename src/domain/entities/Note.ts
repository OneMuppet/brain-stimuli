/**
 * Note entity - represents a note within a session
 */
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

