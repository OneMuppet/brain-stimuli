"use client";

import { motion } from "framer-motion";
import type { Achievement } from "@/domain/entities";
import { BadgeFactory } from "./badges/BadgeFactory";

interface BadgeProps {
  achievement: Achievement;
  size?: number;
  showTooltip?: boolean;
}

/**
 * Theme-aware badge wrapper component
 * Applies theme colors and handles earned/unearned states
 */
export function Badge({ achievement, size = 64, showTooltip = true }: BadgeProps) {
  const isUnlocked = achievement.unlockedAt !== undefined;

  return (
    <div
      className="relative inline-flex items-center justify-center cursor-pointer"
      style={{ width: size, height: size }}
      title={showTooltip ? `${achievement.name}\n${achievement.description}` : undefined}
    >
      <motion.div
        initial={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
        style={{
          opacity: isUnlocked ? 1 : 0.1,
        }}
      >
        <BadgeFactory badgeType={achievement.badgeType} />
      </motion.div>
      {!isUnlocked && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            borderRadius: "50%",
          }}
        />
      )}
    </div>
  );
}

