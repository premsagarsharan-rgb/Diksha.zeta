// components/dashboard/AddCustomer.js
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LayerModal from "@/components/LayerModal";
import { useCommitGate } from "@/components/CommitGate";
import { useTheme } from "@/components/ThemeProvider";

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const DRAFT_KEY_V2 = "sysbyte_addcustomer_draft_v2";
const DRAFT_KEY_V1 = "sysbyte_addcustomer_draft_v1";
const LAST_ADDED_KEY = "sysbyte_last_added_customer";

const FAMILY_OPTIONS = ["mother", "father", "mother&father", "husband", "wife", "other"];

const APPROVER_SUGGESTIONS = [
  "Albeli baba", "sundari baba", "sahachari baba", "pyari sharan baba",
  "garbeli baba", "mahaMadhuri baba", "navalNagri baba",
  "permRasdaini baba", "navalKishori baba",
];

const MARITAL_SUGGESTIONS = ["married", "unmarried", "divorce", "widow", "virakt", "separated"];

const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1950;

const PET_SUGGESTIONS = [
  "Dog", "Cat", "Parrot", "Cow", "Buffalo", "Goat", "Fish",
  "Rabbit", "Hamster", "Turtle", "Horse", "Pigeon", "Hen",
  "Duck", "Peacock", "Monkey", "Snake", "Lizard", "Other",
];

const OCCUPATION_SUGGESTIONS = [
  "Business", "Private Job", "Government Job", "House Wife", "ShopKeeper",
  "Freelancer", "Student", "Teacher", "Doctor", "Engineer", "Farmer",
  "Retired", "Self Employed", "Daily Wage", "Driver", "Lawyer",
  "Accountant", "Nurse", "Electrician", "Plumber", "Tailor",
  "Mechanic", "Painter", "Carpenter", "Chef", "Security Guard",
  "Clerk", "Manager", "Director", "Consultant", "Architect",
  "Pharmacist", "Journalist", "Photographer", "Designer",
  "Software Developer", "Data Entry", "Bank Employee",
  "Police", "Army", "Navy", "Air Force", "Priest", "Pandit",
  "Sadhu", "Sevadaar", "NGO Worker", "Social Worker",
  "Real Estate", "Insurance Agent", "CA", "CS", "MBA",
  "Contractor", "Transporter", "Wholesaler", "Retailer",
  "Import Export", "Factory Worker", "Labour", "Unemployed", "Other",
];

const INDIA_STATES_FALLBACK = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa",
  "Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland",
  "Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu and Kashmir",
  "Ladakh","Puducherry","Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu","Andaman and Nicobar Islands","Lakshadweep",
];

const STATES_BACKUP = {
  "United States": ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"],
  Canada: ["Alberta","British Columbia","Manitoba","New Brunswick","Newfoundland and Labrador","Northwest Territories","Nova Scotia","Nunavut","Ontario","Prince Edward Island","Quebec","Saskatchewan","Yukon"],
  Australia: ["Australian Capital Territory","New South Wales","Northern Territory","Queensland","South Australia","Tasmania","Victoria","Western Australia"],
  "United Kingdom": ["England","Scotland","Wales","Northern Ireland"],
};

const COUNTRIES_FALLBACK = [
  "India","United States","United Kingdom","Canada","Australia",
  "Germany","France","Japan","China","Nepal","Bangladesh","Sri Lanka",
].map((n) => ({ name: n, flag: "", code: n }));

/* ═══════════════════════════════════════════════
   THEME COLORS
   ═══════════════════════════════════════════════ */

