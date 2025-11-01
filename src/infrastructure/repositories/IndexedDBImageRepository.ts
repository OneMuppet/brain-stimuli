import type { Image } from "@/domain/entities";
import type { ImageRepository } from "@/domain/repositories";
import { getDB } from "../database/IndexedDBClient";

/**
 * IndexedDB implementation of ImageRepository
 */
export class IndexedDBImageRepository implements ImageRepository {
  async create(sessionId: string, data: Blob, contentType: string): Promise<Image> {
    const db = await getDB();
    const now = Date.now();
    const image: Image = {
      id: `img_${now}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      data,
      contentType,
      timestamp: now,
      createdAt: now,
    };

    await db.add("images", image);
    return image;
  }

  async getById(id: string): Promise<Image | null> {
    const db = await getDB();
    const image = await db.get("images", id);
    return image || null;
  }

  async listBySessionId(sessionId: string): Promise<Image[]> {
    const db = await getDB();
    const index = db.transaction("images").store.index("sessionId");
    const images = await index.getAll(sessionId);
    return images.sort((a, b) => b.timestamp - a.timestamp);
  }

  async update(id: string, updates: Partial<Image>): Promise<Image | null> {
    const db = await getDB();
    const image = await db.get("images", id);
    
    if (!image) {
      return null;
    }

    const updated: Image = {
      ...image,
      ...updates,
    };

    await db.put("images", updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const db = await getDB();
    await db.delete("images", id);
  }

  async getImageUrl(image: Image): Promise<string> {
    return URL.createObjectURL(image.data);
  }
}

