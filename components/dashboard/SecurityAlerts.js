// components/dashboard/SecurityAlerts.js
// ✅ Security alerts — suspicious activities, locked accounts, threats

"use client";

import { useEffect, useState } from "react";
import BufferSpinner from "@/components/BufferSpinner";

const SEVERITY_STYLES = {
  critical: {
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.25)",
    text: "#fca5a5",
    icon: "🚨",
    dot: "#ef4444",
  },
  warning: {
    bg: "rgba(251,191,36,0.10)",
    border: "rgba(251,191,36,0.25)",
    text: "#fde68a",
    icon: "⚠️",
    dot: "#f59e0b",
  },
};

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function SecurityAlerts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, critical, warning

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/activity/alerts");
        const json = await res.json().catch(() => ({}));
        setData(json);
      } catch {
        setData(null);
      }
      setLoading(false);
    }
    load();

    // Auto refresh every 30 seconds
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-white/50">
        <BufferSpinner size={18} /> Loading security alerts...
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-8 text-white/40">Failed to load alerts</div>;
  }

  const filteredAlerts =
    filter === "all"
      ? data.alerts || []
      : (data.alerts || []).filter((a) => a.severity === filter);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-lg font-bold text-white">🛡️ Security Alerts</div>
        <div className="text-xs text-white/40">Auto-refresh: 30s</div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-white">{data.summary?.total || 0}</div>
          <div className="text-[10px] text-white/40 mt-1">Total Alerts</div>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-center">
          <div className="text-2xl font-black text-red-400">{data.summary?.critical || 0}</div>
          <div className="text-[10px] text-red-300/50 mt-1">🚨 Critical</div>
        </div>
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
          <div className="text-2xl font-black text-amber-400">{data.summary?.warnings || 0}</div>
          <div className="text-[10px] text-amber-300/50 mt-1">⚠️ Warnings</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
          <div className="text-2xl font-black text-orange-400">{data.summary?.lockedAccounts || 0}</div>
          <div className="text-[10px] text-white/40 mt-1">🔒 Locked</div>
        </div>
      </div>

      {/* Locked Accounts */}
      {data.lockedUsers?.length > 0 && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
          <div className="text-sm font-semibold text-red-300 mb-3">🔒 Locked Accounts</div>
          <div className="space-y-2">
            {data.lockedUsers.map((u) => (
              <div
                key={u._id}
                className="flex items-center justify-between rounded-xl bg-black/30 border border-red-500/15 px-3 py-2"
              >
                <div>
                  <div className="text-xs font-bold text-white">{u.username}</div>
                  <div className="text-[10px] text-red-300/50">{u.lockReason || "Manual lock"}</div>
                </div>
                <div className="text-[10px] text-white/30">{timeAgo(u.lockedAt)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-1.5">
        {[
          { key: "all", label: "All" },
          { key: "critical", label: "🚨 Critical" },
          { key: "warning", label: "⚠️ Warning" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-3 py-1 rounded-lg text-[11px] font-semibold transition"
            style={{
              background: filter === f.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${filter === f.key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              color: filter === f.key ? "#fff" : "rgba(255,255,255,0.35)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-white/30">
            <div className="text-3xl mb-2">✅</div>
            No alerts — all clear!
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const sev = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.warning;
            return (
              <div
                key={alert._id}
                className="rounded-xl p-3 transition-all hover:bg-white/5"
                style={{
                  background: sev.bg,
                  border: `1px solid ${sev.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <span
                      className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: sev.dot,
                        boxShadow: `0 0 6px ${sev.dot}40`,
                      }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold" style={{ color: sev.text }}>
                          {sev.icon} {alert.action?.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-white/40">
                          by {alert.username}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 mt-0.5">
                        {alert.description}
                      </div>
                      {alert.ip && alert.ip !== "unknown" && (
                        <div className="text-[10px] text-white/25 mt-0.5">
                          IP: {alert.ip}
                          {alert.geo ? ` • ${alert.geo.city}, ${alert.geo.country}` : ""}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-white/25">
                    {timeAgo(alert.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
