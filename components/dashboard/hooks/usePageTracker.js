// hooks/usePageTracker.js
// ✅ Track which tile/page user opens, how long they stay

"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Tracks page/tile visits — auto-logs open + close + duration
 *
 * Usage: usePageTracker(openKey, session)
 * Drop into DashboardShell — that's it!
 */
export function usePageTracker(openKey, session) {
  const openTimeRef = useRef(null);
  const lastKeyRef = useRef(null);

  const flush = useCallback(() => {
    if (!lastKeyRef.current || !openTimeRef.current) return;

    const duration = Math.floor((Date.now() - openTimeRef.current) / 1000);
    const key = lastKeyRef.current;

    // Fire & forget — non-blocking
    try {
      navigator.sendBeacon(
        "/api/activity/track",
        JSON.stringify({
          action: "page_close",
          category: "PAGE",
          description: `Closed "${key}" after ${duration}s`,
          meta: { page: key, duration, closedAt: new Date().toISOString() },
        })
      );
    } catch {
      // sendBeacon not supported, use fetch
      fetch("/api/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "page_close",
          category: "PAGE",
          description: `Closed "${key}" after ${duration}s`,
          meta: { page: key, duration },
        }),
        keepalive: true,
      }).catch(() => {});
    }

    openTimeRef.current = null;
    lastKeyRef.current = null;
  }, []);

  useEffect(() => {
    // Previous page close
    if (lastKeyRef.current && lastKeyRef.current !== openKey) {
      flush();
    }

    // New page open
    if (openKey) {
      openTimeRef.current = Date.now();
      lastKeyRef.current = openKey;

      // Log page open
      fetch("/api/activity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "page_visit",
          category: "PAGE",
          description: `Opened "${openKey}"`,
          meta: { page: openKey, openedAt: new Date().toISOString() },
        }),
        credentials: "include",
      }).catch(() => {});
    } else {
      // Modal closed
      flush();
    }
  }, [openKey, flush]);

  // Cleanup on unmount / tab close
  useEffect(() => {
    const handleBeforeUnload = () => flush();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") flush();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      flush();
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flush]);
}
