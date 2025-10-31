"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function BootSequence() {
  const [stage, setStage] = useState<"logo" | "init" | "secure" | "done">("logo");
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Check if already seen this session
    const hasBooted = sessionStorage.getItem("system-booted");
    if (hasBooted) {
      setVisible(false);
      return;
    }

    // Timeline: 0-300ms logo → 300-900ms init → 900-1200ms secure → 1200-1400ms fade
    const logoTimer = setTimeout(() => setStage("init"), 300);
    const initTimer = setTimeout(() => setStage("secure"), 900);
    const secureTimer = setTimeout(() => setStage("done"), 1200);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("system-booted", "true");
    }, 1400);

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(initTimer);
      clearTimeout(secureTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  const handleSkip = () => {
    setVisible(false);
    sessionStorage.setItem("system-booted", "true");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleSkip();
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={handleSkip}
        className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center cursor-pointer"
      >
        {/* Logo outline draw */}
        {stage === "logo" && (
          <motion.svg
            width="60"
            height="60"
            viewBox="0 0 60 60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="stroke-[var(--accent)]"
          >
            <motion.circle
              cx="30"
              cy="30"
              r="25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            <motion.path
              d="M 20 25 L 30 35 L 40 25"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
            />
          </motion.svg>
        )}

        {/* Initializing text */}
        {(stage === "init" || stage === "secure" || stage === "done") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="text-center"
          >
            <p className="font-mono text-xs tracking-wider text-[var(--accent)] opacity-70">
              {stage === "init" && "Initializing Neural Systems..."}
              {stage === "secure" && "Secure Channel Established."}
              {stage === "done" && "System Online."}
            </p>
          </motion.div>
        )}

        {/* Skip hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.3 }}
          className="absolute bottom-8 text-[10px] font-mono text-white/40"
        >
          Press ESC or click to skip
        </motion.p>
      </motion.div>
    </AnimatePresence>
  );
}

