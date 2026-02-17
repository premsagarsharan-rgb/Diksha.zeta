// components/dashboard/calander/history/HistorySection.js
"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useCT } from "../calanderTheme";
import { useTheme } from "@/components/ThemeProvider";

import HistoryHeader from "./HistoryHeader";
import HistoryStats from "./HistoryStats";
import HistoryCard from "./HistoryCard";
import HistoryEmpty from "./HistoryEmpty";
import { filterRecords, countStats, groupByPair, safeId } from "./historyUtils";

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function printHistory({ title, subtitle, rows }) {
  const html = `
  <html>
    <head>
      <title>${escapeHtml(title)}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 18px; }
        h1 { font-size: 18px; margin: 0; }
        .sub { margin-top: 6px; color: #555; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
        th { background: #f5f5f5; }
        .muted { color: #666; }
      </style>
    </head>
    <body>
      <h1>${escapeHtml(title)}</h1>
      <div class="sub">${escapeHtml(subtitle || "")}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Gender</th>
            <th>Kind</th>
            <th>Diksha</th>
            <th>Confirmed By</th>
            <th>Confirmed At</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.gender)}</td>
                <td>${escapeHtml(r.kind)}</td>
                <td>${escapeHtml(r.occupiedDate || "—")}</td>
                <td>${escapeHtml(r.confirmedBy || "—")}</td>
                <td>${escapeHtml(r.confirmedAt || "—")}</td>
              </tr>
            `
            )
            .join("")}
        </tbody>
      </table>
      <div class="sub muted" style="margin-top:12px;">
        Printed at: ${new Date().toLocaleString()}
      </div>
      <script>window.onload = () => { window.print(); }</script>
    </body>
  </html>
  `;

  const w = window.open("", "_blank", "width=920,height=700");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export default function HistorySection({
  historyRecords,
  onOpenProfile,
  variant = "default",

  // NEW (optional) — ContainerPanel next batch me pass karega:
  pendingCount = null,
  containerDate = null,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const isCompact = variant === "compact";

  // ── State ──
  const [isOpen, setIsOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("RECENT");
  const [viewMode, setViewMode] = useState(isCompact ? "COMPACT" : "DETAIL");
  const [showGrouped, setShowGrouped] = useState(true);

  // Infinite / Load more
  const [visibleCount, setVisibleCount] = useState(isCompact ? 10 : 24);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleCount(isCompact ? 10 : 24);
  }, [search, genderFilter, sortBy, showGrouped, viewMode, isCompact]);

  const records = historyRecords || [];

  // ── Stats (unfiltered) ──
  const stats = useMemo(() => countStats(records), [records]);

  // ── Filtered + Sorted ──
  const filtered = useMemo(
    () => filterRecords(records, { search, genderFilter, sortBy }),
    [records, search, genderFilter, sortBy]
  );

  // ── Grouped ──
  const grouped = useMemo(() => {
    if (!showGrouped) return null;
    return groupByPair(filtered);
  }, [filtered, showGrouped]);

  const displayList = grouped || filtered;

  // Visible list (Load more)
  const visibleItems = useMemo(() => displayList.slice(0, visibleCount), [displayList, visibleCount]);
  const hasMore = visibleCount < displayList.length;

  const hasRecords = records.length > 0;
  const hasResults = filtered.length > 0;
  const isSearching = search.trim().length > 0 || genderFilter !== "ALL";

  const handleToggle = useCallback(() => setIsOpen((v) => !v), []);

  const handleProfileClick = useCallback(
    (customerObj, seqNo) => {
      onOpenProfile?.(customerObj, seqNo);
    },
    [onOpenProfile]
  );

  // PRINT (prints filtered list, not just visible)
  const handlePrint = useCallback(() => {
    const rows = filtered.map((r) => {
      const snap = r.customerSnapshot || {};
      return {
        name: snap.name || "—",
        gender: snap.gender || "—",
        kind: r.kind || "SINGLE",
        occupiedDate: r.occupiedDate || "—",
        confirmedBy: r.confirmedByLabel || "—",
        confirmedAt: r.confirmedAt ? new Date(r.confirmedAt).toLocaleString() : "—",
      };
    });

    printHistory({
      title: `Confirmed History${containerDate ? ` • ${containerDate}` : ""}`,
      subtitle: `Items: ${rows.length} • Filter: ${genderFilter}${search ? ` • Search: "${search}"` : ""}`,
      rows,
    });
  }, [filtered, containerDate, genderFilter, search]);

  // When no records
  if (!hasRecords) {
    return (
      <div
        style={{
          borderRadius: isCompact ? 20 : 22,
          border: `1px solid ${c.historyBorder}`,
          background: c.historyBg,
          padding: isCompact ? 12 : 16,
        }}
      >
        <HistoryHeader
          total={0}
          stats={stats}
          isOpen={false}
          onToggle={() => {}}
          search=""
          onSearchChange={() => {}}
          genderFilter="ALL"
          onGenderChange={() => {}}
          sortBy="RECENT"
          onSortChange={() => {}}
          viewMode={viewMode}
          onViewModeChange={() => {}}
          onPrint={null}
          pendingCount={pendingCount}
          containerDate={containerDate}
          variant={variant}
        />
        <div style={{ marginTop: 10 }}>
          <HistoryEmpty type="NO_DATA" variant={variant} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: isCompact ? 20 : 22,
        border: `1px solid ${c.historyBorder}`,
        background: c.historyBg,
        padding: isCompact ? 12 : 16,
      }}
    >
      <HistoryHeader
        total={stats.total}
        stats={stats}
        isOpen={isOpen}
        onToggle={handleToggle}
        search={search}
        onSearchChange={setSearch}
        genderFilter={genderFilter}
        onGenderChange={setGenderFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onPrint={handlePrint}
        pendingCount={pendingCount}
        containerDate={containerDate}
        variant={variant}
      />

      {isOpen && (
        <div style={{ marginTop: 10 }}>
          <HistoryStats stats={stats} variant={variant} />

          {(stats.couples > 0 || stats.families > 0) && (
            <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => setShowGrouped((v) => !v)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 600,
                  border: `1px solid ${showGrouped ? c.historyBorder : c.btnGhostBorder}`,
                  background: showGrouped ? c.historyBg : c.btnGhostBg,
                  color: showGrouped ? c.historyAccent : c.btnGhostText,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>{showGrouped ? "👨‍👩‍👧" : "📋"}</span>
                {showGrouped ? "Grouped" : "Flat List"}
              </button>

              {isSearching && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setGenderFilter("ALL");
                  }}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 600,
                    border: `1px solid ${c.btnRejectBorder}`,
                    background: c.btnRejectBg,
                    color: c.btnRejectText,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  ✕ Clear Filters
                </button>
              )}

              <span style={{ fontSize: 10, color: c.historyMuted, marginLeft: "auto" }}>
                {filtered.length} of {records.length}
              </span>
            </div>
          )}

          {!hasResults && (
            <HistoryEmpty type="NO_RESULTS" searchQuery={search} variant={variant} />
          )}

          {hasResults && (
            <div>
              {showGrouped && grouped ? (
                <GroupedList
                  items={visibleItems}
                  viewMode={viewMode}
                  onOpenProfile={handleProfileClick}
                  variant={variant}
                  c={c}
                />
              ) : (
                <FlatList
                  items={visibleItems}
                  viewMode={viewMode}
                  onOpenProfile={handleProfileClick}
                  variant={variant}
                />
              )}

              {/* Load more (infinite scroll simplified) */}
              {hasMore && (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setVisibleCount((v) => v + (isCompact ? 10 : 24))}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: c.btnGhostBg,
                      border: `1px solid ${c.btnGhostBorder}`,
                      color: c.btnGhostText,
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Load more ({Math.min(displayList.length, visibleCount)}/{displayList.length})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════
   GROUPED LIST
   ═══════════════════════════════════ */
function GroupedList({ items, viewMode, onOpenProfile, variant, c }) {
  let cardIndex = 0;

  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => {
        if (item.type === "GROUP_HEADER") {
          return (
            <div
              key={`gh-${item.pairId}`}
              style={{
                marginTop: idx > 0 ? 10 : 0,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 2,
                  background: c.historyAccent,
                  borderRadius: 999,
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: c.historyBg,
                  border: `1px solid ${c.historyBorder}`,
                  color: c.historyAccent,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {item.kind === "FAMILY" ? "👨‍👩‍👧" : "💑"}
                {item.kind} • {item.count} members
              </span>
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: c.historyAccent,
                  borderRadius: 999,
                  opacity: 0.2,
                }}
              />
            </div>
          );
        }

        const currentIndex = cardIndex++;
        const isGroupMember = item.type === "MEMBER";

        return (
          <div
            key={safeId(item._id) || `hc-${idx}`}
            style={{
              animation: "fadeUp 260ms ease both",
              animationDelay: `${Math.min(12, currentIndex) * 18}ms`,
            }}
          >
            <HistoryCard
              record={item}
              index={currentIndex}
              viewMode={viewMode}
              isGroupMember={isGroupMember}
              groupKind={isGroupMember ? item.kind : null}
              onOpenProfile={onOpenProfile}
              variant={variant}
            />
          </div>
        );
      })}

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════
   FLAT LIST
   ═══════════════════════════════════ */
function FlatList({ items, viewMode, onOpenProfile, variant }) {
  const isCompact = variant === "compact";
  const isDetail = viewMode === "DETAIL";

  return (
    <div
      className={
        isCompact || !isDetail
          ? "space-y-1.5"
          : "grid sm:grid-cols-2 lg:grid-cols-3 gap-2"
      }
    >
      {items.map((item, idx) => (
        <div
          key={safeId(item._id) || `hf-${idx}`}
          style={{
            animation: "fadeUp 260ms ease both",
            animationDelay: `${Math.min(12, idx) * 18}ms`,
          }}
        >
          <HistoryCard
            record={item}
            index={idx}
            viewMode={viewMode}
            isGroupMember={false}
            groupKind={null}
            onOpenProfile={onOpenProfile}
            variant={variant}
          />
        </div>
      ))}

      <style jsx>{`
        @keyframes fadeUp {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }
      `}</style>
    </div>
  );
}
