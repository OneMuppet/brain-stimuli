"use client";

/**
 * Wings badge - aviation wings outline
 */
export function BadgeWings() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <path
        d="M32 16 L24 24 Q20 28 24 36 Q28 44 32 48 Q36 44 40 36 Q44 28 40 24 Z"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 32 Q18 28 24 28 Q28 28 32 32"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M52 32 Q46 28 40 28 Q36 28 32 32"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

