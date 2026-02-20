// components/dashboard/CustomerLocationTracker.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { PT } from "@/components/profile/profileTheme";
import CustomerProfileModal from "@/components/CustomerProfileModal";

// ★ NOTE: NO mongodb import here — only fetch() calls to API routes

/* ═══════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════ */
const AUTO_REFRESH_MS = 30000;
const LOCK_DURATION_MS = 60 * 60 * 1000;
const VIEW_KEY = "clt_view";
const GROUP_KEY = "clt_group";
const PIN_KEY = "clt_pinned";
const NOTES_KEY = "clt_notes";
const TAGS_KEY = "clt_tags";
const PRESETS_KEY = "clt_filter_presets";
const REMINDERS_KEY = "clt_reminders";
const ACTIVITY_KEY = "clt_activity";
const KANBAN_LOCK_KEY = "clt_kanban_lock";

const LOCATION_TYPES = [
  { key: "ALL", label: "All", icon: "🌐" },
  { key: "SITTING", label: "Sitting", icon: "📋" },
  { key: "MEETING", label: "Meeting", icon: "🗓️" },
  { key: "DIKSHA", label: "Diksha", icon: "🎯" },
  { key: "PENDING", label: "Pending", icon: "⏸️" },
  { key: "UNKNOWN", label: "Unknown", icon: "❓" },
];

const DATE_PRESETS = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "3days", label: "3 Days" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
];

const SORT_OPTIONS = [
  { key: "stuck", label: "Stuck ↑" },
  { key: "recent", label: "Recent ↑" },
  { key: "name", label: "Name A→Z" },
  { key: "roll", label: "Roll ↑" },
];

const GENDER_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MALE", label: "♂" },
  { key: "FEMALE", label: "♀" },
];

