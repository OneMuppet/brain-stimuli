"use client";

/**
 * Star icon - outline style
 */
export function IconStar() {
  const points: string[] = [];
  const centerX = 12;
  const centerY = 12;
  const outerRadius = 10;
  const innerRadius = 4;
  
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" fill="none">
      <polygon
        points={points.join(" ")}
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

