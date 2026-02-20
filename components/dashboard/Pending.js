"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import CustomerProfileModal from "@/components/CustomerProfileModal";

/* ───────── helpers ───────── */
function safeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.$oid) return String(x.$oid);
  return String(x);
}

function pickTs(c) {
  const t = c?.pausedAt || c?.restoredAt || c?.createdAt || c?.updatedAt || null;
  const ms = t ? new Date(t).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

function relativeTime(ts) {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

/* ───────── skeleton card ───────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl p-4 border border-white/10 bg-white/5 animate-pulse">
      <div className="h-3 w-20 bg-white/10 rounded mb-3" />
      <div className="h-5 w-32 bg-white/15 rounded mb-2" />
      <div className="h-3 w-16 bg-white/10 rounded mb-3" />
      <div className="h-5 w-24 bg-white/10 rounded-full" />
    </div>
  );
}

/* ───────── status badge ───────── */
function StatusBadge({ status }) {
  const s = String(status || "PENDING").toUpperCase();
  const cls =
    s === "ELIGIBLE"
      ? "bg-blue-500/20 border-blue-400/20 text-blue-200"
      : "bg-yellow-500/20 border-yellow-400/20 text-yellow-200";

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] border ${cls}`}>
      {s}
    </span>
  );
}

/* ───────── empty state ───────── */
function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="w-20 h-20 text-white/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-2.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 007.586 13H4" />
      </svg>
      <p className="text-white/40 text-sm">{message}</p>
    </div>
  );
}

/* ───────── CSV export ───────── */
function exportCSV(items) {
  if (!items.length) return;
  const headers = ["Name", "Roll No", "Age", "Status", "Timestamp"];
  const rows = items.map((c) => [
    c.name || "",
    c.rollNo || "",
    c.age || "",
    String(c.status || "PENDING").toUpperCase(),
    pickTs(c) ? new Date(pickTs(c)).toLocaleString() : "",
  ]);

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pending_customers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ───────── quick action (approve / reject) ───────── */
function QuickActions({ customer, onDone }) {
  const [acting, setActing] = useState(false);

  async function handleAction(action, e) {
    e.stopPropagation();
    if (acting) return;
    setActing(true);
    try {
      await fetch("/api/customers/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: safeId(customer._id), action }),
      });
      onDone?.();
    } catch {
      /* silent */
    } finally {
      setActing(false);
    }
  }

  return (
    <div className="flex gap-1.5 mt-2">
      <button
        onClick={(e) => handleAction("approve", e)}
        disabled={acting}
        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40 transition"
      >
        ✅ Approve
      </button>
      <button
        onClick={(e) => handleAction("reject", e)}
        disabled={acting}
        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 disabled:opacity-40 transition"
      >
        ❌ Reject
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function Pending() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [openProfile, setOpenProfile] = useState(false);
  const [selected, setSelected] = useState(null);

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | PENDING | ELIGIBLE
  const [sortBy, setSortBy] = useState("newest");           // newest | oldest | az | za
  const [viewMode, setViewMode] = useState("grid");          // grid | list
  const [bulkIds, setBulkIds] = useState(new Set());
  const [bulkActing, setBulkActing] = useState(false);

  const searchRef = useRef(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customers/pending");
      const data = await res.json().catch(() => ({}));
      setItems(data.items || []);
    } catch { /* silent */ }
    setLoading(false);
    setBulkIds(new Set());
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── auto-refresh every 30s ── */
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  /* ── keyboard shortcuts ── */
  useEffect(() => {
    function onKey(e) {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "r" || e.key === "R") { e.preventDefault(); load(); }
      if (e.key === "/") { e.preventDefault(); searchRef.current?.focus(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [load]);

  /* ── filter + sort ── */
  const { recent24, older, allFiltered } = useMemo(() => {
    const term = String(q || "").trim().toLowerCase();
    const now = Date.now();
    const limit = 24 * 60 * 60 * 1000;

    let arr = items;

    // search
    if (term) {
      arr = arr.filter((c) => {
        const name = String(c?.name || "").toLowerCase();
        const roll = String(c?.rollNo || "").toLowerCase();
        return name.includes(term) || roll.includes(term);
      });
    }

    // status filter
    if (statusFilter !== "ALL") {
      arr = arr.filter((c) => String(c?.status || "PENDING").toUpperCase() === statusFilter);
    }

    // sort
    const sorter = (a, b) => {
      if (sortBy === "newest") return pickTs(b) - pickTs(a);
      if (sortBy === "oldest") return pickTs(a) - pickTs(b);
      if (sortBy === "az") return String(a.name || "").localeCompare(String(b.name || ""));
      if (sortBy === "za") return String(b.name || "").localeCompare(String(a.name || ""));
      return 0;
    };

    const r = [];
    const o = [];
    for (const c of arr) {
      const ts = pickTs(c);
      if (ts && now - ts <= limit) r.push(c);
      else o.push(c);
    }
    r.sort(sorter);
    o.sort(sorter);

    return { recent24: r, older: o, allFiltered: [...r, ...o] };
  }, [items, q, statusFilter, sortBy]);

  const total = allFiltered.length;

  /* ── analytics counts ── */
  const stats = useMemo(() => {
    const all = items.length;
    const pending = items.filter((c) => String(c?.status || "PENDING").toUpperCase() === "PENDING").length;
    const eligible = items.filter((c) => String(c?.status || "").toUpperCase() === "ELIGIBLE").length;
    const today = items.filter((c) => {
      const ts = pickTs(c);
      return ts && Date.now() - ts <= 24 * 60 * 60 * 1000;
    }).length;
    return { all, pending, eligible, today };
  }, [items]);

  /* ── bulk actions ── */
  function toggleBulk(id, e) {
    e.stopPropagation();
    setBulkIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAllBulk() {
    if (bulkIds.size === allFiltered.length) {
      setBulkIds(new Set());
    } else {
      setBulkIds(new Set(allFiltered.map((c) => safeId(c._id))));
    }
  }

  async function bulkAction(action) {
    if (!bulkIds.size || bulkActing) return;
    setBulkActing(true);
    try {
      await Promise.all(
        [...bulkIds].map((id) =>
          fetch("/api/customers/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, action }),
          })
        )
      );
      load();
    } catch { /* silent */ }
    setBulkActing(false);
  }

  /* ── render card ── */
  function renderCard(c, highlight = false) {
    const id = safeId(c._id);
    const ts = pickTs(c);
    const isChecked = bulkIds.has(id);

    const cardClass = highlight
      ? "border-emerald-400/20 bg-emerald-500/10 hover:bg-emerald-500/15"
      : "border-white/10 bg-white/5 hover:bg-white/10";

    if (viewMode === "list") {
      return (
        <div
          key={id}
          onClick={() => { setSelected(c); setOpenProfile(true); }}
          className={`flex items-center gap-3 rounded-xl p-3 border cursor-pointer transition ${cardClass}`}
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => toggleBulk(id, e)}
            onClick={(e) => e.stopPropagation()}
            className="accent-blue-500 w-4 h-4 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-semibold truncate">{c.name}</span>
              <StatusBadge status={c.status} />
            </div>
            <div className="text-white/50 text-xs mt-0.5">
              Roll: {c.rollNo || "-"} · Age: {c.age || "-"}
              {ts ? ` · ${relativeTime(ts)}` : ""}
            </div>
          </div>
          <QuickActions customer={c} onDone={load} />
        </div>
      );
    }

    return (
      <div
        key={id}
        onClick={() => { setSelected(c); setOpenProfile(true); }}
        className={`relative rounded-2xl p-4 border cursor-pointer transition ${cardClass}`}
      >
        {/* checkbox */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => toggleBulk(id, e)}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 accent-blue-500 w-4 h-4"
        />

        <div className="text-xs text-white/50">{highlight ? "Recent" : "Pending"}</div>
        <div className="text-white font-semibold mt-1 pr-6 truncate">{c.name}</div>
        <div className="text-white/60 text-sm">
          Roll: {c.rollNo || "-"} · Age: {c.age || "-"}
        </div>

        {ts ? (
          <div className="text-[11px] text-white/40 mt-1">{relativeTime(ts)}</div>
        ) : null}

        <div className="flex items-center gap-2 mt-2">
          <StatusBadge status={c.status} />
        </div>

        <QuickActions customer={c} onDone={load} />
      </div>
    );
  }

  /* ═══════ JSX ═══════ */
  return (
    <div>
      {/* ── Analytics Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: stats.all, color: "white" },
          { label: "Pending", value: stats.pending, color: "yellow" },
          { label: "Eligible", value: stats.eligible, color: "blue" },
          { label: "Today (24h)", value: stats.today, color: "emerald" },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl p-3 border border-${s.color === "white" ? "white" : s.color + "-400"}/10 bg-${s.color === "white" ? "white" : s.color + "-500"}/5`}
          >
            <div className="text-[11px] text-white/50">{s.label}</div>
            <div className="text-xl font-bold text-white mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-white font-semibold text-lg">
          Pending / Eligible <span className="text-white/50 text-sm">({total})</span>
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          {/* search */}
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / rollNo... ( / )"
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-500/30 w-52"
          />

          {/* sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm outline-none cursor-pointer"
          >
            <option value="newest" className="bg-neutral-900">Newest first</option>
            <option value="oldest" className="bg-neutral-900">Oldest first</option>
            <option value="az" className="bg-neutral-900">A → Z</option>
            <option value="za" className="bg-neutral-900">Z → A</option>
          </select>

          {/* view toggle */}
          <button
            onClick={() => setViewMode((v) => (v === "grid" ? "list" : "grid"))}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 text-sm"
            title="Toggle view"
          >
            {viewMode === "grid" ? "☰ List" : "▦ Grid"}
          </button>

          {/* export */}
          <button
            onClick={() => exportCSV(allFiltered)}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 text-sm"
          >
            📥 CSV
          </button>

          {/* refresh */}
          <button
            onClick={load}
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 text-sm"
            title="Refresh (R)"
          >
            🔄
          </button>
        </div>
      </div>

      {/* ── Status Filter Tabs ── */}
      <div className="flex gap-2 mb-4">
        {["ALL", "PENDING", "ELIGIBLE"].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition ${
              statusFilter === tab
                ? "bg-blue-500/20 border-blue-400/40 text-blue-200"
                : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Bulk action bar ── */}
      {bulkIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
          <span className="text-white text-sm">{bulkIds.size} selected</span>
          <button
            onClick={toggleAllBulk}
            className="px-3 py-1 rounded-lg text-xs bg-white/10 border border-white/10 text-white hover:bg-white/15"
          >
            {bulkIds.size === allFiltered.length ? "Deselect All" : "Select All"}
          </button>
          <button
            onClick={() => bulkAction("approve")}
            disabled={bulkActing}
            className="px-3 py-1 rounded-lg text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-40"
          >
            ✅ Bulk Approve
          </button>
          <button
            onClick={() => bulkAction("reject")}
            disabled={bulkActing}
            className="px-3 py-1 rounded-lg text-xs bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 disabled:opacity-40"
          >
            ❌ Bulk Reject
          </button>
          <button
            onClick={() => setBulkIds(new Set())}
            className="px-3 py-1 rounded-lg text-xs bg-white/10 border border-white/10 text-white/60 hover:bg-white/15"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : total === 0 ? (
        <EmptyState
          message={
            q.trim()
              ? `No pending customers matching "${q.trim()}".`
              : "No pending customers right now. 🎉"
          }
        />
      ) : (
        <div className="space-y-5">
          {/* recent 24h */}
          {recent24.length > 0 && (
            <div>
              <div className="text-xs text-white/60 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Recently (last 24 hours) — {recent24.length}
              </div>
              <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                {recent24.map((c) => renderCard(c, true))}
              </div>
            </div>
          )}

          {/* older */}
          {older.length > 0 && (
            <div>
              <div className="text-xs text-white/60 mb-2">
                Others — {older.length}
              </div>
              <div className={viewMode === "grid" ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
                {older.map((c) => renderCard(c, false))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Keyboard shortcut hint ── */}
      <div className="mt-6 text-[11px] text-white/20 text-center">
        Shortcuts: <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/40">R</kbd> Refresh ·{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/40">/</kbd> Search ·{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/40">Esc</kbd> Close Modal
        · Auto-refreshes every 30s
      </div>

      {/* ── Modal ── */}
      <CustomerProfileModal
        open={openProfile}
        onClose={() => setOpenProfile(false)}
        customer={selected}
        source="PENDING"
        onChanged={load}
      />
    </div>
  );
}
