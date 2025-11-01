/**
 * Validation schemas for Note entity
 */
import { CONSTANTS } from "@/shared/config/constants";

export interface NoteValidationError {
  field: string;
  message: string;
}

export function validateNoteContent(content: unknown): NoteValidationError[] {
  const errors: NoteValidationError[] = [];
  
  if (typeof content !== "string") {
    errors.push({ field: "content", message: "Content must be a string" });
    return errors;
  }
  
  // Content can be empty (user might clear a note)
  // But we check for reasonable max length
  if (content.length > CONSTANTS.MAX_CONTENT_SIZE) {
    errors.push({ field: "content", message: `Content is too large (max ${CONSTANTS.MAX_CONTENT_SIZE / 1_000_000}MB)` });
  }
  
  return errors;
}

export function validateNote(note: unknown): NoteValidationError[] {
  const errors: NoteValidationError[] = [];
  
  if (!note || typeof note !== "object") {
    errors.push({ field: "note", message: "Note must be an object" });
    return errors;
  }
  
  const n = note as Record<string, unknown>;
  
  if (typeof n.content !== "string") {
    errors.push({ field: "content", message: "Content must be a string" });
  } else {
    errors.push(...validateNoteContent(n.content));
  }
  
  if (n.sessionId !== undefined && typeof n.sessionId !== "string") {
    errors.push({ field: "sessionId", message: "sessionId must be a string" });
  }
  
  if (n.id !== undefined && typeof n.id !== "string") {
    errors.push({ field: "id", message: "ID must be a string" });
  }
  
  return errors;
}

