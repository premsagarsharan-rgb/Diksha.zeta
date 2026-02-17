// components/dashboard/calander/history/HistoryHeader.js
"use client";

import { useState, useEffect } from "react";
import { useCT } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import { SORT_OPTIONS, VIEW_MODES } from "./historyUtils";

export default function HistoryHeader({
  total,
  stats,
  isOpen,
  onToggle,

  // filters
  search,
  onSearchChange,
  genderFilter,
  onGenderChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,

  // NEW: print + pending info
  onPrint, // optional
  pendingCount, // optional
  containerDate, // optional

  variant,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const [searchOpen, setSearchOpen] = useState(false);
  const [animCount, setAnimCount] = useState(0);

  // Animated counter
  useEffect(() => {
    if (total <= 0) {
      setAnimCount(0);
      return;
    }
    let current = 0;
    const step = Math.max(1, Math.ceil(total / 20));
    const timer = setInterval(() => {
      current += step;
      if (current >= total) {
        current = total;
        clearInterval(timer);
      }
      setAnimCount(current);
    }, 40);
    return () => clearInterval(timer);
  }, [total]);

  const isCompact = variant === "compact";

  const confirmedCount = total || 0;
  const pending = typeof pendingCount === "number" ? pendingCount : null;

  // Pending vs Confirmed bar
  const showPendingBar = pending !== null;
  const pendingBarTotal = (pending || 0) + confirmedCount;
  const pendingPct =
    pendingBarTotal > 0 ? Math.round(((pending || 0) / pendingBarTotal) * 100) : 0;
  const confirmedPct = 100 - pendingPct;

  return (
    <div>
      {/* Main header row */}
      <div
        className="flex items-center justify-between gap-3"
        style={{ cursor: "pointer" }}
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter") onToggle();
        }}
      >
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span
            style={{
              fontSize: 20,
              transition: "transform 0.3s ease",
              transform: isOpen ? "scale(1.1)" : "scale(1)",
              display: "flex",
              alignItems: "center",
            }}
          >
            ✅
          </span>

          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14, fontWeight: 700, color: c.historyText }}>
                Confirmed History
              </span>

              {/* Animated counter badge */}
              <span
                style={{
                  fontSize: 11,
                  padding: "2px 10px",
                  borderRadius: 999,
                  background: c.historyBg,
                  border: `1px solid ${c.historyBorder}`,
                  color: c.historyAccent,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: c.historyAccent,
                    animation: total > 0 ? "pulse 2s infinite" : "none",
                  }}
                />
                {animCount}
              </span>
            </div>

            {/* Subtitle */}
            {!isOpen ? (
              <div style={{ fontSize: 10, color: c.historyMuted, marginTop: 1 }}>
                {stats?.male > 0 && `♂ ${stats.male}`}
                {stats?.male > 0 && stats?.female > 0 && " • "}
                {stats?.female > 0 && `♀ ${stats.female}`}
                {stats?.couples > 0 && ` • 💑 ${stats.couples}`}
                {stats?.families > 0 && ` • 👨‍👩‍👧 ${stats.families}`}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: c.historyMuted, marginTop: 1 }}>
                {containerDate ? (
                  <>
                    Date: <b style={{ color: c.historyText }}>{containerDate}</b>
                  </>
                ) : (
                  "Tap to collapse"
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
          {/* Print */}
          {isOpen && total > 0 && typeof onPrint === "function" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPrint?.();
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: c.btnGhostBg,
                border: `1px solid ${c.btnGhostBorder}`,
                color: c.btnGhostText,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Print history"
            >
              🖨
            </button>
          )}

          {/* Search toggle */}
          {isOpen && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSearchOpen((v) => !v);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: searchOpen ? c.historyBg : c.btnGhostBg,
                border: `1px solid ${searchOpen ? c.historyBorder : c.btnGhostBorder}`,
                color: searchOpen ? c.historyAccent : c.btnGhostText,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Search"
            >
              🔍
            </button>
          )}

          {/* Expand/Collapse arrow */}
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: c.btnGhostBg,
              border: `1px solid ${c.btnGhostBorder}`,
              color: c.btnGhostText,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform 0.25s ease",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            ▾
          </div>
        </div>
      </div>

      {/* Pending vs Confirmed bar */}
      {isOpen && showPendingBar && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: `1px solid ${c.historyBorder}`,
            background: c.historyBg,
            padding: "8px 12px",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: c.historyMuted, fontWeight: 700, letterSpacing: "0.04em" }}>
              PENDING vs CONFIRMED
            </span>
            <span style={{ fontSize: 10, color: c.historyMuted }}>
              Pending: <b style={{ color: c.t1 }}>{pending}</b> • Confirmed:{" "}
              <b style={{ color: c.t1 }}>{confirmedCount}</b>
            </span>
          </div>

          <div
            style={{
              height: 8,
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              background: c.panelBg,
              border: `1px solid ${c.panelBorder}`,
            }}
          >
            <div
              style={{
                width: `${pendingPct}%`,
                background: c.btnRejectText,
                opacity: 0.75,
                transition: "width 0.25s ease",
              }}
              title={`Pending ${pendingPct}%`}
            />
            <div
              style={{
                width: `${confirmedPct}%`,
                background: c.confirmedText,
                opacity: 0.75,
                transition: "width 0.25s ease",
              }}
              title={`Confirmed ${confirmedPct}%`}
            />
          </div>
        </div>
      )}

      {/* Expanded controls */}
      {isOpen && (
        <div style={{ marginTop: 10 }}>
          {/* Search bar */}
          {searchOpen && (
            <div style={{ marginBottom: 8 }} onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search name or address..."
                style={{
                  width: "100%",
                  padding: "8px 14px",
                  borderRadius: 14,
                  border: `1px solid ${c.historyBorder}`,
                  background: c.historyBg,
                  color: c.t1,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>
          )}

          {/* Filters row */}
          <div className="flex items-center gap-1.5 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {/* Gender filters */}
            {["ALL", "MALE", "FEMALE"].map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => onGenderChange(g)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 600,
                  border: `1px solid ${genderFilter === g ? c.historyBorder : c.btnGhostBorder}`,
                  background: genderFilter === g ? c.historyBg : c.btnGhostBg,
                  color: genderFilter === g ? c.historyAccent : c.btnGhostText,
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
              >
                {g === "ALL" ? "👥 All" : g === "MALE" ? "♂ Male" : "♀ Female"}
              </button>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: c.divider, margin: "0 2px" }} />

            {/* Sort */}
            {SORT_OPTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onSortChange(s.key)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 600,
                  border: `1px solid ${sortBy === s.key ? c.historyBorder : c.btnGhostBorder}`,
                  background: sortBy === s.key ? c.historyBg : c.btnGhostBg,
                  color: sortBy === s.key ? c.historyAccent : c.btnGhostText,
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
                title={s.label}
              >
                {s.icon}
              </button>
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 18, background: c.divider, margin: "0 2px" }} />

            {/* View mode */}
            {VIEW_MODES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => onViewModeChange(v.key)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  border: `1px solid ${viewMode === v.key ? c.historyBorder : c.btnGhostBorder}`,
                  background: viewMode === v.key ? c.historyBg : c.btnGhostBg,
                  color: viewMode === v.key ? c.historyAccent : c.btnGhostText,
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
                title={v.label}
              >
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
      `}</style>
    </div>
  );
}
