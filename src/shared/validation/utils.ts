import { ValidationError } from "../errors";

/**
 * Validation utility functions
 */

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}

/**
 * Validate and transform data
 */
export function validate<T>(
  data: unknown,
  validator: (data: unknown) => Array<{ field: string; message: string }>
): ValidationResult<T> {
  const errors = validator(data);
  
  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }
  
  return {
    success: true,
    data: data as T,
  };
}

/**
 * Throw ValidationError if validation fails
 */
export function requireValid<T>(
  data: unknown,
  validator: (data: unknown) => Array<{ field: string; message: string }>
): T {
  const result = validate<T>(data, validator);
  
  if (!result.success || !result.data) {
    const message = result.errors
      ?.map((e) => `${e.field}: ${e.message}`)
      .join(", ") || "Validation failed";
    throw new ValidationError(message);
  }
  
  return result.data;
}

