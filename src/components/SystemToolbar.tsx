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
  const { isFullscreen, toggleFullscreen, needsPWAInstall, isPWAStandalone, supportsFullscreen } = useFullscreen();
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // For mobile tap state
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchHandledRef = useRef<boolean>(false);

  // Close on click outside (mobile) - matching SignIn pattern
  useEffect(() => {
    if (!isOpen || !session) return;
    
    let openTime = Date.now();
    
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      // Don't close immediately after opening (wait at least 200ms)
      if (Date.now() - openTime < 200) {
        return;
      }
      
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Add listener after a delay to avoid immediate close
    const timeoutId = setTimeout(() => {
      openTime = Date.now();
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 200);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, session]);

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
      ref={containerRef}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="fixed top-4 left-4 z-40"
      style={{ position: "fixed" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onTouchStart={(e) => {
        touchStartTimeRef.current = Date.now();
        touchHandledRef.current = false;
        // Only toggle if tapping on the toolbar itself, not content or buttons
        const target = e.target as HTMLElement;
        if (target.closest('.system-toolbar-toggle') && 
            !target.closest('.system-toolbar-content') && 
            !target.closest('button') &&
            !target.closest('.system-toolbar-header')) {
          setIsOpen(prev => !prev);
        }
      }}
      onTouchEnd={(e) => {
        // Mark touch as handled to prevent duplicate click event
        const touchDuration = Date.now() - touchStartTimeRef.current;
        if (touchDuration < 300) { // Quick tap
          touchHandledRef.current = true;
        }
      }}
      onClick={(e) => {
        // On mobile, prevent click if touch was handled recently (within 300ms)
        // This prevents double-toggle when both touch and click fire
        if (touchHandledRef.current && Date.now() - touchStartTimeRef.current < 300) {
          e.preventDefault();
          e.stopPropagation();
          touchHandledRef.current = false;
          return;
        }
        
        // Desktop click handler (when no touch occurred)
        const target = e.target as HTMLElement;
        // Only toggle if clicking the toolbar itself, not content, buttons, or header
        if (target.closest('.system-toolbar-toggle') && 
            !target.closest('.system-toolbar-content') && 
            !target.closest('button') &&
            !target.closest('.system-toolbar-header')) {
          setIsOpen(prev => !prev);
        }
      }}
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
              className="flex flex-col items-stretch system-toolbar-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Header */}
              <motion.div
                className="system-toolbar-header px-3 pt-3 pb-2 pointer-events-none"
                initial={{ y: -5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.15, delay: 0.05 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: "var(--accent)" }} />
                  <span 
                    className="text-[8px] font-mono tracking-wider uppercase"
                    style={{ color: "rgba(var(--accent-rgb), 0.5)" }}
                  >
                    SYSTEM TOOLBAR
                  </span>
                </div>
                <div 
                  className="h-px"
                  style={{
                    background: "linear-gradient(to right, rgba(var(--accent-rgb), 0.2), transparent)",
                  }}
                />
              </motion.div>

              {/* Buttons Container */}
              <div className="flex flex-col items-stretch gap-2 px-3 pb-2">
                {/* Dashboard Button */}
                {!isDashboard && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      router.push("/dashboard");
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    className="w-full px-2 py-1.5 text-[10px] font-mono tracking-wider uppercase transition-all hover-lock text-center"
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

                {/* Fullscreen Button - only show if supported */}
                {supportsFullscreen && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (needsPWAInstall) {
                        setShowPWAInstallPrompt(true);
                      } else {
                        toggleFullscreen();
                      }
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
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
                    title={
                      needsPWAInstall 
                        ? "INSTALL APP FOR FULLSCREEN" 
                        : isFullscreen 
                          ? "EXIT FULLSCREEN" 
                          : "ENTER FULLSCREEN"
                    }
                  >
                    {isFullscreen || isPWAStandalone ? <IconFullscreenExit /> : <IconFullscreen />}
                  </button>
                )}
              </div>
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

      {/* PWA Install Prompt Modal */}
      <AnimatePresence>
        {showPWAInstallPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setShowPWAInstallPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/90 border rounded-lg p-6 max-w-sm mx-4"
              style={{
                borderColor: "rgba(var(--accent-rgb), 0.4)",
                borderRadius: "var(--r)",
              }}
            >
              <h3 className="text-sm font-mono uppercase tracking-wider mb-4" style={{ color: "var(--accent)" }}>
                INSTALL FOR FULLSCREEN
              </h3>
              <p className="text-xs mb-4" style={{ color: "rgba(var(--accent-rgb), 0.7)" }}>
                iOS Safari doesn't support fullscreen mode. Install this app to your home screen for a fullscreen experience:
              </p>
              <ol className="text-xs mb-4 space-y-2" style={{ color: "rgba(var(--accent-rgb), 0.6)" }}>
                <li>1. Tap the Share button</li>
                <li>2. Select "Add to Home Screen"</li>
                <li>3. Open the app from your home screen</li>
              </ol>
              <button
                onClick={() => setShowPWAInstallPrompt(false)}
                className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider transition-all"
                style={{
                  color: "var(--accent)",
                  border: "1px solid rgba(var(--accent-rgb), 0.4)",
                  borderRadius: "var(--r)",
                  backgroundColor: "rgba(var(--accent-rgb), 0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(var(--accent-rgb), 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(var(--accent-rgb), 0.1)";
                }}
              >
                CLOSE
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

