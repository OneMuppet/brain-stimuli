"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchResult } from "./SearchResult";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Theme-aware search modal - responsive (full-screen on mobile, modal on desktop)
 */
export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { query, setQuery, results, isSearching } = useSearch();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        const result = results[selectedIndex];
        router.push(`/sessions/${result.sessionId}`);
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleResultClick = (sessionId: string) => {
    router.push(`/sessions/${sessionId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 md:p-8"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-[var(--bg-base)] border"
          style={{
            borderColor: "rgba(var(--accent-rgb), 0.3)",
            borderRadius: "var(--r-lg)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search Input */}
          <div className="p-4 border-b" style={{ borderColor: "rgba(var(--accent-rgb), 0.2)" }}>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-transparent font-mono text-lg"
              style={{
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            {isSearching && (
              <div 
                className="text-xs mono mt-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Searching...
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {results.length > 0 ? (
              results.map((result, index) => (
                <div
                  key={`${result.sessionId}:${result.noteId}`}
                  onClick={() => handleResultClick(result.sessionId)}
                  style={{
                    outline: selectedIndex === index ? `2px solid var(--accent)` : "none",
                    outlineOffset: "2px",
                  }}
                >
                  <SearchResult
                    result={result}
                    query={query}
                    onClick={() => handleResultClick(result.sessionId)}
                  />
                </div>
              ))
            ) : query.trim() && !isSearching ? (
              <div 
                className="text-sm console-text text-center py-8"
                style={{ color: "var(--text-secondary)" }}
              >
                No results found
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div 
            className="p-3 border-t text-xs mono text-center"
            style={{ 
              borderColor: "rgba(var(--accent-rgb), 0.2)",
              color: "var(--text-secondary)",
            }}
          >
            Press <kbd style={{ 
              padding: "2px 6px",
              backgroundColor: "rgba(var(--accent-rgb), 0.1)",
              borderRadius: "4px",
              color: "var(--accent)",
            }}>ESC</kbd> to close • <kbd style={{ 
              padding: "2px 6px",
              backgroundColor: "rgba(var(--accent-rgb), 0.1)",
              borderRadius: "4px",
              color: "var(--accent)",
            }}>↑↓</kbd> to navigate • <kbd style={{ 
              padding: "2px 6px",
              backgroundColor: "rgba(var(--accent-rgb), 0.1)",
              borderRadius: "4px",
              color: "var(--accent)",
            }}>ENTER</kbd> to select
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

