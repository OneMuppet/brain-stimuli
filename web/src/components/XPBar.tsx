"use client";

import { motion } from "framer-motion";

interface XPBarProps {
    xp: number;
    progress: number; // 0-100
    combo: number;
    streakActive: boolean;
    level?: number;
}

export function XPBar({ xp, progress, combo, level }: XPBarProps) {
    return (
        <div className="relative py-3">
            <div className="flex items-center gap-4">
                {/* Energy tube XP bar */}
                <div className="flex-1">
                    <div className="xp-bar-container">
                        <motion.div
                            className={`xp-bar-fill ${progress >= 100 ? 'xp-bar-complete' : ''}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{
                                duration: 0.8,
                                ease: [0.2, 0.8, 0.2, 1],
                            }}
                        />
                    </div>
                </div>

                {/* XP value + level */}
                <div className="flex flex-col items-end min-w-[80px]">
                    {level !== undefined && (
                        <div className="console-text text-[10px] opacity-60 mb-1">
                            LEVEL {level}
                        </div>
                    )}
                    <div className="text-white font-semibold text-lg mono tracking-wider">
                        {xp} <span className="text-sm opacity-70">XP</span>
                    </div>
                </div>
            </div>

            {/* Combo indicator - absolutely positioned to not push content */}
            {combo > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    className="absolute right-0 bottom-0 px-2 py-0.5 border text-xs mono pointer-events-none"
                    style={{
                        borderRadius: "var(--r)",
                        borderColor: "rgba(var(--accent-rgb), 0.2)",
                        color: "rgba(var(--accent-rgb), 0.7)"
                    }}
                >
                    COMBO x{combo}
                </motion.div>
            )}
        </div>
    );
}
