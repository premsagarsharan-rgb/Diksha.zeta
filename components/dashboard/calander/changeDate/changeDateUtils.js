// components/dashboard/calander/changeDate/changeDateUtils.js
"use client";

/* ── Date helpers ── */
export function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthCells(year, month) {
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function safeId(x) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && x.$oid) return String(x.$oid);
  return String(x);
}

/* ── Capacity tier ── */
export function getCapacityTier(cap, groupSize = 1) {
  if (!cap) return "OK";
  const remainAfter = cap.remaining - groupSize;
  if (remainAfter < 0) return "FULL";
  if (cap.percent >= 80) return "HIGH";
  if (cap.percent >= 50) return "MID";
  return "OK";
}

/* ── Tier style mapping ── */
export function getTierColors(tier, c) {
  switch (tier) {
    case "FULL":
      return { bg: c.pickFullBg, border: c.pickFullBorder, text: c.pickFullText, dot: c.pickFullDot };
    case "HIGH":
      return { bg: c.pickHighBg, border: c.pickHighBorder, text: c.pickHighText, dot: c.pickHighDot };
    case "MID":
      return { bg: c.pickMidBg, border: c.pickMidBorder, text: c.pickMidText, dot: c.pickMidDot };
    default:
      return { bg: c.pickOkBg, border: c.pickOkBorder, text: c.pickOkText, dot: c.pickOkDot };
  }
}

/* ── Blocked check (WITH PAST DATE BLOCK) ── */
export function isBlocked(dateStr, { currentDate, boundaryDate, boundaryDirection }) {
  if (!dateStr) return true;
  if (dateStr === currentDate) return true;

  // ✅ Past date block — today se pehle ki date block
  const today = ymdLocal(new Date());
  if (dateStr < today) return true;

  // Boundary check
  if (boundaryDate && boundaryDirection === "BEFORE") {
    if (dateStr >= boundaryDate) return true;
  }
  if (boundaryDate && boundaryDirection === "AFTER") {
    if (dateStr <= boundaryDate) return true;
  }
  return false;
}

/* ── Check if date is in past ── */
export function isPastDate(dateStr) {
  if (!dateStr) return false;
  const today = ymdLocal(new Date());
  return dateStr < today;
}

/* ── Special date styles ── */
export function getDateCellStyle(dateStr, { currentDate, boundaryDate, boundaryDirection, capacities, groupSize, c }) {
  if (dateStr === currentDate) {
    return { bg: c.pickCurrentBg, border: c.pickCurrentBorder, text: c.pickCurrentText, dot: c.pickCurrentDot, type: "CURRENT" };
  }
  if (dateStr === boundaryDate) {
    return { bg: c.pickBoundaryBg, border: c.pickBoundaryBorder, text: c.pickBoundaryText, dot: c.pickBoundaryIcon, type: "BOUNDARY" };
  }
  if (isBlocked(dateStr, { currentDate, boundaryDate, boundaryDirection })) {
    return { bg: c.pickBlockedBg, border: c.pickBlockedBorder, text: c.pickBlockedText, dot: c.pickBlockedIcon, type: "BLOCKED" };
  }

  const cap = capacities?.[dateStr];
  const tier = getCapacityTier(cap, groupSize);
  const colors = getTierColors(tier, c);
  return { ...colors, type: tier };
}

/* ── Impact calculation ── */
export function calcImpact(capacityFrom, capacityTo, groupSize) {
  const fromAfter = capacityFrom ? capacityFrom.used - groupSize : null;
  const toAfter = capacityTo ? capacityTo.used + groupSize : null;

  const fromPct = capacityFrom && capacityFrom.limit
    ? Math.round((fromAfter / capacityFrom.limit) * 100)
    : null;
  const toPct = capacityTo && capacityTo.limit
    ? Math.round((toAfter / capacityTo.limit) * 100)
    : null;

  return { fromAfter, toAfter, fromPct, toPct };
}

export function impactTier(used, limit) {
  if (!limit) return "OK";
  const pct = (used / limit) * 100;
  if (pct >= 90) return "DANGER";
  if (pct >= 70) return "WARN";
  return "OK";
}

/* ── Move reasons ── */
export const MOVE_REASONS = [
  { key: "CUSTOMER_REQUEST", label: "Customer Request", icon: "👤" },
  { key: "SCHEDULE_CHANGE", label: "Schedule Change", icon: "📅" },
  { key: "ADMIN_DECISION", label: "Admin Decision", icon: "👑" },
  { key: "CAPACITY_ADJUSTMENT", label: "Capacity Adjustment", icon: "📊" },
  { key: "OTHER", label: "Other", icon: "📝" },
];

/* ── Action options builder ── */
export function buildActionOptions(mode, assignment) {
  const isBypass = assignment?.bypass === true || assignment?.occupiedDate === "BYPASS";
  const hasOccupy = !isBypass && !!assignment?.occupiedDate;
  const isMeeting = mode === "MEETING";
  const isDiksha = mode === "DIKSHA";

  const options = [];

  if (isMeeting) {
    options.push({
      key: "CHANGE_MEETING_DATE",
      icon: "📅",
      title: "Change Meeting Date",
      sub: `Current: ${assignment?.containerDate || assignment?._containerDate || "—"}`,
      description: "Move to different meeting day",
    });
  }

  if (isMeeting && hasOccupy) {
    options.push({
      key: "CHANGE_OCCUPIED_DATE",
      icon: "🔱",
      title: "Change Occupied Date",
      sub: `Current: ${assignment?.occupiedDate || "—"}`,
      description: "Change diksha reservation",
    });
  }

  if (isMeeting && hasOccupy) {
    options.push({
      key: "CHANGE_BOTH_DATES",
      icon: "🔄",
      title: "Change Both Dates",
      sub: `Meeting: ${assignment?.containerDate || assignment?._containerDate || "—"} → Occupied: ${assignment?.occupiedDate || "—"}`,
      description: "Change meeting + diksha dates together",
    });
  }

  if (isDiksha) {
    options.push({
      key: "CHANGE_DIKSHA_DATE",
      icon: "🔱",
      title: "Change Diksha Date",
      sub: `Current: ${assignment?.containerDate || assignment?._containerDate || "—"}`,
      description: "Move to different diksha day",
    });
  }

  return options;
}

/* ── Weekdays ── */
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── Fetch capacity ── */
export async function fetchMonthCapacity(year, month, mode) {
  const from = ymdLocal(new Date(year, month, 1));
  const to = ymdLocal(new Date(year, month + 1, 0));
  try {
    const res = await fetch(
      `/api/calander/capacity-preview?from=${from}&to=${to}&mode=${mode}`
    );
    const data = await res.json().catch(() => ({}));
    return data.capacities || {};
  } catch (e) {
    console.error("Capacity fetch failed:", e);
    return {};
  }
}
