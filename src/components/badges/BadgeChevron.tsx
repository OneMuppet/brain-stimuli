"use client";

/**
 * Chevron badge - upside-down V shape (rank insignia style)
 */
export function BadgeChevron() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <polygon
        points="32,12 52,40 32,52 12,40"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

