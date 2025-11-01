/**
 * Validation schemas for Session entity
 * Using Zod for runtime validation
 */

// Note: Zod is not installed yet, so we'll use simple validation functions
// When Zod is added, replace these with Zod schemas
import { CONSTANTS } from "@/shared/config/constants";

export interface SessionValidationError {
  field: string;
  message: string;
}

export function validateSessionTitle(title: unknown): SessionValidationError[] {
  const errors: SessionValidationError[] = [];
  
  if (typeof title !== "string") {
    errors.push({ field: "title", message: "Title must be a string" });
    return errors;
  }
  
  if (title.trim().length === 0) {
    errors.push({ field: "title", message: "Title cannot be empty" });
  }
  
  if (title.length > CONSTANTS.MAX_TITLE_LENGTH) {
    errors.push({ field: "title", message: `Title must be less than ${CONSTANTS.MAX_TITLE_LENGTH} characters` });
  }
  
  return errors;
}

export function validateSession(session: unknown): SessionValidationError[] {
  const errors: SessionValidationError[] = [];
  
  if (!session || typeof session !== "object") {
    errors.push({ field: "session", message: "Session must be an object" });
    return errors;
  }
  
  const s = session as Record<string, unknown>;
  
  if (typeof s.title !== "string") {
    errors.push({ field: "title", message: "Title must be a string" });
  } else {
    errors.push(...validateSessionTitle(s.title));
  }
  
  if (s.id !== undefined && typeof s.id !== "string") {
    errors.push({ field: "id", message: "ID must be a string" });
  }
  
  if (s.createdAt !== undefined && typeof s.createdAt !== "number") {
    errors.push({ field: "createdAt", message: "createdAt must be a number" });
  }
  
  if (s.lastModified !== undefined && typeof s.lastModified !== "number") {
    errors.push({ field: "lastModified", message: "lastModified must be a number" });
  }
  
  if (s.score !== undefined && typeof s.score !== "number") {
    errors.push({ field: "score", message: "Score must be a number" });
  }
  
  return errors;
}

