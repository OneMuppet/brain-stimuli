/**
 * Session entity - represents a focus session with notes and images
 */
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

