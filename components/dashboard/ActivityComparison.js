// components/dashboard/ActivityComparison.js
// ✅ Compare 2 users' activity side-by-side

"use client";

import { useEffect, useState } from "react";
import BufferSpinner from "@/components/BufferSpinner";

const CATEGORY_COLORS = {
  AUTH: "#818cf8",
  PAGE: "#34d399",
  CRUD: "#fbbf24",
  ADMIN: "#f472b6",
  SECURITY: "#f87171",
  CALENDAR: "#a78bfa",
  SCREEN: "#22d3ee",
};

export default function ActivityComparison({ users = [] }) {
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState(30);

  async function compare() {
    if (!userA || !userB) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/activity/compare?userA=${userA}&userB=${userB}&days=${days}`
      );
      const json = await res.json().catch(() => ({}));
      setData(json);
    } catch {
      setData(null);
    }
    setLoading(false);
  }

  const userAName = users.find((u) => u._id === userA)?.username || "User A";
  const userBName = users.find((u) => u._id === userB)?.username || "User B";

  return (
    <div className="space-y-4">
      <div className="text-lg font-bold text-white">🔄 Activity Comparison</div>

      {/* Selection */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-[10px] text-white/40 mb-1">User A</div>
            <select
              value={userA}
              onChange={(e) => setUserA(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Select user...</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end justify-center">
            <span className="text-xl text-white/20 mb-2">VS</span>
          </div>

          <div>
            <div className="text-[10px] text-white/40 mb-1">User B</div>
            <select
              value={userB}
              onChange={(e) => setUserB(e.target.value)}
              className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Select user...</option>
              {users.filter((u) => u._id !== userA).map((u) => (
                <option key={u._id} value={u._id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1.5">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition"
                style={{
                  background: days === d ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${days === d ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: days === d ? "#a5b4fc" : "rgba(255,255,255,0.4)",
                }}
              >
                {d}d
              </button>
            ))}
          </div>

          <button
            onClick={compare}
            disabled={!userA || !userB || loading}
            className="px-4 py-2 rounded-xl bg-white text-black text-xs font-bold disabled:opacity-40 transition"
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-white/50">
          <BufferSpinner size={18} /> Comparing...
        </div>
      )}

      {data && !loading && (
        <div className="space-y-4">
          {/* Total comparison */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-4">Total Actions</div>

            <div className="flex items-center gap-4">
              {/* User A */}
              <div className="flex-1 text-center">
                <div className="text-2xl font-black text-indigo-400">
                  {data.userA?.totalActions || 0}
                </div>
                <div className="text-xs text-white/50 mt-1">{userAName}</div>
              </div>

              {/* VS */}
              <div className="shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: data.comparison?.moreActive === "userA" ? "rgba(99,102,241,0.2)" : "rgba(244,114,182,0.2)",
                    border: `1px solid ${data.comparison?.moreActive === "userA" ? "rgba(99,102,241,0.3)" : "rgba(244,114,182,0.3)"}`,
                    color: data.comparison?.moreActive === "userA" ? "#a5b4fc" : "#f9a8d4",
                  }}
                >
                  VS
                </div>
              </div>

              {/* User B */}
              <div className="flex-1 text-center">
                <div className="text-2xl font-black text-pink-400">
                  {data.userB?.totalActions || 0}
                </div>
                <div className="text-xs text-white/50 mt-1">{userBName}</div>
              </div>
            </div>

            {/* Bar comparison */}
            <div className="mt-4 space-y-2">
              <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-white/10">
                <div
                  className="h-full rounded-l-full transition-all duration-500"
                  style={{
                    width: `${Math.round(((data.userA?.totalActions || 0) / Math.max((data.userA?.totalActions || 0) + (data.userB?.totalActions || 0), 1)) * 100)}%`,
                    background: "linear-gradient(90deg, #6366f1, #818cf8)",
                  }}
                />
                <div
                  className="h-full rounded-r-full transition-all duration-500"
                  style={{
                    width: `${Math.round(((data.userB?.totalActions || 0) / Math.max((data.userA?.totalActions || 0) + (data.userB?.totalActions || 0), 1)) * 100)}%`,
                    background: "linear-gradient(90deg, #ec4899, #f472b6)",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Category comparison */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white mb-3">Category Breakdown</div>

            <div className="space-y-3">
              {Object.keys(CATEGORY_COLORS).map((cat) => {
                const aCount = data.userA?.categoryBreakdown?.[cat] || 0;
                const bCount = data.userB?.categoryBreakdown?.[cat] || 0;
                const max = Math.max(aCount, bCount, 1);

                if (aCount === 0 && bCount === 0) return null;

                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-white/60 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[cat] }} />
                        {cat}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {aCount} vs {bCount}
                      </span>
                    </div>

                    <div className="flex gap-1">
                      <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(aCount / max) * 100}%`,
                            background: "#818cf8",
                          }}
                        />
                      </div>
                      <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(bCount / max) * 100}%`,
                            background: "#f472b6",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
