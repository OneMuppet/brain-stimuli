// Utility to reset sync state - clears syncTimestamp from all items
// and resets lastSyncTimestamp to force a full sync
import { getDB } from "./db";
import { updateSyncMetadata } from "./syncMetadata";

export async function resetSyncState() {
  const db = await getDB();
  const tx = db.transaction(["sessions", "notes", "images", "syncMetadata"], "readwrite");
  
  console.log("🔄 Resetting sync state...");
  
  // Clear syncTimestamp from all sessions
  const sessions = await tx.store.sessions.getAll();
  for (const session of sessions) {
    if (session.syncTimestamp) {
      await tx.store.sessions.put({
        ...session,
        syncTimestamp: undefined,
      });
    }
  }
  console.log(`✅ Cleared syncTimestamp from ${sessions.length} sessions`);
  
  // Clear syncTimestamp from all notes
  const notes = await tx.store.notes.getAll();
  for (const note of notes) {
    if (note.syncTimestamp) {
      await tx.store.notes.put({
        ...note,
        syncTimestamp: undefined,
      });
    }
  }
  console.log(`✅ Cleared syncTimestamp from ${notes.length} notes`);
  
  // Clear syncTimestamp from all images
  const images = await tx.store.images.getAll();
  for (const image of images) {
    if (image.syncTimestamp) {
      await tx.store.images.put({
        ...image,
        syncTimestamp: undefined,
      });
    }
  }
  console.log(`✅ Cleared syncTimestamp from ${images.length} images`);
  
  // Reset sync metadata to force full sync
  await updateSyncMetadata({
    lastSyncTimestamp: 0,
    lastLocalChangeTimestamp: 0,
    lastCloudTimestamp: 0,
    syncVersion: 0,
  });
  console.log("✅ Reset sync metadata (lastSyncTimestamp = 0)");
  
  await tx.done;
  console.log("✅ Sync state reset complete! Next sync will be a full sync.");
}

