"use server";

import { ArenaEventStatus, Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createArenaEventWithParticipants,
  createScheduledArenaMatch,
  completeArenaMatch,
  recalculateArenaRankings,
  recordHistoricalRankingsForCompletedEvent,
  revertHistoricalRankingsForDeletedEvent,
} from "@/lib/arena-service";
import {
  createArenaEventSchema,
  createScheduledArenaMatchSchema,
  challengeOpponentSchema,
  completeArenaMatchSchema,
} from "@/lib/validations/arena";

const ARENA_PATH = "/arena";

export type ArenaActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  eventId?: string;
  /** Ensures useActionToast and router.refresh run on every submission. */
  toastKey?: number;
};

const initialState: ArenaActionState = { success: false, message: "" };

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) return null;
  return session;
}

export async function createArenaEventAction(
  prevState: ArenaActionState = initialState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can create arena events.", toastKey: Date.now() };
  }

  const parsed = createArenaEventSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    minSessionsRequired: formData.get("minSessionsRequired"),
    challengesPerParticipant: formData.get("challengesPerParticipant"),
    maxRankDiff: formData.get("maxRankDiff"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      toastKey: Date.now(),
    };
  }

  try {
    const result = await createArenaEventWithParticipants(db, {
      date: new Date(parsed.data.date),
      category: parsed.data.category,
      minSessionsRequired: parsed.data.minSessionsRequired,
      challengesPerParticipant: parsed.data.challengesPerParticipant,
      maxRankDiff: parsed.data.maxRankDiff,
      status: parsed.data.status ?? undefined,
    });
    revalidatePath(ARENA_PATH);
    const n = result.participantCount;
    return {
      success: true,
      message:
        n === 0
          ? "Arena event created with no participants (no members met eligibility for this month/category)."
          : `Arena event created with ${n} participant${n === 1 ? "" : "s"}.`,
      eventId: result.eventId,
      toastKey: Date.now(),
    };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const errDetail =
      err instanceof Error ? `${err.name}: ${err.message}` : String(e);
    const prismaExtra =
      e instanceof Prisma.PrismaClientKnownRequestError
        ? ` [Prisma ${e.code}] ${JSON.stringify(e.meta ?? {})}`
        : "";
    console.error(
      "Create arena event error:",
      errDetail + prismaExtra,
      err instanceof Error ? err.stack : "",
    );
    return {
      success: false,
      message: "Failed to create arena event. Check that eligible members exist.",
      toastKey: Date.now(),
    };
  }
}

export async function startArenaEventAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can start events.", toastKey: Date.now() };
  }

  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) {
    return { success: false, message: "Event ID required.", toastKey: Date.now() };
  }

  const event = await db.arenaEvent.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event || event.status !== ArenaEventStatus.SCHEDULED) {
    return { success: false, message: "Event must be scheduled to start.", toastKey: Date.now() };
  }

  await db.arenaEvent.update({
    where: { id: eventId },
    data: { status: ArenaEventStatus.ACTIVE },
  });
  revalidatePath(ARENA_PATH, "page");
  return { success: true, message: "Event started.", toastKey: Date.now() };
}

export async function completeArenaEventAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can complete events.", toastKey: Date.now() };
  }

  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) {
    return { success: false, message: "Event ID required.", toastKey: Date.now() };
  }

  const event = await db.arenaEvent.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event || event.status !== ArenaEventStatus.ACTIVE) {
    return { success: false, message: "Event must be active to complete.", toastKey: Date.now() };
  }

  await db.$transaction(async (tx) => {
    // Ensure every participant has a final rank (including events with no matches).
    await recalculateArenaRankings(tx, eventId);
    await tx.arenaEvent.update({
      where: { id: eventId },
      data: { status: ArenaEventStatus.COMPLETED },
    });
    await recordHistoricalRankingsForCompletedEvent(tx, eventId);
  });
  revalidatePath(ARENA_PATH, "page");
  return { success: true, message: "Event completed.", toastKey: Date.now() };
}

