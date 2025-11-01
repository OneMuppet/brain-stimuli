import type { Image } from "@/domain/entities";
import type { ImageRepository } from "@/domain/repositories";
import { IndexedDBImageRepository } from "@/infrastructure/repositories";
import { addPendingChange } from "@/lib/pendingChanges";
import { markLocalChange } from "@/lib/syncMetadata";
import { triggerSync } from "@/lib/syncTrigger";

/**
 * Application service for Image operations
 * Orchestrates repository calls and business logic
 */
export class ImageService {
  private static repository: ImageRepository = new IndexedDBImageRepository();

  /**
   * Create a new image
   */
  static async create(sessionId: string, data: Blob, contentType: string): Promise<Image> {
    const image = await this.repository.create(sessionId, data, contentType);
    
    // Track for sync (metadata only, not blob)
    await addPendingChange("image", image.id, "create", {
      id: image.id,
      sessionId: image.sessionId,
      contentType: image.contentType,
      createdAt: image.createdAt,
    });
    await markLocalChange();
    triggerSync();
    
    return image;
  }

  /**
   * Get an image by ID
   */
  static async getById(id: string): Promise<Image | null> {
    return this.repository.getById(id);
  }

  /**
   * List all images for a session
   */
  static async listBySessionId(sessionId: string): Promise<Image[]> {
    return this.repository.listBySessionId(sessionId);
  }

  /**
   * Update an image
   */
  static async update(id: string, updates: Partial<Image>): Promise<Image | null> {
    return this.repository.update(id, updates);
  }

  /**
   * Delete an image
   */
  static async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Generate a blob URL for an image
   */
  static async getImageUrl(image: Image): Promise<string> {
    return this.repository.getImageUrl(image);
  }
}

