import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session";
import { addCommit } from "@/lib/commits";

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
    or.push({ remarks: rx });
    or.push({ pincode: rx });

    or.push({ occupation: rx });
    or.push({ note: rx });
    or.push({ approver: rx });
    or.push({ maritalStatus: rx });
    or.push({ familyPermissionRelation: rx });
    or.push({ familyPermissionOther: rx });
    or.push({ dikshaYear: rx });
    or.push({ vrindavanVisits: rx });
    or.push({ firstDikshaYear: rx });

    // search in note fields
    or.push({ petNote: rx });
    or.push({ guruNote: rx });
    or.push({ nashaNote: rx });
    or.push({ onionGarlicNote: rx });

    filter.$or = or;
  }

  const items = await db.collection("todayCustomers").find(filter).sort({ createdAt: -1 }).limit(80).toArray();

  return NextResponse.json({ items });
}

export async function POST(req) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const {
    submissionId,
    commitMessage,

    // basic
    name,
    age,
    gender = "OTHER",

    // address
    address,
    country,
    state,
    city,

    // personal
    occupation,
    note,
    approver,
    maritalStatus,
    remarks,
    remarksBy,

    // family permission
    familyPermission,
    familyPermissionRelation,
    familyPermissionOther,

    // diksha
    dikshaYear,
    vrindavanVisits,
    firstDikshaYear,

    // lifestyle booleans
    onionGarlic,
    onionGarlicNote,
    hasPet,
    petNote,
    hadTeacherBefore,
    guruNote,
    nasha,
    nashaNote,

    // legacy optional
    followYears,
    clubVisitsBefore,
    monthYear,
    pincode,
  } = body || {};

  if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });
  if (!commitMessage) return NextResponse.json({ error: "Commit required" }, { status: 400 });

  if (!name || !age) {
    return NextResponse.json({ error: "Missing required fields (name, age)" }, { status: 400 });
  }

  if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
    return NextResponse.json({ error: "Invalid gender" }, { status: 400 });
  }

  const db = await getDb();
  await ensureIndexes(db);

  // submissionId dedupe
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

  const computedAddress =
    String(address || "").trim() ||
    [city, state, country || "India"].map((x) => String(x || "").trim()).filter(Boolean).join(", ");

  if (!computedAddress) {
    return NextResponse.json({ error: "Missing address (country/state/city or address)" }, { status: 400 });
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

    // diksha — plain strings, no validation (normal input)
    dikshaYear: String(dikshaYear || "").trim(),
    vrindavanVisits: String(vrindavanVisits || "").trim(),
    firstDikshaYear: String(firstDikshaYear || "").trim(),

    // remarks — always session username (form creator removed)
    remarks: String(remarks || session.username || "").trim(),
    remarksBy: String(remarksBy || session.username || "").trim(),

    familyPermission: !!familyPermission,
    familyPermissionRelation: String(familyPermissionRelation || "").trim(),
    familyPermissionOther: String(familyPermissionOther || "").trim(),

    // lifestyle booleans + notes
    onionGarlic: !!onionGarlic,
    onionGarlicNote: String(onionGarlicNote || "").trim(),
    hasPet: !!hasPet,
    petNote: String(petNote || "").trim(),
    hadTeacherBefore: !!hadTeacherBefore,
    guruNote: String(guruNote || "").trim(),
    nasha: !!nasha,
    nashaNote: String(nashaNote || "").trim(),

    // legacy
    followYears: String(followYears || "").trim(),
    clubVisitsBefore: String(clubVisitsBefore || "").trim(),
    monthYear: String(monthYear || "").trim(),
    pincode: String(pincode || "").trim(),

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
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
