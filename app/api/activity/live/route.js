// app/api/activity/live/route.js
// ✅ Server-Sent Events — Real-time activity feed

import { getDb } from "@/lib/mongodb";
import { readSessionFromCookieHeader } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // Basic auth check from cookie
  const cookieHeader = req.headers.get("cookie") || "";
  const sessionData = readSessionFromCookieHeader(cookieHeader);

  if (!sessionData?.userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = await getDb();

  // Verify admin
  const { ObjectId } = await import("mongodb");
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(sessionData.userId), active: true },
    { projection: { role: 1 } }
  );

  if (!user || user.role !== "ADMIN") {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial heartbeat
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: "connected" })}\n\n`)
      );

      let lastId = null;

      const poll = async () => {
        if (closed) return;

        try {
          const filter = {};
          if (lastId) {
            filter._id = { $gt: new (await import("mongodb")).ObjectId(lastId) };
          } else {
            // First poll: get last 10
            const recent = await db
              .collection("activityLogs")
              .find()
              .sort({ _id: -1 })
              .limit(10)
              .toArray();

            if (recent.length > 0) {
              lastId = recent[0]._id.toString();

              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({
                    type: "initial",
                    logs: recent.reverse(),
                  })}\n\n`
                )
              );
            }

            setTimeout(poll, 2000);
            return;
          }

          const newLogs = await db
            .collection("activityLogs")
            .find(filter)
            .sort({ _id: 1 })
            .limit(20)
            .toArray();

          if (newLogs.length > 0) {
            lastId = newLogs[newLogs.length - 1]._id.toString();

            for (const log of newLogs) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: "new", log })}\n\n`
                )
              );
            }
          }

          // Heartbeat
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "heartbeat", time: Date.now() })}\n\n`
            )
          );
        } catch (err) {
          console.error("[LiveFeed] Error:", err.message);
        }

        if (!closed) setTimeout(poll, 2000);
      };

      poll();

      // Cleanup on close
      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
