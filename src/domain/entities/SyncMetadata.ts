/**
 * SyncMetadata entity - tracks synchronization state
 */
export interface SyncMetadata {
  id: string;
  lastSyncTimestamp: number;
  lastLocalChangeTimestamp: number;
  lastCloudTimestamp: number;
  syncVersion: number;
}

