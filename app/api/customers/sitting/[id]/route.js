// app/api/customers/sitting/[id]/route.js
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { addCommit } from "@/lib/commits";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

async function unwrapParams(params) {
  if (params && typeof params.then === "function") return await params;
  return params || {};
}

export async function GET(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = await unwrapParams(params);
  const id = p?.id;
  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const db = await getDb();
  const _id = new ObjectId(id);

  const customer = await db.collection("sittingCustomers").findOne({ _id });
  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reqInfo = extractRequestInfo(req);
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "sitting_customer_view",
    category: "CRUD",
    description: `Viewed sitting customer "${customer.name}" — Roll: ${customer.rollNo || "N/A"}`,
    meta: {
      customerId: String(_id),
      name: customer.name,
      rollNo: customer.rollNo,
      status: customer.status,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ ok: true, customer });
}

export async function PATCH(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqInfo = extractRequestInfo(req);
  const p = await unwrapParams(params);
  const id = p?.id;

  const body = await req.json().catch(() => ({}));
  const commitMessage = body?.commitMessage;

  if (!id || !ObjectId.isValid(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  if (!commitMessage) return NextResponse.json({ error: "Commit required" }, { status: 400 });

  const allowed = [
    "name", "age", "address", "address2", "followYears", "clubVisitsBefore", "monthYear",
    "onionGarlic", "onionGarlicNote",
    "hasPet", "petNote",
    "hadTeacherBefore", "guruNote",
    "familyPermission",
    "gender", "country", "state", "city", "pincode",
    "guardianRelation", "guardianName",
    "phoneCountryCode", "phoneNumber",
    "whatsappCountryCode", "whatsappNumber",
    "idType", "idTypeName", "idValue",
    "occupation", "note", "approver", "maritalStatus",
    "remarks", "remarksBy",
    "familyPermissionRelation", "familyPermissionOther",
    "dikshaYear", "vrindavanVisits", "firstDikshaYear",
    "nasha", "nashaNote",
    "familyMemberName", "familyMemberRelation",
    "familyMemberRelationOther", "familyMemberMobile",
    "familyMemberCountryCode",
  ];

  const $set = { updatedAt: new Date() };
  const changedFields = [];

  for (const k of allowed) {
    if (body?.[k] !== undefined) {
      $set[k] = typeof body[k] === "string" ? body[k].trim() : body[k];
      changedFields.push(k);
    }
  }

  if ($set.gender && !["MALE", "FEMALE", "OTHER"].includes($set.gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  const db = await getDb();
  const _id = new ObjectId(id);

  const before = await db.collection("sittingCustomers").findOne({ _id });

  const r = await db.collection("sittingCustomers").updateOne({ _id }, { $set });
  if (!r.matchedCount) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await addCommit({
    customerId: _id,
    userId: session.userId,
    message: commitMessage,
    action: "EDIT_PROFILE",
    meta: { source: "SITTING", fields: changedFields },
  });

  const beforeValues = {};
  const afterValues = {};
  changedFields.forEach((f) => {
    beforeValues[f] = before?.[f] ?? null;
    afterValues[f] = $set[f] ?? null;
  });

  logActivity({
    userId: session.userId,
    username: session.username,
    action: "sitting_customer_edit",
    category: "CRUD",
    description: `Edited sitting "${before?.name || "unknown"}" — ${changedFields.length} field(s): ${changedFields.join(", ")}`,
    meta: {
      customerId: String(_id),
      name: before?.name,
      rollNo: before?.rollNo,
      changedFields,
      before: beforeValues,
      after: afterValues,
      commitMessage,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ ok: true });
}
