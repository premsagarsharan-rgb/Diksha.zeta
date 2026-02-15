// lib/printForm2Client.js
let _templateCache = null;
let _templatePartsCache = null;

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
    return escapeHtml(data?.[key] ?? "");
  });
}

function pickGuardianLabel(rel) {
  const r = String(rel || "").toLowerCase();
  if (r === "father") return "Father's Name";
  if (r === "mother") return "Mother's Name";
  if (r === "husband") return "Husband's Name";
  return "Guardian's Name";
}

function maritalLabel(v) {
  const s = String(v || "").toLowerCase();
  if (["marrid", "married"].includes(s)) return "MARRIED";
  if (["unmarrid", "unmarried"].includes(s)) return "UNMARRIED";
  if (["divorce", "divorcee", "divorced"].includes(s)) return "DIVORCEE";
  if (["virakt"].includes(s)) return "VIRAKT";
  return String(v || "").trim().toUpperCase();
}

function genderLabel(v) {
  const g = String(v || "").toUpperCase();
  if (g === "MALE") return "MALE";
  if (g === "FEMALE") return "FEMALE";
  return String(v || "").trim().toUpperCase() || "";
}

function smartAddress(text) {
  const s = String(text || "").trim();
  if (!s) return "";
  return s.replace(/\s+/g, " ");
}

async function getTemplate() {
  if (_templateCache) return _templateCache;
  const res = await fetch("/print/form2.html", { cache: "no-store" });
  const html = await res.text();
  _templateCache = html;
  return html;
}

