// components/dashboard/ActivityTimeline.js
// ✅ Instagram-style activity timeline per user

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import BufferSpinner from "@/components/BufferSpinner";

const CATEGORY_COLORS = {
  AUTH: { bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.25)", text: "#a5b4fc", icon: "🔐" },
  PAGE: { bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.25)", text: "#86efac", icon: "📄" },
  CRUD: { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)", text: "#fde68a", icon: "✏️" },
  ADMIN: { bg: "rgba(244,114,182,0.12)", border: "rgba(244,114,182,0.25)", text: "#f9a8d4", icon: "👑" },
  CALENDAR: { bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)", text: "#c4b5fd", icon: "📅" },
  SCREEN: { bg: "rgba(6,182,212,0.12)", border: "rgba(6,182,212,0.25)", text: "#67e8f9", icon: "🖥️" },
  SECURITY: { bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", text: "#fca5a5", icon: "🛡️" },
  OTHER: { bg: "rgba(255,255,255,0.08)", border: "rgba(255,255,255,0.15)", text: "#d1d5db", icon: "📌" },
};

const SEVERITY_STYLES = {
  info: { dot: "#22c55e", label: "Info" },
  warning: { dot: "#f59e0b", label: "Warning" },
  critical: { dot: "#ef4444", label: "Critical" },
};

const FILTER_CATEGORIES = ["ALL", "AUTH", "PAGE", "CRUD", "ADMIN", "SECURITY", "CALENDAR", "SCREEN"];

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function groupByDate(logs) {
  const groups = {};
  logs.forEach((log) => {
    const d = new Date(log.createdAt);
    const key = d.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  });
  return groups;
}

export default function ActivityTimeline({ userId, username }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [category, setCategory] = useState("ALL");
  const [severity, setSeverity] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const searchTimer = useRef(null);
  const [searchInput, setSearchInput] = useState("");

  const fetchLogs = useCallback(
    async (p = 1, append = false) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams({
          userId,
          page: String(p),
          limit: "40",
        });
        if (category !== "ALL") params.set("category", category);
        if (severity) params.set("severity", severity);
        if (search) params.set("search", search);

        const res = await fetch(`/api/activity?${params}`);
        const data = await res.json().catch(() => ({}));

        if (append) {
          setLogs((prev) => [...prev, ...(data.logs || [])]);
        } else {
          setLogs(data.logs || []);
        }
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        setPage(p);
      } catch {
        if (!append) setLogs([]);
      }

      setLoading(false);
      setLoadingMore(false);
    },
    [userId, category, severity, search]
  );

  useEffect(() => {
    fetchLogs(1, false);
  }, [fetchLogs]);

  // Debounced search
  function handleSearchInput(val) {
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
    }, 500);
  }

  const grouped = groupByDate(logs);

  return (
    <div className="space-y-4">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-lg font-bold text-white flex items-center gap-2">
            📊 Activity Timeline
            {username && (
              <span className="text-sm font-normal text-white/50">— {username}</span>
            )}
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            {total} total activities tracked
          </div>
        </div>
        <button
          onClick={() => fetchLogs(1, false)}
          className="px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-white/70 text-xs hover:bg-white/15 transition"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-3">
        {/* Search */}
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Search actions, descriptions..."
          className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-white/30"
        />

        {/* Category pills */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CATEGORIES.map((cat) => {
            const active = category === cat;
            const catStyle = CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER;
            return (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background: active ? catStyle.bg : "rgba(255,255,255,0.05)",
                  border: `1px solid ${active ? catStyle.border : "rgba(255,255,255,0.08)"}`,
                  color: active ? catStyle.text : "rgba(255,255,255,0.4)",
                }}
              >
                {cat === "ALL" ? "🌐" : catStyle.icon} {cat}
              </button>
            );
          })}
        </div>

        {/* Severity */}
        <div className="flex gap-1.5">
          {["", "info", "warning", "critical"].map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverity(sev)}
              className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
              style={{
                background: severity === sev ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${severity === sev ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
                color: severity === sev ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            >
              {sev === "" ? "All Levels" : `${SEVERITY_STYLES[sev]?.dot ? "●" : ""} ${SEVERITY_STYLES[sev]?.label || sev}`}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Timeline ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-white/50">
          <BufferSpinner size={18} /> Loading timeline...
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <div className="text-3xl mb-2">📭</div>
          No activities found
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateLabel, dateLogs]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="text-xs font-bold text-white/60 uppercase tracking-wider">
                  {dateLabel}
                </div>
                <div className="flex-1 h-px bg-white/10" />
                <div className="text-[10px] text-white/30">
                  {dateLogs.length} events
                </div>
              </div>

              {/* Timeline items */}
              <div className="relative ml-4 border-l-2 border-white/10 space-y-1">
                {dateLogs.map((log) => {
                  const catStyle = CATEGORY_COLORS[log.category] || CATEGORY_COLORS.OTHER;
                  const sevStyle = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.info;
                  const isExpanded = expandedId === log._id;

                  return (
                    <div key={log._id} className="relative pl-6">
                      {/* Timeline dot */}
                      <div
                        className="absolute left-[-5px] top-3 w-2.5 h-2.5 rounded-full border-2"
                        style={{
                          background: sevStyle.dot,
                          borderColor: "rgba(6,6,15,1)",
                          boxShadow: `0 0 6px ${sevStyle.dot}40`,
                        }}
                      />

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log._id)}
                        className="w-full text-left rounded-xl p-3 transition-all hover:bg-white/5"
                        style={{
                          background: isExpanded ? "rgba(255,255,255,0.05)" : "transparent",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {/* Category badge */}
                            <span
                              className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-md"
                              style={{
                                background: catStyle.bg,
                                border: `1px solid ${catStyle.border}`,
                                color: catStyle.text,
                              }}
                            >
                              {catStyle.icon} {log.category}
                            </span>

                            {/* Action */}
                            <span className="text-xs font-semibold text-white truncate">
                              {log.action?.replace(/_/g, " ")}
                            </span>
                          </div>

                          <span className="shrink-0 text-[10px] text-white/30">
                            {timeAgo(log.createdAt)}
                          </span>
                        </div>

                        {/* Description */}
                        {log.description && (
                          <div className="text-[11px] text-white/50 mt-1 line-clamp-1">
                            {log.description}
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-3 space-y-2 animate-in fade-in duration-200">
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                <div className="text-white/30 mb-0.5">Time</div>
                                <div className="text-white/70">{formatDateTime(log.createdAt)}</div>
                              </div>
                              <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                <div className="text-white/30 mb-0.5">Severity</div>
                                <div className="flex items-center gap-1">
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ background: sevStyle.dot }}
                                  />
                                  <span className="text-white/70">{sevStyle.label}</span>
                                </div>
                              </div>
                              <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                <div className="text-white/30 mb-0.5">IP</div>
                                <div className="text-white/70 truncate">{log.ip || "—"}</div>
                              </div>
                              <div className="rounded-lg bg-black/30 border border-white/10 p-2">
                                <div className="text-white/30 mb-0.5">Location</div>
                                <div className="text-white/70 truncate">
                                  {log.geo ? `${log.geo.city}, ${log.geo.country}` : "—"}
                                </div>
                              </div>
                            </div>

                            {/* Meta data */}
                            {log.meta && Object.keys(log.meta).length > 0 && (
                              <details className="text-[10px]">
                                <summary className="text-white/30 cursor-pointer hover:text-white/50">
                                  Raw meta data
                                </summary>
                                <pre className="mt-1 p-2 rounded-lg bg-black/40 border border-white/10 text-white/40 overflow-x-auto text-[9px] leading-relaxed">
                                  {JSON.stringify(log.meta, null, 2)}
                                </pre>
                              </details>
                            )}

                            {/* Device */}
                            {log.device && log.device !== "unknown" && (
                              <details className="text-[10px]">
                                <summary className="text-white/30 cursor-pointer hover:text-white/50">
                                  Device info
                                </summary>
                                <div className="mt-1 text-white/30 break-all text-[9px]">
                                  {log.device}
                                </div>
                              </details>
                            )}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Load more */}
          {page < totalPages && (
            <div className="text-center pt-2">
              <button
                onClick={() => fetchLogs(page + 1, true)}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/15 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {loadingMore ? (
                  <>
                    <BufferSpinner size={14} /> Loading...
                  </>
                ) : (
                  `Load More (${page}/${totalPages})`
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
