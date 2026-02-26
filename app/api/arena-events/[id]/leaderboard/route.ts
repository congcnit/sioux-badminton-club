import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/arena-events/:id/leaderboard — Leaderboard (Step 9, 11).
 * Returns participant, member info, rank, points, challengesRemaining, sorted by rank ascending.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await db.arenaEvent.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const participants = await db.arenaParticipant.findMany({
    where: { arenaEventId: id },
    include: {
      member: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
    orderBy: { rank: "asc" },
  });

  const leaderboard = participants.map((p) => ({
    participantId: p.id,
    memberId: p.memberId,
    memberName: p.member.user.name ?? p.member.user.email,
    memberEmail: p.member.user.email,
    memberImage: p.member.user.image,
    rank: p.rank,
    points: p.points,
    challengesRemaining: p.challengesRemaining,
  }));

  return NextResponse.json({ leaderboard });
}
