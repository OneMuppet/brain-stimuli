import { NextRequest, NextResponse } from "next/server";
import { syncToDrive, syncFromDrive } from "@/lib/googleDrive";
import type { SyncDelta } from "@/lib/deltaSync";

interface SyncRequest {
  delta?: SyncDelta;
  lastSyncTimestamp?: number;
  fullSync?: boolean; // For initial sync
}

interface SyncResponse {
  success: boolean;
  delta?: SyncDelta;
  data?: any; // Full data (for initial sync)
  syncTimestamp: number;
  conflicts?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: SyncRequest = await req.json();
    
    console.log("📤 POST /api/sync - Receiving local delta:", {
      hasDelta: !!body.delta,
      sessions: body.delta?.sessions?.created?.length || 0 + body.delta?.sessions?.updated?.length || 0,
      notes: body.delta?.notes?.created?.length || 0 + body.delta?.notes?.updated?.length || 0,
      images: body.delta?.images?.created?.length || 0,
    });
    
    // Get current cloud state
    let cloudData = await syncFromDrive(req);
    console.log("📥 POST /api/sync - Current cloud state:", {
      exists: !!cloudData,
      sessions: cloudData?.sessions?.created?.length || 0 + cloudData?.sessions?.updated?.length || 0,
      notes: cloudData?.notes?.created?.length || 0 + cloudData?.notes?.updated?.length || 0,
      images: cloudData?.images?.created?.length || 0,
    });
    
    // Initialize empty state if no cloud data exists
    if (!cloudData || typeof cloudData !== 'object') {
      cloudData = {
        sessions: { created: [], updated: [], deleted: [] },
        notes: { created: [], updated: [], deleted: [] },
        images: { created: [], updated: [], deleted: [] },
        metadata: {
          lastLocalChangeTimestamp: 0,
          syncVersion: 0,
        },
      };
    }
    
    // Ensure cloud data has proper structure
    const currentState: SyncDelta = {
      sessions: {
        created: Array.isArray(cloudData.sessions?.created) ? cloudData.sessions.created : [],
        updated: Array.isArray(cloudData.sessions?.updated) ? cloudData.sessions.updated : [],
        deleted: Array.isArray(cloudData.sessions?.deleted) ? cloudData.sessions.deleted : [],
      },
      notes: {
        created: Array.isArray(cloudData.notes?.created) ? cloudData.notes.created : [],
        updated: Array.isArray(cloudData.notes?.updated) ? cloudData.notes.updated : [],
        deleted: Array.isArray(cloudData.notes?.deleted) ? cloudData.notes.deleted : [],
      },
      images: {
        created: Array.isArray(cloudData.images?.created) ? cloudData.images.created : [],
        updated: Array.isArray(cloudData.images?.updated) ? cloudData.images.updated : [],
        deleted: Array.isArray(cloudData.images?.deleted) ? cloudData.images.deleted : [],
      },
      metadata: cloudData.metadata || {
        lastLocalChangeTimestamp: 0,
        syncVersion: 0,
      },
    };
    
    // If client sent delta, merge it into cloud state
    if (body.delta) {
      // Merge client delta into cloud state
      // For updates, replace old versions; for creates, add new ones
      const merged: SyncDelta = {
        sessions: {
          created: [
            ...currentState.sessions.created.filter(cs => 
              !body.delta!.sessions.created.find(s => s.id === cs.id)
            ),
            ...body.delta.sessions.created,
          ],
          updated: [
            ...currentState.sessions.updated.filter(cs => 
              !body.delta!.sessions.updated.find(s => s.id === cs.id)
            ),
            ...body.delta.sessions.updated,
          ],
          deleted: [...new Set([...currentState.sessions.deleted, ...body.delta.sessions.deleted])],
        },
        notes: {
          created: [
            ...currentState.notes.created.filter(cn => 
              !body.delta!.notes.created.find(n => n.id === cn.id)
            ),
            ...body.delta.notes.created,
          ],
          updated: [
            ...currentState.notes.updated.filter(cn => 
              !body.delta!.notes.updated.find(n => n.id === cn.id)
            ),
            ...body.delta.notes.updated,
          ],
          deleted: [...new Set([...currentState.notes.deleted, ...body.delta.notes.deleted])],
        },
        images: {
          created: [
            ...currentState.images.created.filter(ci => 
              !body.delta!.images.created.find(i => i.id === ci.id)
            ),
            ...body.delta.images.created,
          ],
          updated: [
            ...currentState.images.updated.filter(ci => 
              !body.delta!.images.updated.find(i => i.id === ci.id)
            ),
            ...body.delta.images.updated,
          ],
          deleted: [...new Set([...currentState.images.deleted, ...body.delta.images.deleted])],
        },
        metadata: {
          lastLocalChangeTimestamp: Math.max(
            currentState.metadata.lastLocalChangeTimestamp,
            body.delta.metadata.lastLocalChangeTimestamp
          ),
          syncVersion: Math.max(
            currentState.metadata.syncVersion,
            body.delta.metadata.syncVersion
          ) + 1,
        },
      };
      
      cloudData = merged;
    }
    
