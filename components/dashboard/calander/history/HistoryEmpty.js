// components/dashboard/calander/history/HistoryEmpty.js
"use client";

import { useCT } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";

export default function HistoryEmpty({ type = "NO_DATA", searchQuery, variant }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const isCompact = variant === "compact";

  if (type === "NO_RESULTS") {
    return (
      <div
        style={{
          borderRadius: 18,
          border: `1px dashed ${c.historyBorder}`,
          background: c.historyBg,
          padding: isCompact ? 20 : 32,
          textAlign: "center",
        }}
      >
        {/* Search illustration */}
        <div style={{ fontSize: isCompact ? 32 : 48, marginBottom: 8, lineHeight: 1 }}>
          🔍
        </div>
        <div
          style={{
            fontSize: isCompact ? 13 : 15,
            fontWeight: 700,
            color: c.historyText,
            marginBottom: 4,
          }}
        >
          No results found
        </div>
        <div style={{ fontSize: isCompact ? 11 : 12, color: c.historyMuted, lineHeight: 1.5 }}>
          {searchQuery ? (
            <>
              No matches for "<b style={{ color: c.historyAccent }}>{searchQuery}</b>"
              <br />
              Try different search or clear filters
            </>
          ) : (
            "No records match current filters"
          )}
        </div>
      </div>
    );
  }

  // NO_DATA — beautiful empty state
  return (
    <div
      style={{
        borderRadius: 18,
        border: `1px dashed ${c.historyBorder}`,
        background: c.historyBg,
        padding: isCompact ? 24 : 40,
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background pattern */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle, ${c.historyBorder} 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          opacity: 0.3,
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative" }}>
        {/* Illustration */}
        <div
          style={{
            fontSize: isCompact ? 40 : 56,
            marginBottom: isCompact ? 8 : 12,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              display: "inline-block",
              animation: "emptyFloat 3s ease-in-out infinite",
            }}
          >
            📋
          </span>
          <span
            style={{
              display: "inline-block",
              animation: "emptyFloat 3s ease-in-out infinite 0.5s",
              fontSize: isCompact ? 24 : 32,
              opacity: 0.5,
            }}
          >
            →
          </span>
          <span
            style={{
              display: "inline-block",
              animation: "emptyFloat 3s ease-in-out infinite 1s",
              opacity: 0.4,
            }}
          >
            ✅
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: isCompact ? 14 : 16,
            fontWeight: 800,
            color: c.historyText,
            marginBottom: 6,
          }}
        >
          No confirmed cards yet
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: isCompact ? 11 : 12,
            color: c.historyMuted,
            lineHeight: 1.6,
            maxWidth: 280,
            margin: "0 auto",
          }}
        >
          Jab Meeting me cards confirm honge,
          <br />
          wo yahan dikhenge with full history
        </div>

        {/* Steps hint */}
        {!isCompact && (
          <div
            style={{
              marginTop: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {[
              { icon: "📋", label: "Assign" },
              { icon: "✓", label: "Confirm" },
              { icon: "✅", label: "History" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5">
                {i > 0 && (
                  <span
                    style={{
                      width: 16,
                      height: 1,
                      background: c.historyBorder,
                      display: "inline-block",
                    }}
                  />
                )}
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: 10,
                    background: i === 2 ? c.historyBg : c.panelBg,
                    border: `1px solid ${i === 2 ? c.historyBorder : c.panelBorder}`,
                    fontSize: 9,
                    color: i === 2 ? c.historyAccent : c.t3,
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <span>{step.icon}</span>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Float animation */}
      <style jsx>{`
        @keyframes emptyFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
