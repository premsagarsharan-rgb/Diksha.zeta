// FILE: lib/printListClient.js
let _templateCache = null;

const RAW_KEYS = new Set(["ROWS", "RESERVED_SECTION"]);

function escapeHtml(s) {
  const str = String(s ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function applyTemplate(tpl, data) {
  return String(tpl || "").replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (_, key) => {
    const v = data?.[key] ?? "";
    if (RAW_KEYS.has(key)) return String(v ?? "");
    return escapeHtml(v);
  });
}

async function getTemplate() {
  if (_templateCache) return _templateCache;
  const res = await fetch("/print/list.html", { cache: "no-store" });
  const html = await res.text();
  _templateCache = html;
  return html;
}

function genderTitle(g) {
  const s = String(g || "").toUpperCase();
  if (s === "MALE") return "Male";
  if (s === "FEMALE") return "Female";
  return "Other";
}

function pickPlace(c) {
  const city = (c?.city === "__OTHER__" ? c?.cityOther : c?.city) || "";
  const state = (c?.state === "__OTHER__" ? c?.stateOther : c?.state) || "";
  const place = [String(city).trim(), String(state).trim()].filter(Boolean).join(" / ");
  return place || "-";
}

function phoneFull(c) {
  const cc = String(c?.phoneCountryCode || "").trim();
  const num = String(c?.phoneNumber || "").trim();
  return `${cc} ${num}`.trim() || "-";
}

function formatDateLabel(d) {
  const s = String(d || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, da] = s.split("-");
    return `${da}/${m}/${y}`;
  }
  return s || "-";
}

function getOccupiedStatus(a) {
  if (a?.bypass === true || a?.occupiedDate === "BYPASS") {
    return "BYPASS";
  }
  return formatDateLabel(a?.occupiedDate) || "-";
}

function maritalStatusLabel(m) {
  const s = String(m || "").toUpperCase();
  if (s === "MARRIED") return "Married";
  if (s === "UNMARRIED") return "Unmarried";
  if (s === "DIVORCED") return "Divorced";
  return "-";
}

function familyConsentLabel(c) {
  const consent = c?.familyConsent || c?.consentGiven;
  return consent ? "Yes" : "No";
}

/**
 * ✅ NEW: Approver label
 * - data source: customer.approver (as you said)
 * - display: first 3 letters uppercase (e.g., "albeli baba" -> "ALB")
 * - if empty -> "-"
 */
function approverLabel(c) {
  const raw = String(c?.approver ?? "").trim();
  if (!raw) return "-";
  const three = raw.replace(/\s+/g, " ").slice(0, 3);
  return three.toUpperCase();
}

function td(val, cls = "") {
  return `<td class="${cls}">${escapeHtml(val ?? "")}</td>`;
}

function buildRows(list = []) {
  return (list || []).map((a, idx) => {
    const c = a?.customer || {};
    const sn = String(c?.createdByUsername || "").trim() || "-";

    return `
      <tr>
        ${td(getOccupiedStatus(a), "small")}
        ${td(String(idx + 1), "small")}
        ${td(c?.name || "-")}
        ${td(approverLabel(c), "approverCell")}
        ${td(genderTitle(c?.gender), "small")}
        ${td(maritalStatusLabel(c?.maritalStatus), "small")}
        ${td(familyConsentLabel(c), "small")}
        ${td(pickPlace(c))}
        ${td(phoneFull(c), "small")}
        ${td(sn, "small")}
      </tr>
    `;
  }).join("\n");
}

function buildReservedSection({ container, reserved = [] }) {
  if (!container || container?.mode !== "DIKSHA") return "";
  if (!reserved || reserved.length === 0) return "";

  return `
    <div class="sectionTitle">Reserved / Occupied • ${escapeHtml(String(reserved.length))}</div>
    <table>
      <thead>
        <tr>
          <th style="width:80px;">Occupied</th>
          <th style="width:40px;">Sr</th>
          <th>Name</th>
          <th style="width:110px;">Approver</th>
          <th style="width:75px;">Gender</th>
          <th style="width:90px;">Marital</th>
          <th style="width:110px;">Family Consent</th>
          <th>Place</th>
          <th style="width:130px;">Contact</th>
          <th style="width:120px;">SN</th>
        </tr>
      </thead>
      <tbody>
        ${buildRows(reserved)}
      </tbody>
    </table>
  `;
}

export async function buildContainerListPrintHtml({
  title = "Container List",
  container,
  assignments = [],
  reserved = [],
}) {
  const tpl = await getTemplate();
  const generatedAt = new Date().toLocaleString("en-GB");

  const rows = buildRows(assignments);
  const reservedSection = buildReservedSection({ container, reserved });

  const total = (assignments?.length || 0) + (reserved?.length || 0);

  return applyTemplate(tpl, {
    TITLE: title,
    DATE: formatDateLabel(container?.date),
    MODE: container?.mode || "-",
    GENERATED_AT: generatedAt,
    TOTAL: String(total),
    ROWS: rows || `<tr><td colspan="10">No customers.</td></tr>`,
    RESERVED_SECTION: reservedSection,
  });
}

export async function openContainerListPrintPreview(args) {
  const html = await buildContainerListPrintHtml(args);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    alert("Popup blocked. Please allow popups for printing.");
    return;
  }

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
