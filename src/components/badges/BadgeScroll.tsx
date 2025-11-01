"use client";

/**
 * Scroll badge - curled document outline
 */
export function BadgeScroll() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path
        d="M16 16 Q16 12 20 12 L44 12 Q48 12 48 16 L48 40 Q48 44 44 44 Q40 44 40 40 Q40 36 36 36 L28 36 Q24 36 24 40 Q24 44 20 44 Q16 44 16 40 Z"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M20 44 Q20 48 24 48 Q28 48 32 48 Q36 48 40 48 Q44 48 44 44"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

