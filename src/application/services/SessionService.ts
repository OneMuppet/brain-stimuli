import type { Session } from "@/domain/entities";
import type { SessionRepository } from "@/domain/repositories";
import { IndexedDBSessionRepository } from "@/infrastructure/repositories";
import { addPendingChange } from "@/lib/pendingChanges";
import { markLocalChange } from "@/lib/syncMetadata";
import { triggerSync } from "@/lib/syncTrigger";

/**
 * Application service for Session operations
 * Orchestrates repository calls and business logic
 */
export class SessionService {
  private static repository: SessionRepository = new IndexedDBSessionRepository();

  /**
   * Create a new session
   */
  static async create(title: string): Promise<Session> {
    const session = await this.repository.create(title);
    
    // Track for sync
    await addPendingChange("session", session.id, "create", session);
    await markLocalChange();
    triggerSync();
    
    return session;
  }

  /**
   * Get a session by ID
   */
  static async getById(id: string): Promise<Session | null> {
    return this.repository.getById(id);
  }

  /**
   * List all sessions
   */
  static async listAll(): Promise<Session[]> {
    return this.repository.listAll();
  }

  /**
   * Update a session
   */
  static async update(id: string, updates: Partial<Session>): Promise<Session | null> {
    const updated = await this.repository.update(id, updates);
    
    if (!updated) {
      return null;
    }

    // Track for sync (only if not a sync operation itself)
    if (!updates.syncTimestamp && !updates.syncVersion) {
      await addPendingChange("session", id, "update", updated);
      await markLocalChange();
      triggerSync();
    }
    
    return updated;
  }

  /**
   * Delete a session and all related notes/images
   */
  static async delete(id: string): Promise<void> {
    const session = await this.repository.getById(id);
    await this.repository.delete(id);
    
    // Track for sync
    if (session) {
      await addPendingChange("session", id, "delete");
      await markLocalChange();
      triggerSync();
    }
  }
}

