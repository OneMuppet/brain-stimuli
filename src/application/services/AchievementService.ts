import type { Achievement } from "@/domain/entities";
import { ACHIEVEMENT_DEFINITIONS } from "@/domain/entities/Achievement";
import type { AchievementRepository } from "@/domain/repositories";
import { IndexedDBAchievementRepository } from "@/infrastructure/repositories";
import { getDB } from "@/infrastructure/database/IndexedDBClient";

/**
 * Application service for Achievement operations
 * Orchestrates repository calls and achievement checking logic
 */
export class AchievementService {
  private static repository: AchievementRepository = new IndexedDBAchievementRepository();

  /**
   * Initialize achievements in the database (create all achievement definitions)
   */
  static async initializeAchievements(): Promise<void> {
    const db = await getDB();
    const existingAchievements = await db.getAll("achievements");
    const existingIds = new Set(existingAchievements.map((a) => a.id));

    for (const definition of ACHIEVEMENT_DEFINITIONS) {
      // Match the ID format used in checkAchievements (lowercase, replace spaces with underscores)
      const id = `achievement_${definition.name.toLowerCase().replace(/\s+/g, "_")}`;
      
      if (!existingIds.has(id)) {
        const achievement: Achievement = {
          id,
          ...definition,
        };
        await db.put("achievements", achievement);
      }
    }
  }

  /**
   * Get all achievements
   */
  static async listAll(): Promise<Achievement[]> {
    await this.initializeAchievements();
    return this.repository.listAll();
  }

  /**
   * Get all unlocked achievements
   */
  static async listUnlocked(): Promise<Achievement[]> {
    await this.initializeAchievements();
    return this.repository.listUnlocked();
  }

  /**
   * Unlock an achievement by ID
   */
  static async unlockAchievement(id: string): Promise<Achievement | null> {
    await this.initializeAchievements();
    const achievement = await this.repository.getById(id);
    
    if (!achievement || achievement.unlockedAt) {
      return achievement; // Already unlocked or doesn't exist
    }

    return this.repository.update(id, { unlockedAt: Date.now() });
  }

  /**
   * Check if a specific achievement is unlocked
   */
  static async isUnlocked(id: string): Promise<boolean> {
    await this.initializeAchievements();
    const achievement = await this.repository.getById(id);
    return achievement?.unlockedAt !== undefined;
  }

  /**
   * Check and unlock achievements based on stats
   */
  static async checkAchievements(stats: {
    totalNotes: number;
    totalImages: number;
    totalSessions: number;
    totalWords: number;
    currentLevel: number;
    currentSessionNotes: number;
    usedThemes: string[];
    daysWithNotes: number;
  }): Promise<Achievement[]> {
    await this.initializeAchievements();
    const unlocked: Achievement[] = [];

    const checks: Array<{ id: string; condition: boolean }> = [
      {
        id: "achievement_initiate",
        condition: stats.totalNotes >= 1,
      },
      {
        id: "achievement_observer",
        condition: stats.totalImages >= 10,
      },
      {
        id: "achievement_veteran",
        condition: stats.currentLevel >= 10,
      },
      {
        id: "achievement_commander",
        condition: stats.totalSessions >= 100,
      },
      {
        id: "achievement_chronicler",
        condition: stats.totalWords >= 1000,
      },
      {
        id: "achievement_streak_master",
        condition: stats.daysWithNotes >= 7,
      },
      {
        id: "achievement_trilogy",
        condition: stats.usedThemes.length >= 3,
      },
      {
        id: "achievement_speed_operator",
        condition: stats.currentSessionNotes >= 10,
      },
      {
        id: "achievement_level_25",
        condition: stats.currentLevel >= 25,
      },
      {
        id: "achievement_wordsmith",
        condition: stats.totalWords >= 5000,
      },
    ];

    for (const check of checks) {
      if (check.condition) {
        const alreadyUnlocked = await this.isUnlocked(check.id);
        if (!alreadyUnlocked) {
          const achievement = await this.unlockAchievement(check.id);
          if (achievement) {
            unlocked.push(achievement);
          }
        }
      }
    }

    return unlocked;
  }
}

