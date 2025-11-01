/**
 * Image entity - represents an image within a session
 */
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

