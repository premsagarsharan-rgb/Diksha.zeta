// lib/activityLogger.js
// ✅ Core Activity Tracking Engine
// Har jagah import karke use karo — async, non-blocking

import { getDb } from "@/lib/mongodb";

/*
  ACTION TYPES:
  ─────────────
  AUTH:     login_success, login_failed, logout, session_kicked
  PAGE:     page_visit
  CRUD:     customer_add, customer_edit, customer_delete,
            customer_finalize, customer_pause, customer_verify
  ADMIN:    user_create, user_update, permission_change,
            password_reset, user_activate, user_deactivate,
            max_devices_change
  CALENDAR: assignment_create, assignment_confirm, assignment_reject,
            assignment_done, assignment_out, date_change
  SCREEN:   screen_create, screen_update, screen_delete
  DATA:     data_export, data_download
  SECURITY: suspicious_login, account_locked, rate_limit_hit
*/

const COLLECTION = "activityLogs";

/**
 * Log an activity — fire & forget (non-blocking)
 *
 * @param {Object} opts
 * @param {string} opts.userId      - User ka MongoDB _id
 * @param {string} opts.username    - Username (display ke liye)
 * @param {string} opts.action      - Action type (e.g. "login_success")
 * @param {string} opts.category    - Category: AUTH | PAGE | CRUD | ADMIN | CALENDAR | SCREEN | SECURITY
 * @param {string} [opts.description] - Human readable description
 * @param {Object} [opts.meta]      - Extra data (page, customerId, before/after, etc.)
 * @param {string} [opts.ip]        - IP address
 * @param {string} [opts.device]    - User-Agent / device info
 * @param {string} [opts.sessionToken] - Current session token (hashed store hoga)
 * @param {string} [opts.severity]  - "info" | "warning" | "critical"
 * @param {Object} [opts.geo]       - { city, region, country }
 */
export async function logActivity({
  userId,
  username = "unknown",
  action,
  category = "OTHER",
  description = "",
  meta = {},
  ip = "unknown",
  device = "unknown",
  sessionToken = null,
  severity = "info",
  geo = null,
}) {
  try {
    const db = await getDb();

    const doc = {
      userId: String(userId || "anonymous"),
      username,
      action,
      category: category.toUpperCase(),
      description,
      meta,
      ip,
      device: device?.length > 200 ? device.slice(0, 200) + "..." : device,
      severity,
      geo,
      createdAt: new Date(),
    };

    // ✅ Fire & forget — await mat karo jahan performance chahiye
    await db.collection(COLLECTION).insertOne(doc);
  } catch (err) {
    // Silent fail — activity logging kabhi app crash nahi karega
    console.error("[ActivityLogger] Error:", err.message);
  }
}

/**
 * Bulk log — multiple actions ek saath
 */
export async function logActivitiesBulk(logs = []) {
  if (!logs.length) return;
  try {
    const db = await getDb();
    const docs = logs.map((l) => ({
      userId: String(l.userId || "anonymous"),
      username: l.username || "unknown",
      action: l.action,
      category: (l.category || "OTHER").toUpperCase(),
      description: l.description || "",
      meta: l.meta || {},
      ip: l.ip || "unknown",
      device: l.device || "unknown",
      severity: l.severity || "info",
      geo: l.geo || null,
      createdAt: new Date(),
    }));

    await db.collection(COLLECTION).insertMany(docs);
  } catch (err) {
    console.error("[ActivityLogger] Bulk Error:", err.message);
  }
}

/**
 * Get activity logs with filters + pagination
 */
