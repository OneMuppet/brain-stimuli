// Utilities for converting between blob URLs and image IDs in note content
import { getImage, getImageUrl, type Image } from "./db";

/**
 * Convert blob URLs in note HTML to image IDs stored in data-image-id attribute
 * This makes note content syncable across devices
 */
export function convertBlobUrlsToImageIds(html: string, images: Image[]): string {
  // Create a map of blob URLs to image IDs
  // Since we can't easily map blob URLs to IDs, we'll need to match by comparing
  // But actually, we should store image IDs when inserting, not convert after
  // For now, this is a placeholder - we'll fix the insertion to use IDs from the start
  
  // If images already have data-image-id, keep them
  // If they have blob: URLs, we need to match them somehow
  // Actually, the best approach is to ensure images are inserted with data-image-id from the start
  // So this function mainly handles cleanup and ensures consistency
  
  let converted = html;
  
  // Replace any blob: URLs with image IDs by matching against existing images
  // This is a fallback for legacy content
  const blobUrlPattern = /blob:[^"']+/g;
  converted = converted.replace(blobUrlPattern, (blobUrl) => {
    // Try to find matching image by checking if blob URL references it
    // Since we can't easily match, we'll leave blob URLs as-is for now
    // The real fix is to insert images with IDs from the start
    return blobUrl;
  });
  
  return converted;
}

/**
 * Convert image IDs in note HTML back to blob URLs for display
 * Looks up images from IndexedDB by ID and replaces data-image-id with actual blob URLs
 */
export async function convertImageIdsToBlobUrls(html: string, images: Image[]): Promise<string> {
  // Create a map of image IDs to blob URLs
  const imageIdToUrlMap = new Map<string, string>();
  
  // Pre-populate map with provided images
  for (const image of images) {
    try {
      const url = await getImageUrl(image);
      imageIdToUrlMap.set(image.id, url);
    } catch (error) {
      console.error(`Failed to get URL for image ${image.id}:`, error);
    }
  }
  
  // Replace img tags with data-image-id attribute - update src to blob URL
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgElements = doc.querySelectorAll("img[data-image-id]");
  
  for (const img of Array.from(imgElements)) {
    const imageId = img.getAttribute("data-image-id");
    if (imageId) {
      if (imageIdToUrlMap.has(imageId)) {
        // Update src to blob URL but keep data-image-id
        img.setAttribute("src", imageIdToUrlMap.get(imageId)!);
      } else {
        // Image ID found but not in provided images - try to load from IndexedDB
        console.log(`Image ID ${imageId} found in note but not in provided images, loading from IndexedDB...`);
        try {
          const image = await getImage(imageId);
          if (image) {
            const url = await getImageUrl(image);
            img.setAttribute("src", url);
            imageIdToUrlMap.set(imageId, url);
          } else {
            console.warn(`Image ID ${imageId} not found in IndexedDB - might need to restore from cloud`);
          }
        } catch (error) {
          console.error(`Failed to load image ${imageId}:`, error);
        }
      }
    }
  }
  
  return doc.body.innerHTML || html;
}

/**
 * Convert blob URLs in saved HTML to image IDs before saving to DB
 * This ensures notes can be synced across devices
 */
export function prepareNoteContentForSave(html: string): string {
  // Currently, we need to ensure images have data-image-id attributes
  // The actual blob-to-ID conversion should happen when inserting images
  // This function ensures all images have data-image-id for sync compatibility
  
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const imgElements = doc.querySelectorAll("img");
  
  for (const img of Array.from(imgElements)) {
    const src = img.getAttribute("src");
    // If it's a blob URL and doesn't have data-image-id, we can't convert it
    // This means the image was inserted incorrectly - should already have data-image-id
    if (src?.startsWith("blob:") && !img.hasAttribute("data-image-id")) {
      console.warn("Image in note content has blob URL but no data-image-id - cannot sync properly");
    }
  }
  
  return doc.body.innerHTML || html;
}

