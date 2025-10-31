import { NextRequest, NextResponse } from "next/server";
import { restoreImageFromCloud } from "@/lib/imageSync"; // Server-side only

export async function GET(req: NextRequest) {
  try {
    const imageId = req.nextUrl.searchParams.get("imageId");
    const driveFileId = req.nextUrl.searchParams.get("driveFileId");
    
    if (!imageId || !driveFileId) {
      return NextResponse.json(
        { error: "Missing imageId or driveFileId" },
        { status: 400 }
      );
    }
    
    // Get image metadata from the sync data to get contentType and sessionId
    // For now, we'll need to fetch this from the sync data
    // Let's get it from the cloud sync file
    const syncResponse = await fetch(`${req.nextUrl.origin}/api/sync?full=true`, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });
    
    if (!syncResponse.ok) {
      throw new Error("Failed to fetch sync data");
    }
    
    const syncData = await syncResponse.json();
    const allImages = [
      ...(syncData.data?.images?.created || []),
      ...(syncData.data?.images?.updated || []),
      ...(syncData.delta?.images?.created || []),
      ...(syncData.delta?.images?.updated || []),
    ];
    
    const imageMeta = allImages.find((img: any) => img.id === imageId && img.driveFileId === driveFileId);
    
    if (!imageMeta) {
      return NextResponse.json(
        { error: "Image metadata not found" },
        { status: 404 }
      );
    }
    
    // Restore the image
    await restoreImageFromCloud(req as any, {
      id: imageMeta.id,
      sessionId: imageMeta.sessionId,
      contentType: imageMeta.contentType || "image/png",
      driveFileId: imageMeta.driveFileId,
      createdAt: imageMeta.createdAt || Date.now(),
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error restoring image:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to restore image" },
      { status: 500 }
    );
  }
}

