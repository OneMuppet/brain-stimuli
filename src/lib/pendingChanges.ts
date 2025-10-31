import { getDB, type PendingChange } from "./db";
import { markLocalChange } from "./syncMetadata";

export async function addPendingChange(
  entityType: "session" | "note" | "image",
  entityId: string,
  operation: "create" | "update" | "delete",
  data?: any
): Promise<void> {
  const db = await getDB();
  
  const change: PendingChange = {
    id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    operation,
    timestamp: Date.now(),
    data,
    retryCount: 0,
  };
  
  await db.add("pendingChanges", change);
  await markLocalChange();
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await getDB();
  try {
    const index = db.transaction("pendingChanges").store.index("timestamp");
    return await index.getAll();
  } catch {
    return [];
  }
}

export async function removePendingChange(changeId: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingChanges", changeId);
}

export async function incrementRetryCount(changeId: string): Promise<void> {
  const db = await getDB();
  const change = await db.get("pendingChanges", changeId);
  if (change) {
    change.retryCount += 1;
    await db.put("pendingChanges", change);
  }
}

export async function clearPendingChanges(): Promise<void> {
  const db = await getDB();
  const changes = await getPendingChanges();
  for (const change of changes) {
    await removePendingChange(change.id);
  }
}

