// components/dashboard/UserCreate.js
"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════
   PERMISSION KEYS — All Dashboard Components
   (SCREENS REMOVED as requested)
   ═══════════════════════════════════════════ */
const PERM_GROUPS = [
  {
    group: "Core",
    icon: "📋",
    keys: [
      { key: "recent", label: "Recent Customers" },
      { key: "add", label: "Add Customer" },
      { key: "pending", label: "Pending" },
      { key: "sitting", label: "Sitting Data" },
    ],
  },
  {
    group: "Calendar",
    icon: "📅",
    keys: [
      { key: "calander", label: "Diksha Calendar" },
      { key: "meetingCalander", label: "Meeting Calendar" },
      { key: "meetingTodayWidget", label: "Meeting Today Widget" },
    ],
  },
  {
    group: "Activity",
    icon: "📊",
    keys: [
      { key: "activityDashboard", label: "Activity Dashboard" },
      { key: "activityStats", label: "Activity Stats" },
      { key: "activityTimeline", label: "Activity Timeline" },
      { key: "activityComparison", label: "Activity Comparison" },
      { key: "activityExport", label: "Activity Export" },
      { key: "liveActivityFeed", label: "Live Activity Feed" },
    ],
  },
  {
    group: "Tools",
    icon: "🔧",
    keys: [
      { key: "tracker", label: "Location Tracker" },
      { key: "events", label: "Events" },
      { key: "trash", label: "Trash" },
    ],
  },
  {
    group: "Security & Admin",
    icon: "🔒",
    keys: [
      { key: "securityAlerts", label: "Security Alerts" },
      { key: "userCreate", label: "User Create" },
      { key: "userManage", label: "User Manage" },
    ],
  },
];

// Flat list of all perm keys
const ALL_PERM_KEYS = PERM_GROUPS.flatMap((g) => g.keys.map((k) => k.key));

// Presets
const PRESETS = {
  basic: {
    label: "🟢 Basic",
    desc: "Recent, Add, Calendar, Pending",
    perms: {
      recent: true,
      add: true,
      calander: true,
      pending: true,
    },
  },
  standard: {
    label: "🔵 Standard",
    desc: "Basic + Sitting, Tracker, Events",
    perms: {
      recent: true,
      add: true,
      calander: true,
      meetingCalander: true,
      pending: true,
      sitting: true,
      tracker: true,
      events: true,
    },
  },
  fullAccess: {
    label: "🟡 Full Access",
    desc: "Everything except Admin tools",
    perms: Object.fromEntries(
      ALL_PERM_KEYS.filter(
        (k) => !["userCreate", "userManage", "securityAlerts"].includes(k)
      ).map((k) => [k, true])
    ),
  },
  viewOnly: {
    label: "👁️ View Only",
    desc: "Recent, Calendar, Meeting Widget only",
    perms: {
      recent: true,
      calander: true,
      meetingCalander: true,
      meetingTodayWidget: true,
    },
  },
};

// Default permissions
function getDefaultPerms() {
  const perms = {};
  ALL_PERM_KEYS.forEach((k) => (perms[k] = false));
  // Defaults ON
  perms.recent = true;
  perms.add = true;
  perms.calander = true;
  perms.pending = true;
  return perms;
}

/* ═══════════════════════════════════════════
   PASSWORD HELPERS
   ═══════════════════════════════════════════ */
function generatePassword(length = 14) {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*_+-=?";
  const all = upper + lower + digits + special;

  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];

  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }

  return pwd
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: "", color: "" };

  let score = 0;
  if (pwd.length >= 4) score++;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 2) return { score, label: "Weak", color: "red" };
  if (score <= 4) return { score, label: "Medium", color: "yellow" };
  if (score <= 5) return { score, label: "Strong", color: "emerald" };
  return { score, label: "Very Strong", color: "emerald" };
}

/* ═══════════════════════════════════════════
   TOAST COMPONENT
   ═══════════════════════════════════════════ */
