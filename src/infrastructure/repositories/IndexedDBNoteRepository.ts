import type { Note } from "@/domain/entities";
import type { NoteRepository } from "@/domain/repositories";
import { getDB } from "../database/IndexedDBClient";

/**
 * IndexedDB implementation of NoteRepository
 */
export class IndexedDBNoteRepository implements NoteRepository {
  async create(sessionId: string, content: string): Promise<Note> {
    const db = await getDB();
    const now = Date.now();
    const note: Note = {
      id: `note_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      content,
      createdAt: now,
      lastModified: now,
    };

    await db.add("notes", note);
    return note;
  }

  async getById(id: string): Promise<Note | null> {
    const db = await getDB();
    const note = await db.get("notes", id);
    return note || null;
  }

  async listBySessionId(sessionId: string): Promise<Note[]> {
    const db = await getDB();
    const index = db.transaction("notes").store.index("sessionId");
    const notes = await index.getAll(sessionId);
    return notes.sort((a, b) => b.createdAt - a.createdAt);
  }

  async update(id: string, content: string): Promise<Note | null> {
    const db = await getDB();
    const note = await db.get("notes", id);
    
    if (!note) {
      return null;
    }

    const updated: Note = {
      ...note,
      content,
      lastModified: Date.now(),
    };

    await db.put("notes", updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("notes", id);
  }
}

