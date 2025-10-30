"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { listSessions, type Session } from "@/lib/db";
import { getLevel } from "@/lib/scoring";
import { DecryptText } from "@/components/DecryptText";

const MOOD_LINES = [
  "Session Console Ready — Engage.",
  "Secure Neural Channel Established.",
  "Protocol Online. System Nominal.",
  "Neural Buffer Active.",
  "Operator Interface Initialized.",
  "Command System Ready.",
];

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [mood] = useState(
    () => MOOD_LINES[Math.floor(Math.random() * MOOD_LINES.length)]
  );

  const loadSessions = useCallback(async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions().catch(console.error);
  }, [loadSessions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white text-xl mono">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
          className="heading-1 text-center mb-3 mt-10"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          <DecryptText text="SESSION CONSOLE" speed={40} />
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-center text-sm console-text mb-10"
        >
          <DecryptText text={mood} speed={30} delay={300} />
        </motion.div>

        {/* New Session Button */}
        <div className="flex items-center justify-end mb-8 hud-divider">
          <Link href="/sessions/new" className="btn-neon-outline hover-lock">
            + NEW SESSION
          </Link>
        </div>

        {/* Sessions Grid */}
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center py-20 hud-panel max-w-md mx-auto"
          >
            <p className="text-white text-lg mb-6 console-text">
              No sessions detected.
            </p>
            <Link href="/sessions/new" className="btn-neon-outline hover-lock">
              INITIALIZE FIRST SESSION
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.08,
                  duration: 0.4,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
                className="relative hud-panel corner-hud group hover-lock"
              >
                <Link href={`/sessions/${session.id}`} className="block">
                  <div className="flex items-center justify-between console-text mb-2">
                    <span className="data-flicker">
                      LVL {getLevel(session.score)}
                    </span>
                    <span className="text-[10px]">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h2
                    className="heading-2 text-white mb-3 truncate"
                    style={{
                      fontFamily: "var(--font-space-grotesk, sans-serif)",
                    }}
                  >
                    {session.title}
                  </h2>

                  {/* Energy tube XP bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 xp-bar-container">
                      <motion.div
                        className={`xp-bar-fill ${((session.score % 100) / 100) * 100 >= 100 ? 'xp-bar-complete' : ''}`}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${((session.score % 100) / 100) * 100}%`,
                        }}
                        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                    </div>
                    <span className="text-white text-sm mono font-semibold">
                      {session.score} XP
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
