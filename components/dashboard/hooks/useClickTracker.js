// hooks/useClickTracker.js
// ✅ Track button clicks, tile opens, important interactions
// Batches clicks and sends every 30 seconds

"use client";

import { useEffect, useRef, useCallback } from "react";

const BATCH_INTERVAL = 30 * 1000; // Send every 30 seconds
const MAX_BATCH = 50; // Max clicks per batch

/**
 * Usage: useClickTracker(session)
 * Drop into DashboardShell
 */
export function useClickTracker(session) {
  const clicksRef = useRef([]);
  const timerRef = useRef(null);

  const flushClicks = useCallback(() => {
    if (clicksRef.current.length === 0) return;

    const batch = clicksRef.current.splice(0, MAX_BATCH);

    fetch("/api/activity/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "click_batch",
        category: "PAGE",
        description: `${batch.length} click(s) recorded`,
        meta: {
          clicks: batch,
          totalClicks: batch.length,
        },
      }),
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      const target = e.target.closest("button, a, [role='button'], [data-track]");
      if (!target) return;

      // Extract meaningful info
      const info = {
        text: (
          target.getAttribute("data-track") ||
          target.textContent ||
          target.getAttribute("aria-label") ||
          ""
        )
          .trim()
          .slice(0, 60),
        tag: target.tagName.toLowerCase(),
        timestamp: new Date().toISOString(),
      };

      // Don't track if empty text
      if (!info.text) return;

      clicksRef.current.push(info);

      // Auto flush if too many
      if (clicksRef.current.length >= MAX_BATCH) {
        flushClicks();
      }
    };

    document.addEventListener("click", handleClick, { passive: true, capture: true });

    // Periodic flush
    timerRef.current = setInterval(flushClicks, BATCH_INTERVAL);

    // Flush on tab hide / unload
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushClicks();
    };
    const handleUnload = () => flushClicks();

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("beforeunload", handleUnload);
      flushClicks(); // Final flush
    };
  }, [flushClicks]);
}
