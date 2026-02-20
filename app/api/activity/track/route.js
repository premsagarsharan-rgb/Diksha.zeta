// app/api/activity/track/route.js
// ✅ POST — Receives client-side tracking data (page visits, idle, clicks)

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { logActivity } from "@/lib/activityLogger";

export async function POST(req) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, category, description, meta } = body;

    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 });
    }

    const ip =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "unknown";
    const device = req.headers.get("user-agent") || "unknown";

    // Fire & forget — don't await
    logActivity({
      userId: session.userId,
      username: session.username,
      action,
      category: category || "PAGE",
      description: description || "",
      meta: meta || {},
      ip,
      device,
      severity: "info",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Track error:", error);
    return NextResponse.json({ ok: true }); // Never fail client tracking
  }
}