export async function getActivityLogs({
  userId = null,
  category = null,
  action = null,
  severity = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 50,
  search = "",
} = {}) {
  try {
    const db = await getDb();
    const filter = {};

    if (userId) filter.userId = String(userId);
    if (category) filter.category = category.toUpperCase();
    if (action) filter.action = action;
    if (severity) filter.severity = severity;

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { action: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      db
        .collection(COLLECTION)
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection(COLLECTION).countDocuments(filter),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (err) {
    console.error("[ActivityLogger] Query Error:", err.message);
    return { logs: [], total: 0, page: 1, limit, totalPages: 0 };
  }
}

/**
 * Get activity stats for a user
 */
export async function getUserActivityStats(userId, days = 30) {
  try {
    const db = await getDb();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pipeline = [
      {
        $match: {
          userId: String(userId),
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            action: "$action",
            category: "$category",
          },
          count: { $sum: 1 },
          lastAt: { $max: "$createdAt" },
        },
      },
      { $sort: { count: -1 } },
    ];

    const stats = await db
      .collection(COLLECTION)
      .aggregate(pipeline)
      .toArray();

    // Total counts
    const totalActions = stats.reduce((s, r) => s + r.count, 0);

    // Category breakdown
    const categoryMap = {};
    stats.forEach((r) => {
      const cat = r._id.category;
      categoryMap[cat] = (categoryMap[cat] || 0) + r.count;
    });

    // Daily activity (last N days)
    const dailyPipeline = [
      {
        $match: {
          userId: String(userId),
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ];

    const daily = await db
      .collection(COLLECTION)
      .aggregate(dailyPipeline)
      .toArray();

    return {
      totalActions,
      actionBreakdown: stats,
      categoryBreakdown: categoryMap,
      dailyActivity: daily,
      period: `${days} days`,
    };
  } catch (err) {
    console.error("[ActivityLogger] Stats Error:", err.message);
    return {
      totalActions: 0,
      actionBreakdown: [],
      categoryBreakdown: {},
      dailyActivity: [],
      period: `${days} days`,
    };
  }
}

/**
 * Suspicious activity check
 * Returns true if suspicious pattern detected
 */
export async function checkSuspiciousActivity(userId) {
  try {
    const db = await getDb();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Check failed logins in last hour
    const failedLogins = await db.collection(COLLECTION).countDocuments({
      userId: String(userId),
      action: "login_failed",
      createdAt: { $gte: oneHourAgo },
    });

    // Check different IPs in last hour
    const distinctIPs = await db.collection(COLLECTION).distinct("ip", {
      userId: String(userId),
      category: "AUTH",
      createdAt: { $gte: oneHourAgo },
    });

    const flags = [];

    if (failedLogins >= 5) {
      flags.push({
        type: "BRUTE_FORCE",
        message: `${failedLogins} failed login attempts in last hour`,
        severity: "critical",
      });
    }

    if (distinctIPs.length >= 3) {
      flags.push({
        type: "MULTIPLE_IPS",
        message: `Login from ${distinctIPs.length} different IPs in last hour`,
        severity: "warning",
      });
    }

    return {
      suspicious: flags.length > 0,
      flags,
      failedLogins,
      distinctIPs: distinctIPs.length,
    };
  } catch (err) {
    console.error("[ActivityLogger] Suspicious Check Error:", err.message);
    return { suspicious: false, flags: [], failedLogins: 0, distinctIPs: 0 };
  }
}

/**
 * Cleanup old logs (call via cron or manual)
 */
export async function cleanupOldLogs(daysToKeep = 90) {
  try {
    const db = await getDb();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysToKeep);

    const result = await db
      .collection(COLLECTION)
      .deleteMany({ createdAt: { $lt: cutoff } });

    return { deleted: result.deletedCount };
  } catch (err) {
    console.error("[ActivityLogger] Cleanup Error:", err.message);
    return { deleted: 0 };
  }
}

/**
 * Ensure indexes exist (call once on app startup)
 */
export async function ensureActivityIndexes() {
  try {
    const db = await getDb();
    const col = db.collection(COLLECTION);

    await col.createIndex({ userId: 1, createdAt: -1 });
    await col.createIndex({ category: 1, createdAt: -1 });
    await col.createIndex({ action: 1 });
    await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 90 * 86400 }); // Auto-delete after 90 days
    await col.createIndex({ severity: 1 });
    await col.createIndex(
      { username: "text", action: "text", description: "text" }
    );

    console.log("[ActivityLogger] Indexes ensured ✅");
  } catch (err) {
    console.error("[ActivityLogger] Index Error:", err.message);
  }
}

/**
 * Helper: Extract request info from NextRequest
 */
export function extractRequestInfo(req) {
  return {
    ip:
      req.headers?.get?.("x-forwarded-for") ||
      req.headers?.get?.("x-real-ip") ||
      "unknown",
    device:
      req.headers?.get?.("user-agent") || "unknown",
  };
}
