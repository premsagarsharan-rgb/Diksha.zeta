// app/api/trash/route.js
import { getSession } from "@/lib/session.server";
import { getDb } from "@/lib/mongodb";
import { rateLimit, getIP } from "@/lib/rateLimit";
import * as api from "@/lib/apiResponse";

export async function GET(req) {
  try {
    // Auth check
    const session = await getSession();
    if (!session) return api.unauthorized();

    // Rate limit
    const ip = getIP(req);
    const rl = rateLimit(`trash:get:${session.userId}:${ip}`, {
      limit: 30,
      windowMs: 60000,
    });
    if (!rl.success) return api.rateLimited(rl.resetIn);

    const db = await getDb();

    const items = await db
      .collection("trash")
      .find({})
      .sort({ trashedAt: -1 })
      .limit(500)
      .toArray();

    return api.success({ items, count: items.length });
  } catch (e) {
    console.error("[API] GET /api/trash error:", e);
    return api.error("Failed to load trash");
  }
}
