import Link from "next/link";
import { ChallengeStatus, type RankingCategory, Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { completeChallengeAction } from "@/app/(dashboard)/rankings/actions";
import { authOptions } from "@/lib/auth";
import { ChallengeManagement } from "@/components/ranking/challenge-management";
import { PageMotion, HeroMotion } from "@/components/ui/motion";
import { SportCard, SportCardHeader } from "@/components/ui/sport-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { Medal, Trophy } from "lucide-react";
import { RankingsTabs } from "@/components/rankings/rankings-tabs";

const RANKINGS_PAGE_SIZE = 10;
const TAB_PARAM = "tab";
const PAGE_PARAM = "page";

type TabValue = "mens" | "womens";

function toCategory(tab: TabValue): RankingCategory {
  return tab === "womens" ? "WOMENS_SINGLES" : "MENS_SINGLES";
}

function parseTab(value: string | undefined): TabValue {
  if (value === "womens") return "womens";
  return "mens";
}

function parsePage(value: string | undefined): number {
  if (value == null || value === "") return 1;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const tab = parseTab(params[TAB_PARAM] as string | undefined);
  const page = parsePage(params[PAGE_PARAM] as string | undefined);
  const category = toCategory(tab);

  const session = await getServerSession(authOptions);
  const canManage = session?.user?.role === Role.ADMIN;

  const [rankings, totalRankings, challenges, matches] = await Promise.all([
    db.ranking.findMany({
      where: { category },
      include: {
        member: { include: { user: true } },
      },
      orderBy: { score: "desc" },
      skip: (page - 1) * RANKINGS_PAGE_SIZE,
      take: RANKINGS_PAGE_SIZE,
    }),
    db.ranking.count({ where: { category } }),
    db.challenge.findMany({
      where: { category },
      include: {
        challenger: { include: { user: true } },
        challenged: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.match.findMany({
      where: { category },
      include: { ratingChanges: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
  ]);

  const memberIds = Array.from(
    new Set(
      matches.flatMap((m) => [m.player1Id, m.player2Id, m.winnerId]),
    ),
  );
  const membersForMatches =
    memberIds.length > 0
      ? await db.member.findMany({
          where: { id: { in: memberIds } },
          include: { user: true },
        })
      : [];
  const memberById = new Map(membersForMatches.map((m) => [m.id, m]));

  const playerOptions = await db.ranking
    .findMany({
      where: { category },
      orderBy: { score: "desc" },
      select: { memberId: true, member: { select: { user: true } } },
    })
    .then((list) =>
      list.map((r, i) => ({
        memberId: r.memberId,
        memberName: r.member.user.name ?? r.member.user.email,
        rank: i + 1,
      })),
    );

  const rankBadgeClass = (index: number) => {
    const globalIndex = (page - 1) * RANKINGS_PAGE_SIZE + index;
    if (globalIndex === 0)
      return "bg-sport-gold/20 text-sport-gold border border-sport-gold/40";
    if (globalIndex === 1)
      return "bg-sport-silver/20 text-sport-silver border border-sport-silver/40";
    if (globalIndex === 2)
      return "bg-sport-bronze/20 text-sport-bronze border border-sport-bronze/40";
    return "bg-muted/80 text-muted-foreground border border-border";
  };

  const totalPages = Math.max(1, Math.ceil(totalRankings / RANKINGS_PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;
  const baseUrl = `/rankings?${TAB_PARAM}=${tab}`;

  const acceptedChallenges = challenges.filter(
    (c) => c.status === ChallengeStatus.ACCEPTED,
  );

  return (
    <PageMotion className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HeroMotion
          title="Rankings"
          subtitle="Men's Singles and Women's Singles rankings, challenges, and match history."
        />
        <div className="flex gap-2">
          {canManage ? (
            <Button asChild variant="sport">
              <Link href="/matches/new">Add Match</Link>
            </Button>
          ) : null}
        </div>
      </div>

      <RankingsTabs currentTab={tab} />

      {/* 1. Rankings table with pagination */}
      <SportCard variant="leaderboard" className="overflow-hidden">
        <SportCardHeader
          title={
            tab === "womens"
              ? "Women's Singles – Player rankings"
              : "Men's Singles – Player rankings"
          }
          subtitle={`Sorted by rating (wins / losses / total). Page ${page} of ${totalPages}.`}
        />
        <div className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="text-right">Wins</TableHead>
                <TableHead className="text-right">Losses</TableHead>
                <TableHead className="text-right">Matches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.map((ranking, index) => (
                <TableRow
                  key={ranking.id}
                  className="transition-colors hover:bg-muted/30"
                >
                  <TableCell>
                    <span
                      className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${rankBadgeClass(index)}`}
                    >
                      {(page - 1) * RANKINGS_PAGE_SIZE + index + 1}
                    </span>
                  </TableCell>
                  <TableCell>
                    {ranking.member.user.name ??
                      ranking.member.user.email}
                  </TableCell>
                  <TableCell className="text-right">
                    {ranking.score.toFixed(0)}
                  </TableCell>
                  <TableCell className="text-right">{ranking.wins}</TableCell>
                  <TableCell className="text-right">{ranking.losses}</TableCell>
                  <TableCell className="text-right">{ranking.matches}</TableCell>
                </TableRow>
              ))}
              {!rankings.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-4">
                    <EmptyState
                      title="No ranking data yet"
                      description="Submit match results in this category to start Elo-based ranking."
                      icon={Medal}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {totalRankings > RANKINGS_PAGE_SIZE ? (
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="text-sm text-muted-foreground">
                {(page - 1) * RANKINGS_PAGE_SIZE + 1}–
                {Math.min(
                  page * RANKINGS_PAGE_SIZE,
                  totalRankings,
                )}{" "}
                of {totalRankings}
              </span>
              <div className="flex gap-2">
                {hasPrev ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${baseUrl}&${PAGE_PARAM}=${page - 1}`}>
                      Previous
                    </Link>
                  </Button>
                ) : null}
                {hasNext ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`${baseUrl}&${PAGE_PARAM}=${page + 1}`}>
                      Next
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </SportCard>

      {/* 2. Challenge Queue */}
      <ChallengeManagement
        category={category}
        canManage={canManage}
        players={playerOptions}
        challenges={challenges.map((c) => ({
          id: c.id,
          challengerId: c.challengerId,
          challengedId: c.challengedId,
          challengerName:
            c.challenger.user.name ?? c.challenger.user.email,
          challengedName:
            c.challenged.user.name ?? c.challenged.user.email,
          status: c.status,
          createdAt: c.createdAt,
        }))}
      />

      {/* 3. Matches list + Complete accepted challenges (admin) */}
      {canManage && acceptedChallenges.length > 0 ? (
        <SportCard variant="leaderboard" className="overflow-hidden">
          <SportCardHeader
            title="Complete accepted challenges"
            subtitle="Select winner and score to record the match."
          />
          <div className="p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challenger</TableHead>
                  <TableHead>Challenged</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {acceptedChallenges.map((challenge) => (
                  <TableRow key={challenge.id}>
                    <TableCell>
                      {challenge.challenger.user.name ??
                        challenge.challenger.user.email}
                    </TableCell>
                    <TableCell>
                      {challenge.challenged.user.name ??
                        challenge.challenged.user.email}
                    </TableCell>
                    <TableCell colSpan={4} className="p-0">
                      <form
                        action={completeChallengeAction}
                        className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[2fr_1.5fr_1fr_auto]"
                      >
                        <input
                          type="hidden"
                          name="challengeId"
                          value={challenge.id}
                        />
                        <select
                          name="winnerId"
                          defaultValue=""
                          className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                        >
                          <option value="" disabled>
                            Select winner
                          </option>
                          <option value={challenge.challengerId}>
                            {challenge.challenger.user.name ??
                              challenge.challenger.user.email}
                          </option>
                          <option value={challenge.challengedId}>
                            {challenge.challenged.user.name ??
                              challenge.challenged.user.email}
                          </option>
                        </select>
                        <input
                          name="scoreLine"
                          placeholder="21-19, 21-18"
                          className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                        />
                        <input
                          name="date"
                          type="date"
                          defaultValue={new Date().toISOString().slice(0, 10)}
                          className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                        />
                        <Button size="sm" type="submit">
                          Complete
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </SportCard>
      ) : null}

      {/* Matches list */}
      <SportCard variant="leaderboard" className="overflow-hidden">
        <SportCardHeader
          title="Match history"
          subtitle={`Recent matches for ${tab === "womens" ? "Women's" : "Men's"} Singles.`}
        />
        <div className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Player A</TableHead>
                <TableHead>Player B</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Rating changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map((match) => {
                const playerA = memberById.get(match.player1Id);
                const playerB = memberById.get(match.player2Id);
                const winner = memberById.get(match.winnerId);
                return (
                  <TableRow key={match.id}>
                    <TableCell>
                      {match.date.toISOString().slice(0, 10)}
                    </TableCell>
                    <TableCell>
                      {playerA?.user.name ?? playerA?.user.email ?? "-"}
                    </TableCell>
                    <TableCell>
                      {playerB?.user.name ?? playerB?.user.email ?? "-"}
                    </TableCell>
                    <TableCell>
                      {winner?.user.name ?? winner?.user.email ?? "-"}
                    </TableCell>
                    <TableCell>{match.scoreLine ?? "-"}</TableCell>
                    <TableCell className="text-xs">
                      {match.ratingChanges
                        .map((change) => {
                          const member = memberById.get(change.memberId);
                          const name =
                            member?.user.name ?? member?.user.email ?? "Player";
                          const sign =
                            change.ratingChange > 0 ? "+" : "";
                          return `${name}: ${sign}${change.ratingChange}`;
                        })
                        .join(" | ")}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!matches.length ? (
                <TableRow>
                  <TableCell colSpan={6} className="p-4">
                    <EmptyState
                      title="No matches yet"
                      description="Submit match results in this category to see history."
                      icon={Trophy}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </SportCard>
    </PageMotion>
  );
}
