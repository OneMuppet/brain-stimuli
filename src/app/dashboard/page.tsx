"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { listSessions, listNotes, listImages, type Session } from "@/lib/db";
import { getLevel } from "@/lib/scoring";
import { AchievementService } from "@/application/services/AchievementService";
import type { Achievement } from "@/domain/entities";
import { BadgeGallery } from "@/components/BadgeGallery";
import { XPSparkline } from "@/components/analytics/XPSparkline";
import { ActivityGrid } from "@/components/analytics/ActivityGrid";
import { StatsCard } from "@/components/analytics/StatsCard";
import { LevelProgress } from "@/components/analytics/LevelProgress";
import { SessionTimeline } from "@/components/analytics/SessionTimeline";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated") {
      loadData();
    }
  }, [status]);

  const loadData = async () => {
    try {
      const [sessionsData, achievementsData] = await Promise.all([
        listSessions(),
        AchievementService.listAll(),
      ]);
      setSessions(sessionsData);
      setAchievements(achievementsData);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  const [stats, setStats] = useState({
    totalXP: 0,
    totalSessions: 0,
    totalNotes: 0,
    totalImages: 0,
    totalWords: 0,
    currentLevel: 1,
  });

  // Calculate stats
  useEffect(() => {
    const calculateStats = async () => {
      if (sessions.length === 0) {
        setStats({
          totalXP: 0,
          totalSessions: 0,
          totalNotes: 0,
          totalImages: 0,
          totalWords: 0,
          currentLevel: 1,
        });
        return;
      }

      const totalXP = sessions.reduce((sum, s) => sum + s.score, 0);
      
      const allNotes = await Promise.all(
        sessions.map(s => listNotes(s.id))
      ).then(notesArrays => notesArrays.flat());
      
      const allImages = await Promise.all(
        sessions.map(s => listImages(s.id))
      ).then(imagesArrays => imagesArrays.flat());

      // Calculate word count
      let wordCount = 0;
      for (const note of allNotes) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(note.content, "text/html");
        const text = doc.body.textContent || "";
        wordCount += text.split(/\s+/).filter(w => w.length > 0).length;
      }

      setStats({
        totalXP,
        totalSessions: sessions.length,
        totalNotes: allNotes.length,
        totalImages: allImages.length,
        totalWords: wordCount,
        currentLevel: getLevel(totalXP),
      });
    };

    calculateStats().catch(() => {});
  }, [sessions]);

  if (status === "loading" || loading) {
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/")}
            className="btn-neon-outline hover-lock text-sm"
            style={{ touchAction: "manipulation" }}
          >
            ← BACK
          </button>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="heading-1 text-center flex-1"
            style={{ 
              color: "var(--text-heading)",
              opacity: 1,
            }}
          >
            DASHBOARD
          </motion.h1>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatsCard
            label="TOTAL XP"
            value={stats.totalXP.toLocaleString()}
            iconType="lightning"
          />
          <StatsCard
            label="LEVEL"
            value={stats.currentLevel.toString()}
            iconType="star"
          />
          <StatsCard
            label="SESSIONS"
            value={stats.totalSessions.toString()}
            iconType="document"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <XPSparkline sessions={sessions} />
          <ActivityGrid sessions={sessions} />
        </div>

        {/* Level Progress */}
        <div className="mb-6">
          <LevelProgress sessions={sessions} />
        </div>

        {/* Session Timeline */}
        <div className="mb-6">
          <SessionTimeline sessions={sessions} />
        </div>

        {/* Badge Gallery */}
        <div className="mb-6">
          <BadgeGallery achievements={achievements} />
        </div>
      </div>
    </div>
  );
}

