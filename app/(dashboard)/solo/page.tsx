import { Role, SessionAttendanceStatus } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageMotion, HeroMotion } from "@/components/ui/motion";
import { computeSoloLeaderboard, type SoloMatchWithPlayers } from "@/lib/solo-service";
import { SoloView } from "@/components/solo/solo-view";
import { Swords } from "lucide-react";

function parseYear(value: string | undefined): number {
  const parsed = parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 2000 && parsed < 2100
    ? parsed
    : new Date().getFullYear();
}

export default async function SoloPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const year = parseYear(params.year as string | undefined);

  const session = await getServerSession(authOptions);
  const canManage = session?.user?.role === Role.ADMIN;

  const [rawMatches, attendanceRows, members] = await Promise.all([
    db.soloMatch.findMany({
      where: { year },
      include: {
        player1: { include: { user: { select: { name: true, email: true, image: true } } } },
        player2: { include: { user: { select: { name: true, email: true, image: true } } } },
      },
      orderBy: { matchDate: "desc" },
    }),
    db.sessionAttendance.groupBy({
      by: ["memberId"],
      where: {
        status: { in: [SessionAttendanceStatus.PRESENT, SessionAttendanceStatus.LATE] },
        session: {
          sessionDate: {
            gte: new Date(`${year}-01-01`),
            lte: new Date(`${year}-12-31`),
          },
        },
      },
      _count: { memberId: true },
    }),
    canManage
      ? db.member.findMany({
          where: { status: "ACTIVE" },
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { user: { name: "asc" } },
        })
      : Promise.resolve([]),
  ]);

  const attendanceByMember = new Map<string, number>(
    attendanceRows.map((row) => [row.memberId, row._count.memberId]),
  );

  const matches = rawMatches as unknown as SoloMatchWithPlayers[];
  const leaderboard = computeSoloLeaderboard(matches, attendanceByMember);

  const availableYears = await getAvailableYears();

  return (
    <PageMotion className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HeroMotion
          title={
            <span className="inline-flex items-center gap-2">
              <Swords className="size-7 text-accent" aria-hidden />
              Solo
            </span>
          }
          subtitle="Yearly individual match rankings. Win matches to climb the leaderboard — each win earns 1 point."
        />
      </div>

      <SoloView
        year={year}
        availableYears={availableYears}
        leaderboard={leaderboard}
        matches={matches}
        canManage={canManage ?? false}
        members={members.map((m) => ({
          id: m.id,
          name: m.user.name ?? m.user.email,
        }))}
      />
    </PageMotion>
  );
}

async function getAvailableYears(): Promise<number[]> {
  const currentYear = new Date().getFullYear();
  const result = await db.soloMatch.groupBy({
    by: ["year"],
    orderBy: { year: "desc" },
  });
  const years = result.map((r) => r.year);
  if (!years.includes(currentYear)) years.unshift(currentYear);
  return years;
}