async function getTemplateParts() {
  if (_templatePartsCache) return _templatePartsCache;

  const html = await getTemplate();

  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const headInner = doc?.head?.innerHTML || "";
    const pageEl = doc?.querySelector?.(".page");
    const pageTpl = pageEl?.outerHTML || `<div class="page"></div>`;
    _templatePartsCache = { headInner, pageTpl };
    return _templatePartsCache;
  }

  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  const headInner = headMatch ? headMatch[1] : "";

  const pageMatch = html.match(/<div\s+class=["']page["'][^>]*>[\s\S]*<\/div>\s*<\/body>/i);
  const pageTpl = pageMatch ? pageMatch[0].replace(/<\/body>[\s\S]*$/i, "") : `<div class="page"></div>`;

  _templatePartsCache = { headInner, pageTpl };
  return _templatePartsCache;
}

function buildData({ customer, form, source, sequenceNo, meetingDate, cardNo: cardNoOverride }) {
  const gender = String(form?.gender || customer?.gender || "").toUpperCase();

  const state =
    form?.state === "__OTHER__"
      ? String(form?.stateOther || "").trim()
      : String(form?.state || customer?.state || "").trim();

  const city =
    form?.city === "__OTHER__"
      ? String(form?.cityOther || "").trim()
      : String(form?.city || customer?.city || "").trim();

  const address = String(form?.address || customer?.address || "").trim();

  const idType = String(form?.idType || customer?.idType || "aadhaar").toLowerCase();
  const idTypeName = String(form?.idTypeName || customer?.idTypeName || "").trim();
  const idValue = String(form?.idValue || customer?.idValue || "").trim();

  let ID_LABEL = "Aadhaar No";
  if (idType === "passport") ID_LABEL = "Passport No";
  else if (idType === "other") ID_LABEL = `${idTypeName || "Other ID"} No`;

  const phoneFull = `${String(form?.phoneCountryCode || customer?.phoneCountryCode || "").trim()} ${String(
    form?.phoneNumber || customer?.phoneNumber || ""
  ).trim()}`.trim();

  const whatsappFull = `${String(form?.whatsappCountryCode || customer?.whatsappCountryCode || "").trim()} ${String(
    form?.whatsappNumber || customer?.whatsappNumber || ""
  ).trim()}`.trim();

  // Card No: from override (container) → customer fields → empty
  const cardNoRaw = cardNoOverride ?? sequenceNo ?? form?.sequenceNo ?? customer?.sequenceNo ?? customer?.seqNo ?? "";
  const cardNo = cardNoRaw ? (String(cardNoRaw).startsWith("#") ? String(cardNoRaw) : `#${cardNoRaw}`) : "";

  // Form Fill Date: from meetingDate (container) → empty
  let formFillDate = "";
  if (meetingDate) {
    // meetingDate can be "2025-06-15" or Date object
    const d = typeof meetingDate === "string" ? new Date(meetingDate + "T00:00:00") : meetingDate;
    if (d instanceof Date && !isNaN(d.getTime())) {
      formFillDate = d.toLocaleDateString("en-GB"); // dd/mm/yyyy
    }
  }

  return {
    FORM_NO: "",  // Permanent empty
    CARD_NO: cardNo,
    MANTRA_DATE: "___ / ___ / ____",

    NAME: String(form?.name || customer?.name || "").trim().toUpperCase(),
    GUARDIAN_LABEL: pickGuardianLabel(form?.guardianRelation || customer?.guardianRelation),
    GUARDIAN_NAME: String(form?.guardianName || customer?.guardianName || "").trim().toUpperCase(),

    GENDER_VALUE: genderLabel(form?.gender || customer?.gender),
    AGE: String(form?.age || customer?.age || "").trim(),

    MARITAL_VALUE: maritalLabel(form?.maritalStatus || customer?.maritalStatus),

    ADDRESS_FULL: smartAddress(address).toUpperCase(),

    CITY: city.toUpperCase(),
    STATE: state.toUpperCase(),
    PIN: String(form?.pincode || customer?.pincode || "").trim(),

    OCCUPATION: String(form?.occupation || customer?.occupation || "").trim().toUpperCase(),

    PHONE_FULL: phoneFull,
    WHATSAPP_FULL: whatsappFull,

    ID_LABEL,
    ID_VALUE: idValue.toUpperCase(),

    DECL_OK: "✓",

    FM_NAME: String(form?.familyMemberName || customer?.familyMemberName || "").trim().toUpperCase(),
    FM_RELATION: String(form?.familyMemberRelation || customer?.familyMemberRelation || "").trim().toUpperCase(),
    FM_MOBILE: String(form?.familyMemberMobile || customer?.familyMemberMobile || "").trim(),

    FORM_FILL_DATE: formFillDate,
    SOURCE: String(source || "").trim(),
  };
}

export async function buildForm2PrintHtml({ customer, form, source, sequenceNo = null, meetingDate = null, cardNo = null }) {
  const tpl = await getTemplate();
  const data = buildData({ customer, form, source, sequenceNo, meetingDate, cardNo });
  return applyTemplate(tpl, data);
}

export async function openForm2PrintPreview(args) {
  const w = window.open("", "_blank");

  if (!w) {
    alert("Popup blocked! Please allow popups for this site and try again.");
    console.error("🔴 [PrintForm] window.open() returned null — popup is blocked");
    return;
  }

  w.document.write(`
    <!doctype html>
    <html>
    <head><title>Loading Print Preview...</title></head>
    <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5;">
      <div style="text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">🖨️</div>
        <div style="font-size:16px;font-weight:600;color:#333;">Loading Print Preview...</div>
        <div style="font-size:12px;color:#999;margin-top:6px;">Please wait</div>
      </div>
    </body>
    </html>
  `);

  try {
    const html = await buildForm2PrintHtml(args);
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (err) {
    console.error("🔴 [PrintForm] Error:", err);
    w.document.open();
    w.document.write(`
      <!doctype html>
      <html>
      <head><title>Print Error</title></head>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#fff0f0;">
        <div style="text-align:center;max-width:400px;">
          <div style="font-size:32px;margin-bottom:12px;">❌</div>
          <div style="font-size:16px;font-weight:600;color:#c00;">Print Preview Failed</div>
          <div style="font-size:13px;color:#666;margin-top:8px;">${escapeHtml(err?.message || "Unknown error")}</div>
          <button onclick="window.close()" style="margin-top:16px;padding:8px 20px;border:none;background:#333;color:#fff;border-radius:8px;cursor:pointer;font-weight:600;">Close</button>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  }
}

/* ─────────────────────────────────
   PRINT ALL — for container bulk print
   ───────────────────────────────── */
export async function buildForm2PrintAllHtml({ title = "Print All", items = [], source = "", meetingDate = null }) {
  const { headInner, pageTpl } = await getTemplateParts();

  const pages = items.map((it, idx) => {
    const customer = it?.customer || {};
    const form = it?.form || customer;
    const seq = it?.sequenceNo ?? idx + 1;

    const data = buildData({
      customer,
      form,
      source,
      sequenceNo: seq,
      meetingDate: it?.meetingDate || meetingDate || null,
      cardNo: it?.cardNo || null,
    });
    return applyTemplate(pageTpl, data);
  });

  const extraCss = `
    .wrap { padding: 16px; display:flex; flex-direction:column; gap:16px; align-items:center; }
    .page { page-break-after: always; break-after: page; }
    .page:last-child { page-break-after: auto; break-after: auto; }

    @media screen {
      body { display:block !important; padding:0 !important; background:#f7f7f7 !important; }
    }

    .topbar {
      position: sticky; top: 0; z-index: 9999;
      background:#111; color:#fff;
      padding:10px 12px; display:flex; justify-content:space-between; gap:10px; align-items:center;
    }
    .btn {
      border:0; border-radius:10px; padding:10px 12px; font-weight:800; cursor:pointer;
    }
    .btnClose { background: rgba(255,255,255,0.18); color:#fff; }
    .btnPrint { background:#fff; color:#111; }

    @media print {
      .topbar { display:none; }
      .wrap { padding:0; gap:0; }
      body { background:#fff !important; }
    }
  `;

  const safeTitle = escapeHtml(title);

  return `<!doctype html>
<html>
<head>
${headInner}
<title>${safeTitle}</title>
<style>${extraCss}</style>
</head>
<body>
  <div class="topbar">
    <div style="font-weight:900;">${safeTitle} • Total: ${items.length}</div>
    <div style="display:flex; gap:8px;">
      <button class="btn btnClose" id="btnClose" type="button">Close</button>
      <button class="btn btnPrint" id="btnPrint" type="button">Print</button>
    </div>
  </div>

  <div class="wrap">
    ${pages.join("\n")}
  </div>

  <script>
    document.getElementById('btnPrint').addEventListener('click', function(){ window.focus(); window.print(); });
    document.getElementById('btnClose').addEventListener('click', function(){ window.close(); });
  </script>
</body>
</html>`;
}

export async function openForm2PrintAllPreview(args) {
  const w = window.open("", "_blank");

  if (!w) {
    alert("Popup blocked! Please allow popups for this site and try again.");
    console.error("🔴 [PrintAll] window.open() returned null — popup is blocked");
    return;
  }

  w.document.write(`
    <!doctype html>
    <html>
    <head><title>Loading Print All...</title></head>
    <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5;">
      <div style="text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">🖨️</div>
        <div style="font-size:16px;font-weight:600;color:#333;">Loading ${escapeHtml(args?.title || "Print All")}...</div>
        <div style="font-size:12px;color:#999;margin-top:6px;">${args?.items?.length || 0} forms</div>
      </div>
    </body>
    </html>
  `);

  try {
    const html = await buildForm2PrintAllHtml(args);
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (err) {
    console.error("🔴 [PrintAll] Error:", err);
    w.document.open();
    w.document.write(`
      <!doctype html>
      <html>
      <head><title>Print Error</title></head>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;background:#fff0f0;">
        <div style="text-align:center;max-width:400px;">
          <div style="font-size:32px;margin-bottom:12px;">❌</div>
          <div style="font-size:16px;font-weight:600;color:#c00;">Print All Failed</div>
          <div style="font-size:13px;color:#666;margin-top:8px;">${escapeHtml(err?.message || "Unknown error")}</div>
          <button onclick="window.close()" style="margin-top:16px;padding:8px 20px;border:none;background:#333;color:#fff;border-radius:8px;cursor:pointer;font-weight:600;">Close</button>
        </div>
      </body>
      </html>
    `);
    w.document.close();
  }
}
