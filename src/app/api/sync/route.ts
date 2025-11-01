import { NextRequest, NextResponse } from "next/server";
import { syncToDrive, syncFromDrive } from "@/lib/googleDrive";
import { uploadImageToDrive } from "@/lib/imageSync";
import { getImage } from "@/lib/db";
import type { SyncDelta } from "@/lib/deltaSync";
import { logger } from "@/shared/utils/logger";
import type { Session, Note } from "@/domain/entities";
import { env } from "@/shared/config/env";

interface SyncRequest {
  delta?: SyncDelta;
  lastSyncTimestamp?: number;
  fullSync?: boolean; // For initial sync
}

interface SyncResponse {
  success: boolean;
  delta?: SyncDelta;
  data?: SyncDelta; // Full data (for initial sync)
  syncTimestamp: number;
  conflicts?: string[];
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication first
    const { getToken } = await import("next-auth/jwt");
    
    // In NextAuth v5, the cookie name is authjs.session-token (not next-auth.session-token)
    // In production, it's __Secure-authjs.session-token
    const cookieName = env.isProduction
      ? "__Secure-authjs.session-token" 
      : "authjs.session-token";
    
    // Check if the cookie exists
    const hasCookie = !!req.cookies.get(cookieName)?.value;
    
    let token: any = null;
    let tokenError: Error | null = null;
    
    try {
      token = await getToken({ 
        req, 
        secret: env.NEXTAUTH_SECRET!,
        cookieName, // Explicitly tell getToken which cookie to read
      });
    } catch (error) {
      tokenError = error instanceof Error ? error : new Error(String(error));
      logger.error("POST /api/sync - Error getting token", { error: tokenError.message });
    }
    
    // If no token found, try without specifying cookie name
    if (!token && !tokenError) {
      try {
        token = await getToken({ 
          req, 
          secret: env.NEXTAUTH_SECRET!,
        });
      } catch (error) {
        tokenError = error instanceof Error ? error : new Error(String(error));
        logger.error("POST /api/sync - Error getting token (fallback)", { error: tokenError.message });
      }
    }
    
    if (!token?.accessToken) {
      const errorDetails: any = {
        hasCookie,
        cookieName,
        hasToken: !!token,
        availableCookies: req.cookies.getAll().map(c => c.name),
      };
      
      if (tokenError) {
        errorDetails.tokenError = tokenError.message;
      }
      if (hasCookie && !token) {
        errorDetails.hint = "Cookie exists but token decryption failed. This usually means NEXTAUTH_SECRET has changed or doesn't match the secret used to create the session. Try signing out and signing in again.";
      }
      
      logger.error("POST /api/sync - Not authenticated", errorDetails);
      return NextResponse.json(
        { 
          error: "Not authenticated. Please sign in.",
          ...(env.isDebugMode && { details: errorDetails })
        },
        { status: 401 }
      );
    }
    
    const body: SyncRequest = await req.json();
    
    logger.debug("POST /api/sync - Receiving local delta", {
      hasDelta: !!body.delta,
      sessions: (body.delta?.sessions?.created?.length || 0) + (body.delta?.sessions?.updated?.length || 0),
      notes: (body.delta?.notes?.created?.length || 0) + (body.delta?.notes?.updated?.length || 0),
      images: body.delta?.images?.created?.length || 0,
    });
    
