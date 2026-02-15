// components/dashboard/RecentCustomer.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { PT, getStatusConfig } from "@/components/profile/profileTheme";
import CustomerProfileModal from "@/components/CustomerProfileModal";

/* ─────────── constants ─────────── */
const AUTO_REFRESH_MS = 30000;
const DEBOUNCE_MS = 250;
const PIN_KEY = "sysbyte_pinned_customers";
const VIEW_KEY = "sysbyte_recent_view";
const SORT_OPTIONS = [
  { key: "newest", label: "Newest First" },
  { key: "oldest", label: "Oldest First" },
  { key: "name", label: "Name A→Z" },
  { key: "roll", label: "Roll No ↑" },
  { key: "age", label: "Age ↑" },
];
const FILTER_CHIPS = [
  { key: "ALL", label: "All" },
  { key: "RECENT", label: "Recent" },
  { key: "ACTIVE", label: "Active" },
  { key: "ELIGIBLE", label: "Eligible" },
  { key: "QUALIFIED", label: "Qualified" },
];

/* ─────────── helpers ─────────── */
function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getGenderIcon(gender) {
  if (gender === "MALE") return "♂";
  if (gender === "FEMALE") return "♀";
  return "⚥";
}

function getGenderAccent(gender, isLight) {
  if (gender === "MALE") {
    return isLight
      ? { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.18)", text: "#2563eb", avatarBg: "linear-gradient(135deg,#3b82f6,#60a5fa)" }
      : { bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)", text: "#93c5fd", avatarBg: "linear-gradient(135deg,#3b82f6,#60a5fa)" };
  }
  if (gender === "FEMALE") {
    return isLight
      ? { bg: "rgba(236,72,153,0.08)", border: "rgba(236,72,153,0.18)", text: "#db2777", avatarBg: "linear-gradient(135deg,#ec4899,#f472b6)" }
      : { bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.25)", text: "#f9a8d4", avatarBg: "linear-gradient(135deg,#ec4899,#f472b6)" };
  }
  return isLight
    ? { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.18)", text: "#059669", avatarBg: "linear-gradient(135deg,#10b981,#34d399)" }
    : { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", text: "#6ee7b7", avatarBg: "linear-gradient(135deg,#10b981,#34d399)" };
}

function statusLabel(s) {
  if (!s) return "RECENT";
  return s;
}

function statusTheme(s, c) {
  const st = (s || "RECENT").toUpperCase();
  if (st === "QUALIFIED") return c.statusQualified;
  if (st === "ACTIVE") return c.statusActive;
  if (st === "ELIGIBLE") return c.statusEligible;
  if (st === "PENDING") return c.statusPending;
  return c.statusToday;
}

function getPinnedIds() {
  try {
    const raw = localStorage.getItem(PIN_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function savePinnedIds(ids) {
  try { localStorage.setItem(PIN_KEY, JSON.stringify(ids)); } catch {}
}

function getSavedView() {
  try { return localStorage.getItem(VIEW_KEY) || "grid"; } catch { return "grid"; }
}
function saveView(v) {
  try { localStorage.setItem(VIEW_KEY, v); } catch {}
}

/* ─────────── Skeleton Card ─────────── */
function SkeletonCard({ c }) {
  return (
    <div
      style={{
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: 16,
        padding: 16,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: c.panelBg,
            animation: "rcPulse 1.5s ease-in-out infinite",
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: "60%", height: 14, borderRadius: 7,
              background: c.panelBg,
              animation: "rcPulse 1.5s ease-in-out infinite",
              animationDelay: "0.1s",
            }}
          />
          <div
            style={{
              width: "40%", height: 10, borderRadius: 5, marginTop: 8,
              background: c.panelBg,
              animation: "rcPulse 1.5s ease-in-out infinite",
              animationDelay: "0.2s",
            }}
          />
        </div>
      </div>
      <div
        style={{
          width: "80%", height: 10, borderRadius: 5, marginTop: 14,
          background: c.panelBg,
          animation: "rcPulse 1.5s ease-in-out infinite",
          animationDelay: "0.3s",
        }}
      />
      <div
        style={{
          width: "50%", height: 10, borderRadius: 5, marginTop: 8,
          background: c.panelBg,
          animation: "rcPulse 1.5s ease-in-out infinite",
          animationDelay: "0.4s",
        }}
      />
    </div>
  );
}

/* ─────────── Stats Bar ─────────── */
function StatsBar({ items, c }) {
  const total = items.length;
  const active = items.filter(i => (i.status || "").toUpperCase() === "ACTIVE").length;
  const eligible = items.filter(i => (i.status || "").toUpperCase() === "ELIGIBLE").length;
  const qualified = items.filter(i => (i.status || "").toUpperCase() === "QUALIFIED" || (i.cardStatus || "").toUpperCase() === "QUALIFIED").length;

  const stats = [
    { label: "Total", value: total, color: c.acc },
    { label: "Active", value: active, color: c.statusActive.dot },
    { label: "Eligible", value: eligible, color: c.statusEligible.dot },
    { label: "Qualified", value: qualified, color: c.statusQualified.dot },
  ];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
      {stats.map(s => (
        <div
          key={s.label}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 12,
            background: c.panelBg, border: `1px solid ${c.panelBorder}`,
          }}
        >
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: s.color, display: "inline-block",
          }} />
          <span style={{ fontSize: 12, color: c.t3 }}>{s.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: c.t1 }}>{s.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────── Customer Card ─────────── */
function CustomerCard({ cust, c, isLight, onClick, isPinned, onTogglePin, viewMode, index, onQuickCall, onQuickWhatsApp }) {
  const [pressed, setPressed] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartRef = useRef(null);
  const touchStartYRef = useRef(null);

  const gender = (cust.gender || "").toUpperCase();
  const ga = getGenderAccent(gender, isLight);
  const st = statusTheme(cust.status || cust.cardStatus, c);

  // Swipe handlers (mobile)
  const onTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    setSwiping(false);
    setSwipeX(0);
  };
  const onTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;
    // Only horizontal swipe
    if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setSwiping(true);
      setSwipeX(Math.max(-100, Math.min(100, dx)));
    }
  };
  const onTouchEnd = () => {
    if (swiping) {
      if (swipeX > 60) {
        // Swipe right → call
        if (cust.phone) onQuickCall(cust.phone);
      } else if (swipeX < -60) {
        // Swipe left → open profile
        onClick();
      }
    }
    setSwiping(false);
    setSwipeX(0);
    touchStartRef.current = null;
  };

  const isList = viewMode === "list";

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
      }}
    >
      {/* Swipe background indicators */}
      {swiping && swipeX > 20 && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 80,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(34,197,94,0.15)", borderRadius: "16px 0 0 16px",
          zIndex: 0,
        }}>
          <span style={{ fontSize: 24 }}>📞</span>
        </div>
      )}
      {swiping && swipeX < -20 && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 80,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(99,102,241,0.15)", borderRadius: "0 16px 16px 0",
          zIndex: 0,
        }}>
          <span style={{ fontSize: 24 }}>👤</span>
        </div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        onClick={() => { if (!swiping) onClick(); }}
        style={{
          position: "relative",
          zIndex: 1,
          display: isList ? "flex" : "block",
          alignItems: isList ? "center" : undefined,
          gap: isList ? 16 : undefined,
          background: c.cardBg,
          border: `1px solid ${isPinned ? c.acc : c.cardBorder}`,
          borderRadius: 16,
          padding: isList ? "12px 16px" : 16,
          cursor: "pointer",
          transition: "transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease",
          transform: swiping
            ? `translateX(${swipeX * 0.5}px)`
            : pressed
              ? "scale(0.97)"
              : "translateY(0)",
          boxShadow: pressed ? "none" : c.cardShadow,
          opacity: 1,
          animation: `rcFadeSlideIn 0.35s ease both`,
          animationDelay: `${Math.min(index * 0.04, 0.6)}s`,
          willChange: "transform, opacity",
        }}
      >
        {/* Pin indicator */}
        {isPinned && (
          <div style={{
            position: "absolute", top: 8, right: 8, fontSize: 14,
            opacity: 0.7,
          }}>📌</div>
        )}

        {/* Avatar */}
        <div style={{
          width: isList ? 40 : 44,
          height: isList ? 40 : 44,
          minWidth: isList ? 40 : 44,
          borderRadius: "50%",
          background: ga.avatarBg,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700,
          fontSize: isList ? 16 : 18,
          border: `2px solid ${ga.border}`,
          marginBottom: isList ? 0 : 0,
        }}>
          {cust.name ? cust.name.charAt(0).toUpperCase() : getGenderIcon(gender)}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0, marginTop: isList ? 0 : 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 15, fontWeight: 600, color: c.t1,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%",
            }}>
              {cust.name}
            </span>

            {/* Gender icon */}
            <span style={{
              fontSize: 13, color: ga.text,
              padding: "1px 6px", borderRadius: 8,
              background: ga.bg, border: `1px solid ${ga.border}`,
              lineHeight: 1.3,
            }}>
              {getGenderIcon(gender)}
            </span>

            {/* Roll badge */}
            {cust.rollNo && (
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: "2px 8px", borderRadius: 10,
                background: c.badgeBg, border: `1px solid ${c.badgeBorder}`,
                color: c.badgeText,
              }}>
                #{cust.rollNo}
              </span>
            )}
          </div>

          {/* Meta row */}
          {!isList && (
            <div style={{ display: "flex", gap: 12, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
              {cust.age && (
                <span style={{ fontSize: 12, color: c.t3 }}>
                  🎂 {cust.age}y
                </span>
              )}
              {cust.pincode && (
                <span style={{ fontSize: 12, color: c.t3 }}>
                  📍 {cust.pincode}
                </span>
              )}
              {(cust.createdAt || cust.addedAt) && (
                <span style={{ fontSize: 11, color: c.t4 }}>
                  🕐 {relativeTime(cust.createdAt || cust.addedAt)}
                </span>
              )}
            </div>
          )}

          {/* Address (grid only) */}
          {!isList && cust.address && (
            <div style={{
              fontSize: 12, color: c.t3, marginTop: 4,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>
              {cust.address}
            </div>
          )}

          {/* Note preview */}
          {!isList && cust.lastNote && (
            <div style={{
              fontSize: 11, color: c.t4, marginTop: 4,
              fontStyle: "italic",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              💬 {cust.lastNote}
            </div>
          )}

          {/* List mode: compact meta */}
          {isList && (
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 2 }}>
              {cust.age && <span style={{ fontSize: 11, color: c.t3 }}>Age {cust.age}</span>}
              {cust.pincode && <span style={{ fontSize: 11, color: c.t3 }}>📍{cust.pincode}</span>}
              {(cust.createdAt || cust.addedAt) && (
                <span style={{ fontSize: 11, color: c.t4 }}>
                  {relativeTime(cust.createdAt || cust.addedAt)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right section */}
        <div style={{
          display: "flex", flexDirection: isList ? "row" : "column",
          alignItems: isList ? "center" : "flex-end",
          gap: 6, marginTop: isList ? 0 : 8,
          flexShrink: 0,
        }}>
          {/* Status badge */}
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: "3px 10px", borderRadius: 10,
            background: st.bg, border: `1px solid ${st.border}`, color: st.text,
            display: "flex", alignItems: "center", gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />
            {statusLabel(cust.status || cust.cardStatus)}
          </span>

          {/* Quick action buttons */}
          <div style={{ display: "flex", gap: 4 }}>
            {cust.phone && (
              <button
                onClick={(e) => { e.stopPropagation(); onQuickCall(cust.phone); }}
                title="Call"
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 14,
                  transition: "transform 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.background = c.panelHover; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = c.panelBg; }}
              >
                📞
              </button>
            )}
            {cust.whatsapp && (
              <button
                onClick={(e) => { e.stopPropagation(); onQuickWhatsApp(cust.whatsapp); }}
                title="WhatsApp"
                style={{
                  width: 30, height: 30, borderRadius: 10,
                  background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 14,
                  transition: "transform 0.15s ease, background 0.15s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.background = c.panelHover; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = c.panelBg; }}
              >
                💬
              </button>
            )}
            {/* Pin toggle */}
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(cust._id); }}
              title={isPinned ? "Unpin" : "Pin"}
              style={{
                width: 30, height: 30, borderRadius: 10,
                background: isPinned ? `${c.acc}22` : c.panelBg,
                border: `1px solid ${isPinned ? c.acc : c.panelBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 13,
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              {isPinned ? "📌" : "📍"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function RecentCustomer() {
  const { theme, mounted } = useTheme();
  const isLight = theme === "light";
  const c = isLight ? PT.light : PT.dark;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openProfile, setOpenProfile] = useState(false);
  const [selected, setSelected] = useState(null);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [viewMode, setViewMode] = useState("grid");
  const [pinnedIds, setPinnedIds] = useState([]);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  const abortRef = useRef(null);
  const reqIdRef = useRef(0);
  const searchRef = useRef(null);
  const autoRefreshRef = useRef(null);

  // Load pinned + view mode from localStorage
  useEffect(() => {
    setPinnedIds(getPinnedIds());
    setViewMode(getSavedView());
  }, []);

  const queryUrl = useMemo(() => {
    const s = q.trim();
    return s ? `/api/customers/today?q=${encodeURIComponent(s)}` : "/api/customers/today";
  }, [q]);

  const load = useCallback(async (url) => {
    const fetchUrl = url || queryUrl;
    setErr("");

    try {
      if (abortRef.current) abortRef.current.abort();
    } catch {}

    const controller = new AbortController();
    abortRef.current = controller;
    const myReqId = ++reqIdRef.current;

    setLoading(true);
    try {
      const res = await fetch(fetchUrl, { signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      if (myReqId !== reqIdRef.current) return;

      if (!res.ok) {
        setItems([]);
        setErr(data?.error || `Request failed (${res.status})`);
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
      setLastRefreshTime(Date.now());
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (myReqId !== reqIdRef.current) return;
      setItems([]);
      setErr("Network error");
    } finally {
      if (myReqId === reqIdRef.current) setLoading(false);
    }
  }, [queryUrl]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => load(), DEBOUNCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryUrl]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshActive) return;
    autoRefreshRef.current = setInterval(() => {
      load();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(autoRefreshRef.current);
  }, [autoRefreshActive, load]);

  // Abort on unmount
  useEffect(() => {
    return () => {
      try { if (abortRef.current) abortRef.current.abort(); } catch {}
      clearInterval(autoRefreshRef.current);
    };
  }, []);

  // Keyboard: Escape clears search
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape" && q) {
        setQ("");
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [q]);

  // Pin toggle
  function togglePin(id) {
    setPinnedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      savePinnedIds(next);
      return next;
    });
  }

  // View toggle
  function toggleView() {
    setViewMode(prev => {
      const next = prev === "grid" ? "list" : "grid";
      saveView(next);
      return next;
    });
  }

  // Refresh with spin
  function handleRefresh() {
    setRefreshSpin(true);
    load();
    setTimeout(() => setRefreshSpin(false), 700);
  }

  // Quick actions
  function quickCall(phone) {
    window.open(`tel:${phone}`, "_self");
  }
  function quickWhatsApp(wa) {
    const num = (wa || "").replace(/\D/g, "");
    window.open(`https://wa.me/91${num}`, "_blank");
  }

  // Profile modal
  function open(cust) {
    setSelected(cust);
    setOpenProfile(true);
  }
  function close() {
    setOpenProfile(false);
    setSelected(null);
  }

  // ── Filter + Sort + Pin-first ──
  const processed = useMemo(() => {
    let arr = [...items];

    // Filter
    if (filterStatus !== "ALL") {
      arr = arr.filter(i => {
        const s = (i.status || i.cardStatus || "RECENT").toUpperCase();
        return s === filterStatus;
      });
    }

    // Sort
    arr.sort((a, b) => {
      const aPin = pinnedIds.includes(a._id) ? 0 : 1;
      const bPin = pinnedIds.includes(b._id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;

      switch (sortBy) {
        case "oldest":
          return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "roll":
          return (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0);
        case "age":
          return (Number(a.age) || 0) - (Number(b.age) || 0);
        default: // newest
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
    });

    return arr;
  }, [items, filterStatus, sortBy, pinnedIds]);

  // ── Auto-refresh countdown ──
  const [refreshCountdown, setRefreshCountdown] = useState(AUTO_REFRESH_MS / 1000);
  useEffect(() => {
    if (!autoRefreshActive) return;
    const iv = setInterval(() => {
      const elapsed = Date.now() - lastRefreshTime;
      const remaining = Math.max(0, Math.ceil((AUTO_REFRESH_MS - elapsed) / 1000));
      setRefreshCountdown(remaining);
    }, 1000);
    return () => clearInterval(iv);
  }, [autoRefreshActive, lastRefreshTime]);

  if (!mounted) return null;

  return (
    <div>
      {/* ──── Injected keyframes (no blur, only transform/opacity) ──── */}
      <style>{`
        @keyframes rcFadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rcPulse {
          0%, 100% { opacity: 0.4; }
          50%      { opacity: 0.7; }
        }
        @keyframes rcSpinOnce {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes rcProgressBar {
          from { transform: scaleX(1); }
          to   { transform: scaleX(0); }
        }
      `}</style>

      {/* ════════════ HEADER ════════════ */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 12, marginBottom: 16,
      }}>
        {/* Title row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: c.t1, margin: 0, lineHeight: 1.3,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 22 }}>👥</span>
              Recent Customers
            </h2>
            <p style={{ fontSize: 12, color: c.t3, margin: "4px 0 0" }}>
              Search by Roll / Name / Pincode • Esc to clear
            </p>
          </div>

          {/* Auto-refresh indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => setAutoRefreshActive(p => !p)}
              title={autoRefreshActive ? "Pause auto-refresh" : "Resume auto-refresh"}
              style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 8,
                background: autoRefreshActive ? `${c.statusActive.bg}` : c.panelBg,
                border: `1px solid ${autoRefreshActive ? c.statusActive.border : c.panelBorder}`,
                color: autoRefreshActive ? c.statusActive.text : c.t3,
                cursor: "pointer", transition: "opacity 0.15s ease",
              }}
            >
              {autoRefreshActive ? `🔄 ${refreshCountdown}s` : "⏸ Paused"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{
          display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap",
        }}>
          <div style={{
            flex: 1, minWidth: 220, maxWidth: 420, position: "relative",
          }}>
            {/* Search icon */}
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 15, color: c.t4, pointerEvents: "none",
            }}>🔍</span>

            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search roll, name, pincode..."
              style={{
                width: "100%",
                borderRadius: 14,
                background: c.inputBg,
                border: `1px solid ${c.inputBorder}`,
                padding: "10px 36px 10px 38px",
                fontSize: 14,
                color: c.inputText,
                outline: "none",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onFocus={(e) => {
                e.target.style.borderColor = c.inputBorderFocus;
                e.target.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = c.inputBorder;
                e.target.style.boxShadow = "none";
              }}
            />

            {/* Clear button */}
            {q && (
              <button
                onClick={() => { setQ(""); searchRef.current?.focus(); }}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 22, height: 22, borderRadius: "50%",
                  background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 12, color: c.t3,
                  transition: "transform 0.12s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateY(-50%) scale(1.15)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateY(-50%) scale(1)"}
              >
                ✕
              </button>
            )}
          </div>

          {/* Result count badge */}
          {!loading && (
            <span style={{
              fontSize: 12, fontWeight: 600,
              padding: "5px 12px", borderRadius: 10,
              background: c.badgeBg, border: `1px solid ${c.badgeBorder}`,
              color: c.badgeText,
              animation: "rcFadeSlideIn 0.25s ease both",
            }}>
              {processed.length} result{processed.length !== 1 ? "s" : ""}
            </span>
          )}

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            title="Refresh"
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: c.panelBg, border: `1px solid ${c.panelBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 18,
              transition: "transform 0.15s ease",
              animation: refreshSpin ? "rcSpinOnce 0.6s ease" : "none",
            }}
          >
            🔄
          </button>

          {/* View toggle */}
          <button
            onClick={toggleView}
            title={viewMode === "grid" ? "Switch to List" : "Switch to Grid"}
            style={{
              width: 38, height: 38, borderRadius: 12,
              background: c.panelBg, border: `1px solid ${c.panelBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 18,
              transition: "transform 0.15s ease",
            }}
          >
            {viewMode === "grid" ? "☰" : "▦"}
          </button>
        </div>

        {/* Filter chips + Sort */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8,
        }}>
          {/* Filter chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTER_CHIPS.map(fc => {
              const active = filterStatus === fc.key;
              const chipSt = fc.key === "ALL" ? null : statusTheme(fc.key, c);
              return (
                <button
                  key={fc.key}
                  onClick={() => setFilterStatus(fc.key)}
                  style={{
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    padding: "5px 14px", borderRadius: 10,
                    background: active
                      ? (chipSt ? chipSt.bg : c.acc + "22")
                      : c.chipBg,
                    border: `1px solid ${active
                      ? (chipSt ? chipSt.border : c.acc)
                      : c.chipBorder}`,
                    color: active
                      ? (chipSt ? chipSt.text : c.acc)
                      : c.chipText,
                    cursor: "pointer",
                    transition: "transform 0.12s ease, opacity 0.12s ease",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  {chipSt && <span style={{ width: 6, height: 6, borderRadius: "50%", background: chipSt.dot }} />}
                  {fc.label}
                </button>
              );
            })}
          </div>

          {/* Sort dropdown */}
          <div style={{ position: "relative" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                fontSize: 12, padding: "6px 28px 6px 10px", borderRadius: 10,
                background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                color: c.inputText, cursor: "pointer", outline: "none",
                appearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 10px center",
              }}
            >
              {SORT_OPTIONS.map(s => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ════════════ STATS BAR ════════════ */}
      {!loading && items.length > 0 && <StatsBar items={items} c={c} />}

      {/* ════════════ AUTO-REFRESH PROGRESS BAR ════════════ */}
      {autoRefreshActive && !loading && (
        <div style={{
          height: 2, borderRadius: 1, marginBottom: 12,
          background: c.panelBg, overflow: "hidden",
        }}>
          <div
            key={lastRefreshTime}
            style={{
              height: "100%",
              background: c.acc,
              borderRadius: 1,
              transformOrigin: "left",
              animation: `rcProgressBar ${AUTO_REFRESH_MS / 1000}s linear`,
              willChange: "transform",
            }}
          />
        </div>
      )}

      {/* ════════════ ERROR ════════════ */}
      {err && (
        <div style={{
          marginBottom: 12, borderRadius: 14,
          border: `1px solid ${c.errorBorder}`,
          background: c.errorBg,
          padding: "12px 16px", fontSize: 13, color: c.errorText,
          display: "flex", alignItems: "center", gap: 8,
          animation: "rcFadeSlideIn 0.3s ease both",
        }}>
          <span style={{ fontSize: 18 }}>⚠️</span>
          {err}
        </div>
      )}

      {/* ════════════ LOADING SKELETONS ════════════ */}
      {loading ? (
        <div style={{
          display: "grid", gap: 12,
          gridTemplateColumns: viewMode === "grid"
            ? "repeat(auto-fill, minmax(280px, 1fr))"
            : "1fr",
        }}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} c={c} />)}
        </div>
      ) : processed.length === 0 ? (
        /* ════════════ EMPTY STATE ════════════ */
        <div style={{
          textAlign: "center", padding: "48px 20px",
          animation: "rcFadeSlideIn 0.4s ease both",
        }}>
          <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.6 }}>
            {q ? "🔎" : "📋"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: c.t2, marginBottom: 4 }}>
            {q ? "No results found" : "No recent customers"}
          </div>
          <div style={{ fontSize: 13, color: c.t3 }}>
            {q
              ? `No customers match "${q}". Try a different search.`
              : "Customers added today will appear here."}
          </div>
          {q && (
            <button
              onClick={() => setQ("")}
              style={{
                marginTop: 16, padding: "8px 20px", borderRadius: 10,
                background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                color: c.acc, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        /* ════════════ CARD GRID / LIST ════════════ */
        <div style={{
          display: "grid", gap: 12,
          gridTemplateColumns: viewMode === "grid"
            ? "repeat(auto-fill, minmax(300px, 1fr))"
            : "1fr",
        }}>
          {processed.map((cust, i) => (
            <CustomerCard
              key={cust._id}
              cust={cust}
              c={c}
              isLight={isLight}
              onClick={() => open(cust)}
              isPinned={pinnedIds.includes(cust._id)}
              onTogglePin={togglePin}
              viewMode={viewMode}
              index={i}
              onQuickCall={quickCall}
              onQuickWhatsApp={quickWhatsApp}
            />
          ))}
        </div>
      )}

      {/* ════════════ MOBILE SWIPE HINT ════════════ */}
      {!loading && processed.length > 0 && (
        <div style={{
          textAlign: "center", marginTop: 16, fontSize: 11, color: c.t4,
          display: "none",
        }}>
          <style>{`
            @media (max-width: 640px) {
              .rc-swipe-hint { display: block !important; }
            }
          `}</style>
          <span className="rc-swipe-hint" style={{ display: "none" }}>
            👈 Swipe left for profile • Swipe right to call 👉
          </span>
        </div>
      )}

      {/* ════════════ PROFILE MODAL ════════════ */}
      <CustomerProfileModal
        open={openProfile}
        onClose={close}
        customer={selected}
        source="TODAY"
        onChanged={() => load()}
      />
    </div>
  );
}
