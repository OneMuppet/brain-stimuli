import { NextRequest, NextResponse } from "next/server";
import { uploadImageToDrive } from "@/lib/imageSync";
import { getDB } from "@/lib/db";
import { logger } from "@/shared/utils/logger";
import type { Image } from "@/domain/entities";

// Configure route to handle large file uploads
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formError: unknown) {
      // If FormData parsing fails, try to get more info
      logger.error("FormData parsing error", formError);
      const errorMessage = formError instanceof Error ? formError.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to parse FormData: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    const imageId = formData.get("imageId") as string;
    const blobFile = formData.get("blob");
    const contentType = formData.get("contentType") as string;
    const sessionId = formData.get("sessionId") as string;
    
    if (!imageId || !blobFile || !contentType || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: imageId, blob, contentType, sessionId" },
        { status: 400 }
      );
    }
    
    // Convert File/Blob to ArrayBuffer, then to Buffer for Drive API
    // Handle different file types that might come from FormData
    let buffer: Buffer;
    try {
      // Check if it's a File or has arrayBuffer method (Blob-like)
      const hasArrayBuffer = blobFile && typeof blobFile === "object" && "arrayBuffer" in blobFile && typeof (blobFile as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer === "function";
      if (blobFile instanceof File || hasArrayBuffer) {
        const arrayBuffer = await (blobFile as File | { arrayBuffer: () => Promise<ArrayBuffer> }).arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (typeof blobFile === "string") {
        // If it's already a string, try to decode it
        buffer = Buffer.from(blobFile, "base64");
      } else {
        // Fallback: try to get bytes directly
        const blobWithArrayBuffer = blobFile as { arrayBuffer?: () => Promise<ArrayBuffer> };
        if (typeof blobWithArrayBuffer.arrayBuffer === "function") {
          const arrayBuffer = await blobWithArrayBuffer.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          // Last resort: wrap in Response to get arrayBuffer
          const response = new Response(blobFile as Blob);
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
      }
    } catch (bufferError: unknown) {
      logger.error("Buffer conversion error", bufferError);
      const errorMessage = bufferError instanceof Error ? bufferError.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to convert file to buffer: ${errorMessage}` },
        { status: 400 }
      );
    }
    
    // Create Image object for upload (with buffer instead of blob for Drive API)
    // Note: Image.data is Blob, but for upload we use Buffer - cast for compatibility
    const image: Image = {
      id: imageId,
      sessionId,
      data: buffer as unknown as Blob, // Cast buffer to Blob for type compatibility
      contentType,
      timestamp: Date.now(),
      createdAt: Date.now(),
    };
    
    // Upload to Drive
    const driveFileId = await uploadImageToDrive(req as Request, image);
    
    if (!driveFileId) {
      throw new Error("Failed to upload image to Drive");
    }
    
    return NextResponse.json({ success: true, driveFileId });
  } catch (error) {
    logger.error("Error uploading image", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

