"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/themeStorage";

/**
 * Theme context type
 */
interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  themeClasses: Record<Theme, string>;
  themeDisplayNames: Record<Theme, string>;
}

/**
 * Theme context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Theme class mappings
 */
const THEME_CLASSES: Record<Theme, string> = {
  cyan: 'theme-cyan',
  matrix: 'theme-matrix',
  ares: 'theme-ares',
};

/**
 * Theme display names for UI
 */
const THEME_DISPLAY_NAMES: Record<Theme, string> = {
  cyan: 'CYAN',
  matrix: 'MATRIX',
  ares: 'ARES',
};

/**
 * Theme provider component
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(() => {
    // Initialize from stored preference
    return getStoredTheme();
  });

  // Track if we've applied theme on mount (prevents flash)
  const hasAppliedThemeRef = useRef(false);

  // Apply theme to <html> element
  useEffect(() => {
    if (hasAppliedThemeRef.current) {
      // Remove previous theme classes
      Object.values(THEME_CLASSES).forEach((className) => {
        document.documentElement.classList.remove(className);
      });
    }

    // Add current theme class
    const themeClass = THEME_CLASSES[currentTheme];
    document.documentElement.classList.add(themeClass);

    // Mark as applied
    hasAppliedThemeRef.current = true;

    // Persist theme preference
    setStoredTheme(currentTheme);
  }, [currentTheme]);

  // Apply theme immediately on mount (before first paint)
  useEffect(() => {
    const initialTheme = getStoredTheme();
    const themeClass = THEME_CLASSES[initialTheme];
    document.documentElement.classList.add(themeClass);
    hasAppliedThemeRef.current = true;
  }, []);

  /**
   * Set theme and persist preference
   */
  const setTheme = (theme: Theme) => {
    setCurrentTheme(theme);
  };

  const value: ThemeContextType = {
    currentTheme,
    setTheme,
    themeClasses: THEME_CLASSES,
    themeDisplayNames: THEME_DISPLAY_NAMES,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to use theme context
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Export types and constants for use in other files
export type { Theme };
export { THEME_CLASSES, THEME_DISPLAY_NAMES };

