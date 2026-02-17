// components/dashboard/MeetingTodayContainerWidget.js
"use client";

import { useEffect, useMemo, useState } from "react";
import LayerModal from "@/components/LayerModal";
import BufferSpinner from "@/components/BufferSpinner";
import { useTheme } from "@/components/ThemeProvider";
import { useCT, getModeStyle } from "@/components/dashboard/calander/calanderTheme";
import { HistorySection } from "@/components/dashboard/calander/history";
import CardAuditModal from "@/components/dashboard/CardAuditModal";

const MODE = "MEETING";

function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function safeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.$oid) return String(x.$oid);
  return String(x);
}
function isDateKey(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function weekdayLabel(dateKey) {
  try {
    const [y, m, d] = dateKey.split("-").map((n) => parseInt(n, 10));
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString("en-IN", { weekday: "long" });
  } catch {
    return "";
  }
}
function groupByOccupy(assignments) {
  const map = new Map();
  for (const a of assignments || []) {
    const isBypass = a?.bypass === true || a?.occupiedDate === "BYPASS";
    const key = isBypass ? "⚡ BYPASS" : a?.occupiedDate ? `🔱 ${a.occupiedDate}` : "— No Occupy";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(a);
  }
  return Array.from(map.entries())
    .map(([key, items]) => ({ key, items }))
    .sort((a, b) => b.items.length - a.items.length);
}
function dispatchOpenDiksha(dateStr) {
  if (!isDateKey(dateStr)) return;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("CALANDER_OPEN_DIKSHA_DATE", { detail: { date: dateStr } }));
}

