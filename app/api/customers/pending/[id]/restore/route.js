// app/api/customers/pending/[id]/restore/route.js
// ✅ MODIFIED — Activity tracking for restore from pending

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { addCommit } from "@/lib/commits";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

function getISTDateKey(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);

  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

async function ensureTodayIndexes(db) {
  try {
    await db.collection("todayCustomers").createIndex({ submissionId: 1 }, { unique: true });
  } catch {}
  try {
    await db.collection("todayCustomers").createIndex({ rollDate: 1, rollNo: 1 }, { unique: true });
  } catch {}
  try {
    await db.collection("dailyRollCounters").createIndex({ rollDate: 1 }, { unique: true });
  } catch {}
}

async function allocateDailyRollNo(db, rollDate) {
  const r = await db.collection("dailyRollCounters").findOneAndUpdate(
    { rollDate },
    {
      $inc: { seq: 1 },
      $setOnInsert: { rollDate, createdAt: new Date() },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const doc = r?.value || r;
  const seq = doc?.seq;

  if (!Number.isInteger(seq)) return null;
  if (seq > 500) return "ROLL_LIMIT_REACHED";
  return seq;
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqInfo = extractRequestInfo(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const commitMessage = body?.commitMessage;

  if (!commitMessage) return NextResponse.json({ error: "Commit required" }, { status: 400 });

  const db = await getDb();
  await ensureTodayIndexes(db);

  const _id = new ObjectId(id);

  const pending = await db.collection("pendingCustomers").findOne({ _id });
  if (!pending) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const submissionId = pending.submissionId || `legacy_${String(_id)}`;

  // Dedupe checks
  const alreadyById = await db.collection("todayCustomers").findOne({ _id });
  if (alreadyById) {
    await db.collection("pendingCustomers").deleteOne({ _id });

    // ═══════ LOG RESTORE DEDUPE ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "customer_restore_dedupe",
      category: "CRUD",
      description: `Restore deduped — "${pending.name}" already in Recent`,
      meta: {
        customerId: String(_id),
        name: pending.name,
        rollNo: alreadyById.rollNo,
      },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "info",
    });

    return NextResponse.json({
      ok: true,
      deduped: true,
      id: String(alreadyById._id),
      rollNo: alreadyById.rollNo ?? null,
      rollDate: alreadyById.rollDate ?? null,
    });
  }

  const alreadyBySubmission = await db.collection("todayCustomers").findOne({ submissionId });
  if (alreadyBySubmission) {
    await db.collection("pendingCustomers").deleteOne({ _id });
    return NextResponse.json({
      ok: true,
      deduped: true,
      id: String(alreadyBySubmission._id),
      rollNo: alreadyBySubmission.rollNo ?? null,
      rollDate: alreadyBySubmission.rollDate ?? null,
    });
  }

  const rollDate = getISTDateKey();

  let lastErr = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const rollNo = await allocateDailyRollNo(db, rollDate);
    if (!rollNo) return NextResponse.json({ error: "ROLL_ALLOCATE_FAILED" }, { status: 500 });
    if (rollNo === "ROLL_LIMIT_REACHED") {
      return NextResponse.json({ error: "ROLL_LIMIT_REACHED (1..500 per day)" }, { status: 409 });
    }

    const originalCreatedAt = pending.createdAt || null;

    const doc = {
      ...pending,
      _id,
      submissionId,
      rollDate,
      rollNo,
      status: "RECENT",
      originalCreatedAt,
      createdAt: new Date(),
      restoredAt: new Date(),
      restoredByUserId: session.userId,
    };

    try {
      await db.collection("todayCustomers").insertOne(doc);
      await db.collection("pendingCustomers").deleteOne({ _id });

      const actorLabel = `${session.role}:${session.username}`;

      await addCommit({
        customerId: _id,
        userId: session.userId,
        actorLabel,
        message: commitMessage,
        action: "RESTORE_FROM_PENDING",
        meta: { rollNo, rollDate },
      });

      // ═══════ LOG CUSTOMER RESTORED ═══════
      logActivity({
        userId: session.userId,
        username: session.username,
        action: "customer_restore",
        category: "CRUD",
        description: `Restored "${pending.name}" from Pending → Recent — Roll: ${rollNo}`,
        meta: {
          customerId: String(_id),
          name: pending.name,
          rollNo,
          rollDate,
          originalRollNo: pending.rollNo || null,
          pendingDuration: pending.movedAt
            ? Math.floor((Date.now() - new Date(pending.movedAt).getTime()) / 1000)
            : null,
          commitMessage,
        },
        ip: reqInfo.ip,
        device: reqInfo.device,
        severity: "info",
      });

      return NextResponse.json({ ok: true, id: String(_id), rollNo, rollDate });
    } catch (e) {
      lastErr = e;
      if (String(e?.code) === "11000") continue;
      return NextResponse.json({ error: "Restore failed" }, { status: 500 });
    }
  }

  // ═══════ LOG RESTORE FAILED ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "customer_restore_failed",
    category: "SECURITY",
    description: `Failed to restore "${pending.name}" after 5 attempts`,
    meta: {
      customerId: String(_id),
      name: pending.name,
      error: lastErr?.message,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "critical",
  });

  if (String(lastErr?.code) === "11000") {
    return NextResponse.json({ error: "DUPLICATE (restore collision)" }, { status: 409 });
  }

  return NextResponse.json({ error: "Restore failed" }, { status: 500 });
}
