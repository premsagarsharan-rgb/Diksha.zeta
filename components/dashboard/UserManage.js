// components/dashboard/UserManagement.js
"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import BufferSpinner from "@/components/BufferSpinner";

const PERM_KEYS = [
  { key: "recent", label: "Recent" },
  { key: "add", label: "Add" },
  { key: "calander", label: "Calander" },
  { key: "pending", label: "Pending" },
  { key: "sitting", label: "Sitting" },
  { key: "tracker", label: "Tracker" },
  { key: "screensCreate", label: "Screens: Create" },
  { key: "screensView", label: "Screens: View" },
];

const PERM_PRESETS = {
  "Full Access": { recent: true, add: true, calander: true, pending: true, sitting: true, tracker: true, screensCreate: true, screensView: true, screens: true },
  "Basic User": { recent: true, add: true, calander: true, pending: false, sitting: false, tracker: false, screensCreate: false, screensView: true, screens: true },
  "Read Only": { recent: true, add: false, calander: true, pending: false, sitting: false, tracker: false, screensCreate: false, screensView: true, screens: true },
  "Screens Only": { recent: false, add: false, calander: false, pending: false, sitting: false, tracker: false, screensCreate: true, screensView: true, screens: true },
  "Minimal": { recent: true, add: false, calander: false, pending: false, sitting: false, tracker: false, screensCreate: false, screensView: false, screens: false },
};

const DEFAULT_USER_PERMS = {
  recent: true,
  add: true,
  calander: true,
  pending: true,
  sitting: false,
  tracker: false,
  screensCreate: false,
  screensView: false,
  screens: false,
};

