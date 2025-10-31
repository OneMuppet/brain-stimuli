// Image blob sync utilities for Google Drive
import { getDriveClient } from "./googleDrive";
import type { Image } from "./db";
import { getDB, updateImage } from "./db";

/**
 * Upload an image blob to Google Drive appDataFolder
 * Returns the Drive file ID
 */
export async function uploadImageToDrive(req: Request, image: Image): Promise<string> {
  const drive = await getDriveClient(req);
  
  // Check if image already has a driveFileId
  if (image.driveFileId) {
    // Update existing file
    await drive.files.update({
      fileId: image.driveFileId,
      media: {
        mimeType: image.contentType,
        body: Buffer.from(await image.data.arrayBuffer()),
      },
    });
    console.log(`✅ Updated image in Drive: ${image.id} -> ${image.driveFileId}`);
    return image.driveFileId;
  }
  
  // Create new file
  const result = await drive.files.create({
    requestBody: {
      name: `${image.id}.${image.contentType.split('/')[1] || 'png'}`,
      parents: ["appDataFolder"],
    },
    media: {
      mimeType: image.contentType,
      body: Buffer.from(await image.data.arrayBuffer()),
    },
  });
  
  const driveFileId = result.data.id;
  if (driveFileId) {
    console.log(`✅ Uploaded image to Drive: ${image.id} -> ${driveFileId}`);
    // Update local image with driveFileId
    await updateImage(image.id, { driveFileId });
  }
  
  return driveFileId || "";
}

/**
 * Download an image blob from Google Drive using driveFileId
 */
export async function downloadImageFromDrive(req: Request, driveFileId: string, contentType: string): Promise<Blob> {
  const drive = await getDriveClient(req);
  
  const response = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  
  const arrayBuffer = response.data as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: contentType });
  
  console.log(`✅ Downloaded image from Drive: ${driveFileId} (${blob.size} bytes)`);
  return blob;
}

/**
 * Restore an image from cloud: download blob and store in IndexedDB
 */
export async function restoreImageFromCloud(
  req: Request,
  imageMeta: { id: string; sessionId: string; contentType: string; driveFileId?: string; createdAt?: number }
): Promise<void> {
  if (!imageMeta.driveFileId) {
    console.warn(`⚠️ Image ${imageMeta.id} has no driveFileId, cannot restore`);
    return;
  }
  
  try {
    // Download blob from Drive
    const blob = await downloadImageFromDrive(req, imageMeta.driveFileId, imageMeta.contentType);
    
    // Store in IndexedDB
    const db = await getDB();
    const image: Image = {
      id: imageMeta.id,
      sessionId: imageMeta.sessionId,
      data: blob,
      contentType: imageMeta.contentType,
      timestamp: imageMeta.createdAt || Date.now(),
      createdAt: imageMeta.createdAt,
      driveFileId: imageMeta.driveFileId,
      syncTimestamp: Date.now(),
    };
    
    await db.put("images", image);
    console.log(`✅ Restored image to IndexedDB: ${imageMeta.id}`);
  } catch (error) {
    console.error(`❌ Failed to restore image ${imageMeta.id}:`, error);
    throw error;
  }
}

