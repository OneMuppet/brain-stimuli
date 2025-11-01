import { NextRequest, NextResponse } from "next/server";
import { uploadImageToDrive } from "@/lib/imageSync";
import { getDB } from "@/lib/db";

// Configure route to handle large file uploads
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formError: any) {
      // If FormData parsing fails, try to get more info
      console.error("FormData parsing error:", formError);
      return NextResponse.json(
        { error: `Failed to parse FormData: ${formError.message || "Unknown error"}` },
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
      if (blobFile instanceof File || blobFile instanceof Blob) {
        const arrayBuffer = await blobFile.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else if (typeof blobFile === "string") {
        // If it's already a string, try to decode it
        buffer = Buffer.from(blobFile, "base64");
      } else {
        // Fallback: try to get bytes directly
        if ((blobFile as any).arrayBuffer) {
          const arrayBuffer = await (blobFile as any).arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        } else {
          // Last resort: wrap in Response to get arrayBuffer
          const response = new Response(blobFile as any);
          const arrayBuffer = await response.arrayBuffer();
          buffer = Buffer.from(arrayBuffer);
        }
      }
    } catch (bufferError: any) {
      console.error("Buffer conversion error:", bufferError);
      return NextResponse.json(
        { error: `Failed to convert file to buffer: ${bufferError.message || "Unknown error"}` },
        { status: 400 }
      );
    }
    
    // Create Image object for upload (with buffer instead of blob for Drive API)
    const image = {
      id: imageId,
      sessionId,
      data: buffer, // Pass buffer directly for Drive upload
      contentType,
      timestamp: Date.now(),
      createdAt: Date.now(),
    };
    
    // Upload to Drive
    const driveFileId = await uploadImageToDrive(req as any, image as any);
    
    if (!driveFileId) {
      throw new Error("Failed to upload image to Drive");
    }
    
    return NextResponse.json({ success: true, driveFileId });
  } catch (error) {
    console.error("Error uploading image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to upload image" },
      { status: 500 }
    );
  }
}

