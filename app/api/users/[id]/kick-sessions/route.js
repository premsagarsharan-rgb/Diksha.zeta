// app/api/users/[userId]/kick-sessions/route.js
// ✅ MODIFIED — Activity tracking for session kick

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

  if (session.role !== "ADMIN") {
    // ═══════ LOG UNAUTHORIZED KICK ATTEMPT ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "session_kick_unauthorized",
      category: "SECURITY",
      description: `Non-admin "${session.username}" tried to kick sessions`,
      meta: { role: session.role },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "critical",
    });

    return NextResponse.json({ error: "Only ADMIN can kick sessions" }, { status: 403 });
  }

  const p = await params;
  const userId = p.userId || p.id;
  const db = await getDb();

  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const previousCount = Array.isArray(user.activeSessions) ? user.activeSessions.length : 0;

  // Capture session details BEFORE clearing (for audit)
  const kickedSessions = (user.activeSessions || []).map((s) => ({
    deviceLabel: s.deviceLabel || "Unknown",
    ip: s.ip || "unknown",
    createdAt: s.createdAt,
  }));

  // Clear ALL sessions
  await db.collection("users").updateOne(
    { _id: new ObjectId(userId) },
    {
      $set: {
        activeSessions: [],
        activeSessionTokenHash: null,
        lastKickedAt: new Date(),
        lastKickedByUserId: session.userId,
      },
    }
  );

  // ═══════ LOG SESSION KICK ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "session_kicked",
    category: "ADMIN",
    description: `Kicked ALL ${previousCount} session(s) for "${user.username}"`,
    meta: {
      targetUserId: String(userId),
      targetUsername: user.username,
      sessionsKicked: previousCount,
      kickedSessions,
      adminAction: true,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "warning",
  });

  // ═══════ ALSO LOG FROM TARGET USER's PERSPECTIVE ═══════
  logActivity({
    userId: String(userId),
    username: user.username,
    action: "session_force_logout",
    category: "SECURITY",
    description: `All ${previousCount} session(s) force-terminated by admin "${session.username}"`,
    meta: {
      kickedByUserId: session.userId,
      kickedByUsername: session.username,
      sessionsKicked: previousCount,
      kickedSessions,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "critical",
  });

  return NextResponse.json({
    success: true,
    userId,
    username: user.username,
    sessionsKicked: previousCount,
  });
}
