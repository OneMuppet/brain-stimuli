"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { useFullscreen } from "@/hooks/useFullscreen";
import { IconFullscreen } from "@/components/icons/IconFullscreen";
import { IconFullscreenExit } from "@/components/icons/IconFullscreenExit";

/**
 * System Toolbar - HUD-themed fold-out control panel
 * Contains navigation and system controls (dashboard, fullscreen)
 * Positioned top-left to complement profile badge (top-right)
 */
export function SystemToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // For mobile tap state
  const toolbarRef = useRef<HTMLDivElement>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchHandledRef = useRef<boolean>(false);

  // Handle mobile tap and click outside - must be before any conditional returns
  useEffect(() => {
    if (!session) return; // Only set up listeners when authenticated

    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.system-toolbar-toggle') && 
          !target.closest('.system-toolbar-content')) {
        touchStartTimeRef.current = Date.now();
        touchHandledRef.current = false;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.system-toolbar-toggle') && 
          !target.closest('.system-toolbar-content') &&
          !touchHandledRef.current) {
        const touchDuration = Date.now() - touchStartTimeRef.current;
        if (touchDuration < 300) {
          setIsOpen((prev) => !prev);
          touchHandledRef.current = true;
        }
      }
    };

    // Handle click outside to close on mobile
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.system-toolbar-toggle') && 
          !target.closest('.system-toolbar-content')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    
    // Only add click outside listener when open
    let clickOutsideTimeout: NodeJS.Timeout | null = null;
    if (isOpen) {
      // Use setTimeout to avoid immediate close when opening
      clickOutsideTimeout = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
        document.addEventListener('touchend', handleClickOutside, true);
      }, 0);
    }

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      if (clickOutsideTimeout) {
        clearTimeout(clickOutsideTimeout);
      }
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('touchend', handleClickOutside, true);
    };
  }, [session, isOpen]);

  // Only show when authenticated
  if (!session) {
    return null;
  }

  const isDashboard = pathname === "/dashboard";
  const isHome = pathname === "/";
  const isExpanded = isHovered || isOpen;

  // Only show on notes list page (home page)
  if (!isHome) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="fixed top-4 left-4 z-40"
      style={{ position: "fixed" }}
    >
      {/* Toolbar Container */}
      <motion.div
        ref={toolbarRef}
        className="border bg-black/70 backdrop-blur-sm cursor-pointer overflow-hidden system-toolbar-toggle"
        style={{
          borderRadius: "var(--r)",
          borderColor: "rgba(var(--accent-rgb), 0.3)",
          display: "inline-flex",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        animate={{
          width: isExpanded ? "fit-content" : "28px",
          height: isExpanded ? "fit-content" : "28px",
        }}
        transition={{
          duration: 0.18,
          ease: [0.2, 0.8, 0.2, 1]
        }}
      >
        {/* Compact State - Just icon */}
        <AnimatePresence>
          {!isExpanded && (
            <motion.div
              className="flex items-center justify-center w-full h-full"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: "rgba(var(--accent-rgb), 0.6)",
                  boxShadow: "0 0 4px rgba(var(--accent-rgb), 0.4)",
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded State */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="flex flex-col items-stretch gap-2 px-3 py-2 system-toolbar-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Dashboard Button */}
              {!isDashboard && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push("/dashboard");
                  }}
                  className="w-full px-2 py-1 text-[10px] font-mono tracking-wider uppercase transition-all hover-lock text-center"
                  style={{
                    touchAction: "manipulation",
                    color: "rgba(var(--accent-rgb), 0.6)",
                    border: "1px solid rgba(var(--accent-rgb), 0.2)",
                    borderRadius: "var(--r)",
                    backgroundColor: "rgba(0, 0, 0, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--accent)";
                    e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.4)";
                    e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                    e.currentTarget.style.boxShadow = "inset 0 0 8px rgba(var(--accent-rgb), 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "rgba(var(--accent-rgb), 0.6)";
                    e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.2)";
                    e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                  title="DASHBOARD"
                >
                  DASHBOARD
                </button>
              )}

              {/* Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="w-full h-6 flex items-center justify-center transition-all hover-lock"
                style={{
                  touchAction: "manipulation",
                  color: "rgba(var(--accent-rgb), 0.6)",
                  border: "1px solid rgba(var(--accent-rgb), 0.2)",
                  borderRadius: "var(--r)",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--accent)";
                  e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.4)";
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
                  e.currentTarget.style.boxShadow = "inset 0 0 8px rgba(var(--accent-rgb), 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(var(--accent-rgb), 0.6)";
                  e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.2)";
                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.3)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                title={isFullscreen ? "EXIT FULLSCREEN" : "ENTER FULLSCREEN"}
              >
                {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Corner reticles - positioned outside toolbar to track its edges */}
      {/* Top Left */}
      <motion.div
        className="border-l border-t pointer-events-none z-[60]"
        style={{
          position: "absolute",
          top: "-3px",
          left: "-3px",
          borderColor: "rgba(var(--accent-rgb), 0.4)",
        }}
        animate={{
          width: isExpanded ? "8px" : "4px",
          height: isExpanded ? "8px" : "4px",
          opacity: isExpanded ? 1 : 0.4,
        }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      />
      {/* Top Right */}
      <motion.div
        className="border-r border-t pointer-events-none z-[60]"
        style={{
          position: "absolute",
          top: "-3px",
          borderColor: "rgba(var(--accent-rgb), 0.4)",
        }}
        animate={{
          right: "-3px",
          width: isExpanded ? "8px" : "4px",
          height: isExpanded ? "8px" : "4px",
          opacity: isExpanded ? 1 : 0.4,
        }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      />
      {/* Bottom Left */}
      <motion.div
        className="border-l border-b pointer-events-none z-[60]"
        style={{
          position: "absolute",
          left: "-3px",
          bottom: "-3px",
          borderColor: "rgba(var(--accent-rgb), 0.4)",
        }}
        animate={{
          width: isExpanded ? "8px" : "4px",
          height: isExpanded ? "8px" : "4px",
          opacity: isExpanded ? 1 : 0.4,
        }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      />
      {/* Bottom Right */}
      <motion.div
        className="border-r border-b pointer-events-none z-[60]"
        style={{
          position: "absolute",
          bottom: "-3px",
          right: "-3px",
          borderColor: "rgba(var(--accent-rgb), 0.4)",
        }}
        animate={{
          width: isExpanded ? "8px" : "4px",
          height: isExpanded ? "8px" : "4px",
          opacity: isExpanded ? 1 : 0.4,
        }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </motion.div>
  );
}

