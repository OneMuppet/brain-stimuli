import type { Session } from "@/domain/entities";
import { CONSTANTS } from "@/shared/config/constants";

/**
 * Service for calculating scores and levels
 */
export class ScoringService {
  /**
   * Calculate score for a session based on duration, notes, and images
   */
  static calculateScore(
    session: Session,
    notesCount: number,
    imagesCount: number,
    sessionDuration: number
  ): number {
    // Base score from session duration
    const durationScore = Math.floor(sessionDuration / (60000 / CONSTANTS.POINTS_PER_MINUTE));
    
    // Points for notes
    const notesScore = notesCount * CONSTANTS.POINTS_PER_NOTE;
    
    // Points for images
    const imagesScore = imagesCount * CONSTANTS.POINTS_PER_IMAGE;
    
    // Bonus for activity
    const engagementBonus = Math.floor(sessionDuration / (30000 / CONSTANTS.POINTS_PER_30_SECONDS));
    
    return durationScore + notesScore + imagesScore + engagementBonus;
  }

  /**
   * Get level based on total score
   */
  static getLevel(score: number): number {
    return Math.floor(score / CONSTANTS.LEVEL_UP_THRESHOLD) + 1;
  }

  /**
   * Get progress percentage to next level (0-100)
   */
  static getProgressToNextLevel(score: number): number {
    const currentLevel = this.getLevel(score);
    const currentLevelScore = (currentLevel - 1) * CONSTANTS.LEVEL_UP_THRESHOLD;
    const nextLevelScore = currentLevel * CONSTANTS.LEVEL_UP_THRESHOLD;
    const progress = score - currentLevelScore;
    const needed = nextLevelScore - currentLevelScore;
    return (progress / needed) * 100;
  }
}

