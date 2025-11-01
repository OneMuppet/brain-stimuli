"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { WelcomeScreen } from "@/components/WelcomeScreen";
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
  getImageUrl,
} from "@/lib/db";
import { convertImageIdsToBlobUrls, extractImageIdsFromHtml } from "@/lib/noteImageUtils";
import type { NoteEditorHandle } from "@/components/NoteEditor";
import { getLevel, getProgressToNextLevel } from "@/lib/scoring";
import { XPBar } from "@/components/XPBar";
import { PowerCard } from "@/components/PowerCard";
import { XPBubble } from "@/components/XPBubble";
import { DecryptText } from "@/components/DecryptText";
import { exportSessionToPDF } from "@/lib/pdfExport";
import { checkAchievements } from "@/lib/achievementUtils";
import { DeleteConfirmModal } from "@/components/DeleteConfirmModal";
import { deleteSession } from "@/lib/db";
import { IconExport } from "@/components/icons/IconExport";
import { IconDelete } from "@/components/icons/IconDelete";

const COMBO_WINDOW = 5000; // 5s combo window
const XP_PER_NOTE = 5;
const XP_PER_IMAGE = 10;

export default function SessionDetailPage() {
  const { data: authSession, status } = useSession();
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;
  
  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // All hooks must be called before any conditional returns
  const [session, setSession] = useState<Session | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const noteEditorRef = useRef<NoteEditorHandle>(null);
  const prevImageCountRef = useRef(0);

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
      
      // Check achievements
      await checkAchievements(sessionId).catch(() => {});
    } catch (error) {
      // Silent error handling
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
      
      // Check achievements
      await checkAchievements(sessionId).catch(() => {});
      
      // Rebuild search index after note save
      if (typeof window !== "undefined") {
        const { getSearchIndex } = await import("@/lib/searchIndex");
        getSearchIndex().buildIndex().catch(() => {});
      }
    } catch (error) {
      // Silent error handling
    }
  };


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
      // Silent error handling
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessionData().catch(() => {});
  }, [loadSessionData]);

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

  // Refresh note content when images are restored (e.g., after sync)
  // Track previous image count to detect when new images are restored
  useEffect(() => {
    const currentImageCount = images.length;
    const prevImageCount = prevImageCountRef.current;
    prevImageCountRef.current = currentImageCount;
    
    // Only refresh if images were added (restored from cloud)
    if (notes.length > 0 && currentImageCount > prevImageCount && prevImageCount > 0 && noteEditorRef.current?.editor) {
      // Re-convert image IDs to blob URLs in case new images were restored
      (async () => {
        const note = notes[0];
        if (note) {
          const processedContent = await convertImageIdsToBlobUrls(note.content, images);
          // Only update if content changed (e.g., missing images were restored)
          if (processedContent !== note.content) {
            noteEditorRef.current?.editor?.commands.setContent(processedContent);
          }
        }
      })().catch(() => {});
    }
  }, [notes, images]);

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

  if (!authSession) {
    return <WelcomeScreen />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div 
          className="text-xl mono"
          style={{ color: "var(--text-primary)" }}
        >
          Loading session...
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div 
          className="text-lg hud-panel max-w-md text-center"
          style={{ color: "var(--text-primary)" }}
        >
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

        {/* Unified Header Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="hud-panel corner-hud mb-6"
        >
          {/* Navigation and Actions Row */}
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <Link
              href="/"
              className="btn-neon-outline hover-lock text-sm"
              style={{ touchAction: "manipulation" }}
            >
              ← BACK
            </Link>
            
            {/* Action Buttons Group */}
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  if (session && !isExporting) {
                    setIsExporting(true);
                    try {
                      // Get current editor content (may have unsaved changes)
                      const note = notes[0] || null;
                      let currentContent = note?.content || "";
                      
                      // If editor exists, get current content (which may have unsaved removals)
                      if (noteEditorRef.current?.editor) {
                        currentContent = noteEditorRef.current.editor.getHTML();
                      }
                      
                      // Only include images that are actually referenced in the current content
                      let filteredImages = images;
                      if (currentContent) {
                        const referencedImageIds = extractImageIdsFromHtml(currentContent);
                        filteredImages = images.filter((img) => referencedImageIds.has(img.id));
                      } else {
                        // No content means no images should be exported
                        filteredImages = [];
                      }
                      
                      await exportSessionToPDF(session, note, filteredImages);
                    } finally {
                      setIsExporting(false);
                    }
                  }
                }}
                disabled={isExporting}
                className="btn-neon-outline hover-lock flex items-center justify-center w-10 h-10 p-0"
                style={{ 
                  touchAction: "manipulation",
                  color: "var(--accent)",
                  opacity: isExporting ? 0.6 : 1,
                }}
                title={isExporting ? "EXPORTING..." : "EXPORT PDF"}
              >
                <IconExport />
              </button>
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="btn-neon-outline hover-lock flex items-center justify-center w-10 h-10 p-0"
                style={{ 
                  touchAction: "manipulation",
                  color: "var(--accent)",
                }}
                title="DELETE SESSION"
              >
                <IconDelete />
              </button>
            </div>
          </div>

          {/* Session Title */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="heading-1 mb-2"
            style={{ 
              fontFamily: "var(--font-space-grotesk, sans-serif)",
              color: "var(--text-primary)",
            }}
          >
            <DecryptText text={session.title.toUpperCase()} speed={35} />
          </motion.h1>

          {/* Session Metadata */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="console-text text-xs"
            style={{ color: "rgba(var(--accent-rgb), 0.7)" }}
          >
            <DecryptText 
              text={`Session Console Ready — Engage. | ${new Date(session.createdAt).toLocaleDateString()}`} 
              speed={25} 
              delay={300} 
            />
          </motion.div>
        </motion.div>

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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={async () => {
          if (session) {
            await deleteSession(session.id);
            router.push("/");
          }
        }}
        title="DELETE SESSION"
        message="Are you sure you want to delete this session? This will permanently delete the session, all notes, and all images. This action will sync to all your devices."
        itemName={session?.title}
      />
    </div>
  );
}
