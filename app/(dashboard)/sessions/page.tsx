import { AttendanceManagement } from "@/components/attendance/attendance-management";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isActiveMemberWithUser } from "@/lib/prisma-scope";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

const INITIAL_SESSION_LIMIT = 5;

export default async function SessionsPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === Role.ADMIN;

  let currentMember: { id: string } | null = null;
  if (session?.user?.id != null) {
    const row = await db.member.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        deletedAt: true,
        user: { select: { deletedAt: true } },
      },
    });
    if (row && isActiveMemberWithUser(row)) {
      currentMember = { id: row.id };
    }
  }

  const [sessions, totalCount, membersUnfiltered] = await Promise.all([
    db.badmintonSession.findMany({
      include: {
        attendances: {
          include: {
            member: {
              include: { user: true },
            },
          },
        },
        court: {
          select: { name: true },
        },
      },
      orderBy: {
        sessionDate: "desc",
      },
      take: INITIAL_SESSION_LIMIT,
    }),
    db.badmintonSession.count(),
    db.member.findMany({
      where: {
        user: {
          role: {
            not: Role.ADMIN,
          },
        },
      },
      include: { user: true },
      orderBy: { memberCode: "asc" },
    }),
  ]);

  const members = membersUnfiltered.filter(isActiveMemberWithUser);

  const sessionItems = sessions.map((session) => ({
    id: session.id,
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    registrationDeadline: session.registrationDeadline ?? null,
    courtId: session.courtId ?? null,
    courtName: session.court?.name ?? null,
    notes: session.notes,
    status: session.status,
    attendees: session.attendances.map((attendance) => ({
      memberId: attendance.memberId,
      memberName: attendance.member.user.name ?? attendance.member.user.email,
      status: attendance.status,
      fineAmount: attendance.fineAmount,
      note: attendance.note,
    })),
  }));

  const courtItems = await db.court.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const memberItems = members.map((member) => ({
    id: member.id,
    name: member.user.name ?? member.user.email,
  }));

  return (
    <AttendanceManagement
      initialSessions={sessionItems}
      totalSessionCount={totalCount}
      limitStep={INITIAL_SESSION_LIMIT}
      members={memberItems}
      courts={courtItems}
      canManage={isAdmin}
      currentMemberId={currentMember?.id ?? null}
    />
  );
}