const TAG_COLORS = [
  { key: "red", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", text: "#ef4444" },
  { key: "blue", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", text: "#3b82f6" },
  { key: "green", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", text: "#10b981" },
  { key: "orange", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)", text: "#f97316" },
  { key: "purple", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.3)", text: "#8b5cf6" },
  { key: "pink", bg: "rgba(236,72,153,0.12)", border: "rgba(236,72,153,0.3)", text: "#ec4899" },
];

const DEFAULT_TAG_LIST = [
  "VIP",
  "Follow-up",
  "Urgent",
  "New",
  "Hot Lead",
  "Cold",
];

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function getLS(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function setLS(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {
    /* ignore */
  }
}

function getLocColor(type, c) {
  switch (type) {
    case "SITTING":
      return {
        bg: c.statusActive.bg,
        border: c.statusActive.border,
        text: c.statusActive.text,
        dot: c.statusActive.dot,
      };
    case "MEETING":
      return {
        bg: c.statusQualified.bg,
        border: c.statusQualified.border,
        text: c.statusQualified.text,
        dot: c.statusQualified.dot,
      };
    case "DIKSHA":
      return {
        bg: c.statusToday.bg,
        border: c.statusToday.border,
        text: c.statusToday.text,
        dot: c.statusToday.dot,
      };
    case "PENDING":
      return {
        bg: c.statusPending.bg,
        border: c.statusPending.border,
        text: c.statusPending.text,
        dot: c.statusPending.dot,
      };
    default:
      return {
        bg: c.chipBg,
        border: c.chipBorder,
        text: c.chipText,
        dot: c.t4,
      };
  }
}

function getLocIcon(type) {
  return (
    { SITTING: "📋", MEETING: "🗓️", DIKSHA: "🎯", PENDING: "⏸️" }[type] ||
    "❓"
  );
}

function getGenderAccent(gender, isLight) {
  if (gender === "MALE")
    return isLight
      ? {
          bg: "rgba(59,130,246,0.08)",
          border: "rgba(59,130,246,0.18)",
          text: "#2563eb",
          avatarBg: "linear-gradient(135deg,#3b82f6,#60a5fa)",
        }
      : {
          bg: "rgba(59,130,246,0.12)",
          border: "rgba(59,130,246,0.25)",
          text: "#93c5fd",
          avatarBg: "linear-gradient(135deg,#3b82f6,#60a5fa)",
        };
  if (gender === "FEMALE")
    return isLight
      ? {
          bg: "rgba(236,72,153,0.08)",
          border: "rgba(236,72,153,0.18)",
          text: "#db2777",
          avatarBg: "linear-gradient(135deg,#ec4899,#f472b6)",
        }
      : {
          bg: "rgba(236,72,153,0.12)",
          border: "rgba(236,72,153,0.25)",
          text: "#f9a8d4",
          avatarBg: "linear-gradient(135deg,#ec4899,#f472b6)",
        };
  return isLight
    ? {
        bg: "rgba(16,185,129,0.08)",
        border: "rgba(16,185,129,0.18)",
        text: "#059669",
        avatarBg: "linear-gradient(135deg,#10b981,#34d399)",
      }
    : {
        bg: "rgba(16,185,129,0.12)",
        border: "rgba(16,185,129,0.25)",
        text: "#6ee7b7",
        avatarBg: "linear-gradient(135deg,#10b981,#34d399)",
      };
}

function getGenderIcon(g) {
  return g === "MALE" ? "♂" : g === "FEMALE" ? "♀" : "⚥";
}

function timeSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0)
    return {
      value: days,
      unit: "d",
      label: `${days}d ${hrs % 24}h`,
      total: ms,
    };
  if (hrs > 0)
    return {
      value: hrs,
      unit: "h",
      label: `${hrs}h ${mins % 60}m`,
      total: ms,
    };
  return { value: mins, unit: "m", label: `${mins}m`, total: ms };
}

function getTimeSeverity(ms) {
  if (!ms || ms < 0) return "fresh";
  const days = ms / 86400000;
  if (days < 1) return "fresh";
  if (days < 3) return "normal";
  if (days < 7) return "attention";
  return "stuck";
}

function severityColor(sev, c) {
  switch (sev) {
    case "fresh":
      return {
        bg: c.statusActive.bg,
        border: c.statusActive.border,
        text: c.statusActive.text,
      };
    case "normal":
      return {
        bg: c.statusPending.bg,
        border: c.statusPending.border,
        text: c.statusPending.text,
      };
    case "attention":
      return {
        bg: "rgba(249,115,22,0.12)",
        border: "rgba(249,115,22,0.25)",
        text: "#f97316",
      };
    case "stuck":
      return { bg: c.errorBg, border: c.errorBorder, text: c.errorText };
    default:
      return { bg: c.chipBg, border: c.chipBorder, text: c.chipText };
  }
}

function getTrackingDate(item) {
  if (item.locationType === "PENDING" && item.pausedAt) return item.pausedAt;
  return item.date || null;
}

function matchesDateFilter(item, preset, cFrom, cTo) {
  if (preset === "all") return true;
  const td = getTrackingDate(item);
  if (!td) return false;
  const d = new Date(td);
  const now = new Date();
  const sot = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "today":
      return d >= sot;
    case "3days": {
      const s = new Date(sot);
      s.setDate(s.getDate() - 3);
      return d >= s;
    }
    case "week": {
      const s = new Date(sot);
      s.setDate(s.getDate() - s.getDay());
      return d >= s;
    }
    case "month":
      return d >= new Date(now.getFullYear(), now.getMonth(), 1);
    case "custom": {
      if (cFrom && d < new Date(cFrom)) return false;
      if (cTo) {
        const t = new Date(cTo);
        t.setHours(23, 59, 59, 999);
        if (d > t) return false;
      }
      return true;
    }
    default:
      return true;
  }
}

function copyText(text) {
  try {
    navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString();
}

function getSmartSuggestions(items) {
  const suggestions = [];
  const stuck = items.filter((x) => {
    const td = getTrackingDate(x);
    return td && Date.now() - new Date(td).getTime() > 7 * 86400000;
  });
  if (stuck.length > 0)
    suggestions.push({
      icon: "🚨",
      type: "warning",
      text: `${stuck.length} stuck 7+ days`,
    });
  const pending = items.filter((x) => x.locationType === "PENDING").length;
  if (pending > 5)
    suggestions.push({
      icon: "⏸️",
      type: "info",
      text: `${pending} in Pending`,
    });
  const noDate = items.filter(
    (x) =>
      !x.date &&
      x.locationType !== "PENDING" &&
      x.locationType !== "UNKNOWN"
  ).length;
  if (noDate > 0)
    suggestions.push({
      icon: "📅",
      type: "info",
      text: `${noDate} without dates`,
    });
  const todayN = items.filter((x) => {
    const td = getTrackingDate(x);
    return (
      td && new Date(td).toDateString() === new Date().toDateString()
    );
  }).length;
  if (todayN > 0)
    suggestions.push({
      icon: "✨",
      type: "success",
      text: `${todayN} updated today`,
    });
  return suggestions;
}

/* ═══════════════════════════════════════
   GLOBAL CSS
   ═══════════════════════════════════════ */
const GLOBAL_CSS = `
@keyframes cltFadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes cltPulse{0%,100%{opacity:.4}50%{opacity:.7}}
@keyframes cltSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes cltProgress{from{transform:scaleX(1)}to{transform:scaleX(0)}}
@keyframes cltStuckPulse{0%,100%{opacity:.3}50%{opacity:.8}}
@keyframes cltSlideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes cltSlideDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(100%)}}
@keyframes cltShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes cltToastIn{from{opacity:0;transform:translateY(-20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
@keyframes cltToastOut{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-20px) scale(.95)}}
@keyframes cltBounceIn{0%{transform:scale(0)}50%{transform:scale(1.1)}100%{transform:scale(1)}}
@keyframes cltGlow{0%,100%{box-shadow:0 0 5px rgba(99,102,241,0.3)}50%{box-shadow:0 0 20px rgba(99,102,241,0.6)}}
.clt-no-sb::-webkit-scrollbar{display:none}
.clt-no-sb{-ms-overflow-style:none;scrollbar-width:none}
.clt-hscroll{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;padding-bottom:2px}
.clt-hscroll::-webkit-scrollbar{height:0;display:none}
.clt-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.45);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);-webkit-tap-highlight-color:transparent}
@media(min-width:641px){.clt-overlay{align-items:center}}
.clt-sheet{width:100%;max-width:480px;max-height:90vh;max-height:90dvh;border-radius:20px 20px 0 0;animation:cltSlideUp .3s cubic-bezier(.32,.72,.24,1.02);overflow:hidden;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch}
@media(min-width:641px){.clt-sheet{border-radius:20px;max-height:85vh;margin:20px}}
.clt-kanban{display:flex;gap:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding-bottom:12px;overscroll-behavior-x:contain}
.clt-kanban::-webkit-scrollbar{display:none}
.clt-kcol{min-width:280px;max-width:320px;flex-shrink:0;scroll-snap-align:start}
@media(max-width:640px){.clt-kcol{min-width:85vw;max-width:85vw}}
.clt-btn{min-height:44px;min-width:44px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;-webkit-tap-highlight-color:transparent;user-select:none;touch-action:manipulation;border:none;background:none;padding:0;position:relative}
.clt-btn:active{opacity:0.7}
.clt-grid{display:grid;gap:12px}
@media(min-width:768px){.clt-grid-auto{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}}
@media(max-width:767px){.clt-grid-auto{grid-template-columns:1fr}}
.clt-safe-b{padding-bottom:env(safe-area-inset-bottom,0px)}
.clt-input{font-size:16px!important;-webkit-appearance:none;-moz-appearance:none;appearance:none;border-radius:14px;touch-action:manipulation;box-sizing:border-box}
.clt-select{font-size:16px!important;-webkit-appearance:none;-moz-appearance:none;appearance:none;border-radius:8px;touch-action:manipulation;box-sizing:border-box}
.clt-modal-scroll{-webkit-overflow-scrolling:touch;overscroll-behavior:contain;overflow-y:auto}
@media(max-width:640px){
  .clt-mhide{display:none!important}
  .clt-mfull{width:100%!important;max-width:100%!important}
}
@media(min-width:641px){.clt-dhide{display:none!important}}
@supports(padding-top:env(safe-area-inset-top)){.clt-toast-container{top:calc(16px + env(safe-area-inset-top,0px))}}
.clt-card{transition:transform .18s ease,box-shadow .18s ease;-webkit-tap-highlight-color:transparent;touch-action:pan-y;will-change:transform}
.clt-card:active{transform:scale(0.97)!important}
input[type="date"]{-webkit-appearance:none;min-height:36px}
input[type="datetime-local"]{-webkit-appearance:none;min-height:44px}
`;

/* ═══════════════════════════════════════
   TOAST SYSTEM
   ═══════════════════════════════════════ */
let toastId = 0;
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((msg, type = "info", duration = 3000) => {
    const id = ++toastId;
    setToasts((p) => [...p.slice(-4), { id, msg, type, leaving: false }]);
    setTimeout(() => {
      setToasts((p) =>
        p.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
      setTimeout(
        () => setToasts((p) => p.filter((t) => t.id !== id)),
        350
      );
    }, duration);
  }, []);
  return { toasts, addToast };
}

function ToastContainer({ toasts, c }) {
  if (!toasts.length) return null;
  return (
    <div
      className="clt-toast-container"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        left: 16,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((t) => {
        const clr =
          {
            success: {
              bg: c.statusActive.bg,
              border: c.statusActive.border,
              text: c.statusActive.text,
              icon: "✅",
            },
            error: {
              bg: c.errorBg,
              border: c.errorBorder,
              text: c.errorText,
              icon: "❌",
            },
            warning: {
              bg: "rgba(249,115,22,0.14)",
              border: "rgba(249,115,22,0.3)",
              text: "#f97316",
              icon: "⚠️",
            },
            info: {
              bg: c.panelBg,
              border: c.panelBorder,
              text: c.t1,
              icon: "ℹ️",
            },
          }[t.type] || {
            bg: c.panelBg,
            border: c.panelBorder,
            text: c.t1,
            icon: "ℹ️",
          };
        return (
          <div
            key={t.id}
            style={{
              maxWidth: 380,
              width: "100%",
              padding: "12px 16px",
              borderRadius: 14,
              background: clr.bg,
              border: `1px solid ${clr.border}`,
              color: clr.text,
              fontSize: 13,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
              animation: t.leaving
                ? "cltToastOut 0.3s ease forwards"
                : "cltToastIn 0.3s ease",
              pointerEvents: "auto",
              WebkitBackdropFilter: "blur(12px)",
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{ fontSize: 16, flexShrink: 0 }}>{clr.icon}</span>
            <span style={{ flex: 1, lineHeight: 1.3 }}>{t.msg}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   BOTTOM SHEET
   ═══════════════════════════════════════ */
function BottomSheet({
  open,
  onClose,
  title,
  icon,
  c,
  children,
  maxWidth = 480,
}) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setClosing(false);
    }
  }, [open]);

  function handleClose() {
    setClosing(true);
    setTimeout(() => {
      setVisible(false);
      setClosing(false);
      onClose();
    }, 280);
  }

  if (!visible) return null;

  return (
    <div
      className="clt-overlay"
      onClick={handleClose}
      style={{
        opacity: closing ? 0 : 1,
        transition: "opacity 0.25s ease",
      }}
    >
      <div
        className="clt-sheet clt-safe-b"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: c.cardBg,
          maxWidth,
          animation: closing
            ? "cltSlideDown 0.28s ease forwards"
            : undefined,
          boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "10px 0 4px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: c.t4,
              opacity: 0.35,
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 20px 12px",
            borderBottom: `1px solid ${c.divider}`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 700,
              color: c.t1,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
            {title}
          </h3>
          <button
            onClick={handleClose}
            className="clt-btn"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: c.panelBg,
              border: `1px solid ${c.panelBorder}`,
              color: c.t3,
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
        <div
          className="clt-modal-scroll clt-no-sb"
          style={{
            flex: 1,
            padding: 20,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   ADMIN AUTH MODAL
   ═══════════════════════════════════════ */
function AdminAuthModal({ open, onClose, onSuccess, c, purpose = "export" }) {
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPw("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [open]);

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!pw.trim()) {
      setError("Password required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw, purpose }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.verified) {
        onSuccess(data);
        onClose();
      } else {
        setError(data?.error || "Invalid password or not admin");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Admin Verification"
      icon="🔐"
      c={c}
      maxWidth={400}
    >
      <form onSubmit={handleSubmit}>
        <p style={{ fontSize: 13, color: c.t3, margin: "0 0 16px" }}>
          {purpose === "export"
            ? "CSV export requires admin access."
            : "This action requires admin verification."}
        </p>
        <input
          ref={inputRef}
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError("");
          }}
          placeholder="Enter admin password"
          autoComplete="current-password"
          className="clt-input"
          style={{
            width: "100%",
            padding: "14px 16px",
            marginBottom: 12,
            background: c.inputBg,
            border: `1.5px solid ${error ? c.errorBorder : c.inputBorder}`,
            color: c.inputText,
            outline: "none",
            transition: "border-color 0.15s, box-shadow 0.15s",
            animation: error ? "cltShake 0.4s ease" : "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = c.inputBorderFocus;
            e.target.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? c.errorBorder
              : c.inputBorder;
            e.target.style.boxShadow = "none";
          }}
        />
        {error && (
          <div
            style={{
              fontSize: 12,
              color: c.errorText,
              marginBottom: 12,
              padding: "8px 12px",
              borderRadius: 10,
              background: c.errorBg,
              border: `1px solid ${c.errorBorder}`,
              animation: "cltFadeIn 0.2s ease",
            }}
          >
            ⚠️ {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="clt-btn"
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 14,
            background: loading
              ? c.panelBg
              : `linear-gradient(135deg, ${c.acc}, ${c.acc}dd)`,
            color: loading ? c.t3 : "#fff",
            fontSize: 15,
            fontWeight: 700,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Verifying..." : "🔓 Verify & Continue"}
        </button>
      </form>
    </BottomSheet>
  );
}

/* ═══════════════════════════════════════
   JOURNEY TIMELINE
   ═══════════════════════════════════════ */
function JourneyTimeline({ item, c }) {
  const steps = [];
  if (item.sourceDb === "SITTING" || item.sourceDb === "PENDING")
    steps.push({
      icon: "📥",
      label: "In Sitting",
      detail: item.sittingStatus ? `Status: ${item.sittingStatus}` : null,
      active: item.locationType === "SITTING" && !item.containerId,
    });
  if (item.containerId && item.mode)
    steps.push({
      icon: item.mode === "MEETING" ? "🗓️" : "🎯",
      label: `Assigned to ${item.mode}`,
      detail: item.date ? `Date: ${item.date}` : null,
      active:
        item.locationType === "MEETING" || item.locationType === "DIKSHA",
    });
  if (item.meetingDecision)
    steps.push({
      icon:
        item.meetingDecision === "CONFIRMED"
          ? "✅"
          : item.meetingDecision === "REJECTED"
            ? "❌"
            : "⏳",
      label: `Decision: ${item.meetingDecision}`,
      detail: null,
      active: false,
    });
  if (item.occupiedDate)
    steps.push({
      icon: "📅",
      label: `Occupied: ${item.occupiedDate}`,
      detail: null,
      active: true,
    });
  if (item.locationType === "PENDING")
    steps.push({
      icon: "⏸️",
      label: "Moved to Pending",
      detail: item.pausedAt
        ? `Since: ${formatDate(item.pausedAt)}`
        : null,
      active: true,
    });
  if (!steps.length)
    return (
      <div style={{ fontSize: 11, color: c.t4, padding: "8px 0" }}>
        No journey data.
      </div>
    );

  return (
    <div style={{ padding: "8px 0 4px" }}>
      {steps.map((s, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            position: "relative",
            paddingBottom: i < steps.length - 1 ? 14 : 0,
          }}
        >
          {i < steps.length - 1 && (
            <div
              style={{
                position: "absolute",
                left: 11,
                top: 24,
                bottom: 0,
                width: 2,
                background: c.divider,
              }}
            />
          )}
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              background: s.active ? c.acc + "22" : c.panelBg,
              border: `2px solid ${s.active ? c.acc : c.panelBorder}`,
            }}
          >
            {s.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: s.active ? 600 : 400,
                color: s.active ? c.t1 : c.t2,
              }}
            >
              {s.label}
            </div>
            {s.detail && (
              <div style={{ fontSize: 11, color: c.t3, marginTop: 1 }}>
                {s.detail}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════ */
function SkeletonCard({ c }) {
  const s = {
    borderRadius: 8,
    background: c.panelBg,
    animation: "cltPulse 1.5s ease-in-out infinite",
  };
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
        <div style={{ ...s, width: 44, height: 44, borderRadius: "50%" }} />
        <div style={{ flex: 1 }}>
          <div
            style={{
              ...s,
              width: "55%",
              height: 14,
              animationDelay: "0.1s",
            }}
          />
          <div
            style={{
              ...s,
              width: "35%",
              height: 10,
              marginTop: 8,
              animationDelay: "0.2s",
            }}
          />
        </div>
      </div>
      <div
        style={{
          ...s,
          width: "70%",
          height: 10,
          marginTop: 14,
          animationDelay: "0.3s",
        }}
      />
      <div
        style={{
          ...s,
          width: "45%",
          height: 10,
          marginTop: 8,
          animationDelay: "0.4s",
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════
   STATS
   ═══════════════════════════════════════ */
function EnhancedStats({ items, c }) {
  const stats = useMemo(() => {
    const s = {
      SITTING: 0,
      MEETING: 0,
      DIKSHA: 0,
      PENDING: 0,
      UNKNOWN: 0,
      total: items.length,
      stuck: 0,
    };
    let longestStuck = null;
    let longestMs = 0;
    for (const x of items) {
      const lt = x.locationType || "UNKNOWN";
      s[lt] = (s[lt] || 0) + 1;
      const td = getTrackingDate(x);
      if (td) {
        const ms = Date.now() - new Date(td).getTime();
        if (ms > 0 && ms > 7 * 86400000) s.stuck++;
        if (ms > longestMs) {
          longestMs = ms;
          longestStuck = x;
        }
      }
    }
    return { ...s, longestStuck, longestMs };
  }, [items]);

  const locs = [
    { key: "SITTING", icon: "📋", label: "Sit" },
    { key: "MEETING", icon: "🗓️", label: "Meet" },
    { key: "DIKSHA", icon: "🎯", label: "Dik" },
    { key: "PENDING", icon: "⏸️", label: "Pend" },
  ];

  return (
    <div style={{ marginBottom: 12 }}>
      <div className="clt-hscroll" style={{ marginBottom: 6 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 12,
            background: c.panelBg,
            border: `1px solid ${c.panelBorder}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12 }}>🌐</span>
          <span style={{ fontSize: 11, color: c.t3 }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: c.t1 }}>
            {stats.total}
          </span>
        </div>
        {locs.map((lt) => {
          const lc = getLocColor(lt.key, c);
          return (
            <div
              key={lt.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "6px 10px",
                borderRadius: 12,
                background: lc.bg,
                border: `1px solid ${lc.border}`,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 12 }}>{lt.icon}</span>
              <span style={{ fontSize: 11, color: lc.text }}>{lt.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: lc.text }}>
                {stats[lt.key]}
              </span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          gap: 3,
          height: 5,
          borderRadius: 3,
          overflow: "hidden",
          background: c.panelBg,
          marginBottom: 6,
        }}
      >
        {locs.map((lt) => {
          const lc = getLocColor(lt.key, c);
          const pct =
            stats.total > 0
              ? ((stats[lt.key] || 0) / stats.total) * 100
              : 0;
          if (pct === 0) return null;
          return (
            <div
              key={lt.key}
              style={{
                width: `${pct}%`,
                background: lc.dot,
                borderRadius: 3,
                transition: "width 0.5s ease",
              }}
            />
          );
        })}
      </div>
      {stats.stuck > 0 && (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
            padding: "8px 12px",
            borderRadius: 12,
            background: c.errorBg,
            border: `1px solid ${c.errorBorder}`,
            fontSize: 12,
          }}
        >
          <span style={{ color: c.errorText, fontWeight: 600 }}>
            🚨 {stats.stuck} stuck (7+d)
          </span>
          {stats.longestStuck && (
            <span style={{ color: c.t3 }}>
              Longest:{" "}
              <b style={{ color: c.errorText }}>
                {stats.longestStuck.name}
              </b>{" "}
              ({Math.floor(stats.longestMs / 86400000)}d)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   QUICK NOTES
   ═══════════════════════════════════════ */
function QuickNotesPanel({ customerId, c, notes, onAddNote }) {
  const [text, setText] = useState("");
  const myNotes = (notes[customerId] || []).slice(-5).reverse();
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && text.trim()) {
              onAddNote(customerId, text.trim());
              setText("");
            }
          }}
          className="clt-input"
          style={{
            flex: 1,
            padding: "8px 12px",
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            color: c.inputText,
            outline: "none",
          }}
          onClick={(e) => e.stopPropagation()}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (text.trim()) {
              onAddNote(customerId, text.trim());
              setText("");
            }
          }}
          className="clt-btn"
          style={{
            padding: "0 14px",
            borderRadius: 10,
            background: c.acc,
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          +
        </button>
      </div>
      {myNotes.map((n, i) => (
        <div
          key={i}
          style={{
            fontSize: 11,
            color: c.t3,
            padding: "4px 8px",
            marginBottom: 3,
            borderLeft: `2px solid ${c.acc}33`,
          }}
        >
          <span style={{ color: c.t4 }}>{formatTime(n.time)}</span>{" "}
          <span style={{ color: c.t2 }}>{n.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   TAG CHIPS
   ═══════════════════════════════════════ */
function TagChips({ customerId, tags, onToggleTag, c }) {
  const myTags = tags[customerId] || [];
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
      {DEFAULT_TAG_LIST.map((tag) => {
        const active = myTags.includes(tag);
        const tc =
          TAG_COLORS[DEFAULT_TAG_LIST.indexOf(tag) % TAG_COLORS.length];
        return (
          <button
            key={tag}
            onClick={(e) => {
              e.stopPropagation();
              onToggleTag(customerId, tag);
            }}
            style={{
              fontSize: 10,
              fontWeight: active ? 600 : 400,
              padding: "3px 8px",
              borderRadius: 6,
              background: active ? tc.bg : "transparent",
              border: `1px solid ${active ? tc.border : c.panelBorder}`,
              color: active ? tc.text : c.t4,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   LOCATION CARD
   ═══════════════════════════════════════ */
function LocationCard({
  item,
  c,
  isLight,
  index,
  viewMode,
  onOpenProfile,
  now,
  pinned,
  onTogglePin,
  notes,
  onAddNote,
  tags,
  onToggleTag,
  addToast,
  reminders,
}) {
  const [expanded, setExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showTags, setShowTags] = useState(false);
  const [copied, setCopied] = useState(null);
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchRef = useRef(null);
  const touchYRef = useRef(null);

  const gender = (item.gender || "").toUpperCase();
  const ga = getGenderAccent(gender, isLight);
  const lc = getLocColor(item.locationType, c);
  const trackDate = getTrackingDate(item);
  const ts = timeSince(trackDate);
  const severity = ts ? getTimeSeverity(ts.total) : "fresh";
  const sc = severityColor(severity, c);
  const isPinned = pinned.includes(item._id);
  const myTags = tags[item._id] || [];
  const myNotes = notes[item._id] || [];
  const hasReminder = reminders.some(
    (r) => r.customerId === item._id && new Date(r.time) > new Date()
  );

  const onTS = (e) => {
    touchRef.current = e.touches[0].clientX;
    touchYRef.current = e.touches[0].clientY;
    setSwiping(false);
    setSwipeX(0);
  };
  const onTM = (e) => {
    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current;
    const dy = e.touches[0].clientY - touchYRef.current;
    if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setSwiping(true);
      setSwipeX(Math.max(-80, Math.min(80, dx)));
    }
  };
  const onTE = () => {
    if (swiping && swipeX > 50 && item.phone) {
      window.open(`tel:${item.phone}`, "_self");
      addToast(`Calling ${item.name}...`, "info");
    } else if (swiping && swipeX < -50) onOpenProfile();
    setSwiping(false);
    setSwipeX(0);
    touchRef.current = null;
  };

  function handleCopy(label, text) {
    if (copyText(text)) {
      setCopied(label);
      addToast(`${label} copied!`, "success", 1500);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  function openWhatsApp() {
    const phone = (item.phone || "").replace(/\D/g, "");
    if (!phone) {
      addToast("No phone number", "warning");
      return;
    }
    const msg = encodeURIComponent(
      `Hi ${item.name || ""}, your ${item.mode || "session"} is scheduled${item.date ? ` for ${item.date}` : ""}. Please confirm.`
    );
    window.open(`https://wa.me/91${phone}?text=${msg}`, "_blank");
  }

  const isList = viewMode === "list";

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      {swiping && swipeX > 15 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(34,197,94,0.15)",
            borderRadius: "16px 0 0 16px",
            zIndex: 0,
            fontSize: 22,
          }}
        >
          📞
        </div>
      )}
      {swiping && swipeX < -15 && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(99,102,241,0.15)",
            borderRadius: "0 16px 16px 0",
            zIndex: 0,
            fontSize: 22,
          }}
        >
          👤
        </div>
      )}

      <div
        className="clt-card"
        onTouchStart={onTS}
        onTouchMove={onTM}
        onTouchEnd={onTE}
        style={{
          position: "relative",
          zIndex: 1,
          display: isList ? "flex" : "block",
          alignItems: isList ? "center" : undefined,
          gap: isList ? 12 : undefined,
          background: c.cardBg,
          border: `1px solid ${severity === "stuck" ? c.errorBorder : isPinned ? c.acc + "44" : c.cardBorder}`,
          borderRadius: 16,
          padding: isList ? "12px 14px" : 16,
          cursor: "pointer",
          transform: swiping ? `translateX(${swipeX * 0.5}px)` : "none",
          boxShadow:
            severity === "stuck"
              ? `0 0 16px ${c.errorBorder}`
              : isPinned
                ? `0 0 12px ${c.acc}22`
                : c.cardShadow,
          animation: "cltFadeIn 0.35s ease both",
          animationDelay: `${Math.min(index * 0.04, 0.6)}s`,
        }}
      >
        {severity === "stuck" && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 16,
              border: `2px solid ${c.errorBorder}`,
              animation: "cltStuckPulse 2s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
        )}
        {isPinned && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              fontSize: 14,
              animation: "cltBounceIn 0.3s ease",
              zIndex: 2,
            }}
          >
            📌
          </div>
        )}

        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flex: isList ? 1 : undefined,
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              minWidth: 44,
              borderRadius: "50%",
              background: ga.avatarBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 700,
              fontSize: 18,
              border: `2px solid ${ga.border}`,
              position: "relative",
            }}
          >
            {item.name
              ? item.name.charAt(0).toUpperCase()
              : getGenderIcon(gender)}
            <div
              style={{
                position: "absolute",
                bottom: -2,
                right: -2,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: lc.bg,
                border: `2px solid ${lc.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 8,
              }}
            >
              {getLocIcon(item.locationType)}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: c.t1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: isList ? 140 : "100%",
                }}
              >
                {item.name}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: ga.text,
                  padding: "1px 5px",
                  borderRadius: 6,
                  background: ga.bg,
                  border: `1px solid ${ga.border}`,
                }}
              >
                {getGenderIcon(gender)}
              </span>
              {item.rollNo && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopy("Roll", item.rollNo);
                  }}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 7,
                    background: c.badgeBg,
                    border: `1px solid ${c.badgeBorder}`,
                    color: c.badgeText,
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  #{item.rollNo}
                </button>
              )}
              {hasReminder && <span style={{ fontSize: 11 }}>⏰</span>}
            </div>

            {item.remarksBy && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 10,
                  color: c.t4,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                👤{" "}
                <span style={{ color: c.acc, fontWeight: 500 }}>
                  {item.remarksBy}
                </span>
              </div>
            )}

            {myTags.length > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 3,
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                {myTags.slice(0, 3).map((tag) => {
                  const tc =
                    TAG_COLORS[
                      DEFAULT_TAG_LIST.indexOf(tag) % TAG_COLORS.length
                    ];
                  return (
                    <span
                      key={tag}
                      style={{
                        fontSize: 9,
                        padding: "1px 5px",
                        borderRadius: 4,
                        background: tc.bg,
                        color: tc.text,
                        fontWeight: 600,
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
                {myTags.length > 3 && (
                  <span style={{ fontSize: 9, color: c.t4 }}>
                    +{myTags.length - 3}
                  </span>
                )}
              </div>
            )}

            {isList && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  marginTop: 3,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {item.date && (
                  <span style={{ fontSize: 11, color: c.t3 }}>
                    📅 {item.date}
                  </span>
                )}
                {ts && (
                  <span style={{ fontSize: 11, color: sc.text }}>
                    ⏱️ {ts.label}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grid extended */}
        {!isList && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                gap: 6,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 10,
                  background: lc.bg,
                  border: `1px solid ${lc.border}`,
                  color: lc.text,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: lc.dot,
                  }}
                />
                {getLocIcon(item.locationType)} {item.locationLabel}
              </span>
              {ts && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "3px 8px",
                    borderRadius: 8,
                    background: sc.bg,
                    border: `1px solid ${sc.border}`,
                    color: sc.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  ⏱️ {ts.label} {severity === "stuck" && "⚠️"}
                </span>
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: c.t2,
                lineHeight: 1.5,
              }}
            >
              {item.locationType === "PENDING" ? (
                <>
                  <div>
                    Paused:{" "}
                    <b style={{ color: c.t1 }}>
                      {item.pausedAt
                        ? formatDate(item.pausedAt)
                        : "—"}
                    </b>
                  </div>
                  {item.mode && (
                    <div>
                      Last: <b style={{ color: c.t1 }}>{item.mode}</b>
                    </div>
                  )}
                </>
              ) : item.locationType !== "SITTING" || item.containerId ? (
                <>
                  {item.date && (
                    <div>
                      Date: <b style={{ color: c.t1 }}>{item.date}</b>
                    </div>
                  )}
                  {item.mode && (
                    <div>
                      Mode: <b style={{ color: c.t1 }}>{item.mode}</b>
                    </div>
                  )}
                  {item.meetingDecision && (
                    <div>
                      Decision:{" "}
                      <b style={{ color: c.t1 }}>
                        {item.meetingDecision}
                      </b>
                    </div>
                  )}
                </>
              ) : (
                <div>
                  Status:{" "}
                  <b style={{ color: c.t1 }}>
                    {item.sittingStatus || "—"}
                  </b>
                </div>
              )}
            </div>

            {item.containerId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy("ID", item.containerId);
                }}
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: c.t4,
                  background: c.panelBg,
                  border: `1px solid ${c.panelBorder}`,
                  borderRadius: 8,
                  padding: "3px 8px",
                  cursor: "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: "100%",
                  display: "block",
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                🔗 {item.containerId}
              </button>
            )}

            {item.occupiedDate && (
              <div
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 10,
                  background: isLight
                    ? "rgba(16,185,129,0.06)"
                    : "rgba(16,185,129,0.10)",
                  border: `1px solid ${isLight ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.20)"}`,
                  color: isLight ? "#059669" : "#6ee7b7",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                📅 Occupied: <b>{item.occupiedDate}</b>
              </div>
            )}

            {myNotes.length > 0 && !showNotes && (
              <div style={{ marginTop: 4, fontSize: 10, color: c.t4 }}>
                📝 {myNotes.length} note{myNotes.length > 1 ? "s" : ""}
              </div>
            )}

            {/* Actions */}
            <div
              className="clt-hscroll"
              style={{ marginTop: 10, gap: 5, paddingBottom: 0 }}
            >
              {[
                {
                  icon: "👤",
                  label: "Profile",
                  fn: () => onOpenProfile(),
                  active: false,
                },
                {
                  icon: "📌",
                  label: isPinned ? "Pinned" : "Pin",
                  fn: () => onTogglePin(item._id),
                  active: isPinned,
                },
                {
                  icon: "💬",
                  label: "WA",
                  fn: openWhatsApp,
                  active: false,
                  green: true,
                },
                {
                  icon: "🛤️",
                  label: expanded ? "▲" : "▼",
                  fn: () => setExpanded((p) => !p),
                  active: expanded,
                },
                {
                  icon: "📝",
                  label: "",
                  fn: () => setShowNotes((p) => !p),
                  active: showNotes,
                },
                {
                  icon: "🏷️",
                  label: "",
                  fn: () => setShowTags((p) => !p),
                  active: showTags,
                },
              ].map((btn, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    btn.fn();
                  }}
                  className="clt-btn"
                  style={{
                    fontSize: 11,
                    padding: "6px 10px",
                    borderRadius: 8,
                    minHeight: 34,
                    flexShrink: 0,
                    background: btn.active
                      ? c.acc + "18"
                      : btn.green
                        ? "rgba(37,211,102,0.08)"
                        : c.panelBg,
                    border: `1px solid ${btn.active ? c.acc : btn.green ? "rgba(37,211,102,0.2)" : c.panelBorder}`,
                    color: btn.active
                      ? c.acc
                      : btn.green
                        ? "#25D366"
                        : c.t3,
                    fontWeight: 500,
                  }}
                >
                  {btn.icon}
                  {btn.label ? ` ${btn.label}` : ""}
                </button>
              ))}
            </div>

            {expanded && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: c.panelBg,
                  border: `1px solid ${c.panelBorder}`,
                  animation: "cltFadeIn 0.25s ease",
                }}
              >
                <JourneyTimeline item={item} c={c} />
              </div>
            )}
            {showNotes && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: c.panelBg,
                  border: `1px solid ${c.panelBorder}`,
                  animation: "cltFadeIn 0.25s ease",
                }}
              >
                <QuickNotesPanel
                  customerId={item._id}
                  c={c}
                  notes={notes}
                  onAddNote={onAddNote}
                />
              </div>
            )}
            {showTags && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  borderRadius: 12,
                  background: c.panelBg,
                  border: `1px solid ${c.panelBorder}`,
                  animation: "cltFadeIn 0.25s ease",
                }}
              >
                <TagChips
                  customerId={item._id}
                  tags={tags}
                  onToggleTag={onToggleTag}
                  c={c}
                />
              </div>
            )}
          </>
        )}

        {/* List mode right */}
        {isList && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: "3px 8px",
                borderRadius: 8,
                background: lc.bg,
                border: `1px solid ${lc.border}`,
                color: lc.text,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: lc.dot,
                }}
              />
              {item.locationLabel}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(item._id);
              }}
              className="clt-btn"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                fontSize: 13,
                background: isPinned ? c.acc + "18" : c.panelBg,
                border: `1px solid ${isPinned ? c.acc : c.panelBorder}`,
              }}
            >
              {isPinned ? "📌" : "○"}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenProfile();
              }}
              className="clt-btn"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                fontSize: 13,
                background: c.panelBg,
                border: `1px solid ${c.panelBorder}`,
              }}
            >
              👤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   GROUP HEADER
   ═══════════════════════════════════════ */
