import { NextRequest, NextResponse } from "next/server";
import { uploadImageToDrive } from "@/lib/imageSync";
import { getDB } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageId = formData.get("imageId") as string;
    const blob = formData.get("blob") as File;
    const contentType = formData.get("contentType") as string;
    const sessionId = formData.get("sessionId") as string;
    
    if (!imageId || !blob || !contentType || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: imageId, blob, contentType, sessionId" },
        { status: 400 }
      );
    }
    
    // Convert File to Blob - need to handle both File and Blob from FormData
    let imageBlob: Blob;
    if (blob instanceof File) {
      imageBlob = blob;
    } else {
      // If it's already a Blob, read it
      const arrayBuffer = await blob.arrayBuffer();
      imageBlob = new Blob([arrayBuffer], { type: contentType });
    }
    
    // Create Image object for upload
    const image = {
      id: imageId,
      sessionId,
      data: imageBlob,
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

