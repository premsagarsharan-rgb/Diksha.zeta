// app/api/activity/compare/route.js
// ✅ GET — Compare 2 users' activity side-by-side

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
    const userA = searchParams.get("userA");
    const userB = searchParams.get("userB");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!userA || !userB) {
      return NextResponse.json(
        { error: "userA and userB required" },
        { status: 400 }
      );
    }

    const [statsA, statsB] = await Promise.all([
      getUserActivityStats(userA, days),
      getUserActivityStats(userB, days),
    ]);

    return NextResponse.json({
      userA: { userId: userA, ...statsA },
      userB: { userId: userB, ...statsB },
      comparison: {
        totalDiff: statsA.totalActions - statsB.totalActions,
        moreActive: statsA.totalActions >= statsB.totalActions ? "userA" : "userB",
      },
    });
  } catch (error) {
    console.error("Compare error:", error);
    return NextResponse.json(
      { error: "Comparison failed" },
      { status: 500 }
    );
  }
}