const AC = {
  dark: {
    page: "#06060f",
    cardBg: "rgba(255,255,255,0.04)",
    cardBorder: "rgba(255,255,255,0.06)",
    inputBg: "rgba(255,255,255,0.05)",
    inputBorder: "rgba(255,255,255,0.10)",
    inputBorderFocus: "rgba(99,102,241,0.60)",
    inputText: "#ffffff",
    inputPlaceholder: "rgba(255,255,255,0.28)",
    inputFocusRing: "rgba(99,102,241,0.18)",
    inputDisabledBg: "rgba(255,255,255,0.02)",
    inputDisabledText: "rgba(255,255,255,0.25)",
    t1: "#ffffff",
    t2: "rgba(255,255,255,0.60)",
    t3: "rgba(255,255,255,0.35)",
    labelColor: "rgba(255,255,255,0.55)",
    requiredStar: "#f87171",
    sectionLabel: "rgba(255,255,255,0.40)",
    sectionLine: "rgba(255,255,255,0.06)",
    sectionIconBg: "rgba(255,255,255,0.05)",
    errorBg: "rgba(239,68,68,0.08)",
    errorBorder: "rgba(239,68,68,0.18)",
    errorText: "#fca5a5",
    errorInline: "#f87171",
    btnGhostBg: "rgba(255,255,255,0.06)",
    btnGhostBorder: "rgba(255,255,255,0.08)",
    btnGhostHover: "rgba(255,255,255,0.10)",
    btnGhostText: "#ffffff",
    btnSolidBg: "#ffffff",
    btnSolidText: "#000000",
    btnSolidDisabled: "rgba(255,255,255,0.30)",
    reviewBg: "rgba(255,255,255,0.03)",
    reviewBorder: "rgba(255,255,255,0.06)",
    reviewRowAlt: "rgba(255,255,255,0.02)",
    reviewKey: "rgba(255,255,255,0.50)",
    reviewVal: "#ffffff",
    reviewSectionBg: "rgba(255,255,255,0.02)",
    reviewSectionText: "rgba(255,255,255,0.40)",
    reviewSectionLine: "rgba(255,255,255,0.06)",
    doneBg: "rgba(255,255,255,0.03)",
    doneAccent: "#818cf8",
    hintColor: "rgba(255,255,255,0.35)",
    subId: "rgba(255,255,255,0.30)",
    loadingDot: "#818cf8",
    acc: "#818cf8",
    accG: "linear-gradient(135deg,#6366f1,#818cf8)",
    headerShadow: "0 0 40px rgba(99,102,241,0.08)",
    emptyIconBg: "rgba(99,102,241,0.12)",
    emptyIconGlow: "rgba(99,102,241,0.06)",
    draftBadgeBg: "rgba(251,191,36,0.12)",
    draftBadgeText: "#fbbf24",
    lastAddedBg: "rgba(34,197,94,0.08)",
    lastAddedBorder: "rgba(34,197,94,0.15)",
    lastAddedText: "rgba(34,197,94,0.80)",
    lastAddedName: "#4ade80",
    dropBg: "rgba(12,12,20,0.98)",
    dropBorder: "rgba(255,255,255,0.10)",
    dropShadow: "0 8px 32px rgba(0,0,0,0.50)",
    dropItemText: "rgba(255,255,255,0.85)",
    dropItemHover: "rgba(255,255,255,0.08)",
    dropItemActive: "rgba(99,102,241,0.15)",
    dropSearchBg: "rgba(255,255,255,0.06)",
    dropSearchBorder: "rgba(255,255,255,0.10)",
    dropSearchText: "#ffffff",
    dropSearchPlaceholder: "rgba(255,255,255,0.30)",
    dropEmpty: "rgba(255,255,255,0.25)",
    noteBg: "rgba(255,255,255,0.04)",
    noteBorder: "rgba(255,255,255,0.08)",
    noteText: "#ffffff",
    notePlaceholder: "rgba(255,255,255,0.25)",
    toggleTrackOff: "rgba(255,255,255,0.12)",
    toggleTrackOn: "#22c55e",
    toggleThumb: "#ffffff",
    toggleThumbShadow: "0 1px 3px rgba(0,0,0,0.3)",
    triNeutralBg: "rgba(255,255,255,0.04)",
    triNeutralBorder: "rgba(255,255,255,0.08)",
    triNeutralText: "rgba(255,255,255,0.45)",
    triNeutralDot: "rgba(255,255,255,0.15)",
    triYesBg: "rgba(34,197,94,0.08)",
    triYesBorder: "rgba(34,197,94,0.20)",
    triYesText: "#4ade80",
    triNoBg: "rgba(239,68,68,0.06)",
    triNoBorder: "rgba(239,68,68,0.15)",
    triNoText: "rgba(248,113,113,0.80)",
    triExpandBg: "rgba(255,255,255,0.02)",
    triExpandBorder: "rgba(255,255,255,0.05)",
    triSubLabel: "rgba(255,255,255,0.40)",
    triIcon: "rgba(255,255,255,0.35)",
    triPillBg: "rgba(255,255,255,0.06)",
    triPillBorder: "rgba(255,255,255,0.10)",
    triPillActiveBg: "rgba(255,255,255,0.10)",
  },
  light: {
    page: "#f4f4f8",
    cardBg: "rgba(255,255,255,0.70)",
    cardBorder: "rgba(0,0,0,0.06)",
    inputBg: "rgba(0,0,0,0.03)",
    inputBorder: "rgba(0,0,0,0.10)",
    inputBorderFocus: "rgba(161,98,7,0.55)",
    inputText: "#0f172a",
    inputPlaceholder: "rgba(15,23,42,0.30)",
    inputFocusRing: "rgba(161,98,7,0.15)",
    inputDisabledBg: "rgba(0,0,0,0.02)",
    inputDisabledText: "rgba(15,23,42,0.30)",
    t1: "#0f172a",
    t2: "rgba(15,23,42,0.58)",
    t3: "rgba(15,23,42,0.32)",
    labelColor: "rgba(15,23,42,0.55)",
    requiredStar: "#dc2626",
    sectionLabel: "rgba(15,23,42,0.40)",
    sectionLine: "rgba(0,0,0,0.06)",
    sectionIconBg: "rgba(0,0,0,0.03)",
    errorBg: "rgba(220,38,38,0.05)",
    errorBorder: "rgba(220,38,38,0.12)",
    errorText: "#dc2626",
    errorInline: "#dc2626",
    btnGhostBg: "rgba(0,0,0,0.03)",
    btnGhostBorder: "rgba(0,0,0,0.08)",
    btnGhostHover: "rgba(0,0,0,0.06)",
    btnGhostText: "#0f172a",
    btnSolidBg: "#0f172a",
    btnSolidText: "#ffffff",
    btnSolidDisabled: "rgba(15,23,42,0.30)",
    reviewBg: "rgba(0,0,0,0.02)",
    reviewBorder: "rgba(0,0,0,0.06)",
    reviewRowAlt: "rgba(0,0,0,0.02)",
    reviewKey: "rgba(15,23,42,0.50)",
    reviewVal: "#0f172a",
    reviewSectionBg: "rgba(0,0,0,0.02)",
    reviewSectionText: "rgba(15,23,42,0.40)",
    reviewSectionLine: "rgba(0,0,0,0.06)",
    doneBg: "rgba(0,0,0,0.02)",
    doneAccent: "#a16207",
    hintColor: "rgba(15,23,42,0.35)",
    subId: "rgba(15,23,42,0.25)",
    loadingDot: "#a16207",
    acc: "#a16207",
    accG: "linear-gradient(135deg,#a16207,#ca8a04)",
    headerShadow: "0 0 40px rgba(161,98,7,0.06)",
    emptyIconBg: "rgba(161,98,7,0.09)",
    emptyIconGlow: "rgba(161,98,7,0.04)",
    draftBadgeBg: "rgba(161,98,7,0.10)",
    draftBadgeText: "#92400e",
    lastAddedBg: "rgba(22,163,74,0.06)",
    lastAddedBorder: "rgba(22,163,74,0.12)",
    lastAddedText: "rgba(22,163,74,0.75)",
    lastAddedName: "#15803d",
    dropBg: "rgba(255,255,255,0.99)",
    dropBorder: "rgba(0,0,0,0.10)",
    dropShadow: "0 8px 32px rgba(0,0,0,0.12)",
    dropItemText: "rgba(15,23,42,0.80)",
    dropItemHover: "rgba(0,0,0,0.04)",
    dropItemActive: "rgba(161,98,7,0.08)",
    dropSearchBg: "rgba(0,0,0,0.03)",
    dropSearchBorder: "rgba(0,0,0,0.08)",
    dropSearchText: "#0f172a",
    dropSearchPlaceholder: "rgba(15,23,42,0.30)",
    dropEmpty: "rgba(15,23,42,0.30)",
    noteBg: "rgba(0,0,0,0.02)",
    noteBorder: "rgba(0,0,0,0.06)",
    noteText: "#0f172a",
    notePlaceholder: "rgba(15,23,42,0.25)",
    toggleTrackOff: "rgba(0,0,0,0.12)",
    toggleTrackOn: "#16a34a",
    toggleThumb: "#ffffff",
    toggleThumbShadow: "0 1px 3px rgba(0,0,0,0.15)",
    triNeutralBg: "rgba(0,0,0,0.02)",
    triNeutralBorder: "rgba(0,0,0,0.06)",
    triNeutralText: "rgba(15,23,42,0.40)",
    triNeutralDot: "rgba(0,0,0,0.10)",
    triYesBg: "rgba(22,163,74,0.06)",
    triYesBorder: "rgba(22,163,74,0.15)",
    triYesText: "#15803d",
    triNoBg: "rgba(220,38,38,0.04)",
    triNoBorder: "rgba(220,38,38,0.10)",
    triNoText: "#dc2626",
    triExpandBg: "rgba(0,0,0,0.015)",
    triExpandBorder: "rgba(0,0,0,0.04)",
    triSubLabel: "rgba(15,23,42,0.40)",
    triIcon: "rgba(15,23,42,0.30)",
    triPillBg: "rgba(0,0,0,0.03)",
    triPillBorder: "rgba(0,0,0,0.08)",
    triPillActiveBg: "rgba(0,0,0,0.06)",
  },
};

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function makeSubmissionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function uniqStrings(arr) {
  const out = [], seen = new Set();
  for (const x of arr || []) {
    const s = String(x || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function hasMeaningfulDraft(form) {
  if (!form) return false;
  return Boolean(
    String(form.name || "").trim() || String(form.age || "").trim() ||
    String(form.gender || "").trim() || String(form.country || "").trim() ||
    String(form.state || "").trim() || String(form.stateOther || "").trim() ||
    String(form.city || "").trim() || String(form.cityOther || "").trim() ||
    String(form.occupation || "").trim() ||
    String(form.approver || "").trim() || String(form.maritalStatus || "").trim() ||
    String(form.familyPermissionRelation || "").trim() ||
    String(form.familyPermissionOther || "").trim() ||
    String(form.note || "").trim() ||
    String(form.petNote || "").trim() ||
    String(form.guruNote || "").trim() ||
    String(form.nashaNote || "").trim() ||
    String(form.dikshaYear || "").trim() ||
    String(form.vrindavanVisits || "").trim() || String(form.firstDikshaYear || "").trim() ||
    form.onionGarlic === true || form.onionGarlic === false ||
    form.hasPet === true || form.hasPet === false ||
    form.hadTeacherBefore === true || form.hadTeacherBefore === false ||
    form.nasha === true || form.nasha === false
  );
}

function timeAgo(dateStr) {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch { return ""; }
}

function loadLastAdded() {
  try {
    const raw = localStorage.getItem(LAST_ADDED_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveLastAdded(name, rollNo) {
  try {
    localStorage.setItem(LAST_ADDED_KEY, JSON.stringify({
      name, rollNo, time: new Date().toISOString(),
    }));
  } catch {}
}

/* ═══════════════════════════════════════════════
   CACHE
   ═══════════════════════════════════════════════ */

const _cache = { countries: null, states: {}, cities: {} };

async function loadCountries() {
  if (_cache.countries) return _cache.countries;
  try {
    const stored = sessionStorage.getItem("sb_countries");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 10) { _cache.countries = parsed; return parsed; }
    }
  } catch {}
  try {
    const res = await fetch("https://restcountries.com/v3.1/all");
    const data = await res.json().catch(() => []);
    const list = (data || [])
      .map((co) => ({ name: co?.name?.common, flag: co?.flag || "", code: co?.cca2 || co?.name?.common }))
      .filter((x) => x.name)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (list.length) {
      _cache.countries = list;
      try { sessionStorage.setItem("sb_countries", JSON.stringify(list)); } catch {}
      return list;
    }
  } catch {}
  _cache.countries = COUNTRIES_FALLBACK;
  return COUNTRIES_FALLBACK;
}

async function loadStates(country) {
  if (!country) return [];
  const ck = country.toLowerCase();
  if (_cache.states[ck]) return _cache.states[ck];
  if (country === "India") {
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: "India" }),
      });
      const data = await res.json().catch(() => ({}));
      const st = uniqStrings((data?.data?.states || []).map((s) => s.name).filter(Boolean));
      if (st.length) { _cache.states[ck] = st; return st; }
    } catch {}
    _cache.states[ck] = INDIA_STATES_FALLBACK;
    return INDIA_STATES_FALLBACK;
  }
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country }),
    });
    const data = await res.json().catch(() => ({}));
    const st = uniqStrings((data?.data?.states || []).map((s) => s?.name).filter(Boolean));
    if (st.length) { _cache.states[ck] = st; return st; }
  } catch {}
  const fb = STATES_BACKUP[country] || [];
  if (fb.length) _cache.states[ck] = fb;
  return fb;
}

