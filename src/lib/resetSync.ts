// Utility to reset sync state - clears syncTimestamp from all items
// and resets lastSyncTimestamp to force a full sync
import { getDB } from "./db";
import { updateSyncMetadata } from "./syncMetadata";

export async function resetSyncState() {
  const db = await getDB();
  
  console.log("🔄 Resetting sync state...");
  
  // Clear syncTimestamp from all sessions
  const sessions = await db.getAll("sessions");
  let sessionsCleared = 0;
  for (const session of sessions) {
    if (session.syncTimestamp) {
      await db.put("sessions", {
        ...session,
        syncTimestamp: undefined,
      });
      sessionsCleared++;
    }
  }
  console.log(`✅ Cleared syncTimestamp from ${sessionsCleared}/${sessions.length} sessions`);
  
  // Clear syncTimestamp from all notes
  const notes = await db.getAll("notes");
  let notesCleared = 0;
  for (const note of notes) {
    if (note.syncTimestamp) {
      await db.put("notes", {
        ...note,
        syncTimestamp: undefined,
      });
      notesCleared++;
    }
  }
  console.log(`✅ Cleared syncTimestamp from ${notesCleared}/${notes.length} notes`);
  
  // Clear syncTimestamp from all images
  const images = await db.getAll("images");
  let imagesCleared = 0;
  for (const image of images) {
    if (image.syncTimestamp) {
      await db.put("images", {
        ...image,
        syncTimestamp: undefined,
      });
      imagesCleared++;
    }
  }
  console.log(`✅ Cleared syncTimestamp from ${imagesCleared}/${images.length} images`);
  
  // Reset sync metadata to force full sync
  await updateSyncMetadata({
    lastSyncTimestamp: 0,
    lastLocalChangeTimestamp: 0,
    lastCloudTimestamp: 0,
    syncVersion: 0,
  });
  console.log("✅ Reset sync metadata (lastSyncTimestamp = 0)");
  
  console.log("✅ Sync state reset complete! Next sync will be a full sync.");
}

