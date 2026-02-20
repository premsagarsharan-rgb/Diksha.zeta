// app/api/users/[id]/route.js
// ✅ MODIFIED — Activity tracking for user update + permission change + delete

import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { logActivity, extractRequestInfo } from "@/lib/activityLogger";

export const runtime = "nodejs";

const PERM_KEYS = [
  "recent", "add", "calander", "pending", "sitting",
  "tracker", "screensCreate", "screensView", "screens",
];

function normalizePermissionsForSave(nextInput, prevPerms) {
  const raw = { ...(prevPerms || {}), ...(nextInput || {}) };
  if (typeof raw.screens === "boolean") {
    if (typeof raw.screensCreate !== "boolean") raw.screensCreate = raw.screens;
    if (typeof raw.screensView !== "boolean") raw.screensView = raw.screens;
  }
  if (typeof raw.screensCreate === "boolean" || typeof raw.screensView === "boolean") {
    raw.screens = !!(raw.screensCreate || raw.screensView);
  }
  const clean = {};
  for (const k of PERM_KEYS) {
    if (typeof raw[k] === "boolean") clean[k] = raw[k];
  }
  return clean;
}

export async function PATCH(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reqInfo = extractRequestInfo(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const db = await getDb();
  const _id = new ObjectId(id);

  const user = await db.collection("users").findOne(
    { _id },
    { projection: { permissions: 1, role: 1, username: 1, active: 1 } }
  );
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const $set = { updatedAt: new Date() };
  const changes = [];

  if (body.username) {
    $set.username = String(body.username).trim();
    changes.push(`username: "${user.username}" → "${$set.username}"`);
  }

  if (body.role && ["ADMIN", "USER"].includes(body.role)) {
    $set.role = body.role;
    if (body.role !== user.role) {
      changes.push(`role: ${user.role} → ${body.role}`);
    }
  }

  if (typeof body.active === "boolean") {
    $set.active = body.active;
    if (body.active !== user.active) {
      changes.push(`active: ${user.active} → ${body.active}`);
    }
  }

  if (body.password) {
    $set.passwordHash = await bcrypt.hash(String(body.password), 12);
    changes.push("password: reset");
  }

  // Permissions
  let permChanged = false;
  let beforePerms = null;
  let afterPerms = null;

  if (body.permissions && typeof body.permissions === "object") {
    const prev = user.permissions && typeof user.permissions === "object" ? user.permissions : {};
    const clean = normalizePermissionsForSave(body.permissions, prev);
    $set.permissions = clean;

    // Check what actually changed
    beforePerms = { ...prev };
    afterPerms = { ...clean };
    const permChanges = [];
    for (const k of PERM_KEYS) {
      if (prev[k] !== clean[k]) {
        permChanges.push(`${k}: ${!!prev[k]} → ${!!clean[k]}`);
      }
    }
    if (permChanges.length > 0) {
      permChanged = true;
      changes.push(`permissions: ${permChanges.join(", ")}`);
    }
  }

  await db.collection("users").updateOne({ _id }, { $set });

  // ═══════ LOG USER UPDATE ═══════
  if (changes.length > 0) {
    // Determine the primary action
    let action = "user_update";
    let severity = "info";

    if (body.password) {
      action = "password_reset";
      severity = "warning";
    }
    if (typeof body.active === "boolean" && body.active !== user.active) {
      action = body.active ? "user_activate" : "user_deactivate";
      severity = "warning";
    }
    if (permChanged) {
      action = "permission_change";
    }

    logActivity({
      userId: session.userId,
      username: session.username,
      action,
      category: "ADMIN",
      description: `Updated user "${user.username}" — ${changes.join(" | ")}`,
      meta: {
        targetUserId: String(_id),
        targetUsername: user.username,
        changes,
        ...(permChanged ? { beforePerms, afterPerms } : {}),
        ...(body.password ? { passwordReset: true } : {}),
        ...(typeof body.active === "boolean" ? { activeChange: { from: user.active, to: body.active } } : {}),
      },
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const reqInfo = extractRequestInfo(req);
  const { id } = await params;

  if (session.userId === id) {
    // ═══════ LOG SELF-DELETE ATTEMPT ═══════
    logActivity({
      userId: session.userId,
      username: session.username,
      action: "user_delete_self_attempt",
      category: "SECURITY",
      description: `Admin tried to delete own account`,
      meta: {},
      ip: reqInfo.ip,
      device: reqInfo.device,
      severity: "warning",
    });

    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const db = await getDb();
  const _id = new ObjectId(id);

  // Get user info BEFORE delete for logging
  const targetUser = await db.collection("users").findOne(
    { _id },
    { projection: { username: 1, role: 1 } }
  );

  await db.collection("users").deleteOne({ _id });

  // ═══════ LOG USER DELETED ═══════
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "user_delete",
    category: "ADMIN",
    description: `Deleted user "${targetUser?.username || "unknown"}" — Role: ${targetUser?.role || "unknown"}`,
    meta: {
      deletedUserId: String(_id),
      deletedUsername: targetUser?.username,
      deletedRole: targetUser?.role,
    },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "critical",
  });

  return NextResponse.json({ ok: true });
}
