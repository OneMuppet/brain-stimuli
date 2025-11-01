"use client";

import { motion } from "framer-motion";
import type { Achievement } from "@/domain/entities";
import { Badge } from "./Badge";

interface BadgeGalleryProps {
  achievements: Achievement[];
}

/**
 * Badge gallery component - displays achievements in a responsive grid
 */
export function BadgeGallery({ achievements }: BadgeGalleryProps) {
  return (
    <div className="w-full">
      <h2
        className="text-xl mono mb-4"
        style={{ color: "var(--text-heading)" }}
      >
        ACHIEVEMENTS
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map((achievement, index) => {
          const isUnlocked = achievement.unlockedAt !== undefined;
          return (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: isUnlocked ? 1 : 0.3 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="hud-panel p-4 flex flex-col items-center justify-center"
            >
              <Badge achievement={achievement} size={64} />
              <div className="mt-3 text-center">
                <div
                  className="text-sm mono font-semibold mb-1"
                  style={{ color: "var(--text-heading)" }}
                >
                  {achievement.name}
                </div>
                <div
                  className="text-xs console-text"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {achievement.description}
                </div>
                {achievement.unlockedAt && (
                  <div
                    className="text-xs mt-2"
                    style={{ color: "var(--text-secondary-accent)" }}
                  >
                    {new Date(achievement.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

