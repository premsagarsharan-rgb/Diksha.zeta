// components/dashboard/calander/AssignmentCard.js
"use client";

import { useState, useCallback, useEffect } from "react";
import { useCT, getCardStyle } from "./calanderTheme";
import { useTheme } from "@/components/ThemeProvider";

export default function AssignmentCard({
  assignment,
  seq,
  containerMode,
  pushing,
  locked,
  onOpenProfile,
  onConfirm,
  onReject,
  onOut,
  onDone,
  onChangeDate,
  onShowWarn,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const [hovered, setHovered] = useState(false);

  const cust = assignment?.customer;
  const gender = cust?.gender;
  const isMeeting = containerMode === "MEETING";
  const qualified = assignment?.cardStatus === "QUALIFIED";
  const isBypass = assignment?.bypass === true || assignment?.occupiedDate === "BYPASS";
  const cs = getCardStyle(gender, c);

  // Lock: all actions disabled
  const actionsDisabled = locked || pushing;

  // ── Moved badge ──
  const moveCount = assignment?.moveCount || 0;
  const hasMoved = moveCount > 0;
  const lastMovedAt = assignment?.lastMovedAt;
  const originalDate = assignment?.moveHistory?.[0]?.fromDate || null;

  // ── Cooldown timer ──
  const [cooldownSec, setCooldownSec] = useState(0);

  useEffect(() => {
    if (!lastMovedAt) { setCooldownSec(0); return; }

    function calcRemaining() {
      const moved = new Date(lastMovedAt).getTime();
      const now = Date.now();
      // Default 5 min cooldown visual (server enforces actual)
      const cooldownMs = 5 * 60 * 1000;
      const remaining = Math.max(0, Math.ceil((moved + cooldownMs - now) / 1000));
      return remaining;
    }

    setCooldownSec(calcRemaining());

    const timer = setInterval(() => {
      const rem = calcRemaining();
      setCooldownSec(rem);
      if (rem <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [lastMovedAt]);

  const inCooldown = cooldownSec > 0;

  const handleLockedClick = useCallback((actionName) => {
    if (locked) {
      onShowWarn?.("🔒 Container Locked", `Cannot ${actionName}. Container has reached its limit and is locked.\n\nOnly Admin can temporarily unlock this container.`);
      return true;
    }
    return false;
  }, [locked, onShowWarn]);

  function handleChangeDateClick(e) {
    e.stopPropagation();
    if (locked) {
      onShowWarn?.("🔒 Container Locked", "Cannot change date while container is locked.\n\nAdmin can temporarily unlock.");
      return;
    }
    if (qualified) {
      onShowWarn?.("👑 QUALIFIED", "Card is QUALIFIED (locked forever). Cannot change date.");
      return;
    }
    if (inCooldown) {
      const mins = Math.floor(cooldownSec / 60);
      const secs = cooldownSec % 60;
      onShowWarn?.("⏰ Cooldown Active", `Please wait ${mins}m ${secs}s before moving this card again.`);
      return;
    }
    onChangeDate?.(assignment, seq);
  }

  function formatCooldown(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div
      onClick={() => onOpenProfile?.(cust, seq)}
      style={{
        borderRadius: 18,
        border: `1px solid ${cs.border}`,
        background: cs.bg,
        padding: 14,
        cursor: "pointer",
        transition: "background 0.15s ease, transform 0.1s ease, opacity 0.15s",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        opacity: locked ? c.lockDisabledOpacity + 0.25 : 1,
      }}
      onMouseEnter={(e) => {
        setHovered(true);
        e.currentTarget.style.background = cs.hover;
      }}
      onMouseLeave={(e) => {
        setHovered(false);
        e.currentTarget.style.background = cs.bg;
      }}
      onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
      onPointerUp={(e) => (e.currentTarget.style.transform = "")}
      onPointerLeave={(e) => {
        e.currentTarget.style.transform = "";
        setHovered(false);
        e.currentTarget.style.background = cs.bg;
      }}
    >
      {/* Lock overlay indicator */}
      {locked && (
        <div style={{
          position: "absolute", top: 0, right: 0,
          padding: "3px 10px 3px 14px",
          borderRadius: "0 0 0 14px",
          background: c.lockBadgeBg,
          border: `1px solid ${c.lockBadgeBorder}`,
          borderTop: "none", borderRight: "none",
          fontSize: 9, fontWeight: 600, color: c.lockBadgeText,
          display: "flex", alignItems: "center", gap: 3,
          zIndex: 2,
        }}>
          🔒 Locked
        </div>
      )}

      {/* Left Content */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="flex items-center gap-2">
          {/* Sequence badge */}
          <span
            style={{
              width: 26, height: 26, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, flexShrink: 0,
              background: cs.seq, color: cs.seqText,
            }}
          >
            {seq}
          </span>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600, fontSize: 14, color: c.t1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {cust?.name || "—"}
            </div>
            <div
              style={{
                fontSize: 11, color: c.t3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {cust?.address || "—"}
            </div>
          </div>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1" style={{ marginTop: 8, marginLeft: 34 }}>
          {/* Gender */}
          <span
            style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 999,
              background: gender === "MALE" ? c.maleBg : gender === "FEMALE" ? c.femaleBg : c.panelBg,
              border: `1px solid ${gender === "MALE" ? c.maleBorder : gender === "FEMALE" ? c.femaleBorder : c.panelBorder}`,
              color: gender === "MALE" ? c.maleText : gender === "FEMALE" ? c.femaleText : c.t3,
            }}
          >
            {gender || "?"}
          </span>

          {/* Kind */}
          <span
            style={{
              fontSize: 9, padding: "2px 7px", borderRadius: 999,
              background: c.kindBg, border: `1px solid ${c.kindBorder}`, color: c.kindText,
            }}
          >
            {assignment?.kind || "SINGLE"}
          </span>

          {/* BYPASS badge */}
          {isBypass && (
            <span
              style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 999,
                background: c.bypassBadgeBg, border: `1px solid ${c.bypassBadgeBorder}`,
                color: c.bypassBadgeText, fontWeight: 600,
              }}
            >
              ⚡ BYPASS
            </span>
          )}

          {/* Occupy date (Meeting) */}
          {isMeeting && assignment?.occupiedDate && !isBypass && (
            <span
              style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 999,
                background: c.occupyBg, border: `1px solid ${c.occupyBorder}`, color: c.occupyText,
              }}
            >
              🔱 {assignment.occupiedDate}
            </span>
          )}

          {/* Eligible */}
          {(cust?.dikshaEligible === true || cust?.status === "ELIGIBLE") && (
            <span
              style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 999,
                background: c.eligibleBg, border: `1px solid ${c.eligibleBorder}`, color: c.eligibleText,
              }}
            >
              ✅ ELIGIBLE
            </span>
          )}

          {/* Qualified */}
          {qualified && (
            <span
              style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 999,
                background: c.qualifiedBg, border: `1px solid ${c.qualifiedBorder}`, color: c.qualifiedText,
              }}
            >
              👑 QUALIFIED
            </span>
          )}

          {/* ── MOVED badge ── */}
          {hasMoved && (
            <span
              style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 999,
                background: c.movedBadgeBg, border: `1px solid ${c.movedBadgeBorder}`,
                color: c.movedBadgeText, fontWeight: 600,
              }}
              title={originalDate ? `Originally: ${originalDate} • Moved ${moveCount}x` : `Moved ${moveCount}x`}
            >
              🔄 {moveCount}x
            </span>
          )}

          {/* ── COOLDOWN timer ── */}
          {inCooldown && (
            <span
              style={{
                fontSize: 9, padding: "2px 7px", borderRadius: 999,
                background: c.cooldownBg, border: `1px solid ${c.cooldownBorder}`,
                color: c.cooldownTimerText, fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              ⏰ {formatCooldown(cooldownSec)}
            </span>
          )}
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex flex-col gap-1.5" style={{ flexShrink: 0 }}>

        {/* ── 📅 CHANGE DATE BUTTON (NEW!) ── */}
        <button
          disabled={actionsDisabled || qualified || inCooldown}
          onClick={handleChangeDateClick}
          title={
            locked
              ? "🔒 Container locked"
              : qualified
              ? "👑 QUALIFIED — cannot move"
              : inCooldown
              ? `⏰ Cooldown: ${formatCooldown(cooldownSec)}`
              : "📅 Change Date"
          }
          style={{
            padding: "6px 14px",
            borderRadius: 14,
            background: locked
              ? c.lockOverlay
              : inCooldown
              ? c.cooldownBg
              : c.moveBtnBg,
            color: locked
              ? c.lockBadgeText
              : inCooldown
              ? c.cooldownText
              : c.moveBtnText,
            fontSize: 11,
            fontWeight: 600,
            border: `1px solid ${
              locked
                ? c.lockBadgeBorder
                : inCooldown
                ? c.cooldownBorder
                : c.moveBtnBorder
            }`,
            cursor: actionsDisabled || qualified || inCooldown ? "not-allowed" : "pointer",
            opacity: actionsDisabled || qualified || inCooldown ? c.lockDisabledOpacity : 1,
            transition: "transform 0.1s, opacity 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          onPointerDown={(e) => {
            if (!actionsDisabled && !qualified && !inCooldown)
              e.currentTarget.style.transform = "scale(0.95)";
          }}
          onPointerUp={(e) => (e.currentTarget.style.transform = "")}
        >
          {locked && <span style={{ fontSize: 10 }}>🔒</span>}
          {inCooldown ? `⏰ ${formatCooldown(cooldownSec)}` : "📅 Move"}
        </button>

        {isMeeting ? (
          <>
            {/* Confirm Button */}
            <button
              disabled={actionsDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (handleLockedClick("confirm")) return;
                onConfirm?.(assignment);
              }}
              title={locked ? "🔒 Container locked — Admin can unlock" : "Confirm → Diksha"}
              style={{
                padding: "6px 14px", borderRadius: 14,
                background: locked ? c.lockOverlay : c.btnSolidBg,
                color: locked ? c.lockBadgeText : c.btnSolidText,
                fontSize: 11, fontWeight: 600,
                border: locked ? `1px solid ${c.lockBadgeBorder}` : "none",
                cursor: actionsDisabled ? "not-allowed" : "pointer",
                opacity: actionsDisabled ? c.lockDisabledOpacity : 1,
                transition: "transform 0.1s, opacity 0.15s",
                display: "flex", alignItems: "center", gap: 4,
              }}
              onPointerDown={(e) => {
                if (!actionsDisabled) e.currentTarget.style.transform = "scale(0.95)";
              }}
              onPointerUp={(e) => (e.currentTarget.style.transform = "")}
            >
              {locked && <span style={{ fontSize: 10 }}>🔒</span>}
              ✓ Confirm
            </button>

            {/* Reject Button */}
            <button
              disabled={actionsDisabled}
              onClick={(e) => {
                e.stopPropagation();
                if (handleLockedClick("reject")) return;
                onReject?.(assignment, seq);
              }}
              title={locked ? "🔒 Container locked — Admin can unlock" : "Reject options"}
              style={{
                padding: "6px 14px", borderRadius: 14,
                background: locked ? c.lockOverlay : c.btnGhostBg,
                color: locked ? c.lockBadgeText : c.btnGhostText,
                fontSize: 11,
                border: `1px solid ${locked ? c.lockBadgeBorder : c.btnGhostBorder}`,
                cursor: actionsDisabled ? "not-allowed" : "pointer",
                opacity: actionsDisabled ? c.lockDisabledOpacity : 1,
                transition: "transform 0.1s, opacity 0.15s",
                display: "flex", alignItems: "center", gap: 4,
              }}
              onPointerDown={(e) => {
                if (!actionsDisabled) e.currentTarget.style.transform = "scale(0.95)";
              }}
              onPointerUp={(e) => (e.currentTarget.style.transform = "")}
            >
              {locked && <span style={{ fontSize: 10 }}>🔒</span>}
              ✗ Reject
            </button>
          </>
        ) : (
          <>
            {/* Out Button */}
            <button
              disabled={actionsDisabled || qualified}
              onClick={(e) => {
                e.stopPropagation();
                if (handleLockedClick("remove")) return;
                onOut?.(assignment._id);
              }}
              title={locked ? "🔒 Container locked" : qualified ? "QUALIFIED — cannot remove" : "Out"}
              style={{
                padding: "6px 14px", borderRadius: 14,
                background: locked ? c.lockOverlay : c.btnGhostBg,
                color: locked ? c.lockBadgeText : c.btnGhostText,
                fontSize: 11,
                border: `1px solid ${locked ? c.lockBadgeBorder : c.btnGhostBorder}`,
                cursor: actionsDisabled || qualified ? "not-allowed" : "pointer",
                opacity: actionsDisabled || qualified ? c.lockDisabledOpacity : 1,
                transition: "transform 0.1s, opacity 0.15s",
                display: "flex", alignItems: "center", gap: 4,
              }}
              onPointerDown={(e) => {
                if (!actionsDisabled && !qualified) e.currentTarget.style.transform = "scale(0.95)";
              }}
              onPointerUp={(e) => (e.currentTarget.style.transform = "")}
            >
              {locked && <span style={{ fontSize: 10 }}>🔒</span>}
              Out
            </button>

            {/* Done Button (Diksha only) */}
            {containerMode === "DIKSHA" && (
              <button
                disabled={actionsDisabled || qualified}
                onClick={(e) => {
                  e.stopPropagation();
                  if (handleLockedClick("mark as done")) return;
                  onDone?.(assignment);
                }}
                title={locked ? "🔒 Container locked" : qualified ? "Already QUALIFIED" : "Done (Qualified)"}
                style={{
                  padding: "6px 14px", borderRadius: 14,
                  background: locked ? c.lockOverlay : c.btnDoneBg,
                  color: locked ? c.lockBadgeText : c.btnDoneText,
                  fontSize: 11, fontWeight: 600,
                  border: locked ? `1px solid ${c.lockBadgeBorder}` : "none",
                  cursor: actionsDisabled || qualified ? "not-allowed" : "pointer",
                  opacity: actionsDisabled || qualified ? c.lockDisabledOpacity : 1,
                  transition: "transform 0.1s, opacity 0.15s",
                  display: "flex", alignItems: "center", gap: 4,
                }}
                onPointerDown={(e) => {
                  if (!actionsDisabled && !qualified) e.currentTarget.style.transform = "scale(0.95)";
                }}
                onPointerUp={(e) => (e.currentTarget.style.transform = "")}
              >
                {locked && <span style={{ fontSize: 10 }}>🔒</span>}
                ✓ Done
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
