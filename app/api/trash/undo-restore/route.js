// app/api/trash/undo-restore/route.js
import { getSession } from "@/lib/session.server";
import { getDb } from "@/lib/mongodb";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { rateLimit, getIP } from "@/lib/rateLimit";
import { validateIds, parseBody } from "@/lib/validate";
import * as api from "@/lib/apiResponse";

export async function POST(req) {
  try {
    // Auth
    const session = await getSession();
    if (!session) return api.unauthorized();

    // Rate limit
    const ip = getIP(req);
    const rl = rateLimit(`trash:undo-restore:${session.userId}`, {
      limit: 10,
      windowMs: 60000,
    });
    if (!rl.success) return api.rateLimited(rl.resetIn);

    // Parse + validate
    const { data, error: parseErr } = await parseBody(req);
    if (parseErr) return api.validationError(parseErr);

    const { valid, ids, error: valErr } = validateIds(data?.ids, {
      maxCount: 50,
    });
    if (!valid) return api.validationError(valErr);

    const db = await getDb();
    const objectIds = ids.map((id) => new ObjectId(id));

    // Find recently restored customers by trashItemId
    let restoredCustomers = await db
      .collection("customers")
      .find({
        restoredFrom: "trash",
        trashItemId: { $in: objectIds },
      })
      .toArray();

    // Fallback: find by time window (within 2 min)
    if (restoredCustomers.length === 0) {
      const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
      restoredCustomers = await db
        .collection("customers")
        .find({
          restoredFrom: "trash",
          restoredAt: { $gte: twoMinAgo },
        })
        .sort({ restoredAt: -1 })
        .limit(ids.length)
        .toArray();
    }

    if (restoredCustomers.length === 0) {
      return api.notFound(
        "No recently restored items found. Undo window (2 min) may have expired."
      );
    }

    // Transaction
    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        const trashItems = restoredCustomers.map((cust) => {
          const {
            restoredAt,
            restoredFrom,
            trashItemId,
            status,
            ...customerData
          } = cust;
          return {
            customer: customerData,
            container: cust.container || undefined,
            occupiedDate: cust.occupiedDate || undefined,
            kind: cust.kind || "SINGLE",
            trashedAt: new Date(),
            rejectedAt: new Date(),
            undoneFrom: "restore",
          };
        });

        await db
          .collection("trash")
          .insertMany(trashItems, { session: mongoSession });

        await db.collection("customers").deleteMany(
          { _id: { $in: restoredCustomers.map((c) => c._id) } },
          { session: mongoSession }
        );

        // Audit log
        await db.collection("audit_logs").insertOne(
          {
            action: "TRASH_UNDO_RESTORE",
            performedBy: session.userId,
            username: session.username,
            itemCount: restoredCustomers.length,
            ip,
            createdAt: new Date(),
          },
          { session: mongoSession }
        );
      });

      return api.success({
        undone: restoredCustomers.length,
        message: `Undo successful — ${restoredCustomers.length} item(s) moved back to trash`,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    console.error("[API] POST /api/trash/undo-restore error:", e);
    return api.error("Failed to undo restore");
  }
}
