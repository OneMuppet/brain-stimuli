import type { Session, Note, Image, SyncMetadata, PendingChange } from "@/domain/entities";
import { getDB as getIndexedDB } from "@/infrastructure/database/IndexedDBClient";
import { SessionService } from "@/application/services/SessionService";
import { NoteService } from "@/application/services/NoteService";
import { ImageService } from "@/application/services/ImageService";
import { markLocalChange } from "./syncMetadata";
import { addPendingChange } from "./pendingChanges";
import { triggerSync } from "./syncTrigger";

// Re-export domain entities for backward compatibility
export type { Session, Note, Image, SyncMetadata, PendingChange } from "@/domain/entities";

// Re-export getDB for backward compatibility (now delegates to infrastructure layer)
export { getDB } from "@/infrastructure/database/IndexedDBClient";

// Backward compatibility functions - delegate to services
export async function createSession(title: string): Promise<Session> {
  return SessionService.create(title);
}

export async function getSession(id: string): Promise<Session | undefined> {
  const result = await SessionService.getById(id);
  return result ?? undefined;
}

export async function listSessions(): Promise<Session[]> {
  return SessionService.listAll();
}

export async function updateSession(id: string, updates: Partial<Session>): Promise<Session | undefined> {
  const result = await SessionService.update(id, updates);
  return result ?? undefined;
}

export async function deleteSession(id: string): Promise<void> {
  return SessionService.delete(id);
}

// Backward compatibility functions - delegate to services
export async function createNote(sessionId: string, content: string): Promise<Note> {
  return NoteService.create(sessionId, content);
}

export async function getNote(id: string): Promise<Note | undefined> {
  const result = await NoteService.getById(id);
  return result ?? undefined;
}

export async function listNotes(sessionId: string): Promise<Note[]> {
  return NoteService.listBySessionId(sessionId);
}

export async function updateNote(id: string, content: string, skipSync?: boolean): Promise<Note | undefined> {
  const result = await NoteService.update(id, content, skipSync ?? false);
  return result ?? undefined;
}

export async function deleteNote(id: string): Promise<void> {
  return NoteService.delete(id);
}

// Backward compatibility functions - delegate to services
export async function createImage(sessionId: string, data: Blob, contentType: string): Promise<Image> {
  return ImageService.create(sessionId, data, contentType);
}

export async function getImage(id: string): Promise<Image | undefined> {
  const result = await ImageService.getById(id);
  return result ?? undefined;
}

export async function listImages(sessionId: string): Promise<Image[]> {
  return ImageService.listBySessionId(sessionId);
}

export async function updateImage(id: string, updates: Partial<Image>): Promise<Image | undefined> {
  const result = await ImageService.update(id, updates);
  return result ?? undefined;
}

export async function deleteImage(id: string): Promise<void> {
  return ImageService.delete(id);
}

export async function getImageUrl(image: Image): Promise<string> {
  return ImageService.getImageUrl(image);
}
