// components/dashboard/CustomerLocationTracker.js
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { PT } from "@/components/profile/profileTheme";
import CustomerProfileModal from "@/components/CustomerProfileModal";

/* ═══════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════ */
const AUTO_REFRESH_MS = 30000;
const VIEW_KEY = "sysbyte_loctracker_view";
const GROUP_KEY = "sysbyte_loctracker_group";

const LOCATION_TYPES = [
  { key: "ALL", label: "All", icon: "🌐" },
  { key: "SITTING", label: "Sitting", icon: "📋" },
  { key: "MEETING", label: "Meeting", icon: "🗓️" },
  { key: "DIKSHA", label: "Diksha", icon: "🎯" },
  { key: "PENDING", label: "Pending", icon: "⏸️" },
  { key: "UNKNOWN", label: "Unknown", icon: "❓" },
];

const DATE_PRESETS = [
  { key: "all", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "3days", label: "Last 3 Days" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom" },
];

const SORT_OPTIONS = [
  { key: "stuck", label: "Stuck Longest ↑" },
  { key: "recent", label: "Most Recent ↑" },
  { key: "name", label: "Name A→Z" },
  { key: "roll", label: "Roll No ↑" },
];

const GENDER_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "MALE", label: "♂ Male" },
  { key: "FEMALE", label: "♀ Female" },
];

/* ═══════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════ */
function getLocColor(type, c) {
  switch (type) {
    case "SITTING":
      return { bg: c.statusActive.bg, border: c.statusActive.border, text: c.statusActive.text, dot: c.statusActive.dot };
    case "MEETING":
      return { bg: c.statusQualified.bg, border: c.statusQualified.border, text: c.statusQualified.text, dot: c.statusQualified.dot };
    case "DIKSHA":
      return { bg: c.statusToday.bg, border: c.statusToday.border, text: c.statusToday.text, dot: c.statusToday.dot };
    case "PENDING":
      return { bg: c.statusPending.bg, border: c.statusPending.border, text: c.statusPending.text, dot: c.statusPending.dot };
    default:
      return { bg: c.chipBg, border: c.chipBorder, text: c.chipText, dot: c.t4 };
  }
}

function getLocIcon(type) {
  const m = { SITTING: "📋", MEETING: "🗓️", DIKSHA: "🎯", PENDING: "⏸️" };
  return m[type] || "❓";
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

function getGenderIcon(g) {
  if (g === "MALE") return "♂";
  if (g === "FEMALE") return "♀";
  return "⚥";
}

function timeSince(dateStr) {
  if (!dateStr) return null;
  const ms = Date.now() - new Date(dateStr).getTime();
  if (ms < 0) return null;
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return { value: days, unit: "d", label: `${days}d ${hrs % 24}h`, total: ms };
  if (hrs > 0) return { value: hrs, unit: "h", label: `${hrs}h ${mins % 60}m`, total: ms };
  return { value: mins, unit: "m", label: `${mins}m`, total: ms };
}

function getTimeSeverity(ms) {
  if (!ms || ms < 0) return "fresh";
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) return "fresh";
  if (days < 3) return "normal";
  if (days < 7) return "attention";
  return "stuck";
}

function severityColor(severity, c) {
  switch (severity) {
    case "fresh": return { bg: c.statusActive.bg, border: c.statusActive.border, text: c.statusActive.text };
    case "normal": return { bg: c.statusPending.bg, border: c.statusPending.border, text: c.statusPending.text };
    case "attention": return { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.25)", text: "#f97316" };
    case "stuck": return { bg: c.errorBg, border: c.errorBorder, text: c.errorText };
    default: return { bg: c.chipBg, border: c.chipBorder, text: c.chipText };
  }
}

function getTrackingDate(item) {
  if (item.locationType === "PENDING" && item.pausedAt) return item.pausedAt;
  if (item.date) return item.date;
  return null;
}

function matchesDateFilter(item, preset, customFrom, customTo) {
  const trackDate = getTrackingDate(item);
  if (preset === "all") return true;
  if (!trackDate) return preset === "all";

  const d = new Date(trackDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case "today":
      return d >= startOfToday;
    case "3days": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - 3);
      return d >= start;
    }
    case "week": {
      const start = new Date(startOfToday);
      start.setDate(start.getDate() - start.getDay());
      return d >= start;
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return d >= start;
    }
    case "custom": {
      if (customFrom && d < new Date(customFrom)) return false;
      if (customTo) {
        const to = new Date(customTo);
        to.setHours(23, 59, 59, 999);
        if (d > to) return false;
      }
      return true;
    }
    default: return true;
  }
}

function getSavedView() {
  try { return localStorage.getItem(VIEW_KEY) || "grid"; } catch { return "grid"; }
}
function saveView(v) {
  try { localStorage.setItem(VIEW_KEY, v); } catch {}
}
function getSavedGroup() {
  try { return localStorage.getItem(GROUP_KEY) === "true"; } catch { return false; }
}
function saveGroup(v) {
  try { localStorage.setItem(GROUP_KEY, String(v)); } catch {}
}

function copyToClipboard(text) {
  try { navigator.clipboard.writeText(text); return true; } catch { return false; }
}

