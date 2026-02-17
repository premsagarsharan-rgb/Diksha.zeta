// components/dashboard/calander/changeDate/ActionSelectStep.js
"use client";

import { useCT, getModeStyle } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";
import { buildActionOptions } from "./changeDateUtils";

export default function ActionSelectStep({
  mode,
  assignment,
  groupMembers,
  onSelectAction,
  onClose,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);
  const ms = getModeStyle(mode, c);

  const isGroup =
    (assignment?.kind === "COUPLE" || assignment?.kind === "FAMILY") &&
    assignment?.pairId;

  const enrichedAssignment = {
    ...assignment,
    containerDate: assignment?._containerDate || "—",
  };

  const options = buildActionOptions(mode, enrichedAssignment);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header info */}
      <div
        style={{
          borderRadius: 18,
          border: `1px solid ${c.panelBorder}`,
          background: c.panelBg,
          padding: 14,
        }}
      >
        <div style={{ fontSize: 11, color: c.t3, textTransform: "uppercase", marginBottom: 4 }}>
          Customer
        </div>
        <div style={{ fontWeight: 700, fontSize: 15, color: c.t1 }}>
          {assignment?.customer?.name || "—"}
        </div>
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 6 }}>
          <span
            style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 999,
              background: ms.bg, border: `1px solid ${ms.border}`, color: ms.text, fontWeight: 600,
            }}
          >
            {ms.icon} {mode}
          </span>
          <span
            style={{
              fontSize: 9, padding: "2px 8px", borderRadius: 999,
              background: c.kindBg, border: `1px solid ${c.kindBorder}`, color: c.kindText, fontWeight: 600,
            }}
          >
            {assignment?.kind || "SINGLE"}
          </span>
          {assignment?.occupiedDate && assignment?.bypass !== true && (
            <span
              style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 999,
                background: c.occupyBg, border: `1px solid ${c.occupyBorder}`, color: c.occupyText, fontWeight: 600,
              }}
            >
              🔱 {assignment.occupiedDate}
            </span>
          )}
          {(assignment?.bypass === true || assignment?.occupiedDate === "BYPASS") && (
            <span
              style={{
                fontSize: 9, padding: "2px 8px", borderRadius: 999,
                background: c.bypassBadgeBg, border: `1px solid ${c.bypassBadgeBorder}`,
                color: c.bypassBadgeText, fontWeight: 600,
              }}
            >
              ⚡ BYPASS
            </span>
          )}
        </div>
      </div>

      {/* Group warning */}
      {isGroup && groupMembers && groupMembers.length > 1 && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${c.detachWarnBorder}`,
            background: c.detachWarnBg,
            padding: "10px 14px",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 14 }}>👥</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: c.detachWarnAccent }}>
                {assignment?.kind === "COUPLE" ? "COUPLE" : "FAMILY"} — {groupMembers.length} members
              </div>
              <div style={{ fontSize: 10, color: c.detachWarnText, marginTop: 2 }}>
                You can move all together or select specific members
              </div>
            </div>
          </div>

          {/* Members preview */}
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {groupMembers.map((m, i) => {
              const cust = m?.customer || m;
              return (
                <span
                  key={String(m._id || i)}
                  style={{
                    fontSize: 10, padding: "3px 10px", borderRadius: 999,
                    background: cust?.gender === "MALE" ? c.maleBg : cust?.gender === "FEMALE" ? c.femaleBg : c.panelBg,
                    border: `1px solid ${cust?.gender === "MALE" ? c.maleBorder : cust?.gender === "FEMALE" ? c.femaleBorder : c.panelBorder}`,
                    color: cust?.gender === "MALE" ? c.maleText : cust?.gender === "FEMALE" ? c.femaleText : c.t3,
                    fontWeight: 600,
                  }}
                >
                  {cust?.name || "—"}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Action options */}
      <div style={{ fontSize: 12, color: c.t3, fontWeight: 600, marginTop: 4 }}>
        What do you want to change?
      </div>

      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => onSelectAction(opt.key)}
            style={{
              width: "100%",
              textAlign: "left",
              borderRadius: 18,
              border: `1px solid ${c.moveOptionBorder}`,
              background: c.moveOptionBg,
              padding: 14,
              cursor: "pointer",
              transition: "all 0.12s",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = c.moveOptionHover;
              e.currentTarget.style.borderColor = c.moveOptionActiveBorder;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.moveOptionBg;
              e.currentTarget.style.borderColor = c.moveOptionBorder;
            }}
            onPointerDown={(e) => (e.currentTarget.style.transform = "scale(0.99)")}
            onPointerUp={(e) => (e.currentTarget.style.transform = "")}
            onPointerLeave={(e) => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.background = c.moveOptionBg;
              e.currentTarget.style.borderColor = c.moveOptionBorder;
            }}
          >
            <span style={{ fontSize: 22, flexShrink: 0, lineHeight: 1 }}>
              {opt.icon}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.moveOptionText }}>
                {opt.title}
              </div>
              <div style={{ fontSize: 11, color: c.moveOptionSub, marginTop: 2 }}>
                {opt.description}
              </div>
              <div
                style={{
                  fontSize: 10, marginTop: 6, padding: "2px 10px",
                  borderRadius: 999, background: c.panelBg,
                  border: `1px solid ${c.panelBorder}`, color: c.t2,
                  display: "inline-block", fontWeight: 600,
                }}
              >
                {opt.sub}
              </div>
            </div>
            <span style={{ fontSize: 16, color: c.t4, flexShrink: 0, alignSelf: "center" }}>
              ▸
            </span>
          </button>
        ))}
      </div>

      {/* Cancel */}
      <button
        type="button"
        onClick={onClose}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 18,
          background: c.btnGhostBg, color: c.btnGhostText,
          border: `1px solid ${c.btnGhostBorder}`,
          fontSize: 13, fontWeight: 600, cursor: "pointer",
          marginTop: 4,
        }}
      >
        Cancel
      </button>
    </div>
  );
}