        // Upload merged state to Drive
        console.log("💾 POST /api/sync - Uploading merged state to Drive:", {
          sessions: cloudData?.sessions?.created?.length || 0 + cloudData?.sessions?.updated?.length || 0,
          notes: cloudData?.notes?.created?.length || 0 + cloudData?.notes?.updated?.length || 0,
          images: cloudData?.images?.created?.length || 0,
        });
        await syncToDrive(req, cloudData);
        
        const syncTimestamp = Date.now();
        
        console.log("✅ POST /api/sync - Upload complete");
        
        return NextResponse.json({
          success: true,
          syncTimestamp,
          conflicts: [], // Conflicts resolved server-side using last-write-wins
        } satisfies SyncResponse);
  } catch (error) {
    console.error("Sync POST error:", error);
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const since = req.nextUrl.searchParams.get("since");
    const sinceTimestamp = since ? parseInt(since, 10) : 0;
    const fullSync = req.nextUrl.searchParams.get("full") === "true";
    
    console.log("📥 GET /api/sync - Request:", {
      since: sinceTimestamp,
      fullSync,
      sinceParam: since || "none",
    });
    
    let cloudData;
    try {
      cloudData = await syncFromDrive(req);
    } catch (error) {
      console.error("❌ Error fetching from Drive:", error);
      // If no data exists or auth failed, return empty state
      cloudData = null;
    }
    
    console.log("📦 GET /api/sync - Retrieved data:", {
      exists: !!cloudData,
      type: typeof cloudData,
      sessions: cloudData?.sessions?.created?.length || 0,
      notes: cloudData?.notes?.created?.length || 0,
    });
    
    // Ensure proper structure
    const cloudState: SyncDelta = {
      sessions: {
        created: Array.isArray(cloudData?.sessions?.created) ? cloudData.sessions.created : [],
        updated: Array.isArray(cloudData?.sessions?.updated) ? cloudData.sessions.updated : [],
        deleted: Array.isArray(cloudData?.sessions?.deleted) ? cloudData.sessions.deleted : [],
      },
      notes: {
        created: Array.isArray(cloudData?.notes?.created) ? cloudData.notes.created : [],
        updated: Array.isArray(cloudData?.notes?.updated) ? cloudData.notes.updated : [],
        deleted: Array.isArray(cloudData?.notes?.deleted) ? cloudData.notes.deleted : [],
      },
      images: {
        created: Array.isArray(cloudData?.images?.created) ? cloudData.images.created : [],
        updated: Array.isArray(cloudData?.images?.updated) ? cloudData.images.updated : [],
        deleted: Array.isArray(cloudData?.images?.deleted) ? cloudData.images.deleted : [],
      },
      metadata: cloudData?.metadata || {
        lastLocalChangeTimestamp: 0,
        syncVersion: 0,
      },
    };
    
    const syncTimestamp = Date.now();
    
    // If full sync requested, return all data
    if (fullSync || sinceTimestamp === 0) {
      return NextResponse.json({
        success: true,
        data: cloudState,
        syncTimestamp,
      } satisfies SyncResponse);
    }
    
    // Otherwise, return delta (changes since timestamp)
    const delta: SyncDelta = {
      sessions: {
        created: cloudState.sessions.created.filter((s: any) => {
          const created = s.createdAt || s.lastModified;
          return created > sinceTimestamp;
        }),
        updated: cloudState.sessions.updated.filter((s: any) => {
          const modified = s.lastModified || s.createdAt;
          return modified > sinceTimestamp;
        }),
        deleted: cloudState.sessions.deleted,
      },
      notes: {
        created: cloudState.notes.created.filter((n: any) => {
          const created = n.createdAt || n.lastModified;
          return created > sinceTimestamp;
        }),
        updated: cloudState.notes.updated.filter((n: any) => {
          const modified = n.lastModified || n.createdAt;
          return modified > sinceTimestamp;
        }),
        deleted: cloudState.notes.deleted,
      },
      images: {
        created: cloudState.images.created.filter((i: any) => {
          const created = i.createdAt || i.timestamp;
          return created > sinceTimestamp;
        }),
        updated: cloudState.images.updated.filter((i: any) => {
          return i.syncTimestamp && i.syncTimestamp > sinceTimestamp;
        }),
        deleted: cloudState.images.deleted,
      },
      metadata: cloudState.metadata,
    };
    
    return NextResponse.json({
      success: true,
      delta,
      syncTimestamp,
    } satisfies SyncResponse);
  } catch (error) {
    console.error("Sync GET error:", error);
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

