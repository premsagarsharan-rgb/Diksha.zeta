// app/api/activity/stats/route.js
// ✅ GET user activity stats + analytics

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { getUserActivityStats } from "@/lib/activityLogger";

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    const stats = await getUserActivityStats(userId, days);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Activity stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
