// app/api/customers/today/route.js
// ✅ CLEANED — Removed: remarks, followYears, clubVisitsBefore, monthYear, pincode, address from frontend
// address is auto-computed server-side from city+state+country

import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { addCommit } from "@/lib/commits";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatRollNo(seq) {
  return `A${pad2(seq)}`;
}

function normalizeRollQuery(q) {
  const s = String(q || "").trim().toUpperCase();
  if (!s) return null;

  const m = s.match(/^A?(\d+)$/);
  if (!m) return null;

  const num = parseInt(m[1], 10);
  if (!Number.isFinite(num) || num < 0) return null;

  return { rollSeq: num, rollNo: formatRollNo(num) };
}

async function ensureIndexes(db) {
  try {
    await db.collection("todayCustomers").createIndex({ submissionId: 1 }, { unique: true });
  } catch {}
  try {
    await db.collection("todayCustomers").createIndex({ rollNo: 1 });
  } catch {}
  try {
    await db.collection("todayCustomers").createIndex({ rollSeq: 1 });
  } catch {}
  try {
    await db.collection("todayCustomers").createIndex({ rollDate: 1 });
  } catch {}
  try {
    await db.collection("globalRollCounters").createIndex({ _id: 1 }, { unique: true });
  } catch {}
}

async function allocateGlobalRoll(db) {
  const r = await db.collection("globalRollCounters").findOneAndUpdate(
    { _id: "CUSTOMER_ROLL_A" },
    {
      $inc: { seq: 1 },
      $setOnInsert: { createdAt: new Date() },
      $set: { updatedAt: new Date() },
    },
    { upsert: true, returnDocument: "after" }
  );

  const doc = r?.value || r;
  const seq = doc?.seq;

  if (!Number.isInteger(seq) || seq < 1) return null;

  return { rollSeq: seq, rollNo: formatRollNo(seq) };
}

