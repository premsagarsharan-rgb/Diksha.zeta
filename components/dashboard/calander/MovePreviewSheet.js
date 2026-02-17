// components/dashboard/calander/MovePreviewSheet.js
"use client";

import { useMemo } from "react";
import { useCT, getModeStyle } from "./calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import BufferSpinner from "@/components/BufferSpinner";

const MOVE_REASONS = [
  { key: "CUSTOMER_REQUEST", label: "Customer Request" },
  { key: "SCHEDULE_CHANGE", label: "Schedule Change" },
  { key: "ADMIN_DECISION", label: "Admin Decision" },
  { key: "CAPACITY_ADJUSTMENT", label: "Capacity Adjustment" },
  { key: "OTHER", label: "Other" },
];

export default function MovePreviewSheet({
  mode,
  fromDate,
  toDate,
  fromOccupied,
  toOccupied,
  assignment,
  groupMembers,
  moveMembers,
  capacityFrom,
  capacityTo,
  groupSize,
  isDetach,
  moveReason,
  onReasonChange,
  pushing,
  onConfirm,
  onBack,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);
  const ms = getModeStyle(mode, c);

  const isMeeting = mode === "MEETING";
  const hasDateChange = fromDate !== toDate;
  const hasOccupyChange =
    isMeeting && fromOccupied !== toOccupied && toOccupied;

  // Impact calculation
  const fromAfter = capacityFrom
    ? capacityFrom.used - groupSize
    : null;
  const toAfter = capacityTo ? capacityTo.used + groupSize : null;

  function impactColor(used, limit) {
    if (!limit) return c.previewImpactOk;
    const pct = (used / limit) * 100;
    if (pct >= 90) return c.previewImpactDanger;
    if (pct >= 70) return c.previewImpactWarn;
    return c.previewImpactOk;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* From → To Visual */}
      <div
        className="flex items-center gap-3"
        style={{ justifyContent: "center" }}
      >
        {/* FROM */}
        <div
          style={{
            flex: 1,
            borderRadius: 18,
            border: `1px solid ${c.previewFromBorder}`,
            background: c.previewFromBg,
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: c.previewFromText,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            From
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: c.previewFromText,
            }}
          >
            {fromDate}
          </div>
          <div style={{ fontSize: 11, color: c.previewFromText, opacity: 0.7 }}>
            {mode}
          </div>
          {capacityFrom && (
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: impactColor(fromAfter, capacityFrom.limit),
                fontWeight: 600,
              }}
            >
              {capacityFrom.used}/{capacityFrom.limit} → {fromAfter}/
              {capacityFrom.limit} (-{groupSize})
            </div>
          )}
        </div>

        {/* Arrow */}
        <div
          style={{
            fontSize: 24,
            color: c.previewArrow,
            fontWeight: 900,
            flexShrink: 0,
          }}
        >
          →
        </div>

        {/* TO */}
        <div
          style={{
            flex: 1,
            borderRadius: 18,
            border: `1px solid ${c.previewToBorder}`,
            background: c.previewToBg,
            padding: 14,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: c.previewToText,
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            To
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: c.previewToText,
            }}
          >
            {hasDateChange ? toDate : fromDate}
          </div>
          <div style={{ fontSize: 11, color: c.previewToText, opacity: 0.7 }}>
            {mode}
          </div>
          {capacityTo && (
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: impactColor(toAfter, capacityTo.limit),
                fontWeight: 600,
              }}
            >
              {capacityTo.used}/{capacityTo.limit} → {toAfter}/
              {capacityTo.limit} (+{groupSize})
            </div>
          )}
        </div>
      </div>

      {/* Occupied change info */}
      {hasOccupyChange && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${c.occupyBorder}`,
            background: c.occupyBg,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11, color: c.occupyText }}>
            🔱 Occupied: {fromOccupied || "—"}
          </span>
          <span
            style={{
              fontSize: 14,
              color: c.previewArrow,
              fontWeight: 800,
            }}
          >
            →
          </span>
          <span
            style={{
              fontSize: 11,
              color: c.occupyText,
              fontWeight: 700,
            }}
          >
            🔱 {toOccupied}
          </span>
        </div>
      )}

      {/* Detach warning */}
      {isDetach && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${c.detachWarnBorder}`,
            background: c.detachWarnBg,
            padding: "10px 14px",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: c.detachWarnAccent,
              marginBottom: 4,
            }}
          >
            ⚠️ Group will split
          </div>
          <div style={{ fontSize: 11, color: c.detachWarnText, lineHeight: 1.5 }}>
            Moving member(s) will be detached from the group and become
            SINGLE. Remaining members will auto-adjust (COUPLE → SINGLE if
            only 1 left).
          </div>
        </div>
      )}

      {/* Capacity warning */}
      {capacityTo && capacityTo.remaining - groupSize <= 3 && capacityTo.remaining - groupSize >= 0 && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${c.previewWarnBorder}`,
            background: c.previewWarnBg,
            padding: "10px 14px",
            fontSize: 11,
            color: c.previewWarnText,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>⚠️</span>
          <span>
            Target container will be at{" "}
            <b>
              {((capacityTo.used + groupSize) / capacityTo.limit * 100).toFixed(0)}%
            </b>{" "}
            capacity after move ({capacityTo.remaining - groupSize} left)
          </span>
        </div>
      )}

      {/* Members list */}
      {groupMembers && groupMembers.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 11,
              color: c.t3,
              fontWeight: 600,
              marginBottom: 6,
              textTransform: "uppercase",
            }}
          >
            👥 Moving Members ({groupSize})
          </div>
          <div className="space-y-2">
            {groupMembers.map((member, idx) => {
              const cust = member?.customer || member;
              const isMoving = moveMembers === "ALL" ||
                moveMembers?.includes?.(String(member._id)) ||
                String(member._id) === String(assignment?._id);

              return (
                <div
                  key={String(member._id || idx)}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${c.previewMemberBorder}`,
                    background: c.previewMemberBg,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: isMoving ? 1 : 0.4,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        fontWeight: 700,
                        background:
                          cust?.gender === "MALE"
                            ? c.maleBg
                            : cust?.gender === "FEMALE"
                            ? c.femaleBg
                            : c.panelBg,
                        border: `1px solid ${
                          cust?.gender === "MALE"
                            ? c.maleBorder
                            : cust?.gender === "FEMALE"
                            ? c.femaleBorder
                            : c.panelBorder
                        }`,
                        color:
                          cust?.gender === "MALE"
                            ? c.maleText
                            : cust?.gender === "FEMALE"
                            ? c.femaleText
                            : c.t3,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: c.t1,
                        }}
                      >
                        {cust?.name || "—"}
                      </div>
                      <div style={{ fontSize: 10, color: c.t3 }}>
                        {cust?.gender || "?"} •{" "}
                        {cust?.address || "—"}
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9,
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: isMoving
                        ? c.previewToBg
                        : c.panelBg,
                      border: `1px solid ${
                        isMoving
                          ? c.previewToBorder
                          : c.panelBorder
                      }`,
                      color: isMoving ? c.previewToText : c.t3,
                      fontWeight: 600,
                    }}
                  >
                    {isMoving ? "✓ Moving" : "Staying"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Move reason (optional) */}
      <div>
        <div
          style={{
            fontSize: 11,
            color: c.t3,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          📝 Move Reason (optional)
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MOVE_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() =>
                onReasonChange?.(moveReason === r.key ? null : r.key)
              }
              style={{
                padding: "6px 12px",
                borderRadius: 12,
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${
                  moveReason === r.key
                    ? c.reasonActiveBorder
                    : c.reasonBorder
                }`,
                background:
                  moveReason === r.key
                    ? c.reasonActiveBg
                    : c.reasonBg,
                color:
                  moveReason === r.key
                    ? c.reasonActiveText
                    : c.reasonText,
                cursor: "pointer",
                transition: "all 0.12s",
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2" style={{ marginTop: 4 }}>
        <button
          type="button"
          onClick={onBack}
          disabled={pushing}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 18,
            background: c.btnGhostBg,
            color: c.btnGhostText,
            border: `1px solid ${c.btnGhostBorder}`,
            cursor: pushing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pushing}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 18,
            background: c.btnSolidBg,
            color: c.btnSolidText,
            border: "none",
            cursor: pushing ? "not-allowed" : "pointer",
            fontSize: 13,
            fontWeight: 600,
            opacity: pushing ? 0.6 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {pushing ? (
            <>
              <BufferSpinner size={14} /> Moving...
            </>
          ) : (
            "✓ Confirm Move"
          )}
        </button>
      </div>
    </div>
  );
}
