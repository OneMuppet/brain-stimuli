import type { Note } from "../entities";

/**
 * Repository interface for Note entity
 * Abstracts data access operations for notes
 */
export interface NoteRepository {
  /**
   * Create a new note
   */
  create(sessionId: string, content: string): Promise<Note>;

  /**
   * Get a note by ID
   */
  getById(id: string): Promise<Note | null>;

  /**
   * List all notes for a session, ordered by creation date (newest first)
   */
  listBySessionId(sessionId: string): Promise<Note[]>;

  /**
   * Update a note's content
   */
  update(id: string, content: string): Promise<Note | null>;

  /**
   * Delete a note
   */
  delete(id: string): Promise<void>;
}

