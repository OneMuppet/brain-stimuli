import type { Achievement } from "@/domain/entities";
import type { AchievementRepository } from "@/domain/repositories";
import { getDB } from "../database/IndexedDBClient";

/**
 * IndexedDB implementation of AchievementRepository
 */
export class IndexedDBAchievementRepository implements AchievementRepository {
  async getById(id: string): Promise<Achievement | null> {
    const db = await getDB();
    const achievement = await db.get("achievements", id);
    return achievement || null;
  }

  async listAll(): Promise<Achievement[]> {
    const db = await getDB();
    const achievements = await db.getAll("achievements");
    return achievements.sort((a, b) => {
      // Sort by unlocked status (unlocked first), then by unlock date
      if (a.unlockedAt && !b.unlockedAt) return -1;
      if (!a.unlockedAt && b.unlockedAt) return 1;
      if (a.unlockedAt && b.unlockedAt) {
        return b.unlockedAt - a.unlockedAt;
      }
      return a.name.localeCompare(b.name);
    });
  }

  async update(id: string, updates: Partial<Achievement>): Promise<Achievement | null> {
    const db = await getDB();
    const achievement = await db.get("achievements", id);
    
    if (!achievement) {
      return null;
    }

    const updated: Achievement = {
      ...achievement,
      ...updates,
    };

    await db.put("achievements", updated);
    return updated;
  }

  async listUnlocked(): Promise<Achievement[]> {
    const db = await getDB();
    const index = db.transaction("achievements").store.index("unlockedAt");
    // Get all achievements where unlockedAt is defined (>= 0)
    const allAchievements = await db.getAll("achievements");
    const unlocked = allAchievements.filter((a) => a.unlockedAt !== undefined);
    return unlocked.sort((a, b) => (b.unlockedAt || 0) - (a.unlockedAt || 0));
  }
}

