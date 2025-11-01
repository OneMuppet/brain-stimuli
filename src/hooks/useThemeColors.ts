import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Hook to get theme colors cached for use in animation loops
 * Only reads CSS variables when theme changes (performance critical)
 * Returns state values so they trigger re-renders when theme changes
 */
export function useThemeColors() {
  const { currentTheme } = useTheme();
  const [accentRGB, setAccentRGB] = useState("0, 245, 255");
  const [accentColor, setAccentColor] = useState("#00F5FF");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only read CSS variables when theme changes (not every frame)
    if (typeof window === 'undefined' || !isClient) {
      return;
    }

    // Use requestAnimationFrame to ensure CSS has been applied before reading
    const updateColors = () => {
      const root = document.documentElement;
      const rgb = getComputedStyle(root)
        .getPropertyValue('--accent-rgb')
        .trim();
      const color = getComputedStyle(root)
        .getPropertyValue('--accent')
        .trim();

      if (rgb) setAccentRGB(rgb);
      if (color) setAccentColor(color);
    };

    // Small delay to ensure DOM has updated
    requestAnimationFrame(() => {
      requestAnimationFrame(updateColors);
    });
  }, [currentTheme, isClient]);

  return {
    accentRGB,
    accentColor,
  };
}

