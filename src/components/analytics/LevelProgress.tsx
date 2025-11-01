"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Session } from "@/domain/entities";
import { getLevel, getProgressToNextLevel } from "@/lib/scoring";

interface LevelProgressProps {
  sessions: Session[];
}

/**
 * Level progression indicator component
 */
export function LevelProgress({ sessions }: LevelProgressProps) {
  const { currentLevel, progress, currentXP, nextLevelXP } = useMemo(() => {
    const totalXP = sessions.reduce((sum, s) => sum + s.score, 0);
    const level = getLevel(totalXP);
    const progressPercent = getProgressToNextLevel(totalXP);
    const currentLevelXP = (level - 1) * 100;
    const nextLevelXPValue = level * 100;
    
    return {
      currentLevel: level,
      progress: progressPercent,
      currentXP: totalXP,
      nextLevelXP: nextLevelXPValue,
    };
  }, [sessions]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="hud-panel p-4"
    >
      <div 
        className="text-[8px] font-mono tracking-wider uppercase mb-2"
        style={{ color: "rgba(var(--accent-rgb), 0.5)" }}
      >
        LEVEL PROGRESS
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div 
          className="text-3xl mono font-bold"
          style={{ color: "var(--accent)" }}
        >
          {currentLevel}
        </div>
        <div className="flex-1">
          <div 
            className="text-sm mono mb-1"
            style={{ color: "var(--text-primary)" }}
          >
            {currentXP} / {nextLevelXP} XP
          </div>
          <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="h-full"
              style={{
                background: `linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb), 0.7))`,
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

