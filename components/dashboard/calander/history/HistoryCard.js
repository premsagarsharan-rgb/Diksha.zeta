// components/dashboard/calander/history/HistoryCard.js
"use client";

import { useCT, getCardStyle } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import { relativeTime, formatDate, formatTime, safeId } from "./historyUtils";

export default function HistoryCard({
  record,
  index,
  viewMode,
  isGroupMember,
  groupKind,
  onOpenProfile,
  variant,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const snap = record.customerSnapshot || {};
  const gender = snap.gender;
  const cs = getCardStyle(gender, c);
  const isCompact = viewMode === "COMPACT";
  const isBypass = record.bypass === true;
  const hasMoved = (record.moveCount || 0) > 0;
  const moveCount = record.moveCount || 0;

  const confirmedAt = record.confirmedAt;
  const relTime = relativeTime(confirmedAt);
  const fullDate = formatDate(confirmedAt);
  const fullTime = formatTime(confirmedAt);

  const dikshaDate = record.occupiedDate || null;

  function handleClick(e) {
    e.stopPropagation();
    if (!snap._id && !record.customerId) return;
    onOpenProfile?.(snap._id ? snap : { _id: record.customerId, ...snap }, null);
  }

  async function handleOpenDikshaDate(e) {
    e.stopPropagation();
    if (!dikshaDate) return;

    // 1) Dispatch an app-wide event (you can listen from DikshaCalander/anywhere)
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("CALANDER_OPEN_DIKSHA_DATE", {
          detail: { date: dikshaDate },
        })
      );
    }

    // 2) Copy to clipboard (best-effort)
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(dikshaDate);
      }
    } catch {
      // ignore
    }
  }

  if (isCompact) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleClick(e);
        }}
        style={{
          borderRadius: 14,
          border: `1px solid ${cs.border}`,
          background: cs.bg,
          padding: "8px 12px",
          cursor: "pointer",
          transition: "all 0.12s ease",
          display: "flex",
          alignItems: "center",
          gap: 10,
          opacity: 0.88,
        }}
        onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
        onPointerUp={(e) => (e.currentTarget.style.transform = "")}
        onPointerLeave={(e) => (e.currentTarget.style.transform = "")}
      >
        {/* Seq */}
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 9,
            fontWeight: 700,
            flexShrink: 0,
            background: cs.seq,
            color: cs.seqText,
          }}
        >
          {index + 1}
        </span>

        {/* Info */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontWeight: 600,
                fontSize: 12,
                color: c.t1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {snap.name || "—"}
            </span>
            {isGroupMember && (
              <span style={{ fontSize: 8, color: c.historyMuted }}>({groupKind})</span>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
          {/* Gender */}
          <span
            style={{
              fontSize: 8,
              padding: "1px 6px",
              borderRadius: 999,
              background: gender === "MALE" ? c.maleBg : gender === "FEMALE" ? c.femaleBg : c.panelBg,
              border: `1px solid ${
                gender === "MALE" ? c.maleBorder : gender === "FEMALE" ? c.femaleBorder : c.panelBorder
              }`,
              color: gender === "MALE" ? c.maleText : gender === "FEMALE" ? c.femaleText : c.t3,
            }}
          >
            {gender === "MALE" ? "♂" : gender === "FEMALE" ? "♀" : "?"}
          </span>

          {hasMoved && (
            <span
              style={{
                fontSize: 8,
                padding: "1px 6px",
                borderRadius: 999,
                background: c.movedBadgeBg,
                border: `1px solid ${c.movedBadgeBorder}`,
                color: c.movedBadgeText,
                fontWeight: 600,
              }}
            >
              🔄{moveCount}
            </span>
          )}

          {isBypass && (
            <span
              style={{
                fontSize: 8,
                padding: "1px 6px",
                borderRadius: 999,
                background: c.bypassBadgeBg,
                border: `1px solid ${c.bypassBadgeBorder}`,
                color: c.bypassBadgeText,
                fontWeight: 600,
              }}
            >
              ⚡
            </span>
          )}

          {/* Time */}
          <span style={{ fontSize: 8, color: c.historyMuted, fontWeight: 600 }}>{relTime}</span>
        </div>
      </div>
    );
  }

  // DETAIL VIEW
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleClick(e);
      }}
      style={{
        borderRadius: 16,
        border: `1px solid ${cs.border}`,
        background: cs.bg,
        padding: 12,
        cursor: "pointer",
        transition: "all 0.12s ease",
        opacity: 0.88,
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.background = cs.hover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.88";
        e.currentTarget.style.background = cs.bg;
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
      onPointerUp={(e) => (e.currentTarget.style.transform = "")}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "";
        e.currentTarget.style.opacity = "0.88";
        e.currentTarget.style.background = cs.bg;
      }}
    >
      {/* Group indicator left strip */}
      {isGroupMember && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: c.historyAccent,
            borderRadius: "999px 0 0 999px",
          }}
        />
      )}

      {/* Top badges row */}
      <div className="flex items-center gap-1.5 flex-wrap" style={{ marginBottom: 8 }}>
        <span
          style={{
            fontSize: 9,
            padding: "2px 8px",
            borderRadius: 999,
            background: c.confirmedBg,
            border: `1px solid ${c.confirmedBorder}`,
            color: c.confirmedText,
            fontWeight: 600,
          }}
        >
          ✅ CONFIRMED
        </span>

        <span
          style={{
            fontSize: 9,
            padding: "2px 7px",
            borderRadius: 999,
            background: gender === "MALE" ? c.maleBg : gender === "FEMALE" ? c.femaleBg : c.panelBg,
            border: `1px solid ${
              gender === "MALE" ? c.maleBorder : gender === "FEMALE" ? c.femaleBorder : c.panelBorder
            }`,
            color: gender === "MALE" ? c.maleText : gender === "FEMALE" ? c.femaleText : c.t3,
          }}
        >
          {gender || "?"}
        </span>

        <span
          style={{
            fontSize: 9,
            padding: "2px 7px",
            borderRadius: 999,
            background: c.kindBg,
            border: `1px solid ${c.kindBorder}`,
            color: c.kindText,
          }}
        >
          {record.kind || "SINGLE"}
        </span>

        {isBypass && (
          <span
            style={{
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 999,
              background: c.bypassBadgeBg,
              border: `1px solid ${c.bypassBadgeBorder}`,
              color: c.bypassBadgeText,
              fontWeight: 600,
            }}
          >
            ⚡ BYPASS
          </span>
        )}

        {hasMoved && (
          <span
            style={{
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 999,
              background: c.movedBadgeBg,
              border: `1px solid ${c.movedBadgeBorder}`,
              color: c.movedBadgeText,
              fontWeight: 600,
            }}
            title={`Moved ${moveCount} time(s)`}
          >
            🔄 {moveCount}x
          </span>
        )}
      </div>

      {/* Name + Address */}
      <div className="flex items-center gap-2">
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
            flexShrink: 0,
            background: cs.seq,
            color: cs.seqText,
          }}
        >
          {index + 1}
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: c.t1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {snap.name || "—"}
          </div>
          <div
            style={{
              fontSize: 11,
              color: c.t3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {snap.address || "—"}
          </div>
        </div>
      </div>

      {/* Occupied date + Confirm info */}
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginTop: 8, marginLeft: 34 }}>
        <div className="flex items-center gap-1.5">
          {dikshaDate && (
            <button
              type="button"
              onClick={handleOpenDikshaDate}
              title="Open Diksha date (event) • Copy to clipboard"
              style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 999,
                background: c.dikshaBg,
                border: `1px solid ${c.dikshaBorder}`,
                color: c.dikshaText,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              🔱 Diksha: {dikshaDate} ↗
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span
            style={{
              fontSize: 9,
              padding: "2px 7px",
              borderRadius: 999,
              background: c.historyBg,
              border: `1px solid ${c.historyBorder}`,
              color: c.historyAccent,
              fontWeight: 600,
            }}
            title={`${fullDate} ${fullTime}`}
          >
            🕐 {relTime}
          </span>
        </div>
      </div>

      {/* Footer: confirmed by */}
      <div
        style={{
          marginTop: 6,
          marginLeft: 34,
          fontSize: 9,
          color: c.t4,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span>👤</span>
        <span>{record.confirmedByLabel || "—"}</span>
        <span>•</span>
        <span>{fullDate}</span>
        <span>{fullTime}</span>
      </div>

      {/* Move history mini trail */}
      {hasMoved && record.moveHistory && record.moveHistory.length > 0 && (
        <div
          style={{
            marginTop: 8,
            marginLeft: 34,
            borderRadius: 10,
            border: `1px solid ${c.movedBadgeBorder}`,
            background: c.movedBadgeBg,
            padding: "6px 10px",
          }}
        >
          <div style={{ fontSize: 8, fontWeight: 700, color: c.movedBadgeText, marginBottom: 3 }}>
            🔄 MOVE HISTORY
          </div>
          {record.moveHistory.slice(-3).map((mh, i) => (
            <div
              key={i}
              style={{
                fontSize: 8,
                color: c.movedBadgeText,
                opacity: 0.8,
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <span>{mh.fromDate}</span>
              <span>→</span>
              <span style={{ fontWeight: 700 }}>{mh.toDate}</span>
              {mh.reason && <span style={{ opacity: 0.6 }}>({mh.reason})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
