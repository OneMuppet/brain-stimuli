"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Session } from "@/domain/entities";

interface XPSparklineProps {
  sessions: Session[];
}

/**
 * Minimal XP trend sparkline - canvas-based line chart
 */
export function XPSparkline({ sessions }: XPSparklineProps) {
  const sparklineData = useMemo(() => {
    if (sessions.length === 0) return [];

    // Sort by creation date
    const sorted = [...sessions].sort((a, b) => a.createdAt - b.createdAt);
    
    // Calculate cumulative XP
    let cumulative = 0;
    return sorted.map((session) => {
      cumulative += session.score;
      return {
        date: session.createdAt,
        xp: cumulative,
      };
    });
  }, [sessions]);

  const width = 400;
  const height = 100;
  const padding = 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="hud-panel p-4"
    >
      <div 
        className="text-xs font-mono tracking-wider uppercase mb-4"
        style={{ color: "rgba(var(--accent-rgb), 0.5)", fontSize: "12px" }}
      >
        XP TREND
      </div>
      {sparklineData.length > 0 ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ maxHeight: "100px" }}
        >
          <defs>
            <linearGradient id="xpGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Area fill */}
          {sparklineData.length > 1 && (
            <>
              <path
                d={`M ${padding} ${height - padding} ${
                  sparklineData.map((point, i) => {
                    const x = padding + (i / (sparklineData.length - 1)) * (width - 2 * padding);
                    const maxXP = Math.max(...sparklineData.map(d => d.xp), 1);
                    const y = height - padding - (point.xp / maxXP) * (height - 2 * padding);
                    return `L ${x} ${y}`;
                  }).join(" ")
                } L ${width - padding} ${height - padding} Z`}
                fill="url(#xpGradient)"
              />
              
              {/* Line */}
              <polyline
                points={sparklineData.map((point, i) => {
                  const x = padding + (i / (sparklineData.length - 1)) * (width - 2 * padding);
                  const maxXP = Math.max(...sparklineData.map(d => d.xp), 1);
                  const y = height - padding - (point.xp / maxXP) * (height - 2 * padding);
                  return `${x},${y}`;
                }).join(" ")}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2"
              />
            </>
          )}
          {sparklineData.length === 1 && (
            <circle
              cx={width / 2}
              cy={height / 2}
              r="3"
              fill="var(--accent)"
            />
          )}
        </svg>
      ) : (
        <div 
          className="text-sm console-text text-center py-8"
          style={{ color: "var(--text-secondary)" }}
        >
          No data available
        </div>
      )}
    </motion.div>
  );
}

