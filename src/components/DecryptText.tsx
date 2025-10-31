"use client";

import { useEffect, useState } from "react";

interface DecryptTextProps {
  text: string;
  className?: string;
  speed?: number; // milliseconds per character
  delay?: number; // initial delay before starting
}

const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";

export function DecryptText({ text, className = "", speed = 30, delay = 0 }: DecryptTextProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDecrypting, setIsDecrypting] = useState(false);

  useEffect(() => {
    // Initial delay
    const startTimer = setTimeout(() => {
      setIsDecrypting(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!isDecrypting) return;

    if (currentIndex < text.length) {
      const interval = setInterval(() => {
        // Generate random characters for positions we haven't decrypted yet
        const scrambled = text
          .split("")
          .map((char, index) => {
            if (index < currentIndex) {
              // Already decrypted
              return text[index];
            } else if (index === currentIndex) {
              // Currently decrypting - show correct character
              return char;
            } else if (char === " ") {
              // Keep spaces as spaces
              return " ";
            } else {
              // Show random character
              return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
            }
          })
          .join("");

        setDisplayText(scrambled);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearInterval(interval);
    } else {
      // Finished decrypting
      setDisplayText(text);
    }
  }, [currentIndex, text, speed, isDecrypting]);

  return <span className={className}>{displayText || text}</span>;
}

