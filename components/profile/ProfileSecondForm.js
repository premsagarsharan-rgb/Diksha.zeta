// components/profile/ProfileSecondForm.js
"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import LayerModal from "@/components/LayerModal";
import { SectionHeader, Field, ErrorBanner, LoadingSpinner } from "./ProfileSubComponents";
import { parsePhoneNumberFromString } from "libphonenumber-js/min";

/* ═══════════════════════════════════════════════
   SMART HELPERS
   ═══════════════════════════════════════════════ */

function formatAadhaar(raw) {
  const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
  const parts = [];
  for (let i = 0; i < digits.length; i += 4) {
    parts.push(digits.slice(i, i + 4));
  }
  return parts.join(" ");
}

function isAadhaarValid(raw) {
  return String(raw || "").replace(/\D/g, "").length === 12;
}

function isPhoneValid(num) {
  const digits = String(num || "").replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function isPinValid(pin) {
  return /^\d{6}$/.test(String(pin || "").trim());
}

const _pinCache = {};

async function lookupPin(pin) {
  const p = String(pin || "").trim();
  if (!/^\d{6}$/.test(p)) return null;
  if (_pinCache[p]) return _pinCache[p];
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${p}`);
    const data = await res.json().catch(() => []);
    if (data?.[0]?.Status === "Success" && data[0]?.PostOffice?.length) {
      const po = data[0].PostOffice[0];
      const result = { city: po.District || po.Division || "", state: po.State || "" };
      _pinCache[p] = result;
      return result;
    }
  } catch {}
  return null;
}

function autoDetectCountryCode(raw) {
  try {
    const parsed = parsePhoneNumberFromString(raw);
    if (parsed && parsed.countryCallingCode) {
      return `+${parsed.countryCallingCode}`;
    }
  } catch {}
  return null;
}

/* ═══════════════════════════════════════════════
   COUNTRY CODE DATA
   ═══════════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════════
   SMART FIELD COMPONENTS
   ═══════════════════════════════════════════════ */

function SmartField({ label, value, onChange, required, placeholder, c, disabled,
  valid, invalid, hint, icon, maxLength, inputMode, mono, id }) {
  const borderColor = invalid ? c.smartInputErrorBorder
    : valid ? c.smartInputValidBorder
    : c.inputBorder;
  const bgColor = invalid ? c.smartInputError
    : valid ? c.smartInputValid
    : c.inputBg;

  return (
    <div>
      <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: c.labelColor }}>
        {label}
        {required && <span style={{ color: c.requiredStar }}>*</span>}
      </div>
      <div className="relative">
        <input
          id={id}
          value={value || ""}
          onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          inputMode={inputMode}
          className={`w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none will-change-transform ${mono ? "font-mono tracking-wider" : ""}`}
          style={{
            background: disabled ? c.inputDisabledBg : bgColor,
            borderColor,
            color: disabled ? c.inputDisabledText : c.inputText,
            paddingRight: (valid || invalid) ? "40px" : "16px",
            transition: "border-color .15s, box-shadow .15s, background .15s",
          }}
          onFocusCapture={(e) => {
            if (!disabled) {
              e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`;
              e.currentTarget.style.borderColor = c.inputBorderFocus;
            }
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.borderColor = borderColor;
          }}
        />
        {(valid || invalid) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px]"
            style={{ color: valid ? c.smartInputValidIcon : c.smartInputErrorIcon,
              opacity: 0, animation: "profileFadeUp 0.2s ease-out 0.05s forwards" }}>
            {valid ? "✓" : "✗"}
          </div>
        )}
      </div>
      {hint && (
        <div className="text-[10px] max-md:text-[9px] mt-1.5 px-2 py-1 rounded-lg flex items-center gap-1.5"
          style={{ background: c.smartInputHintBg, border: `1px solid ${c.smartInputHintBorder}`, color: c.smartInputHintText }}>
          {icon && <span className="text-[11px]">{icon}</span>}
          {hint}
        </div>
      )}
    </div>
  );
}