async function loadCities(country, state) {
  if (!country || !state || state === "__OTHER__") return [];
  const ck = `${country}__${state}`.toLowerCase();
  if (_cache.cities[ck]) return _cache.cities[ck];
  try {
    const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ country, state }),
    });
    const data = await res.json().catch(() => ({}));
    const ci = uniqStrings(data?.data || []).sort((a, b) => a.localeCompare(b));
    if (ci.length) { _cache.cities[ck] = ci; return ci; }
  } catch {}
  return [];
}

/* ═══════════════════════════════════════════════
   DEBOUNCE HOOK
   ═══════════════════════════════════════════════ */

function useDebouncedEffect(fn, deps, delay = 500) {
  const timer = useRef(null);
  useEffect(() => {
    timer.current = setTimeout(fn, delay);
    return () => clearTimeout(timer.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════ */

function SectionHeader({ icon, label, c }) {
  return (
    <div className="sm:col-span-2 flex items-center gap-3 mt-6 max-md:mt-5 mb-2 max-md:mb-1.5">
      <div
        className="w-8 h-8 max-md:w-7 max-md:h-7 rounded-xl max-md:rounded-lg flex items-center justify-center text-base max-md:text-sm flex-shrink-0"
        style={{ background: c.sectionIconBg }}
      >
        {icon}
      </div>
      <span className="text-[11px] max-md:text-[10px] font-bold uppercase tracking-widest" style={{ color: c.sectionLabel }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: c.sectionLine }} />
    </div>
  );
}

function Field({ label, value, onChange, required, placeholder, type = "text", error, c, disabled, hint }) {
  return (
    <div>
      <div className="flex items-center gap-3 max-md:flex-col max-md:items-stretch max-md:gap-1">
        <div
          className="text-[12px] max-md:text-[11px] font-semibold flex items-center gap-1 min-w-[130px] max-md:min-w-0 flex-shrink-0"
          style={{ color: c.labelColor }}
        >
          {label}
          {required && <span style={{ color: c.requiredStar }}>*</span>}
        </div>
        <input
          value={value}
          type={type}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
          style={{
            background: disabled ? c.inputDisabledBg : c.inputBg,
            borderColor: error ? c.errorInline : c.inputBorder,
            color: disabled ? c.inputDisabledText : c.inputText,
            transition: "border-color .15s,box-shadow .15s",
          }}
          onFocusCapture={(e) => {
            if (!disabled) {
              e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`;
              e.currentTarget.style.borderColor = c.inputBorderFocus;
            }
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = error ? c.errorInline : c.inputBorder;
          }}
        />
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1 ml-[142px] max-md:ml-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill={c.errorInline} className="flex-shrink-0">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.5v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z"/>
          </svg>
          <span className="text-[11px] max-md:text-[10px] font-medium" style={{ color: c.errorInline }}>{error}</span>
        </div>
      )}
      {hint && !error && (
        <div className="text-[10px] max-md:text-[9px] mt-1 ml-[142px] max-md:ml-0" style={{ color: c.hintColor }}>{hint}</div>
      )}
    </div>
  );
}

/* ── Input + Suggestion (reusable for Occupation, Marital, Approver) ── */
function SuggestField({ label, value, onChange, suggestions, c, placeholder, required, error }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const filtered = useMemo(() => {
    const v = (value || "").toLowerCase();
    const list = v ? suggestions.filter((s) => String(s).toLowerCase().includes(v)) : suggestions;
    return list.slice(0, 20);
  }, [value, suggestions]);

  return (
    <div>
      <div className="flex items-center gap-3 max-md:flex-col max-md:items-stretch max-md:gap-1">
        <div
          className="text-[12px] max-md:text-[11px] font-semibold flex items-center gap-1 min-w-[130px] max-md:min-w-0 flex-shrink-0"
          style={{ color: c.labelColor }}
        >
          {label}
          {required && <span style={{ color: c.requiredStar }}>*</span>}
        </div>
        <div className="relative flex-1 w-full" ref={wrapRef}>
          <input
            value={value}
            onChange={(e) => { onChange(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder={placeholder}
            className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
            style={{
              background: c.inputBg,
              borderColor: error ? c.errorInline : c.inputBorder,
              color: c.inputText,
              transition: "border-color .15s,box-shadow .15s",
            }}
            onFocusCapture={(e) => {
              e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`;
              e.currentTarget.style.borderColor = c.inputBorderFocus;
            }}
            onBlurCapture={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.borderColor = error ? c.errorInline : c.inputBorder;
            }}
          />
          {open && filtered.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1.5 rounded-2xl max-md:rounded-xl border overflow-hidden max-h-48 max-md:max-h-40 overflow-y-auto overscroll-contain will-change-transform"
              style={{
                background: c.dropBg,
                borderColor: c.dropBorder,
                boxShadow: c.dropShadow,
                zIndex: 9999,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              {filtered.map((s, idx) => (
                <button
                  key={`${s}_${idx}`}
                  type="button"
                  onMouseDown={() => { onChange(String(s)); setOpen(false); }}
                  className="w-full text-left px-4 max-md:px-3 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] font-medium"
                  style={{ color: c.dropItemText, transition: "background .1s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = c.dropItemHover; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1 ml-[142px] max-md:ml-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill={c.errorInline} className="flex-shrink-0">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.5v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z"/>
          </svg>
          <span className="text-[11px] max-md:text-[10px] font-medium" style={{ color: c.errorInline }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function SearchableSelect({ label, value, onChange, options, required, c, disabled, error, placeholder = "Search..." }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options || [];
    return (options || []).filter((o) => {
      const text = typeof o === "object" ? (o.label || o.name || "") : String(o);
      return text.toLowerCase().includes(q);
    });
  }, [search, options]);

  const displayValue = useMemo(() => {
    if (!value) return "";
    if (typeof options?.[0] === "object") {
      const found = (options || []).find((o) => o.value === value || o.name === value);
      return found?.label || found?.name || value;
    }
    return value;
  }, [value, options]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  return (
    <div>
      <div className="flex items-center gap-3 max-md:flex-col max-md:items-stretch max-md:gap-1">
        <div
          className="text-[12px] max-md:text-[11px] font-semibold flex items-center gap-1 min-w-[130px] max-md:min-w-0 flex-shrink-0"
          style={{ color: c.labelColor }}
        >
          {label}
          {required && <span style={{ color: c.requiredStar }}>*</span>}
        </div>

        <div className="relative flex-1 w-full" ref={wrapRef}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => { if (!disabled) { setOpen(!open); setSearch(""); } }}
            className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] text-left outline-none flex items-center justify-between gap-2 will-change-transform"
            style={{
              background: disabled ? c.inputDisabledBg : c.inputBg,
              borderColor: open ? c.inputBorderFocus : error ? c.errorInline : c.inputBorder,
              color: displayValue ? (disabled ? c.inputDisabledText : c.inputText) : c.inputPlaceholder,
              boxShadow: open ? `0 0 0 3px ${c.inputFocusRing}` : "none",
              transition: "border-color .15s,box-shadow .15s",
            }}
          >
            <span className="truncate">{displayValue || "Select..."}</span>
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none"
              className="flex-shrink-0"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .15s" }}
            >
              <path d="M4 6l4 4 4-4" stroke={c.t3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {open && (
            <div
              className="absolute left-0 right-0 mt-1.5 rounded-2xl max-md:rounded-xl border overflow-hidden will-change-transform"
              style={{
                background: c.dropBg,
                borderColor: c.dropBorder,
                boxShadow: c.dropShadow,
                zIndex: 9999,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <div className="p-2 max-md:p-1.5" style={{ borderBottom: `1px solid ${c.dropBorder}` }}>
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2 max-md:py-1.5 text-[12px] max-md:text-[11px] outline-none"
                  style={{
                    background: c.dropSearchBg,
                    borderColor: c.dropSearchBorder,
                    color: c.dropSearchText,
                    transition: "box-shadow .15s",
                  }}
                  onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${c.inputFocusRing}`; }}
                  onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>

              <div className="max-h-48 max-md:max-h-40 overflow-y-auto overscroll-contain">
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-[12px] text-center" style={{ color: c.dropEmpty }}>
                    No results found
                  </div>
                )}
                {filtered.map((item, idx) => {
                  const val = typeof item === "object" ? (item.value || item.name) : item;
                  const lbl = typeof item === "object" ? (item.label || item.name) : item;
                  const isActive = val === value;
                  return (
                    <button
                      key={`${val}_${idx}`}
                      type="button"
                      onClick={() => { onChange(val); setOpen(false); setSearch(""); }}
                      className="w-full text-left px-4 max-md:px-3 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] font-medium flex items-center justify-between"
                      style={{
                        color: isActive ? c.acc : c.dropItemText,
                        background: isActive ? c.dropItemActive : "transparent",
                        transition: "background .1s",
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = c.dropItemHover; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span>{lbl}</span>
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill={c.acc}>
                          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1 ml-[142px] max-md:ml-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill={c.errorInline} className="flex-shrink-0">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.5v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z"/>
          </svg>
          <span className="text-[11px] max-md:text-[10px] font-medium" style={{ color: c.errorInline }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function NativeSelect({ label, value, onChange, c, children, required, error, disabled }) {
  return (
    <div>
      <div className="flex items-center gap-3 max-md:flex-col max-md:items-stretch max-md:gap-1">
        <div
          className="text-[12px] max-md:text-[11px] font-semibold flex items-center gap-1 min-w-[130px] max-md:min-w-0 flex-shrink-0"
          style={{ color: c.labelColor }}
        >
          {label}
          {required && <span style={{ color: c.requiredStar }}>*</span>}
        </div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="flex-1 w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none appearance-none will-change-transform"
          style={{
            background: disabled ? c.inputDisabledBg : c.inputBg,
            borderColor: error ? c.errorInline : c.inputBorder,
            color: disabled ? c.inputDisabledText : c.inputText,
            transition: "border-color .15s,box-shadow .15s",
          }}
          onFocusCapture={(e) => {
            if (!disabled) { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }
          }}
          onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = error ? c.errorInline : c.inputBorder; }}
        >
          {children}
        </select>
      </div>
      {error && (
        <div className="flex items-center gap-1.5 mt-1 ml-[142px] max-md:ml-0">
          <svg width="12" height="12" viewBox="0 0 16 16" fill={c.errorInline} className="flex-shrink-0">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.5v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z"/>
          </svg>
          <span className="text-[11px] max-md:text-[10px] font-medium" style={{ color: c.errorInline }}>{error}</span>
        </div>
      )}
    </div>
  );
}

function TriStateCard({ icon, label, value, onChange, expandContent, c }) {
  const isYes = value === true;
  const isNo = value === false;
  const isNeutral = value === null || value === undefined;

  // REVERSED: Yes gets red colors, No gets green colors
  const bgColor = isYes ? c.triNoBg : isNo ? c.triYesBg : c.triNeutralBg;
  const borderColor = isYes ? c.triNoBorder : isNo ? c.triYesBorder : c.triNeutralBorder;
  const textColor = isYes ? c.triNoText : isNo ? c.triYesText : c.triNeutralText;

  return (
    <div
      className="rounded-2xl max-md:rounded-xl border overflow-hidden will-change-transform"
      style={{ background: bgColor, borderColor, transition: "background .15s,border-color .15s" }}
    >
      <div className="flex items-center gap-3 max-md:gap-2.5 px-4 max-md:px-3 py-3.5 max-md:py-3">
        <span className="text-lg max-md:text-base flex-shrink-0">{icon}</span>

        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] max-md:text-[11.5px] font-semibold leading-tight" style={{ color: textColor }}>
            {label}
          </div>
          <div
            className="text-[10px] max-md:text-[9px] font-medium mt-0.5"
            style={{
              color: isYes ? c.triNoText : isNo ? c.triYesText : c.hintColor,
              opacity: isNeutral ? 0.6 : 0.8,
            }}
          >
            {isYes ? "✗ Yes" : isNo ? "✓ No" : "Not selected"}
          </div>
        </div>

        <div
          className="flex rounded-xl max-md:rounded-lg overflow-hidden border flex-shrink-0"
          style={{ borderColor: c.triPillBorder, background: c.triPillBg }}
        >
          <button
            type="button"
            onClick={() => onChange(false)}
            className="px-3 max-md:px-2.5 py-1.5 max-md:py-1 text-[11px] max-md:text-[10px] font-bold active:scale-95"
            style={{
              background: isNo ? c.triYesBg : "transparent",
              color: isNo ? c.triYesText : c.triIcon,
              borderRight: `1px solid ${c.triPillBorder}`,
              boxShadow: isNo ? `inset 0 0 0 1.5px ${c.triYesBorder}` : "none",
              transition: "all .12s",
            }}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="px-3 max-md:px-2.5 py-1.5 max-md:py-1 text-[11px] max-md:text-[10px] font-bold active:scale-95"
            style={{
              background: isNeutral ? c.triPillActiveBg : "transparent",
              color: isNeutral ? c.triNeutralText : c.triIcon,
              borderRight: `1px solid ${c.triPillBorder}`,
              boxShadow: isNeutral ? `inset 0 0 0 1.5px ${c.triNeutralBorder}` : "none",
              transition: "all .12s",
            }}
          >
            —
          </button>
          <button
            type="button"
            onClick={() => onChange(true)}
            className="px-3 max-md:px-2.5 py-1.5 max-md:py-1 text-[11px] max-md:text-[10px] font-bold active:scale-95"
            style={{
              background: isYes ? c.triNoBg : "transparent",
              color: isYes ? c.triNoText : c.triIcon,
              boxShadow: isYes ? `inset 0 0 0 1.5px ${c.triNoBorder}` : "none",
              transition: "all .12s",
            }}
          >
            Yes
          </button>
        </div>

        <div
          className="w-2.5 h-2.5 max-md:w-2 max-md:h-2 rounded-full flex-shrink-0"
          style={{
            background: isYes ? c.triNoText : isNo ? c.triYesText : c.triNeutralDot,
            transition: "background .15s",
          }}
        />
      </div>

      {isYes && expandContent && (
        <div
          className="px-4 max-md:px-3 pb-4 max-md:pb-3 pt-1"
          style={{
            borderTop: `1px solid ${c.triExpandBorder}`,
            background: c.triExpandBg,
          }}
        >
          {expandContent}
        </div>
      )}
    </div>
  );
}

function SuggestInputInline({ value, onChange, suggestions, placeholder, c }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const filtered = useMemo(() => {
    const v = (value || "").toLowerCase();
    const list = v ? suggestions.filter((s) => String(s).toLowerCase().includes(v)) : suggestions;
    return list.slice(0, 20);
  }, [value, suggestions]);

  return (
    <div className="relative" ref={wrapRef}>
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full rounded-xl max-md:rounded-lg border px-3.5 max-md:px-3 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
        style={{
          background: c.inputBg, borderColor: c.inputBorder, color: c.inputText,
          transition: "border-color .15s,box-shadow .15s",
        }}
        onFocusCapture={(e) => {
          e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`;
          e.currentTarget.style.borderColor = c.inputBorderFocus;
        }}
        onBlurCapture={(e) => {
          e.currentTarget.style.boxShadow = "none";
          e.currentTarget.style.borderColor = c.inputBorder;
        }}
      />
      {open && filtered.length > 0 && (
        <div
          className="absolute mt-1.5 w-full rounded-xl max-md:rounded-lg border overflow-hidden max-h-44 overflow-y-auto overscroll-contain will-change-transform"
          style={{
            background: c.dropBg,
            borderColor: c.dropBorder,
            boxShadow: c.dropShadow,
            zIndex: 9999,
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {filtered.map((s, idx) => (
            <button
              key={`${s}_${idx}`}
              type="button"
              onMouseDown={() => { onChange(String(s)); setOpen(false); }}
              className="w-full text-left px-3.5 max-md:px-3 py-2 max-md:py-1.5 text-[11px] max-md:text-[10px] font-medium"
              style={{ color: c.dropItemText, transition: "background .1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.dropItemHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ErrorBanner({ message, c }) {
  if (!message) return null;
  return (
    <div
      className="mb-4 max-md:mb-3 rounded-2xl max-md:rounded-xl border px-4 max-md:px-3 py-3 max-md:py-2.5 text-[13px] max-md:text-[12px] font-medium flex items-center gap-2"
      style={{ background: c.errorBg, borderColor: c.errorBorder, color: c.errorText }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill={c.errorText} className="flex-shrink-0">
        <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 4.5v4a.75.75 0 01-1.5 0v-4a.75.75 0 011.5 0z"/>
      </svg>
      {message}
    </div>
  );
}

function LoadingSpinner({ c, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="animate-spin" style={{ color: c.loadingDot }}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function ReviewSectionHeader({ icon, label, c }) {
  return (
    <div className="flex items-center gap-2.5 px-4 max-md:px-3 py-3 max-md:py-2.5" style={{ background: c.reviewSectionBg }}>
      <span className="text-sm max-md:text-xs">{icon}</span>
      <span className="text-[10px] max-md:text-[9px] font-bold uppercase tracking-widest" style={{ color: c.reviewSectionText }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: c.reviewSectionLine }} />
    </div>
  );
}

function ReviewLine({ k, v, c, alt }) {
  return (
    <div
      className="flex items-start justify-between gap-3 max-md:gap-2 px-4 max-md:px-3 py-2.5 max-md:py-2"
      style={{ background: alt ? c.reviewRowAlt : "transparent" }}
    >
      <div className="text-[12px] max-md:text-[11px] font-medium flex-shrink-0" style={{ color: c.reviewKey }}>{k}</div>
      <div className="text-[12px] max-md:text-[11px] font-semibold text-right break-words max-w-[60%]" style={{ color: c.reviewVal }}>
        {String(v ?? "").trim() || "—"}
      </div>
    </div>
  );
}

function EntryCard({ onStart, onResume, hasDraft, lastAdded, c }) {
  return (
    <div className="flex flex-col items-center justify-center py-6 max-md:py-4">
      <div
        className="w-full max-w-md rounded-3xl max-md:rounded-2xl border p-8 max-md:p-5 text-center"
        style={{ background: c.cardBg, borderColor: c.cardBorder, boxShadow: c.headerShadow, transition: "box-shadow .2s" }}
      >
        <div className="flex justify-center mb-4 max-md:mb-3">
          <div className="relative">
            <div className="w-16 h-16 max-md:w-14 max-md:h-14 rounded-2xl max-md:rounded-xl flex items-center justify-center text-3xl max-md:text-2xl"
              style={{ background: c.emptyIconBg }}>➕</div>
            <div className="absolute -inset-2 rounded-3xl -z-10" style={{ background: c.emptyIconGlow }} />
          </div>
        </div>
        <h3 className="text-lg max-md:text-base font-bold" style={{ color: c.t1 }}>Add Asprirant</h3>
        <p className="text-[13px] max-md:text-[11px] mt-1" style={{ color: c.t3 }}>Manual entry → Saved in Recent (Today DB)</p>

        {hasDraft && (
          <div className="inline-flex items-center gap-1.5 mt-3 max-md:mt-2.5 px-3 py-1 rounded-full text-[11px] max-md:text-[10px] font-bold"
            style={{ background: c.draftBadgeBg, color: c.draftBadgeText }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: c.draftBadgeText }} />
            Unsaved draft found
          </div>
        )}

        <div className="mt-5 max-md:mt-4 flex flex-col gap-2">
          {hasDraft ? (
            <>
              <button type="button" onClick={onResume}
                className="w-full py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold text-white active:scale-[0.98]"
                style={{ background: c.accG, boxShadow: c.headerShadow, transition: "transform .1s" }}>Resume Draft →</button>
              <button type="button" onClick={onStart}
                className="w-full py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-semibold border active:scale-[0.98]"
                style={{ background: c.btnGhostBg, borderColor: c.btnGhostBorder, color: c.btnGhostText, transition: "transform .1s" }}>Start Fresh</button>
            </>
          ) : (
            <button type="button" onClick={onStart}
              className="w-full py-3.5 max-md:py-3 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold text-white active:scale-[0.98]"
              style={{ background: c.accG, boxShadow: c.headerShadow, transition: "transform .1s" }}>+ Start Adding</button>
          )}
        </div>
      </div>

      {lastAdded && (
        <div className="mt-4 max-md:mt-3 w-full max-w-md rounded-2xl max-md:rounded-xl border px-4 max-md:px-3 py-3 max-md:py-2.5 flex items-center gap-3 max-md:gap-2.5"
          style={{ background: c.lastAddedBg, borderColor: c.lastAddedBorder }}>
          <div className="w-8 h-8 max-md:w-7 max-md:h-7 rounded-full flex items-center justify-center text-sm max-md:text-xs"
            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>✓</div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] max-md:text-[11px] font-bold truncate" style={{ color: c.lastAddedName }}>{lastAdded.name}</div>
            <div className="text-[10px] max-md:text-[9px]" style={{ color: c.lastAddedText }}>
              Roll #{lastAdded.rollNo || "—"} • {timeAgo(lastAdded.time)}
            </div>
          </div>
          <div className="text-[10px] max-md:text-[9px] font-semibold flex-shrink-0" style={{ color: c.lastAddedText }}>Last Added</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function AddCustomer({ session }) {
  const username = session?.username || "UNKNOWN";
  const themeApi = useTheme();
  const isLight = themeApi?.theme === "light";
  const c = isLight ? AC.light : AC.dark;

  const [manualOpen, setManualOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);

  const [submissionId, setSubmissionId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [apiError, setApiError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [doneInfo, setDoneInfo] = useState({ rollNo: null });
  const [lastAdded, setLastAdded] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);

  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [stateLoading, setStateLoading] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);

  const [form, setForm] = useState({
    name: "", age: "", gender: "OTHER", occupation: "",
    approver: "", maritalStatus: "",
    country: "India", state: "", stateOther: "", city: "", cityOther: "",
    dikshaYear: "", vrindavanVisits: "", firstDikshaYear: "",
    familyPermissionRelation: "", familyPermissionOther: "",
    onionGarlic: null, onionGarlicNote: "",
    hasPet: null, petNote: "",
    hadTeacherBefore: null, guruNote: "",
    nasha: null, nashaNote: "",
    note: "",
  });

  const upd = useCallback((key, val) => {
    setForm((p) => ({ ...p, [key]: val }));
    setFieldErrors((p) => ({ ...p, [key]: "" }));
  }, []);

  const computedAddress = useMemo(() => {
    const co = String(form.country || "India").trim();
    const s = form.state === "__OTHER__" ? String(form.stateOther || "").trim() : String(form.state || "").trim();
    const ci = form.city === "__OTHER__" ? String(form.cityOther || "").trim() : String(form.city || "").trim();
    return [ci, s, co].filter(Boolean).join(", ");
  }, [form.country, form.state, form.stateOther, form.city, form.cityOther]);

  useEffect(() => { setLastAdded(loadLastAdded()); }, []);

  useEffect(() => {
    try {
      const raw2 = localStorage.getItem(DRAFT_KEY_V2);
      const raw1 = localStorage.getItem(DRAFT_KEY_V1);
      const raw = raw2 || raw1;
      if (!raw) { setHasDraft(false); return; }
      const d = JSON.parse(raw);
      if (d?.form && typeof d.form === "object" && hasMeaningfulDraft(d.form)) {
        setForm((prev) => ({
          ...prev, ...d.form,
          country: d.form.country || prev.country || "India",
          note: d.form.note || "",
          petNote: d.form.petNote || "",
          guruNote: d.form.guruNote || "",
          nashaNote: d.form.nashaNote || "",
          onionGarlic: d.form.onionGarlic ?? null,
          hasPet: d.form.hasPet ?? null,
          hadTeacherBefore: d.form.hadTeacherBefore ?? null,
          nasha: d.form.nasha ?? null,
        }));
        if (d?.submissionId) setSubmissionId(String(d.submissionId));
        setHasDraft(true);
      }
      if (raw1) { try { localStorage.removeItem(DRAFT_KEY_V1); } catch {} }
    } catch { setHasDraft(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useDebouncedEffect(() => {
    try {
      if (!submissionId && !hasMeaningfulDraft(form)) { localStorage.removeItem(DRAFT_KEY_V2); return; }
      localStorage.setItem(DRAFT_KEY_V2, JSON.stringify({
        submissionId: submissionId || null, form, updatedAt: new Date().toISOString(),
      }));
    } catch {}
  }, [form, submissionId], 500);

  useEffect(() => {
    let alive = true;
    (async () => {
      setCountriesLoading(true);
      try { const list = await loadCountries(); if (alive) setCountries(list); }
      catch { if (alive) setCountries(COUNTRIES_FALLBACK); }
      finally { if (alive) setCountriesLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const country = String(form.country || "").trim();
      if (!country) { setStates([]); return; }
      setStateLoading(true);
      try { const st = await loadStates(country); if (alive) setStates(uniqStrings(st)); }
      finally { if (alive) setStateLoading(false); }
    })();
    return () => { alive = false; };
  }, [form.country]);

  useEffect(() => {
    if (!form.state || form.state === "__OTHER__" || !states.length) return;
    if (states.includes(form.state)) return;
    setForm((p) => ({ ...p, state: "__OTHER__", stateOther: p.stateOther || p.state, city: "__OTHER__", cityOther: p.cityOther || p.city || "" }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const country = String(form.country || "").trim();
      const state = String(form.state || "").trim();
      if (!country || !state || state === "__OTHER__") { setCities([]); return; }
      setCityLoading(true);
      try { const list = await loadCities(country, state); if (alive) setCities(uniqStrings(list)); }
      finally { if (alive) setCityLoading(false); }
    })();
    return () => { alive = false; };
  }, [form.country, form.state]);

  useEffect(() => {
    if (!form.city || form.city === "__OTHER__" || !cities.length) return;
    if (cities.includes(form.city)) return;
    setForm((p) => ({ ...p, city: "__OTHER__", cityOther: p.cityOther || p.city }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cities]);

  const { requestCommit, CommitModal } = useCommitGate({
    defaultSuggestions: ["Created profile (manual)", "New customer entry", "Customer submitted basic details"],
  });

  function validate() {
    const errs = {};
    const name = String(form.name || "").trim();
    const age = String(form.age || "").trim();
    const country = String(form.country || "").trim();
    const state = form.state === "__OTHER__" ? String(form.stateOther || "").trim() : String(form.state || "").trim();
    const city = form.city === "__OTHER__" ? String(form.cityOther || "").trim() : String(form.city || "").trim();

    if (!name) errs.name = "Name required";
    else if (name.length < 2) errs.name = "Min 2 characters";
    if (!age) errs.age = "Age required";
    else { const n = parseInt(age, 10); if (isNaN(n) || n < 1 || n > 150) errs.age = "Age must be 1-150"; }
    if (!country) errs.country = "Country required";
    if (!state) errs.state = "State required";
    if (!city) errs.city = "City required";

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const canGoConfirm = useMemo(() => {
    const nameOk = String(form.name || "").trim().length >= 2;
    const ageStr = String(form.age || "").trim();
    const ageNum = parseInt(ageStr, 10);
    const ageOk = ageStr && !isNaN(ageNum) && ageNum >= 1 && ageNum <= 150;
    const countryOk = String(form.country || "").trim();
    const stateOk = form.state === "__OTHER__" ? String(form.stateOther || "").trim() : String(form.state || "").trim();
    const cityOk = form.city === "__OTHER__" ? String(form.cityOther || "").trim() : String(form.city || "").trim();
    return Boolean(nameOk && ageOk && countryOk && stateOk && cityOk);
  }, [form]);

  function resetAll() {
    setApiError(""); setFieldErrors({}); setDoneInfo({ rollNo: null });
    setSubmissionId(""); setSubmitting(false); setHasDraft(false);
    setForm({
      name: "", age: "", gender: "OTHER", occupation: "",
      approver: "", maritalStatus: "",
      country: "India", state: "", stateOther: "", city: "", cityOther: "",
      dikshaYear: "", vrindavanVisits: "", firstDikshaYear: "",
      familyPermissionRelation: "", familyPermissionOther: "",
      onionGarlic: null, onionGarlicNote: "", hasPet: null, petNote: "",
      hadTeacherBefore: null, guruNote: "",
      nasha: null, nashaNote: "",
      note: "",
    });
    try { localStorage.removeItem(DRAFT_KEY_V2); } catch {}
  }

  function openFresh() {
    resetAll();
    const sid = makeSubmissionId();
    setSubmissionId(sid);
    setManualOpen(true);
  }

  function openResumeDraft() {
    if (!submissionId) setSubmissionId(makeSubmissionId());
    setApiError(""); setFieldErrors({});
    setManualOpen(true);
  }

  async function submitFinal() {
    setApiError("");
    if (submitting) return;
    if (!validate()) { setConfirmOpen(false); return; }

    const commitMessage = await requestCommit({
      title: "Submit Customer",
      subtitle: "Customer will be created in Recent (Today DB).",
      preset: "Created profile (manual)",
    }).catch(() => null);
    if (!commitMessage) return;

    const stateFinal = form.state === "__OTHER__" ? String(form.stateOther || "").trim() : String(form.state || "").trim();
    const cityFinal = form.city === "__OTHER__" ? String(form.cityOther || "").trim() : String(form.city || "").trim();

    setSubmitting(true);
    try {
      const res = await fetch("/api/customers/today", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId, commitMessage,
          name: form.name, age: form.age, gender: form.gender,
          country: form.country, state: stateFinal, city: cityFinal,
         occupation: form.occupation,
          approver: form.approver, maritalStatus: form.maritalStatus,
          dikshaYear: form.dikshaYear, vrindavanVisits: form.vrindavanVisits,
          firstDikshaYear: form.firstDikshaYear,
          familyPermission: Boolean(form.familyPermissionRelation),
          familyPermissionRelation: form.familyPermissionRelation,
          familyPermissionOther: form.familyPermissionRelation === "other" ? form.familyPermissionOther : "",
          remarksBy: username,
          onionGarlic: form.onionGarlic === true,
          onionGarlicNote: form.onionGarlic === true ? String(form.onionGarlicNote || "").trim() : "",
          hasPet: form.hasPet === true,
          petNote: form.hasPet === true ? String(form.petNote || "").trim() : "",
          hadTeacherBefore: form.hadTeacherBefore === true,
          guruNote: form.hadTeacherBefore === true ? String(form.guruNote || "").trim() : "",
          nasha: form.nasha === true,
          nashaNote: form.nasha === true ? String(form.nashaNote || "").trim() : "",
          note: String(form.note || "").trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setSubmitting(false); setApiError(data.error || "Submit failed"); return; }

      saveLastAdded(form.name, data.rollNo);
      setLastAdded({ name: form.name, rollNo: data.rollNo, time: new Date().toISOString() });
      setDoneInfo({ rollNo: data.rollNo || null });
      setConfirmOpen(false); setManualOpen(false); setDoneOpen(true); setSubmitting(false);
    } catch {
      setSubmitting(false);
      setApiError("Network error — check internet");
    }
  }

  function triDisplay(val, note) {
    if (val === null || val === undefined) return "Not Answered";
    if (val === true) return `YES${note ? ` — ${note}` : ""}`;
    return "NO";
  }

  /* ═══════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════ */

  return (
    <div>
      {!manualOpen && !doneOpen && (
        <EntryCard onStart={openFresh} onResume={openResumeDraft} hasDraft={hasDraft} lastAdded={lastAdded} c={c} />
      )}

      {/* ═══ FORM MODAL ═══ */}
      <LayerModal
        open={manualOpen}
        layerName="Manual Form"
        title="Manual Entry"
        sub="Fill details → Confirm"
        onClose={() => setManualOpen(false)}
        maxWidth="max-w-5xl"
        disableBackdropClose
      >
        <ErrorBanner message={apiError} c={c} />

        <div className="space-y-3 max-md:space-y-2.5">

          {/* ── Personal ── */}
          <SectionHeader icon="👤" label="Personal Information" c={c} />

          <Field label="Name" required value={form.name} onChange={(v) => upd("name", v)}
            error={fieldErrors.name} c={c} placeholder="Full name..." />

          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Field label="Age" required value={form.age} onChange={(v) => upd("age", v)}
              error={fieldErrors.age} c={c} placeholder="e.g. 28" type="number" />

            <NativeSelect label="Gender" value={form.gender} onChange={(v) => upd("gender", v)} c={c}>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
              <option value="OTHER">OTHER</option>
            </NativeSelect>
          </div>

          <SuggestField label="Occupation" value={form.occupation} onChange={(v) => upd("occupation", v)}
            suggestions={OCCUPATION_SUGGESTIONS} c={c} placeholder="Type occupation..." />

          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <SuggestField label="Marital Status" value={form.maritalStatus}
              onChange={(v) => upd("maritalStatus", v)} suggestions={MARITAL_SUGGESTIONS}
              c={c} placeholder="Type status..." />

            <SuggestField label="Reffred" value={form.approver}
              onChange={(v) => upd("approver", v)} suggestions={APPROVER_SUGGESTIONS}
              c={c} placeholder="Type approver name..." />
          </div>

          {/* ── Address ── */}
          <SectionHeader icon="📍" label="Address" c={c} />

          <SearchableSelect
            label="Country" required value={form.country}
            error={fieldErrors.country} c={c}
            disabled={countriesLoading}
            placeholder="Search country..."
            options={countriesLoading ? [] : [
              { value: "India", label: "🇮🇳 India (Default)" },
              ...countries.filter((x) => x.name !== "India").map((co) => ({
                value: co.name, label: `${co.flag ? co.flag + " " : ""}${co.name}`,
              })),
            ]}
            onChange={(v) => {
              setForm((p) => ({ ...p, country: v, state: "", stateOther: "", city: "", cityOther: "" }));
              setFieldErrors((p) => ({ ...p, country: "" }));
            }}
          />

          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <div>
              <SearchableSelect
                label="State" required value={form.state}
                error={fieldErrors.state} c={c}
                disabled={!form.country || stateLoading}
                placeholder="Search state..."
                options={[
                  ...states.map((s) => ({ value: s, label: s })),
                  { value: "__OTHER__", label: "✏️ Enter Manually" },
                ]}
                onChange={(v) => {
                  if (v === "__OTHER__") {
                    setForm((p) => ({ ...p, state: "__OTHER__", stateOther: p.stateOther || "", city: "__OTHER__", cityOther: "" }));
                  } else {
                    setForm((p) => ({ ...p, state: v, stateOther: "", city: "", cityOther: "" }));
                  }
                  setFieldErrors((p) => ({ ...p, state: "" }));
                }}
              />
              {stateLoading && (
                <div className="flex items-center gap-2 mt-1.5 ml-[142px] max-md:ml-0">
                  <LoadingSpinner c={c} size={14} />
                  <span className="text-[10px] max-md:text-[9px]" style={{ color: c.hintColor }}>Loading states...</span>
                </div>
              )}
              {form.state === "__OTHER__" && (
                <div className="mt-2 ml-[142px] max-md:ml-0">
                  <input value={form.stateOther}
                    onChange={(e) => { upd("stateOther", e.target.value); setFieldErrors((p) => ({ ...p, state: "" })); }}
                    placeholder="Type state name..."
                    className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                    onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                    onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
                  />
                </div>
              )}
            </div>

            <div>
              <SearchableSelect
                label="City" required value={form.city}
                error={fieldErrors.city} c={c}
                disabled={!form.state || form.state === "__OTHER__" || cityLoading}
                placeholder="Search city..."
                options={[
                  ...cities.map((ci) => ({ value: ci, label: ci })),
                  { value: "__OTHER__", label: "✏️ Other" },
                ]}
                onChange={(v) => { upd("city", v); upd("cityOther", ""); }}
              />
              {cityLoading && (
                <div className="flex items-center gap-2 mt-1.5 ml-[142px] max-md:ml-0">
                  <LoadingSpinner c={c} size={14} />
                  <span className="text-[10px] max-md:text-[9px]" style={{ color: c.hintColor }}>Loading cities...</span>
                </div>
              )}
              {(form.state === "__OTHER__" || form.city === "__OTHER__") && (
                <div className="mt-2 ml-[142px] max-md:ml-0">
                  <input value={form.cityOther}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, city: "__OTHER__", cityOther: e.target.value }));
                      setFieldErrors((p) => ({ ...p, city: "" }));
                    }}
                    placeholder="Type city name..."
                    className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                    onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                    onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-2">
            <div className="text-[10px] max-md:text-[9px] flex items-center gap-2 ml-[142px] max-md:ml-0" style={{ color: c.hintColor }}>
              📫 Computed: <span className="font-semibold" style={{ color: c.t2 }}>{computedAddress || "—"}</span>
            </div>
          </div>

          {/* ── Diksha ── */}
          <SectionHeader icon="🙏" label="Diksha Information" c={c} />

          <Field label="सत्संग श्रवण" value={form.dikshaYear}
            onChange={(v) => upd("dikshaYear", v)} c={c} placeholder="e.g. 2020" />

          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Field label="वृंदावन कितनी बार आये" value={form.vrindavanVisits}
              onChange={(v) => upd("vrindavanVisits", v)} c={c} placeholder="e.g. 5" />

            <Field label="दीक्षा प्रथम उपस्थिति" value={form.firstDikshaYear}
              onChange={(v) => upd("firstDikshaYear", v)} c={c} placeholder="e.g. 2021" />
          </div>

          {/* ── Family ── */}
          <SectionHeader icon="👨‍👩‍👧" label="Family & Permissions" c={c} />

          <SearchableSelect label="Family Permission" value={form.familyPermissionRelation}
            onChange={(v) => {
              setForm((p) => ({
                ...p, familyPermissionRelation: v,
                familyPermissionOther: v === "other" ? p.familyPermissionOther : "",
              }));
            }} options={FAMILY_OPTIONS} c={c} placeholder="Search..." />
          {form.familyPermissionRelation === "other" && (
            <div className="ml-[142px] max-md:ml-0">
              <input value={form.familyPermissionOther}
                onChange={(e) => upd("familyPermissionOther", e.target.value)}
                placeholder="Other (type here)..."
                className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
                style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
              />
            </div>
          )}

          {/* ── Lifestyle ── */}
          <SectionHeader icon="⚡" label="Lifestyle Questions" c={c} />

          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">

            <TriStateCard
              icon="🧅"
              label="Onion / Garlic?"
              value={form.onionGarlic}
              onChange={(v) => { upd("onionGarlic", v); if (v !== true) upd("onionGarlicNote", ""); }}
              c={c}
              expandContent={
                <div>
                  <div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel }}>
                    Details <span style={{ color: c.hintColor }}>(optional)</span>
                  </div>
                  <input
                    value={form.onionGarlicNote || ""}
                    onChange={(e) => upd("onionGarlicNote", e.target.value)}
                    placeholder="e.g. Only onion, Both, Garlic only..."
                    className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                    onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                    onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
                  />
                </div>
              }
            />

            <TriStateCard
              icon="🐾"
              label="Has Pet?"
              value={form.hasPet}
              onChange={(v) => { upd("hasPet", v); if (v !== true) upd("petNote", ""); }}
              c={c}
              expandContent={
                <div>
                  <div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel }}>
                    Which animal / pet?
                  </div>
                  <SuggestInputInline
                    value={form.petNote}
                    onChange={(v) => upd("petNote", v)}
                    suggestions={PET_SUGGESTIONS}
                    placeholder="e.g. Dog, Cat, Brids, Fish, etc....."
                    c={c}
                  />
                </div>
              }
            />

            <TriStateCard
              icon="🙏"
              label="Have before GuruDev?"
              value={form.hadTeacherBefore}
              onChange={(v) => { upd("hadTeacherBefore", v); if (v !== true) upd("guruNote", ""); }}
              c={c}
              expandContent={
                <div>
                  <div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel }}>
                    Details <span style={{ color: c.hintColor }}>(optional)</span>
                  </div>
                  <input
                    value={form.guruNote}
                    onChange={(e) => upd("guruNote", e.target.value)}
                    placeholder="Previous guru/teacher details..."
                    className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                    onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                    onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
                  />
                </div>
              }
            />

            <TriStateCard
              icon="🚬"
              label="Kya Nasha Karte Ho?"
              value={form.nasha}
              onChange={(v) => { upd("nasha", v); if (v !== true) upd("nashaNote", ""); }}
              c={c}
              expandContent={
                <div>
                  <div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel }}>
                    Details <span style={{ color: c.hintColor }}>(optional)</span>
                  </div>
                  <input
                    value={form.nashaNote}
                    onChange={(e) => upd("nashaNote", e.target.value)}
                    placeholder="Type of nasha..."
                    className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
                    style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                    onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                    onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
                  />
                </div>
              }
            />
          </div>

          {/* ── Note ── */}
          <SectionHeader icon="📝" label="Note" c={c} />

          <div>
            <div className="flex items-start gap-3 max-md:flex-col max-md:items-stretch max-md:gap-1">
              <div className="text-[12px] max-md:text-[11px] font-semibold min-w-[130px] max-md:min-w-0 flex-shrink-0 pt-3 max-md:pt-0"
                style={{ color: c.labelColor }}>
                Note <span style={{ color: c.hintColor, fontWeight: 400 }}>(optional)</span>
              </div>
              <textarea
                value={form.note}
                onChange={(e) => upd("note", e.target.value)}
                placeholder="Any additional notes about this Asprirant..."
                rows={3}
                className="flex-1 w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none resize-none will-change-transform"
                style={{ background: c.noteBg, borderColor: c.noteBorder, color: c.noteText, transition: "border-color .15s,box-shadow .15s" }}
                onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.noteBorder; }}
              />
            </div>
            <div className="text-[10px] max-md:text-[9px] mt-1 ml-[142px] max-md:ml-0" style={{ color: c.hintColor }}>
              Free text — saved with record.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 max-md:mt-4 flex gap-3 max-md:gap-2">
          <button type="button" onClick={() => setManualOpen(false)}
            className="flex-1 px-4 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-semibold border active:scale-[0.98]"
            style={{ background: c.btnGhostBg, borderColor: c.btnGhostBorder, color: c.btnGhostText, transition: "transform .1s" }}>Close</button>
          <button type="button" disabled={!canGoConfirm}
            onClick={() => { setApiError(""); if (!validate()) return; setConfirmOpen(true); }}
            className="flex-1 px-4 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold disabled:opacity-40 active:scale-[0.98]"
            style={{ background: c.btnSolidBg, color: c.btnSolidText, transition: "transform .1s" }}>Confirm →</button>
        </div>

        <div className="mt-3 max-md:mt-2 text-[10px] max-md:text-[9px]" style={{ color: c.hintColor }}>
          ✓ Draft auto-saved. Close safely — data is safe.
        </div>
      </LayerModal>

      {/* ═══ CONFIRM ═══ */}
      <LayerModal open={confirmOpen} layerName="Confirm" title="Confirm Customer"
        sub="Review → Submit" onClose={() => setConfirmOpen(false)}
        maxWidth="max-w-3xl" disableBackdropClose
      >
        <ErrorBanner message={apiError} c={c} />
        <div className="rounded-3xl max-md:rounded-2xl border overflow-hidden"
          style={{ background: c.reviewBg, borderColor: c.reviewBorder }}>
          <ReviewSectionHeader icon="👤" label="Personal Information" c={c} />
          <ReviewLine k="Name" v={form.name} c={c} alt={false} />
          <ReviewLine k="Age" v={form.age} c={c} alt />
          <ReviewLine k="Gender" v={form.gender} c={c} alt={false} />
          <ReviewLine k="Occupation" v={form.occupation} c={c} alt />
          <ReviewLine k="Marital Status" v={form.maritalStatus} c={c} alt={false} />
          <ReviewLine k="Approver" v={form.approver} c={c} alt />

          <ReviewSectionHeader icon="📍" label="Address" c={c} />
          <ReviewLine k="Address" v={computedAddress} c={c} alt={false} />

          <ReviewSectionHeader icon="🙏" label="Diksha Information" c={c} />
          <ReviewLine k="Diksha Year" v={form.dikshaYear} c={c} alt={false} />
          <ReviewLine k="Vrindavan Visits" v={form.vrindavanVisits} c={c} alt />
          <ReviewLine k="First Diksha Year" v={form.firstDikshaYear} c={c} alt={false} />

          <ReviewSectionHeader icon="👨‍👩‍👧" label="Family & Permissions" c={c} />
          <ReviewLine k="Family Permission" v={form.familyPermissionRelation || "—"} c={c} alt={false} />
          {form.familyPermissionRelation === "other" && (
            <ReviewLine k="Family Other" v={form.familyPermissionOther} c={c} alt />
          )}

          <ReviewSectionHeader icon="⚡" label="Lifestyle Questions" c={c} />
          <ReviewLine k="🧅 Onion/Garlic" v={triDisplay(form.onionGarlic, form.onionGarlicNote)} c={c} alt={false} />
          <ReviewLine k="🐾 Has Pet" v={triDisplay(form.hasPet, form.petNote)} c={c} alt />
          <ReviewLine k="🙏 Before GuruDev" v={triDisplay(form.hadTeacherBefore, form.guruNote)} c={c} alt={false} />
          <ReviewLine k="🚬 Nasha" v={triDisplay(form.nasha, form.nashaNote)} c={c} alt />

          {String(form.note || "").trim() && (
            <>
              <ReviewSectionHeader icon="📝" label="Note" c={c} />
              <div className="px-4 max-md:px-3 py-3 max-md:py-2">
                <div className="text-[12px] max-md:text-[11px] whitespace-pre-wrap rounded-xl max-md:rounded-lg p-3 max-md:p-2.5"
                  style={{ background: c.reviewRowAlt, color: c.reviewVal, border: `1px solid ${c.reviewBorder}` }}>{form.note}</div>
              </div>
            </>
          )}
        </div>

        <div className="mt-5 max-md:mt-3 flex gap-3 max-md:gap-2">
          <button type="button" onClick={() => setConfirmOpen(false)}
            className="flex-1 px-4 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-semibold border active:scale-[0.98]"
            style={{ background: c.btnGhostBg, borderColor: c.btnGhostBorder, color: c.btnGhostText, transition: "transform .1s" }}>← Edit</button>
          <button type="button" onClick={submitFinal} disabled={submitting}
            className="flex-1 px-4 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{ background: c.btnSolidBg, color: c.btnSolidText, transition: "transform .1s" }}>
            {submitting ? (<><LoadingSpinner c={{ loadingDot: c.btnSolidText }} size={16} /> Submitting...</>) : "Submit (Commit)"}
          </button>
        </div>
      </LayerModal>

      {/* ═══ DONE ═══ */}
      <LayerModal open={doneOpen} layerName="Done" title="Customer Added"
        sub="Saved in Recent (Today DB)"
        onClose={() => { setDoneOpen(false); resetAll(); }}
        maxWidth="max-w-2xl" disableBackdropClose
      >
        <div className="rounded-3xl max-md:rounded-2xl border p-8 max-md:p-5 text-center"
          style={{ background: c.doneBg, borderColor: c.cardBorder }}>
          <div className="w-16 h-16 max-md:w-14 max-md:h-14 rounded-full mx-auto flex items-center justify-center mb-4 max-md:mb-3"
            style={{ background: c.accG }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="max-md:w-6 max-md:h-6">
              <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="text-2xl max-md:text-xl font-black" style={{ color: c.t1 }}>Done!</div>
          <div className="text-[13px] max-md:text-[12px] mt-1" style={{ color: c.t3 }}>Customer created successfully.</div>
          <div className="mt-5 max-md:mt-4 rounded-2xl max-md:rounded-xl border p-5 max-md:p-4 inline-block min-w-[140px]"
            style={{ background: c.inputBg, borderColor: c.cardBorder }}>
            <div className="text-[10px] max-md:text-[9px] font-bold uppercase tracking-widest" style={{ color: c.t3 }}>Roll No</div>
            <div className="text-4xl max-md:text-3xl font-black mt-1" style={{ color: c.doneAccent }}>{doneInfo.rollNo || "—"}</div>
          </div>
          <div className="mt-6 max-md:mt-4">
            <button type="button" onClick={() => { setDoneOpen(false); resetAll(); }}
              className="px-8 max-md:px-6 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold active:scale-[0.98]"
              style={{ background: c.btnSolidBg, color: c.btnSolidText, transition: "transform .1s" }}>Close</button>
          </div>
        </div>
      </LayerModal>

      {CommitModal}
    </div>
  );
}
