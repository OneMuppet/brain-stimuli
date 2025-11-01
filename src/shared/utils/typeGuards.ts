/**
 * Type guard utilities for runtime type checking
 */

/**
 * Check if value is not null or undefined
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Check if value is a valid timestamp (number > 0)
 */
export function isValidTimestamp(value: unknown): value is number {
  return isNumber(value) && value > 0 && value <= Date.now();
}

/**
 * Check if value is an object (but not null or array)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Check if value has a specific property
 */
export function hasProperty<K extends string>(
  value: unknown,
  key: K
): value is Record<K, unknown> {
  return isObject(value) && key in value;
}

/**
 * Check if value is a valid entity ID (non-empty string)
 */
export function isValidEntityId(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

