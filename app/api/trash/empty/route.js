// app/api/trash/empty/route.js
import { getSession } from "@/lib/session.server";
import { getDb } from "@/lib/mongodb";
import clientPromise from "@/lib/mongodb";
import { rateLimit, getIP } from "@/lib/rateLimit";
import * as api from "@/lib/apiResponse";

export async function DELETE(req) {
  try {
    // Auth — admin only
    const session = await getSession();
    if (!session) return api.unauthorized();

    if (session.role !== "admin") {
      return api.forbidden("Only admins can empty trash");
    }

    // Strict rate limit
    const ip = getIP(req);
    const rl = rateLimit(`trash:empty:${session.userId}`, {
      limit: 3,
      windowMs: 300000,
    });
    if (!rl.success) return api.rateLimited(rl.resetIn);

    const db = await getDb();

    const allTrashItems = await db
      .collection("trash")
      .find({})
      .toArray();

    if (allTrashItems.length === 0) {
      return api.success({ deleted: 0, message: "Trash is already empty" });
    }

    // Transaction
    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Archive everything
        await db.collection("deleted_permanently").insertMany(
          allTrashItems.map((item) => ({
            ...item,
            originalTrashId: item._id,
            permanentlyDeletedAt: new Date(),
            deletedBy: session.userId,
            deletedByUsername: session.username,
            deletedByIP: ip,
            deletedVia: "EMPTY_TRASH",
          })),
          { session: mongoSession }
        );

        // Empty trash
        await db
          .collection("trash")
          .deleteMany({}, { session: mongoSession });

        // Audit log
        await db.collection("audit_logs").insertOne(
          {
            action: "TRASH_EMPTY_ALL",
            performedBy: session.userId,
            username: session.username,
            role: session.role,
            itemCount: allTrashItems.length,
            ip,
            createdAt: new Date(),
          },
          { session: mongoSession }
        );
      });

      return api.success({
        deleted: allTrashItems.length,
        message: `Trash emptied — ${allTrashItems.length} items permanently deleted`,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    console.error("[API] DELETE /api/trash/empty error:", e);
    return api.error("Failed to empty trash");
  }
}
