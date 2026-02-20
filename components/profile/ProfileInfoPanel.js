// components/profile/ProfileInfoPanel.js
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { SectionHeader, Field, Select, Toggle, ErrorBanner, LoadingSpinner } from "./ProfileSubComponents";

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

const OCCUPATION_SUGGESTIONS = [
  "Business","Private Job","Government Job","House Wife","ShopKeeper",
  "Freelancer","Student","Teacher","Doctor","Engineer","Farmer",
  "Retired","Self Employed","Daily Wage","Driver","Lawyer",
  "Accountant","Nurse","Electrician","Plumber","Tailor",
  "Mechanic","Painter","Carpenter","Chef","Security Guard",
  "Clerk","Manager","Director","Consultant","Architect",
  "Pharmacist","Journalist","Photographer","Designer",
  "Software Developer","Data Entry","Bank Employee",
  "Police","Army","Navy","Air Force","Priest","Pandit",
  "Sadhu","Sevadaar","NGO Worker","Social Worker",
  "Real Estate","Insurance Agent","CA","CS","MBA",
  "Contractor","Transporter","Wholesaler","Retailer",
  "Import Export","Factory Worker","Labour","Unemployed","Other",
];
const MARITAL = ["married","unmarried","divorce","widow","virakt","separated"];
const APPROVERS = [
  "Albeli baba","sundari baba","sahachari baba","pyari sharan baba",
  "garbeli baba","mahaMadhuri baba","navalNagri baba",
  "permRasdaini baba","navalKishori baba",
];
const FAMILY_OPTIONS = ["mother","father","mother&father","husband","wife","other"];

const PET_SUGGESTIONS = [
  "Dog","Cat","Parrot","Cow","Buffalo","Goat","Fish",
  "Rabbit","Hamster","Turtle","Horse","Pigeon","Hen",
  "Duck","Peacock","Monkey","Snake","Lizard","Other",
];

const COUNTRY_CODES = [
  { code: "+91", label: "🇮🇳 +91", country: "India" },
  { code: "+1", label: "🇺🇸 +1", country: "US/Canada" },
  { code: "+44", label: "🇬🇧 +44", country: "UK" },
  { code: "+61", label: "🇦🇺 +61", country: "Australia" },
  { code: "+971", label: "🇦🇪 +971", country: "UAE" },
  { code: "+966", label: "🇸🇦 +966", country: "Saudi" },
  { code: "+965", label: "🇰🇼 +965", country: "Kuwait" },
  { code: "+968", label: "🇴🇲 +968", country: "Oman" },
  { code: "+974", label: "🇶🇦 +974", country: "Qatar" },
  { code: "+973", label: "🇧🇭 +973", country: "Bahrain" },
  { code: "+977", label: "🇳🇵 +977", country: "Nepal" },
  { code: "+880", label: "🇧🇩 +880", country: "Bangladesh" },
  { code: "+94", label: "🇱🇰 +94", country: "Sri Lanka" },
  { code: "+60", label: "🇲🇾 +60", country: "Malaysia" },
  { code: "+65", label: "🇸🇬 +65", country: "Singapore" },
  { code: "+49", label: "🇩🇪 +49", country: "Germany" },
  { code: "+33", label: "🇫🇷 +33", country: "France" },
  { code: "+39", label: "🇮🇹 +39", country: "Italy" },
  { code: "+81", label: "🇯🇵 +81", country: "Japan" },
  { code: "+86", label: "🇨🇳 +86", country: "China" },
  { code: "+82", label: "🇰🇷 +82", country: "S. Korea" },
  { code: "+7", label: "🇷🇺 +7", country: "Russia" },
  { code: "+55", label: "🇧🇷 +55", country: "Brazil" },
  { code: "+27", label: "🇿🇦 +27", country: "S. Africa" },
  { code: "+234", label: "🇳🇬 +234", country: "Nigeria" },
  { code: "+254", label: "🇰🇪 +254", country: "Kenya" },
  { code: "+63", label: "🇵🇭 +63", country: "Philippines" },
  { code: "+62", label: "🇮🇩 +62", country: "Indonesia" },
  { code: "+66", label: "🇹🇭 +66", country: "Thailand" },
  { code: "+84", label: "🇻🇳 +84", country: "Vietnam" },
  { code: "+52", label: "🇲🇽 +52", country: "Mexico" },
  { code: "+90", label: "🇹🇷 +90", country: "Turkey" },
  { code: "+48", label: "🇵🇱 +48", country: "Poland" },
  { code: "+31", label: "🇳🇱 +31", country: "Netherlands" },
  { code: "+46", label: "🇸🇪 +46", country: "Sweden" },
  { code: "+47", label: "🇳🇴 +47", country: "Norway" },
  { code: "+45", label: "🇩🇰 +45", country: "Denmark" },
  { code: "+41", label: "🇨🇭 +41", country: "Switzerland" },
  { code: "+34", label: "🇪🇸 +34", country: "Spain" },
  { code: "+351", label: "🇵🇹 +351", country: "Portugal" },
];

const STAGGER = 40;

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

function formatAadhaar(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) parts.push(digits.slice(i, i + 4));
  return parts.join(" ");
}

function isAadhaarValid(raw) {
  return String(raw || "").replace(/\D/g, "").length === 12;
}

