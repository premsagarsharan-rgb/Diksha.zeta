// lib/rateLimit.js

const rateLimitMap = new Map();
const CLEANUP_INTERVAL = 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, data] of rateLimitMap) {
    if (now - data.windowStart > data.windowMs) {
      rateLimitMap.delete(key);
    }
  }
}

export function rateLimit(key, { limit = 30, windowMs = 60000 } = {}) {
  cleanup();
  const now = Date.now();
  const data = rateLimitMap.get(key);

  if (!data || now - data.windowStart > windowMs) {
    rateLimitMap.set(key, { count: 1, windowStart: now, windowMs });
    return { success: true, remaining: limit - 1, resetIn: windowMs };
  }

  data.count++;
  if (data.count > limit) {
    const resetIn = windowMs - (now - data.windowStart);
    return { success: false, remaining: 0, resetIn };
  }

  return {
    success: true,
    remaining: limit - data.count,
    resetIn: windowMs - (now - data.windowStart),
  };
}

export function getIP(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
