/**
 * Theme storage utilities
 * Handles persistence of theme preference in localStorage
 */

export type Theme = 'cyan' | 'matrix' | 'ares';

const THEME_STORAGE_KEY = 'brain-stimuli-theme';
const DEFAULT_THEME: Theme = 'cyan';

/**
 * Get stored theme preference from localStorage
 * Returns default theme if no preference exists or on error
 */
export function getStoredTheme(): Theme {
  // Handle SSR - no localStorage in server environment
  if (typeof window === 'undefined') {
    return DEFAULT_THEME;
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_THEME;
    }

    // Validate stored theme
    const validThemes: Theme[] = ['cyan', 'matrix', 'ares'];
    if (validThemes.includes(stored as Theme)) {
      return stored as Theme;
    }

    // Invalid theme stored, return default
    return DEFAULT_THEME;
  } catch (error) {
    // localStorage not available (private browsing, etc.)
    // Return default theme
    return DEFAULT_THEME;
  }
}

/**
 * Store theme preference in localStorage
 */
export function setStoredTheme(theme: Theme): void {
  // Handle SSR - no localStorage in server environment
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // localStorage not available (private browsing, etc.)
    // Silently fail - theme will still work for session
  }
}

