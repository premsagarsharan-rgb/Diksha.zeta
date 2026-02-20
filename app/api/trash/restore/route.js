// app/api/trash/restore/route.js
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
    const rl = rateLimit(`trash:restore:${session.userId}`, {
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

    // Find items
    const trashItems = await db
      .collection("trash")
      .find({ _id: { $in: objectIds } })
      .toArray();

    if (trashItems.length === 0) {
      return api.notFound("No matching trash items found");
    }

    // Transaction
    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Prepare customer docs
        const customersToInsert = trashItems.map((item) => {
          const customerData = { ...item.customer };
          return {
            ...customerData,
            restoredAt: new Date(),
            restoredFrom: "trash",
            trashItemId: item._id,
            container: item.container || undefined,
            occupiedDate: item.occupiedDate || undefined,
            kind: item.kind || "SINGLE",
            status: "active",
          };
        });

        await db
          .collection("customers")
          .insertMany(customersToInsert, { session: mongoSession });

        await db
          .collection("trash")
          .deleteMany(
            { _id: { $in: objectIds } },
            { session: mongoSession }
          );

        // Audit log
        await db.collection("audit_logs").insertOne(
          {
            action: "TRASH_RESTORE",
            performedBy: session.userId,
            username: session.username,
            role: session.role,
            itemCount: trashItems.length,
            itemIds: ids,
            ip,
            createdAt: new Date(),
          },
          { session: mongoSession }
        );
      });

      return api.success({
        restored: trashItems.length,
        message: `${trashItems.length} item(s) restored successfully`,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    console.error("[API] POST /api/trash/restore error:", e);
    return api.error("Failed to restore items");
  }
}
