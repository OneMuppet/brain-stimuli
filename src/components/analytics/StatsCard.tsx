"use client";

import { motion } from "framer-motion";
import { IconLightning } from "./icons/IconLightning";
import { IconStar } from "./icons/IconStar";
import { IconDocument } from "./icons/IconDocument";

interface StatsCardProps {
  label: string;
  value: string | number;
  iconType?: "lightning" | "star" | "document";
}

/**
 * Reusable stat card component - theme-aware, outlined style
 */
export function StatsCard({ label, value, iconType }: StatsCardProps) {
  const renderIcon = () => {
    if (!iconType) return null;
    
    switch (iconType) {
      case "lightning":
        return <IconLightning />;
      case "star":
        return <IconStar />;
      case "document":
        return <IconDocument />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="hud-panel p-4"
    >
      <div 
        className="text-xs font-mono tracking-wider uppercase mb-2"
        style={{ color: "rgba(var(--accent-rgb), 0.5)", fontSize: "12px" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-2">
        {iconType && (
          <div className="w-6 h-6 flex-shrink-0" style={{ color: "var(--accent)" }}>
            {renderIcon()}
          </div>
        )}
        <div 
          className="font-mono font-bold"
          style={{ 
            color: "var(--accent)",
            fontSize: "24px",
            lineHeight: "24px",
          }}
        >
          {value}
        </div>
      </div>
    </motion.div>
  );
}