export default function MeetingTodayContainerWidget({
  dateKey: dateKeyProp = null,
  embedded = false,
  previewCount = 6,
}) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);
  const ms = getModeStyle(MODE, c);

  const todayKey = useMemo(() => ymdLocal(new Date()), []);
  const dateKey = dateKeyProp || todayKey;

  const [isMobile, setIsMobile] = useState(false);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("PENDING");

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [container, setContainer] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [historyRecords, setHistoryRecords] = useState([]);

  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(30);

  // Premium audit modal
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditAssignmentId, setAuditAssignmentId] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const set = () => setIsMobile(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const cRes = await fetch("/api/calander/container/by-date", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateKey, mode: MODE }),
      });
      const raw = await cRes.json().catch(() => ({}));
      if (!cRes.ok) {
        setErr(raw?.error || "Failed to load container");
        setContainer(null);
        setAssignments([]);
        setHistoryRecords([]);
        return;
      }
      const containerObj = raw?.container?.value ?? raw?.container;
      const id = safeId(containerObj?._id);
      if (!id) {
        setErr("Invalid container response");
        return;
      }

      const dRes = await fetch(`/api/calander/container/${id}?includeReserved=0&includeHistory=1`);
      const dData = await dRes.json().catch(() => ({}));
      if (!dRes.ok) {
        setErr(dData?.error || "Failed to load container details");
        return;
      }

      setContainer(dData.container || null);
      setAssignments(Array.isArray(dData.assignments) ? dData.assignments : []);
      setHistoryRecords(Array.isArray(dData.history) ? dData.history : []);
    } catch (e) {
      console.error(e);
      setErr("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  const pendingCount = assignments.length;
  const confirmedCount = historyRecords.length;
  const limit = container?.limit ?? 20;
  const remaining = Math.max(0, limit - pendingCount);

  const grouped = useMemo(() => groupByOccupy(assignments), [assignments]);

  const filteredAssignments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) => {
      const cust = a?.customer || {};
      return (
        String(cust?.name || "").toLowerCase().includes(q) ||
        String(cust?.address || "").toLowerCase().includes(q) ||
        String(a?.occupiedDate || "").toLowerCase().includes(q)
      );
    });
  }, [assignments, search]);

  const preview = useMemo(() => filteredAssignments.slice(0, previewCount), [filteredAssignments, previewCount]);
  const visibleList = useMemo(() => filteredAssignments.slice(0, visible), [filteredAssignments, visible]);

  useEffect(() => {
    setVisible(30);
  }, [search, open]);

  function openAuditFromAssignment(a) {
    const id = safeId(a?._id);
    if (!id) return;
    setAuditAssignmentId(id);
    setAuditOpen(true);
  }

  const shellStyle = embedded
    ? { borderRadius: 0, border: "none", background: "transparent", padding: 0 }
    : { borderRadius: 22, border: `1px solid ${c.surfaceBorder}`, background: c.surfaceBg, padding: 16 };

  return (
    <>
      {/* SUMMARY */}
      <button
        type="button"
        onClick={() => { setOpen(true); setTab("PENDING"); }}
        style={{ ...shellStyle, width: "100%", textAlign: "left", cursor: "pointer" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-8 flex-wrap">
              <div style={{ fontSize: 14, fontWeight: 900, color: c.t1 }}>📌 Meeting Container — Today</div>
              <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 999, background: ms.bg, border: `1px solid ${ms.border}`, color: ms.text, fontWeight: 800 }}>
                {ms.icon} MEETING
              </span>
            </div>

            <div style={{ marginTop: 6, color: c.t2, fontSize: 12 }}>
              <b style={{ color: c.t1 }}>{dateKey}</b>
              {weekdayLabel(dateKey) ? ` • ${weekdayLabel(dateKey)}` : ""}
              {dateKey === todayKey ? <span style={{ marginLeft: 8, color: c.t3 }}>(Today)</span> : null}
            </div>
          </div>

          <div style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 8 }}>
            {loading ? <BufferSpinner size={16} /> : null}
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: c.panelBg, border: `1px solid ${c.panelBorder}`, color: c.t2, fontWeight: 800 }}>
              IN {pendingCount}
            </span>
            <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 999, background: c.historyBg, border: `1px solid ${c.historyBorder}`, color: c.historyText, fontWeight: 800 }}>
              ✅ {confirmedCount}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          {err ? (
            <div style={{ borderRadius: 16, border: `1px solid ${c.housefullBorder}`, background: c.housefullBg, padding: 12, color: c.housefullText, fontSize: 12, whiteSpace: "pre-wrap" }}>
              {err}
            </div>
          ) : preview.length === 0 ? (
            <div style={{ borderRadius: 16, border: `1px solid ${c.panelBorder}`, background: c.panelBg, padding: 12, color: c.t3, fontSize: 12, textAlign: "center" }}>
              📭 No customers in today’s meeting container. (Tap to open)
            </div>
          ) : (
            <div className="space-y-2">
              {preview.map((a, idx) => {
                const cust = a?.customer || {};
                const isBypass = a?.bypass === true || a?.occupiedDate === "BYPASS";
                const occupy = isBypass ? "⚡ BYPASS" : a?.occupiedDate ? `🔱 ${a.occupiedDate}` : "—";
                return (
                  <div key={safeId(a?._id) || idx} style={{ borderRadius: 16, border: `1px solid ${c.panelBorder}`, background: c.panelBg, padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: c.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {idx + 1}. {cust?.name || "—"}
                      </div>
                      <div style={{ fontSize: 11, color: c.t3, marginTop: 2 }}>{cust?.address || "—"}</div>
                    </div>
                    <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, background: c.occupyBg, border: `1px solid ${c.occupyBorder}`, color: c.occupyText, fontWeight: 900, flexShrink: 0 }}>
                      {occupy}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ marginTop: 10, fontSize: 11, color: c.t3, fontWeight: 700 }}>Tap to open full details →</div>
        </div>
      </button>

      {/* FULL MODAL */}
      <LayerModal
        open={open}
        layerName="MeetingToday"
        title="📌 Today Meeting Container"
        sub={`${dateKey} • IN ${pendingCount} • ✅ ${confirmedCount}`}
        onClose={() => setOpen(false)}
        maxWidth={isMobile ? "max-w-full" : "max-w-6xl"}
      >
        <div style={{ borderRadius: 22, border: `1px solid ${c.surfaceBorder}`, background: c.surfaceBg, padding: 14, height: isMobile ? "calc(100vh - 200px)" : "78vh", overflow: "auto" }}>
          <div className="flex items-center justify-between gap-2" style={{ position: "sticky", top: 0, zIndex: 5, background: c.surfaceBg, paddingBottom: 10 }}>
            <div style={{ fontSize: 12, color: c.t2 }}>
              <b style={{ color: c.t1 }}>{dateKey}</b> • {weekdayLabel(dateKey)}
            </div>
            <button type="button" onClick={load} disabled={loading} style={{ padding: "8px 12px", borderRadius: 14, background: c.btnGhostBg, border: `1px solid ${c.btnGhostBorder}`, color: c.btnGhostText, fontSize: 12, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}>
              {loading ? "…" : "Refresh"}
            </button>
          </div>

          <div className="flex gap-1.5" style={{ position: "sticky", top: 38, zIndex: 4, background: c.surfaceBg, paddingBottom: 10 }}>
            <TabBtn c={c} active={tab === "PENDING"} onClick={() => setTab("PENDING")} label={`📋 Pending (${pendingCount})`} />
            <TabBtn c={c} active={tab === "CONFIRMED"} onClick={() => setTab("CONFIRMED")} label={`✅ Confirmed (${confirmedCount})`} />
            <TabBtn c={c} active={tab === "STATS"} onClick={() => setTab("STATS")} label="📊 Stats" />
          </div>

          {err ? (
            <div style={{ borderRadius: 18, border: `1px solid ${c.housefullBorder}`, background: c.housefullBg, padding: 14, color: c.housefullText, fontSize: 13, whiteSpace: "pre-wrap" }}>
              {err}
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2" style={{ padding: 24, color: c.t3 }}>
              <BufferSpinner size={18} /> Loading...
            </div>
          ) : (
            <>
              {tab === "STATS" ? (
                <div className="grid sm:grid-cols-4 gap-2">
                  <StatBox c={c} label="Pending (IN)" value={pendingCount} />
                  <StatBox c={c} label="Confirmed" value={confirmedCount} />
                  <StatBox c={c} label="Limit" value={limit} />
                  <StatBox c={c} label="Remaining" value={remaining} warn={remaining <= 3} />

                  <div className="sm:col-span-4" style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 11, color: c.t3, fontWeight: 800, letterSpacing: "0.04em" }}>OCCUPY GROUPS</div>
                    <div className="space-y-2" style={{ marginTop: 8 }}>
                      {grouped.map((g) => (
                        <div key={g.key} style={{ borderRadius: 16, border: `1px solid ${c.panelBorder}`, background: c.panelBg, padding: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ fontWeight: 800, color: c.t1, fontSize: 12 }}>{g.key}</div>
                          <div style={{ fontWeight: 900, color: c.t2, fontSize: 12 }}>{g.items.length}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "PENDING" ? (
                <div>
                  <div style={{ position: "sticky", top: 84, zIndex: 3, background: c.surfaceBg, paddingBottom: 10 }}>
                    <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / address / occupy date..." style={{ width: "100%", padding: "10px 14px", borderRadius: 16, border: `1px solid ${c.panelBorder}`, background: c.panelBg, color: c.t1, fontSize: 12, outline: "none" }} />
                    <div style={{ marginTop: 8, fontSize: 11, color: c.t3 }}>
                      Showing {Math.min(visible, filteredAssignments.length)}/{filteredAssignments.length}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {visibleList.map((a, idx) => {
                      const cust = a?.customer || {};
                      const isBypass = a?.bypass === true || a?.occupiedDate === "BYPASS";
                      const occupyDate = isBypass ? null : a?.occupiedDate || null;

                      return (
                        <div key={safeId(a?._id) || idx} style={{ borderRadius: 18, border: `1px solid ${c.panelBorder}`, background: c.panelBg, padding: 12 }}>
                          <div className="flex items-start justify-between gap-2">
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 900, color: c.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {idx + 1}. {cust?.name || "—"}
                              </div>
                              <div style={{ fontSize: 11, color: c.t3, marginTop: 2 }}>{cust?.address || "—"}</div>
                            </div>

                            <div className="flex flex-col gap-2" style={{ flexShrink: 0, alignItems: "flex-end" }}>
                              <button type="button" onClick={() => openAuditFromAssignment(a)} style={{ padding: "6px 10px", borderRadius: 14, background: c.btnSolidBg, border: "none", color: c.btnSolidText, fontSize: 11, fontWeight: 900, cursor: "pointer" }}>
                                💎 Profile
                              </button>

                              {isBypass ? (
                                <span style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, background: c.bypassBadgeBg, border: `1px solid ${c.bypassBadgeBorder}`, color: c.bypassBadgeText, fontWeight: 900 }}>
                                  ⚡ BYPASS
                                </span>
                              ) : occupyDate ? (
                                <button type="button" onClick={() => dispatchOpenDiksha(occupyDate)} style={{ fontSize: 10, padding: "4px 10px", borderRadius: 999, background: c.dikshaBg, border: `1px solid ${c.dikshaBorder}`, color: c.dikshaText, fontWeight: 900, cursor: "pointer" }}>
                                  🔱 {occupyDate} ↗
                                </button>
                              ) : (
                                <span style={{ fontSize: 10, color: c.t3 }}>—</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {visible < filteredAssignments.length ? (
                    <div style={{ marginTop: 12 }}>
                      <button type="button" onClick={() => setVisible((v) => v + 30)} style={{ width: "100%", padding: "12px 14px", borderRadius: 16, background: c.btnGhostBg, border: `1px solid ${c.btnGhostBorder}`, color: c.btnGhostText, cursor: "pointer", fontWeight: 900, fontSize: 12 }}>
                        Load more
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {tab === "CONFIRMED" ? (
                <div style={{ marginTop: 4 }}>
                  <HistorySection
                    historyRecords={historyRecords}
                    onOpenProfile={() => {}}
                    pendingCount={pendingCount}
                    containerDate={dateKey}
                    variant={isMobile ? "compact" : "default"}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </LayerModal>

      <CardAuditModal
        open={auditOpen}
        onClose={() => { setAuditOpen(false); setAuditAssignmentId(null); }}
        assignmentId={auditAssignmentId}
      />
    </>
  );
}

function TabBtn({ c, active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: "10px 10px",
        borderRadius: 16,
        border: `1px solid ${active ? c.historyBorder : c.btnGhostBorder}`,
        background: active ? c.historyBg : c.btnGhostBg,
        color: active ? c.historyText : c.btnGhostText,
        fontSize: 12,
        fontWeight: 900,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function StatBox({ c, label, value, warn }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${c.panelBorder}`, background: c.panelBg, padding: 12 }}>
      <div style={{ fontSize: 10, color: c.t3, fontWeight: 800, letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 20, fontWeight: 1000, color: warn ? c.gaugeWarnText : c.t1, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
    </div>
  );
}
