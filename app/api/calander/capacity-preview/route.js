// app/api/calander/capacity-preview/route.js
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";

export const runtime = "nodejs";

function isDateKey(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function GET(req) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const mode = searchParams.get("mode");

  if (!from || !to || !mode)
    return NextResponse.json(
      { error: "Missing from/to/mode" },
      { status: 400 }
    );
  if (!["DIKSHA", "MEETING"].includes(mode))
    return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  if (!isDateKey(from) || !isDateKey(to))
    return NextResponse.json(
      { error: "Invalid date format" },
      { status: 400 }
    );

  const db = await getDb();

  // Get all containers in range for this mode
  const containers = await db
    .collection("calendarContainers")
    .find({
      mode,
      date: { $gte: from, $lte: to },
    })
    .toArray();

  if (!containers.length) {
    return NextResponse.json({ capacities: {} });
  }

  const containerMap = {};
  const containerIds = [];
  for (const ctn of containers) {
    const id = String(ctn._id);
    containerMap[id] = {
      date: ctn.date,
      limit: ctn.limit || 20,
      containerId: id,
    };
    containerIds.push(ctn._id);
  }

  // Count IN_CONTAINER assignments per container
  const inCounts = await db
    .collection("calendarAssignments")
    .aggregate([
      {
        $match: {
          containerId: { $in: containerIds },
          status: "IN_CONTAINER",
        },
      },
      {
        $group: {
          _id: "$containerId",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const inMap = {};
  for (const row of inCounts) {
    inMap[String(row._id)] = row.count;
  }

  // For DIKSHA: also count reserved (occupied from MEETING)
  let reservedMap = {};
  if (mode === "DIKSHA") {
    const reservedCounts = await db
      .collection("calendarAssignments")
      .aggregate([
        {
          $match: {
            occupiedContainerId: { $in: containerIds },
            meetingDecision: "PENDING",
            status: "IN_CONTAINER",
          },
        },
        {
          $group: {
            _id: "$occupiedContainerId",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    for (const row of reservedCounts) {
      reservedMap[String(row._id)] = row.count;
    }
  }

  // Build response: { "2025-01-15": { limit, used, reserved, remaining, percent, tier } }
  const capacities = {};
  for (const [id, ctn] of Object.entries(containerMap)) {
    const inCount = inMap[id] || 0;
    const reservedCount = reservedMap[id] || 0;
    const used =
      mode === "DIKSHA" ? inCount + reservedCount : inCount;
    const remaining = Math.max(0, ctn.limit - used);
    const percent =
      ctn.limit > 0 ? Math.round((used / ctn.limit) * 100) : 0;

    let tier = "OK"; // green
    if (remaining <= 0) tier = "FULL"; // black
    else if (percent >= 80) tier = "HIGH"; // red
    else if (percent >= 50) tier = "MID"; // yellow

    capacities[ctn.date] = {
      containerId: id,
      limit: ctn.limit,
      inCount,
      reserved: reservedCount,
      used,
      remaining,
      percent,
      tier,
    };
  }

  return NextResponse.json({ capacities });
}
