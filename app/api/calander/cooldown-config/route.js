// app/api/calander/cooldown-config/route.js
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import {
  getCooldownMinutes,
  getCooldownOptions,
  DEFAULT_COOLDOWN_MINUTES,
} from "@/lib/cooldown";

export const runtime = "nodejs";

// GET — Get cooldown config for a user (or default)
export async function GET(req) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const targetUserId = searchParams.get("userId");

  const db = await getDb();

  // If admin checking specific user
  if (targetUserId && session.role === "ADMIN") {
    const minutes = await getCooldownMinutes(
      db,
      new ObjectId(targetUserId)
    );
    return NextResponse.json({
      userId: targetUserId,
      minutes,
      isDefault: minutes === DEFAULT_COOLDOWN_MINUTES,
      options: getCooldownOptions(),
    });
  }

  // Self check
  const minutes = await getCooldownMinutes(db, session.userId);
  return NextResponse.json({
    userId: String(session.userId),
    minutes,
    isDefault: minutes === DEFAULT_COOLDOWN_MINUTES,
    options: getCooldownOptions(),
  });
}

// PATCH — Admin sets cooldown for specific user
export async function PATCH(req) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only ADMIN can change cooldown config" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { userId, minutes } = body || {};

  if (!userId)
    return NextResponse.json({ error: "userId required" }, { status: 400 });

  const validOptions = getCooldownOptions();
  if (!validOptions.includes(minutes)) {
    return NextResponse.json(
      {
        error: `Invalid minutes. Options: ${validOptions.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const db = await getDb();
  const targetId = new ObjectId(userId);
  const now = new Date();

  // Deactivate old overrides
  await db.collection("cooldownOverrides").updateMany(
    { userId: targetId, active: true },
    { $set: { active: false, deactivatedAt: now } }
  );

  // If default, just remove override
  if (minutes === DEFAULT_COOLDOWN_MINUTES) {
    return NextResponse.json({
      ok: true,
      userId,
      minutes,
      message: "Reset to default",
    });
  }

  // Insert new override
  await db.collection("cooldownOverrides").insertOne({
    userId: targetId,
    minutes,
    active: true,
    setByUserId: session.userId,
    setByLabel: `${session.role}:${session.username}`,
    createdAt: now,
  });

  return NextResponse.json({
    ok: true,
    userId,
    minutes,
    message: `Cooldown set to ${minutes} minutes`,
  });
}
