"use client";

import { useEffect, useState } from "react";

export function ReticleCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    let rafId: number;
    
    const handleMouseMove = (e: MouseEvent) => {
      rafId = requestAnimationFrame(() => {
        setPosition({ x: e.clientX, y: e.clientY });
        
        // Check if hovering over interactive element
        const target = e.target as HTMLElement;
        const isInteractive = target.tagName === "BUTTON" || 
                             target.tagName === "A" || 
                             target.closest("button") || 
                             target.closest("a") ||
                             target.classList.contains("hover-lock");
        setIsLocked(!!isInteractive);
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className={`cursor-reticle ${isLocked ? "locked" : ""}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}

