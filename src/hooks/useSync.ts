"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import * as db from "@/lib/db";
import { getImage } from "@/lib/db";
import { getSyncMetadata, updateSyncMetadata } from "@/lib/syncMetadata";
import { getPendingChanges, removePendingChange } from "@/lib/pendingChanges";
import { generateLocalDelta, applyCloudDelta, type SyncDelta } from "@/lib/deltaSync";
import { setSyncTrigger } from "@/lib/syncTrigger";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
}

export function useSync() {
  const { data: session } = useSession();
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  });
  
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const syncInProgressRef = useRef(false);
  const hasInitialSyncedRef = useRef(false);

  useEffect(() => {
    console.log("🔐 useSync: Session status:", {
      hasSession: !!session,
      sessionUser: session?.user?.email || "none",
      isAuthenticated: !!session,
    });
    
    if (!session) {
      console.log("⚠️ useSync: No session, skipping sync setup");
      return;
    }

    console.log("✅ useSync: Setting up sync for authenticated user:", session.user?.email);

    // Monitor online/offline status
    const handleOnline = async () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      // Only sync when coming online if there are pending changes
      const pending = await getPendingChanges();
      if (pending.length > 0) {
        performSync(); // Sync immediately when coming online with pending changes
      }
    };
    
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync only once (on mount)
    if (!hasInitialSyncedRef.current) {
      hasInitialSyncedRef.current = true;
      console.log("🚀 useSync: Starting initial sync...");
      performSync();
    }

    // No periodic checks - sync is triggered by actual data changes via triggerSync()

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [session]); // Only depend on session, not syncState.isOnline

  async function performSync() {
    if (syncInProgressRef.current || !syncState.isOnline) return;
    
    syncInProgressRef.current = true;
    setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
    
    try {
      const syncMetadata = await getSyncMetadata();
      const lastSync = syncMetadata?.lastSyncTimestamp || 0;
      
      // Check if local database is empty - if so, force full sync
      const localSessions = await db.listSessions();
      const isLocalEmpty = localSessions.length === 0;
      
      console.log("🔄 Starting sync, lastSync:", lastSync, "localEmpty:", isLocalEmpty);
      
      // Step 1: Get cloud delta FIRST (or full data if first sync or local is empty)
      // If local database is empty, force full sync to restore all data
      const shouldFullSync = lastSync === 0 || isLocalEmpty;
      const sinceParam = shouldFullSync ? "full=true" : `since=${lastSync}`;
      console.log("📥 Fetching from cloud:", sinceParam, shouldFullSync ? "(forced full sync - local empty)" : "");
      const cloudResponse = await fetch(`/api/sync?${sinceParam}`, {
        credentials: "include", // Ensure cookies are sent
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      if (!cloudResponse.ok) {
        const errorData = await cloudResponse.json().catch(() => ({}));
        const errorMessage = errorData.error || errorData.details || cloudResponse.statusText;
        throw new Error(`Sync failed: ${errorMessage}`);
      }
      
      const responseData = await cloudResponse.json();
      const cloudDelta = responseData.delta || responseData.data;
      const syncTimestamp = responseData.syncTimestamp || Date.now();
      
      console.log("📦 Cloud data received:", {
        hasData: !!responseData.data,
        hasDelta: !!responseData.delta,
        sessions: cloudDelta?.sessions?.created?.length || 0,
        notes: cloudDelta?.notes?.created?.length || 0,
        images: cloudDelta?.images?.created?.length || 0,
      });
      
      // Step 2: Generate local delta (after fetching cloud, so we know what's new)
      const localDelta = await generateLocalDelta(lastSync);
      console.log("📤 Local delta:", {
        sessions: localDelta.sessions.created.length + localDelta.sessions.updated.length,
        notes: localDelta.notes.created.length + localDelta.notes.updated.length,
        images: localDelta.images.created.length,
      });
      
      // Step 3: Apply cloud changes locally (with conflict resolution)
      if (cloudDelta) {
        // If it's full data (initial sync), apply everything
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
          
          const { conflicts } = await applyCloudDelta(fullDelta, "last-write-wins");
          console.log("✅ Applied cloud data locally", {
            conflicts: conflicts.length,
            sessionsApplied: fullDelta.sessions.created.length + fullDelta.sessions.updated.length,
            notesApplied: fullDelta.notes.created.length + fullDelta.notes.updated.length,
          });
          if (conflicts.length > 0) {
            console.warn("Conflicts resolved:", conflicts);
          }
          
          // Restore missing image blobs after applying metadata (full sync)
          const imagesNeedingRestoration: any[] = [];
          for (const imageMeta of [
            ...(fullDelta.images?.created || []),
            ...(fullDelta.images?.updated || []),
          ]) {
            if (imageMeta.driveFileId) {
              const existing = await db.getImage(imageMeta.id);
              if (!existing) {
                imagesNeedingRestoration.push(imageMeta);
              }
            }
          }
          
          if (imagesNeedingRestoration.length > 0) {
            console.log(`📥 Restoring ${imagesNeedingRestoration.length} image blobs from Drive (full sync)...`);
            const restorePromises = imagesNeedingRestoration.map(async (imageMeta: any) => {
              try {
                const response = await fetch(`/api/images/restore?imageId=${imageMeta.id}&driveFileId=${imageMeta.driveFileId}`, {
                  credentials: "include", // Ensure cookies are sent
                });
                if (response.ok) {
                  console.log(`✅ Restored image: ${imageMeta.id}`);
                  return true;
                } else {
                  const errorText = await response.text();
                  console.error(`❌ Failed to restore image ${imageMeta.id}:`, errorText);
                  return false;
                }
              } catch (error) {
                console.error(`❌ Error restoring image ${imageMeta.id}:`, error);
                return false;
              }
            });
            
            const results = await Promise.all(restorePromises);
            const successCount = results.filter(r => r).length;
            console.log(`✅ Restored ${successCount}/${imagesNeedingRestoration.length} images`);
          }
        } else if (cloudDelta) {
          // Delta sync - apply only changes
          const { conflicts } = await applyCloudDelta(cloudDelta, "last-write-wins");
          console.log("✅ Applied cloud delta locally", {
            conflicts: conflicts.length,
            sessionsApplied: (cloudDelta.sessions?.created?.length || 0) + (cloudDelta.sessions?.updated?.length || 0),
            notesApplied: (cloudDelta.notes?.created?.length || 0) + (cloudDelta.notes?.updated?.length || 0),
          });
          if (conflicts.length > 0) {
            console.warn("Conflicts resolved:", conflicts);
          }
          
          // Restore missing image blobs after applying metadata
          // Check which images actually need restoration (not in local DB)
          const imagesNeedingRestoration: any[] = [];
          for (const imageMeta of [
            ...(cloudDelta.images?.created || []),
            ...(cloudDelta.images?.updated || []),
          ]) {
            if (imageMeta.driveFileId) {
              const existing = await db.getImage(imageMeta.id);
              if (!existing) {
                imagesNeedingRestoration.push(imageMeta);
              }
            }
          }
          
          if (imagesNeedingRestoration.length > 0) {
            console.log(`📥 Restoring ${imagesNeedingRestoration.length} image blobs from Drive...`);
            // Restore images in parallel (but with some limit to avoid overwhelming)
            const restorePromises = imagesNeedingRestoration.map(async (imageMeta: any) => {
              try {
                const response = await fetch(`/api/images/restore?imageId=${imageMeta.id}&driveFileId=${imageMeta.driveFileId}`, {
                  credentials: "include", // Ensure cookies are sent
                });
                if (response.ok) {
                  console.log(`✅ Restored image: ${imageMeta.id}`);
                  return true;
                } else {
                  const errorText = await response.text();
                  console.error(`❌ Failed to restore image ${imageMeta.id}:`, errorText);
                  return false;
                }
              } catch (error) {
                console.error(`❌ Error restoring image ${imageMeta.id}:`, error);
                return false;
              }
            });
            
            const results = await Promise.all(restorePromises);
            const successCount = results.filter(r => r).length;
            console.log(`✅ Restored ${successCount}/${imagesNeedingRestoration.length} images`);
          }
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
        // Before syncing, upload any images that don't have driveFileId yet
        const imagesToUpload = [
          ...localDelta.images.created,
          ...localDelta.images.updated,
        ].filter((img: any) => !img.driveFileId);
        
        if (imagesToUpload.length > 0) {
          console.log(`📤 Uploading ${imagesToUpload.length} image blobs to Drive before sync...`);
          for (const imageMeta of imagesToUpload) {
            try {
              // Get the full image from local DB to get the blob
              const image = await db.getImage(imageMeta.id);
              if (image && !image.driveFileId) {
                // Upload blob via API
                const formData = new FormData();
                formData.append("imageId", image.id);
                formData.append("blob", image.data, `${image.id}.${image.contentType.split('/')[1] || 'png'}`);
                formData.append("contentType", image.contentType);
                formData.append("sessionId", image.sessionId);
                
                const uploadResponse = await fetch("/api/images/upload", {
                  method: "POST",
                  credentials: "include", // Ensure cookies are sent
                  body: formData,
                });
                
                if (uploadResponse.ok) {
                  const result = await uploadResponse.json();
                  console.log(`✅ Uploaded image to Drive: ${image.id} -> ${result.driveFileId}`);
                  // Update local image with driveFileId (this also updates syncTimestamp)
                  await db.updateImage(image.id, { 
                    driveFileId: result.driveFileId,
                    syncTimestamp: Date.now(),
                  });
                  // Update delta with driveFileId so it's included in the sync
                  const imgInDelta = localDelta.images.created.find((img: any) => img.id === image.id) ||
                                   localDelta.images.updated.find((img: any) => img.id === image.id);
                  if (imgInDelta) {
                    imgInDelta.driveFileId = result.driveFileId;
                  }
                } else {
                  const errorText = await uploadResponse.text();
                  console.error(`❌ Failed to upload image ${image.id}:`, errorText);
                }
              }
            } catch (error) {
              console.error(`❌ Error uploading image ${imageMeta.id}:`, error);
            }
          }
        }
        
        const syncResponse = await fetch("/api/sync", {
          method: "POST",
          credentials: "include", // Ensure cookies are sent
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta: localDelta }),
        });
        
        if (!syncResponse.ok) {
          const errorData = await syncResponse.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details || syncResponse.statusText;
          throw new Error(`Upload failed: ${errorMessage}`);
        }
        
        // Clear pending changes that were synced
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
      
      // Step 5: Update sync metadata
      await updateSyncMetadata({
        lastSyncTimestamp: syncTimestamp,
        lastCloudTimestamp: syncTimestamp,
        syncVersion: localDelta.metadata.syncVersion,
      });
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: syncTimestamp,
        error: null,
      }));
      
      console.log("✅ Sync completed successfully");
    } catch (error) {
      console.error("❌ Sync failed:", error);
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : "Sync failed",
      }));
    } finally {
      syncInProgressRef.current = false;
    }
  }

  // Trigger sync immediately (debounced to batch rapid changes)
  const triggerSync = () => {
    if (!syncState.isOnline || syncInProgressRef.current) return;
    
    // Clear any existing timeout
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
    }
    
    // Debounce sync - wait 2 seconds after last trigger
    intervalRef.current = setTimeout(() => {
      performSync();
    }, 2000);
  };
  
  // Register trigger function globally so DB operations can call it
  useEffect(() => {
    setSyncTrigger(triggerSync);
    return () => {
      setSyncTrigger(() => {}); // Clear on unmount
    };
  }, [syncState.isOnline]);

  return { 
    isAuthenticated: !!session,
    isOnline: syncState.isOnline,
    isSyncing: syncState.isSyncing,
    lastSyncTime: syncState.lastSyncTime,
    error: syncState.error,
    performSync, // Immediate sync (for manual trigger)
    triggerSync, // Debounced sync (for automatic trigger on changes)
  };
}
