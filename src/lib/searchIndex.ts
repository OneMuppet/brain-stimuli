import type { Note, Session } from "@/domain/entities";
import { listSessions, listNotes } from "@/lib/db";

export interface SearchResult {
  sessionId: string;
  sessionTitle: string;
  noteId: string;
  noteContent: string;
  matchedText: string;
  matchCount: number;
  sessionDate: number;
}

/**
 * Simple client-side search index
 * Indexes note content for fast searching
 */
export class SearchIndex {
  private index: Map<string, { sessionId: string; noteId: string; content: string }[]> = new Map();

  /**
   * Build index from all sessions and notes
   */
  async buildIndex(): Promise<void> {
    this.index.clear();
    
    const sessions = await listSessions();
    
    for (const session of sessions) {
      const notes = await listNotes(session.id);
      
      for (const note of notes) {
        // Extract plain text from HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(note.content, "text/html");
        const text = doc.body.textContent || "";
        
        // Create word tokens (lowercase)
        const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
        
        // Index each word
        for (const word of words) {
          const key = word.toLowerCase();
          if (!this.index.has(key)) {
            this.index.set(key, []);
          }
          this.index.get(key)!.push({
            sessionId: session.id,
            noteId: note.id,
            content: text,
          });
        }
      }
    }
  }

  /**
   * Search for query string
   */
  async search(query: string): Promise<SearchResult[]> {
    if (!query.trim()) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    
    // Find all matching notes
    const matches = new Map<string, {
      sessionId: string;
      sessionTitle: string;
      noteId: string;
      noteContent: string;
      matchCount: number;
      sessionDate: number;
    }>();

    // Get all sessions for titles and dates
    const sessions = await listSessions();
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    // Score matches based on word frequency
    for (const word of queryWords) {
      const results = this.index.get(word) || [];
      
      for (const result of results) {
        const session = sessionMap.get(result.sessionId);
        if (!session) continue;

        const key = `${result.sessionId}:${result.noteId}`;
        const existing = matches.get(key);
        
        if (existing) {
          existing.matchCount += 1;
        } else {
          matches.set(key, {
            sessionId: result.sessionId,
            sessionTitle: session.title,
            noteId: result.noteId,
            noteContent: result.content,
            matchCount: 1,
            sessionDate: session.createdAt,
          });
        }
      }
    }

    // Convert to results and extract matched text snippets
    const searchResults: SearchResult[] = [];
    
    for (const match of matches.values()) {
      // Extract context around matches (2-3 lines)
      const contentLower = match.noteContent.toLowerCase();
      const queryPos = contentLower.indexOf(queryLower);
      
      let matchedText = match.noteContent;
      if (queryPos !== -1) {
        const start = Math.max(0, queryPos - 100);
        const end = Math.min(match.noteContent.length, queryPos + query.length + 100);
        matchedText = match.noteContent.substring(start, end);
        
        // Try to start/end at word boundaries
        const beforeMatch = match.noteContent.substring(0, queryPos);
        const lastSpaceBefore = beforeMatch.lastIndexOf(" ");
        const startAtWord = Math.max(start, lastSpaceBefore + 1);
        
        const afterMatch = match.noteContent.substring(queryPos + query.length);
        const firstSpaceAfter = afterMatch.indexOf(" ");
        const endAtWord = Math.min(end, queryPos + query.length + (firstSpaceAfter !== -1 ? firstSpaceAfter : 0));
        
        matchedText = match.noteContent.substring(startAtWord, endAtWord);
        if (startAtWord > 0) matchedText = "..." + matchedText;
        if (endAtWord < match.noteContent.length) matchedText = matchedText + "...";
      }

      searchResults.push({
        sessionId: match.sessionId,
        sessionTitle: match.sessionTitle,
        noteId: match.noteId,
        noteContent: match.noteContent,
        matchedText,
        matchCount: match.matchCount,
        sessionDate: match.sessionDate,
      });
    }

    // Sort by match count (descending), then by date (newest first)
    return searchResults.sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      return b.sessionDate - a.sessionDate;
    });
  }
}

// Global search index instance
let searchIndexInstance: SearchIndex | null = null;

/**
 * Get or create the global search index
 */
export function getSearchIndex(): SearchIndex {
  if (!searchIndexInstance) {
    searchIndexInstance = new SearchIndex();
  }
  return searchIndexInstance;
}

