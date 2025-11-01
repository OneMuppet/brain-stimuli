"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { createSession } from "@/lib/db";
import { WelcomeScreen } from "@/components/WelcomeScreen";

export default function NewSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

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

  if (!session) {
    return <WelcomeScreen />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const session = await createSession(title.trim());
      router.push(`/sessions/${session.id}`);
    } catch (error) {
      alert("Failed to create session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="hud-panel corner-hud max-w-md w-full"
      >
        <h1
          className="heading-1 mb-6"
          style={{ 
            fontFamily: "var(--font-space-grotesk, sans-serif)",
            color: "var(--text-primary)",
          }}
        >
          New Session
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="title" className="block console-text mb-2">
              Session Identifier
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter session title..."
              autoFocus
              className="w-full px-4 py-3 bg-black/40 focus:outline-none transition-all mono text-sm"
              style={{
                borderRadius: "var(--r)",
                border: "1px solid rgba(var(--accent-rgb), 0.3)",
                boxShadow: "inset 0 0 8px rgba(var(--accent-rgb), 0.08)",
                color: "var(--text-primary)",
              }}
            />
          </div>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 btn-neon-outline hover-lock"
              style={{ touchAction: "manipulation" }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!title.trim() || loading}
              className="flex-1 btn-neon-outline hover-lock disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ touchAction: "manipulation" }}
            >
              {loading ? "INITIALIZING..." : "CREATE"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
