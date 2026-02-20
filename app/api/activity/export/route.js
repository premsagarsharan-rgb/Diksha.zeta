// app/api/activity/export/route.js
// ✅ GET — Export activity logs as CSV

import { NextResponse } from "next/server";
import { getSession } from "@/lib/session.server";
import { getDb } from "@/lib/mongodb";

export async function GET(req) {
  try {
    const session = await getSession();
    if (!session || session.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || null;
    const days = parseInt(searchParams.get("days") || "30", 10);

    const db = await getDb();
    const since = new Date();
    since.setDate(since.getDate() - days);

    const filter = { createdAt: { $gte: since } };
    if (userId) filter.userId = userId;

    const logs = await db
      .collection("activityLogs")
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(5000)
      .toArray();

    // Build CSV
    const headers = [
      "Date",
      "Time",
      "Username",
      "Action",
      "Category",
      "Severity",
      "Description",
      "IP",
      "Device",
      "Location",
    ];

    const rows = logs.map((l) => {
      const d = new Date(l.createdAt);
      return [
        d.toLocaleDateString("en-IN"),
        d.toLocaleTimeString("en-IN"),
        l.username || "",
        l.action || "",
        l.category || "",
        l.severity || "",
        `"${(l.description || "").replace(/"/g, '""')}"`,
        l.ip || "",
        `"${(l.device || "").slice(0, 50).replace(/"/g, '""')}"`,
        l.geo ? `${l.geo.city}, ${l.geo.country}` : "",
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="activity-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
