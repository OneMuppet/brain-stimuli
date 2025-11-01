/**
 * Test setup file
 * This file runs before all tests
 */

import "@testing-library/jest-dom";

// Mock window.matchMedia for tests
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock window.requestIdleCallback if not available
if (typeof window.requestIdleCallback === "undefined") {
  (window as typeof window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback = (callback: IdleRequestCallback) => {
    const start = Date.now();
    return window.setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  };
}

if (typeof window.cancelIdleCallback === "undefined") {
  (window as typeof window & { cancelIdleCallback: typeof cancelIdleCallback }).cancelIdleCallback = (id: number) => {
    window.clearTimeout(id);
  };
}

