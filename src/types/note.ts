export interface Note {
  id: string;
  sessionId: string;
  content: string;
  createdAt: number;
  lastModified: number;
}

export interface CreateNoteRequest {
  sessionId: string;
  content: string;
}

export interface UpdateNoteRequest {
  content: string;
}

export interface NoteResponse {
  success: boolean;
  data?: Note;
  error?: string;
}

export interface NotesResponse {
  success: boolean;
  data?: Note[];
  error?: string;
}
