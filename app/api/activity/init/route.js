// app/api/activity/init/route.js
// ✅ POST — Initialize activity log indexes (run once)

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { ensureActivityIndexes } from "@/lib/activityLogger";

export async function POST() {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureActivityIndexes();

    return NextResponse.json({
      success: true,
      message: "Activity log indexes created ✅",
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json(
      { error: "Init failed" },
      { status: 500 }
    );
  }
}
