# Google Drive Sync Implementation Plan

## Overview
Implement intelligent bidirectional sync between IndexedDB and Google Drive with:
- Delta sync (only changed items)
- Offline-first architecture (write to IndexedDB, sync when online)
- Timestamp-based conflict resolution
- Cross-device synchronization

## Architecture Overview

```
┌─────────────────┐
│   IndexedDB     │ (Local, always writable)
│   (Offline)     │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Sync Queue│ (Pending changes when offline)
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Sync Engine│ (Bidirectional, delta-based)
    └────┬─────┘
         │
    ┌────▼─────┐
    │ API Routes│ (Server-side Google Drive access)
    └────┬─────┘
         │
    ┌────▼─────┐
    │Google Drive│ (Cloud, single source of truth per user)
    └───────────┘
```

## Phase 1: Data Model Enhancements

### 1.1 Add Sync Metadata to IndexedDB Schema

**File:** `src/lib/db.ts`

Add new interface and store for sync metadata:

```typescript
export interface SyncMetadata {
  id: string; // "sync_metadata"
  lastSyncTimestamp: number; // Last successful sync time
  lastLocalChangeTimestamp: number; // Last local modification
  lastCloudTimestamp: number; // Last known cloud modification
  syncVersion: number; // Increments on each sync
}

export interface PendingChange {
  id: string; // Unique change ID
  entityType: "session" | "note" | "image";
  entityId: string;
  operation: "create" | "update" | "delete";
  timestamp: number; // When change was made
  data?: any; // Entity data (for create/update)
  retryCount: number; // Number of sync attempts
}
```

Update DB schema to add:
- `syncMetadata` store (key: "sync_metadata")
- `pendingChanges` store (keyed by change ID, indexed by timestamp)

### 1.2 Enhance Entity Interfaces

Add sync timestamps to all entities:

```typescript
export interface Session {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  updatedAt?: number;
  score: number;
  syncVersion?: number; // Track sync version
  syncTimestamp?: number; // Last sync time
}

export interface Note {
  id: string;
  sessionId: string;
  content: string;
  createdAt: number;
  lastModified: number;
  updatedAt?: number;
  syncVersion?: number;
  syncTimestamp?: number;
}

export interface Image {
  id: string;
  sessionId: string;
  data: Blob;
  contentType: string;
  timestamp: number;
  createdAt?: number;
  syncVersion?: number;
  syncTimestamp?: number;
  driveFileId?: string; // Store Drive file ID for images
}
```

## Phase 2: Sync Metadata Management

### 2.1 Create Sync Metadata Helper

**File:** `src/lib/syncMetadata.ts` (new file)

```typescript
import { getDB } from "./db";

const SYNC_METADATA_ID = "sync_metadata";

export async function getSyncMetadata(): Promise<SyncMetadata | null> {
  const db = await getDB();
  return db.get("syncMetadata", SYNC_METADATA_ID) || null;
}

export async function updateSyncMetadata(updates: Partial<SyncMetadata>): Promise<void> {
  const db = await getDB();
  const existing = await getSyncMetadata();
  
  const metadata: SyncMetadata = {
    id: SYNC_METADATA_ID,
    lastSyncTimestamp: 0,
    lastLocalChangeTimestamp: 0,
    lastCloudTimestamp: 0,
    syncVersion: 0,
    ...existing,
    ...updates,
  };
  
  await db.put("syncMetadata", metadata);
}

export async function markLocalChange(): Promise<void> {
  await updateSyncMetadata({
    lastLocalChangeTimestamp: Date.now(),
  });
}
```

### 2.2 Create Pending Changes Queue

**File:** `src/lib/pendingChanges.ts` (new file)

```typescript
import { getDB } from "./db";

export async function addPendingChange(
  entityType: "session" | "note" | "image",
  entityId: string,
  operation: "create" | "update" | "delete",
  data?: any
): Promise<void> {
  const db = await getDB();
  
  const change: PendingChange = {
    id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    entityType,
    entityId,
    operation,
    timestamp: Date.now(),
    data,
    retryCount: 0,
  };
  
  await db.add("pendingChanges", change);
  await markLocalChange();
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await getDB();
  const index = db.transaction("pendingChanges").store.index("timestamp");
  return index.getAll();
}

export async function removePendingChange(changeId: string): Promise<void> {
  const db = await getDB();
  await db.delete("pendingChanges", changeId);
}

export async function incrementRetryCount(changeId: string): Promise<void> {
  const db = await getDB();
  const change = await db.get("pendingChanges", changeId);
  if (change) {
    change.retryCount += 1;
    await db.put("pendingChanges", change);
  }
}
```

