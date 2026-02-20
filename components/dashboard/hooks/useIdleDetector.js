// hooks/useIdleDetector.js
// ✅ Detect when user is idle (no mouse/keyboard/touch for X seconds)
// Reports idle periods to server

"use client";

import { useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 minutes idle threshold
const REPORT_INTERVAL = 5 * 60 * 1000; // Report every 5 minutes

/**
 * Usage: useIdleDetector(session)
 * Drop into DashboardShell
 */
export function useIdleDetector(session) {
  const lastActivityRef = useRef(Date.now());
  const idleStartRef = useRef(null);
  const totalIdleRef = useRef(0);
  const totalActiveRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const isIdleRef = useRef(false);

  const markActive = useCallback(() => {
    const now = Date.now();

    if (isIdleRef.current && idleStartRef.current) {
      // Was idle, now active — record idle duration
      const idleDuration = now - idleStartRef.current;
      totalIdleRef.current += idleDuration;
      idleStartRef.current = null;
      isIdleRef.current = false;
    }

    lastActivityRef.current = now;
  }, []);

  const checkIdle = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastActivityRef.current;

    if (elapsed >= IDLE_TIMEOUT && !isIdleRef.current) {
      // User went idle
      isIdleRef.current = true;
      idleStartRef.current = now - elapsed; // Idle started when last activity was
    }

    if (!isIdleRef.current) {
      totalActiveRef.current = now - sessionStartRef.current - totalIdleRef.current;
    }
  }, []);

  const reportStats = useCallback(() => {
    checkIdle();

    const now = Date.now();
    const totalTime = now - sessionStartRef.current;
    const idleTime = totalIdleRef.current + (isIdleRef.current && idleStartRef.current ? now - idleStartRef.current : 0);
    const activeTime = totalTime - idleTime;

    // Only report if there's meaningful data
    if (totalTime < 30000) return; // Less than 30s, skip

    fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "idle_report",
        category: "PAGE",
        description: `Active: ${Math.floor(activeTime / 1000)}s, Idle: ${Math.floor(idleTime / 1000)}s`,
        meta: {
          totalTime: Math.floor(totalTime / 1000),
          activeTime: Math.floor(activeTime / 1000),
          idleTime: Math.floor(idleTime / 1000),
          activePercent: totalTime > 0 ? Math.round((activeTime / totalTime) * 100) : 0,
          isCurrentlyIdle: isIdleRef.current,
        },
      }),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, [checkIdle]);

  useEffect(() => {
    // Activity listeners
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];

    // Debounce — don't fire on every pixel of mouse move
    let debounceTimer = null;
    const debouncedMarkActive = () => {
      if (debounceTimer) return;
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
      }, 1000);
      markActive();
    };

    events.forEach((evt) => {
      window.addEventListener(evt, debouncedMarkActive, { passive: true });
    });

    // Check idle every 10 seconds
    const idleChecker = setInterval(checkIdle, 10000);

    // Report stats every 5 minutes
    const reporter = setInterval(reportStats, REPORT_INTERVAL);

    // Report on tab hide / page unload
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        reportStats();
      } else {
        markActive();
      }
    };

    const handleUnload = () => reportStats();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      events.forEach((evt) => {
        window.removeEventListener(evt, debouncedMarkActive);
      });
      clearInterval(idleChecker);
      clearInterval(reporter);
      clearTimeout(debounceTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);

      // Final report on unmount
      reportStats();
    };
  }, [markActive, checkIdle, reportStats]);
}
