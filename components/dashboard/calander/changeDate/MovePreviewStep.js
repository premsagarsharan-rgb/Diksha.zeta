// components/dashboard/calander/changeDate/MovePreviewStep.js
"use client";

import { useMemo } from "react";
import { useCT, getModeStyle } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import BufferSpinner from "@/components/BufferSpinner";
import { calcImpact, impactTier, MOVE_REASONS, safeId } from "./changeDateUtils";

export default function MovePreviewStep({
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
  const hasOccupyChange = isMeeting && fromOccupied !== toOccupied && !!toOccupied;

  const impact = useMemo(
    () => calcImpact(capacityFrom, capacityTo, groupSize),
    [capacityFrom, capacityTo, groupSize]
  );

  function getImpactColor(tierKey) {
    if (tierKey === "DANGER") return c.previewImpactDanger;
    if (tierKey === "WARN") return c.previewImpactWarn;
    return c.previewImpactOk;
  }

  const fromTier = capacityFrom
    ? impactTier(impact.fromAfter, capacityFrom.limit)
    : "OK";
  const toTier = capacityTo
    ? impactTier(impact.toAfter, capacityTo.limit)
    : "OK";

  // Capacity warning threshold
  const showCapWarn =
    capacityTo &&
    capacityTo.remaining - groupSize >= 0 &&
    capacityTo.remaining - groupSize <= 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Title */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.t1 }}>
          🔄 Move Preview
        </div>
        <div style={{ fontSize: 11, color: c.t3, marginTop: 2 }}>
          Review changes before confirming
        </div>
      </div>

      {/* From → To Cards */}
      <FromToVisual
        c={c}
        ms={ms}
        fromDate={fromDate}
        toDate={hasDateChange ? toDate : fromDate}
        mode={mode}
        capacityFrom={capacityFrom}
        capacityTo={capacityTo}
        impact={impact}
        fromTier={fromTier}
        toTier={toTier}
        groupSize={groupSize}
        getImpactColor={getImpactColor}
      />

      {/* Occupied date change */}
      {hasOccupyChange && (
        <OccupyChangeBar
          c={c}
          fromOccupied={fromOccupied}
          toOccupied={toOccupied}
        />
      )}

      {/* Detach warning */}
      {isDetach && <DetachWarning c={c} groupSize={groupSize} groupMembers={groupMembers} moveMembers={moveMembers} />}

      {/* Capacity warning */}
      {showCapWarn && (
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
            Target at{" "}
            <b>
              {Math.round(
                ((capacityTo.used + groupSize) / capacityTo.limit) * 100
              )}
              %
            </b>{" "}
            after move ({capacityTo.remaining - groupSize} slots left)
          </span>
        </div>
      )}

      {/* Members list */}
      {groupMembers && groupMembers.length > 0 && (
        <MembersPreview
          c={c}
          assignment={assignment}
          groupMembers={groupMembers}
          moveMembers={moveMembers}
        />
      )}

      {/* Move reason */}
      <ReasonPicker
        c={c}
        moveReason={moveReason}
        onReasonChange={onReasonChange}
      />

      {/* Actions */}
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
            fontSize: 13,
            fontWeight: 600,
            cursor: pushing ? "not-allowed" : "pointer",
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
            fontSize: 13,
            fontWeight: 600,
            cursor: pushing ? "not-allowed" : "pointer",
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

/* ═══════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════ */

