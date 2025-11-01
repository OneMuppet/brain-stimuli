"use client";

/**
 * Star badge - 5-pointed star outline
 */
export function BadgeStar() {
  const points: string[] = [];
  const centerX = 32;
  const centerY = 32;
  const outerRadius = 24;
  const innerRadius = 10;
  
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  
  return (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <polygon
        points={points.join(" ")}
        stroke="var(--accent)"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

