// components/dashboard/calander/changeDate/GroupSelectStep.js
"use client";

import { useState, useMemo } from "react";
import { useCT } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import { safeId } from "./changeDateUtils";

export default function GroupSelectStep({
  assignment,
  groupMembers,
  onSelectMembers,
  onBack,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const currentId = safeId(assignment?._id);
  const allIds = useMemo(
    () => (groupMembers || []).map((m) => safeId(m._id)).filter(Boolean),
    [groupMembers]
  );

  // Start with current member selected
  const [selected, setSelected] = useState(() => new Set([currentId]));

  function toggleMember(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        // Must keep at least 1
        if (next.size <= 1) return prev;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allIds));
  }

  function selectSingle() {
    setSelected(new Set([currentId]));
  }

  const selectedCount = selected.size;
  const totalCount = allIds.length;
  const isAll = selectedCount === totalCount;
  const isSingle = selectedCount === 1;
  const isPartial = !isAll && !isSingle;

  // Detach info
  const remainingCount = totalCount - selectedCount;
  const remainingKind =
    remainingCount === 0
      ? null
      : remainingCount === 1
      ? "SINGLE"
      : remainingCount === 2
      ? "COUPLE"
      : "FAMILY";

  function handleContinue() {
    if (isAll) {
      onSelectMembers("ALL");
    } else if (isSingle) {
      onSelectMembers("SINGLE");
    } else {
      onSelectMembers(Array.from(selected));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Title */}
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.t1 }}>
          Select Members to Move
        </div>
        <div style={{ fontSize: 11, color: c.t3, marginTop: 2 }}>
          Choose who to move. Unselected members stay in current container.
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2">
        <QuickBtn
          label={`All (${totalCount})`}
          active={isAll}
          onClick={selectAll}
          c={c}
        />
        <QuickBtn
          label="Only This"
          active={isSingle && selected.has(currentId)}
          onClick={selectSingle}
          c={c}
        />
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {(groupMembers || []).map((member, idx) => {
          const id = safeId(member._id);
          const cust = member?.customer || member;
          const isChecked = selected.has(id);
          const isCurrent = id === currentId;
          const gender = cust?.gender;

          const gBadge =
            gender === "MALE"
              ? { bg: c.maleBg, border: c.maleBorder, text: c.maleText }
              : gender === "FEMALE"
              ? { bg: c.femaleBg, border: c.femaleBorder, text: c.femaleText }
              : { bg: c.panelBg, border: c.panelBorder, text: c.t3 };

          return (
            <button
              key={id || idx}
              type="button"
              onClick={() => toggleMember(id)}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 16,
                border: `1.5px solid ${
                  isChecked
                    ? c.groupSelectActiveBorder
                    : c.groupSelectBorder
                }`,
                background: isChecked
                  ? c.groupSelectActiveBg
                  : c.groupSelectBg,
                padding: 12,
                cursor: "pointer",
                transition: "all 0.12s",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
              onPointerDown={(e) =>
                (e.currentTarget.style.transform = "scale(0.99)")
              }
              onPointerUp={(e) => (e.currentTarget.style.transform = "")}
              onPointerLeave={(e) => (e.currentTarget.style.transform = "")}
            >
              {/* Checkbox */}
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 7,
                  border: `2px solid ${
                    isChecked ? c.groupCheckOn : c.groupCheckOff
                  }`,
                  background: isChecked ? c.groupCheckOn : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  transition: "all 0.12s",
                }}
              >
                {isChecked && (
                  <span
                    style={{
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 900,
                      lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </span>

              {/* Avatar circle */}
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  background: gBadge.bg,
                  border: `1px solid ${gBadge.border}`,
                  color: gBadge.text,
                  flexShrink: 0,
                }}
              >
                {member?.roleInPair || idx + 1}
              </span>

              {/* Info */}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isChecked
                        ? c.groupSelectActiveText
                        : c.groupSelectText,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cust?.name || "—"}
                  </span>
                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 8,
                        padding: "1px 6px",
                        borderRadius: 999,
                        background: c.accBg,
                        border: `1px solid ${c.accBorder}`,
                        color: c.acc,
                        fontWeight: 700,
                      }}
                    >
                      CURRENT
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: c.t3,
                    marginTop: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {gender || "?"} • {cust?.address || "—"}
                </div>
              </div>

              {/* Status */}
              <span
                style={{
                  fontSize: 9,
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: isChecked ? c.previewToBg : c.panelBg,
                  border: `1px solid ${
                    isChecked ? c.previewToBorder : c.panelBorder
                  }`,
                  color: isChecked ? c.previewToText : c.t3,
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {isChecked ? "Moving" : "Staying"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Detach info */}
      {isPartial && remainingCount > 0 && (
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
              fontSize: 11,
              fontWeight: 700,
              color: c.detachWarnAccent,
              marginBottom: 2,
            }}
          >
            ⚠️ Group will split
          </div>
          <div
            style={{
              fontSize: 10,
              color: c.detachWarnText,
              lineHeight: 1.5,
            }}
          >
            {selectedCount} member(s) will move and become SINGLE.
            <br />
            {remainingCount} member(s) stay → becomes{" "}
            <b>{remainingKind}</b>.
          </div>
        </div>
      )}

      {/* Summary bar */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${c.panelBorder}`,
          background: c.panelBg,
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 11, color: c.t2 }}>
          Selected: <b style={{ color: c.t1 }}>{selectedCount}</b> /{" "}
          {totalCount}
        </span>
        <span
          style={{
            fontSize: 9,
            padding: "2px 8px",
            borderRadius: 999,
            background: isAll
              ? c.previewToBg
              : isPartial
              ? c.detachWarnBg
              : c.panelBg,
            border: `1px solid ${
              isAll
                ? c.previewToBorder
                : isPartial
                ? c.detachWarnBorder
                : c.panelBorder
            }`,
            color: isAll
              ? c.previewToText
              : isPartial
              ? c.detachWarnAccent
              : c.t3,
            fontWeight: 700,
          }}
        >
          {isAll ? "ALL MOVE" : isPartial ? "SPLIT" : "SINGLE MOVE"}
        </span>
      </div>

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
          onClick={handleContinue}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 18,
            background: c.btnSolidBg,
            color: c.btnSolidText,
            border: "none",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

/* ── Quick Button ── */
function QuickBtn({ label, active, onClick, c }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "8px 12px",
        borderRadius: 14,
        fontSize: 11,
        fontWeight: 600,
        border: `1px solid ${
          active ? c.groupSelectActiveBorder : c.groupSelectBorder
        }`,
        background: active ? c.groupSelectActiveBg : c.groupSelectBg,
        color: active ? c.groupSelectActiveText : c.groupSelectText,
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}
