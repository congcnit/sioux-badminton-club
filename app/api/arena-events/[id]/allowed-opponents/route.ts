import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/arena-events/:id/allowed-opponents?participantId=... — Member: list opponents a participant can challenge (Step 11).
 * Rules: rank diff ≤ event.maxRankDiff, not already challenged, same event, challenger has challenges remaining.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  const url = new URL(request.url);
  const participantId = url.searchParams.get("participantId");
  if (!participantId) {
    return NextResponse.json(
      { error: "participantId is required" },
      { status: 400 },
    );
  }

  const [event, participant] = await Promise.all([
    db.arenaEvent.findUnique({
      where: { id: eventId },
      select: { maxRankDiff: true },
    }),
    db.arenaParticipant.findUnique({
      where: { id: participantId, arenaEventId: eventId },
      select: { id: true, rank: true, challengesRemaining: true },
    }),
  ]);
  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }
  if (participant.challengesRemaining <= 0) {
    return NextResponse.json({ allowedOpponents: [] });
  }

  const maxRankDiff = event?.maxRankDiff ?? 2;
  const myRank = participant.rank ?? 0;
  const alreadyChallenged = await db.arenaMatch.findMany({
    where: { challengerId: participantId },
    select: { opponentId: true },
  });
  const opposedIds = new Set(alreadyChallenged.map((m) => m.opponentId));

  const others = await db.arenaParticipant.findMany({
    where: {
      arenaEventId: eventId,
      id: { not: participantId },
    },
    include: {
      member: { include: { user: { select: { name: true, email: true } } } },
    },
    orderBy: { rank: "asc" },
  });

  const allowed = others.filter((p) => {
    if (opposedIds.has(p.id)) return false;
    const rank = p.rank ?? 0;
    const diff = Math.abs(myRank - rank);
    return diff >= 1 && diff <= maxRankDiff;
  });

  const allowedOpponents = allowed.map((p) => ({
    participantId: p.id,
    memberName: p.member.user.name ?? p.member.user.email,
    rank: p.rank,
  }));

  return NextResponse.json({ allowedOpponents });
}
