export interface Image {
  id: string;
  sessionId: string;
  s3Key: string;
  s3Bucket: string;
  timestamp: number;
  contentType: string;
  url?: string; // Pre-signed URL for display
}

export interface CreateImageUploadRequest {
  sessionId: string;
  contentType: string;
  fileName: string;
}

export interface ImageUploadResponse {
  success: boolean;
  data?: {
    uploadUrl: string;
    imageId: string;
    s3Key: string;
  };
  error?: string;
}

export interface ImagesResponse {
  success: boolean;
  data?: Image[];
  error?: string;
}
