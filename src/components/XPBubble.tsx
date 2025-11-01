"use client";

import { motion } from "framer-motion";

interface XPBubbleProps {
  xp: number;
  onComplete: () => void;
  keyId: string;
}

export function XPBubble({ xp, onComplete, keyId }: XPBubbleProps) {
  return (
    <motion.div
      key={keyId}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: -40, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      transition={{
        duration: 0.5,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      onAnimationComplete={onComplete}
      className="absolute left-1/2 top-0 -translate-x-1/2 z-40 pointer-events-none"
    >
      <div
        className="px-3 py-1 bg-black/90 text-xs font-mono shadow-inner"
        style={{
          borderRadius: "var(--r)",
          borderColor: "rgba(var(--accent-rgb), 0.5)",
          borderWidth: "1px",
          borderStyle: "solid",
          color: "var(--text-heading)",
          boxShadow: "inset 0 0 8px rgba(var(--accent-rgb), 0.12)",
        }}
      >
        +{xp} XP
      </div>
    </motion.div>
  );
}
