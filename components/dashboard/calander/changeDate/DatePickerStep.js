// components/dashboard/calander/changeDate/DatePickerStep.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCT, getModeStyle } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import BufferSpinner from "@/components/BufferSpinner";
import {
  ymdLocal,
  monthCells,
  WEEKDAYS,
  fetchMonthCapacity,
  getDateCellStyle,
  isBlocked,
  isPastDate,
  getCapacityTier,
} from "./changeDateUtils";

export default function DatePickerStep({
  mode,
  pickerMode,
  currentDate,
  occupiedDate,
  containerDate,
  groupSize = 1,
  selectedDate,
  onSelect,
  onConfirm,
  onBack,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);
  const ms = getModeStyle(mode, c);

  const todayStr = useMemo(() => ymdLocal(new Date()), []);

  /* ── Determine boundary ── */
  const { boundaryDate, boundaryDirection, pickerModeLabel, targetMode } =
    useMemo(() => {
      if (pickerMode === "CHANGE_MEETING_DATE") {
        return {
          boundaryDate: occupiedDate || null,
          boundaryDirection: "BEFORE",
          pickerModeLabel: "Pick New Meeting Date",
          targetMode: "MEETING",
        };
      }
      if (pickerMode === "CHANGE_OCCUPIED_DATE") {
        return {
          boundaryDate: containerDate || null,
          boundaryDirection: "AFTER",
          pickerModeLabel: "Pick New Diksha Date",
          targetMode: "DIKSHA",
        };
      }
      if (pickerMode === "CHANGE_DIKSHA_DATE") {
        return {
          boundaryDate: null,
          boundaryDirection: null,
          pickerModeLabel: "Pick New Diksha Date",
          targetMode: "DIKSHA",
        };
      }
      if (pickerMode === "CHANGE_BOTH_MEETING") {
        return {
          boundaryDate: occupiedDate || null,
          boundaryDirection: "BEFORE",
          pickerModeLabel: "Step 1: Pick New Meeting Date",
          targetMode: "MEETING",
        };
      }
      if (pickerMode === "CHANGE_BOTH_OCCUPY") {
        return {
          boundaryDate: containerDate || null,
          boundaryDirection: "AFTER",
          pickerModeLabel: "Step 2: Pick New Diksha Date",
          targetMode: "DIKSHA",
        };
      }
      return {
        boundaryDate: null,
        boundaryDirection: null,
        pickerModeLabel: "Pick Date",
        targetMode: mode,
      };
    }, [pickerMode, occupiedDate, containerDate, mode]);

  /* ── Calendar state ── */
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

  /* ── Fetch capacity ── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMonthCapacity(year, month, targetMode).then((data) => {
      if (!cancelled) {
        setCapacities(data);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [year, month, targetMode]);

  function prevMonth() {
    setAnchor(new Date(year, month - 1, 1));
  }
  function nextMonth() {
    setAnchor(new Date(year, month + 1, 1));
  }

  /* ── Click handler ── */
  function handleDateClick(dateStr) {
    const blocked = isBlocked(dateStr, {
      currentDate,
      boundaryDate,
      boundaryDirection,
    });
    if (blocked) return;

    const cap = capacities[dateStr];
    if (cap && cap.remaining - groupSize < 0) return;

    onSelect?.(dateStr);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Picker title */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.t1 }}>
          {pickerModeLabel}
        </div>
        <div style={{ fontSize: 11, color: c.t3, marginTop: 2 }}>
          Current: <b>{currentDate}</b>
          {groupSize > 1 && ` • Moving ${groupSize} members`}
        </div>
      </div>

      {/* Boundary warning */}
      {boundaryDate && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${c.pickBoundaryBorder}`,
            background: c.pickBoundaryBg,
            padding: "8px 12px",
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
              ? `Must be BEFORE occupied date: ${boundaryDate}`
              : `Must be AFTER meeting date: ${boundaryDate}`}
          </span>
        </div>
      )}

      {/* Past date info */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${c.panelBorder}`,
          background: c.panelBg,
          padding: "6px 12px",
          fontSize: 10,
          color: c.t3,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>📅</span>
        <span>Today: <b style={{ color: c.t1 }}>{todayStr}</b> • Past dates are blocked</span>
      </div>

      {/* Calendar container */}
      <div
        style={{
          borderRadius: 22,
          border: `1px solid ${c.surfaceBorder}`,
          background: c.surfaceBg,
          padding: 14,
        }}
      >
        {/* Month nav */}
        <div
          className="flex items-center justify-between"
          style={{ marginBottom: 10 }}
        >
          <button
            type="button"
            onClick={prevMonth}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: c.navBtnBg,
              border: `1px solid ${c.navBtnBorder}`,
              color: c.navBtnText,
              fontSize: 13,
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
              fontSize: 13,
              fontWeight: 700,
              color: c.t1,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {monthLabel}
            {loading && <BufferSpinner size={13} />}
          </div>
          <button
            type="button"
            onClick={nextMonth}
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              background: c.navBtnBg,
              border: `1px solid ${c.navBtnBorder}`,
              color: c.navBtnText,
              fontSize: 13,
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
            marginBottom: 3,
          }}
        >
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontSize: 9,
                fontWeight: 600,
                color: i === 0 ? c.weekdaySun : c.weekdayText,
                padding: "3px 0",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Grid */}
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
                  key={`e-${idx}`}
                  style={{ aspectRatio: "1", borderRadius: 10 }}
                />
              );
            }

            const dateStr = ymdLocal(cell);
            const dayNum = cell.getDate();
            const isSun = cell.getDay() === 0;
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const isCurr = dateStr === currentDate;
            const isBound = dateStr === boundaryDate;
            const isPast = isPastDate(dateStr);

            const blocked = isBlocked(dateStr, {
              currentDate,
              boundaryDate,
              boundaryDirection,
            });

            const cellStyle = getDateCellStyle(dateStr, {
              currentDate,
              boundaryDate,
              boundaryDirection,
              capacities,
              groupSize,
              c,
            });

            const cap = capacities[dateStr];
            const canFit = !cap || cap.remaining - groupSize >= 0;
            const disabled = blocked || (!canFit && !isCurr);

            return (
              <button
                key={dateStr}
                type="button"
                disabled={disabled}
                onClick={() => handleDateClick(dateStr)}
                style={{
                  aspectRatio: "1",
                  borderRadius: 10,
                  background: isSelected ? ms.bg : cellStyle.bg,
                  border: `1.5px solid ${
                    isSelected
                      ? ms.border
                      : isToday
                      ? c.dayTodayBorder
                      : cellStyle.border
                  }`,
                  color: isSelected
                    ? ms.text
                    : isSun && !disabled
                    ? c.daySunText
                    : cellStyle.text,
                  fontSize: 11,
                  fontWeight: isSelected || isCurr ? 800 : 600,
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled && !isCurr && !isBound ? 0.35 : 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 0,
                  position: "relative",
                  transition: "all 0.1s ease",
                  padding: 1,
                  textDecoration: isPast && !isCurr ? "line-through" : "none",
                }}
                onPointerDown={(e) => {
                  if (!disabled)
                    e.currentTarget.style.transform = "scale(0.94)";
                }}
                onPointerUp={(e) => (e.currentTarget.style.transform = "")}
                onPointerLeave={(e) =>
                  (e.currentTarget.style.transform = "")
                }
                title={
                  isPast && !isCurr
                    ? "❌ Past date — cannot select"
                    : isCurr
                    ? "📍 Current"
                    : isBound
                    ? "🔒 Boundary"
                    : blocked
                    ? "❌ Blocked"
                    : cap
                    ? `${cap.used}/${cap.limit} • ${cap.remaining} left`
                    : "Available"
                }
              >
                <span style={{ lineHeight: 1 }}>{dayNum}</span>

                {/* Remaining count */}
                {!blocked && !isCurr && cap ? (
                  <span
                    style={{
                      fontSize: 6,
                      fontWeight: 700,
                      lineHeight: 1,
                      opacity: 0.75,
                    }}
                  >
                    {cap.remaining}
                  </span>
                ) : null}

                {/* Past date indicator */}
                {isPast && !isCurr && (
                  <span
                    style={{
                      position: "absolute",
                      top: 1,
                      left: 2,
                      fontSize: 7,
                      opacity: 0.6,
                    }}
                  >
                    ✕
                  </span>
                )}

                {/* Current pin */}
                {isCurr && (
                  <span
                    style={{
                      position: "absolute",
                      top: 1,
                      right: 2,
                      fontSize: 7,
                    }}
                  >
                    📍
                  </span>
                )}

                {/* Boundary lock */}
                {isBound && !isCurr && (
                  <span
                    style={{
                      position: "absolute",
                      top: 1,
                      right: 2,
                      fontSize: 7,
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
                      bottom: 2,
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 3,
                      height: 3,
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
                      borderRadius: 11,
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
          className="flex flex-wrap gap-2"
          style={{
            marginTop: 10,
            paddingTop: 8,
            borderTop: `1px solid ${c.divider}`,
          }}
        >
          {[
            { dot: c.pickOkDot, label: "Available" },
            { dot: c.pickMidDot, label: "Filling" },
            { dot: c.pickHighDot, label: "Almost Full" },
            { dot: c.pickFullDot, label: "Full" },
            { dot: c.pickCurrentDot, label: "Current" },
            { dot: c.pickBlockedIcon, label: "Past/Blocked" },
            ...(boundaryDate
              ? [{ dot: c.pickBoundaryIcon, label: "Boundary" }]
              : []),
          ].map((item) => (
            <div
              key={item.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 8,
                color: c.t3,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: item.dot,
                  flexShrink: 0,
                }}
              />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Selected info */}
      {selectedDate && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${ms.border}`,
            background: ms.bg,
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{ fontSize: 12, fontWeight: 600, color: ms.text }}
          >
            ✓ Selected: {selectedDate}
          </span>
          {capacities[selectedDate] && (
            <span
              style={{ fontSize: 10, color: ms.text, opacity: 0.7 }}
            >
              {capacities[selectedDate].used}/
              {capacities[selectedDate].limit} •{" "}
              {capacities[selectedDate].remaining} left
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2" style={{ marginTop: 4 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 18,
            background: c.btnGhostBg,
            color: c.btnGhostText,
            border: `1px solid ${c.btnGhostBorder}`,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!selectedDate}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 18,
            background: selectedDate ? c.btnSolidBg : c.btnGhostBg,
            color: selectedDate ? c.btnSolidText : c.t3,
            border: selectedDate
              ? "none"
              : `1px solid ${c.btnGhostBorder}`,
            fontSize: 13,
            fontWeight: 600,
            cursor: selectedDate ? "pointer" : "not-allowed",
            opacity: selectedDate ? 1 : 0.5,
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
