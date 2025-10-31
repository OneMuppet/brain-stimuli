"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { getLevel } from "@/lib/scoring";
import { listSessions } from "@/lib/db";
import { resetSyncState } from "@/lib/resetSync";

export function SignIn() {
  const { data: session, status } = useSession();
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // For mobile tap state
  const [totalXP, setTotalXP] = useState(0);
  const [level, setLevel] = useState(1);
  const badgeRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchHandledRef = useRef<boolean>(false);
  const [badgeHeight, setBadgeHeight] = useState(28);
  
  // Determine if badge should be expanded (hover on desktop, open state on mobile)
  const isExpanded = isHovered || isOpen;

  // Load user stats
  useEffect(() => {
    if (session) {
      listSessions().then(sessions => {
        const total = sessions.reduce((sum, s) => sum + s.score, 0);
        setTotalXP(total);
        setLevel(getLevel(total));
      });
    }
  }, [session]);

  // Measure badge height when expanded
  useEffect(() => {
    if (isExpanded && badgeRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setBadgeHeight(entry.contentRect.height);
        }
      });
      resizeObserver.observe(badgeRef.current);
      return () => resizeObserver.disconnect();
    }
    if (!isExpanded) {
      setBadgeHeight(28);
    }
  }, [isExpanded]);
  
  // Close on click outside (mobile)
  useEffect(() => {
    if (!isOpen) return;
    
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
  }, [isOpen]);

  if (status === "loading") {
    return (
      <div className="console-text text-xs flex items-center gap-2">
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
        AUTHENTICATING...
      </div>
    );
  }

  if (session) {
    const email = session.user?.email || "";
    const name = session.user?.name || "";
    const firstName = name.split(" ")[0] || "Operator";
    const lastName = name.split(" ").slice(1).join(" ") || "";
    const displayEmail = isExpanded ? email : email.substring(0, 3) + "...";

    return (
      <motion.div 
        ref={containerRef}
        className="relative"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onTouchStart={(e) => {
          touchStartTimeRef.current = Date.now();
          touchHandledRef.current = false;
          // Only toggle if tapping on the badge itself, not content
          const target = e.target as HTMLElement;
          if (target.closest('.profile-badge-toggle') && 
              !target.closest('.profile-badge-content') && 
              !target.closest('button')) {
            // Don't prevent default here - let it propagate normally
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
          // Only toggle if clicking the badge itself, not content or buttons inside
          if (target.closest('.profile-badge-toggle') && 
              !target.closest('.profile-badge-content') && 
              !target.closest('button')) {
            setIsOpen(prev => !prev);
          }
        }}
        initial={false}
      >
        {/* Spacer to maintain layout (matches compact size) */}
        <div style={{ width: "80px", height: "28px" }} />
        
        {/* Security Badge Container (absolutely positioned overlay) */}
        <motion.div 
          ref={badgeRef}
          className="border bg-black/70 backdrop-blur-sm cursor-pointer absolute top-0 right-0 z-50 overflow-hidden profile-badge-toggle"
          style={{ 
            borderRadius: "var(--r)",
            borderColor: "rgba(var(--accent-rgb), 0.3)",
          }}
          animate={{
            width: isExpanded ? "280px" : "80px",
            height: isExpanded ? "auto" : "28px",
          }}
          transition={{
            duration: 0.18,
            ease: [0.2, 0.8, 0.2, 1]
          }}
        >
          
          {/* Clipping container for scanning line */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              overflow: "hidden",
              borderRadius: "var(--r)",
            }}
          >
            {/* Scanning line animation (only when expanded) */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/8 to-transparent"
                  initial={{ y: "-100%" }}
                  animate={{ y: "100%" }}
                  exit={{ y: "100%" }}
                  transition={{
                    duration: 0.6,
                    ease: "linear",
                  }}
                  style={{
                    height: "100%",
                    width: "100%",
                  }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Compact State */}
          <AnimatePresence>
            {!isExpanded && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <div className="absolute inset-0 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                </div>
                <span className="text-[10px] font-mono text-white/90 tracking-wide">
                  {firstName}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded State - Full Profile Badge */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                className="p-4 overflow-hidden profile-badge-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {/* Header with Status */}
                <div className="flex items-start gap-3 mb-3">
                  {/* Profile Image */}
                  <motion.div
                    className="relative w-12 h-12 flex-shrink-0 border bg-black/60 overflow-hidden"
                    style={{ 
                      borderRadius: "var(--r)",
                      borderColor: "rgba(var(--accent-rgb), 0.4)"
                    }}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.15, delay: 0.05 }}
                  >
                    {session.user?.image ? (
                      <img 
                        src={session.user.image} 
                        alt="Profile"
                        className="w-full h-full object-cover"
                        style={{
                          filter: "contrast(1.2) saturate(0.6) hue-rotate(180deg) brightness(0.9)",
                          mixBlendMode: "screen",
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-cyan-400 text-xl font-mono">
                        {firstName[0]}{lastName[0] || ""}
                      </div>
                    )}
                    {/* Scanline over image */}
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/10 via-transparent to-cyan-400/10 pointer-events-none" />
                  </motion.div>

                  {/* Name & Status */}
                  <motion.div
                    className="flex-1 min-w-0"
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.15, delay: 0.08 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                        <div className="absolute inset-0 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
                      </div>
                      <span className="text-[8px] font-mono text-green-400/70 tracking-wider uppercase">
                        Authenticated
                      </span>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                          key={isExpanded ? "decrypted" : "encrypted"}
                        initial={{ opacity: 0, filter: "blur(3px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.12 }}
                      >
                        <div className="text-sm font-mono text-white tracking-wide truncate">
                          {firstName}
                        </div>
                        {lastName && (
                          <div className="text-sm font-mono text-white/80 tracking-wide truncate">
                            {lastName}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>
                </div>

                {/* Divider */}
                <motion.div 
                  className="h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent mb-3"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.15, delay: 0.1 }}
                />

                {/* Email */}
                <motion.div
                  className="mb-3"
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.15, delay: 0.12 }}
                >
                  <div className="text-[8px] font-mono text-cyan-400/50 tracking-wider uppercase mb-0.5">
                    Email
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                          key={isExpanded ? "email-decrypted" : "email-encrypted"}
                      initial={{ opacity: 0, filter: "blur(3px)" }}
                      animate={{ opacity: 1, filter: "blur(0px)" }}
                      transition={{ duration: 0.12 }}
                      className="text-[10px] font-mono text-white/80 tracking-wide truncate"
                    >
                      {email}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Stats Grid */}
                <motion.div
                  className="grid grid-cols-2 gap-2 mb-3"
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.15, delay: 0.14 }}
                >
                  {/* Security Clearance */}
                  <div>
                    <div className="text-[8px] font-mono text-cyan-400/50 tracking-wider uppercase mb-0.5">
                      Clearance
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                            key={`clearance-${isExpanded}`}
                        initial={{ opacity: 0, filter: "blur(3px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.12 }}
                        className="text-[10px] font-mono text-white/90 tracking-wider"
                      >
                        LEVEL-{level}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Total XP */}
                  <div>
                    <div className="text-[8px] font-mono text-cyan-400/50 tracking-wider uppercase mb-0.5">
                      Total XP
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div
                            key={`xp-${isExpanded}`}
                        initial={{ opacity: 0, filter: "blur(3px)" }}
                        animate={{ opacity: 1, filter: "blur(0px)" }}
                        transition={{ duration: 0.12 }}
                        className="text-[10px] font-mono text-cyan-400 tracking-wider"
                      >
                        {totalXP.toLocaleString()}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Reset Sync Button (Emergency) */}
                <motion.button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (
                      confirm(
                        "Reset sync state? This will clear all sync timestamps and force a full sync on next sync."
                      )
                    ) {
                      await resetSyncState();
                      window.location.reload();
                    }
                  }}
                  className="w-full relative px-3 py-1 text-[8px] font-mono tracking-wider uppercase text-cyan-400/40 hover:text-cyan-400/60 transition-colors text-center mb-2"
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.15, delay: 0.16 }}
                  style={{ touchAction: "manipulation" }}
                  title="Reset sync state (emergency only)"
                >
                  <span className="relative z-10">[RESET SYNC]</span>
                </motion.button>

                {/* Disconnect Button */}
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    signOut();
                  }}
                  className="w-full relative px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase text-red-400/80 hover:text-red-400 transition-colors text-center"
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.15, delay: 0.18 }}
                  style={{ touchAction: "manipulation" }}
                >
                  <span className="relative z-10">Disconnect</span>
                  <div
                    className="absolute inset-0 border border-red-400/20 hover:border-red-400/40 hover:bg-red-400/5 transition-all"
                    style={{ borderRadius: "var(--r)" }}
                  />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Corner reticles - positioned outside badge to track its edges */}
        {/* Top Left */}
        <motion.div 
          className="border-l border-t border-cyan-400/40 pointer-events-none z-[60]"
          style={{
            position: "absolute",
            top: "-3px",
          }}
          animate={{
            right: isExpanded ? "280px" : "80px",
            width: isExpanded ? "8px" : "4px",
            height: isExpanded ? "8px" : "4px",
            opacity: isExpanded ? 1 : 0.4,
            marginRight: "-3px",
          }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        />
        {/* Top Right */}
        <motion.div 
          className="border-r border-t border-cyan-400/40 pointer-events-none z-[60]"
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
          }}
          animate={{
            width: isExpanded ? "8px" : "4px",
            height: isExpanded ? "8px" : "4px",
            opacity: isExpanded ? 1 : 0.4,
          }}
          transition={{ duration: 0.18 }}
        />
        {/* Bottom Left - positioned to match badge bottom */}
        <motion.div 
          className="border-l border-b border-cyan-400/40 pointer-events-none z-[60]"
          style={{
            position: "absolute",
          }}
          animate={{
            top: `${badgeHeight - 3}px`,
            right: isExpanded ? "280px" : "80px",
            width: isExpanded ? "8px" : "4px",
            height: isExpanded ? "8px" : "4px",
            opacity: isExpanded ? 1 : 0.4,
            marginRight: "-3px",
          }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        />
        {/* Bottom Right - positioned to match badge bottom */}
        <motion.div 
          className="border-r border-b border-cyan-400/40 pointer-events-none z-[60]"
          style={{
            position: "absolute",
            right: "-3px",
          }}
          animate={{
            top: `${badgeHeight - 3}px`,
            width: isExpanded ? "8px" : "4px",
            height: isExpanded ? "8px" : "4px",
            opacity: isExpanded ? 1 : 0.4,
          }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </motion.div>
    );
  }

  return (
    <button
      onClick={() => signIn("google")}
      className="btn-neon-outline hover-lock px-4 py-2"
      style={{ touchAction: "manipulation" }}
    >
      SIGN IN WITH GOOGLE
    </button>
  );
}

