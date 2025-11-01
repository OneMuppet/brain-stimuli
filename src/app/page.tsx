"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { listSessions, type Session } from "@/lib/db";
import { getLevel } from "@/lib/scoring";
import { DecryptText } from "@/components/DecryptText";
import { SignIn } from "@/components/SignIn";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { useSync } from "@/hooks/useSync";

const MOOD_LINES = [
  "Session Console Ready — Engage.",
  "Secure Neural Channel Established.",
  "Protocol Online. System Nominal.",
  "Neural Buffer Active.",
  "Operator Interface Initialized.",
  "Command System Ready.",
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [clickedSessionId, setClickedSessionId] = useState<string | null>(null);
  const [mood] = useState(
    () => MOOD_LINES[Math.floor(Math.random() * MOOD_LINES.length)]
  );
  const { isAuthenticated, isOnline, isSyncing, lastSyncTime } = useSync();

  // All hooks must be called before any conditional returns
  const loadSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSessions().catch(() => {});
    }
  }, [loadSessions, isAuthenticated]);

  // Reload sessions after sync completes
  useEffect(() => {
    if (isAuthenticated && lastSyncTime && !isSyncing) {
      loadSessions().catch(() => {});
    }
  }, [lastSyncTime, isSyncing, loadSessions, isAuthenticated]);

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const query = searchQuery.toLowerCase();
    return sessions.filter((s) =>
      s.title.toLowerCase().includes(query)
    );
  }, [sessions, searchQuery]);

  // Conditional returns after all hooks
  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div 
          className="text-xl mono"
          style={{ color: "var(--text-primary)" }}
        >
          Loading...
        </div>
      </div>
    );
  }

  if (!session) {
    return <WelcomeScreen />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div 
          className="text-xl mono"
          style={{ color: "var(--text-primary)" }}
        >
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1" />
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="heading-1"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            <DecryptText text="SESSION CONSOLE" speed={40} />
          </motion.h1>
          <div className="flex-1 flex justify-end">
            <SignIn />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-center text-sm console-text mb-6"
        >
          <DecryptText text={mood} speed={30} delay={300} />
        </motion.div>

        {/* Sync status indicator */}
        {isAuthenticated && (
          <div className="console-text text-xs mb-4 flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isSyncing
                    ? "animate-pulse"
                    : ""
                }`}
                style={{
                  backgroundColor: isSyncing
                    ? "var(--accent)"
                    : isOnline
                      ? "#4ade80"
                      : "#facc15"
                }}
              />
              {isSyncing
                ? "SYNCING..."
                : isOnline
                  ? "CLOUD SYNC ACTIVE"
                  : "OFFLINE - CHANGES QUEUED"}
            </div>
          </div>
        )}

        {/* Search Bar */}
        {sessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="mb-6"
          >
            <div className="relative hud-panel corner-hud no-padding">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sessions..."
                className="w-full bg-transparent font-mono text-sm tracking-wide search-input"
                style={{
                  color: "var(--text-primary)",
                  touchAction: "manipulation",
                  padding: "20px",
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none"
                  style={{
                    color: "var(--text-primary)",
                    opacity: 0.4,
                    touchAction: "manipulation",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "0.7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.4";
                  }}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* New Session Button */}
        <div className="flex items-center justify-end mb-8 hud-divider">
          <Link
            href="/sessions/new"
            className="btn-neon-outline hover-lock"
            style={{ touchAction: "manipulation" }}
          >
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
            <p 
              className="text-lg mb-6 console-text"
              style={{ color: "var(--text-primary)" }}
            >
              No sessions detected.
            </p>
            <Link
              href="/sessions/new"
              className="btn-neon-outline hover-lock"
              style={{ touchAction: "manipulation" }}
            >
              INITIALIZE FIRST SESSION
            </Link>
          </motion.div>
        ) : filteredSessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className="text-center py-20 hud-panel max-w-md mx-auto"
          >
            <p 
              className="text-lg mb-6 console-text"
              style={{ color: "var(--text-primary)" }}
            >
              No sessions match "{searchQuery}".
            </p>
            <button
              onClick={() => setSearchQuery("")}
              className="btn-neon-outline hover-lock"
              style={{ touchAction: "manipulation" }}
            >
              CLEAR SEARCH
            </button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session, index) => (
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
                style={{
                  opacity: clickedSessionId === session.id ? 0.7 : 1,
                  transition: "opacity 0.1s",
                }}
              >
                <div
                  onClick={() => {
                    setClickedSessionId(session.id);
                    router.push(`/sessions/${session.id}`);
                  }}
                  onMouseEnter={() => {
                    router.prefetch(`/sessions/${session.id}`);
                  }}
                  className="block cursor-pointer"
                  style={{ touchAction: "manipulation" }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setClickedSessionId(session.id);
                      router.push(`/sessions/${session.id}`);
                    }
                  }}
                >
                  <div className="flex items-center justify-between console-text mb-2">
                    <span className="data-flicker">LVL {getLevel(session.score)}</span>
                    <span className="text-[10px]">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <h2
                    className="heading-2 mb-3 truncate"
                    style={{
                      fontFamily: "var(--font-space-grotesk, sans-serif)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {session.title}
                  </h2>

                  {/* Energy tube XP bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 xp-bar-container">
                      <motion.div
                        className={`xp-bar-fill ${
                          ((session.score % 100) / 100) * 100 >= 100
                            ? "xp-bar-complete"
                            : ""
                        }`}
                        initial={{ width: 0 }}
                        animate={{
                          width: `${((session.score % 100) / 100) * 100}%`,
                        }}
                        transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
                      />
                    </div>
                    <span 
                      className="text-sm mono font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {session.score} XP
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
