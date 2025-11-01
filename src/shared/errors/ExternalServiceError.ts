import { AppError } from "./AppError";

/**
 * Error thrown when external service calls fail
 */
export class ExternalServiceError extends AppError {
  readonly code = "EXTERNAL_SERVICE_ERROR";
  readonly statusCode = 502;

  constructor(
    message: string,
    public readonly service?: string,
    public readonly originalError?: unknown,
    cause?: Error
  ) {
    super(message, cause);
  }
}