function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const styles = {
    success: "bg-emerald-500/15 border-emerald-400/25 text-emerald-300",
    error: "bg-red-500/15 border-red-400/25 text-red-300",
    info: "bg-blue-500/15 border-blue-400/25 text-blue-300",
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-slide-up w-[90%] max-w-md">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border shadow-2xl shadow-black/60 ${
          styles[toast.type] || styles.info
        }`}
      >
        <span className="text-sm flex-1">{toast.message}</span>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/70 shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CREATED USERS LIST
   ═══════════════════════════════════════════ */
function CreatedUsersList({ users, onEdit, onDelete }) {
  if (users.length === 0) return null;

  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-white/50 tracking-wider">
            RECENTLY CREATED
          </div>
          <div className="text-sm text-white/70 mt-0.5">
            {users.length} user(s)
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {users.map((u) => (
          <div
            key={u._id || u.username}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 group hover:bg-black/40 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sm font-bold text-white/70">
                {(u.username || "?")[0].toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  {u.username}
                </div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                      u.role === "ADMIN"
                        ? "bg-yellow-500/15 text-yellow-300"
                        : "bg-blue-500/15 text-blue-300"
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.createdAt && (
                    <span className="ml-2">
                      {new Date(u.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => onEdit(u)}
                className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/20 text-[11px] text-blue-300 font-semibold transition"
              >
                ✏️ Edit
              </button>
              <button
                onClick={() => onDelete(u)}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-[11px] text-red-300 font-semibold transition"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   CONFIRM MODAL
   ═══════════════════════════════════════════ */
function ConfirmModal({ open, title, description, onConfirm, onCancel, loading }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md mx-4 rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
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
            className="px-5 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-sm text-red-300 font-semibold transition disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EDIT MODAL
   ═══════════════════════════════════════════ */
function EditModal({ user, onSave, onCancel, loading }) {
  const [editRole, setEditRole] = useState(user?.role || "USER");
  const [editPerms, setEditPerms] = useState(() => {
    const base = getDefaultPerms();
    if (user?.permissions) {
      Object.keys(user.permissions).forEach((k) => {
        if (k in base) base[k] = user.permissions[k];
      });
    }
    return base;
  });
  const [editPassword, setEditPassword] = useState("");
  const [showEditPwd, setShowEditPwd] = useState(false);

  if (!user) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-bold text-white">
          Edit User: {user.username}
        </div>

        {/* Role */}
        <div className="mt-4">
          <div className="text-xs text-white/60 mb-1">Role</div>
          <select
            value={editRole}
            onChange={(e) => setEditRole(e.target.value)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-sm text-white outline-none"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        {/* New Password (optional) */}
        <div className="mt-3">
          <div className="text-xs text-white/60 mb-1">
            New Password (leave empty to keep current)
          </div>
          <div className="relative">
            <input
              type={showEditPwd ? "text" : "password"}
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 pr-10 text-sm text-white outline-none"
              placeholder="Leave empty to keep unchanged"
            />
            <button
              type="button"
              onClick={() => setShowEditPwd(!showEditPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-sm"
            >
              {showEditPwd ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        {/* Permissions */}
        {editRole === "USER" && (
          <div className="mt-4">
            <div className="text-xs text-white/60 mb-2">Permissions</div>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
              {PERM_GROUPS.map((group) => (
                <div key={group.group}>
                  <div className="text-[11px] text-white/40 font-semibold mb-1.5">
                    {group.icon} {group.group}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {group.keys.map((p) => (
                      <label
                        key={p.key}
                        className="flex items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-[11px] cursor-pointer hover:bg-black/30 transition"
                      >
                        <input
                          type="checkbox"
                          checked={!!editPerms[p.key]}
                          onChange={() =>
                            setEditPerms((prev) => ({
                              ...prev,
                              [p.key]: !prev[p.key],
                            }))
                          }
                          className="w-3.5 h-3.5 rounded accent-blue-400"
                        />
                        <span className="text-white/70">{p.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm text-white/80 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() =>
              onSave({
                userId: user._id,
                username: user.username,
                role: editRole,
                password: editPassword || undefined,
                permissions: editRole === "USER" ? editPerms : null,
              })
            }
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 text-sm text-blue-300 font-semibold transition disabled:opacity-50"
          >
            {loading ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function UserCreate() {
  /* ─── Form State ─── */
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [permissions, setPermissions] = useState(getDefaultPerms());
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  /* ─── Username availability ─── */
  const [usernameStatus, setUsernameStatus] = useState(null);
  const usernameTimer = useRef(null);

  /* ─── Toast ─── */
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  /* ─── Users List ─── */
  const [createdUsers, setCreatedUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  /* ─── Modals ─── */
  const [deleteModal, setDeleteModal] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  /* ─── Clipboard ─── */
  const [copied, setCopied] = useState(false);

  /* ─── Password Strength ─── */
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;

  /* ─── Validation ─── */
  const canSubmit = useMemo(() => {
    return Boolean(
      username.trim() &&
        password.trim().length >= 4 &&
        password === confirmPassword &&
        (role === "ADMIN" || role === "USER") &&
        usernameStatus !== "taken" &&
        usernameStatus !== "checking"
    );
  }, [username, password, confirmPassword, role, usernameStatus]);

  /* ─── Username Availability Check ─── */
  useEffect(() => {
    const trimmed = username.trim();
    if (!trimmed || trimmed.length < 2) {
      setUsernameStatus(null);
      return;
    }

    setUsernameStatus("checking");
    clearTimeout(usernameTimer.current);

    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(trimmed)}`
        );
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setUsernameStatus("error");
          return;
        }

        setUsernameStatus(data.available ? "available" : "taken");
      } catch {
        setUsernameStatus("error");
      }
    }, 500);

    return () => clearTimeout(usernameTimer.current);
  }, [username]);

  /* ─── Load Users ─── */
  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/users");
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setCreatedUsers(data.users || []);
      }
    } catch {
      // silent
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /* ─── Permission Helpers ─── */
  function togglePerm(key) {
    setPermissions((p) => ({ ...p, [key]: !p[key] }));
  }

  function selectAllPerms() {
    const all = {};
    ALL_PERM_KEYS.forEach((k) => (all[k] = true));
    setPermissions(all);
  }

  function deselectAllPerms() {
    const none = {};
    ALL_PERM_KEYS.forEach((k) => (none[k] = false));
    setPermissions(none);
  }

  function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) return;
    const base = {};
    ALL_PERM_KEYS.forEach((k) => (base[k] = false));
    Object.entries(preset.perms).forEach(([k, v]) => {
      if (k in base) base[k] = v;
    });
    setPermissions(base);
    showToast(`Preset "${preset.label}" applied`, "info");
  }

  const activePermCount = useMemo(
    () => ALL_PERM_KEYS.filter((k) => permissions[k]).length,
    [permissions]
  );

  /* ─── Generate Password ─── */
  function handleGeneratePassword() {
    const pwd = generatePassword(14);
    setPassword(pwd);
    setConfirmPassword(pwd);
    setShowPassword(true);
    showToast("🔑 Strong password generated!", "success");
  }

  /* ─── Copy Password ─── */
  async function handleCopyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      showToast("📋 Password copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast("❌ Failed to copy", "error");
    }
  }

  /* ─── Reset Form ─── */
  function resetForm() {
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setRole("USER");
    setPermissions(getDefaultPerms());
    setShowPassword(false);
    setShowConfirmPassword(false);
    setUsernameStatus(null);
    showToast("🔄 Form reset", "info");
  }

  /* ─── Create User ─── */
  async function createUser() {
    if (!canSubmit) return;
    setBusy(true);

    try {
      const payload = {
        username: username.trim(),
        password,
        role,
        permissions: role === "USER" ? permissions : null,
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast(data.error || "Create failed", "error");
        return;
      }

      showToast(`✅ User "${username.trim()}" created successfully!`, "success");

      // Reset form
      setUsername("");
      setPassword("");
      setConfirmPassword("");
      setRole("USER");
      setPermissions(getDefaultPerms());
      setShowPassword(false);
      setShowConfirmPassword(false);
      setUsernameStatus(null);

      // Reload users list
      loadUsers();
    } catch (e) {
      showToast(`❌ ${e.message || "Network error"}`, "error");
    } finally {
      setBusy(false);
    }
  }

  /* ─── Delete User ─── */
  async function handleDeleteUser() {
    if (!deleteModal) return;
    setModalLoading(true);

    try {
      const res = await fetch(`/api/users/${deleteModal._id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || "Delete failed", "error");
        return;
      }

      showToast(`🗑️ User "${deleteModal.username}" deleted`, "success");
      setDeleteModal(null);
      loadUsers();
    } catch (e) {
      showToast(`❌ ${e.message}`, "error");
    } finally {
      setModalLoading(false);
    }
  }

  /* ─── Edit User ─── */
  async function handleSaveEdit(payload) {
    setModalLoading(true);

    try {
      const res = await fetch(`/api/users/${payload.userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showToast(data.error || "Update failed", "error");
        return;
      }

      showToast(`✅ User "${payload.username}" updated`, "success");
      setEditModal(null);
      loadUsers();
    } catch (e) {
      showToast(`❌ ${e.message}`, "error");
    } finally {
      setModalLoading(false);
    }
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <div>
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_0_55px_rgba(59,130,246,0.10)]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-white/60">Admin Tool</div>
            <div className="text-xl font-bold mt-1">Create User</div>
            <div className="text-sm text-white/60 mt-1">
              Username + Password + Role + Permissions
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs text-white/70 transition"
          >
            🔄 Reset
          </button>
        </div>

        {/* ═══ FORM FIELDS ═══ */}
        <div className="mt-5 grid sm:grid-cols-2 gap-3">
          {/* Username */}
          <div>
            <div className="text-xs text-white/70 mb-1">Username *</div>
            <div className="relative">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full rounded-2xl bg-black/30 border px-4 py-3 pr-10 text-sm text-white outline-none focus:ring-2 transition ${
                  usernameStatus === "taken"
                    ? "border-red-400/40 focus:ring-red-500/40"
                    : usernameStatus === "available"
                    ? "border-emerald-400/40 focus:ring-emerald-500/40"
                    : "border-white/10 focus:ring-blue-500/40"
                }`}
                placeholder="e.g. Sstring"
              />
              {/* Status Icon */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                {usernameStatus === "checking" && (
                  <span className="text-yellow-400 animate-pulse">⏳</span>
                )}
                {usernameStatus === "available" && (
                  <span className="text-emerald-400">✅</span>
                )}
                {usernameStatus === "taken" && (
                  <span className="text-red-400">❌</span>
                )}
              </div>
            </div>
            {usernameStatus === "taken" && (
              <div className="text-[11px] text-red-400 mt-1">
                Username already taken
              </div>
            )}
            {usernameStatus === "available" && (
              <div className="text-[11px] text-emerald-400 mt-1">
                Username available ✓
              </div>
            )}
          </div>

          {/* Role */}
          <div>
            <div className="text-xs text-white/70 mb-1">Role *</div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 text-sm text-white outline-none"
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <div className="text-[11px] text-white/50 mt-1">
              {role === "ADMIN"
                ? "⚡ ADMIN has all components by default"
                : "🔒 USER gets only selected permissions"}
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="text-xs text-white/70 mb-1">Password * (min 4)</div>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPassword ? "text" : "password"}
                className="w-full rounded-2xl bg-black/30 border border-white/10 px-4 py-3 pr-24 text-sm text-white outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Enter password"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {/* Copy */}
                {password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="px-1.5 py-1 rounded-lg text-white/40 hover:text-white/70 text-xs transition"
                    title="Copy password"
                  >
                    {copied ? "✅" : "📋"}
                  </button>
                )}
                {/* Show/Hide */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-1.5 py-1 rounded-lg text-white/40 hover:text-white/70 text-sm transition"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            {/* Strength Meter */}
            {password && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        strength.color === "red"
                          ? "bg-red-400"
                          : strength.color === "yellow"
                          ? "bg-yellow-400"
                          : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(100, (strength.score / 7) * 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold ${
                      strength.color === "red"
                        ? "text-red-400"
                        : strength.color === "yellow"
                        ? "text-yellow-400"
                        : "text-emerald-400"
                    }`}
                  >
                    {strength.label}
                  </span>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="mt-2 px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/20 text-[11px] text-blue-300 font-semibold transition"
            >
              🎲 Generate Strong Password
            </button>
          </div>

          {/* Confirm Password */}
          <div>
            <div className="text-xs text-white/70 mb-1">Confirm Password *</div>
            <div className="relative">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showConfirmPassword ? "text" : "password"}
                className={`w-full rounded-2xl bg-black/30 border px-4 py-3 pr-10 text-sm text-white outline-none focus:ring-2 transition ${
                  !passwordsMatch
                    ? "border-red-400/40 focus:ring-red-500/40"
                    : confirmPassword && password === confirmPassword
                    ? "border-emerald-400/40 focus:ring-emerald-500/40"
                    : "border-white/10 focus:ring-blue-500/40"
                }`}
                placeholder="Re-enter password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-sm"
              >
                {showConfirmPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {!passwordsMatch && (
              <div className="text-[11px] text-red-400 mt-1">
                ❌ Passwords don't match
              </div>
            )}
            {confirmPassword && passwordsMatch && password && (
              <div className="text-[11px] text-emerald-400 mt-1">
                ✅ Passwords match
              </div>
            )}
          </div>
        </div>

        {/* ═══ PERMISSIONS SECTION ═══ */}
        {role === "USER" && (
          <div className="mt-6">
            {/* Permissions Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="text-xs text-white/60">
                  Allowed Dashboard Components (Whitelist)
                </div>
                <div className="text-[11px] text-white/40 mt-0.5">
                  {activePermCount}/{ALL_PERM_KEYS.length} selected
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={selectAllPerms}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/20 text-[11px] text-emerald-300 font-semibold transition"
                >
                  ✅ Select All
                </button>
                <button
                  type="button"
                  onClick={deselectAllPerms}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-400/20 text-[11px] text-red-300 font-semibold transition"
                >
                  ❌ Deselect All
                </button>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="group px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition text-left"
                >
                  <div className="text-[11px] font-semibold text-white/80 group-hover:text-white">
                    {preset.label}
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    {preset.desc}
                  </div>
                </button>
              ))}
            </div>

            {/* Permission Groups */}
            <div className="space-y-4">
              {PERM_GROUPS.map((group) => (
                <div key={group.group}>
                  <div className="text-[11px] text-white/40 font-semibold mb-2 flex items-center gap-1.5">
                    <span>{group.icon}</span>
                    <span className="tracking-wider uppercase">
                      {group.group}
                    </span>
                    <span className="text-white/20 ml-1">
                      (
                      {group.keys.filter((k) => permissions[k.key]).length}/
                      {group.keys.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {group.keys.map((p) => (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-xs cursor-pointer transition ${
                          permissions[p.key]
                            ? "border-blue-400/25 bg-blue-500/10 hover:bg-blue-500/15"
                            : "border-white/10 bg-black/30 hover:bg-black/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!permissions[p.key]}
                          onChange={() => togglePerm(p.key)}
                          className="w-4 h-4 rounded accent-blue-400 cursor-pointer shrink-0"
                        />
                        <span
                          className={`${
                            permissions[p.key]
                              ? "text-white"
                              : "text-white/60"
                          }`}
                        >
                          {p.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ SUBMIT + RESET BUTTONS ═══ */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={createUser}
            className="flex-1 px-4 py-3 rounded-2xl bg-white text-black font-semibold disabled:opacity-40 hover:bg-white/90 transition flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              "➕ Create User"
            )}
          </button>

          <button
            type="button"
            onClick={resetForm}
            className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-sm text-white/70 transition"
          >
            🔄
          </button>
        </div>

        {/* Validation Hints */}
        {!canSubmit && (username || password) && (
          <div className="mt-3 rounded-xl bg-yellow-500/10 border border-yellow-400/15 px-4 py-2.5">
            <div className="text-[11px] text-yellow-300/70 space-y-1">
              {!username.trim() && <div>• Username is required</div>}
              {usernameStatus === "taken" && (
                <div>• Username is already taken</div>
              )}
              {password.length > 0 && password.length < 4 && (
                <div>• Password must be at least 4 characters</div>
              )}
              {!passwordsMatch && <div>• Passwords don't match</div>}
            </div>
          </div>
        )}
      </div>

      {/* ═══ CREATED USERS LIST ═══ */}
      <CreatedUsersList
        users={createdUsers}
        onEdit={(u) => setEditModal(u)}
        onDelete={(u) => setDeleteModal(u)}
      />

      {/* ═══ MODALS ═══ */}
      <ConfirmModal
        open={!!deleteModal}
        title="Delete User"
        description={`⚠️ Are you sure you want to delete "${deleteModal?.username}"? This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        onCancel={() => !modalLoading && setDeleteModal(null)}
        loading={modalLoading}
      />

      {editModal && (
        <EditModal
          user={editModal}
          onSave={handleSaveEdit}
          onCancel={() => !modalLoading && setEditModal(null)}
          loading={modalLoading}
        />
      )}

      {/* ═══ TOAST ═══ */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* ═══ STYLES ═══ */}
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
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        select option {
          background: #1a1a2e;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
