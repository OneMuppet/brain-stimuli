/**
 * Trigger sync when data changes
 * This allows components to notify the sync system that data has changed
 */

// Store the trigger function globally so DB operations can call it
let globalTriggerSync: (() => void) | null = null;

export function setSyncTrigger(trigger: () => void) {
  globalTriggerSync = trigger;
}

export function triggerSync() {
  if (globalTriggerSync) {
    globalTriggerSync();
  }
}

