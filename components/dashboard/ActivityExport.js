// components/dashboard/ActivityExport.js
// ✅ Export activity logs as CSV

"use client";

import { useState } from "react";
import BufferSpinner from "@/components/BufferSpinner";

export default function ActivityExport({ users = [] }) {
  const [userId, setUserId] = useState("");
  const [days, setDays] = useState(30);
  const [exporting, setExporting] = useState(false);

  async function exportCSV() {
    setExporting(true);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (userId) params.set("userId", userId);

      const res = await fetch(`/api/activity/export?${params}`);

      if (!res.ok) {
        alert("Export failed");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `activity-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed");
    }
    setExporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="text-lg font-bold text-white">📥 Export Activity Logs</div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
        {/* User filter */}
        <div>
          <div className="text-[10px] text-white/40 mb-1">Filter by User (optional)</div>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none"
          >
            <option value="">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.username}
              </option>
            ))}
          </select>
        </div>

        {/* Days */}
        <div>
          <div className="text-[10px] text-white/40 mb-1">Time Period</div>
          <div className="flex gap-1.5 flex-wrap">
            {[7, 14, 30, 60, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                style={{
                  background: days === d ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${days === d ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: days === d ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}
              >
                {d} Days
              </button>
            ))}
          </div>
        </div>

        {/* Export button */}
        <button
          onClick={exportCSV}
          disabled={exporting}
          className="w-full py-3 rounded-xl bg-white text-black font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2 transition active:scale-[0.98]"
        >
          {exporting ? (
            <>
              <BufferSpinner size={16} /> Exporting...
            </>
          ) : (
            <>📥 Download CSV</>
          )}
        </button>

        <div className="text-[10px] text-white/25 text-center">
          Max 5,000 rows per export • CSV format • Opens in Excel/Sheets
        </div>
      </div>
    </div>
  );
}
