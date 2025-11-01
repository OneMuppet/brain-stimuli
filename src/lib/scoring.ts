import { ScoringService } from "@/application/services/ScoringService";
import type { Session } from "@/domain/entities";

// Re-export for backward compatibility
export function calculateScore(session: Session, notesCount: number, imagesCount: number, sessionDuration: number): number {
  return ScoringService.calculateScore(session, notesCount, imagesCount, sessionDuration);
}

export function getLevel(score: number): number {
  return ScoringService.getLevel(score);
}

export function getProgressToNextLevel(score: number): number {
  return ScoringService.getProgressToNextLevel(score);
}