## Phase 3: Delta Sync Engine

### 3.1 Create Delta Sync Logic

**File:** `src/lib/deltaSync.ts` (new file)

```typescript
import * as db from "./db";
import type { Session, Note, Image } from "./db";

interface SyncDelta {
  sessions: {
    created: Session[];
    updated: Session[];
    deleted: string[]; // IDs
  };
  notes: {
    created: Note[];
    updated: Note[];
    deleted: string[]; // IDs
  };
  images: {
    created: Array<{ id: string; sessionId: string; contentType: string; createdAt: number }>;
    updated: Array<{ id: string; sessionId: string; contentType: string; createdAt: number }>;
    deleted: string[]; // IDs
  };
  metadata: {
    lastLocalChangeTimestamp: number;
    syncVersion: number;
  };
}

export async function generateLocalDelta(sinceTimestamp: number): Promise<SyncDelta> {
  const sessions = await db.listSessions();
  const allNotes: Note[] = [];
  const allImages: Image[] = [];
  
  // Get all notes and images
  for (const session of sessions) {
    const notes = await db.listNotes(session.id);
    const images = await db.listImages(session.id);
    allNotes.push(...notes);
    allImages.push(...images);
  }
  
  const syncMetadata = await getSyncMetadata();
  const lastSync = syncMetadata?.lastSyncTimestamp || 0;
  
  // Filter by lastModified > lastSync
  const delta: SyncDelta = {
    sessions: {
      created: sessions.filter(s => s.createdAt > sinceTimestamp && s.createdAt === s.lastModified),
      updated: sessions.filter(s => s.lastModified > sinceTimestamp && s.createdAt !== s.lastModified),
      deleted: [], // Deleted items tracked separately
    },
    notes: {
      created: allNotes.filter(n => n.createdAt > sinceTimestamp && n.createdAt === n.lastModified),
      updated: allNotes.filter(n => n.lastModified > sinceTimestamp && n.createdAt !== n.lastModified),
      deleted: [],
    },
    images: {
      created: allImages.filter(img => (img.createdAt || img.timestamp) > sinceTimestamp).map(img => ({
        id: img.id,
        sessionId: img.sessionId,
        contentType: img.contentType,
        createdAt: img.createdAt || img.timestamp,
      })),
      updated: [],
      deleted: [],
    },
    metadata: {
      lastLocalChangeTimestamp: syncMetadata?.lastLocalChangeTimestamp || 0,
      syncVersion: (syncMetadata?.syncVersion || 0) + 1,
    },
  };
  
  return delta;
}

export async function applyCloudDelta(
  cloudData: SyncDelta,
  mergeStrategy: "last-write-wins" | "manual-merge" = "last-write-wins"
): Promise<void> {
  // Merge cloud changes into local DB
  // Use lastModified timestamp for conflict resolution
  
  // Merge sessions
  for (const session of [...cloudData.sessions.created, ...cloudData.sessions.updated]) {
    const existing = await db.getSession(session.id);
    
    if (!existing) {
      // New session - add it
      await db.add("sessions", session);
    } else {
      // Conflict resolution: last-write-wins
      const localNewer = (existing.lastModified || existing.createdAt) > (session.lastModified || session.createdAt);
      
      if (localNewer && mergeStrategy === "last-write-wins") {
        // Keep local version, but update sync timestamp
        await db.updateSession(session.id, {
          syncVersion: session.syncVersion,
          syncTimestamp: Date.now(),
        });
      } else {
        // Cloud version is newer - apply it
        await db.updateSession(session.id, session);
      }
    }
  }
  
  // Merge notes
  for (const note of [...cloudData.notes.created, ...cloudData.notes.updated]) {
    const existing = await db.getNote(note.id);
    
    if (!existing) {
      // Create note
      await db.add("notes", note);
    } else {
      const localNewer = (existing.lastModified || existing.createdAt) > (note.lastModified || note.createdAt);
      
      if (localNewer && mergeStrategy === "last-write-wins") {
        // Keep local, update sync metadata
        await db.updateNote(note.id, existing.content);
      } else {
        // Apply cloud version
        await db.updateNote(note.id, note.content);
      }
    }
  }
  
  // Handle deletions
  for (const sessionId of cloudData.sessions.deleted) {
    await db.deleteSession(sessionId);
  }
  
  for (const noteId of cloudData.notes.deleted) {
    await db.deleteNote(noteId);
  }
}
```

