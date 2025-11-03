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

    // Timeline: 0-4200ms logo animation → 4200-4800ms init → 4800-5400ms secure → 5400-5800ms fade
    // Animated logo: ring (1.6s) + morse code sequence (~2.6s from ring end) = ~4.2s total
    const logoTimer = setTimeout(() => setStage("init"), 4200);
    const initTimer = setTimeout(() => setStage("secure"), 4800);
    const secureTimer = setTimeout(() => setStage("done"), 5400);
    const doneTimer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("system-booted", "true");
    }, 5800);

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
        {/* Animated logo - plays full animation sequence */}
        {stage === "logo" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="w-64 h-64 max-w-[80vw] max-h-[80vw]"
          >
            <img
              src="/logo-animated.svg"
              alt="AURA-NX0"
              className="w-full h-full"
              style={{
                filter: "drop-shadow(0 0 20px rgba(0, 245, 255, 0.3))",
              }}
            />
          </motion.div>
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

