"use client";

import { useEffect, useRef } from "react";
import { useThemeColors } from "@/hooks/useThemeColors";

const CHARACTERS = "01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEFGHIJKLMNOPQRSTUVWXYZ";
const COLUMN_WIDTH = 25;
const RAIN_SPEED = 0.8;
const RAIN_OPACITY = 0.08; // More subtle

interface Raindrop {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
}

interface CircuitTrace {
  path: { x: number; y: number }[];
  pulsePosition: number;
  speed: number;
  opacity: number;
}

interface CircuitNode {
  x: number;
  y: number;
  active: boolean;
  pulseTime: number;
}

export function DataStreamBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raindropsRef = useRef<Raindrop[]>([]);
  const circuitTracesRef = useRef<CircuitTrace[]>([]);
  const circuitNodesRef = useRef<CircuitNode[]>([]);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const { accentRGB } = useThemeColors();
  // Use ref to always access latest accentRGB in animation loop
  const accentRGBRef = useRef(accentRGB);
  
  // Keep ref in sync with state
  useEffect(() => {
    accentRGBRef.current = accentRGB;
  }, [accentRGB]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate circuit board traces and nodes aligned to 60x60 grid
    const generateCircuits = () => {
      const GRID_SIZE = 60;
      const traces: CircuitTrace[] = [];
      const nodes: CircuitNode[] = [];
      const numTraces = 3 + Math.floor(Math.random() * 4); // 3-6 traces

      // Snap to grid helper
      const snapToGrid = (value: number) => Math.round(value / GRID_SIZE) * GRID_SIZE;

      for (let i = 0; i < numTraces; i++) {
        // Random starting position on grid
        const startX = snapToGrid(Math.random() * canvas.width);
        const startY = snapToGrid(Math.random() * canvas.height);
        
        const path: { x: number; y: number }[] = [{ x: startX, y: startY }];
        
        // Circuit pathfinding: make intelligent turns
        const segments = 5 + Math.floor(Math.random() * 8); // 5-12 segments
        let currentX = startX;
        let currentY = startY;
        let lastDirection: 'horizontal' | 'vertical' | null = null;
        
        // Pick a general target direction (creates more purposeful circuits)
        const targetX = snapToGrid(Math.random() * canvas.width);
        const targetY = snapToGrid(Math.random() * canvas.height);
        
        for (let j = 0; j < segments; j++) {
          // Prefer moving towards target, but allow some randomness
          const towardsTarget = Math.random() < 0.6; // 60% chance to move towards target
          let moveHorizontal: boolean;
          
          if (towardsTarget) {
            const deltaX = Math.abs(targetX - currentX);
            const deltaY = Math.abs(targetY - currentY);
            moveHorizontal = deltaX > deltaY;
          } else {
            moveHorizontal = Math.random() > 0.5;
          }
          
          // Alternate direction if same as last (prevent doubling back)
          if (lastDirection === 'horizontal' && moveHorizontal) {
            moveHorizontal = false;
          } else if (lastDirection === 'vertical' && !moveHorizontal) {
            moveHorizontal = true;
          }
          
          if (moveHorizontal) {
            // Move 2-8 grid cells horizontally
            const direction = currentX < targetX ? 1 : -1;
            const steps = (2 + Math.floor(Math.random() * 7)) * GRID_SIZE;
            currentX += direction * steps;
            currentX = Math.max(GRID_SIZE, Math.min(canvas.width - GRID_SIZE, snapToGrid(currentX)));
            lastDirection = 'horizontal';
          } else {
            // Move 2-8 grid cells vertically
            const direction = currentY < targetY ? 1 : -1;
            const steps = (2 + Math.floor(Math.random() * 7)) * GRID_SIZE;
            currentY += direction * steps;
            currentY = Math.max(GRID_SIZE, Math.min(canvas.height - GRID_SIZE, snapToGrid(currentY)));
            lastDirection = 'vertical';
          }
          
          path.push({ x: currentX, y: currentY });
          
          // Add node at this junction
          nodes.push({
            x: currentX,
            y: currentY,
            active: false,
            pulseTime: 0,
          });
        }

        traces.push({
          path,
          pulsePosition: Math.random(),
          speed: 0.0008 + Math.random() * 0.0015,
          opacity: 0.12 + Math.random() * 0.15,
        });
      }

      circuitTracesRef.current = traces;
      circuitNodesRef.current = nodes;
    };

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Initialize raindrops (fewer, more sparse)
      const columns = Math.floor(canvas.width / COLUMN_WIDTH);
      raindropsRef.current = Array.from({ length: columns }, (_, i) => ({
        x: i * COLUMN_WIDTH + (Math.random() - 0.5) * 10, // Add slight x variance
        y: Math.random() * canvas.height * -2, // More spread out start
        speed: 0.4 + Math.random() * 1.0,
        chars: Array.from({ length: 10 + Math.floor(Math.random() * 8) }, () => 
          CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
        ),
        opacity: 0.4 + Math.random() * 0.5,
      }));

      // Generate circuits
      generateCircuits();
    };

    resize();
    window.addEventListener("resize", resize);

    // Animation loop
    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 12, 0.1)"; // Subtle trail fade
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw circuit board traces (static lines)
      const currentAccentRGB = accentRGBRef.current; // Get latest value
      circuitTracesRef.current.forEach((trace) => {
        ctx.strokeStyle = `rgba(${currentAccentRGB}, ${trace.opacity * 0.04})`; // Even more subtle
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        
        for (let i = 0; i < trace.path.length; i++) {
          const point = trace.path[i];
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();

        // Draw pulsing light traveling along the trace
        trace.pulsePosition += trace.speed;
        if (trace.pulsePosition > 1) {
          trace.pulsePosition = 0;
        }

        // Calculate position along path
        const totalSegments = trace.path.length - 1;
        const currentSegment = Math.floor(trace.pulsePosition * totalSegments);
        const segmentProgress = (trace.pulsePosition * totalSegments) - currentSegment;

        if (currentSegment < totalSegments) {
          const start = trace.path[currentSegment];
          const end = trace.path[currentSegment + 1];
          const pulseX = start.x + (end.x - start.x) * segmentProgress;
          const pulseY = start.y + (end.y - start.y) * segmentProgress;

          // Draw glowing pulse (very subtle)
          const gradient = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, 5);
          gradient.addColorStop(0, `rgba(${currentAccentRGB}, ${trace.opacity * 0.35})`);
          gradient.addColorStop(0.5, `rgba(${currentAccentRGB}, ${trace.opacity * 0.12})`);
          gradient.addColorStop(1, `rgba(${currentAccentRGB}, 0)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(pulseX - 5, pulseY - 5, 10, 10);

          // Activate nearby nodes
          circuitNodesRef.current.forEach((node) => {
            const dist = Math.sqrt((node.x - pulseX) ** 2 + (node.y - pulseY) ** 2);
            if (dist < 15) {
              node.active = true;
              node.pulseTime = 30;
            }
          });
        }
      });

      // Draw circuit nodes (connection points) - more subtle
      circuitNodesRef.current.forEach((node) => {
        if (node.pulseTime > 0) {
          node.pulseTime -= 1;
          const alpha = node.pulseTime / 30;
          
          // Node glow (smaller and more subtle)
          const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 4);
          gradient.addColorStop(0, `rgba(${currentAccentRGB}, ${alpha * 0.6})`);
          gradient.addColorStop(1, `rgba(${currentAccentRGB}, 0)`);
          ctx.fillStyle = gradient;
          ctx.fillRect(node.x - 4, node.y - 4, 8, 8);

          // Node center (smaller)
          ctx.fillStyle = `rgba(${currentAccentRGB}, ${alpha * 0.7})`;
          ctx.fillRect(node.x - 1, node.y - 1, 2, 2);
        } else {
          node.active = false;
        }
      });

      // Draw digital rain
      ctx.font = "12px monospace";
      raindropsRef.current.forEach((drop) => {
        drop.chars.forEach((char, i) => {
          const y = drop.y + i * 15;
          if (y > 0 && y < canvas.height) {
            const alpha = drop.opacity * (1 - i / drop.chars.length);
            ctx.fillStyle = `rgba(${currentAccentRGB}, ${alpha * RAIN_OPACITY})`;
            ctx.fillText(char, drop.x, y);
          }
        });

        // Move raindrop
        drop.y += drop.speed * RAIN_SPEED;

        // Reset if off screen
        if (drop.y - drop.chars.length * 15 > canvas.height) {
          drop.y = Math.random() * -300 - 100; // More varied respawn time
          drop.x = (drop.x % COLUMN_WIDTH) + Math.floor(drop.x / COLUMN_WIDTH) * COLUMN_WIDTH + (Math.random() - 0.5) * 10;
          drop.speed = 0.4 + Math.random() * 1.0;
          drop.chars = Array.from({ length: 10 + Math.floor(Math.random() * 8) }, () => 
            CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)]
          );
          drop.opacity = 0.4 + Math.random() * 0.5;
        }

        // Randomly change characters
        if (Math.random() < 0.05) {
          const idx = Math.floor(Math.random() * drop.chars.length);
          drop.chars[idx] = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
        }
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [accentRGB]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.8 }}
    />
  );
}

