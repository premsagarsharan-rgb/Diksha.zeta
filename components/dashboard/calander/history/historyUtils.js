// components/dashboard/calander/history/historyUtils.js
"use client";

/* ── Safe ID ── */
export function safeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.$oid) return String(x.$oid);
  return String(x);
}

/* ── Relative Time ── */
export function relativeTime(dateStr) {
  if (!dateStr) return "—";
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (!Number.isFinite(then)) return "—";

  const diff = now - then;
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  const week = Math.floor(day / 7);
  const month = Math.floor(day / 30);

  if (sec < 10) return "Just now";
  if (sec < 60) return `${sec}s ago`;
  if (min < 60) return `${min}m ago`;
  if (hr < 24) return `${hr}h ago`;
  if (day < 7) return `${day}d ago`;
  if (week < 5) return `${week}w ago`;
  if (month < 12) return `${month}mo ago`;
  return new Date(dateStr).toLocaleDateString();
}

/* ── Format Date ── */
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

/* ── Format Time ── */
export function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* ── Group by PairId ── */
export function groupByPair(records) {
  const groups = [];
  const pairMap = new Map();
  const singles = [];

  for (const r of records) {
    const pairId = r.pairId ? safeId(r.pairId) : null;
    if (pairId) {
      if (!pairMap.has(pairId)) {
        const group = { pairId, kind: r.kind || "COUPLE", members: [] };
        pairMap.set(pairId, group);
        groups.push(group);
      }
      pairMap.get(pairId).members.push(r);
    } else {
      singles.push(r);
    }
  }

  // Convert to flat list with group markers
  const result = [];
  for (const g of groups) {
    result.push({
      type: "GROUP_HEADER",
      pairId: g.pairId,
      kind: g.kind,
      count: g.members.length,
      members: g.members,
    });
    for (const m of g.members) {
      result.push({ type: "MEMBER", ...m, _groupPairId: g.pairId });
    }
  }
  for (const s of singles) {
    result.push({ type: "SINGLE", ...s });
  }

  return result;
}

/* ── Filter Records ── */
export function filterRecords(records, { search, genderFilter, sortBy }) {
  let filtered = [...(records || [])];

  // Search
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter((r) => {
      const snap = r.customerSnapshot || {};
      const name = (snap.name || "").toLowerCase();
      const address = (snap.address || "").toLowerCase();
      return name.includes(q) || address.includes(q);
    });
  }

  // Gender filter
  if (genderFilter && genderFilter !== "ALL") {
    filtered = filtered.filter((r) => {
      const snap = r.customerSnapshot || {};
      return snap.gender === genderFilter;
    });
  }

  // Sort
  if (sortBy === "NAME") {
    filtered.sort((a, b) => {
      const na = (a.customerSnapshot?.name || "").toLowerCase();
      const nb = (b.customerSnapshot?.name || "").toLowerCase();
      return na.localeCompare(nb);
    });
  } else if (sortBy === "GENDER") {
    filtered.sort((a, b) => {
      const ga = a.customerSnapshot?.gender || "";
      const gb = b.customerSnapshot?.gender || "";
      return ga.localeCompare(gb);
    });
  } else {
    // Default: RECENT (newest first)
    filtered.sort((a, b) => {
      const ta = new Date(a.confirmedAt || 0).getTime();
      const tb = new Date(b.confirmedAt || 0).getTime();
      return tb - ta;
    });
  }

  return filtered;
}

/* ── Count Stats ── */
export function countStats(records) {
  let male = 0, female = 0, other = 0;
  let couples = 0, families = 0, singles = 0;
  let bypassed = 0, moved = 0;
  const pairIds = new Set();

  for (const r of records || []) {
    const snap = r.customerSnapshot || {};
    const g = snap.gender;
    if (g === "MALE") male++;
    else if (g === "FEMALE") female++;
    else other++;

    if (r.bypass) bypassed++;
    if (r.moveCount > 0) moved++;

    const pairId = r.pairId ? safeId(r.pairId) : null;
    if (pairId) {
      if (!pairIds.has(pairId)) {
        pairIds.add(pairId);
        if (r.kind === "FAMILY") families++;
        else couples++;
      }
    } else {
      singles++;
    }
  }

  const total = male + female + other;
  return { total, male, female, other, couples, families, singles, bypassed, moved };
}

/* ── Sort Options ── */
export const SORT_OPTIONS = [
  { key: "RECENT", label: "Recent First", icon: "🕐" },
  { key: "NAME", label: "By Name", icon: "🔤" },
  { key: "GENDER", label: "By Gender", icon: "👤" },
];

/* ── View Modes ── */
export const VIEW_MODES = [
  { key: "COMPACT", label: "Compact", icon: "▤" },
  { key: "DETAIL", label: "Detail", icon: "▦" },
];
