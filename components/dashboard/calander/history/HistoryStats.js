// components/dashboard/calander/history/HistoryStats.js
"use client";

import { useCT } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";

export default function HistoryStats({ stats, variant }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  if (!stats || stats.total === 0) return null;

  const isCompact = variant === "compact";

  // Gender ratio percentages
  const malePct = stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0;
  const femalePct = stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0;
  const otherPct = 100 - malePct - femalePct;

  return (
    <div
      style={{
        borderRadius: 16,
        border: `1px solid ${c.historyBorder}`,
        background: c.historyBg,
        padding: isCompact ? 10 : 14,
        marginTop: 10,
        marginBottom: 10,
      }}
    >
      {/* Stats grid */}
      <div
        className={isCompact ? "flex flex-wrap gap-2" : "grid grid-cols-3 sm:grid-cols-5 gap-2"}
      >
        {/* Total */}
        <StatPill
          label="Total"
          value={stats.total}
          icon="✅"
          bg={c.historyBg}
          border={c.historyBorder}
          color={c.historyAccent}
          textColor={c.historyText}
          c={c}
        />

        {/* Male */}
        <StatPill
          label="Male"
          value={stats.male}
          icon="♂"
          bg={c.maleBg}
          border={c.maleBorder}
          color={c.maleText}
          textColor={c.maleText}
          c={c}
        />

        {/* Female */}
        <StatPill
          label="Female"
          value={stats.female}
          icon="♀"
          bg={c.femaleBg}
          border={c.femaleBorder}
          color={c.femaleText}
          textColor={c.femaleText}
          c={c}
        />

        {/* Couples */}
        {stats.couples > 0 && (
          <StatPill
            label="Couples"
            value={stats.couples}
            icon="💑"
            bg={c.occupyBg}
            border={c.occupyBorder}
            color={c.occupyText}
            textColor={c.occupyText}
            c={c}
          />
        )}

        {/* Families */}
        {stats.families > 0 && (
          <StatPill
            label="Families"
            value={stats.families}
            icon="👨‍👩‍👧"
            bg={c.dikshaBg}
            border={c.dikshaBorder}
            color={c.dikshaText}
            textColor={c.dikshaText}
            c={c}
          />
        )}

        {/* Singles */}
        {stats.singles > 0 && !isCompact && (
          <StatPill
            label="Singles"
            value={stats.singles}
            icon="👤"
            bg={c.panelBg}
            border={c.panelBorder}
            color={c.t2}
            textColor={c.t2}
            c={c}
          />
        )}

        {/* Bypass */}
        {stats.bypassed > 0 && (
          <StatPill
            label="Bypass"
            value={stats.bypassed}
            icon="⚡"
            bg={c.bypassBg}
            border={c.bypassBorder}
            color={c.bypassText}
            textColor={c.bypassText}
            c={c}
          />
        )}

        {/* Moved */}
        {stats.moved > 0 && (
          <StatPill
            label="Moved"
            value={stats.moved}
            icon="🔄"
            bg={c.movedBadgeBg}
            border={c.movedBadgeBorder}
            color={c.movedBadgeText}
            textColor={c.movedBadgeText}
            c={c}
          />
        )}
      </div>

      {/* Gender ratio bar */}
      {!isCompact && stats.total > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 9, color: c.historyMuted, marginBottom: 4, fontWeight: 600 }}>
            GENDER RATIO
          </div>
          <div
            style={{
              height: 6,
              borderRadius: 999,
              overflow: "hidden",
              display: "flex",
              background: c.panelBg,
            }}
          >
            {stats.male > 0 && (
              <div
                style={{
                  width: `${malePct}%`,
                  background: c.maleText,
                  transition: "width 0.5s ease",
                  borderRadius: stats.female === 0 && stats.other === 0 ? 999 : "999px 0 0 999px",
                }}
              />
            )}
            {stats.female > 0 && (
              <div
                style={{
                  width: `${femalePct}%`,
                  background: c.femaleText,
                  transition: "width 0.5s ease",
                  borderRadius: stats.male === 0 && stats.other === 0 ? 999 : 0,
                }}
              />
            )}
            {stats.other > 0 && (
              <div
                style={{
                  width: `${otherPct}%`,
                  background: c.t3,
                  transition: "width 0.5s ease",
                  borderRadius: "0 999px 999px 0",
                }}
              />
            )}
          </div>
          <div className="flex items-center gap-3" style={{ marginTop: 4 }}>
            {stats.male > 0 && (
              <span style={{ fontSize: 9, color: c.maleText, fontWeight: 600 }}>
                ♂ {malePct}%
              </span>
            )}
            {stats.female > 0 && (
              <span style={{ fontSize: 9, color: c.femaleText, fontWeight: 600 }}>
                ♀ {femalePct}%
              </span>
            )}
            {stats.other > 0 && (
              <span style={{ fontSize: 9, color: c.t3, fontWeight: 600 }}>
                Other {otherPct}%
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({ label, value, icon, bg, border, color, textColor, c }) {
  return (
    <div
      style={{
        borderRadius: 12,
        border: `1px solid ${border}`,
        background: bg,
        padding: "6px 10px",
        display: "flex",
        alignItems: "center",
        gap: 6,
        minWidth: 0,
      }}
    >
      <span style={{ fontSize: 12, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: color,
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 8,
            color: textColor,
            opacity: 0.7,
            textTransform: "uppercase",
            fontWeight: 600,
            letterSpacing: "0.03em",
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}
