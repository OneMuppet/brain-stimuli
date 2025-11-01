"use client";

/**
 * Triangle badge - equilateral triangle outline
 */
export function BadgeTriangle() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <polygon
        points="32,14 52,46 12,46"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

