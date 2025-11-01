/**
 * Application-wide constants
 */

export const CONSTANTS = {
  DB_NAME: "brain-stimuli-db",
  DB_VERSION: 3,
  DRIVE_FILE_NAME: "brain-stimuli-data.json",
  
  // Sync
  SYNC_METADATA_ID: "sync_metadata",
  
  // Scoring
  POINTS_PER_MINUTE: 1,
  POINTS_PER_NOTE: 5,
  POINTS_PER_IMAGE: 10,
  POINTS_PER_30_SECONDS: 1,
  LEVEL_UP_THRESHOLD: 100,
  
  // Debouncing
  SYNC_DEBOUNCE_MS: 2000,
  
  // Timeouts
  SYNC_TIMEOUT_MS: 60000,
  
  // Limits
  MAX_TITLE_LENGTH: 200,
  MAX_CONTENT_SIZE: 1_000_000, // 1MB
} as const;

