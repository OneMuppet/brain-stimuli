import type { Session } from "../entities";

/**
 * Repository interface for Session entity
 * Abstracts data access operations for sessions
 */
export interface SessionRepository {
  /**
   * Create a new session
   */
  create(title: string): Promise<Session>;

  /**
   * Get a session by ID
   */
  getById(id: string): Promise<Session | null>;

  /**
   * List all sessions, ordered by creation date (newest first)
   */
  listAll(): Promise<Session[]>;

  /**
   * Update a session
   */
  update(id: string, updates: Partial<Session>): Promise<Session | null>;

  /**
   * Delete a session and all its related notes and images
   */
  delete(id: string): Promise<void>;
}

