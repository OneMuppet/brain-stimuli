import type { Session } from "./db";

export function calculateScore(session: Session, notesCount: number, imagesCount: number, sessionDuration: number): number {
  // Base score from session duration (1 point per minute)
  const durationScore = Math.floor(sessionDuration / 60000);
  
  // Points for notes (5 points per note)
  const notesScore = notesCount * 5;
  
  // Points for images (10 points per image)
  const imagesScore = imagesCount * 10;
  
  // Bonus for activity (1 point per 30 seconds of engagement)
  const engagementBonus = Math.floor(sessionDuration / 30000);
  
  return durationScore + notesScore + imagesScore + engagementBonus;
}

export function getLevel(score: number): number {
  // Level up every 100 points
  return Math.floor(score / 100) + 1;
}

export function getProgressToNextLevel(score: number): number {
  const currentLevel = getLevel(score);
  const currentLevelScore = (currentLevel - 1) * 100;
  const nextLevelScore = currentLevel * 100;
  const progress = score - currentLevelScore;
  const needed = nextLevelScore - currentLevelScore;
  return (progress / needed) * 100;
}
