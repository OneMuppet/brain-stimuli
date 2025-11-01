import { AppError } from "./AppError";

/**
 * Error thrown when validation fails
 */
export class ValidationError extends AppError {
  readonly code = "VALIDATION_ERROR";
  readonly statusCode = 400;

  constructor(message: string, public readonly field?: string, cause?: Error) {
    super(message, cause);
  }
}