    // Get current cloud state
    let cloudData = await syncFromDrive(req);
    logger.debug("POST /api/sync - Current cloud state", {
      exists: !!cloudData,
      sessions: (cloudData?.sessions?.created?.length || 0) + (cloudData?.sessions?.updated?.length || 0),
      notes: (cloudData?.notes?.created?.length || 0) + (cloudData?.notes?.updated?.length || 0),
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
      
      // Upload image blobs to Drive if they don't have driveFileId yet
      // Images with driveFileId are already in Drive, we just need to ensure new ones are uploaded
      const imagesToUpload = [
        ...body.delta.images.created,
        ...body.delta.images.updated,
      ].filter((img) => !img.driveFileId); // Only upload if not already uploaded
      
      if (imagesToUpload.length > 0) {
        logger.debug(`Uploading ${imagesToUpload.length} image blobs to Drive`);
        // Note: We need image blobs from the client to upload them
        // For now, images will be uploaded on next sync when client detects they're missing driveFileId
        // This is a limitation - we sync metadata first, then upload blobs separately
      }
    }
    
        // Upload merged state to Drive
        logger.debug("POST /api/sync - Uploading merged state to Drive", {
          sessions: (cloudData?.sessions?.created?.length || 0) + (cloudData?.sessions?.updated?.length || 0),
          notes: (cloudData?.notes?.created?.length || 0) + (cloudData?.notes?.updated?.length || 0),
          images: cloudData?.images?.created?.length || 0,
        });
        await syncToDrive(req, cloudData);
        
        const syncTimestamp = Date.now();
        
        return NextResponse.json({
          success: true,
          syncTimestamp,
          conflicts: [], // Conflicts resolved server-side using last-write-wins
        } satisfies SyncResponse);
  } catch (error) {
    logger.error("Sync POST error", error);
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication first
    const { getToken } = await import("next-auth/jwt");
    const { auth } = await import("@/lib/auth");
    
    // In NextAuth v5, the cookie name is authjs.session-token (not next-auth.session-token)
    // In production, it's __Secure-authjs.session-token
    const cookieName = env.isProduction
      ? "__Secure-authjs.session-token" 
      : "authjs.session-token";
    
    // Check if the cookie exists
    const cookieValue = req.cookies.get(cookieName)?.value;
    const hasCookie = !!cookieValue;
    
    // Also get token for accessToken - this is the primary way to get accessToken
    // In NextAuth v5, getToken() reads from cookies in the request
    let token: any = null;
    let tokenError: Error | null = null;
    
    try {
      token = await getToken({ 
        req, 
        secret: env.NEXTAUTH_SECRET!,
        cookieName, // Explicitly tell getToken which cookie to read
      });
    } catch (error) {
      tokenError = error instanceof Error ? error : new Error(String(error));
      logger.error("GET /api/sync - Error getting token", { error: tokenError.message });
    }
    
    // If no token found with expected cookie name, try without specifying cookie name
    // (NextAuth will try to find it automatically)
    if (!token && !tokenError) {
      try {
        token = await getToken({ 
          req, 
          secret: env.NEXTAUTH_SECRET!,
        });
      } catch (error) {
        tokenError = error instanceof Error ? error : new Error(String(error));
        logger.error("GET /api/sync - Error getting token (fallback)", { error: tokenError.message });
      }
    }
    
    // Try to get session using auth() - but accessToken is primarily from token
    let session: any = null;
    let sessionError: Error | null = null;
    
    try {
      session = await auth();
    } catch (error) {
      sessionError = error instanceof Error ? error : new Error(String(error));
      logger.error("GET /api/sync - Error getting session", { error: sessionError.message });
    }
    
    // Get accessToken from token (primary) or session (fallback)
    // Token is preferred because it contains the JWT with accessToken
    const accessToken = token?.accessToken || (session as { accessToken?: string } | null)?.accessToken;
    
    // Debug logging
    if (env.isDebugMode) {
      logger.debug("GET /api/sync - Auth check", {
        hasCookie,
        cookieName,
        hasSession: !!session,
        hasToken: !!token,
        hasAccessToken: !!accessToken,
        tokenError: tokenError?.message,
        sessionError: sessionError?.message,
        cookies: req.cookies.getAll().map(c => c.name),
        secretLength: env.NEXTAUTH_SECRET?.length || 0,
      });
    }
    
    if (!accessToken) {
      // Provide more detailed error message
      const errorDetails: any = {
        hasCookie,
        cookieName,
        hasSession: !!session,
        hasToken: !!token,
        availableCookies: req.cookies.getAll().map(c => c.name),
      };
      
      if (tokenError) {
        errorDetails.tokenError = tokenError.message;
      }
      if (sessionError) {
        errorDetails.sessionError = sessionError.message;
      }
      if (hasCookie && !token) {
        errorDetails.hint = "Cookie exists but token decryption failed. This usually means NEXTAUTH_SECRET has changed or doesn't match the secret used to create the session. Try signing out and signing in again.";
      }
      
      logger.error("GET /api/sync - Not authenticated", errorDetails);
      return NextResponse.json(
        { 
          error: "Not authenticated. Please sign in.",
          ...(env.isDebugMode && { details: errorDetails })
        },
        { status: 401 }
      );
    }
    
    // Add accessToken to token if it came from session
    if (!token?.accessToken && accessToken) {
      token.accessToken = accessToken;
    }
    
    const since = req.nextUrl.searchParams.get("since");
    const sinceTimestamp = since ? parseInt(since, 10) : 0;
    const fullSync = req.nextUrl.searchParams.get("full") === "true";
    
    logger.debug("GET /api/sync - Request", {
      since: sinceTimestamp,
      fullSync,
    });
    
    let cloudData;
    try {
      cloudData = await syncFromDrive(req);
    } catch (error) {
      logger.error("Error fetching from Drive", error);
      // If no data exists or auth failed, return empty state
      cloudData = null;
    }
    
    logger.debug("GET /api/sync - Retrieved data", {
      exists: !!cloudData,
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
        created: cloudState.sessions.created.filter((s: Session) => {
          const created = s.createdAt || s.lastModified;
          return created > sinceTimestamp;
        }),
        updated: cloudState.sessions.updated.filter((s: Session) => {
          const modified = s.lastModified || s.createdAt;
          return modified > sinceTimestamp;
        }),
        deleted: cloudState.sessions.deleted,
      },
      notes: {
        created: cloudState.notes.created.filter((n: Note) => {
          const created = n.createdAt || n.lastModified;
          return created > sinceTimestamp;
        }),
        updated: cloudState.notes.updated.filter((n: Note) => {
          const modified = n.lastModified || n.createdAt;
          return modified > sinceTimestamp;
        }),
        deleted: cloudState.notes.deleted,
      },
      images: {
        created: cloudState.images.created.filter((i) => {
          const created = i.createdAt || 0;
          return created > sinceTimestamp;
        }),
        updated: cloudState.images.updated.filter((i) => {
          // Image metadata doesn't have syncTimestamp, use createdAt or check for updates
          const updated = i.createdAt || 0;
          return updated > sinceTimestamp;
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
    logger.error("Sync GET error", error);
    const errorMessage = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json(
      { error: errorMessage, details: String(error) },
      { status: 500 }
    );
  }
}

