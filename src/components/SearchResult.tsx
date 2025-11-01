"use client";

import { motion } from "framer-motion";
import type { SearchResult as SearchResultType } from "@/lib/searchIndex";

interface SearchResultProps {
  result: SearchResultType;
  query: string;
  onClick: () => void;
}

/**
 * Individual search result item
 */
export function SearchResult({ result, query, onClick }: SearchResultProps) {
  // Highlight matches in text
  const highlightText = (text: string, query: string) => {
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, index) => {
          if (part.toLowerCase() === query.toLowerCase()) {
            return (
              <mark
                key={index}
                style={{
                  backgroundColor: "rgba(var(--accent-rgb), 0.3)",
                  color: "var(--accent)",
                  padding: "0 2px",
                }}
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="hud-panel p-4 cursor-pointer hover:border-accent transition-colors"
      onClick={onClick}
      style={{
        borderColor: "rgba(var(--accent-rgb), 0.2)",
        borderWidth: "1px",
        borderStyle: "solid",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.4)";
        e.currentTarget.style.backgroundColor = "rgba(var(--accent-rgb), 0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(var(--accent-rgb), 0.2)";
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <div 
        className="text-sm mono font-semibold mb-2"
        style={{ color: "var(--text-heading)" }}
      >
        {result.sessionTitle.toUpperCase()}
      </div>
      <div 
        className="text-xs console-text mb-2 line-clamp-2"
        style={{ color: "var(--text-primary)" }}
      >
        {highlightText(result.matchedText, query)}
      </div>
      <div className="flex items-center justify-between">
        <div 
          className="text-[10px] mono"
          style={{ color: "var(--text-secondary-accent)" }}
        >
          {result.matchCount} match{result.matchCount !== 1 ? "es" : ""}
        </div>
        <div 
          className="text-[10px] mono"
          style={{ color: "var(--text-secondary)" }}
        >
          {new Date(result.sessionDate).toLocaleDateString()}
        </div>
      </div>
    </motion.div>
  );
}

