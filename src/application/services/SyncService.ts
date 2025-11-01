import type { SyncDelta } from "@/domain/types/SyncDelta";
import { getSyncMetadata, updateSyncMetadata } from "@/lib/syncMetadata";
import { getPendingChanges, removePendingChange } from "@/lib/pendingChanges";
import { generateLocalDelta, applyCloudDelta } from "@/lib/deltaSync";
import { getImage, updateImage, listSessions } from "@/lib/db";
import { getDB } from "@/infrastructure/database/IndexedDBClient";
import { logger } from "@/shared/utils/logger";
import { SyncError } from "@/shared/errors";

export interface SyncResult {
  success: boolean;
  timestamp: number;
  conflicts?: string[];
  error?: string;
}

export interface SyncServiceOptions {
  forceFullSync?: boolean;
}

/**
 * Application service for synchronization operations
 * Handles bidirectional sync between local IndexedDB and Google Drive
 */
export class SyncService {
  /**
   * Perform a full synchronization cycle
   */
  static async sync(options: SyncServiceOptions = {}): Promise<SyncResult> {
    try {
      const syncMetadata = await getSyncMetadata();
      const lastSync = syncMetadata?.lastSyncTimestamp || 0;
      
      // Check if local database is empty - if so, force full sync
      const localSessions = await listSessions();
      const isLocalEmpty = localSessions.length === 0;
      
      // Step 1: Get cloud delta FIRST (or full data if first sync or local is empty)
      const shouldFullSync = options.forceFullSync || lastSync === 0 || isLocalEmpty;
      const sinceParam = shouldFullSync ? "full=true" : `since=${lastSync}`;
      
      const cloudResponse = await fetch(`/api/sync?${sinceParam}`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!cloudResponse.ok) {
        const errorData = await cloudResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || cloudResponse.statusText;
        throw new SyncError(`Sync failed: ${errorMessage}`);
      }
      
      const responseData = await cloudResponse.json();
      const cloudDelta = responseData.delta || responseData.data;
      const syncTimestamp = responseData.syncTimestamp || Date.now();
      
      // Step 2: Generate local delta (after fetching cloud, so we know what's new)
      const localDelta = await generateLocalDelta(lastSync);
      
      // Step 3: Apply cloud changes locally (with conflict resolution)
      let conflicts: string[] = [];
      if (cloudDelta) {
        if (responseData.data) {
          // Full sync - apply all data
          const fullDelta: SyncDelta = {
            sessions: {
              created: cloudDelta.sessions?.created || [],
              updated: cloudDelta.sessions?.updated || [],
              deleted: cloudDelta.sessions?.deleted || [],
            },
            notes: {
              created: cloudDelta.notes?.created || [],
              updated: cloudDelta.notes?.updated || [],
              deleted: cloudDelta.notes?.deleted || [],
            },
            images: {
              created: cloudDelta.images?.created || [],
              updated: cloudDelta.images?.updated || [],
              deleted: cloudDelta.images?.deleted || [],
            },
            metadata: cloudDelta.metadata || {
              lastLocalChangeTimestamp: 0,
              syncVersion: 0,
            },
          };
          
          const result = await applyCloudDelta(fullDelta, "last-write-wins");
          conflicts = result.conflicts;
          
          // Restore missing image blobs after applying metadata (full sync)
          await this.restoreMissingImages(fullDelta.images?.created || [], fullDelta.images?.updated || []);
        } else if (cloudDelta) {
          // Delta sync - apply only changes
          const result = await applyCloudDelta(cloudDelta, "last-write-wins");
          conflicts = result.conflicts;
          
          // Restore missing image blobs after applying metadata
          await this.restoreMissingImages(
            cloudDelta.images?.created || [],
            cloudDelta.images?.updated || []
          );
        }
      }
      
      // Step 4: Send local changes to cloud
      const hasLocalChanges = 
        localDelta.sessions.created.length > 0 || 
        localDelta.sessions.updated.length > 0 ||
        localDelta.notes.created.length > 0 ||
        localDelta.notes.updated.length > 0 ||
        localDelta.images.created.length > 0 ||
        localDelta.images.updated.length > 0;
      
      if (hasLocalChanges) {
        await this.uploadMissingImages(localDelta);
        
        const syncResponse = await fetch("/api/sync", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta: localDelta }),
        });
        
        if (!syncResponse.ok) {
          const errorData = await syncResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details || syncResponse.statusText;
          throw new SyncError(`Upload failed: ${errorMessage}`);
        }
        
