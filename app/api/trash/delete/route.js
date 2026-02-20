// app/api/trash/delete/route.js
import { getSession } from "@/lib/session.server";
import { getDb } from "@/lib/mongodb";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { rateLimit, getIP } from "@/lib/rateLimit";
import { validateIds, parseBody } from "@/lib/validate";
import * as api from "@/lib/apiResponse";

export async function DELETE(req) {
  try {
    // Auth
    const session = await getSession();
    if (!session) return api.unauthorized();

    // Rate limit
    const ip = getIP(req);
    const rl = rateLimit(`trash:delete:${session.userId}`, {
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

    // Fetch before deleting (for archive)
    const itemsToDelete = await db
      .collection("trash")
      .find({ _id: { $in: objectIds } })
      .toArray();

    if (itemsToDelete.length === 0) {
      return api.notFound("No matching trash items found");
    }

    // Transaction
    const client = await clientPromise;
    const mongoSession = client.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Archive to deleted_permanently (emergency recovery)
        await db.collection("deleted_permanently").insertMany(
          itemsToDelete.map((item) => ({
            ...item,
            originalTrashId: item._id,
            permanentlyDeletedAt: new Date(),
            deletedBy: session.userId,
            deletedByUsername: session.username,
            deletedByIP: ip,
          })),
          { session: mongoSession }
        );

        // Delete from trash
        await db
          .collection("trash")
          .deleteMany(
            { _id: { $in: objectIds } },
            { session: mongoSession }
          );

        // Audit log
        await db.collection("audit_logs").insertOne(
          {
            action: "TRASH_PERMANENT_DELETE",
            performedBy: session.userId,
            username: session.username,
            role: session.role,
            itemCount: itemsToDelete.length,
            itemIds: ids,
            ip,
            createdAt: new Date(),
          },
          { session: mongoSession }
        );
      });

      return api.success({
        deleted: itemsToDelete.length,
        message: `${itemsToDelete.length} item(s) permanently deleted`,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (e) {
    console.error("[API] DELETE /api/trash/delete error:", e);
    return api.error("Failed to delete items");
  }
}