## Phase 4: Offline Queue Integration

### 4.1 Update DB Operations to Track Changes

**File:** `src/lib/db.ts` (modify existing functions)

Wrap all write operations to track pending changes:

```typescript
import { addPendingChange, markLocalChange } from "./pendingChanges";

export async function createSession(title: string): Promise<Session> {
  const db = await getDB();
  const now = Date.now();
  const session: Session = {
    id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
    title,
    createdAt: now,
    lastModified: now,
    score: 0,
  };

  await db.add("sessions", session);
  
  // Track for sync
  await addPendingChange("session", session.id, "create", session);
  await markLocalChange();
  
  return session;
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
  const db = await getDB();
  const session = await db.get("sessions", id);
  
  if (!session) return undefined;

  const updated = {
    ...session,
    ...updates,
    lastModified: Date.now(),
  };

  await db.put("sessions", updated);
  
  // Track for sync
  await addPendingChange("session", id, "update", updated);
  await markLocalChange();
  
  return updated;
}

// Similar updates for notes and images...
```

## Phase 5: Enhanced Sync API Routes

### 5.1 Update Sync Route for Delta Sync

**File:** `src/app/api/sync/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { syncToDrive, syncFromDrive } from "@/lib/googleDrive";

interface SyncRequest {
  delta?: {
    sessions: any[];
    notes: any[];
    images: any[];
    metadata: {
      lastLocalChangeTimestamp: number;
      syncVersion: number;
    };
  };
  lastSyncTimestamp?: number;
}

export async function POST(req: NextRequest) {
  try {
    const body: SyncRequest = await req.json();
    
    // Get current cloud state
    const cloudData = await syncFromDrive(req);
    
    // Merge delta into cloud data
    if (body.delta) {
      // Merge client delta into cloud state
      // Apply conflict resolution
    }
    
    // Upload merged state
    await syncToDrive(req, mergedData);
    
    return NextResponse.json({ 
      success: true,
      syncTimestamp: Date.now(),
      conflicts: [], // Any conflicts found
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const since = req.nextUrl.searchParams.get("since");
    const sinceTimestamp = since ? parseInt(since, 10) : 0;
    
    const data = await syncFromDrive(req);
    
    // Return only delta if sinceTimestamp provided
    if (sinceTimestamp > 0) {
      // Filter to return only changes since timestamp
      return NextResponse.json({ 
        delta: filterDelta(data, sinceTimestamp),
        syncTimestamp: Date.now(),
      });
    }
    
    return NextResponse.json({ 
      data,
      syncTimestamp: Date.now(),
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

function filterDelta(cloudData: any, sinceTimestamp: number) {
  // Filter cloud data to return only changes since timestamp
  // Implementation depends on how cloud stores timestamps
}
```

## Phase 6: Smart Sync Hook

### 6.1 Rewrite useSync Hook

**File:** `src/hooks/useSync.ts` (complete rewrite)

```typescript
"use client";

import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import * as db from "@/lib/db";
import { getSyncMetadata, updateSyncMetadata } from "@/lib/syncMetadata";
import { getPendingChanges, removePendingChange } from "@/lib/pendingChanges";
import { generateLocalDelta, applyCloudDelta } from "@/lib/deltaSync";

export function useSync() {
  const { data: session } = useSession();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    if (!session) return;

    // Monitor online/offline status
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      performSync(); // Sync immediately when coming online
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial sync
    performSync();

    // Auto-sync every 60 seconds (only when online)
    intervalRef.current = setInterval(() => {
      if (isOnline && !syncInProgressRef.current) {
        performSync();
      }
    }, 60000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [session, isOnline]);

  async function performSync() {
    if (syncInProgressRef.current || !isOnline) return;
    
    syncInProgressRef.current = true;
    setIsSyncing(true);
    
    try {
      const syncMetadata = await getSyncMetadata();
      const lastSync = syncMetadata?.lastSyncTimestamp || 0;
      
      // Step 1: Generate local delta
      const localDelta = await generateLocalDelta(lastSync);
      
      // Step 2: Get cloud delta
      const cloudResponse = await fetch(`/api/sync?since=${lastSync}`);
      const { delta: cloudDelta, syncTimestamp } = await cloudResponse.json();
      
      // Step 3: Apply cloud changes locally (with conflict resolution)
      if (cloudDelta) {
        await applyCloudDelta(cloudDelta, "last-write-wins");
      }
      
      // Step 4: Send local changes to cloud
      const pendingChanges = await getPendingChanges();
      
      if (localDelta.sessions.created.length > 0 || 
          localDelta.sessions.updated.length > 0 ||
          localDelta.notes.created.length > 0 ||
          localDelta.notes.updated.length > 0) {
        
        await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ delta: localDelta }),
        });
        
        // Clear pending changes that were synced
        for (const change of pendingChanges) {
          await removePendingChange(change.id);
        }
      }
      
      // Step 5: Update sync metadata
      await updateSyncMetadata({
        lastSyncTimestamp: syncTimestamp || Date.now(),
        lastCloudTimestamp: syncTimestamp || Date.now(),
        syncVersion: localDelta.metadata.syncVersion,
      });
      
      console.log("✅ Sync completed successfully");
    } catch (error) {
      console.error("❌ Sync failed:", error);
      // Retry logic could go here
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }

  return { 
    isAuthenticated: !!session,
    isOnline,
    isSyncing,
    performSync, // Expose for manual sync button
  };
}
```

