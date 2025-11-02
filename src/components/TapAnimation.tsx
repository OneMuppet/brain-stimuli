"use client";

import { useEffect, useState } from "react";

interface TapPosition {
  x: number;
  y: number;
  id: number;
}

export function TapAnimation() {
  const [taps, setTaps] = useState<TapPosition[]>([]);

  useEffect(() => {
    const handleTouch = (e: TouchEvent) => {
      // Create tap animations for all touch points
      const newTaps: TapPosition[] = Array.from(e.touches).map((touch, index) => ({
        x: touch.clientX,
        y: touch.clientY,
        id: Date.now() + index,
      }));

      if (newTaps.length > 0) {
        setTaps(newTaps);

        // Remove taps after animation completes
        setTimeout(() => {
          setTaps([]);
        }, 400);
      }
    };

    document.addEventListener('touchstart', handleTouch, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouch);
    };
  }, []);

  if (taps.length === 0) return null;

  return (
    <>
      {taps.map((tap) => (
        <div
          key={tap.id}
          className="tap-animation"
          style={{
            position: 'fixed',
            left: `${tap.x}px`,
            top: `${tap.y}px`,
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 10000,
          }}
        />
      ))}
    </>
  );
}

