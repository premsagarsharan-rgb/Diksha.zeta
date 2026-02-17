// lib/session.js
// ✅ Client-safe utilities only (NO next/headers, NO mongodb, NO crypto)
// IMPORTANT: Server/App Route Handlers MUST use "@/lib/session.server"

function parseCookieHeader(cookieHeader) {
  const out = {};
  const raw = String(cookieHeader || "");
  if (!raw) return out;

  raw.split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i === -1) return;
    const k = part.slice(0, i).trim();
    const v = part.slice(i + 1).trim();
    if (!k) return;
    out[k] = decodeURIComponent(v);
  });
  return out;
}

/**
 * Reads session cookie JSON (NO DB VALIDATION).
 * Use only for display hints, never for security decisions.
 */
export function readSessionFromCookieHeader(cookieHeader) {
  const cookies = parseCookieHeader(cookieHeader);
  const raw = cookies.session;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Browser helper: reads from document.cookie
 */
export function readSessionFromBrowserCookie() {
  if (typeof document === "undefined") return null;
  return readSessionFromCookieHeader(document.cookie || "");
}
