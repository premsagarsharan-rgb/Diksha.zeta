// lib/printTokenClient.js
"use client";

/**
 * 🎫 Token Print
 *
 * Opens token template via API route and injects data.
 * Template file: public/token.html
 * API route: /api/token-template
 *
 * Template me change karna ho to sirf public/token.html edit karo.
 * No rebuild needed. No JS change needed.
 *
 * ══════════════════════════════════════════════
 * CUSTOMER FIELDS USED IN TOKEN:
 *
 * Header "M"/"F"           → customer.gender
 * Date                     → container.date
 * Token no                 → sequenceNo (idx+1)
 *
 * नाम और उम्र              → customer.name + (customer.age)
 * कहाँ से                   → customer.address2
 * सत्संग श्रवण              → customer.dikshaYear
 * वृन्दावन कितनी बार        → customer.vrindavanVisits
 * दीक्षा प्रथम उपस्थिति    → customer.firstDikshaYear
 * OCCUPATION               → customer.occupation
 * नशा इत्यादि              → customer.nasha + nashaNote
 * पालतू जानवर               → customer.hasPet + petNote
 * पूर्व में दीक्षा          → customer.hadTeacherBefore + guruNote
 * पारिवारिक सहमति           → customer.familyPermissionRelation
 * Remark                   → customer.note
 *
 * Footer left              → customer.approver
 * Footer middle            → customer.remarksBy
 * Footer right             → EMPTY (signature)
 * ══════════════════════════════════════════════
 */
export async function openTokenPrintPreview({ title, date, mode, items, container }) {
  if (!items?.length) return;

  var win = window.open("/api/token-template", "_blank");
  if (!win) {
    alert("Popup blocked! Please allow popups for token printing. 🎫");
    return;
  }

  var injectData = {
    title: title || (date + " / " + mode + " • Tokens"),
    date: date || "",
    mode: mode || "MEETING",
    items: items.map(function (item, idx) {
      var c = item.customer || {};
      return {
        sequenceNo: item.sequenceNo || idx + 1,
        customer: {
          // Basic
          name: c.name || "",
          age: c.age || "",
          gender: c.gender || "",

          // कहाँ से → address2
          address: c.address || "",

          // सत्संग श्रवण → dikshaYear
          dikshaYear: c.dikshaYear || "",

          // वृन्दावन कितनी बार → vrindavanVisits
          vrindavanVisits: c.vrindavanVisits || "",

          // दीक्षा प्रथम → firstDikshaYear
          firstDikshaYear: c.firstDikshaYear || "",

          // OCCUPATION
          occupation: c.occupation || "",

          // नशा → boolean + note
          nasha: typeof c.nasha === "boolean" ? c.nasha : null,
          nashaNote: c.nashaNote || "",

          // पालतू → boolean + note
          hasPet: typeof c.hasPet === "boolean" ? c.hasPet : null,
          petNote: c.petNote || "",

          // पूर्व दीक्षा → boolean + note
          hadTeacherBefore: typeof c.hadTeacherBefore === "boolean" ? c.hadTeacherBefore : null,
          guruNote: c.guruNote || "",

          // पारिवारिक सहमति
          familyPermissionRelation: c.familyPermissionRelation || "",

          // Remark → note
          note: c.note || "",

          // Footer
          approver: c.approver || "",
          remarksBy: c.remarksBy || "",
        },
        kind: item.kind || "SINGLE",
      };
    }),
  };

  var attempts = 0;
  var maxAttempts = 80;

  var interval = setInterval(function () {
    attempts++;

    try {
      if (win.closed) {
        clearInterval(interval);
        return;
      }

      if (typeof win.__INJECT_TOKENS__ === "function") {
        clearInterval(interval);
        win.__INJECT_TOKENS__(injectData);
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("Token template failed to load within timeout");
      }
    } catch (e) {
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error("Token print injection failed:", e);
      }
    }
  }, 100);
}