## Phase 7: Image Sync Strategy

### 7.1 Handle Images Separately

Images are large blobs - sync metadata first, then fetch images on-demand:

```typescript
// In sync data structure:
{
  images: {
    created: [
      {
        id: "img_123",
        sessionId: "session_456",
        contentType: "image/png",
        createdAt: 1234567890,
        driveFileId: "google_drive_file_id_xyz", // Store Drive file ID
      }
    ],
    // Don't include blob data in sync
  }
}

// When image needed, fetch from Drive using driveFileId
// Cache in IndexedDB after first fetch
```

## Phase 8: Conflict Resolution Strategy

### 8.1 Last-Write-Wins with Timestamps

**Strategy:**
1. Compare `lastModified` timestamps
2. If local is newer → keep local, update sync metadata
3. If cloud is newer → apply cloud version
4. If equal → keep local (prefer user's current state)

**For Notes (content conflicts):**
- If both modified, use timestamp
- Could add "manual merge" mode later (show diff UI)

**For Sessions:**
- Merge score (additive)
- Use newer title/other fields

## Phase 9: Testing Scenarios

### Scenario 1: Online Write → Sync
1. User writes note on Computer A
2. Note saved to IndexedDB
3. Pending change queued
4. Sync triggered (auto or manual)
5. Note uploaded to Drive
6. Pending change cleared

### Scenario 2: Offline Write → Online Sync
1. User writes note offline on Computer A
2. Note saved to IndexedDB
3. Pending change queued
4. User goes online
5. Sync triggered automatically
6. Note uploaded to Drive
7. Pending change cleared

### Scenario 3: Cross-Device Sync
1. User adds note on Computer A → synced to Drive
2. User opens Mobile B
3. Initial sync downloads note from Drive
4. User edits note on Mobile B
5. Edit synced to Drive
6. User opens Computer A again
7. Sync downloads edited note from Drive
8. Local note updated

### Scenario 4: Conflict Resolution
1. User edits note on Computer A (offline)
2. User edits same note on Mobile B (online)
3. Mobile B syncs → Drive has version B
4. Computer A comes online
5. Sync compares timestamps:
   - If Computer A newer → Keep A, upload to Drive
   - If Mobile B newer → Apply B version locally
6. Both devices eventually consistent

## Phase 10: Implementation Order

1. ✅ Phase 1: Data model enhancements (add sync metadata)
2. ✅ Phase 2: Sync metadata management
3. ✅ Phase 4: Update DB ops to track changes
4. ✅ Phase 3: Delta sync logic
5. ✅ Phase 5: Enhanced API routes
6. ✅ Phase 6: Smart sync hook
7. ✅ Phase 7: Image sync strategy
8. ✅ Phase 8: Conflict resolution
9. ✅ Phase 9: Testing & edge cases

## Key Decisions

1. **Delta Sync**: Only sync changed items (since last sync timestamp)
2. **Offline Queue**: Track pending changes when offline
3. **Conflict Resolution**: Last-write-wins using `lastModified` timestamp
4. **Images**: Sync metadata first, fetch blobs on-demand
5. **Sync Frequency**: Every 60 seconds when online + on-demand
6. **Sync Metadata**: Store in IndexedDB, track last sync time

## Edge Cases to Handle

- Device A offline, makes changes, Device B online makes changes → Merge on next sync
- Simultaneous edits on same note → Last-write-wins
- Network interruption during sync → Retry with exponential backoff
- Large number of pending changes → Batch sync (not all at once)
- Drive quota exceeded → Error handling
- Image upload fails → Retry separately, don't block other syncs

