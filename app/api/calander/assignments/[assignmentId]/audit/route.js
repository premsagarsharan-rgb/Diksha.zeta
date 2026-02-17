// app/api/calander/assignments/[assignmentId]/audit/route.// app/api/calander/assignments/[assignmentId]/audit/route.js
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";

export const runtime = "nodejs";

function safeId(x) {
  if (!x) return null;
  try { return String(x); } catch { return null; }
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj?.[k];
  return out;
}

function iso(dt) {
  if (!dt) return null;
  try { return new Date(dt).toISOString(); } catch { return null; }
}

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { assignmentId } = await params;
  if (!assignmentId) return NextResponse.json({ error: "Missing assignmentId" }, { status: 400 });

  const db = await getDb();

  let aId;
  try { aId = new ObjectId(assignmentId); }
  catch { return NextResponse.json({ error: "Invalid assignmentId" }, { status: 400 }); }

  const assignment = await db.collection("calendarAssignments").findOne({ _id: aId });
  if (!assignment) return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  const container = assignment.containerId
    ? await db.collection("calendarContainers").findOne({ _id: assignment.containerId })
    : null;

  // customer form data (mostly in sittingCustomers)
  let customer = null;
  if (assignment.customerId) {
    customer = await db.collection("sittingCustomers").findOne({ _id: assignment.customerId });
    if (!customer) customer = await db.collection("pendingCustomers").findOne({ _id: assignment.customerId });
    if (!customer) customer = await db.collection("todayCustomers").findOne({ _id: assignment.customerId });
  }

  // commits in customerCommits (per your lib/commits.js)
  const commitsRaw = assignment.customerId
    ? await db
        .collection("customerCommits")
        .find({ customerId: assignment.customerId })
        .sort({ createdAt: -1 })
        .limit(200)
        .toArray()
    : [];

  const commits = commitsRaw.map((c) => {
    // keep meta minimal (only useful keys)
    const meta = c?.meta || {};
    const metaLite = {
      date: meta?.date || null,
      mode: meta?.mode || null,
      occupiedDate: meta?.occupiedDate || null,
      bypass: meta?.bypass || null,
      meetingDecision: meta?.meetingDecision || null,
      kind: meta?.kind || null,
      pairId: meta?.pairId || null,
      moved: meta?.moved || null,
      detached: meta?.detached || null,
    };

    return {
      action: c?.action || "UNKNOWN",
      actorLabel: c?.actorLabel || "—",
      message: c?.message || "—",
      createdAt: iso(c?.createdAt),
      meta: metaLite,
    };
  });

  // created-by evidence: oldest ASSIGN_* commit
  const createdCommit = [...commits].reverse().find((x) => String(x?.action || "").startsWith("ASSIGN_")) || null;

  // ✅ FORM FIELDS — yahan customize kar sakte ho
  const FORM_FIELDS = [
    "name",
    "address",
    "gender",
    "phone",
    "mobile",
    "age",
    "city",
    "district",
    "state",
    "pincode",
  ];

  const form = customer ? pick(customer, FORM_FIELDS) : {};

  const card = {
    mode: container?.mode || null,
    meetingDate: container?.date || null,
    kind: assignment?.kind || "SINGLE",
    status: assignment?.status || null,
    cardStatus: assignment?.cardStatus || null,
    note: assignment?.note || "",
    bypass: assignment?.bypass === true || assignment?.occupiedDate === "BYPASS",
    occupiedDate: assignment?.occupiedDate || null,
    meetingDecision: assignment?.meetingDecision || null,
    createdAt: iso(assignment?.createdAt),
    updatedAt: iso(assignment?.updatedAt),
    lastMovedAt: iso(assignment?.lastMovedAt),
    moveCount: assignment?.moveCount || 0,
    moveHistory: Array.isArray(assignment?.moveHistory)
      ? assignment.moveHistory.slice(-10).map((m) => ({
          fromDate: m?.fromDate || null,
          toDate: m?.toDate || null,
          fromOccupiedDate: m?.fromOccupiedDate || null,
          toOccupiedDate: m?.toOccupiedDate || null,
          movedByLabel: m?.movedByLabel || null,
          movedAt: iso(m?.movedAt),
          reason: m?.reason || null,
        }))
      : [],
  };

  return NextResponse.json({
    ok: true,
    form,
    card,
    createdBy: createdCommit
      ? {
          actorLabel: createdCommit.actorLabel,
          at: createdCommit.createdAt,
          message: createdCommit.message,
          action: createdCommit.action,
        }
      : null,
    commits,
    serverTime: new Date().toISOString(),
  });
}
