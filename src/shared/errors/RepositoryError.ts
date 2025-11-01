import { AppError } from "./AppError";

/**
 * Error thrown by repository operations
 */
export class RepositoryError extends AppError {
  readonly code = "REPOSITORY_ERROR";
  readonly statusCode = 500;

  constructor(message: string, public readonly operation?: string, cause?: Error) {
    super(message, cause);
  }
}