function FromToVisual({
  c,
  ms,
  fromDate,
  toDate,
  mode,
  capacityFrom,
  capacityTo,
  impact,
  fromTier,
  toTier,
  groupSize,
  getImpactColor,
}) {
  return (
    <div
      className="flex items-stretch gap-3"
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
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: c.previewFromText,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          From
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: c.previewFromText,
          }}
        >
          {fromDate}
        </div>
        <div
          style={{
            fontSize: 10,
            color: c.previewFromText,
            opacity: 0.65,
            marginTop: 2,
          }}
        >
          {mode}
        </div>
        {capacityFrom && (
          <div
            style={{
              marginTop: 8,
              fontSize: 9,
              fontWeight: 700,
              color: getImpactColor(fromTier),
            }}
          >
            {capacityFrom.used}/{capacityFrom.limit} →{" "}
            {impact.fromAfter}/{capacityFrom.limit}
            <span style={{ opacity: 0.7 }}> (-{groupSize})</span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            background: c.panelBg,
            border: `1px solid ${c.panelBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: c.previewArrow,
            fontWeight: 900,
          }}
        >
          →
        </div>
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
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 9,
            color: c.previewToText,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          To
        </div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: c.previewToText,
          }}
        >
          {toDate}
        </div>
        <div
          style={{
            fontSize: 10,
            color: c.previewToText,
            opacity: 0.65,
            marginTop: 2,
          }}
        >
          {mode}
        </div>
        {capacityTo && (
          <div
            style={{
              marginTop: 8,
              fontSize: 9,
              fontWeight: 700,
              color: getImpactColor(toTier),
            }}
          >
            {capacityTo.used}/{capacityTo.limit} →{" "}
            {impact.toAfter}/{capacityTo.limit}
            <span style={{ opacity: 0.7 }}> (+{groupSize})</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OccupyChangeBar({ c, fromOccupied, toOccupied }) {
  return (
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
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12 }}>🔱</span>
        <span style={{ fontSize: 11, color: c.occupyText }}>
          Occupied: {fromOccupied || "—"}
        </span>
      </div>
      <span
        style={{ fontSize: 14, color: c.previewArrow, fontWeight: 800 }}
      >
        →
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 12 }}>🔱</span>
        <span
          style={{
            fontSize: 11,
            color: c.occupyText,
            fontWeight: 700,
          }}
        >
          {toOccupied}
        </span>
      </div>
    </div>
  );
}

function DetachWarning({ c, groupSize, groupMembers, moveMembers }) {
  const totalMembers = groupMembers?.length || 0;
  const movingCount =
    moveMembers === "ALL"
      ? totalMembers
      : moveMembers === "SINGLE"
      ? 1
      : Array.isArray(moveMembers)
      ? moveMembers.length
      : groupSize;
  const stayingCount = totalMembers - movingCount;

  const stayingKind =
    stayingCount === 0
      ? null
      : stayingCount === 1
      ? "SINGLE"
      : stayingCount === 2
      ? "COUPLE"
      : "FAMILY";

  return (
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
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>⚠️</span> Group will split
      </div>
      <div
        style={{ fontSize: 10, color: c.detachWarnText, lineHeight: 1.5 }}
      >
        <b>{movingCount}</b> member(s) will detach → become SINGLE
        <br />
        <b>{stayingCount}</b> member(s) stay →{" "}
        {stayingKind ? (
          <span>
            become <b>{stayingKind}</b>
          </span>
        ) : (
          "group removed"
        )}
      </div>
    </div>
  );
}

function MembersPreview({ c, assignment, groupMembers, moveMembers }) {
  const currentId = safeId(assignment?._id);

  function isMemberMoving(member) {
    const id = safeId(member._id);
    if (moveMembers === "ALL") return true;
    if (moveMembers === "SINGLE") return id === currentId;
    if (Array.isArray(moveMembers)) return moveMembers.includes(id);
    return id === currentId;
  }

  return (
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
        👥 Members
      </div>
      <div className="space-y-1.5">
        {groupMembers.map((member, idx) => {
          const cust = member?.customer || member;
          const gender = cust?.gender;
          const isMoving = isMemberMoving(member);

          const gBadge =
            gender === "MALE"
              ? { bg: c.maleBg, border: c.maleBorder, text: c.maleText }
              : gender === "FEMALE"
              ? {
                  bg: c.femaleBg,
                  border: c.femaleBorder,
                  text: c.femaleText,
                }
              : { bg: c.panelBg, border: c.panelBorder, text: c.t3 };

          return (
            <div
              key={safeId(member._id) || idx}
              style={{
                borderRadius: 14,
                border: `1px solid ${c.previewMemberBorder}`,
                background: c.previewMemberBg,
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                opacity: isMoving ? 1 : 0.45,
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 700,
                    background: gBadge.bg,
                    border: `1px solid ${gBadge.border}`,
                    color: gBadge.text,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: c.t1,
                    }}
                  >
                    {cust?.name || "—"}
                  </div>
                  <div style={{ fontSize: 9, color: c.t3 }}>
                    {gender || "?"} • {cust?.address || "—"}
                  </div>
                </div>
              </div>
              <span
                style={{
                  fontSize: 8,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: isMoving ? c.previewToBg : c.panelBg,
                  border: `1px solid ${
                    isMoving ? c.previewToBorder : c.panelBorder
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
  );
}

function ReasonPicker({ c, moveReason, onReasonChange }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: c.t3,
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        📝 Move Reason{" "}
        <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional)</span>
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
              padding: "5px 10px",
              borderRadius: 12,
              fontSize: 10,
              fontWeight: 600,
              border: `1px solid ${
                moveReason === r.key
                  ? c.reasonActiveBorder
                  : c.reasonBorder
              }`,
              background:
                moveReason === r.key ? c.reasonActiveBg : c.reasonBg,
              color:
                moveReason === r.key
                  ? c.reasonActiveText
                  : c.reasonText,
              cursor: "pointer",
              transition: "all 0.1s",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{r.icon}</span>
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
