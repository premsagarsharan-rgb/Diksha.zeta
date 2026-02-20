// app/api/auth/logout/route.js
// ✅ MODIFIED — Activity tracking added

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import crypto from "crypto";
import { getDb } from "@/lib/mongodb";
import { getSession, clearSessionCookie } from "@/lib/session.server";
import { logActivity } from "@/lib/activityLogger";

function sha256(s) {
  return crypto.createHash("sha256").update(String(s || "")).digest("hex");
}

export async function POST(req) {
  try {
    const session = await getSession();

    if (session && session.userId && session.sessionToken) {
      const db = await getDb();
      const tokenHash = sha256(session.sessionToken);

      // Get user info BEFORE removing session (for logging)
      const userBefore = await db.collection("users").findOne(
        { _id: new ObjectId(session.userId) },
        { projection: { activeSessions: 1, username: 1 } }
      );

      const sessionsBefore = Array.isArray(userBefore?.activeSessions)
        ? userBefore.activeSessions.length
        : 0;

      // Find which session is being removed
      const removedSession = userBefore?.activeSessions?.find(
        (s) => s.tokenHash === tokenHash
      );

      // Remove ONLY this session
      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        {
          $pull: { activeSessions: { tokenHash } },
          $set: { lastLogoutAt: new Date() },
        }
      );

      // Update activeSessionTokenHash
      const user = await db.collection("users").findOne(
        { _id: new ObjectId(session.userId) },
        { projection: { activeSessions: 1 } }
      );

      const remaining = Array.isArray(user?.activeSessions)
        ? user.activeSessions
        : [];

      await db.collection("users").updateOne(
        { _id: new ObjectId(session.userId) },
        {
          $set: {
            activeSessionTokenHash:
              remaining.length > 0
                ? remaining[remaining.length - 1].tokenHash
                : null,
          },
        }
      );

      // ═══════ LOG LOGOUT ═══════
      const ip =
        req?.headers?.get?.("x-forwarded-for") ||
        req?.headers?.get?.("x-real-ip") ||
        "unknown";
      const device = req?.headers?.get?.("user-agent") || "unknown";

      // Calculate session duration
      let sessionDuration = null;
      if (removedSession?.createdAt) {
        const loginTime = new Date(removedSession.createdAt);
        const logoutTime = new Date();
        sessionDuration = Math.floor((logoutTime - loginTime) / 1000); // seconds
      }

      logActivity({
        userId: session.userId,
        username: session.username || userBefore?.username || "unknown",
        action: "logout",
        category: "AUTH",
        description: `Logged out — session lasted ${
          sessionDuration
            ? sessionDuration < 60
              ? `${sessionDuration}s`
              : sessionDuration < 3600
              ? `${Math.floor(sessionDuration / 60)}m`
              : `${Math.floor(sessionDuration / 3600)}h ${Math.floor((sessionDuration % 3600) / 60)}m`
            : "unknown duration"
        }`,
        meta: {
          sessionDuration,
          sessionsBeforeLogout: sessionsBefore,
          sessionsAfterLogout: remaining.length,
          deviceLabel: removedSession?.deviceLabel || "unknown",
        },
        ip,
        device,
        severity: "info",
      });
    }

    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);

    logActivity({
      userId: "system",
      username: "SYSTEM",
      action: "logout_error",
      category: "SECURITY",
      description: `Logout error: ${error.message}`,
      severity: "critical",
    });

    try {
      await clearSessionCookie();
    } catch {}
    return NextResponse.json({ success: true });
  }
}