function SmartDropdown({ label, value, onChange, options, required, c, placeholder }) {
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
      <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: c.labelColor }}>
        {label}
        {required && <span style={{ color: c.requiredStar }}>*</span>}
      </div>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] text-left outline-none flex items-center justify-between gap-2 will-change-transform"
        style={{
          background: c.inputBg,
          borderColor: open ? c.inputBorderFocus : c.inputBorder,
          color: value ? c.inputText : c.inputPlaceholder,
          boxShadow: open ? `0 0 0 3px ${c.inputFocusRing}` : "none",
          transition: "border-color .15s, box-shadow .15s",
        }}>
        <span className="truncate">{displayLabel}</span>
        <span className="text-[12px] shrink-0" style={{ color: c.t3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</span>
      </button>
      {open && (
        <div className="absolute z-[300] mt-1 w-full rounded-2xl max-md:rounded-xl border overflow-hidden max-h-52 overflow-y-auto will-change-transform"
          style={{ background: c.smartDropdownBg, borderColor: c.smartDropdownBorder, boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            opacity: 0, animation: "profileFadeUp 0.2s ease-out forwards" }}>
          {options.map((opt, i) => {
            const optValue = typeof opt === "string" ? opt : opt.value;
            const optLabel = typeof opt === "string" ? opt : opt.label;
            const isActive = optValue === value;
            return (
              <button key={`${optValue}_${i}`} type="button"
                onClick={() => { onChange(optValue); setOpen(false); }}
                className="w-full text-left px-4 max-md:px-3 py-2.5 max-md:py-2 text-[12px] max-md:text-[11px] font-medium flex items-center justify-between gap-2"
                style={{
                  color: isActive ? c.smartDropdownCheck : c.smartDropdownItemText,
                  background: isActive ? c.smartDropdownItemActive : "transparent",
                  fontWeight: isActive ? 700 : 500, transition: "background .1s",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = c.smartDropdownItemHover; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <span className="truncate">{optLabel}</span>
                {isActive && <span className="text-[13px] shrink-0" style={{ color: c.smartDropdownCheck }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   COUNTRY CODE DROPDOWN (searchable)
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

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter((cc) =>
      cc.code.includes(q) || cc.country.toLowerCase().includes(q) || cc.label.toLowerCase().includes(q)
    );
  }, [search]);

  const currentLabel = useMemo(() => {
    const found = COUNTRY_CODES.find((cc) => cc.code === value);
    return found ? found.label : value || "+91";
  }, [value]);

  return (
    <div className="relative w-[88px] max-md:w-[78px] flex-shrink-0" ref={ref}>
      <button type="button" onClick={() => { setOpen(!open); setSearch(""); }}
        className="w-full rounded-xl max-md:rounded-lg border px-2 max-md:px-1.5 py-3 max-md:py-2.5 text-[12px] max-md:text-[11px] font-bold text-center outline-none flex items-center justify-center gap-1 will-change-transform"
        style={{
          background: c.inputBg, borderColor: open ? c.inputBorderFocus : c.inputBorder, color: c.inputText,
          boxShadow: open ? `0 0 0 3px ${c.inputFocusRing}` : "none", transition: "border-color .15s, box-shadow .15s",
        }}>
        <span className="truncate text-[11px] max-md:text-[10px]">{currentLabel}</span>
        <span className="text-[9px] shrink-0" style={{ color: c.t3, transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform .2s" }}>▾</span>
      </button>

      {open && (
        <div className="absolute z-[400] mt-1 w-[220px] max-md:w-[200px] rounded-2xl max-md:rounded-xl border overflow-hidden will-change-transform"
          style={{ background: c.smartDropdownBg, borderColor: c.smartDropdownBorder,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)", opacity: 0, animation: "profileFadeUp 0.2s ease-out forwards",
            left: 0, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>

          <div className="p-2 max-md:p-1.5" style={{ borderBottom: `1px solid ${c.smartDropdownBorder}` }}>
            <input ref={searchRef} value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code..."
              className="w-full rounded-lg border px-2.5 max-md:px-2 py-1.5 max-md:py-1 text-[11px] max-md:text-[10px] outline-none"
              style={{ background: c.inputBg, borderColor: c.inputBorder, color: c.inputText, transition: "box-shadow .15s" }}
              onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 2px ${c.inputFocusRing}`; }}
              onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>

          <div className="max-h-48 max-md:max-h-40 overflow-y-auto overscroll-contain">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[11px] text-center" style={{ color: c.t3 }}>No results</div>
            )}
            {filtered.map((cc, i) => {
              const isActive = cc.code === value;
              return (
                <button key={`${cc.code}_${i}`} type="button"
                  onClick={() => { onChange(cc.code); setOpen(false); setSearch(""); }}
                  className="w-full text-left px-3 max-md:px-2.5 py-2 max-md:py-1.5 text-[11px] max-md:text-[10px] font-medium flex items-center justify-between gap-2"
                  style={{
                    color: isActive ? c.smartDropdownCheck : c.smartDropdownItemText,
                    background: isActive ? c.smartDropdownItemActive : "transparent",
                    fontWeight: isActive ? 700 : 500, transition: "background .1s",
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = c.smartDropdownItemHover; }}
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
   PHONE + COUNTRY CODE COMBO FIELD
   ═══════════════════════════════════════════════ */

function PhoneComboField({ label, required, countryCode, number, onCountryCodeChange, onNumberChange,
  c, placeholder, invalid, valid, hint, icon, id }) {

  function handleNumberChange(raw) {
    const val = String(raw || "");
    onNumberChange(val);
    const detected = autoDetectCountryCode(val.startsWith("+") ? val : `+${val}`);
    if (detected) {
      onCountryCodeChange(detected);
      try {
        const parsed = parsePhoneNumberFromString(val.startsWith("+") ? val : `+${val}`);
        if (parsed && parsed.isValid()) {
          onNumberChange(String(parsed.nationalNumber || ""));
        }
      } catch {}
    }
  }

  const borderColor = invalid ? c.smartInputErrorBorder : valid ? c.smartInputValidBorder : c.inputBorder;
  const bgColor = invalid ? c.smartInputError : valid ? c.smartInputValid : c.inputBg;

  return (
    <div>
      <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: c.labelColor }}>
        {label}
        {required && <span style={{ color: c.requiredStar }}>*</span>}
      </div>
      <div className="flex gap-2 max-md:gap-1.5">
        <CountryCodeDropdown value={countryCode || "+91"} onChange={onCountryCodeChange} c={c} />
        <div className="relative flex-1">
          <input id={id} value={number || ""} onChange={(e) => handleNumberChange(e.target.value)}
            placeholder={placeholder} inputMode="tel"
            className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] font-mono tracking-wider outline-none will-change-transform"
            style={{ background: bgColor, borderColor, color: c.inputText,
              paddingRight: (valid || invalid) ? "40px" : "16px", transition: "border-color .15s, box-shadow .15s, background .15s" }}
            onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
            onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = borderColor; }}
          />
          {(valid || invalid) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[14px]"
              style={{ color: valid ? c.smartInputValidIcon : c.smartInputErrorIcon,
                opacity: 0, animation: "profileFadeUp 0.2s ease-out 0.05s forwards" }}>
              {valid ? "✓" : "✗"}
            </div>
          )}
        </div>
      </div>
      {hint && (
        <div className="text-[10px] max-md:text-[9px] mt-1.5 px-2 py-1 rounded-lg flex items-center gap-1.5"
          style={{ background: c.smartInputHintBg, border: `1px solid ${c.smartInputHintBorder}`, color: c.smartInputHintText }}>
          {icon && <span className="text-[11px]">{icon}</span>}
          {hint}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════ */

export default function ProfileSecondForm({
  open, onClose, reg2, setReg2, reg2Err, setReg2Err,
  onContinue, c, busy,
}) {
  const [pinLooking, setPinLooking] = useState(false);
  const [pinHint, setPinHint] = useState("");
  const [entered, setEntered] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const pinTimerRef = useRef(null);

  useEffect(() => {
    if (open) {
      setEntered(false);
      requestAnimationFrame(() => setEntered(true));
      setFieldErrors({});
    }
  }, [open]);

  useEffect(() => {
    if (!reg2?.pinCode) { setPinHint(""); return; }
    const pin = String(reg2.pinCode).trim();
    if (pin.length !== 6) { setPinHint(""); return; }
    clearTimeout(pinTimerRef.current);
    pinTimerRef.current = setTimeout(async () => {
      setPinLooking(true);
      const result = await lookupPin(pin);
      setPinLooking(false);
      if (result) setPinHint(`📍 ${result.city}, ${result.state}`);
      else setPinHint("");
    }, 400);
    return () => clearTimeout(pinTimerRef.current);
  }, [reg2?.pinCode]);

  if (!open || !reg2) return null;

  const upd = (key, val) => {
    setReg2((p) => ({ ...(p || {}), [key]: val }));
    setFieldErrors((p) => ({ ...p, [key]: false }));
  };

  function copyPhoneToWhatsApp() {
    setReg2((p) => ({
      ...(p || {}),
      whatsappCountryCode: p?.phoneCountryCode || "+91",
      whatsappNumber: p?.phoneNumber || "",
    }));
  }

  function onAadhaarChange(raw) {
    const digits = String(raw || "").replace(/\D/g, "").slice(0, 12);
    upd("idValue", formatAadhaar(digits));
  }

  const phoneValid = isPhoneValid(reg2.phoneNumber);
  const pinValid = isPinValid(reg2.pinCode);
  const aadhaarValid = reg2.idType === "aadhaar" ? isAadhaarValid(reg2.idValue) : null;
  const guardianNameFilled = String(reg2.guardianName || "").trim().length > 0;
  const familyNameFilled = String(reg2.familyMemberName || "").trim().length > 0;
  const addressFilled = String(reg2.address2 || "").trim().length > 0;

  function scrollToError(errorKey) {
    const el = document.getElementById(`sf_${errorKey}`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.focus(); }
  }

  function handleContinue() {
    const errs = {};
    let firstErr = null;
    if (!String(reg2.guardianRelation || "").trim()) { errs.guardianRelation = true; if (!firstErr) firstErr = "guardianRelation"; }
    if (!String(reg2.guardianName || "").trim()) { errs.guardianName = true; if (!firstErr) firstErr = "guardianName"; }
    if (!phoneValid) { errs.phoneNumber = true; if (!firstErr) firstErr = "phoneNumber"; }
    if (!String(reg2.idValue || "").trim()) { errs.idValue = true; if (!firstErr) firstErr = "idValue"; }
    if (reg2.idType === "aadhaar" && !isAadhaarValid(reg2.idValue)) { errs.idValue = true; if (!firstErr) firstErr = "idValue"; }
    if (reg2.idType === "other" && !String(reg2.idTypeName || "").trim()) { errs.idTypeName = true; if (!firstErr) firstErr = "idTypeName"; }
    if (!String(reg2.familyMemberName || "").trim()) { errs.familyMemberName = true; if (!firstErr) firstErr = "familyMemberName"; }
    if (!String(reg2.familyMemberRelation || "").trim()) { errs.familyMemberRelation = true; if (!firstErr) firstErr = "familyMemberRelation"; }
    if (reg2.familyMemberRelation === "other" && !String(reg2.familyMemberRelationOther || "").trim()) { errs.familyMemberRelationOther = true; if (!firstErr) firstErr = "familyMemberRelationOther"; }
    if (!isPhoneValid(reg2.familyMemberMobile)) { errs.familyMemberMobile = true; if (!firstErr) firstErr = "familyMemberMobile"; }
    if (!String(reg2.address2 || "").trim()) { errs.address2 = true; if (!firstErr) firstErr = "address2"; }
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) { if (firstErr) scrollToError(firstErr); return; }
    onContinue();
  }

  const isErr = (key) => fieldErrors[key] === true;

  return (
    <LayerModal open={open} layerName="Extra Details" title="Finalize Details"
      sub="Required before moving to Sitting" onClose={onClose} maxWidth="max-w-4xl" disableBackdropClose>
      <ErrorBanner message={reg2Err} c={c} />

      <div className="rounded-3xl max-md:rounded-2xl border p-4 max-md:p-3 will-change-transform"
        style={{ background: c.panelBg, borderColor: c.panelBorder,
          transform: entered ? "translateY(0)" : "translateY(8px)", opacity: entered ? 1 : 0,
          transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.35s ease-out" }}>

        <div className="grid sm:grid-cols-2 gap-3 max-md:gap-2.5">

          {/* ═══ Guardian ═══ */}
          <FormSection icon="🛡️" label="Guardian" delay={0} c={c}>
            <SmartDropdown label="Relation" required value={reg2.guardianRelation}
              onChange={(v) => upd("guardianRelation", v)} c={c}
              options={[
                { value: "father", label: "👨 Father" },
                { value: "mother", label: "👩 Mother" },
                { value: "husband", label: "💑 Husband" },
              ]}
              placeholder="Select relation..."
            />
            <SmartField label="Guardian Name" required value={reg2.guardianName}
              onChange={(v) => upd("guardianName", v)} c={c} placeholder="Full name..."
              id="sf_guardianName" valid={guardianNameFilled && !isErr("guardianName")} invalid={isErr("guardianName")}
            />
          </FormSection>

          {/* ═══ Phone & WhatsApp ═══ */}
          <FormSection icon="📱" label="Phone & WhatsApp" delay={1} c={c}>
            <div className="sm:col-span-2">
              <PhoneComboField label="Phone Number" required
                countryCode={reg2.phoneCountryCode || "+91"} number={reg2.phoneNumber}
                onCountryCodeChange={(v) => upd("phoneCountryCode", v)}
                onNumberChange={(v) => upd("phoneNumber", v)}
                c={c} placeholder="Enter phone number..." id="sf_phoneNumber"
                valid={phoneValid && !isErr("phoneNumber")}
                invalid={isErr("phoneNumber") || (reg2.phoneNumber?.length > 0 && !phoneValid)}
                hint={phoneValid ? "✓ Valid phone number" : reg2.phoneNumber?.length > 0 ? "Enter 8-15 digits" : null}
                icon={phoneValid ? "✅" : "📱"}
              />
            </div>
            <div className="sm:col-span-2">
              <button type="button" onClick={copyPhoneToWhatsApp}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 max-md:py-2 rounded-2xl max-md:rounded-xl text-[11px] max-md:text-[10px] font-bold border active:scale-[0.97]"
                style={{ background: c.smartInputHintBg, borderColor: c.smartInputHintBorder,
                  color: c.smartInputHintText, transition: "transform .1s" }}>
                📋 Same as Phone → WhatsApp
              </button>
            </div>
            <div className="sm:col-span-2">
              <PhoneComboField label="WhatsApp Number"
                countryCode={reg2.whatsappCountryCode || "+91"} number={reg2.whatsappNumber}
                onCountryCodeChange={(v) => upd("whatsappCountryCode", v)}
                onNumberChange={(v) => upd("whatsappNumber", v)}
                c={c} placeholder="Enter WhatsApp number..."
                valid={reg2.whatsappNumber?.length > 0 && isPhoneValid(reg2.whatsappNumber)}
              />
            </div>
          </FormSection>

          {/* ═══ Identity ═══ */}
          <FormSection icon="🪪" label="Identity" delay={2} c={c}>
            <div className="sm:col-span-2 flex flex-wrap gap-2 max-md:gap-1.5">
              {[
                { val: "aadhaar", label: "🪪 AADHAAR", desc: "12-digit" },
                { val: "passport", label: "🛂 PASSPORT", desc: "Alphanumeric" },
                { val: "other", label: "📄 OTHER", desc: "Custom ID" },
              ].map((t) => (
                <button key={t.val} type="button"
                  onClick={() => setReg2((p) => ({ ...(p || {}), idType: t.val, idValue: "",
                    idTypeName: t.val === "other" ? p?.idTypeName || "" : "" }))}
                  className="flex-1 min-w-[90px] px-3 max-md:px-2.5 py-2.5 max-md:py-2 rounded-xl text-left border active:scale-[0.97]"
                  style={{
                    background: reg2.idType === t.val ? `${c.acc}15` : c.btnGhostBg,
                    borderColor: reg2.idType === t.val ? c.acc : c.btnGhostBorder,
                    color: reg2.idType === t.val ? c.t1 : c.btnGhostText,
                    boxShadow: reg2.idType === t.val ? `0 0 0 1px ${c.acc}30` : "none",
                    transition: "all .15s",
                  }}>
                  <div className="text-[12px] max-md:text-[11px] font-bold">{t.label}</div>
                  <div className="text-[9px] max-md:text-[8px] mt-0.5" style={{ color: c.t3 }}>{t.desc}</div>
                </button>
              ))}
            </div>
            {reg2.idType === "other" && (
              <SmartField label="Other ID Type Name" required value={reg2.idTypeName}
                onChange={(v) => upd("idTypeName", v)} c={c} placeholder="e.g. Voter ID, Driving License..."
                id="sf_idTypeName" valid={String(reg2.idTypeName || "").trim().length > 0 && !isErr("idTypeName")}
                invalid={isErr("idTypeName")}
              />
            )}
            <div className={reg2.idType === "other" ? "" : "sm:col-span-2"}>
              {reg2.idType === "aadhaar" ? (
                <SmartField label="Aadhaar Number" required value={reg2.idValue}
                  onChange={onAadhaarChange} c={c} placeholder="XXXX XXXX XXXX"
                  inputMode="numeric" mono maxLength={14} id="sf_idValue"
                  valid={aadhaarValid === true && !isErr("idValue")}
                  invalid={isErr("idValue") || (reg2.idValue?.length > 0 && aadhaarValid === false)}
                  hint={aadhaarValid ? "✓ Valid 12-digit Aadhaar"
                    : reg2.idValue?.length > 0 ? `${12 - String(reg2.idValue || "").replace(/\D/g, "").length} digits remaining` : null}
                  icon={aadhaarValid ? "✅" : "🪪"}
                />
              ) : (
                <SmartField label={reg2.idType === "passport" ? "Passport Number" : "ID Number"}
                  required value={reg2.idValue} onChange={(v) => upd("idValue", v)} c={c}
                  placeholder="Enter number..." id="sf_idValue"
                  valid={String(reg2.idValue || "").trim().length > 3 && !isErr("idValue")}
                  invalid={isErr("idValue")}
                />
              )}
            </div>
          </FormSection>

          {/* ═══ Family Member ═══ */}
          <FormSection icon="👨‍👩‍👧" label="Family Member" delay={3} c={c}>
            <SmartField label="Name" required value={reg2.familyMemberName}
              onChange={(v) => upd("familyMemberName", v)} c={c} placeholder="Full name..."
              id="sf_familyMemberName" valid={familyNameFilled && !isErr("familyMemberName")}
              invalid={isErr("familyMemberName")}
            />
            <SmartDropdown label="Relation" required value={reg2.familyMemberRelation}
              onChange={(v) => setReg2((p) => ({ ...(p || {}), familyMemberRelation: v,
                familyMemberRelationOther: v === "other" ? (p?.familyMemberRelationOther || "") : "" }))}
              options={[
                { value: "mother", label: "👩 Mother" },
                { value: "father", label: "👨 Father" },
                { value: "parents", label: "👨‍👩‍👧 Parents" },
                { value: "other", label: "📝 Other" },
              ]}
              c={c} placeholder="Select relation..."
            />
            {reg2.familyMemberRelation === "other" && (
              <SmartField label="Other Relation" required value={reg2.familyMemberRelationOther}
                onChange={(v) => upd("familyMemberRelationOther", v)} c={c} placeholder="Type relation..."
                id="sf_familyMemberRelationOther"
                valid={String(reg2.familyMemberRelationOther || "").trim().length > 0 && !isErr("familyMemberRelationOther")}
                invalid={isErr("familyMemberRelationOther")}
              />
            )}
            <SmartField label="Mobile" required value={reg2.familyMemberMobile}
              onChange={(v) => upd("familyMemberMobile", v)} c={c} placeholder="Phone number..."
              inputMode="tel" mono id="sf_familyMemberMobile"
              valid={isPhoneValid(reg2.familyMemberMobile) && !isErr("familyMemberMobile")}
              invalid={isErr("familyMemberMobile") || (reg2.familyMemberMobile?.length > 0 && !isPhoneValid(reg2.familyMemberMobile))}
            />
          </FormSection>

          {/* ═══ Address ═══ */}
          <FormSection icon="🏠" label="Address" delay={4} c={c}>
            <SmartField label="PIN Code" required value={reg2.pinCode}
              onChange={(v) => upd("pinCode", String(v || "").replace(/\D/g, "").slice(0, 6))}
              c={c} placeholder="6 digits..." inputMode="numeric" maxLength={6} mono id="sf_pinCode"
              valid={pinValid && !pinLooking} invalid={reg2.pinCode?.length === 6 && !pinValid}
              hint={pinLooking ? "Looking up..." : pinHint || null} icon={pinLooking ? "⏳" : "📍"}
            />
            <div className="sm:col-span-2">
              <div className="text-[11px] font-semibold mb-1.5 flex items-center gap-1" style={{ color: c.labelColor }}>
                Complete Address <span style={{ color: c.requiredStar }}>*</span>
              </div>
              <div className="relative">
                <textarea id="sf_address2" value={reg2.address2 || ""}
                  onChange={(e) => upd("address2", e.target.value)}
                  placeholder="Enter complete address..."
                  className="w-full rounded-2xl max-md:rounded-xl border px-4 max-md:px-3.5 py-3 max-md:py-2.5 text-[13px] outline-none min-h-[100px] max-md:min-h-[80px] resize-y will-change-transform"
                  style={{
                    background: isErr("address2") ? c.smartInputError : (addressFilled ? c.smartInputValid : c.inputBg),
                    borderColor: isErr("address2") ? c.smartInputErrorBorder : (addressFilled ? c.smartInputValidBorder : c.inputBorder),
                    color: c.inputText, transition: "border-color .15s, box-shadow .15s, background .15s",
                  }}
                  onFocusCapture={(e) => { e.currentTarget.style.boxShadow = `0 0 0 3px ${c.inputFocusRing}`; e.currentTarget.style.borderColor = c.inputBorderFocus; }}
                  onBlurCapture={(e) => { e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = isErr("address2") ? c.smartInputErrorBorder : (addressFilled ? c.smartInputValidBorder : c.inputBorder); }}
                />
                {addressFilled && !isErr("address2") && (
                  <div className="absolute right-3 top-3 text-[14px]" style={{ color: c.smartInputValidIcon }}>✓</div>
                )}
                {isErr("address2") && (
                  <div className="absolute right-3 top-3 text-[14px]" style={{ color: c.smartInputErrorIcon }}>✗</div>
                )}
              </div>
              {pinHint && (
                <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl max-md:rounded-lg text-[11px] max-md:text-[10px] font-medium"
                  style={{ background: c.smartInputHintBg, border: `1px solid ${c.smartInputHintBorder}`, color: c.smartInputHintText }}>
                  {pinHint}
                  <span className="text-[9px] max-md:text-[8px]" style={{ color: c.t3 }}>(from PIN)</span>
                </div>
              )}
            </div>
          </FormSection>
        </div>
      </div>

      <div className="mt-4 max-md:mt-3 flex gap-3 max-md:gap-2"
        style={{ opacity: 0, animation: "profileFadeUp 0.35s ease-out 0.3s forwards" }}>
        <button type="button" onClick={onClose}
          className="flex-1 px-4 max-md:px-3 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-semibold border active:scale-[0.97]"
          style={{ background: c.btnGhostBg, borderColor: c.btnGhostBorder, color: c.btnGhostText, transition: "transform .1s" }}>
          Cancel
        </button>
        <button type="button" onClick={handleContinue} disabled={busy}
          className="flex-1 px-4 max-md:px-3 py-3 max-md:py-2.5 rounded-2xl max-md:rounded-xl text-[13px] max-md:text-[12px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.97]"
          style={{ background: c.btnSolidBg, color: c.btnSolidText, transition: "transform .1s" }}>
          {busy ? <LoadingSpinner c={{ loadingDot: c.btnSolidText }} size={16} /> : null}
          Continue →
        </button>
      </div>
    </LayerModal>
  );
}

function FormSection({ icon, label, delay = 0, c, children }) {
  return (
    <>
      <div className="sm:col-span-2"
        style={{ opacity: 0, animation: `profileFadeUp 0.35s ease-out ${delay * 80}ms forwards` }}>
        <div className="flex items-center gap-3 max-md:gap-2.5 mt-5 max-md:mt-4 mb-1">
          <span className="text-lg max-md:text-base">{icon}</span>
          <span className="text-[11px] max-md:text-[10px] font-bold uppercase tracking-widest" style={{ color: c.sectionLabel }}>
            {label}
          </span>
          <div className="flex-1 h-px" style={{ background: c.sectionLine }} />
        </div>
      </div>
      {children}
    </>
  );
}
