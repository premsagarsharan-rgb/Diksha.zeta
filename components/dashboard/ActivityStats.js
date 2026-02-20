// components/dashboard/ActivityStats.js
// ✅ Activity analytics with visual charts (pure CSS — no chart library needed)

"use client";

import { useEffect, useState, useMemo } from "react";
import BufferSpinner from "@/components/BufferSpinner";

const CATEGORY_COLORS = {
  AUTH: "#818cf8",
  PAGE: "#34d399",
  CRUD: "#fbbf24",
  ADMIN: "#f472b6",
  CALENDAR: "#a78bfa",
  SCREEN: "#22d3ee",
  SECURITY: "#f87171",
  OTHER: "#9ca3af",
};

const DAYS_OPTIONS = [
  { value: 7, label: "7 Days" },
  { value: 14, label: "14 Days" },
  { value: 30, label: "30 Days" },
  { value: 90, label: "90 Days" },
];

export default function ActivityStats({ userId, username }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/activity/stats?userId=${userId}&days=${days}`);
        const data = await res.json().catch(() => ({}));
        setStats(data);
      } catch {
        setStats(null);
      }
      setLoading(false);
    }
    if (userId) load();
  }, [userId, days]);

  const maxDaily = useMemo(() => {
    if (!stats?.dailyActivity?.length) return 1;
    return Math.max(...stats.dailyActivity.map((d) => d.count), 1);
  }, [stats]);

  const categoryEntries = useMemo(() => {
    if (!stats?.categoryBreakdown) return [];
    return Object.entries(stats.categoryBreakdown).sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const totalCategoryCount = useMemo(() => {
    return categoryEntries.reduce((s, [, v]) => s + v, 0) || 1;
  }, [categoryEntries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-white/50">
        <BufferSpinner size={18} /> Loading stats...
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-8 text-white/40">No stats available</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-lg font-bold text-white">
            📈 Activity Stats
            {username && <span className="text-sm font-normal text-white/50 ml-2">— {username}</span>}
          </div>
          <div className="text-xs text-white/40">Last {days} days</div>
        </div>

        <div className="flex gap-1.5">
          {DAYS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className="px-3 py-1 rounded-lg text-[11px] font-semibold transition"
              style={{
                background: days === opt.value ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${days === opt.value ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.08)"}`,
                color: days === opt.value ? "#a5b4fc" : "rgba(255,255,255,0.4)",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ Summary Cards ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Actions", value: stats.totalActions || 0, icon: "⚡", color: "#818cf8" },
          { label: "Categories", value: categoryEntries.length, icon: "📂", color: "#34d399" },
          { label: "Avg / Day", value: stats.dailyActivity?.length ? Math.round(stats.totalActions / stats.dailyActivity.length) : 0, icon: "📊", color: "#fbbf24" },
          { label: "Peak Day", value: maxDaily, icon: "🔥", color: "#f472b6" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{card.icon}</span>
              <span className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                {card.label}
              </span>
            </div>
            <div className="text-2xl font-black" style={{ color: card.color }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Daily Activity Bar Chart ═══ */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white mb-3">📅 Daily Activity</div>

        {stats.dailyActivity?.length > 0 ? (
          <div className="flex items-end gap-[2px] h-32 overflow-x-auto pb-6 relative">
            {stats.dailyActivity.map((day, i) => {
              const height = Math.max(4, (day.count / maxDaily) * 100);
              const date = new Date(day._id);
              const isToday = day._id === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={day._id}
                  className="flex flex-col items-center gap-1 group relative"
                  style={{ flex: "1 1 0", minWidth: 8 }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                    <div className="bg-black/90 border border-white/20 rounded-lg px-2 py-1 text-[9px] text-white whitespace-nowrap">
                      {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} — {day.count} actions
                    </div>
                  </div>

                  {/* Bar */}
                  <div
                    className="w-full rounded-t-sm transition-all duration-300 cursor-pointer hover:opacity-80"
                    style={{
                      height: `${height}%`,
                      background: isToday
                        ? "linear-gradient(to top, #6366f1, #a78bfa)"
                        : "linear-gradient(to top, rgba(99,102,241,0.4), rgba(99,102,241,0.7))",
                      minHeight: 4,
                    }}
                  />

                  {/* Date label (show every 5th or today) */}
                  {(i % 5 === 0 || isToday) && (
                    <div
                      className="absolute -bottom-5 text-[8px] whitespace-nowrap"
                      style={{ color: isToday ? "#a5b4fc" : "rgba(255,255,255,0.25)" }}
                    >
                      {date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-white/30 text-sm">No daily data</div>
        )}
      </div>

      {/* ═══ Category Breakdown ═══ */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white mb-3">📂 Category Breakdown</div>

        <div className="space-y-2.5">
          {categoryEntries.map(([cat, count]) => {
            const percent = Math.round((count / totalCategoryCount) * 100);
            const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.OTHER;

            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: color }}
                    />
                    <span className="text-xs font-semibold text-white/70">{cat}</span>
                  </div>
                  <span className="text-xs text-white/40">
                    {count} ({percent}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percent}%`,
                      background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Top Actions ═══ */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white mb-3">🏆 Top Actions</div>

        <div className="space-y-1.5">
          {(stats.actionBreakdown || []).slice(0, 10).map((item, i) => (
            <div
              key={`${item._id.action}-${item._id.category}`}
              className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-xs font-bold text-white/30 w-5">#{i + 1}</span>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: CATEGORY_COLORS[item._id.category] || "#9ca3af" }}
                />
                <span className="text-xs text-white/70 truncate">
                  {item._id.action?.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white/50">{item.count}x</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
