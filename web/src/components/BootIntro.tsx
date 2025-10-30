"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function BootIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const seen = sessionStorage.getItem("bootShown");
    if (!seen) {
      setShow(true);
      const t = setTimeout(() => {
        setShow(false);
        sessionStorage.setItem("bootShown", "1");
      }, 1500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] bg-black/95 scanlines"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-neon-grid" />
      <div className="relative h-full w-full flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="text-2xl md:text-3xl font-extrabold mono text-white/90 mb-4"
        >
          Console Initializing
        </motion.div>
        <motion.div className="w-[260px] h-2 bg-white/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-300 to-lime-300"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-xs mono text-white/60"
        >
          Access Granted — Loading HUD
        </motion.div>
      </div>
    </motion.div>
  );
}
