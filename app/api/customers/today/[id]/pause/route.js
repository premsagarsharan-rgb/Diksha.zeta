// app/api/customers/today/[id]/pause/route.js
// ✅ MODIFIED — Activity tracking for pause (move to pending)

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { addCommit } from "@/lib/commits";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqInfo = extractRequestInfo(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const commitMessage = body?.commitMessage;

  if (!commitMessage) return NextResponse.json({ error: "Commit required" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);

  const customer = await db.collection("todayCustomers").findOne({ _id });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.collection("pendingCustomers").insertOne({
    ...customer,
    _id,
    status: "PENDING",
    movedAt: new Date(),
    movedByUserId: session.userId,
  });

  await db.collection("todayCustomers").deleteOne({ _id });

  await addCommit({
    customerId: _id,
    userId: session.userId,
    message: commitMessage,
    action: "PAUSE_TO_PENDING",
  });

  // ═══════ LOG CUSTOMER PAUSED ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "customer_pause",
    category: "CRUD",
    description: `Paused "${customer.name}" → Pending — Roll: ${customer.rollNo || "N/A"}`,
    meta: {
      customerId: String(_id),
      name: customer.name,
      rollNo: customer.rollNo,
      rollSeq: customer.rollSeq,
      commitMessage,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ ok: true });
}
