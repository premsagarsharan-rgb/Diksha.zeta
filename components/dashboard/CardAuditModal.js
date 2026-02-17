// components/dashboard/CardAuditModal.js
"use client";

import { useEffect, useMemo, useState } from "react";
import LayerModal from "@/components/LayerModal";
import BufferSpinner from "@/components/BufferSpinner";
import { useTheme } from "@/components/ThemeProvider";
import { useCT, getModeStyle } from "@/components/dashboard/calander/calanderTheme";

function isDateKey(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function dispatchOpenDiksha(dateStr) {
  if (!isDateKey(dateStr)) return;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("CALANDER_OPEN_DIKSHA_DATE", { detail: { date: dateStr } }));
}
function fmt(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("en-IN"); } catch { return String(dt); }
}

export default function CardAuditModal({ open, onClose, assignmentId }) {
  const { theme } = useTheme();
  const isLight = theme === "light";
  const c = useCT(isLight);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("FORM"); // FORM | CARD | COMMITS

  useEffect(() => {
    if (!open) return;
    setTab("FORM");
  }, [open]);

  useEffect(() => {
    if (!open || !assignmentId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErr("");
      setData(null);
      try {
        const res = await fetch(`/api/calander/assignments/${assignmentId}/audit`);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error || "Failed to load premium profile");
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setErr(String(e?.message || "Failed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, assignmentId]);

  const form = data?.form || {};
  const card = data?.card || null;
  const commits = Array.isArray(data?.commits) ? data.commits : [];
  const createdBy = data?.createdBy || null;

  const mode = card?.mode || "MEETING";
  const ms = getModeStyle(mode === "DIKSHA" ? "DIKSHA" : "MEETING", c);

  const titleSub = useMemo(() => {
    if (!card) return "Loading…";
    const meet = card.meetingDate || "—";
    const kind = card.kind || "SINGLE";
    return `${meet} • ${mode} • ${kind}`;
  }, [card, mode]);

  if (!open) return null;

  return (
    <LayerModal
      open={open}
      layerName="PremiumProfile"
      title="💎 Premium Card Profile"
      sub={titleSub}
      onClose={onClose}
      maxWidth="max-w-5xl"
    >
      <div style={{ borderRadius: 22, border: `1px solid ${c.surfaceBorder}`, background: c.surfaceBg, padding: 16 }}>
        {/* Tabs */}
        <div className="flex gap-1.5" style={{ marginBottom: 12 }}>
          <Tab c={c} active={tab === "FORM"} onClick={() => setTab("FORM")} label="Form Data" />
          <Tab c={c} active={tab === "CARD"} onClick={() => setTab("CARD")} label="Card Summary" />
          <Tab c={c} active={tab === "COMMITS"} onClick={() => setTab("COMMITS")} label={`Commits (${commits.length})`} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10" style={{ color: c.t3 }}>
            <BufferSpinner size={18} />
            <span style={{ fontSize: 13 }}>Loading…</span>
          </div>
        ) : err ? (
          <div style={{ borderRadius: 18, border: `1px solid ${c.housefullBorder}`, background: c.housefullBg, padding: 14, color: c.housefullText, fontSize: 13 }}>
            {err}
          </div>
        ) : !card ? (
          <div style={{ color: c.t3, fontSize: 13 }}>No data.</div>
        ) : (
          <>
            {/* FORM TAB */}
            {tab === "FORM" ? (
              <div className="space-y-3">
                <Block c={c} title="📝 Form Snapshot">
                  <div className="grid sm:grid-cols-2 gap-2">
                    {Object.entries(form || {}).map(([k, v]) => (
                      <Field key={k} c={c} label={k} value={v} />
                    ))}
                  </div>
                  {!Object.keys(form || {}).length ? (
                    <div style={{ marginTop: 8, color: c.t3, fontSize: 12 }}>No form fields found.</div>
                  ) : null}
                </Block>

                <Block c={c} title="🧾 Created By (from commits)">
                  {createdBy ? (
                    <div style={{ fontSize: 12, color: c.t2, lineHeight: 1.7 }}>
                      <div><b>Actor:</b> {createdBy.actorLabel}</div>
                      <div><b>Action:</b> {createdBy.action}</div>
                      <div><b>At:</b> {createdBy.at ? fmt(createdBy.at) : "—"}</div>
                      <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                        <b>Message:</b> {createdBy.message || "—"}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: c.t3, fontSize: 12 }}>No ASSIGN_* commit found.</div>
                  )}
                </Block>
              </div>
            ) : null}

            {/* CARD TAB */}
            {tab === "CARD" ? (
              <div className="space-y-3">
                <Block c={c} title="📌 Card Summary">
                  <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 10, padding: "2px 10px", borderRadius: 999, background: ms.bg, border: `1px solid ${ms.border}`, color: ms.text, fontWeight: 900 }}>
                      {ms.icon} {mode}
                    </span>
                    <Pill c={c} text={`Meeting: ${card.meetingDate || "—"}`} />
                    <Pill c={c} text={`Kind: ${card.kind || "SINGLE"}`} />
                    <Pill c={c} text={`Status: ${card.status || "—"}`} />
                    {card.bypass ? <Pill c={c} text="⚡ BYPASS" /> : null}
                    {card.cardStatus ? <Pill c={c} text={`CardStatus: ${card.cardStatus}`} /> : null}
                    {card.moveCount ? <Pill c={c} text={`🔄 Moved ${card.moveCount}x`} /> : null}
                  </div>

                  <div style={{ fontSize: 12, color: c.t2, lineHeight: 1.7 }}>
                    <div>
                      <b>Occupied (Diksha):</b>{" "}
                      {card.occupiedDate && card.occupiedDate !== "BYPASS" ? (
                        <button
                          type="button"
                          onClick={() => dispatchOpenDiksha(card.occupiedDate)}
                          style={{
                            marginLeft: 6,
                            padding: "2px 10px",
                            borderRadius: 999,
                            background: c.dikshaBg,
                            border: `1px solid ${c.dikshaBorder}`,
                            color: c.dikshaText,
                            fontWeight: 900,
                            fontSize: 11,
                            cursor: "pointer",
                          }}
                        >
                          🔱 {card.occupiedDate} ↗
                        </button>
                      ) : (
                        <span style={{ marginLeft: 6 }}>—</span>
                      )}
                    </div>

                    <div><b>Note:</b> {card.note || "—"}</div>
                    <div><b>Created At:</b> {card.createdAt ? fmt(card.createdAt) : "—"}</div>
                    <div><b>Updated At:</b> {card.updatedAt ? fmt(card.updatedAt) : "—"}</div>
                    <div><b>Last Moved:</b> {card.lastMovedAt ? fmt(card.lastMovedAt) : "—"}</div>
                  </div>
                </Block>

                <Block c={c} title="🔄 Move History (last 10)">
                  {Array.isArray(card.moveHistory) && card.moveHistory.length ? (
                    <div className="space-y-2">
                      {card.moveHistory.map((m, idx) => (
                        <div
                          key={idx}
                          style={{
                            borderRadius: 16,
                            border: `1px solid ${c.panelBorder}`,
                            background: c.panelBg,
                            padding: 12,
                          }}
                        >
                          <div style={{ fontSize: 12, color: c.t2 }}>
                            <b>{m.fromDate || "—"}</b> → <b>{m.toDate || "—"}</b>
                          </div>
                          <div style={{ fontSize: 11, color: c.t3, marginTop: 4 }}>
                            {m.movedAt ? fmt(m.movedAt) : "—"} • {m.movedByLabel || "—"}
                            {m.reason ? ` • ${m.reason}` : ""}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: c.t3, fontSize: 12 }}>No move history.</div>
                  )}
                </Block>
              </div>
            ) : null}

            {/* COMMITS TAB */}
            {tab === "COMMITS" ? (
              <div className="space-y-2" style={{ maxHeight: 560, overflow: "auto", paddingRight: 6 }}>
                {commits.length ? (
                  commits.map((cm, idx) => (
                    <div
                      key={idx}
                      style={{
                        borderRadius: 16,
                        border: `1px solid ${c.panelBorder}`,
                        background: c.panelBg,
                        padding: 12,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div style={{ fontSize: 11, fontWeight: 900, color: c.t1 }}>{cm.action}</div>
                        <div style={{ fontSize: 10, color: c.t3 }}>{cm.createdAt ? fmt(cm.createdAt) : ""}</div>
                      </div>

                      <div style={{ fontSize: 11, color: c.t2, marginTop: 4 }}>
                        <b>Actor:</b> {cm.actorLabel || "—"}
                      </div>

                      <div style={{ fontSize: 12, color: c.t2, marginTop: 8, whiteSpace: "pre-wrap" }}>
                        {cm.message || "—"}
                      </div>

                      {cm.meta ? (
                        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
                          {Object.entries(cm.meta)
                            .filter(([, v]) => v != null && v !== "")
                            .slice(0, 10)
                            .map(([k, v]) => (
                              <Pill key={k} c={c} text={`${k}: ${String(v)}`} />
                            ))}
                        </div>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div style={{ color: c.t3, fontSize: 12 }}>No commits found.</div>
                )}
              </div>
            ) : null}
          </>
        )}

        <div style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 18,
              background: c.btnGhostBg,
              border: `1px solid ${c.btnGhostBorder}`,
              color: c.btnGhostText,
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </LayerModal>
  );
}

function Tab({ c, active, onClick, label }) {
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

function Block({ c, title, children }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${c.panelBorder}`, background: c.panelBg, padding: 14 }}>
      <div style={{ fontSize: 11, color: c.t3, fontWeight: 900, letterSpacing: "0.04em", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Pill({ c, text }) {
  return (
    <span
      style={{
        fontSize: 10,
        padding: "3px 10px",
        borderRadius: 999,
        background: c.surfaceBg,
        border: `1px solid ${c.surfaceBorder}`,
        color: c.t2,
        fontWeight: 900,
      }}
    >
      {text}
    </span>
  );
}

function Field({ c, label, value }) {
  return (
    <div style={{ borderRadius: 16, border: `1px solid ${c.panelBorder}`, background: c.surfaceBg, padding: 12 }}>
      <div style={{ fontSize: 10, color: c.t3, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: c.t1, fontWeight: 800, wordBreak: "break-word" }}>
        {value == null || value === "" ? "—" : String(value)}
      </div>
    </div>
  );
}
