"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import type { Session } from "@/domain/entities";

interface ActivityGridProps {
  sessions: Session[];
}

/**
 * Activity heatmap - shows daily activity patterns with small cells
 */
export function ActivityGrid({ sessions }: ActivityGridProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const activityData = useMemo(() => {
    // Get last 30 days of activity
    const days = 30;
    const today = new Date();
    const activityMap = new Map<string, number>();

    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      activityMap.set(dateKey, 0);
    }

    // Count sessions per day
    for (const session of sessions) {
      const date = new Date(session.createdAt);
      const dateKey = date.toISOString().split("T")[0];
      const current = activityMap.get(dateKey) || 0;
      activityMap.set(dateKey, current + 1);
    }

    // Convert to array of {date, count}
    return Array.from(activityMap.entries())
      .map(([date, count]) => ({ date, count }))
      .reverse(); // Most recent first
  }, [sessions]);

  const maxCount = Math.max(...activityData.map(d => d.count), 1);

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
        ACTIVITY (LAST 30 DAYS)
      </div>
      <div className="grid grid-cols-10 gap-1">
        {activityData.map((day, index) => {
          const intensity = day.count / maxCount;
          const dateStr = new Date(day.date).toLocaleDateString("en-US", { 
            weekday: "short", 
            month: "short", 
            day: "numeric",
            year: "numeric"
          });
          const sessionText = day.count === 0 
            ? "No sessions" 
            : `${day.count} session${day.count !== 1 ? "s" : ""}`;
          const isActive = activeTooltip === day.date;
          return (
            <div
              key={day.date}
              className="aspect-square rounded-sm transition-all hover:scale-110 cursor-help relative group"
              style={{
                backgroundColor: `rgba(var(--accent-rgb), ${0.1 + intensity * 0.4})`,
                border: `1px solid rgba(var(--accent-rgb), ${0.2 + intensity * 0.3})`,
              }}
              title={`${dateStr}\n${sessionText}`}
              onTouchStart={() => setActiveTooltip(day.date)}
              onTouchEnd={() => setTimeout(() => setActiveTooltip(null), 2000)}
              onMouseEnter={() => setActiveTooltip(day.date)}
              onMouseLeave={() => setActiveTooltip(null)}
            >
              {/* Enhanced hover/tap tooltip */}
              <div 
                className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-mono tracking-wider uppercase whitespace-nowrap pointer-events-none transition-opacity z-50 ${
                  isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{
                  background: "rgba(0, 0, 0, 0.95)",
                  border: "1px solid rgba(var(--accent-rgb), 0.5)",
                  borderRadius: "var(--r)",
                  color: "var(--accent)",
                  boxShadow: `
                    0 0 12px rgba(var(--accent-rgb), 0.3),
                    inset 0 0 8px rgba(var(--accent-rgb), 0.1)
                  `,
                  textShadow: "0 0 8px rgba(var(--accent-rgb), 0.6)",
                }}
              >
                <div style={{ color: "var(--accent)" }}>{dateStr}</div>
                <div style={{ color: "rgba(var(--accent-rgb), 0.8)", fontSize: "10px", marginTop: "2px" }}>
                  {sessionText}
                </div>
                {/* Arrow */}
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 translate-y-0 w-0 h-0"
                  style={{
                    borderLeft: "6px solid transparent",
                    borderRight: "6px solid transparent",
                    borderTop: `6px solid rgba(var(--accent-rgb), 0.5)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

