"use client";

import { motion } from "framer-motion";

interface PowerCardProps {
  imageUrl?: string;
  label?: string;
  onAnimationComplete?: () => void;
}

export function PowerCard({
  imageUrl,
  label,
  onAnimationComplete,
}: PowerCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{
        duration: 0.3,
        ease: [0.2, 0.8, 0.2, 1],
      }}
      onAnimationComplete={onAnimationComplete}
      className="inline-block relative mx-2 z-30"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="border bg-black/90 backdrop-blur-sm flex items-center gap-2 px-3 py-1.5 min-w-[120px]"
        style={{
          borderRadius: "var(--r)",
          borderColor: "rgba(var(--accent-rgb), 0.5)",
          boxShadow: "inset 0 0 10px rgba(var(--accent-rgb), 0.12)",
        }}
      >
        {/* Pulsing indicator dot */}
        <span className="relative flex h-2 w-2">
          <span 
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" 
            style={{ backgroundColor: "var(--accent)" }}
          />
          <span 
            className="relative inline-flex rounded-full h-2 w-2" 
            style={{ backgroundColor: "var(--accent)" }}
          />
        </span>
        <span 
          className="font-mono text-xs tracking-wide uppercase"
          style={{ color: "var(--text-heading)" }}
        >
          {label ?? "CAPTURED"}
        </span>
      </div>
    </motion.div>
  );
}
