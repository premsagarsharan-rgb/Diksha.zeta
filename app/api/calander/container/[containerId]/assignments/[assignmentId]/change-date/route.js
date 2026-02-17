// app/api/calander/container/[containerId]/assignments/[assignmentId]/change-date/route.js
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { getSession } from "@/lib/session.server";
import { addCommit } from "@/lib/commits";
import { checkCooldown } from "@/lib/cooldown";

export const runtime = "nodejs";

function isDateKey(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function ymdLocal(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function isUnlockedNow(container, now) {
  if (!container?.unlockExpiresAt) return false;
  const t = new Date(container.unlockExpiresAt).getTime();
  return Number.isFinite(t) && t > now.getTime();
}
async function countUsed(db, containerId, mode) {
  const inCount = await db
    .collection("calendarAssignments")
    .countDocuments({ containerId, status: "IN_CONTAINER" });

  if (mode === "DIKSHA") {
    const reserved = await db
      .collection("calendarAssignments")
      .countDocuments({
        occupiedContainerId: containerId,
        meetingDecision: "PENDING",
        status: "IN_CONTAINER",
      });
    return inCount + reserved;
  }

  return inCount;
}

export async function POST(req, { params }) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { containerId, assignmentId } = await params;
  const body = await req.json().catch(() => ({}));
  const {
    newDate,
    newOccupiedDate,
    commitMessage,
    moveReason,
    moveMembers,
  } = body || {};

  // ═══════════════════════════════════════
  // VALIDATION 1: Basic inputs
  // ═══════════════════════════════════════
  if (!commitMessage)
    return NextResponse.json(
      { error: "Commit required" },
      { status: 400 }
    );

  const hasNewDate = newDate != null;
  const hasNewOccupy = newOccupiedDate != null;

  if (!hasNewDate && !hasNewOccupy) {
    return NextResponse.json(
      { error: "newDate or newOccupiedDate required" },
      { status: 400 }
    );
  }

  if (hasNewDate && !isDateKey(newDate))
    return NextResponse.json(
      { error: "Invalid newDate format (YYYY-MM-DD)" },
      { status: 400 }
    );
  if (hasNewOccupy && !isDateKey(newOccupiedDate))
    return NextResponse.json(
      { error: "Invalid newOccupiedDate format (YYYY-MM-DD)" },
      { status: 400 }
    );

  const db = await getDb();
  const ctnId = new ObjectId(containerId);
  const aId = new ObjectId(assignmentId);
  const now = new Date();
  const actorLabel = `${session.role}:${session.username}`;

  // ═══════════════════════════════════════
  // VALIDATION 2: Assignment exists + container match
  // ═══════════════════════════════════════
  const assignment = await db
    .collection("calendarAssignments")
    .findOne({ _id: aId });
  if (!assignment)
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });

  if (String(assignment.containerId) !== String(ctnId)) {
    return NextResponse.json(
      { error: "CONTAINER_MISMATCH" },
      { status: 400 }
    );
  }

  const container = await db
    .collection("calendarContainers")
    .findOne({ _id: ctnId });
  if (!container)
    return NextResponse.json(
      { error: "Container not found" },
      { status: 404 }
    );

  // ═══════════════════════════════════════
  // VALIDATION 3: Card not QUALIFIED
  // ═══════════════════════════════════════
  if (assignment.cardStatus === "QUALIFIED") {
    return NextResponse.json(
      { error: "LOCKED_QUALIFIED" },
      { status: 409 }
    );
  }

  // ═══════════════════════════════════════
  // VALIDATION 4: Cooldown check
  // ═══════════════════════════════════════
  const cooldown = await checkCooldown(db, assignment, session.userId);
  if (cooldown.inCooldown) {
    return NextResponse.json(
      {
        error: "COOLDOWN_ACTIVE",
        remainingSec: cooldown.remainingSec,
        expiresAt: cooldown.expiresAt,
        message: `Please wait ${cooldown.remainingSec}s before moving again`,
      },
      { status: 429 }
    );
  }

  // ═══════════════════════════════════════
  // VALIDATION 5: Same date check
  // ═══════════════════════════════════════
  if (hasNewDate && newDate === container.date) {
    return NextResponse.json(
      { error: "SAME_DATE", message: "Already on this date" },
      { status: 400 }
    );
  }
  if (
    hasNewOccupy &&
    !hasNewDate &&
    newOccupiedDate === assignment.occupiedDate
  ) {
    return NextResponse.json(
      { error: "SAME_OCCUPY_DATE", message: "Already occupied on this date" },
      { status: 400 }
    );
  }

  // ═══════════════════════════════════════
  // VALIDATION 5.5: Past date block
  // ═══════════════════════════════════════
  const todayKey = ymdLocal(new Date());

  if (hasNewDate && newDate < todayKey) {
    return NextResponse.json(
      {
        error: "PAST_DATE_NOT_ALLOWED",
        message: `Cannot move to past date (${newDate}). Today is ${todayKey}.`,
      },
      { status: 400 }
    );
  }

  if (hasNewOccupy && newOccupiedDate < todayKey) {
    return NextResponse.json(
      {
        error: "PAST_OCCUPY_NOT_ALLOWED",
        message: `Cannot set occupied date to past (${newOccupiedDate}). Today is ${todayKey}.`,
      },
      { status: 400 }
    );
  }

  // ═══════════════════════════════════════
  // VALIDATION 6: Stale data detection
  // ═══════════════════════════════════════
  if (body.expectedUpdatedAt) {
    const expected = new Date(body.expectedUpdatedAt).getTime();
    const actual = new Date(assignment.updatedAt).getTime();
    if (Math.abs(expected - actual) > 1000) {
      return NextResponse.json(
        {
          error: "STALE_DATA",
          message:
            "Card was modified by someone else. Please refresh and try again.",
        },
        { status: 409 }
      );
    }
  }

  // ═══════════════════════════════════════
  // DETERMINE: Which members to move
  // ═══════════════════════════════════════
  const isGroup =
    (assignment.kind === "COUPLE" || assignment.kind === "FAMILY") &&
    assignment.pairId;

  let assignmentsToMove = [assignment];

  if (isGroup) {
    const allGroupMembers = await db
      .collection("calendarAssignments")
      .find({
        pairId: assignment.pairId,
        status: "IN_CONTAINER",
      })
      .toArray();

    // Check: any member QUALIFIED?
    if (allGroupMembers.some((m) => m.cardStatus === "QUALIFIED")) {
      return NextResponse.json(
        { error: "LOCKED_QUALIFIED", message: "Group member is QUALIFIED" },
        { status: 409 }
      );
    }

    if (moveMembers === "ALL" || !moveMembers) {
      assignmentsToMove = allGroupMembers;
    } else if (moveMembers === "SINGLE") {
      assignmentsToMove = [assignment];
    } else if (Array.isArray(moveMembers)) {
      const moveSet = new Set(moveMembers.map(String));
      assignmentsToMove = allGroupMembers.filter((m) =>
        moveSet.has(String(m._id))
      );
      if (assignmentsToMove.length === 0) {
        return NextResponse.json(
          { error: "No valid members selected" },
          { status: 400 }
        );
      }
    }
  }

  const moveCount = assignmentsToMove.length;
  const movingIds = assignmentsToMove.map((a) => a._id);
  const movingCustIds = assignmentsToMove.map((a) => a.customerId);

  // ═══════════════════════════════════════
  // VALIDATION 7: Date boundary checks
  // ═══════════════════════════════════════
  const isBypass =
    assignment.bypass === true || assignment.occupiedDate === "BYPASS";

  const effectiveOccupied = hasNewOccupy
    ? newOccupiedDate
    : assignment.occupiedDate;
  const effectiveContainerDate = hasNewDate ? newDate : container.date;

  // MEETING mode: newDate must be < occupiedDate
  if (container.mode === "MEETING" && !isBypass && effectiveOccupied) {
    if (hasNewDate && newDate >= effectiveOccupied) {
      return NextResponse.json(
        {
          error: "DATE_CROSSES_OCCUPIED",
          message: `Meeting date (${newDate}) must be before occupied date (${effectiveOccupied})`,
        },
        { status: 400 }
      );
    }
    if (hasNewOccupy && newOccupiedDate <= effectiveContainerDate) {
      return NextResponse.json(
        {
          error: "OCCUPY_BEFORE_MEETING",
          message: `Occupied date (${newOccupiedDate}) must be after meeting date (${effectiveContainerDate})`,
        },
        { status: 400 }
      );
    }
  }

  // ═══════════════════════════════════════
  // PROCESS: Container date change
  // ═══════════════════════════════════════
  let newContainerId = ctnId;
  let newContainerObj = container;

  if (hasNewDate) {
    const newKey = { date: newDate, mode: container.mode };
    await db.collection("calendarContainers").updateOne(
      newKey,
      {
        $setOnInsert: {
          date: newDate,
          mode: container.mode,
          limit: 20,
          createdByUserId: session.userId,
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );

    newContainerObj = await db
      .collection("calendarContainers")
      .findOne(newKey);
    if (!newContainerObj?._id) {
      return NextResponse.json(
        { error: "New container create failed" },
        { status: 500 }
      );
    }
    newContainerId = newContainerObj._id;

    // ═══════════════════════════════════════
    // VALIDATION 8: Target container capacity
    // ═══════════════════════════════════════
    const targetUsed = await countUsed(
      db,
      newContainerId,
      container.mode
    );
    if (targetUsed + moveCount > (newContainerObj.limit || 20)) {
      return NextResponse.json(
        {
          error: "TARGET_HOUSEFULL",
          message: `Target container ${newDate} is full (${targetUsed}/${newContainerObj.limit || 20}). Need ${moveCount} slots.`,
        },
        { status: 409 }
      );
    }

    // ═══════════════════════════════════════
    // VALIDATION 9: Target container lock check
    // ═══════════════════════════════════════
    const targetUsedAfter = targetUsed;
    if (
      targetUsedAfter >= (newContainerObj.limit || 20) &&
      !isUnlockedNow(newContainerObj, now)
    ) {
      return NextResponse.json(
        {
          error: "TARGET_LOCKED",
          message: "Target container is locked at capacity",
        },
        { status: 423 }
      );
    }

    // ═══════════════════════════════════════
    // VALIDATION 10: Race condition guard
    // ═══════════════════════════════════════
    const raceCheck = await db
      .collection("calendarAssignments")
      .findOne({ _id: aId });
    if (
      !raceCheck ||
      raceCheck.status !== "IN_CONTAINER" ||
      String(raceCheck.containerId) !== String(ctnId)
    ) {
      return NextResponse.json(
        {
          error: "RACE_CONDITION",
          message: "Card was moved by another user. Refresh and try again.",
        },
        { status: 409 }
      );
    }
  }

  // ═══════════════════════════════════════
  // PROCESS: Occupied date change
  // ═══════════════════════════════════════
  let newOccupiedContainerId = assignment.occupiedContainerId;

  if (hasNewOccupy && container.mode === "MEETING" && !isBypass) {
    const dikshaKey = { date: newOccupiedDate, mode: "DIKSHA" };
    await db.collection("calendarContainers").updateOne(
      dikshaKey,
      {
        $setOnInsert: {
          date: newOccupiedDate,
          mode: "DIKSHA",
          limit: 20,
          createdByUserId: session.userId,
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );

    const newDikshaContainer = await db
      .collection("calendarContainers")
      .findOne(dikshaKey);
    if (!newDikshaContainer?._id) {
      return NextResponse.json(
        { error: "New Diksha container create failed" },
        { status: 500 }
      );
    }

    const dikshaUsed = await countUsed(
      db,
      newDikshaContainer._id,
      "DIKSHA"
    );
    if (dikshaUsed + moveCount > (newDikshaContainer.limit || 20)) {
      return NextResponse.json(
        {
          error: "DIKSHA_HOUSEFULL",
          message: `Diksha container ${newOccupiedDate} is full (${dikshaUsed}/${newDikshaContainer.limit || 20})`,
        },
        { status: 409 }
      );
    }

    newOccupiedContainerId = newDikshaContainer._id;
  }

  // ═══════════════════════════════════════
  // EXECUTE: Atomic update
  // ═══════════════════════════════════════
  const moveHistoryEntry = {
    fromContainerId: ctnId,
    fromDate: container.date,
    toContainerId: newContainerId,
    toDate: hasNewDate ? newDate : container.date,
    fromOccupiedDate: assignment.occupiedDate || null,
    toOccupiedDate: hasNewOccupy
      ? newOccupiedDate
      : assignment.occupiedDate,
    movedAt: now,
    movedByUserId: session.userId,
    movedByLabel: actorLabel,
    reason: moveReason || null,
    moveMembers: moveCount > 1 ? "GROUP" : "SINGLE",
  };

  const updateFields = {
    updatedAt: now,
    lastMovedAt: now,
  };

  if (hasNewDate) {
    updateFields.containerId = newContainerId;
  }

  if (hasNewOccupy && container.mode === "MEETING" && !isBypass) {
    updateFields.occupiedDate = newOccupiedDate;
    updateFields.occupiedContainerId = newOccupiedContainerId;
  }

  // ═══════════════════════════════════════
  // DETACH LOGIC: If partial group move
  // ═══════════════════════════════════════
  const totalGroupCount = isGroup
    ? await db
        .collection("calendarAssignments")
        .countDocuments({
          pairId: assignment.pairId,
          status: "IN_CONTAINER",
        })
    : 1;

  const isPartialMove = isGroup && moveCount < totalGroupCount;

  if (isPartialMove) {
    await db.collection("calendarAssignments").updateMany(
      { _id: { $in: movingIds } },
      {
        $set: {
          ...updateFields,
          kind: "SINGLE",
          pairId: null,
          roleInPair: null,
        },
        $push: { moveHistory: moveHistoryEntry },
        $inc: { moveCount: 1 },
      }
    );

    const remaining = await db
      .collection("calendarAssignments")
      .find({
        pairId: assignment.pairId,
        status: "IN_CONTAINER",
      })
      .toArray();

    if (remaining.length === 1) {
      await db.collection("calendarAssignments").updateOne(
        { _id: remaining[0]._id },
        {
          $set: {
            kind: "SINGLE",
            pairId: null,
            roleInPair: null,
            updatedAt: now,
          },
        }
      );
    } else if (remaining.length === 2) {
      await db.collection("calendarAssignments").updateMany(
        { pairId: assignment.pairId, status: "IN_CONTAINER" },
        { $set: { kind: "COUPLE", updatedAt: now } }
      );
    }
  } else {
    await db.collection("calendarAssignments").updateMany(
      { _id: { $in: movingIds } },
      {
        $set: updateFields,
        $push: { moveHistory: moveHistoryEntry },
        $inc: { moveCount: 1 },
      }
    );
  }

  // ═══════════════════════════════════════
  // UPDATE: sittingCustomers.activeContainerId
  // ═══════════════════════════════════════
  if (hasNewDate) {
    await db.collection("sittingCustomers").updateMany(
      { _id: { $in: movingCustIds } },
      { $set: { activeContainerId: newContainerId } }
    );
  }

  // ═══════════════════════════════════════
  // COMMIT: Audit trail for each customer
  // ═══════════════════════════════════════
  const commitAction = isPartialMove
    ? "CHANGE_DATE_DETACH"
    : isGroup
    ? "CHANGE_DATE_GROUP"
    : "CHANGE_DATE_SINGLE";

  const commitMeta = {
    fromContainerId: String(ctnId),
    fromDate: container.date,
    toContainerId: String(newContainerId),
    toDate: hasNewDate ? newDate : container.date,
    mode: container.mode,
    fromOccupiedDate: assignment.occupiedDate || null,
    toOccupiedDate: hasNewOccupy
      ? newOccupiedDate
      : assignment.occupiedDate || null,
    moveReason: moveReason || null,
    moveCount: moveCount,
    kind: assignment.kind,
    detached: isPartialMove,
    bypass: isBypass,
  };

  for (const custId of movingCustIds) {
    await addCommit({
      customerId: custId,
      userId: session.userId,
      actorLabel,
      message: commitMessage,
      action: commitAction,
      meta: commitMeta,
    });
  }

  return NextResponse.json({
    ok: true,
    moved: moveCount,
    fromDate: container.date,
    toDate: hasNewDate ? newDate : container.date,
    fromOccupiedDate: assignment.occupiedDate || null,
    toOccupiedDate: hasNewOccupy
      ? newOccupiedDate
      : assignment.occupiedDate || null,
    detached: isPartialMove,
    kind: isPartialMove ? "DETACHED" : assignment.kind,
  });
}
