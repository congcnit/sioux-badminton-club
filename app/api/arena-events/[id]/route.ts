import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { updateArenaEventSchema } from "@/lib/validations/arena";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/arena-events/:id — Get single arena event (for admin/member).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const event = await db.arenaEvent.findUnique({
    where: { id },
    include: {
      participants: {
        include: { member: { include: { user: true } } },
        orderBy: { rank: "asc" },
      },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}

/**
 * PATCH /api/arena-events/:id — Admin: update event (e.g. status) (Step 10).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateArenaEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const event = await db.arenaEvent.update({
    where: { id },
    data: { ...(parsed.data.status != null && { status: parsed.data.status }) },
  });
  return NextResponse.json(event);
}
