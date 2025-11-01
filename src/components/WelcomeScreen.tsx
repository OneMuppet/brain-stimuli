"use client";

import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { DecryptText } from "./DecryptText";

export function WelcomeScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="hud-panel corner-hud p-8 md:p-12 text-center"
        >
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="heading-1 mb-6"
            style={{ fontFamily: "var(--font-space-grotesk, sans-serif)" }}
          >
            <DecryptText text="BRAIN STIMULI" speed={40} />
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="console-text mb-8 space-y-4"
          >
            <p 
              className="leading-relaxed"
              style={{ color: "var(--text-primary)", opacity: 0.9 }}
            >
              <DecryptText 
                text="Secure neural interface for capturing, organizing, and syncing your thoughts across devices." 
                speed={25} 
                delay={400}
              />
            </p>
            <p 
              className="text-sm leading-relaxed mt-4"
              style={{ color: "rgba(var(--accent-rgb), 0.7)" }}
            >
              <DecryptText 
                text="Authentication required to access session console." 
                speed={20} 
                delay={800}
              />
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.6 }}
          >
            <button
              onClick={() => signIn("google")}
              className="btn-neon-outline hover-lock px-8 py-4 text-lg font-mono tracking-wider"
              style={{ touchAction: "manipulation" }}
            >
              <DecryptText text="SIGN IN WITH GOOGLE" speed={30} delay={1000} />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

