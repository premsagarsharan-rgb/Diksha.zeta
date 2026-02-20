// app/api/customers/sitting/[id]/out/route.js
// ✅ MODIFIED — Activity tracking for sitting out (remove from event)

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqInfo = extractRequestInfo(req);
  const { id } = await params;
  const db = await getDb();
  const customerId = new ObjectId(id);

  // Get customer info for logging
  const customer = await db.collection("sittingCustomers").findOne({ _id: customerId });

  // Find active invite
  const invite = await db.collection("eventInvites").findOne({
    customerId,
    status: "IN_EVENT",
  });

  if (!invite) {
    // ═══════ LOG INVALID OUT ATTEMPT ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "sitting_out_failed",
      category: "CRUD",
      description: `Failed sitting out — "${customer?.name || "unknown"}" not in any active event`,
      meta: {
        customerId: String(customerId),
        name: customer?.name,
        reason: "not_in_event",
      },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "warning",
    });

    return NextResponse.json({ error: "Customer is not in any active event" }, { status: 409 });
  }

  await db.collection("eventInvites").updateOne(
    { _id: invite._id },
    { $set: { status: "OUT", updatedAt: new Date() } }
  );

  await db.collection("sittingCustomers").updateOne(
    { _id: customerId },
    { $set: { status: "ACTIVE", activeEventId: null } }
  );

  // ═══════ LOG SITTING OUT ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "sitting_out",
    category: "CRUD",
    description: `Marked "${customer?.name || "unknown"}" OUT from event`,
    meta: {
      customerId: String(customerId),
      name: customer?.name,
      rollNo: customer?.rollNo,
      eventId: String(invite.eventId || ""),
      inviteId: String(invite._id),
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ ok: true });
}
