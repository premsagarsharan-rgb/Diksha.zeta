// app/api/trash/undo-delete/route.js
import { getSession } from "@/lib/session.server";
import { getDb } from "@/lib/mongodb";
import clientPromise from "@/lib/mongodb";
import { rateLimit, getIP } from "@/lib/rateLimit";
import { parseBody } from "@/lib/validate";
import * as api from "@/lib/apiResponse";

export async function POST(req) {
  try {
    // Auth
    const session = await getSession();
    if (!session) return api.unauthorized();

    // Rate limit
    const ip = getIP(req);
    const rl = rateLimit(`trash:undo-delete:${session.userId}`, {
      limit: 5,
      windowMs: 60000,
    });
    if (!rl.success) return api.rateLimited(rl.resetIn);

    // Parse body
    const { data, error: parseErr } = await parseBody(req);
    if (parseErr) return api.validationError(parseErr);

    const items = data?.items;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return api.validationError("Items array is required");
    }
    if (items.length > 100) {
      return api.validationError("Maximum 100 items allowed for undo");
    }

    const db = await getDb();

    // Transaction
    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
      let restoredCount = 0;

      await mongoSession.withTransaction(async () => {
        // Clean and re-insert items
        const cleanedItems = items.map((item) => {
          const { _id, ...rest } = item;
          return {
            ...rest,
            trashedAt: rest.trashedAt
              ? new Date(rest.trashedAt)
              : new Date(),
            rejectedAt: rest.rejectedAt
              ? new Date(rest.rejectedAt)
              : new Date(),
            undoneFrom: "delete",
            undoneAt: new Date(),
          };
        });

        const result = await db
          .collection("trash")
          .insertMany(cleanedItems, { session: mongoSession });

        restoredCount = result.insertedCount;

        // Clean up permanent delete archive (within 2 min)
        await db.collection("deleted_permanently").deleteMany(
          {
            permanentlyDeletedAt: {
              $gte: new Date(Date.now() - 2 * 60 * 1000),
            },
            deletedBy: session.userId,
          },
          { session: mongoSession }
        );

        // Audit log
        await db.collection("audit_logs").insertOne(
          {
            action: "TRASH_UNDO_DELETE",
            performedBy: session.userId,
            username: session.username,
            itemCount: restoredCount,
            ip,
            createdAt: new Date(),
          },
          { session: mongoSession }
        );
      });

      return api.success({
        restored: restoredCount,
        message: `Undo successful — ${restoredCount} item(s) restored to trash`,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    console.error("[API] POST /api/trash/undo-delete error:", e);
    return api.error("Failed to undo delete");
  }
}
