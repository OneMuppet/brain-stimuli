// Image blob sync utilities for Google Drive
import { getDriveClient } from "./googleDrive";
import type { Image } from "./db";
import { Readable } from "stream";

/**
 * Upload an image blob to Google Drive appDataFolder
 * Returns the Drive file ID
 */
export async function uploadImageToDrive(req: Request, image: Image): Promise<string> {
  const drive = await getDriveClient(req);
  
  // Convert image.data to Buffer if it's not already
  let buffer: Buffer;
  if (image.data instanceof Buffer) {
    buffer = image.data;
  } else if (image.data instanceof Blob) {
    buffer = Buffer.from(await image.data.arrayBuffer());
  } else if (image.data instanceof ArrayBuffer) {
    buffer = Buffer.from(image.data);
  } else {
    // Try to convert to ArrayBuffer first
    buffer = Buffer.from(await (image.data as any).arrayBuffer());
  }
  
  // Convert Buffer to stream for Google Drive API
  // Drive API expects a stream, not a Buffer
  const stream = Readable.from(buffer);
  
  // Check if image already has a driveFileId
  if (image.driveFileId) {
    // Update existing file
    await drive.files.update({
      fileId: image.driveFileId,
      media: {
        mimeType: image.contentType,
        body: stream,
      },
    });
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
      body: stream,
    },
  });
  
  const driveFileId = result.data.id;
  
  // Note: We don't update IndexedDB here since this runs on the server
  // The client will update the local database after receiving the driveFileId
  
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