function isPhoneValid(num) {
  const digits = String(num || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function phoneDisplay(code, num) {
  const c = String(code || "").trim();
  const n = String(num || "").trim();
  if (!n) return null;
  return c ? `${c} ${n}` : n;
}

function idDisplay(type, value, typeName) {
  const v = String(value || "").trim();
  if (!v) return null;
  const t = type === "aadhaar" ? "Aadhaar" : type === "passport" ? "Passport" : String(typeName || type || "ID").trim();
  return `${t}: ${v}`;
}

function triReadDisplay(val, note) {
  if (val === null || val === undefined) return null;
  if (val === true) return `Yes${note ? ` — ${note}` : ""}`;
  return "No";
}

/* ═══════════════════════════════════════════════
   COLLAPSIBLE SECTION
   ═══════════════════════════════════════════════ */

function CollapsibleSection({ icon, label, open, onToggle, c, children, badge }) {
  const contentRef = useRef(null);
  const [measuredH, setMeasuredH] = useState(0);
  const firstRender = useRef(true);

  useEffect(() => { if (contentRef.current) setMeasuredH(contentRef.current.scrollHeight); }, [children, open]);
  useEffect(() => { firstRender.current = false; }, []);

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: c.divider || c.panelBorder }}>
      <button type="button" onClick={onToggle}
        className="w-full flex items-center justify-between py-3 max-md:py-2.5 px-1 text-left active:scale-[0.995]"
        style={{ color: c.t1, transition: "background .15s" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = c.panelHover || "rgba(128,128,128,0.04)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
        <div className="flex items-center gap-2">
          <span className="text-base max-md:text-sm">{icon}</span>
          <span className="text-[12px] max-md:text-[11px] font-bold uppercase tracking-wider" style={{ color: c.sectionLabel || c.t3 }}>{label}</span>
          {badge && <span className="px-1.5 py-0.5 rounded-md text-[8px] max-md:text-[7px] font-bold uppercase tracking-wider" style={{ background: c.acc + "18", color: c.acc }}>{badge}</span>}
        </div>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="flex-shrink-0"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .3s cubic-bezier(0.22,1,0.36,1)" }}>
          <path d="M4 6l4 4 4-4" stroke={c.t3} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div ref={contentRef} className="overflow-hidden"
        style={{ maxHeight: open ? `${measuredH + 60}px` : "0px", opacity: open ? 1 : 0,
          transition: firstRender.current ? "none" : "max-height 0.35s cubic-bezier(0.22,1,0.36,1), opacity 0.25s ease" }}>
        <div className="pb-3 max-md:pb-2.5 px-1">{children}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   READ ROW
   ═══════════════════════════════════════════════ */

function ReadRow({ k, v, c, copyable, idx = 0, icon, mono }) {
  const [copied, setCopied] = useState(false);
  const display = String(v ?? "").trim();
  if (!display || display === "undefined") return null;

  const handleCopy = () => {
    if (!copyable || !display) return;
    navigator.clipboard?.writeText(display).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div className="flex items-start justify-between gap-3 max-md:gap-2 py-2 max-md:py-1.5 rounded-xl max-md:rounded-lg px-2.5 max-md:px-2 will-change-transform"
      style={{ cursor: copyable ? "pointer" : "default", opacity: 0,
        animation: `profileFadeUp 0.3s ease-out ${idx * STAGGER}ms forwards`,
        transition: "background .15s, transform .2s cubic-bezier(0.22,1,0.36,1)" }}
      onClick={copyable ? handleCopy : undefined}
      onMouseEnter={(e) => { e.currentTarget.style.background = c.panelHover || "rgba(128,128,128,0.04)"; e.currentTarget.style.transform = "translateX(4px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateX(0)"; }}>
      <div className="flex items-center gap-1.5 shrink-0">
        {icon && <span className="text-[11px] max-md:text-[10px]">{icon}</span>}
        <span className="text-[12px] max-md:text-[11px] font-medium" style={{ color: c.t3 }}>{k}</span>
      </div>
      <div className={`text-[12px] max-md:text-[11px] font-semibold text-right break-words max-w-[65%] flex items-center gap-1.5 ${mono ? "font-mono tracking-wider" : ""}`}
        style={{ color: c.t1 }}>
        {display}
        {copyable && <span className="text-[10px]" style={{ color: copied ? c.acc : c.t4, transform: copied ? "scale(1.2)" : "scale(1)", transition: "all .2s" }}>{copied ? "✓" : "📋"}</span>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   OCCUPATION FIELD
   ═══════════════════════════════════════════════ */

function OccupationField({ value, onChange, c }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const filtered = useMemo(() => {
    const v = (value || "").toLowerCase();
    return v ? OCCUPATION_SUGGESTIONS.filter((s) => s.toLowerCase().includes(v)).slice(0, 20) : OCCUPATION_SUGGESTIONS;
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <div className="text-[11px] max-md:text-[10px] font-semibold mb-1.5 max-md:mb-1" style={{ color: c.labelColor }}>Occupation</div>
      <input value={value || ""} onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} placeholder="Type occupation..."
        className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
        style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
        onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
        onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute mt-1.5 w-full rounded-2xl max-md:rounded-xl border overflow-hidden max-h-44 overflow-y-auto overscroll-contain will-change-transform"
          style={{ background: c.dropBg || c.panelBg, borderColor: c.dropBorder || c.inputBorder,
            boxShadow: c.dropShadow || "0 8px 32px rgba(0,0,0,0.20)", zIndex: 9999, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          {filtered.map((s, idx) => (
            <button key={`${s}_${idx}`} type="button" onMouseDown={() => { onChange(s); setOpen(false); }}
              className="w-full text-left px-4 max-md:px-3 py-2 max-md:py-1.5 text-[12px] max-md:text-[11px] font-medium"
              style={{ color: c.dropItemText || c.t2, transition: "background .1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.dropItemHover || "rgba(128,128,128,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function SuggestInputInline({ value, onChange, suggestions, placeholder, c }) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const v = (value || "").toLowerCase();
    return v ? suggestions.filter((s) => s.toLowerCase().includes(v)).slice(0, 15) : suggestions;
  }, [value, suggestions]);

  return (
    <div className="relative">
      <input value={value || ""} onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder={placeholder}
        className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
        style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
        onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
        onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute mt-1 w-full rounded-xl border overflow-hidden max-h-36 overflow-y-auto overscroll-contain will-change-transform"
          style={{ background: c.dropBg || c.panelBg, borderColor: c.dropBorder || c.inputBorder, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", zIndex: 9999 }}>
          {filtered.map((s, idx) => (
            <button key={`${s}_${idx}`} type="button" onMouseDown={() => { onChange(s); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-[11px] font-medium"
              style={{ color: c.dropItemText || c.t2, transition: "background .1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.dropItemHover || "rgba(128,128,128,0.06)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TRI-STATE TOGGLE (REVERSED COLORS)
   ═══════════════════════════════════════════════ */

function TriToggle({ icon, label, value, onChange, expandContent, c }) {
  const isYes = value === true; const isNo = value === false; const isNeutral = value === null || value === undefined;

  // REVERSED: Yes gets red/no colors, No gets green/yes colors
  const bgColor = isYes ? (c.triNoBg || "rgba(239,68,68,0.06)") : isNo ? (c.triYesBg || "rgba(34,197,94,0.08)") : (c.triNeutralBg || "rgba(128,128,128,0.04)");
  const borderColor = isYes ? (c.triNoBorder || "rgba(239,68,68,0.15)") : isNo ? (c.triYesBorder || "rgba(34,197,94,0.20)") : (c.triNeutralBorder || c.inputBorder);
  const textColor = isYes ? (c.triNoText || "#f87171") : isNo ? (c.triYesText || "#4ade80") : (c.triNeutralText || c.t3);
  const pillBg = c.triPillBg || "rgba(128,128,128,0.06)"; const pillBorder = c.triPillBorder || c.inputBorder; const pillIcon = c.triIcon || c.t3;

  return (
    <div className="rounded-2xl max-md:rounded-xl border overflow-hidden will-change-transform"
      style={{ background: bgColor, borderColor, transition: "background .15s,border-color .15s" }}>
      <div className="flex items-center gap-2.5 max-md:gap-2 px-3.5 max-md:px-3 py-3 max-md:py-2.5">
        <span className="text-base max-md:text-sm flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] max-md:text-[11px] font-semibold leading-tight" style={{ color: textColor }}>{label}</div>
          <div className="text-[9.5px] max-md:text-[8.5px] font-medium mt-0.5" style={{ color: textColor, opacity: isNeutral ? 0.5 : 0.7 }}>
            {isYes ? "✗ Yes" : isNo ? "✓ No" : "Not selected"}</div>
        </div>
        <div className="flex rounded-xl max-md:rounded-lg overflow-hidden border flex-shrink-0" style={{ borderColor: pillBorder, background: pillBg }}>
          {[{ v: false, l: "No", bg: c.triYesBg, cl: c.triYesText, bd: c.triYesBorder },
            { v: null, l: "—", bg: c.triPillActiveBg, cl: c.triNeutralText, bd: c.triNeutralBorder },
            { v: true, l: "Yes", bg: c.triNoBg, cl: c.triNoText, bd: c.triNoBorder }].map((btn, i) => {
            const active = value === btn.v || (btn.v === null && isNeutral);
            return (
              <button key={i} type="button" onClick={() => onChange(btn.v)}
                className="px-2.5 max-md:px-2 py-1.5 max-md:py-1 text-[10px] max-md:text-[9px] font-bold active:scale-95"
                style={{
                  background: active ? (btn.bg || "rgba(128,128,128,0.08)") : "transparent",
                  color: active ? (btn.cl || c.t3) : pillIcon,
                  borderRight: i < 2 ? `1px solid ${pillBorder}` : "none",
                  boxShadow: active ? `inset 0 0 0 1px ${btn.bd || c.inputBorder}` : "none",
                  transition: "all .12s",
                }}>{btn.l}</button>
            );
          })}
        </div>
        <div className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: isYes ? (c.triNoText || "#f87171") : isNo ? (c.triYesText || "#4ade80") : (c.triNeutralDot || "rgba(128,128,128,0.15)"), transition: "background .15s" }} />
      </div>
      {isYes && expandContent && (
        <div className="px-3.5 max-md:px-3 pb-3 max-md:pb-2.5 pt-1"
          style={{ borderTop: `1px solid ${c.triExpandBorder || c.inputBorder}`, background: c.triExpandBg || "rgba(128,128,128,0.02)" }}>
          {expandContent}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   STAT PILL
   ═══════════════════════════════════════════════ */

function StatPill({ icon, label, value, c }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-2.5 max-md:px-2 py-1.5 max-md:py-1 rounded-xl max-md:rounded-lg"
      style={{ background: c.panelHover || "rgba(128,128,128,0.04)" }}>
      <span className="text-[11px] max-md:text-[10px]">{icon}</span>
      <div>
        <div className="text-[8px] max-md:text-[7px] font-bold uppercase tracking-wider" style={{ color: c.t4 || c.t3 }}>{label}</div>
        <div className="text-[11px] max-md:text-[10px] font-bold leading-tight" style={{ color: c.t1 }}>{value}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COUNTRY CODE DROPDOWN (for edit mode)
   ═══════════════════════════════════════════════ */

function CountryCodeDropdown({ value, onChange, c }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => { if (open && searchRef.current) searchRef.current.focus(); }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter((cc) => cc.code.includes(q) || cc.country.toLowerCase().includes(q));
  }, [search]);

  const currentLabel = useMemo(() => {
    const found = COUNTRY_CODES.find((cc) => cc.code === value);
    return found ? found.label : value || "🇮🇳 +91";
  }, [value]);

  return (
    <div className="relative w-[88px] max-md:w-[78px] flex-shrink-0" ref={ref}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full rounded-xl max-md:rounded-lg border px-2 max-md:px-1.5 py-3 max-md:py-2.5 text-[12px] max-md:text-[11px] font-bold text-center outline-none flex items-center justify-center gap-1 will-change-transform"
        style={{ background: c.inputBg, borderColor: open ? c.inputBorderFocus : c.inputBorder, color: c.inputText,
          boxShadow: open ? `0 0 0 3px ${c.inputFocusRing}` : "none", transition: "border-color .15s, box-shadow .15s" }}>
        <span className="truncate text-[11px] max-md:text-[10px]">{currentLabel}</span>
        <span className="text-[9px] shrink-0" style={{ color: c.t3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</span>
      </button>
      {open && (
        <div className="absolute z-[400] mt-1 w-[220px] max-md:w-[200px] rounded-2xl max-md:rounded-xl border overflow-hidden will-change-transform"
          style={{ background: c.dropBg || c.panelBg, borderColor: c.dropBorder || c.inputBorder,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)", opacity: 0, animation: "profileFadeUp 0.2s ease-out forwards",
            left: 0, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
          <div className="p-2 max-md:p-1.5" style={{ borderBottom: `1px solid ${c.dropBorder || c.inputBorder}` }}>
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code..."
              className="w-full rounded-lg border px-2.5 max-md:px-2 py-1.5 max-md:py-1 text-[11px] max-md:text-[10px] outline-none"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "box-shadow .15s" }}
              onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${c.inputFocusRing}`; }}
              onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }} />
          </div>
          <div className="max-h-48 max-md:max-h-40 overflow-y-auto overscroll-contain">
            {filtered.length === 0 && <div className="px-3 py-2 text-[11px] text-center" style={{ color: c.t3 }}>No results</div>}
            {filtered.map((cc, i) => {
              const isActive = cc.code === value;
              return (
                <button key={`${cc.code}_${i}`} type="button" onClick={() => { onChange(cc.code); setOpen(false); setSearch(""); }}
                  className="w-full text-left px-3 max-md:px-2.5 py-2 max-md:py-1.5 text-[11px] max-md:text-[10px] font-medium flex items-center justify-between gap-2"
                  style={{ color: isActive ? c.acc : (c.dropItemText || c.t2), background: isActive ? (c.acc + "15") : "transparent",
                    fontWeight: isActive ? 700 : 500, transition: "background .1s" }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = c.dropItemHover || "rgba(128,128,128,0.06)"; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                  <span>{cc.label}</span>
                  <span className="text-[9px] max-md:text-[8px]" style={{ color: c.t3 }}>{cc.country}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   PHONE COMBO FIELD (simple, no auto-detect)
   ═══════════════════════════════════════════════ */

function PhoneComboField({ label, required, countryCode, number, onCountryCodeChange, onNumberChange, c, placeholder }) {
  function handleNumberChange(raw) {
    const digits = String(raw || "").replace(/\D/g, "");
    onNumberChange(digits);
  }

  const valid = isPhoneValid(number);

  return (
    <div>
      <div className="text-[11px] max-md:text-[10px] font-semibold mb-1.5 max-md:mb-1 flex items-center gap-1" style={{ color: c.labelColor }}>
        {label} {required && <span style={{ color: c.requiredStar || "#f87171" }}>*</span>}
      </div>
      <div className="flex gap-2 max-md:gap-1.5">
        <CountryCodeDropdown value={countryCode || "+91"} onChange={onCountryCodeChange} c={c} />
        <div className="relative flex-1">
          <input value={number || ""} onChange={(e) => handleNumberChange(e.target.value)} placeholder={placeholder} inputMode="numeric"
            className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] font-mono tracking-wider outline-none will-change-transform"
            style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s, box-shadow .15s" }}
            onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
            onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }}
          />
          {number && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px]"
              style={{ color: valid ? (c.triYesText || "#4ade80") : (c.triNoText || "#f87171") }}>
              {valid ? "✓" : "✗"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   EDIT SELECT DROPDOWN (custom styled)
   ═══════════════════════════════════════════════ */

function EditDropdown({ label, value, onChange, options, required, c, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const displayLabel = useMemo(() => {
    if (!value) return placeholder || "Select...";
    const opt = options.find((o) => (typeof o === "string" ? o : o.value) === value);
    if (!opt) return value;
    return typeof opt === "string" ? opt : opt.label;
  }, [value, options, placeholder]);

  return (
    <div ref={ref} className="relative">
      <div className="text-[11px] max-md:text-[10px] font-semibold mb-1.5 max-md:mb-1 flex items-center gap-1" style={{ color: c.labelColor }}>
        {label} {required && <span style={{ color: c.requiredStar || "#f87171" }}>*</span>}
      </div>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] text-left outline-none flex items-center justify-between gap-2 will-change-transform"
        style={{ background: c.inputBg, borderColor: open ? c.inputBorderFocus : c.inputBorder,
          color: value ? c.inputText : (c.inputPlaceholder || c.t3),
          boxShadow: open ? `0 0 0 3px ${c.inputFocusRing}` : "none", transition: "border-color .15s, box-shadow .15s" }}>
        <span className="truncate">{displayLabel}</span>
        <span className="text-[12px] shrink-0" style={{ color: c.t3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</span>
      </button>
      {open && (
        <div className="absolute z-[300] mt-1 w-full rounded-2xl max-md:rounded-xl border overflow-hidden max-h-52 overflow-y-auto will-change-transform"
          style={{ background: c.dropBg || c.panelBg, borderColor: c.dropBorder || c.inputBorder,
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)", opacity: 0, animation: "profileFadeUp 0.2s ease-out forwards" }}>
          {options.map((opt, i) => {
            const optValue = typeof opt === "string" ? opt : opt.value;
            const optLabel = typeof opt === "string" ? opt : opt.label;
            const isActive = optValue === value;
            return (
              <button key={`${optValue}_${i}`} type="button" onClick={() => { onChange(optValue); setOpen(false); }}
                className="w-full text-left px-4 max-md:px-3 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] font-medium flex items-center justify-between gap-2"
                style={{ color: isActive ? c.acc : (c.dropItemText || c.t2), background: isActive ? (c.acc + "15") : "transparent",
                  fontWeight: isActive ? 700 : 500, transition: "background .1s" }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = c.dropItemHover || "rgba(128,128,128,0.06)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span className="truncate">{optLabel}</span>
                {isActive && <span className="text-[13px] shrink-0" style={{ color: c.acc }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function ProfileInfoPanel({
  customer, form, setForm, editMode, setEditMode,
  source, c, busy, err, onSave, onFinalize,
  fullLoadBusy, fullLoadErr,
  countries, countriesLoading, states, stateLoading, cities, cityLoading,
  stateFinal, cityFinal, computedAddress,
  canFinalizeEdit, fullLoadedRef,
}) {
  const [expandedSections, setExpandedSections] = useState({
    personal: true, address: true, diksha: true, family: true, lifestyle: true, notes: true,
    contact: false, identity: false, guardian: false, familyMember: false,
  });

  const toggleSection = (key) => { setExpandedSections((p) => ({ ...p, [key]: !p[key] })); };

  const upd = useCallback((key, val) => { setForm((p) => ({ ...p, [key]: val })); }, [setForm]);

  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [editMode]);

  const filledCount = useMemo(() => {
    if (!customer) return 0;
    let count = 0;
    ["name","age","gender","occupation","maritalStatus","approver","country","state","city",
      "dikshaYear","vrindavanVisits","firstDikshaYear","familyPermissionRelation","note",
      "phoneNumber","idValue","guardianName","familyMemberName","address2","pinCode"].forEach((f) => {
      if (String(customer[f] || "").trim()) count++;
    });
    [customer?.onionGarlic, customer?.hasPet, customer?.hadTeacherBefore, customer?.nasha].forEach((v) => {
      if (v === true || v === false) count++;
    });
    return count;
  }, [customer]);

  const hasContactData = customer?.phoneNumber || customer?.whatsappNumber;
  const hasIdentityData = customer?.idValue;
  const hasGuardianData = customer?.guardianName;
  const hasFamilyMemberData = customer?.familyMemberName;

  function onAadhaarChange(raw) {
    const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
    upd("idValue", formatAadhaar(digits));
  }

  function copyPhoneToWhatsApp() {
    setForm((p) => ({ ...p, whatsappCountryCode: p.phoneCountryCode || "+91", whatsappNumber: p.phoneNumber || "" }));
  }

  // ═══════════════════════════════════════
  // READ MODE
  // ═══════════════════════════════════════
  if (!editMode) {
    return (
      <div className="rounded-3xl max-md:rounded-2xl border overflow-hidden will-change-transform"
        style={{ background: c.panelBg, borderColor: c.panelBorder,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.03)",
          transform: entered ? "translateY(0)" : "translateY(12px)", opacity: entered ? 1 : 0,
          transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease-out" }}>

        <div className="relative px-5 max-md:px-4 pt-5 max-md:pt-4 pb-4 max-md:pb-3"
          style={{ borderBottom: `1px solid ${c.divider || c.panelBorder}` }}>
          <div className="absolute top-0 left-5 right-5 h-[2px] rounded-full" style={{ background: c.accG || c.acc, opacity: 0.5 }} />
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-[9px] max-md:text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md"
                  style={{ background: c.acc + "15", color: c.acc }}>Profile</div>
                <div className="text-[9px] max-md:text-[8px] font-bold uppercase tracking-wider" style={{ color: c.t4 || c.t3 }}>{filledCount} fields</div>
              </div>
              <div className="text-[16px] max-md:text-[14px] font-black leading-tight" style={{ color: c.t1 }}>{customer?.name || "—"}</div>
              <div className="text-[11px] max-md:text-[10px] font-medium mt-0.5" style={{ color: c.t3 }}>
                {[customer?.age && `${customer.age} yrs`, customer?.gender, customer?.city, customer?.state].filter(Boolean).join(" · ") || "No details"}
              </div>
            </div>
            <button type="button" onClick={() => { setEditMode(true); if (fullLoadedRef) fullLoadedRef.current = false; }}
              className="px-3.5 max-md:px-3 py-2 max-md:py-1.5 rounded-xl max-md:rounded-lg text-[11px] max-md:text-[10px] font-semibold border active:scale-95"
              style={{ background: c.btnGhostBg, borderColor: c.btnGhostBorder, color: c.btnGhostText, transition: "background .15s, transform .1s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = c.btnGhostHover || c.btnGhostBg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = c.btnGhostBg; }}>✏️ Edit</button>
          </div>
          <div className="flex items-center gap-2 mt-3 max-md:mt-2 flex-wrap">
            <StatPill icon="💼" label="Work" value={customer?.occupation} c={c} />
            <StatPill icon="💍" label="Status" value={customer?.maritalStatus} c={c} />
            <StatPill icon="🙏" label="Approver" value={customer?.approver} c={c} />
            {customer?.rollNo && <StatPill icon="🎫" label="Roll" value={customer.rollNo} c={c} />}
          </div>
        </div>

        <div className="px-4 max-md:px-3">
          <CollapsibleSection icon="👤" label="Personal" open={expandedSections.personal} onToggle={() => toggleSection("personal")} c={c}>
            <ReadRow k="Name" v={customer?.name} c={c} idx={0} copyable />
            <ReadRow k="Age" v={customer?.age} c={c} idx={1} />
            <ReadRow k="Gender" v={customer?.gender} c={c} idx={2} />
            <ReadRow k="Occupation" v={customer?.occupation} c={c} idx={3} />
            <ReadRow k="Marital Status" v={customer?.maritalStatus} c={c} idx={4} />
            <ReadRow k="Reffred" v={customer?.approver} c={c} idx={5} />
          </CollapsibleSection>

          <CollapsibleSection icon="📍" label="Address" open={expandedSections.address} onToggle={() => toggleSection("address")} c={c}>
            <ReadRow k="Country" v={customer?.country} c={c} idx={0} />
            <ReadRow k="State" v={customer?.state} c={c} idx={1} />
            <ReadRow k="City" v={customer?.city} c={c} idx={2} />
            <ReadRow k="Address" v={customer?.address} c={c} idx={3} copyable />
            <ReadRow k="PIN Code" v={customer?.pincode} c={c} idx={4} icon="📮" mono />
            <ReadRow k="Full Address" v={customer?.address2} c={c} idx={5} copyable />
          </CollapsibleSection>

          <CollapsibleSection icon="🙏" label="Diksha" open={expandedSections.diksha} onToggle={() => toggleSection("diksha")} c={c}>
            <ReadRow k="सत्संग श्रवण" v={customer?.dikshaYear} c={c} idx={0} />
            <ReadRow k="वृंदावन कितनी बार आये" v={customer?.vrindavanVisits} c={c} idx={1} />
            <ReadRow k="दीक्षा प्रथम उपस्थिति" v={customer?.firstDikshaYear} c={c} idx={2} />
          </CollapsibleSection>

          <CollapsibleSection icon="👨‍👩‍👧" label="Family & Permissions" open={expandedSections.family} onToggle={() => toggleSection("family")} c={c}>
            <ReadRow k="Family Permission" v={customer?.familyPermissionRelation} c={c} idx={0} />
            {customer?.familyPermissionRelation === "other" && <ReadRow k="Other" v={customer?.familyPermissionOther} c={c} idx={1} />}
          </CollapsibleSection>

          <CollapsibleSection icon="⚡" label="Lifestyle" open={expandedSections.lifestyle} onToggle={() => toggleSection("lifestyle")} c={c}>
            <ReadRow k="Onion/Garlic" v={triReadDisplay(customer?.onionGarlic, customer?.onionGarlicNote)} c={c} idx={0} icon="🧅" />
            <ReadRow k="Has Pet" v={triReadDisplay(customer?.hasPet, customer?.petNote)} c={c} idx={1} icon="🐾" />
            <ReadRow k="Before GuruDev" v={triReadDisplay(customer?.hadTeacherBefore, customer?.guruNote)} c={c} idx={2} icon="🙏" />
            <ReadRow k="Nasha" v={triReadDisplay(customer?.nasha, customer?.nashaNote)} c={c} idx={3} icon="🚬" />
          </CollapsibleSection>

          <CollapsibleSection icon="📝" label="Notes" open={expandedSections.notes} onToggle={() => toggleSection("notes")} c={c}>
            <ReadRow k="Note" v={customer?.note} c={c} idx={0} />
          </CollapsibleSection>

          {hasContactData && (
            <CollapsibleSection icon="📱" label="Phone & WhatsApp" open={expandedSections.contact} onToggle={() => toggleSection("contact")} c={c} badge="✓">
              <ReadRow k="Phone" v={phoneDisplay(customer?.phoneCountryCode, customer?.phoneNumber)} c={c} idx={0} icon="📞" copyable mono />
              <ReadRow k="WhatsApp" v={phoneDisplay(customer?.whatsappCountryCode, customer?.whatsappNumber)} c={c} idx={1} icon="💬" copyable mono />
            </CollapsibleSection>
          )}
          {hasIdentityData && (
            <CollapsibleSection icon="🪪" label="Identity" open={expandedSections.identity} onToggle={() => toggleSection("identity")} c={c} badge="✓">
              <ReadRow k="ID" v={idDisplay(customer?.idType, customer?.idValue, customer?.idTypeName)} c={c} idx={0} copyable mono />
            </CollapsibleSection>
          )}
          {hasGuardianData && (
            <CollapsibleSection icon="🛡️" label="Guardian" open={expandedSections.guardian} onToggle={() => toggleSection("guardian")} c={c} badge="✓">
              <ReadRow k="Relation" v={customer?.guardianRelation} c={c} idx={0} />
              <ReadRow k="Name" v={customer?.guardianName} c={c} idx={1} copyable />
            </CollapsibleSection>
          )}
          {hasFamilyMemberData && (
            <CollapsibleSection icon="👨‍👩‍👧" label="Family Member" open={expandedSections.familyMember} onToggle={() => toggleSection("familyMember")} c={c} badge="✓">
              <ReadRow k="Name" v={customer?.familyMemberName} c={c} idx={0} copyable />
              <ReadRow k="Relation" v={customer?.familyMemberRelation === "other" ? customer?.familyMemberRelationOther : customer?.familyMemberRelation} c={c} idx={1} />
              <ReadRow k="Mobile" v={phoneDisplay(customer?.familyMemberCountryCode, customer?.familyMemberMobile)} c={c} idx={2} icon="📱" copyable mono />
            </CollapsibleSection>
          )}
        </div>

        {source === "TODAY" && onFinalize && (
          <div className="px-5 max-md:px-4 pb-5 max-md:pb-4 pt-3 max-md:pt-2">
            <button type="button" disabled={busy || !canFinalizeEdit} onClick={onFinalize}
              className="group relative w-full px-4 max-md:px-3 py-3.5 max-md:py-3 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold overflow-hidden disabled:opacity-40 active:scale-[0.97] flex items-center justify-center gap-2"
              style={{ color: "#ffffff", transition: "transform .1s" }}>
              <div className="absolute inset-0 rounded-2xl max-md:rounded-xl" style={{ background: c.accG || c.acc }} />
              <div className="absolute inset-0 rounded-2xl max-md:rounded-xl opacity-0 group-hover:opacity-100" style={{ background: "rgba(255,255,255,0.10)", transition: "opacity .2s" }} />
              <span className="relative flex items-center gap-2">🚀 Finalize → Sitting</span>
            </button>
          </div>
        )}

        <div className="h-[2px] mx-5 mb-0 rounded-full" style={{ background: c.accG || c.acc, opacity: 0.15 }} />
        <div className="h-3 max-md:h-2" />
      </div>
    );
  }

  // ═══════════════════════════════════════
  // EDIT MODE
  // ═══════════════════════════════════════
  return (
    <div className="rounded-3xl max-md:rounded-2xl border overflow-hidden will-change-transform"
      style={{ background: c.panelBg, borderColor: c.panelBorder,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.03)",
        transform: entered ? "translateY(0)" : "translateY(12px)", opacity: entered ? 1 : 0,
        transition: "transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease-out" }}>

      <div className="px-5 max-md:px-4 pt-5 max-md:pt-4 pb-3 max-md:pb-2.5 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${c.divider || c.panelBorder}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 max-md:w-7 max-md:h-7 rounded-xl max-md:rounded-lg flex items-center justify-center text-sm max-md:text-xs"
            style={{ background: c.acc + "15" }}>✏️</div>
          <div>
            <div className="text-[13px] max-md:text-[12px] font-bold" style={{ color: c.t1 }}>Editing Profile</div>
            <div className="text-[10px] max-md:text-[9px]" style={{ color: c.t3 }}>Changes saved only when you click Save</div>
          </div>
        </div>
        <button type="button" onClick={() => setEditMode(false)}
          className="px-3 max-md:px-2.5 py-1.5 max-md:py-1 rounded-xl max-md:rounded-lg text-[11px] max-md:text-[10px] font-semibold border active:scale-95"
          style={{ background: c.btnDangerBg || c.btnGhostBg, borderColor: c.btnDangerBorder || c.btnGhostBorder,
            color: c.btnDangerText || "#f87171", transition: "transform .1s" }}>✕ Cancel</button>
      </div>

      {fullLoadBusy && (
        <div className="flex items-center gap-2 px-5 max-md:px-4 py-2">
          <LoadingSpinner c={c} size={14} />
          <span className="text-[11px] max-md:text-[10px]" style={{ color: c.hintColor }}>Loading full profile...</span>
        </div>
      )}
      {fullLoadErr && <div className="px-5 max-md:px-4 pt-2"><ErrorBanner message={fullLoadErr} c={c} /></div>}
      {err && <div className="px-5 max-md:px-4 pt-2"><ErrorBanner message={err} c={c} /></div>}

      <div className="px-4 max-md:px-3 pt-2">

        {/* ── Personal ── */}
        <CollapsibleSection icon="👤" label="Personal" open={expandedSections.personal} onToggle={() => toggleSection("personal")} c={c}>
          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Field label="Name" required value={form.name} onChange={(v) => upd("name", v)} c={c} placeholder="Full name..." />
            <Field label="Age" required value={form.age} onChange={(v) => upd("age", v)} c={c} placeholder="e.g. 28" type="number" />
            <Select label="Gender" value={form.gender} onChange={(v) => upd("gender", v)} c={c}>
              <option value="MALE">MALE</option><option value="FEMALE">FEMALE</option><option value="OTHER">OTHER</option>
            </Select>
            <OccupationField value={form.occupation} onChange={(v) => upd("occupation", v)} c={c} />
            <Select label="Marital Status" value={form.maritalStatus} onChange={(v) => upd("maritalStatus", v)} options={MARITAL} c={c} />
            <Select label="Approver" value={form.approver} onChange={(v) => upd("approver", v)} options={APPROVERS} c={c} />
          </div>
        </CollapsibleSection>

        {/* ── Address ── */}
        <CollapsibleSection icon="📍" label="Address" open={expandedSections.address} onToggle={() => toggleSection("address")} c={c}>
          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Select label="Country" required value={form.country} c={c}
              onChange={(v) => setForm((p) => ({ ...p, country: v, state: "", stateOther: "", city: "", cityOther: "" }))} disabled={countriesLoading}>
              {countriesLoading ? <option value="">Loading...</option> : (
                <><option value="">Select Country...</option><option value="India">🇮🇳 India</option><option disabled>──────────</option>
                  {countries.filter((x) => x.name !== "India").map((co) => (
                    <option key={co.code} value={co.name}>{co.flag ? `${co.flag} ` : ""}{co.name}</option>
                  ))}</>
              )}
            </Select>
            <div>
              <Select label="State" required value={form.state} c={c} disabled={!form.country || stateLoading}
                onChange={(v) => {
                  if (v === "__OTHER__") setForm((p) => ({ ...p, state: "__OTHER__", stateOther: p.stateOther || "", city: "__OTHER__", cityOther: "" }));
                  else setForm((p) => ({ ...p, state: v, stateOther: "", city: "", cityOther: "" }));
                }}>
                <option value="">{!form.country ? "Select country first..." : stateLoading ? "Loading..." : "Select..."}</option>
                {states.map((s, i) => <option key={`${s}_${i}`} value={s}>{s}</option>)}
                <option value="__OTHER__">Enter Manually</option>
              </Select>
              {stateLoading && <div className="flex items-center gap-1.5 mt-1"><LoadingSpinner c={c} size={12} /><span className="text-[10px]" style={{ color: c.hintColor }}>Loading...</span></div>}
              {form.state === "__OTHER__" && (
                <input value={form.stateOther || ""} onChange={(e) => upd("stateOther", e.target.value)} placeholder="Type state..."
                  className="mt-2 w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
                  style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }} />
              )}
            </div>
            <div>
              <Select label="City" required value={form.city} c={c} disabled={!form.state || form.state === "__OTHER__" || cityLoading}
                onChange={(v) => { upd("city", v); upd("cityOther", ""); }}>
                <option value="">{!form.state ? "Select..." : cityLoading ? "Loading..." : "Select..."}</option>
                {cities.map((ci, i) => <option key={`${ci}_${i}`} value={ci}>{ci}</option>)}
                <option value="__OTHER__">Other</option>
              </Select>
              {cityLoading && <div className="flex items-center gap-1.5 mt-1"><LoadingSpinner c={c} size={12} /><span className="text-[10px]" style={{ color: c.hintColor }}>Loading...</span></div>}
              {(form.state === "__OTHER__" || form.city === "__OTHER__") && (
                <input value={form.cityOther || ""} onChange={(e) => setForm((p) => ({ ...p, city: "__OTHER__", cityOther: e.target.value }))} placeholder="Type city..."
                  className="mt-2 w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
                  style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }} />
              )}
            </div>
            <div className="sm:col-span-2">
              <div className="text-[10px] max-md:text-[9px] flex items-center gap-2 px-2 py-1.5 rounded-xl"
                style={{ color: c.hintColor, background: c.glassBg || "rgba(128,128,128,0.03)" }}>
                📫 Computed: <span className="font-semibold" style={{ color: c.t2 }}>{computedAddress || "—"}</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* ── Diksha ── */}
        <CollapsibleSection icon="🙏" label="Diksha" open={expandedSections.diksha} onToggle={() => toggleSection("diksha")} c={c}>
          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Field label="सत्संग श्रवण" value={form.dikshaYear} onChange={(v) => upd("dikshaYear", v)} c={c} placeholder="e.g. 2020" />
            <Field label="वृंदावन कितनी बार आये" value={form.vrindavanVisits} onChange={(v) => upd("vrindavanVisits", v)} c={c} placeholder="e.g. 5" />
            <Field label="दीक्षा प्रथम उपस्थिति" value={form.firstDikshaYear} onChange={(v) => upd("firstDikshaYear", v)} c={c} placeholder="e.g. 2021" />
          </div>
        </CollapsibleSection>

        {/* ── Family & Permissions ── */}
        <CollapsibleSection icon="👨‍👩‍👧" label="Family & Permissions" open={expandedSections.family} onToggle={() => toggleSection("family")} c={c}>
          <div className="space-y-3 max-md:space-y-2.5">
            <Select label="Family Permission" value={form.familyPermissionRelation}
              onChange={(v) => setForm((p) => ({ ...p, familyPermissionRelation: v, familyPermissionOther: v === "other" ? p.familyPermissionOther : "" }))}
              options={FAMILY_OPTIONS} c={c} />
            {form.familyPermissionRelation === "other" && (
              <input value={form.familyPermissionOther || ""} onChange={(e) => upd("familyPermissionOther", e.target.value)}
                placeholder="Other (type here)..."
                className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform"
                style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} />
            )}
          </div>
        </CollapsibleSection>

        {/* ── Lifestyle ── */}
        <CollapsibleSection icon="⚡" label="Lifestyle" open={expandedSections.lifestyle} onToggle={() => toggleSection("lifestyle")} c={c}>
          <div className="grid sm:grid-cols-2 gap-2.5 max-md:gap-2">
            <TriToggle icon="🧅" label="Onion / Garlic?" value={form.onionGarlic}
              onChange={(v) => { upd("onionGarlic", v); if (v !== true) upd("onionGarlicNote", ""); }} c={c}
              expandContent={<div><div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel || c.t3 }}>Details <span style={{ color: c.hintColor }}>(optional)</span></div>
                <input value={form.onionGarlicNote || ""} onChange={(e) => upd("onionGarlicNote", e.target.value)} placeholder="e.g. Only onion, Both..."
                  className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
                  style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                  onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                  onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} /></div>} />
            <TriToggle icon="🐾" label="Has Pet?" value={form.hasPet}
              onChange={(v) => { upd("hasPet", v); if (v !== true) upd("petNote", ""); }} c={c}
              expandContent={<div><div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel || c.t3 }}>Which animal?</div>
                <SuggestInputInline value={form.petNote} onChange={(v) => upd("petNote", v)} suggestions={PET_SUGGESTIONS} placeholder="e.g. Dog, Cat..." c={c} /></div>} />
            <TriToggle icon="🙏" label="Before GuruDev?" value={form.hadTeacherBefore}
              onChange={(v) => { upd("hadTeacherBefore", v); if (v !== true) upd("guruNote", ""); }} c={c}
              expandContent={<div><div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel || c.t3 }}>Details <span style={{ color: c.hintColor }}>(optional)</span></div>
                <input value={form.guruNote || ""} onChange={(e) => upd("guruNote", e.target.value)} placeholder="Previous guru details..."
                  className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
                  style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                  onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                  onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} /></div>} />
            <TriToggle icon="🚬" label="Nasha?" value={form.nasha}
              onChange={(v) => { upd("nasha", v); if (v !== true) upd("nashaNote", ""); }} c={c}
              expandContent={<div><div className="text-[10px] max-md:text-[9px] font-semibold mb-1.5" style={{ color: c.triSubLabel || c.t3 }}>Details <span style={{ color: c.hintColor }}>(optional)</span></div>
                <input value={form.nashaNote || ""} onChange={(e) => upd("nashaNote", e.target.value)} placeholder="Type of nasha..."
                  className="w-full rounded-xl max-md:rounded-lg border px-3 max-md:px-2.5 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] outline-none will-change-transform"
                  style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                  onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                  onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} /></div>} />
          </div>
        </CollapsibleSection>

        {/* ── Note ── */}
        <CollapsibleSection icon="📝" label="Note" open={expandedSections.notes} onToggle={() => toggleSection("notes")} c={c}>
          <div>
            <div className="text-[11px] max-md:text-[10px] font-semibold mb-1.5 max-md:mb-1" style={{ color: c.labelColor }}>
              Note <span style={{ color: c.hintColor, fontWeight: 400 }}>(optional)</span>
            </div>
            <textarea value={form.note || ""} onChange={(e) => upd("note", e.target.value)} placeholder="Any note..."
              className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none min-h-[80px] max-md:min-h-[60px] resize-y will-change-transform"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
              onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
              onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} />
          </div>
        </CollapsibleSection>

        {/* ── Phone & WhatsApp ── */}
        <CollapsibleSection icon="📱" label="Phone & WhatsApp" open={expandedSections.contact} onToggle={() => toggleSection("contact")} c={c}>
          <div className="space-y-3 max-md:space-y-2.5">
            <PhoneComboField label="Phone Number" required
              countryCode={form.phoneCountryCode || "+91"} number={form.phoneNumber}
              onCountryCodeChange={(v) => upd("phoneCountryCode", v)}
              onNumberChange={(v) => upd("phoneNumber", v)}
              c={c} placeholder="Enter phone number..." />

            <button type="button" onClick={copyPhoneToWhatsApp}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 max-md:py-2 rounded-2xl max-md:rounded-xl text-[11px] max-md:text-[10px] font-bold border active:scale-[0.97]"
              style={{ background: c.panelHover || "rgba(128,128,128,0.04)", borderColor: c.inputBorder, color: c.t2, transition: "transform .1s" }}>
              📋 Same as Phone → WhatsApp
            </button>

            <PhoneComboField label="WhatsApp Number"
              countryCode={form.whatsappCountryCode || "+91"} number={form.whatsappNumber}
              onCountryCodeChange={(v) => upd("whatsappCountryCode", v)}
              onNumberChange={(v) => upd("whatsappNumber", v)}
              c={c} placeholder="Enter WhatsApp number..." />
          </div>
        </CollapsibleSection>

        {/* ── Identity ── */}
        <CollapsibleSection icon="🪪" label="Identity" open={expandedSections.identity} onToggle={() => toggleSection("identity")} c={c}>
          <div className="space-y-3 max-md:space-y-2.5">
            <div className="flex flex-wrap gap-2 max-md:gap-1.5">
              {[
                { val: "aadhaar", label: "🪪 AADHAAR", desc: "12-digit" },
                { val: "passport", label: "🛂 PASSPORT", desc: "Alphanumeric" },
                { val: "other", label: "📄 OTHER", desc: "Custom ID" },
              ].map((t) => (
                <button key={t.val} type="button"
                  onClick={() => setForm((p) => ({ ...p, idType: t.val, idValue: "", idTypeName: t.val === "other" ? (p.idTypeName || "") : "" }))}
                  className="flex-1 min-w-[90px] px-3 max-md:px-2.5 py-2.5 max-md:py-2 rounded-xl text-left border active:scale-[0.97]"
                  style={{
                    background: form.idType === t.val ? (c.acc + "15") : c.btnGhostBg,
                    borderColor: form.idType === t.val ? c.acc : c.btnGhostBorder,
                    color: form.idType === t.val ? c.t1 : c.btnGhostText,
                    boxShadow: form.idType === t.val ? `0 0 0 1px ${c.acc}30` : "none", transition: "all .15s",
                  }}>
                  <div className="text-[12px] max-md:text-[11px] font-bold">{t.label}</div>
                  <div className="text-[9px] max-md:text-[8px] mt-0.5" style={{ color: c.t3 }}>{t.desc}</div>
                </button>
              ))}
            </div>

            {form.idType === "other" && (
              <Field label="Other ID Type Name" value={form.idTypeName} onChange={(v) => upd("idTypeName", v)} c={c} placeholder="e.g. Voter ID, DL..." />
            )}

            {form.idType === "aadhaar" ? (
              <div>
                <div className="text-[11px] max-md:text-[10px] font-semibold mb-1.5 max-md:mb-1" style={{ color: c.labelColor }}>Aadhaar Number</div>
                <input value={form.idValue || ""} onChange={(e) => onAadhaarChange(e.target.value)}
                  placeholder="XXXX XXXX XXXX" inputMode="numeric" maxLength={14}
                  className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] font-mono tracking-wider outline-none will-change-transform"
                  style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                  onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                  onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} />
                {form.idValue && (
                  <div className="text-[10px] max-md:text-[9px] mt-1 px-2" style={{ color: isAadhaarValid(form.idValue) ? (c.triYesText || "#4ade80") : c.t3 }}>
                    {isAadhaarValid(form.idValue) ? "✓ Valid 12-digit Aadhaar" : `${12 - String(form.idValue || "").replace(/\D/g, "").length} digits remaining`}
                  </div>
                )}
              </div>
            ) : (
              <Field label={form.idType === "passport" ? "Passport Number" : "ID Number"} value={form.idValue}
                onChange={(v) => upd("idValue", v)} c={c} placeholder="Enter number..." />
            )}
          </div>
        </CollapsibleSection>

        {/* ── Guardian ── */}
        <CollapsibleSection icon="🛡️" label="Guardian" open={expandedSections.guardian} onToggle={() => toggleSection("guardian")} c={c}>
          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <EditDropdown label="Relation" value={form.guardianRelation} onChange={(v) => upd("guardianRelation", v)} c={c}
              options={[
                { value: "father", label: "👨 Father" },
                { value: "mother", label: "👩 Mother" },
                { value: "husband", label: "💑 Husband" },
              ]} placeholder="Select relation..." />
            <Field label="Guardian Name" value={form.guardianName} onChange={(v) => upd("guardianName", v)} c={c} placeholder="Full name..." />
          </div>
        </CollapsibleSection>

        {/* ── Family Member ── */}
        <CollapsibleSection icon="👨‍👩‍👧" label="Family Member (Finalize)" open={expandedSections.familyMember} onToggle={() => toggleSection("familyMember")} c={c}>
          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Field label="Name" value={form.familyMemberName} onChange={(v) => upd("familyMemberName", v)} c={c} placeholder="Full name..." />
            <EditDropdown label="Relation" value={form.familyMemberRelation}
              onChange={(v) => setForm((p) => ({ ...p, familyMemberRelation: v,
                familyMemberRelationOther: v === "other" ? (p.familyMemberRelationOther || "") : "" }))}
              options={[
                { value: "mother", label: "👩 Mother" },
                { value: "father", label: "👨 Father" },
                { value: "parents", label: "👨‍👩‍👧 Parents" },
                { value: "other", label: "📝 Other" },
              ]} c={c} placeholder="Select relation..." />
            {form.familyMemberRelation === "other" && (
              <Field label="Other Relation" value={form.familyMemberRelationOther}
                onChange={(v) => upd("familyMemberRelationOther", v)} c={c} placeholder="Type relation..." />
            )}
            <div className="sm:col-span-2">
              <PhoneComboField label="Mobile"
                countryCode={form.familyMemberCountryCode || "+91"} number={form.familyMemberMobile}
                onCountryCodeChange={(v) => upd("familyMemberCountryCode", v)}
                onNumberChange={(v) => upd("familyMemberMobile", v)}
                c={c} placeholder="Phone number..." />
            </div>
          </div>
        </CollapsibleSection>

        {/* ── PIN + Full Address ── */}
        <CollapsibleSection icon="🏠" label="Full Address & PIN" open={expandedSections.address} onToggle={() => toggleSection("address")} c={c}>
          <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">
            <Field label="PIN Code" value={form.pinCode || form.pincode} onChange={(v) => { upd("pinCode", String(v || "").replace(/\D/g, "").slice(0, 6)); upd("pincode", String(v || "").replace(/\D/g, "").slice(0, 6)); }}
              c={c} placeholder="6 digits..." />
            <div className="sm:col-span-2">
              <div className="text-[11px] max-md:text-[10px] font-semibold mb-1.5 max-md:mb-1" style={{ color: c.labelColor }}>Full Address</div>
              <textarea value={form.address2 || ""} onChange={(e) => upd("address2", e.target.value)} placeholder="Enter complete address..."
                className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none min-h-[80px] max-md:min-h-[60px] resize-y will-change-transform"
                style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "border-color .15s,box-shadow .15s" }}
                onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = c.inputBorder; }} />
            </div>
          </div>
        </CollapsibleSection>
      </div>

      {/* ── Save Button ── */}
      <div className="px-5 max-md:px-4 pb-5 max-md:pb-4 pt-3 max-md:pt-2">
        <button type="button" disabled={busy} onClick={onSave}
          className="w-full px-4 max-md:px-3 py-3.5 max-md:py-3 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97]"
          style={{ background: c.btnSolidBg, color: c.btnSolidText, transition: "transform .1s" }}>
          {busy ? <LoadingSpinner c={{ loadingDot: c.btnSolidText }} size={16} /> : null}
          {busy ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}
