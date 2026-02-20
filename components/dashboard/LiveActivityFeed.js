// components/dashboard/LiveActivityFeed.js
// ✅ Real-time activity feed using Server-Sent Events (SSE)

"use client";

import { useEffect, useState, useRef, useCallback } from "react";

const MAX_ITEMS = 100;

const CATEGORY_EMOJI = {
  AUTH: "🔐",
  PAGE: "📄",
  CRUD: "✏️",
  ADMIN: "👑",
  CALENDAR: "📅",
  SCREEN: "🖥️",
  SECURITY: "🛡️",
  OTHER: "📌",
};

const SEVERITY_COLOR = {
  info: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 5) return "now";
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

export default function LiveActivityFeed() {
  const [items, setItems] = useState([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState({ total: 0, perMinute: 0 });
  const eventSourceRef = useRef(null);
  const countRef = useRef(0);
  const minuteCountRef = useRef(0);
  const pausedRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setError(null);

    const es = new EventSource("/api/activity/live");
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          setConnected(true);
          return;
        }

        if (data.type === "heartbeat") {
          return;
        }

        if (data.type === "initial" && Array.isArray(data.logs)) {
          setItems(data.logs.slice(-MAX_ITEMS));
          countRef.current += data.logs.length;
          setStats((s) => ({ ...s, total: countRef.current }));
          return;
        }

        if (data.type === "new" && data.log) {
          if (pausedRef.current) return;

          countRef.current++;
          minuteCountRef.current++;

          setItems((prev) => {
            const next = [...prev, data.log];
            if (next.length > MAX_ITEMS) return next.slice(-MAX_ITEMS);
            return next;
          });

          setStats((s) => ({ ...s, total: countRef.current }));
        }
      } catch {}
    };

    es.onerror = () => {
      setConnected(false);
      setError("Connection lost. Reconnecting...");
      es.close();

      // Auto reconnect after 3 seconds
      setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();

    // Per-minute rate counter
    const rateTimer = setInterval(() => {
      setStats((s) => ({ ...s, perMinute: minuteCountRef.current }));
      minuteCountRef.current = 0;
    }, 60000);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      clearInterval(rateTimer);
    };
  }, [connect]);

  // Auto-scroll
  const bottomRef = useRef(null);
  useEffect(() => {
    if (!paused && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [items, paused]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold text-white">🔴 Live Feed</div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{
              background: connected ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${connected ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: connected ? "#86efac" : "#fca5a5",
            }}
          >
            {connected ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                LIVE
              </>
            ) : (
              "DISCONNECTED"
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/30">
            {stats.total} total • {stats.perMinute}/min
          </span>

          <button
            onClick={() => setPaused(!paused)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition"
            style={{
              background: paused ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${paused ? "rgba(251,191,36,0.25)" : "rgba(255,255,255,0.1)"}`,
              color: paused ? "#fde68a" : "rgba(255,255,255,0.5)",
            }}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>

          <button
            onClick={() => setItems([])}
            className="px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-[10px] text-white/40 hover:bg-white/12 transition"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {error && (
        <div className="text-[11px] text-amber-300/70 bg-amber-500/10 border border-amber-400/20 rounded-xl px-3 py-2">
          ⚠️ {error}
        </div>
      )}

      {/* Feed */}
      <div
        className="rounded-2xl border border-white/10 bg-black/30 overflow-hidden"
        style={{ maxHeight: 500 }}
      >
        <div className="overflow-y-auto p-2 space-y-1" style={{ maxHeight: 500 }}>
          {items.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-sm">
              Waiting for activity...
            </div>
          ) : (
            items.map((log, i) => (
              <div
                key={log._id || i}
                className="flex items-start gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
                style={{
                  animation: i === items.length - 1 ? "fadeSlideIn 0.3s ease" : "none",
                }}
              >
                {/* Severity dot */}
                <span
                  className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                  style={{
                    background: SEVERITY_COLOR[log.severity] || SEVERITY_COLOR.info,
                    boxShadow: `0 0 4px ${SEVERITY_COLOR[log.severity] || SEVERITY_COLOR.info}50`,
                  }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-white/80">
                      {log.username || "system"}
                    </span>
                    <span className="text-[10px] text-white/40">
                      {CATEGORY_EMOJI[log.category] || "📌"} {log.action?.replace(/_/g, " ")}
                    </span>
                  </div>
                  {log.description && (
                    <div className="text-[10px] text-white/30 truncate mt-0.5">
                      {log.description}
                    </div>
                  )}
                </div>

                {/* Time */}
                <span className="shrink-0 text-[9px] text-white/20 mt-0.5">
                  {timeAgo(log.createdAt)}
                </span>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
