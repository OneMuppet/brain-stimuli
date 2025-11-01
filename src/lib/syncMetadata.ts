import { getDB } from "@/infrastructure/database/IndexedDBClient";
import type { SyncMetadata } from "@/domain/entities";
import { CONSTANTS } from "@/shared/config/constants";

const SYNC_METADATA_ID = CONSTANTS.SYNC_METADATA_ID;

export async function getSyncMetadata(): Promise<SyncMetadata | null> {
  const db = await getDB();
  try {
    const metadata = await db.get("syncMetadata", SYNC_METADATA_ID);
    return metadata || null;
  } catch {
    return null;
  }
}

export async function updateSyncMetadata(updates: Partial<SyncMetadata>): Promise<void> {
  const db = await getDB();
  const existing = await getSyncMetadata();
  
  const metadata: SyncMetadata = {
    id: SYNC_METADATA_ID,
    lastSyncTimestamp: 0,
    lastLocalChangeTimestamp: 0,
    lastCloudTimestamp: 0,
    syncVersion: 0,
    ...existing,
    ...updates,
  };
  
  await db.put("syncMetadata", metadata);
}

export async function markLocalChange(): Promise<void> {
  await updateSyncMetadata({
    lastLocalChangeTimestamp: Date.now(),
  });
}

