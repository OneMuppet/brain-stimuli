import type { Achievement } from "../entities";

/**
 * Repository interface for Achievement entity
 * Abstracts data access operations for achievements
 */
export interface AchievementRepository {
  /**
   * Get an achievement by ID
   */
  getById(id: string): Promise<Achievement | null>;

  /**
   * Get all achievements
   */
  listAll(): Promise<Achievement[]>;

  /**
   * Update an achievement (e.g., unlock it)
   */
  update(id: string, updates: Partial<Achievement>): Promise<Achievement | null>;

  /**
   * Get all unlocked achievements
   */
  listUnlocked(): Promise<Achievement[]>;
}

