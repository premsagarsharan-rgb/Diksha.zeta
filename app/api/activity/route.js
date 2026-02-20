// app/api/activity/route.js
// ✅ GET activity logs with filters + pagination

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { getActivityLogs } from "@/lib/activityLogger";

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const result = await getActivityLogs({
      userId: searchParams.get("userId") || null,
      category: searchParams.get("category") || null,
      action: searchParams.get("action") || null,
      severity: searchParams.get("severity") || null,
      dateFrom: searchParams.get("dateFrom") || null,
      dateTo: searchParams.get("dateTo") || null,
      page: parseInt(searchParams.get("page") || "1", 10),
      limit: parseInt(searchParams.get("limit") || "50", 10),
      search: searchParams.get("search") || "",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Activity logs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
