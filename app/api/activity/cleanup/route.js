// app/api/activity/cleanup/route.js
// ✅ POST — Cleanup old activity logs (Admin only)

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { cleanupOldLogs, ensureActivityIndexes } from "@/lib/activityLogger";

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const days = body.days || 90;

    // Ensure indexes
    await ensureActivityIndexes();

    // Cleanup
    const result = await cleanupOldLogs(days);

    return NextResponse.json({
      success: true,
      deleted: result.deleted,
      message: `Deleted ${result.deleted} logs older than ${days} days`,
    });
  } catch (error) {
    console.error("Cleanup error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}
