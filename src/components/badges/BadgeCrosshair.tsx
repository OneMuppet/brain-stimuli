"use client";

/**
 * Crosshair badge - target/crosshair outline
 */
export function BadgeCrosshair() {
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle
        cx="32"
        cy="32"
        r="20"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
      <circle
        cx="32"
        cy="32"
        r="12"
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
      <line
        x1="32"
        y1="8"
        x2="32"
        y2="20"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <line
        x1="32"
        y1="44"
        x2="32"
        y2="56"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <line
        x1="8"
        y1="32"
        x2="20"
        y2="32"
        stroke="var(--accent)"
        strokeWidth="2"
      />
      <line
        x1="44"
        y1="32"
        x2="56"
        y2="32"
        stroke="var(--accent)"
        strokeWidth="2"
      />
    </svg>
  );
}

