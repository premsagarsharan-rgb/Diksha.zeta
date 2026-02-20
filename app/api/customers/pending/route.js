// app/api/customers/pending/route.js
// ✅ MODIFIED — Activity tracking for pending list view

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
    .collection("pendingCustomers")
    .find({})
    .sort({ movedAt: -1, createdAt: -1 })
    .limit(120)
    .toArray();

  // ═══════ LOG PENDING LIST VIEW ═══════
  const reqInfo = extractRequestInfo(req);
  logActivity({
    userId: session.userId,
    username: session.username,
    action: "pending_list_view",
    category: "PAGE",
    description: `Viewed pending list — ${items.length} items`,
    meta: { count: items.length },
    ip: reqInfo.ip,
    device: reqInfo.device,
    severity: "info",
  });

  return NextResponse.json({ items });
}
