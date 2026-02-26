import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { submitArenaMatch } from "@/lib/arena-service";
import { submitArenaMatchSchema } from "@/lib/validations/arena";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/arena-events/:id/matches — Admin: submit match result (Step 7, 10).
 */
export async function POST(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: eventId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = submitArenaMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const result = await db.$transaction(async (tx) =>
    submitArenaMatch(tx, {
      eventId,
      challengerParticipantId: parsed.data.challengerParticipantId,
      opponentParticipantId: parsed.data.opponentParticipantId,
      challengerScore: parsed.data.challengerScore,
      opponentScore: parsed.data.opponentScore,
    }),
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ matchId: result.matchId }, { status: 201 });
}
