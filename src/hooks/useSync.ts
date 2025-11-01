"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { SyncService } from "@/application/services/SyncService";
import { getPendingChanges } from "@/lib/pendingChanges";
import { setSyncTrigger } from "@/lib/syncTrigger";
import { CONSTANTS } from "@/shared/config/constants";

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
    if (!session) {
      return;
    }

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
      const result = await SyncService.sync();
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: result.timestamp,
        error: result.error || null,
      }));
    } catch (error) {
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
    
    // Debounce sync - wait after last trigger
    intervalRef.current = setTimeout(() => {
      performSync();
    }, CONSTANTS.SYNC_DEBOUNCE_MS);
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
