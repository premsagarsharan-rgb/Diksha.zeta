// components/dashboard/calander/ChangeDatePicker.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCT, getModeStyle } from "./calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import BufferSpinner from "@/components/BufferSpinner";

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function ChangeDatePicker({
  mode,
  currentDate,
  occupiedDate,
  boundaryDate,
  boundaryDirection,
  groupSize = 1,
  selectedDate,
  onSelect,
  onMonthChange,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);
  const ms = getModeStyle(mode, c);

  const todayStr = useMemo(() => ymdLocal(new Date()), []);

  const [anchor, setAnchor] = useState(() => {
    if (currentDate) {
      const [y, m] = currentDate.split("-").map(Number);
      return new Date(y, m - 1, 1);
    }
    return new Date();
  });

  const [capacities, setCapacities] = useState({});
  const [loading, setLoading] = useState(false);

  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const cells = useMemo(() => monthCells(year, month), [year, month]);

  const monthLabel = anchor.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // Fetch capacity for current month
  useEffect(() => {
    fetchCapacity();
  }, [year, month, mode]);

  async function fetchCapacity() {
    setLoading(true);
    try {
      const from = ymdLocal(new Date(year, month, 1));
      const to = ymdLocal(new Date(year, month + 1, 0));
      const res = await fetch(
        `/api/calander/capacity-preview?from=${from}&to=${to}&mode=${mode}`
      );
      const data = await res.json().catch(() => ({}));
      setCapacities(data.capacities || {});
    } catch (e) {
      console.error("Capacity fetch failed:", e);
      setCapacities({});
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    const next = new Date(year, month - 1, 1);
    setAnchor(next);
    onMonthChange?.(next);
  }

  function nextMonth() {
    const next = new Date(year, month + 1, 1);
    setAnchor(next);
    onMonthChange?.(next);
  }

  function isBlocked(dateStr) {
    if (!dateStr) return true;
    if (dateStr === currentDate) return true;

    if (boundaryDate && boundaryDirection === "BEFORE") {
      if (dateStr >= boundaryDate) return true;
    }
    if (boundaryDate && boundaryDirection === "AFTER") {
      if (dateStr <= boundaryDate) return true;
    }

    return false;
  }

  function isBoundary(dateStr) {
    return dateStr === boundaryDate;
  }

  function isCurrent(dateStr) {
    return dateStr === currentDate;
  }

  function getTierStyle(dateStr) {
    if (isCurrent(dateStr)) {
      return {
        bg: c.pickCurrentBg,
        border: c.pickCurrentBorder,
        text: c.pickCurrentText,
        dot: c.pickCurrentDot,
      };
    }
    if (isBoundary(dateStr)) {
      return {
        bg: c.pickBoundaryBg,
        border: c.pickBoundaryBorder,
        text: c.pickBoundaryText,
        dot: c.pickBoundaryIcon,
      };
    }
    if (isBlocked(dateStr)) {
      return {
        bg: c.pickBlockedBg,
        border: c.pickBlockedBorder,
        text: c.pickBlockedText,
        dot: c.pickBlockedIcon,
      };
    }

    const cap = capacities[dateStr];
    if (!cap) {
      return {
        bg: c.pickOkBg,
        border: c.pickOkBorder,
        text: c.pickOkText,
        dot: c.pickOkDot,
      };
    }

    const remainAfter = cap.remaining - groupSize;
    if (remainAfter < 0) {
      return {
        bg: c.pickFullBg,
        border: c.pickFullBorder,
        text: c.pickFullText,
        dot: c.pickFullDot,
      };
    }

    switch (cap.tier) {
      case "FULL":
        return {
          bg: c.pickFullBg,
          border: c.pickFullBorder,
          text: c.pickFullText,
          dot: c.pickFullDot,
        };
      case "HIGH":
        return {
          bg: c.pickHighBg,
          border: c.pickHighBorder,
          text: c.pickHighText,
          dot: c.pickHighDot,
        };
      case "MID":
        return {
          bg: c.pickMidBg,
          border: c.pickMidBorder,
          text: c.pickMidText,
          dot: c.pickMidDot,
        };
      default:
        return {
          bg: c.pickOkBg,
          border: c.pickOkBorder,
          text: c.pickOkText,
          dot: c.pickOkDot,
        };
    }
  }

  function handleDateClick(dateStr) {
    if (isBlocked(dateStr)) return;

    const cap = capacities[dateStr];
    if (cap && cap.remaining - groupSize < 0) return;

    onSelect?.(dateStr);
  }

  return (
    <div
      style={{
        borderRadius: 22,
        border: `1px solid ${c.surfaceBorder}`,
        background: c.surfaceBg,
        padding: 16,
      }}
    >
      {/* Boundary warning */}
      {boundaryDate && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${c.pickBoundaryBorder}`,
            background: c.pickBoundaryBg,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: 11,
            color: c.pickBoundaryText,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⚠️</span>
          <span>
            {boundaryDirection === "BEFORE"
              ? `Must be BEFORE occupied: ${boundaryDate}`
              : `Must be AFTER meeting: ${boundaryDate}`}
          </span>
        </div>
      )}

      {/* Month navigation */}
      <div
        className="flex items-center justify-between"
        style={{ marginBottom: 12 }}
      >
        <button
          type="button"
          onClick={prevMonth}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: c.navBtnBg,
            border: `1px solid ${c.navBtnBorder}`,
            color: c.navBtnText,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ◂
        </button>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: c.t1,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {monthLabel}
          {loading && <BufferSpinner size={14} />}
        </div>
        <button
          type="button"
          onClick={nextMonth}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: c.navBtnBg,
            border: `1px solid ${c.navBtnBorder}`,
            color: c.navBtnText,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ▸
        </button>
      </div>

      {/* Weekday headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 2,
          marginBottom: 4,
        }}
      >
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            style={{
              textAlign: "center",
              fontSize: 10,
              fontWeight: 600,
              color: i === 0 ? c.weekdaySun : c.weekdayText,
              padding: "4px 0",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
        }}
      >
        {cells.map((cell, idx) => {
          if (!cell) {
            return (
              <div
                key={`empty-${idx}`}
                style={{
                  aspectRatio: "1",
                  borderRadius: 12,
                }}
              />
            );
          }

          const dateStr = ymdLocal(cell);
          const dayNum = cell.getDate();
          const isSun = cell.getDay() === 0;
          const blocked = isBlocked(dateStr);
          const boundary = isBoundary(dateStr);
          const current = isCurrent(dateStr);
          const isSelected = dateStr === selectedDate;
          const isToday = dateStr === todayStr;
          const tier = getTierStyle(dateStr);
          const cap = capacities[dateStr];
          const canFit = !cap || cap.remaining - groupSize >= 0;
          const disabled = blocked || (!canFit && !current);

          return (
            <button
              key={dateStr}
              type="button"
              disabled={disabled}
              onClick={() => handleDateClick(dateStr)}
              style={{
                aspectRatio: "1",
                borderRadius: 12,
                background: isSelected
                  ? ms.bg
                  : tier.bg,
                border: `1.5px solid ${
                  isSelected
                    ? ms.border
                    : isToday
                    ? c.dayTodayBorder
                    : tier.border
                }`,
                color: isSelected
                  ? ms.text
                  : isSun && !disabled
                  ? c.daySunText
                  : tier.text,
                fontSize: 12,
                fontWeight: isSelected || current ? 800 : 600,
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: disabled && !current && !boundary ? 0.4 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                position: "relative",
                transition: "all 0.12s ease",
                padding: 2,
              }}
              onPointerDown={(e) => {
                if (!disabled)
                  e.currentTarget.style.transform = "scale(0.95)";
              }}
              onPointerUp={(e) => (e.currentTarget.style.transform = "")}
              onPointerLeave={(e) =>
                (e.currentTarget.style.transform = "")
              }
              title={
                current
                  ? "📍 Current date"
                  : boundary
                  ? `🔒 Boundary: ${boundaryDate}`
                  : blocked
                  ? "❌ Blocked"
                  : cap
                  ? `${cap.used}/${cap.limit} (${cap.remaining} left)`
                  : "Available"
              }
            >
              {/* Day number */}
              <span style={{ lineHeight: 1 }}>{dayNum}</span>

              {/* Capacity indicator */}
              {!blocked && !current && cap ? (
                <span
                  style={{
                    fontSize: 7,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: tier.text,
                    opacity: 0.8,
                  }}
                >
                  {cap.remaining}
                </span>
              ) : null}

              {/* Current marker */}
              {current && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    fontSize: 8,
                  }}
                >
                  📍
                </span>
              )}

              {/* Boundary marker */}
              {boundary && !current && (
                <span
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 2,
                    fontSize: 8,
                  }}
                >
                  🔒
                </span>
              )}

              {/* Today dot */}
              {isToday && !isSelected && (
                <span
                  style={{
                    position: "absolute",
                    bottom: 3,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: c.dayTodayDot,
                  }}
                />
              )}

              {/* Selected ring */}
              {isSelected && (
                <span
                  style={{
                    position: "absolute",
                    inset: -1,
                    borderRadius: 13,
                    border: `2px solid ${ms.accent}`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-3"
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${c.divider}`,
        }}
      >
        {[
          { dot: c.pickOkDot, label: "Available" },
          { dot: c.pickMidDot, label: "Filling" },
          { dot: c.pickHighDot, label: "Almost Full" },
          { dot: c.pickFullDot, label: "Full" },
          { dot: c.pickCurrentDot, label: "Current" },
          ...(boundaryDate
            ? [{ dot: c.pickBoundaryIcon, label: "Boundary" }]
            : []),
        ].map((item) => (
          <div
            key={item.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 9,
              color: c.t3,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: item.dot,
                flexShrink: 0,
              }}
            />
            {item.label}
          </div>
        ))}
      </div>

      {/* Selected info */}
      {selectedDate && capacities[selectedDate] && (
        <div
          style={{
            marginTop: 10,
            borderRadius: 14,
            border: `1px solid ${ms.border}`,
            background: ms.bg,
            padding: "8px 12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 600, color: ms.text }}>
            Selected: {selectedDate}
          </span>
          <span style={{ fontSize: 11, color: ms.text, opacity: 0.7 }}>
            {capacities[selectedDate].used}/{capacities[selectedDate].limit} •{" "}
            {capacities[selectedDate].remaining} left
          </span>
        </div>
      )}
    </div>
  );
}
