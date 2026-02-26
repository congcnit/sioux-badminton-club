import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createArenaEventWithParticipants } from "@/lib/arena-service";
import { createArenaEventSchema } from "@/lib/validations/arena";

/**
 * GET /api/arena-events — List arena events (for dashboard).
 */
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const status = url.searchParams.get("status");
  const events = await db.arenaEvent.findMany({
    where: {
      ...(category && { category: category as "MEN" | "WOMEN" }),
      ...(status && { status: status as "SCHEDULED" | "ACTIVE" | "COMPLETED" }),
    },
    include: {
      participants: { select: { id: true } },
      _count: { select: { matches: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { date: "desc" }],
    take: 50,
  });
  return NextResponse.json({ events });
}

/**
 * POST /api/arena-events — Admin: create arena event (Step 10).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createArenaEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const date = new Date(parsed.data.date);
  const status = parsed.data.status ?? undefined;

  try {
    const result = await db.$transaction(async (tx) => {
      return createArenaEventWithParticipants(tx, {
        date,
        category: parsed.data.category,
        minSessionsRequired: parsed.data.minSessionsRequired,
        challengesPerParticipant: parsed.data.challengesPerParticipant,
        maxRankDiff: parsed.data.maxRankDiff,
        status,
      });
    });
    return NextResponse.json({ eventId: result.eventId }, { status: 201 });
  } catch (e) {
    console.error("Create arena event error:", e);
    return NextResponse.json(
      { error: "Failed to create arena event" },
      { status: 500 },
    );
  }
}
