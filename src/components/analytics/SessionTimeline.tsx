"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Session } from "@/domain/entities";

interface SessionTimelineProps {
  sessions: Session[];
}

/**
 * Session frequency timeline visualization
 */
export function SessionTimeline({ sessions }: SessionTimelineProps) {
  const timelineData = useMemo(() => {
    // Group sessions by month
    const monthMap = new Map<string, number>();
    
    for (const session of sessions) {
      const date = new Date(session.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const current = monthMap.get(monthKey) || 0;
      monthMap.set(monthKey, current + 1);
    }

    // Convert to sorted array
    return Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months
  }, [sessions]);

  const maxCount = Math.max(...timelineData.map(d => d.count), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="hud-panel p-4"
    >
      <div 
        className="text-[8px] font-mono tracking-wider uppercase mb-4"
        style={{ color: "rgba(var(--accent-rgb), 0.5)" }}
      >
        SESSION FREQUENCY (LAST 12 MONTHS)
      </div>
      {timelineData.length > 0 ? (
        <div className="space-y-2">
          {timelineData.map((item) => {
            const heightPercent = (item.count / maxCount) * 100;
            return (
              <div key={item.month} className="flex items-center gap-3">
                <div 
                  className="text-xs mono w-16"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {new Date(item.month + "-01").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </div>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 h-4 bg-black/20 rounded overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${heightPercent}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="h-full"
                      style={{
                        background: `linear-gradient(90deg, var(--accent), rgba(var(--accent-rgb), 0.7))`,
                      }}
                    />
                  </div>
                  <div 
                    className="text-xs mono w-8 text-right"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {item.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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