export async function challengeOpponentAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in to challenge.", toastKey: Date.now() };
  }

  const parsed = challengeOpponentSchema.safeParse({
    eventId: formData.get("eventId"),
    opponentParticipantId: formData.get("opponentParticipantId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      toastKey: Date.now(),
    };
  }

  const member = await db.member.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!member) {
    return { success: false, message: "Member profile not found.", toastKey: Date.now() };
  }

  const myParticipant = await db.arenaParticipant.findFirst({
    where: {
      arenaEventId: parsed.data.eventId,
      memberId: member.id,
    },
    select: { id: true },
  });
  if (!myParticipant) {
    return { success: false, message: "You are not a participant in this event.", toastKey: Date.now() };
  }

  const existingScheduled = await db.arenaMatch.findFirst({
    where: {
      arenaEventId: parsed.data.eventId,
      status: "SCHEDULED",
      OR: [
        { challengerId: myParticipant.id },
        { opponentId: myParticipant.id },
      ],
    },
  });
  if (existingScheduled) {
    return {
      success: false,
      message: "You already have a scheduled match. Play it and wait for the result to be recorded before challenging again.",
      toastKey: Date.now(),
    };
  }

  const result = await db.$transaction(async (tx) =>
    createScheduledArenaMatch(tx, {
      eventId: parsed.data.eventId,
      challengerParticipantId: myParticipant.id,
      opponentParticipantId: parsed.data.opponentParticipantId,
    }),
  );

  if (!result.ok) {
    return { success: false, message: result.error, toastKey: Date.now() };
  }
  revalidatePath(ARENA_PATH, "page");
  return { success: true, message: "Challenge created. Play the match and an admin will enter the result.", toastKey: Date.now() };
}

export async function createScheduledArenaMatchAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can schedule matches.", toastKey: Date.now() };
  }

  const parsed = createScheduledArenaMatchSchema.safeParse({
    eventId: formData.get("eventId"),
    challengerParticipantId: formData.get("challengerParticipantId"),
    opponentParticipantId: formData.get("opponentParticipantId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      toastKey: Date.now(),
    };
  }

  const event = await db.arenaEvent.findUnique({
    where: { id: parsed.data.eventId },
    select: { status: true },
  });
  if (!event || event.status !== ArenaEventStatus.ACTIVE) {
    return { success: false, message: "Start the event before scheduling matches.", toastKey: Date.now() };
  }

  const result = await db.$transaction(async (tx) =>
    createScheduledArenaMatch(tx, {
      eventId: parsed.data.eventId,
      challengerParticipantId: parsed.data.challengerParticipantId,
      opponentParticipantId: parsed.data.opponentParticipantId,
    }),
  );

  if (!result.ok) {
    return { success: false, message: result.error, toastKey: Date.now() };
  }
  revalidatePath(ARENA_PATH, "page");
  return { success: true, message: "Match scheduled. Enter result when played.", toastKey: Date.now() };
}


export async function completeArenaMatchAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can complete matches.", toastKey: Date.now() };
  }

  const parsed = completeArenaMatchSchema.safeParse({
    matchId: formData.get("matchId"),
    challengerScore: formData.get("challengerScore"),
    opponentScore: formData.get("opponentScore"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      toastKey: Date.now(),
    };
  }

  const result = await db.$transaction(async (tx) =>
    completeArenaMatch(tx, {
      matchId: parsed.data.matchId,
      challengerScore: parsed.data.challengerScore,
      opponentScore: parsed.data.opponentScore,
    }),
  );

  if (!result.ok) {
    return { success: false, message: result.error, toastKey: Date.now() };
  }
  revalidatePath(ARENA_PATH, "page");
  return { success: true, message: "Result recorded and rankings updated.", toastKey: Date.now() };
}

export async function deleteArenaEventAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can delete arena events.", toastKey: Date.now() };
  }

  const eventId = formData.get("eventId");
  if (typeof eventId !== "string" || !eventId) {
    return { success: false, message: "Event ID required.", toastKey: Date.now() };
  }

  try {
    await db.$transaction(async (tx) => {
      await revertHistoricalRankingsForDeletedEvent(tx, eventId);
      await tx.arenaEvent.delete({ where: { id: eventId } });
    });
    revalidatePath(ARENA_PATH);
    return { success: true, message: "Arena event deleted.", toastKey: Date.now() };
  } catch (e) {
    console.error("Delete arena event error:", e);
    return { success: false, message: "Failed to delete arena event.", toastKey: Date.now() };
  }
}

export async function deleteScheduledArenaMatchAction(
  _prevState: ArenaActionState,
  formData: FormData,
): Promise<ArenaActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admin can delete scheduled matches.", toastKey: Date.now() };
  }

  const matchId = formData.get("matchId");
  if (typeof matchId !== "string" || !matchId) {
    return { success: false, message: "Match ID required.", toastKey: Date.now() };
  }

  const match = await db.arenaMatch.findUnique({
    where: { id: matchId },
    select: { id: true, status: true },
  });
  if (!match) {
    return { success: false, message: "Match not found.", toastKey: Date.now() };
  }
  if (match.status !== "SCHEDULED") {
    return { success: false, message: "Only scheduled matches can be deleted.", toastKey: Date.now() };
  }

  await db.arenaMatch.delete({ where: { id: matchId } });
  revalidatePath(ARENA_PATH, "page");
  return { success: true, message: "Scheduled match deleted.", toastKey: Date.now() };
}