function normalizePerms(p) {
  const base = { ...DEFAULT_USER_PERMS, ...(p || {}) };
  if (typeof base.screens === "boolean") {
    if (typeof base.screensCreate !== "boolean") base.screensCreate = base.screens;
    if (typeof base.screensView !== "boolean") base.screensView = base.screens;
  }
  base.screens = !!(base.screensCreate || base.screensView);
  return base;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function shortDevice(ua) {
  if (!ua || ua === "Unknown") return "Unknown Device";
  const s = String(ua);
  if (s.includes("Mobile")) return "📱 Mobile";
  if (s.includes("Android")) return "📱 Android";
  if (s.includes("iPhone")) return "📱 iPhone";
  if (s.includes("iPad")) return "📱 iPad";
  if (s.includes("Windows")) return "💻 Windows";
  if (s.includes("Mac")) return "💻 Mac";
  if (s.includes("Linux")) return "💻 Linux";
  if (s.includes("Chrome")) return "🌐 Chrome";
  if (s.includes("Firefox")) return "🌐 Firefox";
  if (s.includes("Safari")) return "🌐 Safari";
  return "🖥 Device";
}

function getInitials(name) {
  if (!name) return "??";
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name) {
  const colors = ["bg-red-500", "bg-orange-500", "bg-amber-500", "bg-green-500", "bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500", "bg-fuchsia-500", "bg-pink-500", "bg-rose-500"];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

/* ───────── skeleton card ───────── */
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white/10" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-white/15 rounded mb-2" />
          <div className="h-3 w-32 bg-white/10 rounded" />
        </div>
      </div>
      <div className="h-20 bg-white/5 rounded-xl mb-3" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 bg-white/5 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/* ───────── toast ───────── */
function Toast({ message, type = "info", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-emerald-500/90 border-emerald-400/30",
    error: "bg-red-500/90 border-red-400/30",
    info: "bg-blue-500/90 border-blue-400/30",
  };

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-lg text-white text-sm ${colors[type]}`}>
      {message}
    </div>
  );
}

/* ───────── create user modal ───────── */
function CreateUserModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ username: "", password: "", role: "USER", permissions: { ...DEFAULT_USER_PERMS } });
  const [creating, setCreating] = useState(false);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, permissions: normalizePerms(form.permissions) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      onCreated?.();
      onClose();
      setForm({ username: "", password: "", role: "USER", permissions: { ...DEFAULT_USER_PERMS } });
    } catch (err) {
      alert(err.message);
    } finally {
      setCreating(false);
    }
  }

  function applyPreset(name) {
    setForm((f) => ({ ...f, permissions: { ...PERM_PRESETS[name] } }));
  }

  function togglePerm(key) {
    setForm((f) => {
      const p = { ...f.permissions, [key]: !f.permissions[key] };
      p.screens = !!(p.screensCreate || p.screensView);
      return { ...f, permissions: p };
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900 p-6 max-h-[90vh] overflow-auto">
        <h3 className="text-white font-semibold text-lg mb-4">Create New User</h3>
        
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs text-white/60 block mb-1">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Enter username"
              autoFocus
            />
          </div>
          
          <div>
            <label className="text-xs text-white/60 block mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="Enter password"
            />
          </div>
          
          <div>
            <label className="text-xs text-white/60 block mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white outline-none"
            >
              <option value="USER" className="bg-neutral-900">USER</option>
              <option value="ADMIN" className="bg-neutral-900">ADMIN</option>
            </select>
          </div>

          {form.role !== "ADMIN" && (
            <>
              <div>
                <label className="text-xs text-white/60 block mb-2">Permission Preset</label>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(PERM_PRESETS).map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => applyPreset(name)}
                      className="px-2.5 py-1 rounded-lg text-[10px] bg-white/10 hover:bg-white/15 text-white/70 border border-white/10"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-white/60 block mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {PERM_KEYS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!form.permissions[p.key]}
                        onChange={() => togglePerm(p.key)}
                      />
                      <span className="text-white/80">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating || !form.username.trim() || !form.password.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {creating ? <BufferSpinner size={14} /> : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
export default function UserManage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [permDraft, setPermDraft] = useState({});
  const [deviceDraft, setDeviceDraft] = useState({});
  const [savingDevice, setSavingDevice] = useState({});
  const [kicking, setKicking] = useState({});
  const [expandedSessions, setExpandedSessions] = useState({});
  const [collapsedCards, setCollapsedCards] = useState({});
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState(null);

  /* ── search & filter ── */
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("name"); // name | role | sessions | lastLogin

  const searchRef = useRef(null);

  /* ── fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json().catch(() => ({}));
      const list = data.items || data.users || [];
      setItems(list);

      const d = {};
      const dd = {};
      list.forEach((u) => {
        d[u._id] = normalizePerms(u.permissions);
        dd[u._id] = u.maxDevices || 1;
      });
      setPermDraft(d);
      setDeviceDraft(dd);
    } catch {
      setItems([]);
      showToast("Failed to load users", "error");
    }
    setLoading(false);
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
      if (e.key === "n" || e.key === "N") { e.preventDefault(); setCreateOpen(true); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [load]);

  function showToast(message, type = "info") {
    setToast({ message, type });
  }

  /* ── filter & sort ── */
  const filteredItems = useMemo(() => {
    let arr = [...items];

    // search
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter((u) => u.username?.toLowerCase().includes(term));
    }

    // role filter
    if (roleFilter !== "ALL") {
      arr = arr.filter((u) => u.role === roleFilter);
    }

    // status filter
    if (statusFilter === "ACTIVE") {
      arr = arr.filter((u) => u.active);
    } else if (statusFilter === "INACTIVE") {
      arr = arr.filter((u) => !u.active);
    } else if (statusFilter === "ONLINE") {
      arr = arr.filter((u) => (u.activeSessionCount || 0) > 0);
    }

    // sort
    arr.sort((a, b) => {
      if (sortBy === "name") return (a.username || "").localeCompare(b.username || "");
      if (sortBy === "role") return (a.role || "").localeCompare(b.role || "");
      if (sortBy === "sessions") return (b.activeSessionCount || 0) - (a.activeSessionCount || 0);
      if (sortBy === "lastLogin") {
        const ta = new Date(a.lastLoginAt || 0).getTime();
        const tb = new Date(b.lastLoginAt || 0).getTime();
        return tb - ta;
      }
      return 0;
    });

    return arr;
  }, [items, q, roleFilter, statusFilter, sortBy]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((u) => u.active).length;
    const inactive = total - active;
    const online = items.filter((u) => (u.activeSessionCount || 0) > 0).length;
    const admins = items.filter((u) => u.role === "ADMIN").length;
    return { total, active, inactive, online, admins };
  }, [items]);

  /* ── actions ── */
  function toggle(userId, key) {
    setPermDraft((prev) => {
      const nextUser = normalizePerms(prev[userId] || {});
      nextUser[key] = !nextUser[key];
      nextUser.screens = !!(nextUser.screensCreate || nextUser.screensView);
      return { ...prev, [userId]: nextUser };
    });
  }

  function applyPreset(userId, presetName) {
    setPermDraft((prev) => ({
      ...prev,
      [userId]: { ...PERM_PRESETS[presetName] },
    }));
  }

  async function savePermissions(userId) {
    const permissions = normalizePerms(permDraft[userId]);
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ permissions }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Save failed", "error");
      return;
    }
    showToast("Permissions updated", "success");
    load();
  }

  async function resetPassword(userId, username) {
    const pass = prompt(`New password for ${username}?`);
    if (!pass) return;
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Reset failed", "error");
      return;
    }
    showToast("Password updated", "success");
  }

  async function deleteUser(userId, username) {
    const ok = confirm(`Permanently delete user "${username}"?\n\nThis cannot be undone.`);
    if (!ok) return;
    const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Delete failed", "error");
      return;
    }
    showToast("User deleted", "success");
    load();
  }

  async function toggleActive(userId, active) {
    const res = await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast(data.error || "Update failed", "error");
      return;
    }
    showToast(active ? "User deactivated" : "User activated", "success");
    load();
  }

  async function saveMaxDevices(userId) {
    const maxDevices = deviceDraft[userId] || 1;
    setSavingDevice((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}/max-devices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxDevices }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Failed to update device limit", "error");
        return;
      }
      showToast(`Max devices set to ${maxDevices}`, "success");
      load();
    } finally {
      setSavingDevice((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function kickAllSessions(userId, username) {
    const ok = confirm(`Force logout ALL devices for "${username}"?\n\nAll active sessions will be terminated immediately.`);
    if (!ok) return;
    setKicking((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await fetch(`/api/users/${userId}/kick-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Kick failed", "error");
        return;
      }
      showToast(`${data.sessionsKicked || 0} session(s) terminated`, "success");
      load();
    } finally {
      setKicking((prev) => ({ ...prev, [userId]: false }));
    }
  }

  async function kickSingleSession(userId, sessionIndex, deviceLabel) {
    const ok = confirm(`Kick this session?\n\n${shortDevice(deviceLabel)}`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/users/${userId}/kick-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionIndex }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Kick failed", "error");
        return;
      }
      showToast("Session terminated", "success");
      load();
    } catch {
      showToast("Kick failed", "error");
    }
  }

  function toggleSessionExpand(userId) {
    setExpandedSessions((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function toggleCardCollapse(userId) {
    setCollapsedCards((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  function exportCSV() {
    const headers = ["Username", "Role", "Active", "Sessions", "Max Devices", "Last Login"];
    const rows = filteredItems.map((u) => [
      u.username,
      u.role,
      u.active ? "Yes" : "No",
      u.activeSessionCount || 0,
      u.maxDevices || 1,
      u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "Never",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV exported", "success");
  }

  /* ═══════ JSX ═══════ */
  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Total Users", value: stats.total, color: "white" },
          { label: "Active", value: stats.active, color: "emerald" },
          { label: "Inactive", value: stats.inactive, color: "yellow" },
          { label: "Online Now", value: stats.online, color: "blue" },
          { label: "Admins", value: stats.admins, color: "purple" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-3 border border-${s.color === "white" ? "white" : s.color + "-400"}/10 bg-${s.color === "white" ? "white" : s.color + "-500"}/5`}>
            <div className="text-[11px] text-white/50">{s.label}</div>
            <div className="text-xl font-bold text-white mt-0.5">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h2 className="text-white font-semibold text-lg">
          User Management <span className="text-white/50 text-sm">({filteredItems.length})</span>
        </h2>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search username... ( / )"
            className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm placeholder-white/40 outline-none focus:ring-2 focus:ring-blue-500/30 w-44"
          />

          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm outline-none">
            <option value="ALL" className="bg-neutral-900">All Roles</option>
            <option value="ADMIN" className="bg-neutral-900">Admin</option>
            <option value="USER" className="bg-neutral-900">User</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm outline-none">
            <option value="ALL" className="bg-neutral-900">All Status</option>
            <option value="ACTIVE" className="bg-neutral-900">Active</option>
            <option value="INACTIVE" className="bg-neutral-900">Inactive</option>
            <option value="ONLINE" className="bg-neutral-900">Online</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-white text-sm outline-none">
            <option value="name" className="bg-neutral-900">Sort: Name</option>
            <option value="role" className="bg-neutral-900">Sort: Role</option>
            <option value="sessions" className="bg-neutral-900">Sort: Sessions</option>
            <option value="lastLogin" className="bg-neutral-900">Sort: Last Login</option>
          </select>

          <button onClick={exportCSV} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm" title="Export CSV">
            📥
          </button>

          <button onClick={() => setCreateOpen(true)} className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold" title="New User (N)">
            + New
          </button>

          <button onClick={load} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm" title="Refresh (R)">
            🔄
          </button>
        </div>
      </div>

      {/* ── Create Modal ── */}
      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={load} />

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">👤</div>
          <p className="text-white/40">{q.trim() ? `No users matching "${q.trim()}"` : "No users found"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((u) => {
            const activeCount = u.activeSessionCount || (Array.isArray(u.activeSessions) ? u.activeSessions.length : 0);
            const maxDev = u.maxDevices || 1;
            const sessions = u.activeSessions || [];
            const isExpanded = expandedSessions[u._id];
            const isCollapsed = collapsedCards[u._id];
            const isSavingDev = savingDevice[u._id];
            const isKicking = kicking[u._id];
            const draftMax = deviceDraft[u._id] || 1;
            const draftChanged = draftMax !== maxDev;
            const avatarColor = getAvatarColor(u.username);

            return (
              <div key={u._id} className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_0_35px_rgba(59,130,246,0.10)]">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className={`w-10 h-10 rounded-full ${avatarColor} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {getInitials(u.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-semibold truncate">{u.username}</div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${activeCount > 0 ? "bg-emerald-500/15 border-emerald-400/20 text-emerald-200" : "bg-white/10 border-white/10 text-white/50"}`}>
                          {activeCount > 0 ? <><span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />{activeCount} active</> : "Offline"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-white/50">
                          {u.role}
                        </span>
                      </div>
                      <div className="text-xs text-white/60 mt-0.5">
                        {u.active ? "Active" : "Inactive"} · Max Devices: {maxDev}
                        {u.lastLoginAt ? ` · Last login: ${timeAgo(u.lastLoginAt)}` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleCardCollapse(u._id)} className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white/60 text-xs">
                      {isCollapsed ? "▼" : "▲"}
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {!isCollapsed && (
                  <>
                    {/* Device Management */}
                    <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">📱</span>
                        <div className="text-sm font-semibold text-white">Device Management</div>
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-3 mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-white/60">Max Devices Allowed</div>
                          <div className="text-lg font-bold text-white">{draftMax}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min={1}
                            max={5}
                            step={1}
                            value={draftMax}
                            onChange={(e) => setDeviceDraft((prev) => ({ ...prev, [u._id]: parseInt(e.target.value, 10) }))}
                            className="flex-1 h-2 rounded-full appearance-none bg-white/10 accent-blue-500 cursor-pointer"
                          />
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                onClick={() => setDeviceDraft((prev) => ({ ...prev, [u._id]: n }))}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition ${draftMax === n ? "bg-blue-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                        {draftChanged && (
                          <button
                            onClick={() => saveMaxDevices(u._id)}
                            disabled={isSavingDev}
                            className="mt-2 w-full px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
                          >
                            {isSavingDev ? <><BufferSpinner size={14} /> Saving...</> : `Save: ${maxDev} → ${draftMax}`}
                          </button>
                        )}
                      </div>

                      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs text-white/60">Active Sessions ({activeCount}/{maxDev})</div>
                          <div className="flex gap-1.5">
                            {activeCount > 0 && (
                              <>
                                <button onClick={() => toggleSessionExpand(u._id)} className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] text-white/70">
                                  {isExpanded ? "Hide" : "Show"}
                                </button>
                                <button
                                  onClick={() => kickAllSessions(u._id, u.username)}
                                  disabled={isKicking}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-[10px] text-red-200 font-medium disabled:opacity-60 flex items-center gap-1"
                                >
                                  {isKicking ? <BufferSpinner size={10} /> : "🔴"} Kick All
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all ${activeCount >= maxDev ? "bg-red-500/60" : activeCount > 0 ? "bg-emerald-500/60" : "bg-white/10"}`}
                            style={{ width: `${Math.min(100, (activeCount / maxDev) * 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-white/40">
                          {activeCount === 0 ? "No active sessions" : activeCount >= maxDev ? "⚠️ All device slots used" : `${maxDev - activeCount} slot${maxDev - activeCount > 1 ? "s" : ""} available`}
                        </div>

                        {isExpanded && sessions.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {sessions.map((s, idx) => (
                              <div key={idx} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                                      <div className="text-xs font-medium text-white truncate">{shortDevice(s.deviceLabel)}</div>
                                    </div>
                                    <div className="text-[10px] text-white/40 mt-1 ml-3.5">IP: {s.ip || "unknown"} · Login: {timeAgo(s.createdAt)}</div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/20 text-emerald-200">#{idx + 1}</span>
                                    <button
                                      onClick={() => kickSingleSession(u._id, idx, s.deviceLabel)}
                                      className="p-1 rounded bg-red-500/15 hover:bg-red-500/25 text-red-300 text-[10px]"
                                      title="Kick this session"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>
                                <details className="mt-1.5 ml-3.5">
                                  <summary className="text-[9px] text-white/30 cursor-pointer hover:text-white/50">Full device info</summary>
                                  <div className="text-[9px] text-white/30 mt-1 break-all">{s.deviceLabel || "Unknown"}</div>
                                </details>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Permissions */}
                    {u.role === "ADMIN" ? (
                      <div className="mt-3 text-xs text-white/60">Admin has all permissions by default.</div>
                    ) : (
                      <>
                        <div className="mt-4 flex items-center justify-between mb-2">
                          <div className="text-xs text-white/60">Dashboard Components Allowed:</div>
                          <div className="flex gap-1.5">
                            {Object.keys(PERM_PRESETS).map((name) => (
                              <button
                                key={name}
                                onClick={() => applyPreset(u._id, name)}
                                className="px-2 py-1 rounded-lg text-[9px] bg-white/10 hover:bg-white/15 text-white/60 border border-white/10"
                              >
                                {name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
                          {PERM_KEYS.map((p) => (
                            <label key={p.key} className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs cursor-pointer hover:bg-white/5">
                              <input type="checkbox" checked={!!permDraft?.[u._id]?.[p.key]} onChange={() => toggle(u._id, p.key)} />
                              <span className="text-white/80">{p.label}</span>
                            </label>
                          ))}
                        </div>

                        <button onClick={() => savePermissions(u._id)} className="mt-3 px-4 py-2 rounded-xl bg-white text-black font-semibold hover:bg-white/90">
                          Save Permissions
                        </button>
                      </>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-white/10">
                      <button onClick={() => toggleActive(u._id, u.active)} className={`px-3 py-2 rounded-xl text-xs font-medium ${u.active ? "bg-yellow-500/15 text-yellow-200 hover:bg-yellow-500/25" : "bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"}`}>
                        {u.active ? "Deactivate" : "Activate"}
                      </button>
                      <button onClick={() => resetPassword(u._id, u.username)} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs">
                        Reset Password
                      </button>
                      <button onClick={() => deleteUser(u._id, u.username)} className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-200 text-xs">
                        Delete User
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Shortcuts hint ── */}
      <div className="mt-6 text-[11px] text-white/20 text-center">
        Shortcuts: <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/40">R</kbd> Refresh ·{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/40">/</kbd> Search ·{" "}
        <kbd className="px-1 py-0.5 rounded bg-white/10 text-white/40">N</kbd> New User · Auto-refresh every 30s
      </div>
    </div>
  );
}
