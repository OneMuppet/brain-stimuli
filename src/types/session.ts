export interface Session {
  id: string;
  title: string;
  createdAt: number;
  lastModified: number;
  score: number;
  userId: string; // For future multi-user support
}

export interface CreateSessionRequest {
  title: string;
  userId?: string;
}

export interface UpdateSessionRequest {
  title?: string;
  score?: number;
}

export interface SessionResponse {
  success: boolean;
  data?: Session;
  error?: string;
}

export interface SessionsResponse {
  success: boolean;
  data?: Session[];
  error?: string;
}
