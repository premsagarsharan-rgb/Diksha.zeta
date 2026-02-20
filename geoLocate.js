// lib/geoLocate.js
// ✅ IP se City/State/Country detect karo
// Free API use — no API key needed

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get geo location from IP address
 * Uses free ip-api.com (45 req/min limit)
 *
 * @param {string} ip
 * @returns {{ city, region, country, lat, lon, isp, timezone }}
 */
export async function getGeoFromIP(ip) {
  // Skip local/private IPs
  if (
    !ip ||
    ip === "unknown" ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.")
  ) {
    return {
      city: "Local",
      region: "Local",
      country: "Local",
      lat: null,
      lon: null,
      isp: "Local Network",
      timezone: null,
    };
  }

  // Clean IP (handle comma-separated forwarded IPs)
  const cleanIP = ip.split(",")[0].trim();

  // Check cache
  const cached = cache.get(cleanIP);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${cleanIP}?fields=status,city,regionName,country,lat,lon,isp,timezone`,
      { signal: AbortSignal.timeout(3000) } // 3 second timeout
    );

    if (!res.ok) throw new Error("Geo API failed");

    const json = await res.json();

    if (json.status !== "success") {
      throw new Error("Geo lookup failed");
    }

    const result = {
      city: json.city || "Unknown",
      region: json.regionName || "Unknown",
      country: json.country || "Unknown",
      lat: json.lat || null,
      lon: json.lon || null,
      isp: json.isp || "Unknown",
      timezone: json.timezone || null,
    };

    // Cache it
    cache.set(cleanIP, { data: result, time: Date.now() });

    return result;
  } catch (err) {
    console.error("[GeoLocate] Error:", err.message);
    return {
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
      lat: null,
      lon: null,
      isp: "Unknown",
      timezone: null,
    };
  }
}

/**
 * Format geo for display
 */
export function formatGeo(geo) {
  if (!geo) return "Unknown Location";
  if (geo.city === "Local") return "🏠 Local Network";
  return `${geo.city}, ${geo.region}, ${geo.country}`;
}

/**
 * Check if login is from new/different location
 */
export async function isNewLocation(userId, currentGeo, db) {
  if (!currentGeo || currentGeo.city === "Local" || currentGeo.city === "Unknown") {
    return false;
  }

  try {
    // Get last 10 login locations for this user
    const recentLogs = await db
      .collection("activityLogs")
      .find({
        userId: String(userId),
        action: "login_success",
        "geo.city": { $exists: true },
      })
      .sort({ createdAt: -1 })
      .limit(10)
      .project({ "geo.city": 1, "geo.region": 1 })
      .toArray();

    if (recentLogs.length === 0) return false; // First login, not suspicious

    const knownCities = new Set(
      recentLogs.map((l) => `${l.geo?.city}-${l.geo?.region}`)
    );

    const currentKey = `${currentGeo.city}-${currentGeo.region}`;

    return !knownCities.has(currentKey);
  } catch {
    return false;
  }
}