function GroupHeader({ type, count, c }) {
  const lc = getLocColor(type, c);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 0",
        marginTop: 8,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: lc.text,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        {getLocIcon(type)} {type}
      </span>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          padding: "2px 10px",
          borderRadius: 8,
          background: lc.bg,
          border: `1px solid ${lc.border}`,
          color: lc.text,
        }}
      >
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: c.divider }} />
    </div>
  );
}

/* ═══════════════════════════════════════
   KANBAN
   ═══════════════════════════════════════ */
function KanbanBoard({ items, c, isLight, onMoveCustomer, lockInfo, addToast }) {
  const columns = ["SITTING", "MEETING", "DIKSHA", "PENDING"];
  const grouped = useMemo(() => {
    const g = {};
    columns.forEach((k) => (g[k] = []));
    items.forEach((x) => {
      const k = x.locationType || "UNKNOWN";
      if (g[k]) g[k].push(x);
    });
    return g;
  }, [items]);

  const isLocked = lockInfo.locked;
  const lockRemaining = isLocked
    ? Math.max(
        0,
        Math.ceil(
          (LOCK_DURATION_MS - (Date.now() - lockInfo.lastMoveTime)) / 60000
        )
      )
    : 0;

  return (
    <div>
      {isLocked && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            borderRadius: 12,
            background: "rgba(249,115,22,0.10)",
            border: "1px solid rgba(249,115,22,0.25)",
            fontSize: 12,
            color: "#f97316",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          🔒 Admin locked — {lockRemaining}min left
        </div>
      )}
      <div className="clt-kanban clt-no-sb">
        {columns.map((col) => {
          const lc = getLocColor(col, c);
          const colItems = grouped[col] || [];
          return (
            <div
              key={col}
              className="clt-kcol"
              style={{
                background: c.panelBg,
                border: `1px solid ${c.panelBorder}`,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "12px 14px",
                  borderBottom: `1px solid ${c.divider}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: lc.bg,
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: lc.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {getLocIcon(col)} {col}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    padding: "2px 10px",
                    borderRadius: 8,
                    background: lc.border,
                    color: lc.text,
                  }}
                >
                  {colItems.length}
                </span>
              </div>
              <div
                className="clt-no-sb"
                style={{
                  padding: 10,
                  maxHeight: "60vh",
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                {colItems.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 12px",
                      fontSize: 12,
                      color: c.t4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 28,
                        marginBottom: 6,
                        opacity: 0.4,
                      }}
                    >
                      📭
                    </div>
                    Empty
                  </div>
                ) : (
                  colItems.map((item) => (
                    <KanbanCard
                      key={item._id}
                      item={item}
                      c={c}
                      isLight={isLight}
                      currentCol={col}
                      columns={columns}
                      onMove={(target) => onMoveCustomer(item, col, target)}
                      isLocked={isLocked}
                      addToast={addToast}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KanbanCard({
  item,
  c,
  isLight,
  currentCol,
  columns,
  onMove,
  isLocked,
  addToast,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const ga = getGenderAccent((item.gender || "").toUpperCase(), isLight);
  const targets = columns.filter((x) => x !== currentCol);

  return (
    <div
      style={{
        background: c.cardBg,
        border: `1px solid ${c.cardBorder}`,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        animation: "cltFadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: ga.avatarBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          {item.name ? item.name.charAt(0).toUpperCase() : "?"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: c.t1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.name}
          </div>
          {item.rollNo && (
            <div style={{ fontSize: 10, color: c.t4 }}>#{item.rollNo}</div>
          )}
        </div>
      </div>
      {item.date && (
        <div style={{ fontSize: 11, color: c.t3, marginBottom: 4 }}>
          📅 {item.date}
        </div>
      )}
      {item.remarksBy && (
        <div style={{ fontSize: 10, color: c.t4, marginBottom: 4 }}>
          👤 {item.remarksBy}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isLocked) {
              addToast("🔒 Locked — wait for cooldown", "warning");
              return;
            }
            setShowMenu((p) => !p);
          }}
          className="clt-btn"
          style={{
            width: "100%",
            padding: "8px 0",
            borderRadius: 8,
            minHeight: 36,
            background: isLocked ? c.panelBg : c.acc + "12",
            border: `1px solid ${isLocked ? c.panelBorder : c.acc + "33"}`,
            color: isLocked ? c.t4 : c.acc,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {isLocked ? "🔒 Locked" : "↕️ Move to..."}
        </button>

        {showMenu && !isLocked && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              marginBottom: 4,
              background: c.cardBg,
              border: `1px solid ${c.panelBorder}`,
              borderRadius: 10,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              animation: "cltFadeIn 0.2s ease",
              zIndex: 10,
            }}
          >
            {targets.map((t) => {
              const tlc = getLocColor(t, c);
              return (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(t);
                    setShowMenu(false);
                  }}
                  className="clt-btn"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: "transparent",
                    color: tlc.text,
                    fontSize: 12,
                    fontWeight: 600,
                    borderBottom: `1px solid ${c.divider}`,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    justifyContent: "flex-start",
                  }}
                >
                  {getLocIcon(t)} {t}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   ACTIVITY FEED
   ═══════════════════════════════════════ */
function ActivityFeed({ activities, c }) {
  if (!activities.length)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "24px 0",
          fontSize: 12,
          color: c.t4,
        }}
      >
        No activity yet
      </div>
    );
  return (
    <div>
      {activities.slice(0, 20).map((a, i) => (
        <div
          key={i}
          style={{
            padding: "8px 0",
            borderBottom:
              i < 19 ? `1px solid ${c.divider}` : "none",
            animation: "cltFadeIn 0.2s ease",
            animationDelay: `${i * 0.05}s`,
            animationFillMode: "both",
          }}
        >
          <div
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span style={{ fontSize: 14 }}>{a.icon}</span>
            <span
              style={{
                flex: 1,
                fontSize: 12,
                color: c.t2,
                lineHeight: 1.3,
              }}
            >
              {a.text}
            </span>
          </div>
          <div
            style={{
              fontSize: 10,
              color: c.t4,
              marginTop: 2,
              paddingLeft: 24,
            }}
          >
            {formatTime(a.time)} • {formatDate(a.time)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   SMART SUGGESTIONS
   ═══════════════════════════════════════ */
function SmartSuggestions({ items, c }) {
  const suggestions = useMemo(() => getSmartSuggestions(items), [items]);
  if (!suggestions.length) return null;
  return (
    <div style={{ marginBottom: 12, animation: "cltFadeIn 0.4s ease" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: c.t4,
          marginBottom: 6,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        🤖 Insights
      </div>
      <div className="clt-hscroll">
        {suggestions.map((s, i) => {
          const clr =
            {
              warning: {
                bg: c.errorBg,
                border: c.errorBorder,
                text: c.errorText,
              },
              info: {
                bg: c.panelBg,
                border: c.panelBorder,
                text: c.t2,
              },
              success: {
                bg: c.statusActive.bg,
                border: c.statusActive.border,
                text: c.statusActive.text,
              },
            }[s.type];
          return (
            <div
              key={i}
              style={{
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 10,
                flexShrink: 0,
                background: clr.bg,
                border: `1px solid ${clr.border}`,
                color: clr.text,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span>{s.icon}</span>
              {s.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   REMINDER MODAL
   ═══════════════════════════════════════ */
function ReminderModal({
  open,
  onClose,
  c,
  reminders,
  onAddReminder,
  onDeleteReminder,
  items,
}) {
  const [selCustomer, setSelCustomer] = useState("");
  const [reminderTime, setReminderTime] = useState("");
  const [reminderNote, setReminderNote] = useState("");
  const active = reminders.filter((r) => new Date(r.time) > new Date());
  const past = reminders
    .filter((r) => new Date(r.time) <= new Date())
    .slice(-10);

  function handleAdd() {
    if (!selCustomer || !reminderTime) return;
    const item = items.find((x) => x._id === selCustomer);
    onAddReminder({
      customerId: selCustomer,
      customerName: item?.name || "Unknown",
      time: new Date(reminderTime).toISOString(),
      note: reminderNote,
    });
    setSelCustomer("");
    setReminderTime("");
    setReminderNote("");
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Reminders"
      icon="⏰"
      c={c}
    >
      <div
        style={{
          padding: 14,
          borderRadius: 14,
          background: c.panelBg,
          border: `1px solid ${c.panelBorder}`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: c.t1,
            marginBottom: 10,
          }}
        >
          ➕ New
        </div>
        <select
          value={selCustomer}
          onChange={(e) => setSelCustomer(e.target.value)}
          className="clt-select"
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            marginBottom: 8,
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            color: c.inputText,
            outline: "none",
          }}
        >
          <option value="">Select customer...</option>
          {items.map((x) => (
            <option key={x._id} value={x._id}>
              {x.name} (#{x.rollNo})
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          className="clt-input"
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 8,
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            color: c.inputText,
            outline: "none",
          }}
        />
        <input
          value={reminderNote}
          onChange={(e) => setReminderNote(e.target.value)}
          placeholder="Note (optional)"
          className="clt-input"
          style={{
            width: "100%",
            padding: "10px 12px",
            marginBottom: 10,
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            color: c.inputText,
            outline: "none",
          }}
        />
        <button
          onClick={handleAdd}
          className="clt-btn"
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            background: c.acc,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          ⏰ Set Reminder
        </button>
      </div>
      {active.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: c.t1,
              marginBottom: 8,
            }}
          >
            🔔 Active ({active.length})
          </div>
          {active.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 12,
                background: c.statusActive.bg,
                border: `1px solid ${c.statusActive.border}`,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 14 }}>⏰</span>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.t1,
                  }}
                >
                  {r.customerName}
                </div>
                <div style={{ fontSize: 11, color: c.t3 }}>
                  {formatDate(r.time)} {formatTime(r.time)}
                  {r.note && ` — ${r.note}`}
                </div>
              </div>
              <button
                onClick={() => onDeleteReminder(i)}
                className="clt-btn"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: c.errorBg,
                  color: c.errorText,
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 12,
              color: c.t3,
              marginBottom: 6,
            }}
          >
            📜 Past
          </div>
          {past.map((r, i) => (
            <div
              key={i}
              style={{
                padding: "5px 10px",
                borderRadius: 8,
                marginBottom: 3,
                fontSize: 11,
                color: c.t4,
                borderLeft: `2px solid ${c.divider}`,
              }}
            >
              {r.customerName} — {formatDate(r.time)}{" "}
              {r.note && `• ${r.note}`}
            </div>
          ))}
        </div>
      )}
    </BottomSheet>
  );
}

/* ═══════════════════════════════════════════════════════
   ████  MAIN COMPONENT  ████
   ═══════════════════════════════════════════════════════ */
export default function CustomerLocationTracker() {
  const { theme, mounted } = useTheme();
  const isLight = theme === "light";
  const c = isLight ? PT.light : PT.dark;

  const [items, setItems] = useState([]);
  const [currentUser, setCurrentUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [filterLoc, setFilterLoc] = useState("ALL");
  const [filterGender, setFilterGender] = useState("ALL");
  const [datePreset, setDatePreset] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sortBy, setSortBy] = useState("stuck");
  const [viewMode, setViewMode] = useState("grid");
  const [grouped, setGrouped] = useState(false);
  const [stuckOnly, setStuckOnly] = useState(false);
  const [occupiedOnly, setOccupiedOnly] = useState(false);
  const [byMeOnly, setByMeOnly] = useState(false);
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  const [pinned, setPinned] = useState([]);
  const [notes, setNotes] = useState({});
  const [tags, setTags] = useState({});
  const [activities, setActivities] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [filterPresets, setFilterPresets] = useState([]);
  const [kanbanLock, setKanbanLock] = useState({
    locked: false,
    lastMoveTime: 0,
  });
  const [filterTagName, setFilterTagName] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState(null);
  const [adminAuthOpen, setAdminAuthOpen] = useState(false);
  const [adminAuthPurpose, setAdminAuthPurpose] = useState("export");
  const [adminAuthCallback, setAdminAuthCallback] = useState(null);
  const [showActivityFeed, setShowActivityFeed] = useState(false);
  const [showReminders, setShowReminders] = useState(false);
  const [showSavePreset, setShowSavePreset] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [isListening, setIsListening] = useState(false);

  const { toasts, addToast } = useToasts();
  const searchRef = useRef(null);
  const autoRef = useRef(null);

  // Load prefs
  useEffect(() => {
    setViewMode(getLS(VIEW_KEY, "grid") || "grid");
    setGrouped(getLS(GROUP_KEY, false));
    setPinned(getLS(PIN_KEY, []));
    setNotes(getLS(NOTES_KEY, {}));
    setTags(getLS(TAGS_KEY, {}));
    setReminders(getLS(REMINDERS_KEY, []));
    setFilterPresets(getLS(PRESETS_KEY, []));
    setActivities(getLS(ACTIVITY_KEY, []).slice(-50));
    const kl = getLS(KANBAN_LOCK_KEY, {
      locked: false,
      lastMoveTime: 0,
    });
    if (kl.locked && Date.now() - kl.lastMoveTime > LOCK_DURATION_MS) {
      kl.locked = false;
      setLS(KANBAN_LOCK_KEY, kl);
    }
    setKanbanLock(kl);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  // Reminder check
  useEffect(() => {
    const iv = setInterval(() => {
      const n = new Date();
      reminders.forEach((r) => {
        const diff = new Date(r.time).getTime() - n.getTime();
        if (diff > 0 && diff < 61000)
          addToast(
            `⏰ Follow up: ${r.customerName}${r.note ? ` — ${r.note}` : ""}`,
            "warning",
            8000
          );
      });
    }, 60000);
    return () => clearInterval(iv);
  }, [reminders, addToast]);

  // Kanban lock timer
  useEffect(() => {
    if (!kanbanLock.locked) return;
    const iv = setInterval(() => {
      if (Date.now() - kanbanLock.lastMoveTime > LOCK_DURATION_MS) {
        const u = {
          locked: false,
          lastMoveTime: kanbanLock.lastMoveTime,
        };
        setKanbanLock(u);
        setLS(KANBAN_LOCK_KEY, u);
        addToast("🔓 Kanban unlocked!", "success");
      }
    }, 10000);
    return () => clearInterval(iv);
  }, [kanbanLock, addToast]);

  // Fetch — uses fetch() only, NO direct DB import
  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/customers/location");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error || "Failed");
        setItems([]);
        return;
      }
      setItems(data.items || []);
      if (data.currentUser) setCurrentUser(data.currentUser);
      setLastRefreshTime(Date.now());
    } catch {
      setErr("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefreshActive) return;
    autoRef.current = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(autoRef.current);
  }, [autoRefreshActive, load]);

  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000);
  useEffect(() => {
    if (!autoRefreshActive) return;
    const iv = setInterval(
      () =>
        setCountdown(
          Math.max(
            0,
            Math.ceil(
              (AUTO_REFRESH_MS - (Date.now() - lastRefreshTime)) / 1000
            )
          )
        ),
      1000
    );
    return () => clearInterval(iv);
  }, [autoRefreshActive, lastRefreshTime]);

  // Keyboard
  useEffect(() => {
    function handleKey(e) {
      if (
        ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
      ) {
        if (e.key === "Escape") {
          setQ("");
          searchRef.current?.blur();
        }
        return;
      }
      switch (e.key) {
        case "/":
          e.preventDefault();
          searchRef.current?.focus();
          break;
        case "Escape":
          setQ("");
          break;
        case "r":
        case "R":
          if (!e.ctrlKey && !e.metaKey) handleRefresh();
          break;
        case "g":
        case "G":
          if (!e.ctrlKey && !e.metaKey) toggleGroup();
          break;
        case "k":
        case "K":
          if (!e.ctrlKey && !e.metaKey)
            setViewMode((p) => {
              const n = p === "kanban" ? "grid" : "kanban";
              setLS(VIEW_KEY, n);
              return n;
            });
          break;
        case "b":
        case "B":
          if (!e.ctrlKey && !e.metaKey) setByMeOnly((p) => !p);
          break;
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  function startVoiceSearch() {
    const SR =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addToast("Voice search not supported", "warning");
      return;
    }
    const r = new SR();
    r.lang = "en-IN";
    r.continuous = false;
    r.interimResults = false;
    r.onstart = () => setIsListening(true);
    r.onend = () => setIsListening(false);
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setQ(t);
      addToast(`🎤 "${t}"`, "info");
    };
    r.onerror = () => {
      setIsListening(false);
      addToast("Voice failed", "warning");
    };
    r.start();
  }

  function handleRefresh() {
    setRefreshSpin(true);
    load();
    setTimeout(() => setRefreshSpin(false), 700);
  }
  function toggleView() {
    setViewMode((p) => {
      const o = ["grid", "list", "kanban"];
      const n = o[(o.indexOf(p) + 1) % o.length];
      setLS(VIEW_KEY, n);
      return n;
    });
  }
  function toggleGroup() {
    setGrouped((p) => {
      const n = !p;
      setLS(GROUP_KEY, n);
      return n;
    });
  }
  function openProfile(item) {
    setProfileCustomer(item);
    setProfileOpen(true);
  }

  function togglePin(id) {
    setPinned((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      setLS(PIN_KEY, next);
      const item = items.find((x) => x._id === id);
      addToast(
        next.includes(id)
          ? `📌 Pinned ${item?.name || ""}`
          : "Unpinned",
        "info",
        1500
      );
      return next;
    });
  }

  function addNote(customerId, text) {
    setNotes((prev) => {
      const updated = {
        ...prev,
        [customerId]: [
          ...(prev[customerId] || []),
          { text, time: new Date().toISOString() },
        ],
      };
      setLS(NOTES_KEY, updated);
      return updated;
    });
    addToast("📝 Note added", "success", 1500);
    logActivity(
      "📝",
      `Note: ${items.find((x) => x._id === customerId)?.name || "customer"}`
    );
  }

  function toggleTag(customerId, tag) {
    setTags((prev) => {
      const my = prev[customerId] || [];
      const updated = {
        ...prev,
        [customerId]: my.includes(tag)
          ? my.filter((t) => t !== tag)
          : [...my, tag],
      };
      setLS(TAGS_KEY, updated);
      return updated;
    });
  }

  function logActivity(icon, text) {
    setActivities((prev) => {
      const updated = [
        { icon, text, time: new Date().toISOString() },
        ...prev,
      ].slice(0, 50);
      setLS(ACTIVITY_KEY, updated);
      return updated;
    });
  }

  function addReminder(r) {
    setReminders((prev) => {
      const u = [...prev, r];
      setLS(REMINDERS_KEY, u);
      return u;
    });
    addToast(`⏰ Reminder set for ${r.customerName}`, "success");
    logActivity("⏰", `Reminder: ${r.customerName}`);
  }
  function deleteReminder(idx) {
    setReminders((prev) => {
      const u = prev.filter((_, i) => i !== idx);
      setLS(REMINDERS_KEY, u);
      return u;
    });
    addToast("Reminder removed", "info", 1500);
  }

  function saveCurrentFilters(name) {
    if (!name.trim()) return;
    const f = {
      filterLoc,
      filterGender,
      datePreset,
      customFrom,
      customTo,
      stuckOnly,
      occupiedOnly,
      sortBy,
      filterTagName,
      byMeOnly,
    };
    setFilterPresets((prev) => {
      const u = [...prev, { name: name.trim(), filters: f }];
      setLS(PRESETS_KEY, u);
      return u;
    });
    addToast(`💾 Saved: "${name}"`, "success");
    setShowSavePreset(false);
    setPresetName("");
  }
  function applyPreset(f) {
    if (f.filterLoc) setFilterLoc(f.filterLoc);
    if (f.filterGender) setFilterGender(f.filterGender);
    if (f.datePreset) setDatePreset(f.datePreset);
    if (f.customFrom !== undefined) setCustomFrom(f.customFrom);
    if (f.customTo !== undefined) setCustomTo(f.customTo);
    if (f.stuckOnly !== undefined) setStuckOnly(f.stuckOnly);
    if (f.occupiedOnly !== undefined) setOccupiedOnly(f.occupiedOnly);
    if (f.sortBy) setSortBy(f.sortBy);
    if (f.filterTagName !== undefined) setFilterTagName(f.filterTagName);
    if (f.byMeOnly !== undefined) setByMeOnly(f.byMeOnly);
    addToast("⚡ Preset applied", "info", 1500);
  }
  function deletePreset(idx) {
    setFilterPresets((prev) => {
      const u = prev.filter((_, i) => i !== idx);
      setLS(PRESETS_KEY, u);
      return u;
    });
  }

  // CSV Export
  function requestCSVExport() {
    setAdminAuthPurpose("export");
    setAdminAuthCallback(() => () => doCSVExport());
    setAdminAuthOpen(true);
  }
  function doCSVExport() {
    const headers = [
      "Name",
      "Roll No",
      "Gender",
      "Phone",
      "Location",
      "Date",
      "Mode",
      "Status",
      "Decision",
      "Occupied",
      "RemarksBy",
      "Container ID",
    ];
    const rows = processed.map((it) =>
      [
        it.name,
        it.rollNo,
        it.gender,
        it.phone,
        it.locationType,
        it.date,
        it.mode,
        it.sittingStatus,
        it.meetingDecision,
        it.occupiedDate,
        it.remarksBy,
        it.containerId,
      ].map((v) => `"${String(v || "").replace(/"/g, '""')}"`)
    );
    const csv =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast(`📥 Exported ${processed.length} customers`, "success");
    logActivity("📥", `CSV — ${processed.length} records`);
  }

  // Kanban move
  function requestKanbanMove(item, fromCol, toCol) {
    setAdminAuthPurpose("kanban");
    setAdminAuthCallback(
      () => () => doKanbanMove(item, fromCol, toCol)
    );
    setAdminAuthOpen(true);
  }
  async function doKanbanMove(item, fromCol, toCol) {
    try {
      const res = await fetch("/api/customers/move-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: item._id,
          rollNo: item.rollNo,
          from: fromCol,
          to: toCol,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast(data?.error || "Move failed", "error");
        return;
      }
      addToast(
        `✅ ${item.name}: ${fromCol} → ${toCol}`,
        "success"
      );
      logActivity("↕️", `${item.name}: ${fromCol} → ${toCol}`);
      const lockData = { locked: true, lastMoveTime: Date.now() };
      setKanbanLock(lockData);
      setLS(KANBAN_LOCK_KEY, lockData);
      load();
    } catch {
      addToast("Network error", "error");
    }
  }

  // Process items
  const processed = useMemo(() => {
    let arr = [...items];
    const term = (q || "").trim().toLowerCase();
    if (term)
      arr = arr.filter((x) =>
        [
          x.name,
          x.rollNo,
          x.locationLabel,
          x.date,
          x.mode,
          x.gender,
          x.containerId,
          x.remarksBy,
        ].some((f) => String(f || "").toLowerCase().includes(term))
      );
    if (filterLoc !== "ALL")
      arr = arr.filter((x) => x.locationType === filterLoc);
    if (filterGender !== "ALL")
      arr = arr.filter(
        (x) => (x.gender || "").toUpperCase() === filterGender
      );
    arr = arr.filter((x) =>
      matchesDateFilter(x, datePreset, customFrom, customTo)
    );
    if (stuckOnly)
      arr = arr.filter((x) => {
        const td = getTrackingDate(x);
        return (
          td && Date.now() - new Date(td).getTime() > 7 * 86400000
        );
      });
    if (occupiedOnly) arr = arr.filter((x) => !!x.occupiedDate);
    if (filterTagName)
      arr = arr.filter((x) =>
        (tags[x._id] || []).includes(filterTagName)
      );

    // ByMe filter
    if (byMeOnly && currentUser) {
      arr = arr.filter((x) => {
        const rb = (x.remarksBy || "").trim().toLowerCase();
        const cu = currentUser.trim().toLowerCase();
        return rb === cu;
      });
    }

    arr.sort((a, b) => {
      const ap = pinned.includes(a._id) ? 1 : 0;
      const bp = pinned.includes(b._id) ? 1 : 0;
      if (ap !== bp) return bp - ap;
      switch (sortBy) {
        case "stuck": {
          const am = getTrackingDate(a)
            ? Date.now() - new Date(getTrackingDate(a)).getTime()
            : 0;
          const bm = getTrackingDate(b)
            ? Date.now() - new Date(getTrackingDate(b)).getTime()
            : 0;
          return bm - am;
        }
        case "recent": {
          const am = getTrackingDate(a)
            ? new Date(getTrackingDate(a)).getTime()
            : 0;
          const bm = getTrackingDate(b)
            ? new Date(getTrackingDate(b)).getTime()
            : 0;
          return bm - am;
        }
        case "name":
          return (a.name || "").localeCompare(b.name || "");
        case "roll":
          return (
            (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0)
          );
        default:
          return 0;
      }
    });
    return arr;
  }, [
    items,
    q,
    filterLoc,
    filterGender,
    datePreset,
    customFrom,
    customTo,
    stuckOnly,
    occupiedOnly,
    sortBy,
    now,
    pinned,
    filterTagName,
    tags,
    byMeOnly,
    currentUser,
  ]);

  const groupedItems = useMemo(() => {
    if (!grouped) return null;
    const groups = {};
    const order = ["SITTING", "MEETING", "DIKSHA", "PENDING", "UNKNOWN"];
    for (const x of processed) {
      const k = x.locationType || "UNKNOWN";
      if (!groups[k]) groups[k] = [];
      groups[k].push(x);
    }
    return order
      .filter((k) => groups[k]?.length > 0)
      .map((k) => ({ type: k, items: groups[k] }));
  }, [processed, grouped]);

  const activeRemindersCount = reminders.filter(
    (r) => new Date(r.time) > new Date()
  ).length;

  const byMeCount = useMemo(() => {
    if (!currentUser) return 0;
    return items.filter(
      (x) =>
        (x.remarksBy || "").trim().toLowerCase() ===
        currentUser.trim().toLowerCase()
    ).length;
  }, [items, currentUser]);

  if (!mounted) return null;

  return (
    <div
      className="clt-safe-b"
      style={{
        WebkitTextSizeAdjust: "100%",
        touchAction: "pan-y",
      }}
    >
      <style>{GLOBAL_CSS}</style>
      <ToastContainer toasts={toasts} c={c} />

      {/* HEADER */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 10,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: c.t1,
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 20 }}>🗺️</span>
              Location Tracker
            </h2>
            <p
              style={{
                fontSize: 11,
                color: c.t4,
                margin: "3px 0 0",
              }}
            >
              / search • R refresh • G group • K kanban • B byMe
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: 5,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => setAutoRefreshActive((p) => !p)}
              className="clt-btn"
              style={{
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 8,
                background: autoRefreshActive
                  ? c.statusActive.bg
                  : c.panelBg,
                border: `1px solid ${autoRefreshActive ? c.statusActive.border : c.panelBorder}`,
                color: autoRefreshActive
                  ? c.statusActive.text
                  : c.t3,
              }}
            >
              {autoRefreshActive ? `🔄 ${countdown}s` : "⏸ Off"}
            </button>
            <button
              onClick={() => setShowReminders(true)}
              className="clt-btn"
              style={{
                fontSize: 13,
                padding: "5px 10px",
                borderRadius: 8,
                background:
                  activeRemindersCount > 0
                    ? "rgba(249,115,22,0.10)"
                    : c.panelBg,
                border: `1px solid ${activeRemindersCount > 0 ? "rgba(249,115,22,0.25)" : c.panelBorder}`,
                color:
                  activeRemindersCount > 0 ? "#f97316" : c.t3,
                position: "relative",
              }}
            >
              ⏰
              {activeRemindersCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "#f97316",
                    color: "#fff",
                    fontSize: 9,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "cltBounceIn 0.3s ease",
                  }}
                >
                  {activeRemindersCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowActivityFeed(true)}
              className="clt-btn"
              style={{
                fontSize: 13,
                padding: "5px 10px",
                borderRadius: 8,
                background: c.panelBg,
                border: `1px solid ${c.panelBorder}`,
                color: c.t3,
              }}
            >
              📜
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          style={{
            display: "flex",
            gap: 6,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 180,
              position: "relative",
            }}
            className="clt-mfull"
          >
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 14,
                color: c.t4,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search..."
              className="clt-input"
              style={{
                width: "100%",
                padding: "11px 70px 11px 36px",
                background: c.inputBg,
                border: `1.5px solid ${c.inputBorder}`,
                color: c.inputText,
                outline: "none",
                transition:
                  "border-color 0.15s, box-shadow 0.15s",
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
            <div
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                display: "flex",
                gap: 4,
                alignItems: "center",
              }}
            >
              <button
                onClick={startVoiceSearch}
                className="clt-btn"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: isListening
                    ? c.errorBg
                    : "transparent",
                  border: isListening
                    ? `1px solid ${c.errorBorder}`
                    : "none",
                  color: isListening ? c.errorText : c.t4,
                  fontSize: 14,
                  animation: isListening
                    ? "cltGlow 1s ease-in-out infinite"
                    : "none",
                }}
              >
                🎤
              </button>
              {q && (
                <button
                  onClick={() => {
                    setQ("");
                    searchRef.current?.focus();
                  }}
                  className="clt-btn"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: c.panelBg,
                    border: `1px solid ${c.panelBorder}`,
                    fontSize: 11,
                    color: c.t3,
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {!loading && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "5px 10px",
                borderRadius: 10,
                background: c.badgeBg,
                border: `1px solid ${c.badgeBorder}`,
                color: c.badgeText,
                flexShrink: 0,
              }}
            >
              {processed.length}
            </span>
          )}

          <div style={{ display: "flex", gap: 4 }}>
            <button
              onClick={handleRefresh}
              className="clt-btn"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: c.panelBg,
                border: `1px solid ${c.panelBorder}`,
                fontSize: 16,
                animation: refreshSpin
                  ? "cltSpin 0.6s ease"
                  : "none",
              }}
            >
              🔄
            </button>
            <button
              onClick={toggleView}
              className="clt-btn"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background:
                  viewMode === "kanban"
                    ? c.acc + "22"
                    : c.panelBg,
                border: `1px solid ${viewMode === "kanban" ? c.acc : c.panelBorder}`,
                fontSize: 16,
                color:
                  viewMode === "kanban" ? c.acc : c.t3,
              }}
            >
              {viewMode === "grid"
                ? "☰"
                : viewMode === "list"
                  ? "🗂️"
                  : "▦"}
            </button>
            {viewMode !== "kanban" && (
              <button
                onClick={toggleGroup}
                className="clt-btn"
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: grouped
                    ? c.acc + "22"
                    : c.panelBg,
                  border: `1px solid ${grouped ? c.acc : c.panelBorder}`,
                  fontSize: 14,
                  color: grouped ? c.acc : c.t3,
                }}
              >
                🗂️
              </button>
            )}
            <button
              onClick={requestCSVExport}
              className="clt-btn"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: c.panelBg,
                border: `1px solid ${c.panelBorder}`,
                fontSize: 16,
              }}
            >
              📥
            </button>
          </div>
        </div>

        {/* Filter Presets */}
        {filterPresets.length > 0 && (
          <div className="clt-hscroll" style={{ marginBottom: 6 }}>
            {filterPresets.map((p, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: c.panelBg,
                  border: `1px solid ${c.panelBorder}`,
                  flexShrink: 0,
                }}
              >
                <button
                  onClick={() => applyPreset(p.filters)}
                  style={{
                    fontSize: 11,
                    color: c.acc,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ⚡ {p.name}
                </button>
                <button
                  onClick={() => deletePreset(i)}
                  style={{
                    fontSize: 10,
                    color: c.t4,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Location chips */}
        <div className="clt-hscroll" style={{ marginBottom: 6 }}>
          {LOCATION_TYPES.map((lt) => {
            const active = filterLoc === lt.key;
            const lc =
              lt.key !== "ALL" ? getLocColor(lt.key, c) : null;
            return (
              <button
                key={lt.key}
                onClick={() => setFilterLoc(lt.key)}
                style={{
                  fontSize: 12,
                  fontWeight: active ? 600 : 400,
                  padding: "5px 12px",
                  borderRadius: 10,
                  flexShrink: 0,
                  background: active
                    ? lc
                      ? lc.bg
                      : c.acc + "22"
                    : c.chipBg,
                  border: `1px solid ${active ? (lc ? lc.border : c.acc) : c.chipBorder}`,
                  color: active
                    ? lc
                      ? lc.text
                      : c.acc
                    : c.chipText,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  WebkitTapHighlightColor: "transparent",
                  touchAction: "manipulation",
                }}
              >
                {lt.icon} {lt.label}
              </button>
            );
          })}
        </div>

        {/* Filters Row 2 */}
        <div
          style={{
            display: "flex",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div className="clt-hscroll" style={{ gap: 4 }}>
            {DATE_PRESETS.map((dp) => (
              <button
                key={dp.key}
                onClick={() => setDatePreset(dp.key)}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 8,
                  flexShrink: 0,
                  background:
                    datePreset === dp.key
                      ? c.acc + "22"
                      : c.chipBg,
                  border: `1px solid ${datePreset === dp.key ? c.acc : c.chipBorder}`,
                  color:
                    datePreset === dp.key ? c.acc : c.chipText,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {dp.label}
              </button>
            ))}
          </div>

          {datePreset === "custom" && (
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                animation: "cltFadeIn 0.25s ease",
              }}
            >
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="clt-input"
                style={{
                  fontSize: 12,
                  padding: "4px 6px",
                  borderRadius: 8,
                  background: c.inputBg,
                  border: `1px solid ${c.inputBorder}`,
                  color: c.inputText,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: c.t4 }}>→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="clt-input"
                style={{
                  fontSize: 12,
                  padding: "4px 6px",
                  borderRadius: 8,
                  background: c.inputBg,
                  border: `1px solid ${c.inputBorder}`,
                  color: c.inputText,
                  outline: "none",
                }}
              />
            </div>
          )}

          <div
            style={{
              width: 1,
              height: 20,
              background: c.divider,
            }}
            className="clt-mhide"
          />

          <div style={{ display: "flex", gap: 3 }}>
            {GENDER_FILTERS.map((gf) => (
              <button
                key={gf.key}
                onClick={() => setFilterGender(gf.key)}
                style={{
                  fontSize: 11,
                  padding: "4px 8px",
                  borderRadius: 8,
                  background:
                    filterGender === gf.key
                      ? c.acc + "22"
                      : c.chipBg,
                  border: `1px solid ${filterGender === gf.key ? c.acc : c.chipBorder}`,
                  color:
                    filterGender === gf.key
                      ? c.acc
                      : c.chipText,
                  cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {gf.label}
              </button>
            ))}
          </div>

          <div
            style={{
              width: 1,
              height: 20,
              background: c.divider,
            }}
            className="clt-mhide"
          />

          {/* ByMe Filter */}
          <button
            onClick={() => setByMeOnly((p) => !p)}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 8,
              background: byMeOnly
                ? `linear-gradient(135deg,${c.acc}22,${c.acc}11)`
                : c.chipBg,
              border: `1.5px solid ${byMeOnly ? c.acc : c.chipBorder}`,
              color: byMeOnly ? c.acc : c.chipText,
              cursor: "pointer",
              fontWeight: byMeOnly ? 700 : 400,
              display: "flex",
              alignItems: "center",
              gap: 4,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              boxShadow: byMeOnly
                ? `0 0 8px ${c.acc}33`
                : "none",
              transition: "all 0.2s ease",
            }}
          >
            👤 ByMe
            {byMeCount > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 6,
                  background: byMeOnly ? c.acc : c.badgeBg,
                  color: byMeOnly ? "#fff" : c.badgeText,
                  marginLeft: 2,
                }}
              >
                {byMeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setStuckOnly((p) => !p)}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 8,
              background: stuckOnly ? c.errorBg : c.chipBg,
              border: `1px solid ${stuckOnly ? c.errorBorder : c.chipBorder}`,
              color: stuckOnly ? c.errorText : c.chipText,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            🚨 Stuck
          </button>

          <button
            onClick={() => setOccupiedOnly((p) => !p)}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 8,
              background: occupiedOnly
                ? "rgba(16,185,129,0.10)"
                : c.chipBg,
              border: `1px solid ${occupiedOnly ? "rgba(16,185,129,0.20)" : c.chipBorder}`,
              color: occupiedOnly
                ? isLight
                  ? "#059669"
                  : "#6ee7b7"
                : c.chipText,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            📅 Occ
          </button>

          <select
            value={filterTagName}
            onChange={(e) => setFilterTagName(e.target.value)}
            className="clt-select"
            style={{
              fontSize: 12,
              padding: "4px 8px",
              background: filterTagName
                ? c.acc + "12"
                : c.inputBg,
              border: `1px solid ${filterTagName ? c.acc : c.inputBorder}`,
              color: filterTagName ? c.acc : c.inputText,
              cursor: "pointer",
              outline: "none",
            }}
          >
            <option value="">🏷️ Tags</option>
            {DEFAULT_TAG_LIST.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <div
            style={{
              width: 1,
              height: 20,
              background: c.divider,
            }}
            className="clt-mhide"
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="clt-select"
            style={{
              fontSize: 12,
              padding: "5px 24px 5px 8px",
              background: c.inputBg,
              border: `1px solid ${c.inputBorder}`,
              color: c.inputText,
              cursor: "pointer",
              outline: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 6px center",
            }}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowSavePreset(true)}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              borderRadius: 8,
              background: c.chipBg,
              border: `1px solid ${c.chipBorder}`,
              color: c.chipText,
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            💾
          </button>
        </div>

        {/* ByMe indicator */}
        {byMeOnly && currentUser && (
          <div
            style={{
              marginTop: 8,
              padding: "6px 12px",
              borderRadius: 10,
              background: c.acc + "10",
              border: `1px solid ${c.acc}33`,
              fontSize: 12,
              color: c.acc,
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: 6,
              animation: "cltFadeIn 0.25s ease",
            }}
          >
            👤 Showing <b>{currentUser}</b>&apos;s customers (
            {processed.length})
            <button
              onClick={() => setByMeOnly(false)}
              style={{
                marginLeft: "auto",
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 6,
                background: c.acc + "22",
                border: `1px solid ${c.acc}44`,
                color: c.acc,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* SUGGESTIONS */}
      {!loading && items.length > 0 && (
        <SmartSuggestions items={items} c={c} />
      )}

      {/* STATS */}
      {!loading && items.length > 0 && (
        <EnhancedStats items={items} c={c} />
      )}

      {/* PROGRESS */}
      {autoRefreshActive && !loading && (
        <div
          style={{
            height: 2,
            borderRadius: 1,
            marginBottom: 10,
            background: c.panelBg,
            overflow: "hidden",
          }}
        >
          <div
            key={lastRefreshTime}
            style={{
              height: "100%",
              background: c.acc,
              borderRadius: 1,
              transformOrigin: "left",
              animation: `cltProgress ${AUTO_REFRESH_MS / 1000}s linear`,
            }}
          />
        </div>
      )}

      {/* ERROR */}
      {err && (
        <div
          style={{
            marginBottom: 12,
            borderRadius: 14,
            border: `1px solid ${c.errorBorder}`,
            background: c.errorBg,
            padding: "12px 16px",
            fontSize: 13,
            color: c.errorText,
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "cltFadeIn 0.3s ease",
          }}
        >
          ⚠️ {err}
          <button
            onClick={load}
            style={{
              marginLeft: "auto",
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 8,
              background: "transparent",
              border: `1px solid ${c.errorBorder}`,
              color: c.errorText,
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* CONTENT */}
      {loading ? (
        <div className="clt-grid clt-grid-auto">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} c={c} />
          ))}
        </div>
      ) : processed.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "40px 20px",
            animation: "cltFadeIn 0.4s ease",
          }}
        >
          <div
            style={{
              fontSize: 48,
              marginBottom: 10,
              opacity: 0.5,
            }}
          >
            {byMeOnly
              ? "👤"
              : q ||
                  filterLoc !== "ALL" ||
                  stuckOnly ||
                  occupiedOnly ||
                  filterTagName
                ? "🔎"
                : "🗺️"}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: c.t2,
              marginBottom: 4,
            }}
          >
            {byMeOnly
              ? "No customers assigned to you"
              : q
                ? "No matching customers"
                : "No customers found"}
          </div>
          <div style={{ fontSize: 12, color: c.t3 }}>
            {byMeOnly
              ? `No records with remarksBy = "${currentUser}"`
              : q
                ? `No results for "${q}".`
                : "Data will appear here."}
          </div>
          {(q ||
            filterLoc !== "ALL" ||
            stuckOnly ||
            occupiedOnly ||
            filterTagName ||
            byMeOnly) && (
            <button
              onClick={() => {
                setQ("");
                setFilterLoc("ALL");
                setStuckOnly(false);
                setOccupiedOnly(false);
                setDatePreset("all");
                setFilterGender("ALL");
                setFilterTagName("");
                setByMeOnly(false);
              }}
              className="clt-btn"
              style={{
                marginTop: 14,
                padding: "10px 20px",
                borderRadius: 12,
                background: c.panelBg,
                border: `1px solid ${c.panelBorder}`,
                color: c.acc,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      ) : viewMode === "kanban" ? (
        <KanbanBoard
          items={processed}
          c={c}
          isLight={isLight}
          onMoveCustomer={requestKanbanMove}
          lockInfo={kanbanLock}
          addToast={addToast}
        />
      ) : grouped && groupedItems ? (
        <div>
          {groupedItems.map((g) => (
            <div key={g.type}>
              <GroupHeader
                type={g.type}
                count={g.items.length}
                c={c}
              />
              <div
                className={`clt-grid ${viewMode === "grid" ? "clt-grid-auto" : ""}`}
              >
                {g.items.map((item, i) => (
                  <LocationCard
                    key={item._id}
                    item={item}
                    c={c}
                    isLight={isLight}
                    index={i}
                    viewMode={viewMode}
                    now={now}
                    onOpenProfile={() => openProfile(item)}
                    pinned={pinned}
                    onTogglePin={togglePin}
                    notes={notes}
                    onAddNote={addNote}
                    tags={tags}
                    onToggleTag={toggleTag}
                    addToast={addToast}
                    reminders={reminders}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`clt-grid ${viewMode === "grid" ? "clt-grid-auto" : ""}`}
        >
          {processed.map((item, i) => (
            <LocationCard
              key={item._id}
              item={item}
              c={c}
              isLight={isLight}
              index={i}
              viewMode={viewMode}
              now={now}
              onOpenProfile={() => openProfile(item)}
              pinned={pinned}
              onTogglePin={togglePin}
              notes={notes}
              onAddNote={addNote}
              tags={tags}
              onToggleTag={toggleTag}
              addToast={addToast}
              reminders={reminders}
            />
          ))}
        </div>
      )}

      {/* Swipe hint */}
      {!loading && processed.length > 0 && viewMode !== "kanban" && (
        <div
          className="clt-dhide"
          style={{
            textAlign: "center",
            marginTop: 14,
            fontSize: 11,
            color: c.t4,
            padding: "8px 0",
          }}
        >
          👈 swipe left = profile • right = call 👉
        </div>
      )}

      {/* MODALS */}
      <AdminAuthModal
        open={adminAuthOpen}
        onClose={() => {
          setAdminAuthOpen(false);
          setAdminAuthCallback(null);
        }}
        onSuccess={() => {
          if (adminAuthCallback) adminAuthCallback();
        }}
        c={c}
        purpose={adminAuthPurpose}
      />

      <BottomSheet
        open={showActivityFeed}
        onClose={() => setShowActivityFeed(false)}
        title="Activity Log"
        icon="📜"
        c={c}
      >
        <ActivityFeed activities={activities} c={c} />
        {activities.length > 0 && (
          <button
            onClick={() => {
              setActivities([]);
              setLS(ACTIVITY_KEY, []);
              addToast("Log cleared", "info");
            }}
            className="clt-btn"
            style={{
              width: "100%",
              marginTop: 16,
              padding: "10px 0",
              borderRadius: 12,
              background: c.panelBg,
              border: `1px solid ${c.panelBorder}`,
              color: c.t3,
              fontSize: 12,
            }}
          >
            Clear
          </button>
        )}
      </BottomSheet>

      <ReminderModal
        open={showReminders}
        onClose={() => setShowReminders(false)}
        c={c}
        reminders={reminders}
        items={items}
        onAddReminder={addReminder}
        onDeleteReminder={deleteReminder}
      />

      <BottomSheet
        open={showSavePreset}
        onClose={() => setShowSavePreset(false)}
        title="Save Preset"
        icon="💾"
        c={c}
        maxWidth={400}
      >
        <input
          value={presetName}
          onChange={(e) => setPresetName(e.target.value)}
          placeholder="Preset name..."
          className="clt-input"
          onKeyDown={(e) => {
            if (e.key === "Enter") saveCurrentFilters(presetName);
          }}
          style={{
            width: "100%",
            padding: "12px 14px",
            marginBottom: 12,
            background: c.inputBg,
            border: `1px solid ${c.inputBorder}`,
            color: c.inputText,
            outline: "none",
          }}
        />
        <div
          style={{
            fontSize: 12,
            color: c.t3,
            marginBottom: 12,
          }}
        >
          {filterLoc !== "ALL" && `📍${filterLoc} `}
          {filterGender !== "ALL" && `${filterGender} `}
          {datePreset !== "all" && `📅${datePreset} `}
          {stuckOnly && "🚨stuck "}
          {occupiedOnly && "📅occ "}
          {byMeOnly && "👤byMe "}
          {filterTagName && `🏷️${filterTagName} `}
          {sortBy && `↕️${sortBy}`}
        </div>
        <button
          onClick={() => saveCurrentFilters(presetName)}
          className="clt-btn"
          disabled={!presetName.trim()}
          style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 12,
            background: presetName.trim() ? c.acc : c.panelBg,
            color: presetName.trim() ? "#fff" : c.t4,
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          💾 Save
        </button>
      </BottomSheet>

      <CustomerProfileModal
        open={profileOpen}
        onClose={() => {
          setProfileOpen(false);
          setProfileCustomer(null);
        }}
        customer={profileCustomer}
        source={
          profileCustomer?.sourceDb === "PENDING"
            ? "PENDING"
            : "SITTING"
        }
        onChanged={() => {
          load();
          logActivity(
            "👤",
            `Profile: ${profileCustomer?.name || ""}`
          );
        }}
      />
    </div>
  );
}
