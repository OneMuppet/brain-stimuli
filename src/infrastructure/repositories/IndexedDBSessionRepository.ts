import type { Session } from "@/domain/entities";
import type { SessionRepository } from "@/domain/repositories";
import { getDB } from "../database/IndexedDBClient";

/**
 * IndexedDB implementation of SessionRepository
 */
export class IndexedDBSessionRepository implements SessionRepository {
  async create(title: string): Promise<Session> {
    const db = await getDB();
    const now = Date.now();
    const session: Session = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      createdAt: now,
      lastModified: now,
      score: 0,
    };

    await db.add("sessions", session);
    return session;
  }

  async getById(id: string): Promise<Session | null> {
    const db = await getDB();
    const session = await db.get("sessions", id);
    return session || null;
  }

  async listAll(): Promise<Session[]> {
    const db = await getDB();
    const sessions = await db.getAll("sessions");
    return sessions.sort((a, b) => b.createdAt - a.createdAt);
  }

  async update(id: string, updates: Partial<Session>): Promise<Session | null> {
    const db = await getDB();
    const session = await db.get("sessions", id);
    
    if (!session) {
      return null;
    }

    const updated: Session = {
      ...session,
      ...updates,
      lastModified: updates.lastModified ?? Date.now(),
    };

    await db.put("sessions", updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    const session = await db.get("sessions", id);
    
    const tx = db.transaction(["sessions", "notes", "images"], "readwrite");
    
    // Delete session
    await tx.objectStore("sessions").delete(id);
    
    // Delete all notes for this session
    const notesIndex = tx.objectStore("notes").index("sessionId");
    for await (const cursor of notesIndex.iterate(id)) {
      await cursor.delete();
    }
    
    // Delete all images for this session
    const imagesIndex = tx.objectStore("images").index("sessionId");
    for await (const cursor of imagesIndex.iterate(id)) {
      await cursor.delete();
    }
    
    await tx.done;
  }
}