export async function GET(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  const db = await getDb();
  await ensureIndexes(db);

  const rollDate = getISTDateKey();
  const filter = { rollDate };

  if (q) {
    const or = [];
    const roll = normalizeRollQuery(q);

    if (roll) {
      or.push({ rollNo: roll.rollNo });
      or.push({ rollSeq: roll.rollSeq });
    }

    const rx = new RegExp(escapeRegex(q), "i");
    or.push({ name: rx });
    or.push({ address: rx });
    or.push({ city: rx });
    or.push({ state: rx });
    or.push({ country: rx });

    or.push({ occupation: rx });
    or.push({ note: rx });
    or.push({ approver: rx });
    or.push({ maritalStatus: rx });
    or.push({ familyPermissionRelation: rx });
    or.push({ familyPermissionOther: rx });
    or.push({ dikshaYear: rx });
    or.push({ vrindavanVisits: rx });
    or.push({ firstDikshaYear: rx });

    or.push({ petNote: rx });
    or.push({ guruNote: rx });
    or.push({ nashaNote: rx });
    or.push({ onionGarlicNote: rx });

    filter.$or = or;
  }

  const items = await db.collection("todayCustomers").find(filter).sort({ createdAt: -1 }).limit(80).toArray();

  // ═══════ LOG SEARCH (only when searching) ═══════
  if (q) {
    const reqInfo = extractRequestInfo(req);
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "customer_search",
      category: "CRUD",
      description: `Searched recent customers: "${q}" — ${items.length} results`,
      meta: { query: q, resultCount: items.length, rollDate },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "info",
    });
  }

  return NextResponse.json({ items });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reqInfo = extractRequestInfo(req);
  const body = await req.json().catch(() => ({}));

  const {
    submissionId,
    commitMessage,
    name,
    age,
    gender = "OTHER",
    country,
    state,
    city,
    occupation,
    note,
    approver,
    maritalStatus,
    remarksBy,
    familyPermission,
    familyPermissionRelation,
    familyPermissionOther,
    dikshaYear,
    vrindavanVisits,
    firstDikshaYear,
    onionGarlic,
    onionGarlicNote,
    hasPet,
    petNote,
    hadTeacherBefore,
    guruNote,
    nasha,
    nashaNote,
  } = body || {};

  if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
  if (!commitMessage) return NextResponse.json({ error: "Commit required" }, { status: 400 });

  if (!name || !age) {
    // ═══════ LOG FAILED CREATE ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "customer_add_failed",
      category: "CRUD",
      description: `Failed to add customer — missing required fields`,
      meta: { reason: "missing_fields", hasName: !!name, hasAge: !!age },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "warning",
    });

    return NextResponse.json({ error: "Missing required fields (name, age)" }, { status: 400 });
  }

  if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  const db = await getDb();
  await ensureIndexes(db);

  const existing = await db.collection("todayCustomers").findOne({ submissionId });
  if (existing) {
    return NextResponse.json({
      ok: true,
      deduped: true,
      id: String(existing._id),
      rollNo: existing.rollNo ?? null,
      rollSeq: existing.rollSeq ?? null,
      rollDate: existing.rollDate ?? null,
    });
  }

  const roll = await allocateGlobalRoll(db);
  if (!roll) return NextResponse.json({ error: "ROLL_ALLOCATE_FAILED" }, { status: 500 });

  const rollDate = getISTDateKey();
  const now = new Date();

  // Server-side address compute from city + state + country
  const computedAddress = [
    String(city || "").trim(),
    String(state || "").trim(),
    String(country || "India").trim(),
  ].filter(Boolean).join(", ");

  if (!computedAddress) {
    return NextResponse.json({ error: "Missing address (country/state/city required)" }, { status: 400 });
  }

  const doc = {
    submissionId,
    rollNo: roll.rollNo,
    rollSeq: roll.rollSeq,
    rollDate,
    name: String(name).trim(),
    age: String(age).trim(),
    gender,
    country: String(country || "India").trim() || "India",
    state: String(state || "").trim(),
    city: String(city || "").trim(),
    address: computedAddress,
    occupation: String(occupation || "").trim(),
    note: String(note || "").trim(),
    approver: String(approver || "").trim(),
    maritalStatus: String(maritalStatus || "").trim(),
    dikshaYear: String(dikshaYear || "").trim(),
    vrindavanVisits: String(vrindavanVisits || "").trim(),
    firstDikshaYear: String(firstDikshaYear || "").trim(),
    remarksBy: String(remarksBy || session.username || "").trim(),
    familyPermission: !!familyPermission,
    familyPermissionRelation: String(familyPermissionRelation || "").trim(),
    familyPermissionOther: String(familyPermissionOther || "").trim(),
    onionGarlic: !!onionGarlic,
    onionGarlicNote: String(onionGarlicNote || "").trim(),
    hasPet: !!hasPet,
    petNote: String(petNote || "").trim(),
    hadTeacherBefore: !!hadTeacherBefore,
    guruNote: String(guruNote || "").trim(),
    nasha: !!nasha,
    nashaNote: String(nashaNote || "").trim(),
    status: "RECENT",
    source: "MANUAL",
    createdByUserId: session.userId,
    createdAt: now,
  };

  try {
    const r = await db.collection("todayCustomers").insertOne(doc);

    const actorLabel = `${session.role}:${session.username}`;

    await addCommit({
      customerId: r.insertedId,
      userId: session.userId,
      actorLabel,
      message: commitMessage,
      action: "CREATE_RECENT",
      meta: { source: doc.source, rollNo: doc.rollNo, rollSeq: doc.rollSeq },
    });

    // ═══════ LOG CUSTOMER CREATED ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "customer_add",
      category: "CRUD",
      description: `Added customer "${doc.name}" — Roll: ${doc.rollNo} — ${doc.city}, ${doc.state}`,
      meta: {
        customerId: String(r.insertedId),
        name: doc.name,
        rollNo: doc.rollNo,
        rollSeq: doc.rollSeq,
        rollDate,
        gender: doc.gender,
        city: doc.city,
        state: doc.state,
        country: doc.country,
      },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "info",
    });

    return NextResponse.json({
      ok: true,
      id: String(r.insertedId),
      rollNo: doc.rollNo,
      rollSeq: doc.rollSeq,
      rollDate,
    });
  } catch (e) {
    if (String(e?.code) === "11000") {
      return NextResponse.json({ error: "DUPLICATE (submissionId)" }, { status: 409 });
    }

    // ═══════ LOG CREATE ERROR ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "customer_add_error",
      category: "SECURITY",
      description: `Failed to create customer — server error`,
      meta: { error: e?.message },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "critical",
    });

    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
