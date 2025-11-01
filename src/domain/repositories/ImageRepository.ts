import type { Image } from "../entities";

/**
 * Repository interface for Image entity
 * Abstracts data access operations for images
 */
export interface ImageRepository {
  /**
   * Create a new image
   */
  create(sessionId: string, data: Blob, contentType: string): Promise<Image>;

  /**
   * Get an image by ID
   */
  getById(id: string): Promise<Image | null>;

  /**
   * List all images for a session, ordered by timestamp (newest first)
   */
  listBySessionId(sessionId: string): Promise<Image[]>;

  /**
   * Update an image
   */
  update(id: string, updates: Partial<Image>): Promise<Image | null>;

  /**
   * Delete an image
   */
  delete(id: string): Promise<void>;

  /**
   * Generate a blob URL for an image
   */
  getImageUrl(image: Image): Promise<string>;
}

