"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ImageGallery } from "@/components/ImageGallery";
import { NoteEditor } from "@/components/NoteEditor";
import {
  createImage,
  createNote,
  getSession,
  type Image,
  listImages,
  listNotes,
  type Note,
  type Session,
  updateNote,
  updateSession,
  deleteImage,
  getImageUrl,
} from "@/lib/db";
import { convertImageIdsToBlobUrls } from "@/lib/noteImageUtils";
import type { NoteEditorHandle } from "@/components/NoteEditor";
import { getLevel, getProgressToNextLevel } from "@/lib/scoring";
import { XPBar } from "@/components/XPBar";
import { PowerCard } from "@/components/PowerCard";
import { XPBubble } from "@/components/XPBubble";
import { DecryptText } from "@/components/DecryptText";

const COMBO_WINDOW = 5000; // 5s combo window
const XP_PER_NOTE = 5;
const XP_PER_IMAGE = 10;

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const noteEditorRef = useRef<NoteEditorHandle>(null);

  // Gamification state
  const [streakActive, setStreakActive] = useState(false);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState<NodeJS.Timeout | null>(null);
  const [showXPBubble, setShowXPBubble] = useState<null | {
    keyId: string;
    xp: number;
  }>(null);
  const [showPowerCard, setShowPowerCard] = useState<null | {
    imageUrl?: string;
  }>(null);

  // Combo/streak handler
  const onAction = (xp: number = XP_PER_NOTE) => {
    if (comboTimer) clearTimeout(comboTimer);
    setCombo((c) => c + 1);
    setStreakActive(true);
    setShowXPBubble({ keyId: `xp-${Date.now()}`, xp });

    const timer = setTimeout(() => {
      setCombo(0);
      setStreakActive(false);
    }, COMBO_WINDOW);
    setComboTimer(timer);
  };

  // Image paste handler
  const handleImagePaste = async (file: File) => {
    if (!session) return;
    try {
      const blob = new Blob([file], { type: file.type });
      const image = await createImage(sessionId, blob, file.type);
      const updatedImages = await listImages(sessionId);
      setImages(updatedImages);

      // Insert image into editor with image ID reference stored in data-image-id
      const imageUrl = await getImageUrl(image);
      noteEditorRef.current?.insertImage(image.id, imageUrl);

      setShowPowerCard({});
      onAction(XP_PER_IMAGE);

      const newScore = session.score + XP_PER_IMAGE;
      const updated = await updateSession(sessionId, { score: newScore });
      if (updated) setSession(updated);
    } catch (error) {
      console.error("Failed to save image:", error);
    }
  };

  // Note save handler
  const handleNoteSave = async (content: string) => {
    if (!session) return;
    try {
      if (notes.length > 0 && notes[0].content !== content) {
        await updateNote(notes[0].id, content);
      } else if (notes.length === 0 && content.trim()) {
        await createNote(sessionId, content);
      }

      const updatedNotes = await listNotes(sessionId);
      setNotes(updatedNotes);
      onAction(XP_PER_NOTE);

      const newScore = session.score + XP_PER_NOTE;
      const updated = await updateSession(sessionId, { score: newScore });
      if (updated) setSession(updated);
    } catch (error) {
      console.error("Failed to save note:", error);
    }
  };

  // Image deletion
  const handleImageDelete = async (id: string) => {
    try {
      await deleteImage(id);
      const updated = await listImages(sessionId);
      setImages(updated);
    } catch (e) {
      console.error("Failed to delete screenshot", e);
    }
  };

  // Auto-clear XP bubble
  useEffect(() => {
    if (showXPBubble) {
      const t = setTimeout(() => setShowXPBubble(null), 1200);
      return () => clearTimeout(t);
    }
  }, [showXPBubble]);

  // Auto-clear power card
  useEffect(() => {
    if (showPowerCard) {
      const t = setTimeout(() => setShowPowerCard(null), 1300);
      return () => clearTimeout(t);
    }
  }, [showPowerCard]);

  // Load session data
  const loadSessionData = useCallback(async () => {
    try {
      const [sessionData, notesData, imagesData] = await Promise.all([
        getSession(sessionId),
        listNotes(sessionId),
        listImages(sessionId),
      ]);

      if (!sessionData) {
        setLoading(false);
        setSession(null);
        return;
      }

      // Convert image IDs in note content to blob URLs for display
      const processedNotes = await Promise.all(
        notesData.map(async (note) => {
          const contentWithBlobUrls = await convertImageIdsToBlobUrls(note.content, imagesData);
          return { ...note, content: contentWithBlobUrls };
        })
      );

      setSession(sessionData);
      setNotes(processedNotes);
      setImages(imagesData);
    } catch (error) {
      console.error("Failed to load session:", error);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessionData().catch(console.error);
  }, [loadSessionData]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white text-xl mono">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white text-lg hud-panel max-w-md text-center">
          <p className="mb-4 console-text">Session not found.</p>
          <button
            onClick={() => router.push("/")}
            className="btn-neon-outline hover-lock"
          >
            ← RETURN TO CONSOLE
          </button>
        </div>
      </div>
    );
  }

  const level = getLevel(session.score);
  const progress = getProgressToNextLevel(session.score);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto relative">
        {/* Top XP Bar (sticky) */}
        <div className="sticky top-0 z-40 pb-2 bg-[var(--bg-base)]/95 backdrop-blur-sm -mx-4 md:-mx-8 px-4 md:px-8 pt-2 overflow-visible">
          <XPBar
            xp={session.score}
            progress={progress}
            combo={combo}
            streakActive={streakActive}
            level={level}
          />
          <AnimatePresence>
            {showXPBubble && (
              <XPBubble
                key={showXPBubble.keyId}
                keyId={showXPBubble.keyId}
                xp={showXPBubble.xp}
                onComplete={() => setShowXPBubble(null)}
              />
            )}
          </AnimatePresence>
          {/* Fade gradient at bottom to create fade effect when scrolling - positioned well below content */}
          <div 
            className="absolute left-0 right-0 h-6 pointer-events-none"
            style={{
              top: "100%",
              background: "linear-gradient(to bottom, rgb(10, 10, 12), transparent)",
            }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4 mt-2">
          <Link href="/" className="btn-neon-outline hover-lock text-sm">
            ← BACK
          </Link>
        </div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="heading-1 text-white mb-2"
          style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
        >
          <DecryptText text={session.title.toUpperCase()} speed={35} />
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="console-text mb-4"
        >
          <DecryptText text="Session Console Ready — Engage." speed={25} delay={200} />
        </motion.div>

        <div className="hud-divider mb-4" />

        {/* Screenshot Gallery */}
        {images.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-4"
          >
            <ImageGallery images={images} onDelete={handleImageDelete} />
          </motion.div>
        )}

        {/* Note Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <NoteEditor
            ref={noteEditorRef}
            initialContent={notes.length > 0 ? notes[0].content : ""}
            docKey={sessionId}
            onSave={handleNoteSave}
            onImagePaste={handleImagePaste}
          />
        </motion.div>
      </div>

      {/* Subtle streak indicator (top/bottom edge lines) */}
      <AnimatePresence>
        {streakActive && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
