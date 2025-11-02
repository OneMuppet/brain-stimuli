"use client";

import { useState, useEffect, useCallback } from "react";

// Check if app is running as PWA (standalone mode)
const isPWA = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

// Check if device is iOS
const isIOS = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPWAStandalone, setIsPWAStandalone] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsPWAStandalone(isPWA());
    setIsIOSDevice(isIOS());
  }, []);

  useEffect(() => {
    const handleChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    document.addEventListener("mozfullscreenchange", handleChange);
    document.addEventListener("MSFullscreenChange", handleChange);

    // Check initial state
    setIsFullscreen(!!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    ));

    // If in PWA standalone mode, consider it fullscreen
    if (isPWAStandalone) {
      setIsFullscreen(true);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
      document.removeEventListener("mozfullscreenchange", handleChange);
      document.removeEventListener("MSFullscreenChange", handleChange);
    };
  }, [isPWAStandalone]);

  const enterFullscreen = useCallback(async (): Promise<void> => {
    try {
      // On iOS, fullscreen API doesn't work - user needs to install as PWA
      // The needsPWAInstall flag will be checked separately in components
      if (isIOSDevice && !isPWAStandalone) {
        return; // Exit early - components should check needsPWAInstall flag
      }

      const element = document.documentElement;
      if (element.requestFullscreen) {
        await element.requestFullscreen();
      } else if ((element as any).webkitRequestFullscreen) {
        await (element as any).webkitRequestFullscreen();
      } else if ((element as any).mozRequestFullScreen) {
        await (element as any).mozRequestFullScreen();
      } else if ((element as any).msRequestFullscreen) {
        await (element as any).msRequestFullscreen();
      }
    } catch (error) {
      // Silent error handling - fullscreen may fail (e.g., not user-initiated)
    }
  }, [isIOSDevice, isPWAStandalone]);

  const exitFullscreen = useCallback(async () => {
    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      // Silent error handling
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (isFullscreen) {
      await exitFullscreen();
    } else {
      await enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  // Check if fullscreen API is supported
  const supportsFullscreen = useCallback(() => {
    if (typeof window === 'undefined') return false;
    const element = document.documentElement;
    return !!(
      element.requestFullscreen ||
      (element as any).webkitRequestFullscreen ||
      (element as any).mozRequestFullScreen ||
      (element as any).msRequestFullscreen ||
      isPWAStandalone // PWA standalone mode counts as fullscreen support
    );
  }, [isPWAStandalone]);

  const [hasFullscreenSupport, setHasFullscreenSupport] = useState(false);

  useEffect(() => {
    setHasFullscreenSupport(supportsFullscreen());
  }, [supportsFullscreen]);

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isPWAStandalone,
    isIOSDevice,
    needsPWAInstall: isIOSDevice && !isPWAStandalone,
    supportsFullscreen: hasFullscreenSupport,
  };
}

