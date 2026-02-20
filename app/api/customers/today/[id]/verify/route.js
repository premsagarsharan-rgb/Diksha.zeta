// app/api/customers/today/[id]/verify/route.js
// ✅ MODIFIED — Activity tracking for verify (move to sitting)

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
  const db = await getDb();
  const _id = new ObjectId(params.id);

  const today = await db.collection("todayCustomers").findOne({ _id });
  if (!today) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sittingDoc = {
    name: today.name,
    phone: today.phone,
    gender: today.gender,
    notes: today.notes || "",
    status: "ACTIVE",
    verifiedByUserId: session.userId,
    verifiedAt: new Date(),
    createdAt: today.createdAt || new Date(),
  };

  await db.collection("sittingCustomers").insertOne(sittingDoc);
  await db.collection("todayCustomers").deleteOne({ _id });

  // ═══════ LOG CUSTOMER VERIFIED ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "customer_verify",
    category: "CRUD",
    description: `Verified "${today.name}" → moved to Sitting`,
    meta: {
      customerId: String(_id),
      name: today.name,
      gender: today.gender,
      rollNo: today.rollNo || null,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ ok: true });
}