        // Clear pending changes that were synced
        await this.clearSyncedPendingChanges(localDelta, lastSync);
      }
      
      // Step 5: Update sync metadata
      await updateSyncMetadata({
        lastSyncTimestamp: syncTimestamp,
        lastCloudTimestamp: syncTimestamp,
        syncVersion: localDelta.metadata.syncVersion,
      });
      
      return {
        success: true,
        timestamp: syncTimestamp,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      logger.error("Sync failed:", error);
      return {
        success: false,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  /**
   * Restore missing image blobs from Google Drive
   */
  private static async restoreMissingImages(
    created: Array<{ id: string; sessionId: string; contentType: string; createdAt: number; driveFileId?: string }>,
    updated: Array<{ id: string; sessionId: string; contentType: string; createdAt: number; driveFileId?: string }>
  ): Promise<void> {
    const imagesNeedingRestoration: Array<{
      id: string;
      sessionId: string;
      contentType: string;
      createdAt: number;
      driveFileId?: string;
    }> = [];
    
    for (const imageMeta of [...created, ...updated]) {
      if (imageMeta.driveFileId) {
        const existing = await getImage(imageMeta.id);
        if (!existing) {
          imagesNeedingRestoration.push(imageMeta);
        }
      }
    }
    
    if (imagesNeedingRestoration.length === 0) {
      return;
    }
    
    // Restore images in parallel (but with some limit to avoid overwhelming)
    const restorePromises = imagesNeedingRestoration.map(async (imageMeta) => {
      try {
        const response = await fetch(
          `/api/images/restore?imageId=${imageMeta.id}&driveFileId=${imageMeta.driveFileId}&contentType=${encodeURIComponent(imageMeta.contentType || "image/png")}`,
          {
            credentials: "include",
          }
        );
        
        if (!response.ok) {
          logger.error(`Failed to restore image ${imageMeta.id}: ${response.statusText}`);
          return false;
        }
        
        const result = await response.json();
        
        // Convert base64 back to blob
        const binaryString = atob(result.data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: result.contentType });
        
        // Store in IndexedDB
        const db = await getDB();
        const image = {
          id: result.imageId,
          sessionId: imageMeta.sessionId,
          data: blob,
          contentType: result.contentType,
          timestamp: imageMeta.createdAt || Date.now(),
          createdAt: imageMeta.createdAt,
          driveFileId: result.driveFileId,
          syncTimestamp: Date.now(),
        };
        await db.put("images", image);
        return true;
      } catch (error) {
        logger.error(`Failed to restore image ${imageMeta.id}:`, error);
        return false;
      }
    });
    
    await Promise.all(restorePromises);
  }

  /**
   * Upload images that don't have driveFileId yet
   */
  private static async uploadMissingImages(localDelta: SyncDelta): Promise<void> {
    const imagesToUpload = [
      ...localDelta.images.created,
      ...localDelta.images.updated,
    ].filter((img) => !img.driveFileId);
    
    if (imagesToUpload.length === 0) {
      return;
    }
    
    for (const imageMeta of imagesToUpload) {
      try {
        // Get the full image from local DB to get the blob
        const image = await getImage(imageMeta.id);
        if (!image || image.driveFileId) {
          continue;
        }
        
        // Upload blob via API
        // Convert Blob to File to ensure proper FormData handling
        const blob = image.data instanceof Blob 
          ? image.data 
          : new Blob([image.data], { type: image.contentType });
        const file = new File(
          [blob],
          `${image.id}.${image.contentType.split('/')[1] || 'png'}`,
          { type: image.contentType }
        );
        
        const formData = new FormData();
        formData.append("imageId", image.id);
        formData.append("blob", file);
        formData.append("contentType", image.contentType);
        formData.append("sessionId", image.sessionId);
        
        const uploadResponse = await fetch("/api/images/upload", {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        
        if (!uploadResponse.ok) {
          logger.error(`Failed to upload image ${image.id}: ${uploadResponse.statusText}`);
          continue;
        }
        
        const result = await uploadResponse.json();
        
        // Update local image with driveFileId (this also updates syncTimestamp)
        await updateImage(image.id, { 
          driveFileId: result.driveFileId,
          syncTimestamp: Date.now(),
        });
        
        // Update delta with driveFileId so it's included in the sync
        const imgInDelta = 
          localDelta.images.created.find((img) => img.id === image.id) ||
          localDelta.images.updated.find((img) => img.id === image.id);
        if (imgInDelta) {
          imgInDelta.driveFileId = result.driveFileId;
        }
      } catch (error) {
        logger.error(`Error uploading image ${imageMeta.id}:`, error);
        // Continue with other images even if one fails
      }
    }
  }

  /**
   * Clear pending changes that have been successfully synced
   */
  private static async clearSyncedPendingChanges(localDelta: SyncDelta, lastSync: number): Promise<void> {
    const pendingChanges = await getPendingChanges();
    
    for (const change of pendingChanges) {
      // Check if this change was in our local delta
      const wasSynced = 
        (localDelta.sessions.created.some(s => s.id === change.entityId) ||
         localDelta.sessions.updated.some(s => s.id === change.entityId)) ||
        (localDelta.notes.created.some(n => n.id === change.entityId) ||
         localDelta.notes.updated.some(n => n.id === change.entityId));
      
      if (wasSynced || change.timestamp < lastSync) {
        await removePendingChange(change.id);
      }
    }
  }
}

