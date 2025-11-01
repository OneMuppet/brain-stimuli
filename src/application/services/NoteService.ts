import type { Note } from "@/domain/entities";
import type { NoteRepository } from "@/domain/repositories";
import { IndexedDBNoteRepository } from "@/infrastructure/repositories";
import { addPendingChange } from "@/lib/pendingChanges";
import { markLocalChange } from "@/lib/syncMetadata";
import { triggerSync } from "@/lib/syncTrigger";

/**
 * Application service for Note operations
 * Orchestrates repository calls and business logic
 */
export class NoteService {
  private static repository: NoteRepository = new IndexedDBNoteRepository();

  /**
   * Create a new note
   */
  static async create(sessionId: string, content: string): Promise<Note> {
    const note = await this.repository.create(sessionId, content);
    
    // Track for sync
    await addPendingChange("note", note.id, "create", note);
    await markLocalChange();
    triggerSync();
    
    return note;
  }

  /**
   * Get a note by ID
   */
  static async getById(id: string): Promise<Note | null> {
    return this.repository.getById(id);
  }

  /**
   * List all notes for a session
   */
  static async listBySessionId(sessionId: string): Promise<Note[]> {
    return this.repository.listBySessionId(sessionId);
  }

  /**
   * Update a note's content
   */
  static async update(id: string, content: string, skipSync = false): Promise<Note | null> {
    const updated = await this.repository.update(id, content);
    
    if (!updated) {
      return null;
    }

    // Track for sync (only if not a sync operation itself)
    if (!skipSync) {
      await addPendingChange("note", id, "update", updated);
      await markLocalChange();
      triggerSync();
    }
    
    return updated;
  }

  /**
   * Delete a note
   */
  static async delete(id: string): Promise<void> {
    const note = await this.repository.getById(id);
    await this.repository.delete(id);
    
    // Track for sync
    if (note) {
      await addPendingChange("note", id, "delete");
      await markLocalChange();
      triggerSync();
    }
  }
}

