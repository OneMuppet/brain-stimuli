"use client";

import { useEffect, useState } from "react";

// Helper to detect if device is mobile/touch
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

export function ReticleCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isLocked, setIsLocked] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice(isMobile());
  }, []);

  useEffect(() => {
    if (isTouchDevice) return; // Don't set up cursor on mobile

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
  }, [isTouchDevice]);

  // Don't render cursor on mobile
  if (isTouchDevice) {
    return null;
  }

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

