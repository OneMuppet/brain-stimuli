import { AppError } from "./AppError";

/**
 * Error thrown during synchronization operations
 */
export class SyncError extends AppError {
  readonly code = "SYNC_ERROR";
  readonly statusCode = 500;

  constructor(message: string, cause?: Error) {
    super(message, cause);
  }
}

