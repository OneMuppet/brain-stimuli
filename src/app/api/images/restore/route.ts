import { NextRequest, NextResponse } from "next/server";
import { downloadImageFromDrive } from "@/lib/imageSync";
import { logger } from "@/shared/utils/logger";

export async function GET(req: NextRequest) {
  try {
    const imageId = req.nextUrl.searchParams.get("imageId");
    const driveFileId = req.nextUrl.searchParams.get("driveFileId");
    const contentType = req.nextUrl.searchParams.get("contentType") || "image/png";
    
    if (!imageId || !driveFileId) {
      return NextResponse.json(
        { error: "Missing imageId or driveFileId" },
        { status: 400 }
      );
    }
    
    // Download blob from Drive
    const blob = await downloadImageFromDrive(req as Request, driveFileId, contentType);
    
    // Convert blob to base64 for JSON response
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    
    // Return image data for client to store in IndexedDB
    return NextResponse.json({
      success: true,
      imageId,
      driveFileId,
      contentType,
      data: base64, // Base64-encoded image data
    });
  } catch (error) {
    logger.error("Error restoring image", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore image" },
      { status: 500 }
    );
  }
}

