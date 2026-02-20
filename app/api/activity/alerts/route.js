// app/api/activity/alerts/route.js
// ✅ GET security alerts — suspicious activities

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { getActivityLogs } from "@/lib/activityLogger";
import { getDb } from "@/lib/mongodb";

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDb();

    // Get critical & warning logs from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const alerts = await db
      .collection("activityLogs")
      .find({
        severity: { $in: ["warning", "critical"] },
        createdAt: { $gte: sevenDaysAgo },
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    // Get locked accounts
    const lockedUsers = await db
      .collection("users")
      .find({ active: false, lockedAt: { $exists: true } })
      .project({ username: 1, lockedAt: 1, lockReason: 1 })
      .toArray();

    // Summary
    const critical = alerts.filter((a) => a.severity === "critical").length;
    const warnings = alerts.filter((a) => a.severity === "warning").length;

    return NextResponse.json({
      alerts,
      lockedUsers,
      summary: {
        total: alerts.length,
        critical,
        warnings,
        lockedAccounts: lockedUsers.length,
      },
    });
  } catch (error) {
    console.error("Alerts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }
}