/* ═══════════════════════════════════════
   JOURNEY TIMELINE
   ═══════════════════════════════════════ */
function JourneyTimeline({ item, c }) {
  const steps = [];

  // Step 1: In Sitting
  if (item.sourceDb === "SITTING" || item.sourceDb === "PENDING") {
    steps.push({
      icon: "📥",
      label: "In Sitting",
      detail: item.sittingStatus ? `Status: ${item.sittingStatus}` : null,
      active: item.locationType === "SITTING" && !item.containerId,
    });
  }

  // Step 2: Assigned to container
  if (item.containerId && item.mode) {
    steps.push({
      icon: item.mode === "MEETING" ? "🗓️" : "🎯",
      label: `Assigned to ${item.mode}`,
      detail: item.date ? `Date: ${item.date}` : null,
      active: item.locationType === "MEETING" || item.locationType === "DIKSHA",
    });
  }

  // Step 3: Meeting decision
  if (item.meetingDecision) {
    steps.push({
      icon: item.meetingDecision === "CONFIRMED" ? "✅" : item.meetingDecision === "REJECTED" ? "❌" : "⏳",
      label: `Decision: ${item.meetingDecision}`,
      detail: null,
      active: false,
    });
  }

  // Step 4: Occupied
  if (item.occupiedDate) {
    steps.push({
      icon: "📅",
      label: `Occupied: ${item.occupiedDate}`,
      detail: null,
      active: true,
    });
  }

  // Step: Pending
  if (item.locationType === "PENDING") {
    steps.push({
      icon: "⏸️",
      label: "Moved to Pending",
      detail: item.pausedAt ? `Since: ${new Date(item.pausedAt).toLocaleDateString()}` : null,
      active: true,
    });
  }

  if (steps.length === 0) {
    return <div style={{ fontSize: 11, color: c.t4, padding: "8px 0" }}>No journey data available.</div>;
  }

  return (
    <div style={{ padding: "8px 0 4px" }}>
      {steps.map((step, i) => (
        <div
          key={i}
          style={{
            display: "flex", gap: 10, alignItems: "flex-start",
            position: "relative", paddingBottom: i < steps.length - 1 ? 12 : 0,
          }}
        >
          {/* Vertical line */}
          {i < steps.length - 1 && (
            <div style={{
              position: "absolute", left: 11, top: 24, bottom: 0, width: 2,
              background: c.divider,
            }} />
          )}

          {/* Dot */}
          <div style={{
            width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13,
            background: step.active ? c.acc + "22" : c.panelBg,
            border: `2px solid ${step.active ? c.acc : c.panelBorder}`,
          }}>
            {step.icon}
          </div>

          {/* Text */}
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: 12, fontWeight: step.active ? 600 : 400,
              color: step.active ? c.t1 : c.t2,
            }}>
              {step.label}
            </div>
            {step.detail && (
              <div style={{ fontSize: 11, color: c.t3, marginTop: 1 }}>{step.detail}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   SKELETON CARD
   ═══════════════════════════════════════ */
function SkeletonCard({ c }) {
  return (
    <div style={{
      background: c.cardBg, border: `1px solid ${c.cardBorder}`,
      borderRadius: 16, padding: 16,
    }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%", background: c.panelBg,
          animation: "cltPulse 1.5s ease-in-out infinite",
        }} />
        <div style={{ flex: 1 }}>
          <div style={{
            width: "55%", height: 14, borderRadius: 7, background: c.panelBg,
            animation: "cltPulse 1.5s ease-in-out infinite", animationDelay: "0.1s",
          }} />
          <div style={{
            width: "35%", height: 10, borderRadius: 5, marginTop: 8, background: c.panelBg,
            animation: "cltPulse 1.5s ease-in-out infinite", animationDelay: "0.2s",
          }} />
        </div>
      </div>
      <div style={{
        width: "70%", height: 10, borderRadius: 5, marginTop: 14, background: c.panelBg,
        animation: "cltPulse 1.5s ease-in-out infinite", animationDelay: "0.3s",
      }} />
      <div style={{
        width: "45%", height: 10, borderRadius: 5, marginTop: 8, background: c.panelBg,
        animation: "cltPulse 1.5s ease-in-out infinite", animationDelay: "0.4s",
      }} />
    </div>
  );
}

/* ═══════════════════════════════════════
   ENHANCED STATS BAR
   ═══════════════════════════════════════ */
function EnhancedStats({ items, c }) {
  const stats = useMemo(() => {
    const s = { SITTING: 0, MEETING: 0, DIKSHA: 0, PENDING: 0, UNKNOWN: 0, total: items.length, stuck: 0 };
    let longestStuck = null;
    let longestMs = 0;
    const totalMs = { SITTING: 0, MEETING: 0, DIKSHA: 0, PENDING: 0 };
    const counts = { SITTING: 0, MEETING: 0, DIKSHA: 0, PENDING: 0 };

    for (const x of items) {
      const lt = x.locationType || "UNKNOWN";
      s[lt] = (s[lt] || 0) + 1;

      const td = getTrackingDate(x);
      if (td) {
        const ms = Date.now() - new Date(td).getTime();
        if (ms > 0) {
          if (totalMs[lt] !== undefined) {
            totalMs[lt] += ms;
            counts[lt]++;
          }
          if (ms > 7 * 24 * 60 * 60 * 1000) s.stuck++;
          if (ms > longestMs) {
            longestMs = ms;
            longestStuck = x;
          }
        }
      }
    }

    const avgDays = {};
    for (const k of ["SITTING", "MEETING", "DIKSHA", "PENDING"]) {
      avgDays[k] = counts[k] > 0 ? Math.round(totalMs[k] / counts[k] / (1000 * 60 * 60 * 24) * 10) / 10 : 0;
    }

    return { ...s, longestStuck, longestMs, avgDays };
  }, [items]);

  const locTypes = [
    { key: "SITTING", icon: "📋", label: "Sitting" },
    { key: "MEETING", icon: "🗓️", label: "Meeting" },
    { key: "DIKSHA", icon: "🎯", label: "Diksha" },
    { key: "PENDING", icon: "⏸️", label: "Pending" },
  ];

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Main stats row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        {/* Total */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "6px 14px", borderRadius: 12,
          background: c.panelBg, border: `1px solid ${c.panelBorder}`,
        }}>
          <span style={{ fontSize: 14 }}>🌐</span>
          <span style={{ fontSize: 12, color: c.t3 }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: c.t1 }}>{stats.total}</span>
        </div>

        {locTypes.map(lt => {
          const lc = getLocColor(lt.key, c);
          return (
            <div key={lt.key} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 12,
              background: lc.bg, border: `1px solid ${lc.border}`,
            }}>
              <span style={{ fontSize: 14 }}>{lt.icon}</span>
              <span style={{ fontSize: 12, color: lc.text }}>{lt.label}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: lc.text }}>{stats[lt.key] || 0}</span>
              {stats.avgDays[lt.key] > 0 && (
                <span style={{ fontSize: 10, color: c.t4, marginLeft: 2 }}>
                  ~{stats.avgDays[lt.key]}d avg
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Alert row */}
      {(stats.stuck > 0 || stats.longestStuck) && (
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
          padding: "8px 14px", borderRadius: 12,
          background: c.errorBg, border: `1px solid ${c.errorBorder}`,
          fontSize: 12,
        }}>
          {stats.stuck > 0 && (
            <span style={{ color: c.errorText, fontWeight: 600 }}>
              🚨 {stats.stuck} customer{stats.stuck > 1 ? "s" : ""} stuck (7+ days)
            </span>
          )}
          {stats.longestStuck && (
            <span style={{ color: c.t3 }}>
              Longest: <b style={{ color: c.errorText }}>{stats.longestStuck.name}</b>
              {" "}({Math.floor(stats.longestMs / (1000 * 60 * 60 * 24))}d)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   LOCATION CARD
   ═══════════════════════════════════════ */
function LocationCard({ item, c, isLight, index, viewMode, onOpenProfile, now }) {
  const [expanded, setExpanded] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [copied, setCopied] = useState(null);
  const [swiping, setSwiping] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchRef = useRef(null);
  const touchYRef = useRef(null);

  const gender = (item.gender || "").toUpperCase();
  const ga = getGenderAccent(gender, isLight);
  const lc = getLocColor(item.locationType, c);

  // Time since
  const trackDate = getTrackingDate(item);
  const ts = timeSince(trackDate);
  const severity = ts ? getTimeSeverity(ts.total) : "fresh";
  const sc = severityColor(severity, c);

  // Swipe handlers
  const onTouchStart = (e) => {
    touchRef.current = e.touches[0].clientX;
    touchYRef.current = e.touches[0].clientY;
    setSwiping(false); setSwipeX(0);
  };
  const onTouchMove = (e) => {
    if (!touchRef.current) return;
    const dx = e.touches[0].clientX - touchRef.current;
    const dy = e.touches[0].clientY - touchYRef.current;
    if (Math.abs(dx) > 15 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setSwiping(true);
      setSwipeX(Math.max(-80, Math.min(80, dx)));
    }
  };
  const onTouchEnd = () => {
    if (swiping && swipeX > 50 && item.phone) {
      window.open(`tel:${item.phone}`, "_self");
    } else if (swiping && swipeX < -50) {
      onOpenProfile();
    }
    setSwiping(false); setSwipeX(0); touchRef.current = null;
  };

  function handleCopy(label, text) {
    if (copyToClipboard(text)) {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    }
  }

  const isList = viewMode === "list";

  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 16 }}>
      {/* Swipe backgrounds */}
      {swiping && swipeX > 15 && (
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: 70,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(34,197,94,0.12)", borderRadius: "16px 0 0 16px", zIndex: 0,
        }}>📞</div>
      )}
      {swiping && swipeX < -15 && (
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 70,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(99,102,241,0.12)", borderRadius: "0 16px 16px 0", zIndex: 0,
        }}>👤</div>
      )}

      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
        onMouseLeave={() => setPressed(false)}
        style={{
          position: "relative", zIndex: 1,
          display: isList ? "flex" : "block",
          alignItems: isList ? "center" : undefined,
          gap: isList ? 14 : undefined,
          background: c.cardBg,
          border: `1px solid ${severity === "stuck" ? c.errorBorder : c.cardBorder}`,
          borderRadius: 16,
          padding: isList ? "12px 14px" : 16,
          cursor: "pointer",
          transition: "transform 0.18s ease, box-shadow 0.18s ease",
          transform: swiping ? `translateX(${swipeX * 0.5}px)` : pressed ? "scale(0.97)" : "translateY(0)",
          boxShadow: severity === "stuck"
            ? `0 0 20px ${c.errorBorder}`
            : item.occupiedDate
              ? `0 0 15px rgba(16,185,129,0.15)`
              : c.cardShadow,
          animation: `cltFadeSlideIn 0.35s ease both`,
          animationDelay: `${Math.min(index * 0.04, 0.6)}s`,
          willChange: "transform, opacity",
        }}
      >
        {/* Stuck pulse overlay */}
        {severity === "stuck" && (
          <div style={{
            position: "absolute", inset: 0, borderRadius: 16,
            border: `2px solid ${c.errorBorder}`,
            animation: "cltStuckPulse 2s ease-in-out infinite",
            pointerEvents: "none",
          }} />
        )}

        {/* Top row: Avatar + Name + Location badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          flex: isList ? 1 : undefined, minWidth: 0,
        }}>
          {/* Avatar */}
          <div style={{
            width: 44, height: 44, minWidth: 44, borderRadius: "50%",
            background: ga.avatarBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: 18,
            border: `2px solid ${ga.border}`,
            position: "relative",
          }}>
            {item.name ? item.name.charAt(0).toUpperCase() : getGenderIcon(gender)}

            {/* Location dot indicator */}
            <div style={{
              position: "absolute", bottom: -2, right: -2,
              width: 16, height: 16, borderRadius: "50%",
              background: lc.bg, border: `2px solid ${lc.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 8,
            }}>
              {getLocIcon(item.locationType)}
            </div>
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 15, fontWeight: 600, color: c.t1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: isList ? 180 : "100%",
              }}>
                {item.name}
              </span>
              <span style={{
                fontSize: 12, color: ga.text, padding: "1px 5px", borderRadius: 6,
                background: ga.bg, border: `1px solid ${ga.border}`,
              }}>
                {getGenderIcon(gender)}
              </span>
              {item.rollNo && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleCopy("Roll", item.rollNo); }}
                  title="Copy Roll No"
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8,
                    background: c.badgeBg, border: `1px solid ${c.badgeBorder}`, color: c.badgeText,
                    cursor: "pointer", transition: "transform 0.12s ease",
                  }}
                >
                  #{item.rollNo} {copied === "Roll" ? "✓" : ""}
                </button>
              )}
            </div>

            {/* Compact meta for list */}
            {isList && (
              <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
                {item.date && <span style={{ fontSize: 11, color: c.t3 }}>📅 {item.date}</span>}
                {item.mode && <span style={{ fontSize: 11, color: c.t3 }}>{item.mode}</span>}
                {ts && <span style={{ fontSize: 11, color: sc.text }}>⏱️ {ts.label}</span>}
              </div>
            )}
          </div>
        </div>

        {/* Grid mode: extended info */}
        {!isList && (
          <>
            {/* Location badge + time since row */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginTop: 12, gap: 8, flexWrap: "wrap",
            }}>
              {/* Location badge */}
              <span style={{
                fontSize: 12, fontWeight: 600, padding: "4px 12px", borderRadius: 10,
                background: lc.bg, border: `1px solid ${lc.border}`, color: lc.text,
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: lc.dot }} />
                {getLocIcon(item.locationType)} {item.locationLabel}
              </span>

              {/* Time since badge */}
              {ts && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8,
                  background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  ⏱️ {ts.label}
                  {severity === "stuck" && " ⚠️"}
                  {severity === "attention" && " ⚡"}
                </span>
              )}
            </div>

            {/* Detail info */}
            <div style={{ marginTop: 10, fontSize: 12, color: c.t2 }}>
              {item.locationType === "PENDING" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div>Paused: <b style={{ color: c.t1 }}>{item.pausedAt ? new Date(item.pausedAt).toLocaleDateString() : "—"}</b></div>
                  {item.date && <div>Last Date: <b style={{ color: c.t1 }}>{item.date}</b></div>}
                  {item.mode && <div>Last Mode: <b style={{ color: c.t1 }}>{item.mode}</b></div>}
                </div>
              ) : item.locationType !== "SITTING" || item.containerId ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {item.date && <div>Date: <b style={{ color: c.t1 }}>{item.date}</b></div>}
                  {item.mode && <div>Mode: <b style={{ color: c.t1 }}>{item.mode}</b></div>}
                  {item.meetingDecision && (
                    <div>Decision: <b style={{ color: c.t1 }}>{item.meetingDecision}</b></div>
                  )}
                </div>
              ) : (
                <div>Status: <b style={{ color: c.t1 }}>{item.sittingStatus || "—"}</b></div>
              )}
            </div>

            {/* ContainerId (copyable) */}
            {item.containerId && (
              <button
                onClick={(e) => { e.stopPropagation(); handleCopy("ID", item.containerId); }}
                style={{
                  marginTop: 8, fontSize: 10, color: c.t4,
                  background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                  borderRadius: 8, padding: "3px 8px", cursor: "pointer",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: "100%", display: "block", textAlign: "left",
                  transition: "background 0.12s ease",
                }}
              >
                🔗 {item.containerId} {copied === "ID" ? " ✓ Copied!" : " (tap to copy)"}
              </button>
            )}

            {/* Occupied date highlight */}
            {item.occupiedDate && (
              <div style={{
                marginTop: 8, fontSize: 12, padding: "6px 12px", borderRadius: 10,
                background: isLight ? "rgba(16,185,129,0.06)" : "rgba(16,185,129,0.10)",
                border: `1px solid ${isLight ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.20)"}`,
                color: isLight ? "#059669" : "#6ee7b7",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                📅 Occupied: <b>{item.occupiedDate}</b>
              </div>
            )}

            {/* Quick actions */}
            <div style={{
              display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap",
            }}>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                style={{
                  fontSize: 11, padding: "5px 12px", borderRadius: 8,
                  background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                  color: c.acc, cursor: "pointer", fontWeight: 500,
                  transition: "transform 0.12s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                👤 Profile
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(p => !p); }}
                style={{
                  fontSize: 11, padding: "5px 12px", borderRadius: 8,
                  background: expanded ? c.acc + "18" : c.panelBg,
                  border: `1px solid ${expanded ? c.acc : c.panelBorder}`,
                  color: expanded ? c.acc : c.t2, cursor: "pointer", fontWeight: 500,
                  transition: "transform 0.12s ease",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
                onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                🛤️ Journey {expanded ? "▲" : "▼"}
              </button>
            </div>

            {/* Journey Timeline (expandable) */}
            {expanded && (
              <div style={{
                marginTop: 8, padding: "8px 12px", borderRadius: 12,
                background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                animation: "cltFadeSlideIn 0.25s ease both",
              }}>
                <JourneyTimeline item={item} c={c} />
              </div>
            )}
          </>
        )}

        {/* List mode: right side badges */}
        {isList && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 8,
              background: lc.bg, border: `1px solid ${lc.border}`, color: lc.text,
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: lc.dot }} />
              {item.locationLabel}
            </span>
            {item.occupiedDate && <span style={{ fontSize: 12 }}>📅</span>}
            <button
              onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
              style={{
                width: 30, height: 30, borderRadius: 8,
                background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 13,
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >
              👤
            </button>
          </div>
        )}

        {/* Copy toast */}
        {copied && (
          <div style={{
            position: "absolute", bottom: 8, right: 12,
            fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
            background: c.statusActive.bg, border: `1px solid ${c.statusActive.border}`,
            color: c.statusActive.text,
            animation: "cltFadeSlideIn 0.2s ease both",
          }}>
            ✓ {copied} copied!
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
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 0", marginTop: 8,
    }}>
      <span style={{
        fontSize: 15, fontWeight: 700, color: lc.text,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {getLocIcon(type)} {type}
      </span>
      <span style={{
        fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 8,
        background: lc.bg, border: `1px solid ${lc.border}`, color: lc.text,
      }}>
        {count}
      </span>
      <div style={{ flex: 1, height: 1, background: c.divider }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function CustomerLocationTracker() {
  const { theme, mounted } = useTheme();
  const isLight = theme === "light";
  const c = isLight ? PT.light : PT.dark;

  const [items, setItems] = useState([]);
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
  const [refreshSpin, setRefreshSpin] = useState(false);
  const [autoRefreshActive, setAutoRefreshActive] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  // Profile modal
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileCustomer, setProfileCustomer] = useState(null);

  const searchRef = useRef(null);
  const autoRef = useRef(null);

  // Load saved prefs
  useEffect(() => {
    setViewMode(getSavedView());
    setGrouped(getSavedGroup());
  }, []);

  // Live timer (update "time since" every 60s)
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(iv);
  }, []);

  // Fetch
  const load = useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch("/api/customers/location");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data?.error || "Failed"); setItems([]); return; }
      setItems(data.items || []);
      setLastRefreshTime(Date.now());
    } catch {
      setErr("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefreshActive) return;
    autoRef.current = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(autoRef.current);
  }, [autoRefreshActive, load]);

  // Keyboard
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape" && q) { setQ(""); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [q]);

  // Refresh with spin
  function handleRefresh() {
    setRefreshSpin(true);
    load();
    setTimeout(() => setRefreshSpin(false), 700);
  }

  // View / Group toggles
  function toggleView() {
    setViewMode(p => { const n = p === "grid" ? "list" : "grid"; saveView(n); return n; });
  }
  function toggleGroup() {
    setGrouped(p => { const n = !p; saveGroup(n); return n; });
  }

  // Profile
  function openProfile(item) {
    setProfileCustomer(item);
    setProfileOpen(true);
  }

  // ── Process items ──
  const processed = useMemo(() => {
    let arr = [...items];

    // Search
    const term = (q || "").trim().toLowerCase();
    if (term) {
      arr = arr.filter(x => {
        return [x.name, x.rollNo, x.locationLabel, x.date, x.mode, x.gender, x.containerId]
          .some(f => String(f || "").toLowerCase().includes(term));
      });
    }

    // Location filter
    if (filterLoc !== "ALL") arr = arr.filter(x => x.locationType === filterLoc);

    // Gender filter
    if (filterGender !== "ALL") arr = arr.filter(x => (x.gender || "").toUpperCase() === filterGender);

    // Date filter
    arr = arr.filter(x => matchesDateFilter(x, datePreset, customFrom, customTo));

    // Stuck only
    if (stuckOnly) {
      arr = arr.filter(x => {
        const td = getTrackingDate(x);
        if (!td) return false;
        return (Date.now() - new Date(td).getTime()) > 7 * 24 * 60 * 60 * 1000;
      });
    }

    // Occupied only
    if (occupiedOnly) arr = arr.filter(x => !!x.occupiedDate);

    // Sort
    arr.sort((a, b) => {
      switch (sortBy) {
        case "stuck": {
          const aMs = getTrackingDate(a) ? Date.now() - new Date(getTrackingDate(a)).getTime() : 0;
          const bMs = getTrackingDate(b) ? Date.now() - new Date(getTrackingDate(b)).getTime() : 0;
          return bMs - aMs;
        }
        case "recent": {
          const aMs = getTrackingDate(a) ? new Date(getTrackingDate(a)).getTime() : 0;
          const bMs = getTrackingDate(b) ? new Date(getTrackingDate(b)).getTime() : 0;
          return bMs - aMs;
        }
        case "name": return (a.name || "").localeCompare(b.name || "");
        case "roll": return (Number(a.rollNo) || 0) - (Number(b.rollNo) || 0);
        default: return 0;
      }
    });

    return arr;
  }, [items, q, filterLoc, filterGender, datePreset, customFrom, customTo, stuckOnly, occupiedOnly, sortBy, now]);

  // Group items
  const groupedItems = useMemo(() => {
    if (!grouped) return null;
    const groups = {};
    const order = ["SITTING", "MEETING", "DIKSHA", "PENDING", "UNKNOWN"];
    for (const x of processed) {
      const k = x.locationType || "UNKNOWN";
      if (!groups[k]) groups[k] = [];
      groups[k].push(x);
    }
    return order.filter(k => groups[k]?.length > 0).map(k => ({ type: k, items: groups[k] }));
  }, [processed, grouped]);

  // Auto-refresh countdown
  const [countdown, setCountdown] = useState(AUTO_REFRESH_MS / 1000);
  useEffect(() => {
    if (!autoRefreshActive) return;
    const iv = setInterval(() => {
      setCountdown(Math.max(0, Math.ceil((AUTO_REFRESH_MS - (Date.now() - lastRefreshTime)) / 1000)));
    }, 1000);
    return () => clearInterval(iv);
  }, [autoRefreshActive, lastRefreshTime]);

  if (!mounted) return null;

  const gridCols = viewMode === "grid" ? "repeat(auto-fill, minmax(300px, 1fr))" : "1fr";

  return (
    <div>
      {/* Keyframes */}
      <style>{`
        @keyframes cltFadeSlideIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cltPulse { 0%,100% { opacity:0.4; } 50% { opacity:0.7; } }
        @keyframes cltSpinOnce { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        @keyframes cltProgressBar { from { transform:scaleX(1); } to { transform:scaleX(0); } }
        @keyframes cltStuckPulse { 0%,100% { opacity:0.3; } 50% { opacity:0.8; } }
      `}</style>

      {/* ════════ HEADER ════════ */}
      <div style={{ marginBottom: 16 }}>
        {/* Title row */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexWrap: "wrap", gap: 8, marginBottom: 12,
        }}>
          <div>
            <h2 style={{
              fontSize: 20, fontWeight: 700, color: c.t1, margin: 0,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 22 }}>🗺️</span>
              Customer Location Tracker
            </h2>
            <p style={{ fontSize: 12, color: c.t3, margin: "4px 0 0" }}>
              Live tracking • Sitting / Meeting / Diksha / Pending • Esc to clear
            </p>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={() => setAutoRefreshActive(p => !p)}
              style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 8,
                background: autoRefreshActive ? c.statusActive.bg : c.panelBg,
                border: `1px solid ${autoRefreshActive ? c.statusActive.border : c.panelBorder}`,
                color: autoRefreshActive ? c.statusActive.text : c.t3,
                cursor: "pointer",
              }}
            >
              {autoRefreshActive ? `🔄 ${countdown}s` : "⏸ Paused"}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 200, maxWidth: 400, position: "relative" }}>
            <span style={{
              position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
              fontSize: 15, color: c.t4, pointerEvents: "none",
            }}>🔍</span>
            <input
              ref={searchRef}
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search name, roll, location, date, mode..."
              style={{
                width: "100%", borderRadius: 14,
                background: c.inputBg, border: `1px solid ${c.inputBorder}`,
                padding: "10px 36px 10px 38px", fontSize: 14, color: c.inputText,
                outline: "none", transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
              onFocus={e => { e.target.style.borderColor = c.inputBorderFocus; e.target.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; }}
              onBlur={e => { e.target.style.borderColor = c.inputBorder; e.target.style.boxShadow = "none"; }}
            />
            {q && (
              <button
                onClick={() => { setQ(""); searchRef.current?.focus(); }}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 22, height: 22, borderRadius: "50%",
                  background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 12, color: c.t3,
                }}
              >✕</button>
            )}
          </div>

          {!loading && (
            <span style={{
              fontSize: 12, fontWeight: 600, padding: "5px 12px", borderRadius: 10,
              background: c.badgeBg, border: `1px solid ${c.badgeBorder}`, color: c.badgeText,
            }}>
              {processed.length} result{processed.length !== 1 ? "s" : ""}
            </span>
          )}

          <button onClick={handleRefresh} title="Refresh" style={{
            width: 38, height: 38, borderRadius: 12,
            background: c.panelBg, border: `1px solid ${c.panelBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 18,
            animation: refreshSpin ? "cltSpinOnce 0.6s ease" : "none",
          }}>🔄</button>

          <button onClick={toggleView} title={viewMode === "grid" ? "List view" : "Grid view"} style={{
            width: 38, height: 38, borderRadius: 12,
            background: c.panelBg, border: `1px solid ${c.panelBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 18,
          }}>{viewMode === "grid" ? "☰" : "▦"}</button>

          <button onClick={toggleGroup} title={grouped ? "Flat view" : "Group by location"} style={{
            width: 38, height: 38, borderRadius: 12,
            background: grouped ? c.acc + "22" : c.panelBg,
            border: `1px solid ${grouped ? c.acc : c.panelBorder}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: 16, color: grouped ? c.acc : c.t3,
          }}>🗂️</button>
        </div>

        {/* Location filter chips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {LOCATION_TYPES.map(lt => {
            const active = filterLoc === lt.key;
            const lc = lt.key !== "ALL" ? getLocColor(lt.key, c) : null;
            return (
              <button key={lt.key} onClick={() => setFilterLoc(lt.key)} style={{
                fontSize: 12, fontWeight: active ? 600 : 400,
                padding: "5px 14px", borderRadius: 10,
                background: active ? (lc ? lc.bg : c.acc + "22") : c.chipBg,
                border: `1px solid ${active ? (lc ? lc.border : c.acc) : c.chipBorder}`,
                color: active ? (lc ? lc.text : c.acc) : c.chipText,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >
                {lt.icon} {lt.label}
              </button>
            );
          })}
        </div>

        {/* Row 2: Date filter + Gender + Sort + Special filters */}
        <div style={{
          display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
        }}>
          {/* Date presets */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {DATE_PRESETS.map(dp => (
              <button key={dp.key} onClick={() => setDatePreset(dp.key)} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 8,
                background: datePreset === dp.key ? c.acc + "22" : c.chipBg,
                border: `1px solid ${datePreset === dp.key ? c.acc : c.chipBorder}`,
                color: datePreset === dp.key ? c.acc : c.chipText,
                cursor: "pointer", transition: "transform 0.12s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
              >{dp.label}</button>
            ))}
          </div>

          {/* Custom date inputs */}
          {datePreset === "custom" && (
            <div style={{
              display: "flex", gap: 6, alignItems: "center",
              animation: "cltFadeSlideIn 0.25s ease both",
            }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{
                  fontSize: 11, padding: "4px 8px", borderRadius: 8,
                  background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.inputText,
                  outline: "none",
                }}
              />
              <span style={{ fontSize: 11, color: c.t4 }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{
                  fontSize: 11, padding: "4px 8px", borderRadius: 8,
                  background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.inputText,
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Divider */}
          <div style={{ width: 1, height: 24, background: c.divider }} />

          {/* Gender filter */}
          <div style={{ display: "flex", gap: 4 }}>
            {GENDER_FILTERS.map(gf => (
              <button key={gf.key} onClick={() => setFilterGender(gf.key)} style={{
                fontSize: 11, padding: "4px 10px", borderRadius: 8,
                background: filterGender === gf.key ? c.acc + "22" : c.chipBg,
                border: `1px solid ${filterGender === gf.key ? c.acc : c.chipBorder}`,
                color: filterGender === gf.key ? c.acc : c.chipText,
                cursor: "pointer",
              }}>{gf.label}</button>
            ))}
          </div>

          <div style={{ width: 1, height: 24, background: c.divider }} />

          {/* Special toggle filters */}
          <button onClick={() => setStuckOnly(p => !p)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 8,
            background: stuckOnly ? c.errorBg : c.chipBg,
            border: `1px solid ${stuckOnly ? c.errorBorder : c.chipBorder}`,
            color: stuckOnly ? c.errorText : c.chipText,
            cursor: "pointer",
          }}>🚨 Stuck Only</button>

          <button onClick={() => setOccupiedOnly(p => !p)} style={{
            fontSize: 11, padding: "4px 10px", borderRadius: 8,
            background: occupiedOnly ? "rgba(16,185,129,0.10)" : c.chipBg,
            border: `1px solid ${occupiedOnly ? "rgba(16,185,129,0.20)" : c.chipBorder}`,
            color: occupiedOnly ? (isLight ? "#059669" : "#6ee7b7") : c.chipText,
            cursor: "pointer",
          }}>📅 Occupied</button>

          <div style={{ width: 1, height: 24, background: c.divider }} />

          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
            fontSize: 11, padding: "5px 26px 5px 8px", borderRadius: 8,
            background: c.inputBg, border: `1px solid ${c.inputBorder}`, color: c.inputText,
            cursor: "pointer", outline: "none", appearance: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
          }}>
            {SORT_OPTIONS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* ════════ STATS ════════ */}
      {!loading && items.length > 0 && <EnhancedStats items={items} c={c} />}

      {/* ════════ AUTO-REFRESH PROGRESS ════════ */}
      {autoRefreshActive && !loading && (
        <div style={{ height: 2, borderRadius: 1, marginBottom: 12, background: c.panelBg, overflow: "hidden" }}>
          <div key={lastRefreshTime} style={{
            height: "100%", background: c.acc, borderRadius: 1,
            transformOrigin: "left",
            animation: `cltProgressBar ${AUTO_REFRESH_MS / 1000}s linear`,
            willChange: "transform",
          }} />
        </div>
      )}

      {/* ════════ ERROR ════════ */}
      {err && (
        <div style={{
          marginBottom: 12, borderRadius: 14,
          border: `1px solid ${c.errorBorder}`, background: c.errorBg,
          padding: "12px 16px", fontSize: 13, color: c.errorText,
          display: "flex", alignItems: "center", gap: 8,
          animation: "cltFadeSlideIn 0.3s ease both",
        }}>⚠️ {err}</div>
      )}

      {/* ════════ LOADING ════════ */}
      {loading ? (
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: gridCols }}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} c={c} />)}
        </div>
      ) : processed.length === 0 ? (
        /* ════════ EMPTY STATE ════════ */
        <div style={{
          textAlign: "center", padding: "48px 20px",
          animation: "cltFadeSlideIn 0.4s ease both",
        }}>
          <div style={{ fontSize: 56, marginBottom: 12, opacity: 0.6 }}>
            {q || filterLoc !== "ALL" || stuckOnly || occupiedOnly ? "🔎" : "🗺️"}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: c.t2, marginBottom: 4 }}>
            {q ? "No matching customers" : stuckOnly ? "No stuck customers" : occupiedOnly ? "No occupied customers" : "No customers found"}
          </div>
          <div style={{ fontSize: 13, color: c.t3 }}>
            {q ? `No results for "${q}". Try different search.`
              : "Customer locations will appear here once data is available."}
          </div>
          {(q || filterLoc !== "ALL" || stuckOnly || occupiedOnly) && (
            <button onClick={() => { setQ(""); setFilterLoc("ALL"); setStuckOnly(false); setOccupiedOnly(false); setDatePreset("all"); setFilterGender("ALL"); }}
              style={{
                marginTop: 16, padding: "8px 20px", borderRadius: 10,
                background: c.panelBg, border: `1px solid ${c.panelBorder}`,
                color: c.acc, fontSize: 13, fontWeight: 600, cursor: "pointer",
                transition: "transform 0.12s ease",
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >Clear All Filters</button>
          )}
        </div>
      ) : grouped && groupedItems ? (
        /* ════════ GROUPED VIEW ════════ */
        <div>
          {groupedItems.map(g => (
            <div key={g.type}>
              <GroupHeader type={g.type} count={g.items.length} c={c} />
              <div style={{ display: "grid", gap: 12, gridTemplateColumns: gridCols, marginBottom: 8 }}>
                {g.items.map((item, i) => (
                  <LocationCard
                    key={item._id}
                    item={item} c={c} isLight={isLight}
                    index={i} viewMode={viewMode} now={now}
                    onOpenProfile={() => openProfile(item)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ════════ FLAT VIEW ════════ */
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: gridCols }}>
          {processed.map((item, i) => (
            <LocationCard
              key={item._id}
              item={item} c={c} isLight={isLight}
              index={i} viewMode={viewMode} now={now}
              onOpenProfile={() => openProfile(item)}
            />
          ))}
        </div>
      )}

      {/* ════════ MOBILE SWIPE HINT ════════ */}
      {!loading && processed.length > 0 && (
        <>
          <style>{`@media(max-width:640px){.clt-swipe-hint{display:block!important;}}`}</style>
          <div className="clt-swipe-hint" style={{
            display: "none", textAlign: "center", marginTop: 14, fontSize: 11, color: c.t4,
          }}>
            👈 Swipe left for profile • Swipe right to call 👉
          </div>
        </>
      )}

      {/* ════════ PROFILE MODAL ════════ */}
      <CustomerProfileModal
        open={profileOpen}
        onClose={() => { setProfileOpen(false); setProfileCustomer(null); }}
        customer={profileCustomer}
        source={profileCustomer?.sourceDb === "PENDING" ? "PENDING" : "SITTING"}
        onChanged={load}
      />
    </div>
  );
}
