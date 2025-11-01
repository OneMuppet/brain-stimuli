import { AchievementService } from "@/application/services/AchievementService";
import { listSessions, listNotes, listImages } from "@/lib/db";
import { getLevel } from "@/lib/scoring";
import { getStoredTheme } from "@/lib/themeStorage";

/**
 * Calculate word count from HTML content
 */
function calculateWordCount(html: string): number {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const text = doc.body.textContent || "";
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Get total word count across all notes
 */
async function getTotalWordCount(): Promise<number> {
  const sessions = await listSessions();
  let totalWords = 0;

  for (const session of sessions) {
    const notes = await listNotes(session.id);
    for (const note of notes) {
      totalWords += calculateWordCount(note.content);
    }
  }

  return totalWords;
}

/**
 * Get days with notes (for streak calculation)
 */
async function getDaysWithNotes(): Promise<number> {
  const sessions = await listSessions();
  const uniqueDays = new Set<number>();

  for (const session of sessions) {
    const date = new Date(session.createdAt);
    const dayKey = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    uniqueDays.add(dayKey);
  }

  return uniqueDays.size;
}

/**
 * Get used themes (check local storage for theme history)
 */
function getUsedThemes(): string[] {
  const themes = new Set<string>();
  const currentTheme = getStoredTheme();
  if (currentTheme) {
    themes.add(currentTheme);
  }
  
  // Check for theme history in localStorage
  if (typeof window !== "undefined") {
    try {
      const themeHistory = localStorage.getItem("brain-stimuli-theme-history");
      if (themeHistory) {
        const history: string[] = JSON.parse(themeHistory);
        history.forEach((theme) => themes.add(theme));
      }
    } catch (error) {
      // Silent error handling
    }
  }
  
  return Array.from(themes);
}

/**
 * Check achievements based on current stats
 */
export async function checkAchievements(currentSessionId?: string): Promise<void> {
  const sessions = await listSessions();
  const allNotes = await Promise.all(
    sessions.map((s) => listNotes(s.id))
  ).then((notesArrays) => notesArrays.flat());
  
  const allImages = await Promise.all(
    sessions.map((s) => listImages(s.id))
  ).then((imagesArrays) => imagesArrays.flat());

  const totalNotes = allNotes.length;
  const totalImages = allImages.length;
  const totalSessions = sessions.length;
  const totalWords = await getTotalWordCount();
  const totalScore = sessions.reduce((sum, s) => sum + s.score, 0);
  const currentLevel = getLevel(totalScore);
  
  // Calculate current session stats
  let currentSessionNotes = 0;
  if (currentSessionId) {
    const sessionNotes = await listNotes(currentSessionId);
    currentSessionNotes = sessionNotes.length;
  }

  const usedThemes = getUsedThemes();
  const daysWithNotes = await getDaysWithNotes();

  await AchievementService.checkAchievements({
    totalNotes,
    totalImages,
    totalSessions,
    totalWords,
    currentLevel,
    currentSessionNotes,
    usedThemes,
    daysWithNotes,
  });
}

