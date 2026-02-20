// components/dashboard/Trash.js
"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import BufferSpinner from "@/components/BufferSpinner";

/* ─── helpers ─── */
function safeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.$oid) return String(x.$oid);
  return String(x);
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatTime(d) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function daysLeft(trashedAt, autoDays = 30) {
  if (!trashedAt) return null;
  const diff = autoDays - Math.floor((Date.now() - new Date(trashedAt)) / 86400000);
  return diff > 0 ? diff : 0;
}

const ITEMS_PER_PAGE = 9;

/* ─── Toast Component ─── */
function UndoToast({ toast, onUndo, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up">
      <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-zinc-900 border border-white/15 shadow-2xl shadow-black/60">
        <span className="text-sm text-white/90">{toast.message}</span>
        {toast.undoData && (
          <button
            onClick={onUndo}
            className="px-3 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-400/30 text-yellow-300 text-xs font-bold transition"
          >
            UNDO
          </button>
        )}
        <button onClick={onClose} className="text-white/40 hover:text-white/70 ml-1">
          ✕
        </button>
      </div>
    </div>
  );
}

/* ─── Confirm Modal ─── */
function ConfirmModal({ open, title, description, danger, onConfirm, onCancel, loading }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <div className="text-lg font-bold text-white">{title}</div>
        <div className="text-sm text-white/60 mt-2">{description}</div>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm text-white/80 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50 ${
              danger
                ? "bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-300"
                : "bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-300"
            }`}
          >
            {loading && <BufferSpinner size={14} />}
            {danger ? "Delete" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function Trash({ role, session }) {
  /* ─── state ─── */
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // search & filter & sort
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest"); // newest | oldest | name-asc | name-desc

  // pagination
  const [page, setPage] = useState(1);

  // selection
  const [selected, setSelected] = useState(new Set());

  // modal
  const [modal, setModal] = useState(null); // { type, ids, title, description, danger }
  const [modalLoading, setModalLoading] = useState(false);

  // toast + undo
  const [toast, setToast] = useState(null); // { message, undoData }
  const toastTimer = useRef(null);

  /* ─── load trash ─── */
  const loadTrash = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trash");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Failed to load trash");
        setItems([]);
        return;
      }
      setItems(data.items || []);
      setSelected(new Set());
    } catch (e) {
      console.error("loadTrash failed", e);
      setError("Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  /* ─── search + sort + filter (memoized) ─── */
  const filtered = useMemo(() => {
    let result = [...items];

    // search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((item) => {
        const name = (item.customer?.name || "").toLowerCase();
        const phone = (item.customer?.phone || item.customer?.whatsappWelcomeTo || "").toLowerCase();
        const address = (item.customer?.address || "").toLowerCase();
        return name.includes(q) || phone.includes(q) || address.includes(q);
      });
    }

    // sort
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.trashedAt || b.rejectedAt || 0) - new Date(a.trashedAt || a.rejectedAt || 0);
      }
      if (sortBy === "oldest") {
        return new Date(a.trashedAt || a.rejectedAt || 0) - new Date(b.trashedAt || b.rejectedAt || 0);
      }
      if (sortBy === "name-asc") {
        return (a.customer?.name || "").localeCompare(b.customer?.name || "");
      }
      if (sortBy === "name-desc") {
        return (b.customer?.name || "").localeCompare(a.customer?.name || "");
      }
      return 0;
    });

    return result;
  }, [items, search, sortBy]);

  /* ─── pagination ─── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // reset page when search/sort changes
  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  /* ─── selection ─── */
  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((i) => safeId(i._id))));
    }
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  /* ─── toast helpers ─── */
  function showToast(message, undoData = null) {
    clearTimeout(toastTimer.current);
    setToast({ message, undoData });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }

  function closeToast() {
    clearTimeout(toastTimer.current);
    setToast(null);
  }

  /* ─── RESTORE ─── */
  async function handleRestore(ids) {
    setModalLoading(true);
    try {
      const res = await fetch("/api/trash/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Restore failed");

      // save for undo
      const restoredItems = items.filter((i) => ids.includes(safeId(i._id)));
      setItems((prev) => prev.filter((i) => !ids.includes(safeId(i._id))));
      setSelected(new Set());
      setModal(null);
      showToast(`✅ ${ids.length} item(s) restored`, { action: "restore", items: restoredItems, ids });
    } catch (e) {
      showToast(`❌ ${e.message}`);
    } finally {
      setModalLoading(false);
    }
  }

  /* ─── PERMANENT DELETE ─── */
  async function handleDelete(ids) {
    setModalLoading(true);
    try {
      const res = await fetch("/api/trash/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Delete failed");

      const deletedItems = items.filter((i) => ids.includes(safeId(i._id)));
      setItems((prev) => prev.filter((i) => !ids.includes(safeId(i._id))));
      setSelected(new Set());
      setModal(null);
      showToast(`🗑️ ${ids.length} item(s) permanently deleted`, { action: "delete", items: deletedItems, ids });
    } catch (e) {
      showToast(`❌ ${e.message}`);
    } finally {
      setModalLoading(false);
    }
  }

  /* ─── EMPTY TRASH ─── */
  async function handleEmptyTrash() {
    setModalLoading(true);
    try {
      const res = await fetch("/api/trash/empty", {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Empty trash failed");

      const allItems = [...items];
      setItems([]);
      setSelected(new Set());
      setModal(null);
      showToast(`🗑️ Trash emptied (${allItems.length} items)`, { action: "empty", items: allItems });
    } catch (e) {
      showToast(`❌ ${e.message}`);
    } finally {
      setModalLoading(false);
    }
  }

  /* ─── UNDO ─── */
  async function handleUndo() {
    if (!toast?.undoData) return;
    const { action, ids, items: undoItems } = toast.undoData;
    closeToast();

    try {
      if (action === "restore") {
        // undo restore = move back to trash
        await fetch("/api/trash/undo-restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
      } else if (action === "delete" || action === "empty") {
        // undo delete = re-add to trash
        await fetch("/api/trash/undo-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: undoItems }),
        });
      }
      await loadTrash();
      showToast("↩️ Undo successful!");
    } catch {
      showToast("❌ Undo failed");
    }
  }

  /* ─── open modals ─── */
  function openRestoreModal(ids) {
    setModal({
      type: "restore",
      ids,
      title: "Restore Items",
      description: `Are you sure you want to restore ${ids.length} item(s) back to active list?`,
      danger: false,
    });
  }

  function openDeleteModal(ids) {
    setModal({
      type: "delete",
      ids,
      title: "Permanent Delete",
      description: `⚠️ This will permanently delete ${ids.length} item(s). This action cannot be easily undone.`,
      danger: true,
    });
  }

  function openEmptyTrashModal() {
    setModal({
      type: "empty",
      ids: [],
      title: "Empty Entire Trash",
      description: `⚠️ This will permanently delete ALL ${items.length} items in trash. Are you absolutely sure?`,
      danger: true,
    });
  }

  function handleModalConfirm() {
    if (!modal) return;
    if (modal.type === "restore") handleRestore(modal.ids);
    else if (modal.type === "delete") handleDelete(modal.ids);
    else if (modal.type === "empty") handleEmptyTrash();
  }

  /* ─── RENDER ─── */

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <BufferSpinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4">
        <div className="text-sm font-semibold text-red-200">Error</div>
        <div className="text-xs text-red-200/80 mt-1">{error}</div>
        <button
          onClick={loadTrash}
          className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs"
        >
          Retry
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
        <div className="text-4xl mb-3">🗑️</div>
        <div className="text-lg font-semibold text-white/80">Trash is Empty</div>
        <div className="text-sm text-white/50 mt-1">No rejected customers found.</div>
      </div>
    );
  }

  return (
    <div>
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-xs text-white/60">TRASH</div>
          <div className="text-sm text-white/80 mt-0.5">
            {items.length} rejected {items.length === 1 ? "card" : "cards"}
            {filtered.length !== items.length && (
              <span className="text-white/40 ml-1">(showing {filtered.length})</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadTrash}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs transition"
          >
            🔄 Refresh
          </button>

          {/* Empty Trash — admin only */}
          {role === "admin" && items.length > 0 && (
            <button
              onClick={openEmptyTrashModal}
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-xs text-red-300 transition"
            >
              🗑️ Empty Trash
            </button>
          )}
        </div>
      </div>

      {/* ═══ SEARCH + SORT BAR ═══ */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search name, phone, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:border-white/25 transition"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-white/25 transition appearance-none cursor-pointer"
        >
          <option value="newest">🕐 Newest First</option>
          <option value="oldest">🕐 Oldest First</option>
          <option value="name-asc">🔤 Name A→Z</option>
          <option value="name-desc">🔤 Name Z→A</option>
        </select>
      </div>

      {/* ═══ BULK ACTIONS BAR ═══ */}
      <div className="flex items-center justify-between mb-3 px-1">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleSelectAll}
            className="w-4 h-4 rounded border-white/30 bg-white/5 accent-emerald-400"
          />
          <span className="text-xs text-white/50">
            {selected.size > 0 ? `${selected.size} selected` : "Select All"}
          </span>
        </label>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openRestoreModal([...selected])}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/20 text-xs text-emerald-300 font-semibold transition"
            >
              ↩️ Restore ({selected.size})
            </button>
            <button
              onClick={() => openDeleteModal([...selected])}
              className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-xs text-red-300 font-semibold transition"
            >
              🗑️ Delete ({selected.size})
            </button>
          </div>
        )}
      </div>

      {/* ═══ NO RESULTS ═══ */}
      {filtered.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <div className="text-sm text-white/60">No results for "{search}"</div>
          <button
            onClick={() => setSearch("")}
            className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs transition"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* ═══ CARDS GRID ═══ */}
      {filtered.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginated.map((item) => {
            const id = safeId(item._id);
            const cust = item.customer;
            const cont = item.container;
            const custName = cust?.name || "Unknown";
            const custAddress = cust?.address || "—";
            const custGender = cust?.gender || "—";
            const custPhone = cust?.phone || cust?.whatsappWelcomeTo || "—";
            const containerDate = cont?.date || item?.occupiedDate || "—";
            const containerMode = cont?.mode || "MEETING";
            const trashedAt = item.trashedAt || item.rejectedAt;
            const kind = item.kind || "SINGLE";
            const reason = item.rejectionReason || item.reason || null;
            const remaining = daysLeft(trashedAt);
            const isSelected = selected.has(id);

            return (
              <div
                key={id}
                className={`rounded-2xl border p-4 transition relative group ${
                  isSelected
                    ? "border-emerald-400/30 bg-emerald-500/5"
                    : "border-red-400/15 bg-black/30 hover:bg-black/35"
                }`}
              >
                {/* Checkbox */}
                <div className="absolute top-3 right-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(id)}
                    className="w-4 h-4 rounded border-white/30 bg-white/5 accent-emerald-400 cursor-pointer"
                  />
                </div>

                {/* Top Row: Badge + Kind */}
                <div className="flex items-center justify-between mb-2 pr-6">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-red-500/15 border border-red-400/20 text-red-300">
                    🗑️ REJECTED
                  </span>
                  <span className="text-[10px] text-white/50 uppercase">{kind}</span>
                </div>

                {/* Customer Info */}
                <div className="mt-1">
                  <div className="font-semibold text-white truncate">{custName}</div>
                  <div className="text-xs text-white/60 truncate mt-0.5">{custAddress}</div>
                </div>

                {/* Rejection Reason */}
                {reason && (
                  <div className="mt-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/10">
                    <div className="text-[10px] text-red-300/60 font-semibold mb-0.5">REJECTION REASON</div>
                    <div className="text-xs text-red-200/80">{reason}</div>
                  </div>
                )}

                {/* Details */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Gender</span>
                    <span className="text-white/80">{custGender}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">Phone</span>
                    <span className="text-white/80">{custPhone}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/50">From Container</span>
                    <span className="text-white/80">
                      {containerDate} / {containerMode}
                    </span>
                  </div>
                  {item.occupiedDate && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/50">Occupied Date</span>
                      <span className="text-emerald-300/80">{item.occupiedDate}</span>
                    </div>
                  )}
                </div>

                {/* Auto-Delete Timer */}
                {remaining !== null && (
                  <div className="mt-2">
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold ${
                        remaining <= 5
                          ? "bg-red-500/15 border border-red-400/20 text-red-300"
                          : remaining <= 15
                          ? "bg-yellow-500/15 border border-yellow-400/20 text-yellow-300"
                          : "bg-white/5 border border-white/10 text-white/50"
                      }`}
                    >
                      ⏳ Auto-delete in {remaining} {remaining === 1 ? "day" : "days"}
                    </div>
                  </div>
                )}

                {/* Footer: Trashed time + Actions */}
                <div className="mt-3 pt-2 border-t border-white/5">
                  <div className="text-[10px] text-white/40 mb-2">
                    Trashed: {formatDate(trashedAt)} {formatTime(trashedAt)}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openRestoreModal([id])}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/20 text-[11px] text-emerald-300 font-semibold transition text-center"
                    >
                      ↩️ Restore
                    </button>
                    <button
                      onClick={() => openDeleteModal([id])}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-[11px] text-red-300 font-semibold transition text-center"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ PAGINATION ═══ */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            ◀ Prev
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                  p === page
                    ? "bg-white/20 border border-white/30 text-white"
                    : "bg-white/5 hover:bg-white/10 border border-white/5 text-white/50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition"
          >
            Next ▶
          </button>
        </div>
      )}

      {/* ═══ CONFIRM MODAL ═══ */}
      <ConfirmModal
        open={!!modal}
        title={modal?.title || ""}
        description={modal?.description || ""}
        danger={modal?.danger}
        loading={modalLoading}
        onConfirm={handleModalConfirm}
        onCancel={() => setModal(null)}
      />

      {/* ═══ UNDO TOAST ═══ */}
      <UndoToast toast={toast} onUndo={handleUndo} onClose={closeToast} />

      {/* ═══ ANIMATION STYLES ═══ */}
      <style jsx global>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        select option {
          background: #1a1a2e;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
