// app/api/customers/sitting/route.js
// ✅ MODIFIED — Activity tracking for sitting list + direct create

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = await getDb();
  const items = await db
    .collection("sittingCustomers")
    .find({})
    .sort({ verifiedAt: -1 })
    .limit(200)
    .toArray();

  // ═══════ LOG SITTING LIST VIEW ═══════
  const reqInfo = extractRequestInfo(req);
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "sitting_list_view",
    category: "PAGE",
    description: `Viewed sitting list — ${items.length} items`,
    meta: { count: items.length },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ items });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqInfo = extractRequestInfo(req);
  const body = await req.json();
  const { name, phone, gender, notes } = body || {};

  if (!name || !phone || !gender) {
    // ═══════ LOG FAILED DIRECT CREATE ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "sitting_direct_create_failed",
      category: "CRUD",
      description: `Failed to create sitting customer — missing fields`,
      meta: { hasName: !!name, hasPhone: !!phone, hasGender: !!gender },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "warning",
    });

    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  const db = await getDb();
  const doc = {
    name: String(name).trim(),
    phone: String(phone).trim(),
    gender,
    notes: String(notes || "").trim(),
    status: "ACTIVE",
    activeEventId: null,
    verifiedByUserId: session.userId,
    verifiedAt: new Date(),
    createdAt: new Date(),
    source: "MANUAL_DIRECT",
  };

  const r = await db.collection("sittingCustomers").insertOne(doc);

  // ═══════ LOG SITTING DIRECT CREATE ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "sitting_direct_create",
    category: "CRUD",
    description: `Directly created sitting customer "${doc.name}" — ${doc.gender}`,
    meta: {
      customerId: String(r.insertedId),
      name: doc.name,
      gender: doc.gender,
      phone: doc.phone,
      source: "MANUAL_DIRECT",
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ ok: true, id: String(r.insertedId) });
}
