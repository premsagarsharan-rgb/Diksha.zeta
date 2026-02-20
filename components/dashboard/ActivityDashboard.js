// components/dashboard/ActivityDashboard.js
// ✅ Master activity dashboard — tabs for all features

"use client";

import { useEffect, useState } from "react";
import ActivityTimeline from "@/components/dashboard/ActivityTimeline";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";
import ActivityStats from "@/components/dashboard/ActivityStats";
import SecurityAlerts from "@/components/dashboard/SecurityAlerts";
import ActivityComparison from "@/components/dashboard/ActivityComparison";
import ActivityExport from "@/components/dashboard/ActivityExport";

const TABS = [
  { key: "live", label: "🔴 Live", title: "Live Activity Feed" },
  { key: "alerts", label: "🛡️ Alerts", title: "Security Alerts" },
  { key: "timeline", label: "📊 Timeline", title: "Activity Timeline" },
  { key: "stats", label: "📈 Stats", title: "Activity Stats" },
  { key: "compare", label: "🔄 Compare", title: "Compare Users" },
  { key: "export", label: "📥 Export", title: "Export Logs" },
];

export default function ActivityDashboard({ role }) {
  const [tab, setTab] = useState("live");
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");

  // Load users list for filters
  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await fetch("/api/users");
        const data = await res.json().catch(() => ({}));
        setUsers(data.items || data.users || []);
      } catch {}
    }
    loadUsers();
  }, []);

  // Initialize indexes on first load
  useEffect(() => {
    fetch("/api/activity/init", {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-xl font-black text-white">
            🔍 Activity Monitor
          </div>
          <div className="text-xs text-white/40 mt-0.5">
            Track every user action in real-time
          </div>
        </div>

        {/* User selector (for timeline & stats) */}
        {(tab === "timeline" || tab === "stats") && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/40">User:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="rounded-xl bg-black/30 border border-white/10 px-3 py-1.5 text-xs text-white outline-none min-w-[140px]"
            >
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.username} ({u.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
            style={{
              background: tab === t.key ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${tab === t.key ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.06)"}`,
              color: tab === t.key ? "#fff" : "rgba(255,255,255,0.4)",
              boxShadow: tab === t.key ? "0 0 20px rgba(99,102,241,0.1)" : "none",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {tab === "live" && <LiveActivityFeed />}
        {tab === "alerts" && <SecurityAlerts />}
        {tab === "timeline" && (
          <ActivityTimeline
            userId={selectedUser || undefined}
            username={
              selectedUser
                ? users.find((u) => u._id === selectedUser)?.username
                : undefined
            }
          />
        )}
        {tab === "stats" && selectedUser ? (
          <ActivityStats
            userId={selectedUser}
            username={users.find((u) => u._id === selectedUser)?.username}
          />
        ) : tab === "stats" ? (
          <div className="text-center py-12 text-white/40">
            <div className="text-3xl mb-2">👆</div>
            Select a user above to view stats
          </div>
        ) : null}
        {tab === "compare" && <ActivityComparison users={users} />}
        {tab === "export" && <ActivityExport users={users} />}
      </div>
    </div>
  );
}
