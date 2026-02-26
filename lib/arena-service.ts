/**
 * Arena service: event creation, ranking algorithm, points calculation, match submission.
 * Leaderboard order: points DESC → match diff (wins−losses) DESC → score diff DESC → historical → monthly → yearly → memberId.
 */

import type { ArenaCategory, ArenaEventStatus } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { SessionAttendanceStatus } from "@prisma/client";

const INITIAL_POINTS = 1000;
const MAX_RANK_DIFF_FOR_CHALLENGE = 2;
const CHALLENGES_PER_EVENT = 2;

export type PointsChangeResult = {
  winnerDelta: number;
  loserDelta: number;
};

const MIN_POINTS = 5;

/**
 * Calculate points change for a match.
 * rankDiff = winner rank − loser rank (signed).
 * Examples (maxRankDiff = 3): #5 beats #2 → rankDiff = 3 → +30 / -30; #2 beats #5 → rankDiff = -3 → +5 / -5.
 * magnitude: rankDiff > 0 ⇒ minPoints * (maxRankDiff + rankDiff); rankDiff ≤ 0 ⇒ minPoints * (maxRankDiff + rankDiff + 1).
 */
export function calculatePointsChange(
  winnerRank: number,
  loserRank: number,
  maxRankDiff: number,
  minPoints: number = MIN_POINTS,
): PointsChangeResult {
  const rankDiff = winnerRank - loserRank;
  const rawMagnitude =
    rankDiff > 0
      ? minPoints * (maxRankDiff + rankDiff)
      : minPoints * (maxRankDiff + rankDiff + 1);
  const magnitude = Math.max(0, rawMagnitude);
  return {
    winnerDelta: magnitude,
    loserDelta: -magnitude,
  };
}

export type HistoricalRankCounts = Record<number, number>;

export type ArenaParticipantCompareFields = {
  points: number;
  wins: number;
  losses: number;
  scoreFor: number;
  scoreAgainst: number;
  monthlyParticipationCount: number;
  yearlyParticipationCount: number;
  memberId: string;
};

/**
 * Compare two participants for ranking.
 * Order: 1) Points DESC, 2) Match diff (wins−losses) DESC, 3) Score diff (scoreFor−scoreAgainst) DESC,
 *        4) Historical achievements DESC, 5) Monthly participation DESC, 6) Yearly participation DESC, 7) memberId.
 */
export function compareArenaParticipants(
  a: ArenaParticipantCompareFields,
  b: ArenaParticipantCompareFields,
  historicalByMemberId: Map<string, HistoricalRankCounts>,
): number {
  if (a.points !== b.points) return b.points - a.points;
  const matchDiffA = a.wins - a.losses;
  const matchDiffB = b.wins - b.losses;
  if (matchDiffA !== matchDiffB) return matchDiffB - matchDiffA;
  const scoreDiffA = a.scoreFor - a.scoreAgainst;
  const scoreDiffB = b.scoreFor - b.scoreAgainst;
  if (scoreDiffA !== scoreDiffB) return scoreDiffB - scoreDiffA;
  const histA = historicalByMemberId.get(a.memberId) ?? {};
  const histB = historicalByMemberId.get(b.memberId) ?? {};
  const cmp = compareHistoricalRankCounts(histA, histB);
  if (cmp !== 0) return cmp;
  if (a.monthlyParticipationCount !== b.monthlyParticipationCount) {
    return b.monthlyParticipationCount - a.monthlyParticipationCount;
  }
  if (a.yearlyParticipationCount !== b.yearlyParticipationCount) {
    return b.yearlyParticipationCount - a.yearlyParticipationCount;
  }
  return a.memberId.localeCompare(b.memberId);
}

/**
 * Deterministic comparison of historical rank counts: rank1 first, then rank2, etc.
 * Higher count at same rank wins; if equal, move to next rank.
 */
function compareHistoricalRankCounts(
  a: HistoricalRankCounts,
  b: HistoricalRankCounts,
): number {
  const maxRank = Math.max(
    ...Object.keys(a).map(Number),
    ...Object.keys(b).map(Number),
    0,
  );
  for (let rank = 1; rank <= maxRank; rank++) {
    const countA = a[rank] ?? 0;
    const countB = b[rank] ?? 0;
    if (countA !== countB) return countB - countA;
  }
  return 0;
}

/**
 * Fetch historical rank counts per member (rank -> count).
 */
export async function getHistoricalRankCounts(
  tx: Pick<PrismaClient, "arenaHistoricalRanking">,
  memberIds: string[],
): Promise<Map<string, HistoricalRankCounts>> {
  if (memberIds.length === 0) return new Map();
  const rows = await tx.arenaHistoricalRanking.findMany({
    where: { memberId: { in: memberIds } },
    select: { memberId: true, rank: true, count: true },
  });
  const map = new Map<string, HistoricalRankCounts>();
  for (const row of rows) {
    let rec = map.get(row.memberId);
    if (!rec) {
      rec = {};
      map.set(row.memberId, rec);
    }
    rec[row.rank] = row.count;
  }
  return map;
}

/**
 * When an event is marked COMPLETED, record each participant's final rank in ArenaHistoricalRanking
 * so future leaderboard tiebreaks can use historical achievements (e.g. "finished 1st N times").
 */
export async function recordHistoricalRankingsForCompletedEvent(
  tx: Pick<PrismaClient, "arenaParticipant" | "arenaHistoricalRanking">,
  eventId: string,
): Promise<void> {
  const participants = await tx.arenaParticipant.findMany({
    where: { arenaEventId: eventId },
    select: { memberId: true, rank: true },
  });
  for (const p of participants) {
    if (p.rank == null) continue;
    await tx.arenaHistoricalRanking.upsert({
      where: {
        memberId_rank: { memberId: p.memberId, rank: p.rank },
      },
      create: { memberId: p.memberId, rank: p.rank, count: 1 },
      update: { count: { increment: 1 } },
    });
  }
}

/**
 * When an arena event is deleted, revert the historical rankings that were recorded when it was completed.
 * Only runs when the event status is COMPLETED; decrements (or deletes) ArenaHistoricalRanking rows for each participant's rank.
 */
export async function revertHistoricalRankingsForDeletedEvent(
  tx: Pick<PrismaClient, "arenaEvent" | "arenaParticipant" | "arenaHistoricalRanking">,
  eventId: string,
): Promise<void> {
  const event = await tx.arenaEvent.findUnique({
    where: { id: eventId },
    select: { status: true },
  });
  if (!event || event.status !== "COMPLETED") return;

  const participants = await tx.arenaParticipant.findMany({
    where: { arenaEventId: eventId },
    select: { memberId: true, rank: true },
  });
  for (const p of participants) {
    if (p.rank == null) continue;
    const row = await tx.arenaHistoricalRanking.findUnique({
      where: { memberId_rank: { memberId: p.memberId, rank: p.rank } },
      select: { count: true },
    });
    if (!row) continue;
    if (row.count <= 1) {
      await tx.arenaHistoricalRanking.delete({
        where: { memberId_rank: { memberId: p.memberId, rank: p.rank } },
      });
    } else {
      await tx.arenaHistoricalRanking.update({
        where: { memberId_rank: { memberId: p.memberId, rank: p.rank } },
        data: { count: { decrement: 1 } },
      });
    }
  }
}

/**
 * Recalculate ranks for all participants of an event and persist (Step 12).
 */
export async function recalculateArenaRankings(
  tx: Pick<
    PrismaClient,
    "arenaParticipant" | "arenaHistoricalRanking"
  >,
  arenaEventId: string,
): Promise<void> {
  const participants = await tx.arenaParticipant.findMany({
    where: { arenaEventId },
    orderBy: { id: "asc" },
  });
  if (participants.length === 0) return;

  const memberIds = participants.map((p) => p.memberId);
  const historicalByMemberId = await getHistoricalRankCounts(tx, memberIds);

  const sorted = [...participants].sort((a, b) =>
    compareArenaParticipants(
      {
        points: a.points,
        wins: a.wins,
        losses: a.losses,
        scoreFor: a.scoreFor,
        scoreAgainst: a.scoreAgainst,
        monthlyParticipationCount: a.monthlyParticipationCount,
        yearlyParticipationCount: a.yearlyParticipationCount,
        memberId: a.memberId,
      },
      {
        points: b.points,
        wins: b.wins,
        losses: b.losses,
        scoreFor: b.scoreFor,
        scoreAgainst: b.scoreAgainst,
        monthlyParticipationCount: b.monthlyParticipationCount,
        yearlyParticipationCount: b.yearlyParticipationCount,
        memberId: b.memberId,
      },
      historicalByMemberId,
    ),
  );

  const rankUpdates = sorted.map((p, index) => ({
    id: p.id,
    rank: index + 1,
  }));

  await Promise.all(
    rankUpdates.map(({ id, rank }) =>
      tx.arenaParticipant.update({
        where: { id },
        data: { rank },
      }),
    ),
  );
}

/**
 * Get monthly participation count for a member (sessions in given month with PRESENT/LATE).
 */
async function getMonthlyParticipationCount(
  tx: Pick<PrismaClient, "sessionAttendance">,
  memberId: string,
  month: number,
  year: number,
): Promise<number> {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return tx.sessionAttendance.count({
    where: {
      memberId,
      status: { in: [SessionAttendanceStatus.PRESENT, SessionAttendanceStatus.LATE] },
      session: {
        sessionDate: { gte: start, lt: end },
      },
    },
  });
}

/**
 * Get yearly participation count for a member.
 */
async function getYearlyParticipationCount(
  tx: Pick<PrismaClient, "sessionAttendance">,
  memberId: string,
  year: number,
): Promise<number> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));
  return tx.sessionAttendance.count({
    where: {
      memberId,
      status: { in: [SessionAttendanceStatus.PRESENT, SessionAttendanceStatus.LATE] },
      session: {
        sessionDate: { gte: start, lt: end },
      },
    },
  });
}

/**
 * List member IDs eligible for an arena event: current month participation >= minSessionsRequired.
 * Filter by gender if category is MEN/WOMEN (map to Member.gender).
 * Uses a single groupBy query to avoid N round-trips and reduce transaction time (e.g. on Vercel).
 */
export async function getEligibleMemberIds(
  tx: Pick<PrismaClient, "member" | "sessionAttendance">,
  input: { month: number; year: number; category: ArenaCategory; minSessionsRequired: number },
): Promise<string[]> {
  // Use UTC so February 2026 is consistent regardless of server timezone
  const monthStart = new Date(Date.UTC(input.year, input.month - 1, 1));
  const monthEnd = new Date(Date.UTC(input.year, input.month, 1));

  const genderFilter =
    input.category === "MEN"
      ? "MALE"
      : input.category === "WOMEN"
        ? "FEMALE"
        : null;

  const members =
    genderFilter == null
      ? await tx.member.findMany({
          where: { status: "ACTIVE" },
          select: { id: true },
        })
      : await tx.member.findMany({
          where: {
            status: "ACTIVE",
            OR: [{ gender: genderFilter }, { gender: null }],
          },
          select: { id: true },
        });

  const memberIds = members.map((m) => m.id);
  if (memberIds.length === 0) return [];

  // When minSessionsRequired is 0, everyone in the category is eligible. groupBy only
  // returns members with at least one session, so we must not filter by count in that case.
  if (input.minSessionsRequired === 0) return memberIds;

  const counts = await tx.sessionAttendance.groupBy({
    by: ["memberId"],
    where: {
      memberId: { in: memberIds },
      status: { in: [SessionAttendanceStatus.PRESENT, SessionAttendanceStatus.LATE] },
      session: {
        sessionDate: { gte: monthStart, lt: monthEnd },
      },
    },
    _count: { memberId: true },
  });

  return counts
    .filter((c) => c._count.memberId >= input.minSessionsRequired)
    .map((c) => c.memberId);
}

/**
 * Create arena event and participants (Step 3).
 * Uses the Prisma client directly (no interactive transaction) to avoid MongoDB
 * transaction lifecycle issues in serverless (e.g. P2028 on Vercel).
 * 1) Determine month/year from date.
 * 2) Get eligible members (current month participation >= minSessionsRequired).
 * 3) Create ArenaParticipant for each (points=1000, rank=null, challengesRemaining=2, participation counts).
 * 4) Recalculate rankings.
 */
export async function createArenaEventWithParticipants(
  db: Pick<
    PrismaClient,
    | "arenaEvent"
    | "arenaParticipant"
    | "arenaHistoricalRanking"
    | "sessionAttendance"
    | "member"
  >,
  input: {
    date: Date;
    category: ArenaCategory;
    minSessionsRequired: number;
    challengesPerParticipant?: number;
    maxRankDiff?: number;
    status?: ArenaEventStatus;
  },
): Promise<{ eventId: string; participantCount: number }> {
  // Use UTC so calendar date "2026-02-28" always means February 2026 regardless of server timezone
  const month = input.date.getUTCMonth() + 1;
  const year = input.date.getUTCFullYear();

  const eligibleMemberIds = await getEligibleMemberIds(db, {
    month,
    year,
    category: input.category,
    minSessionsRequired: input.minSessionsRequired,
  });

  const event = await db.arenaEvent.create({
    data: {
      date: input.date,
      month,
      year,
      category: input.category,
      minSessionsRequired: input.minSessionsRequired,
      maxRankDiff: input.maxRankDiff ?? MAX_RANK_DIFF_FOR_CHALLENGE,
      status: input.status ?? "SCHEDULED",
    },
  });

  try {
    for (const memberId of eligibleMemberIds) {
      const [monthlyCount, yearlyCount] = await Promise.all([
        getMonthlyParticipationCount(db, memberId, month, year),
        getYearlyParticipationCount(db, memberId, year),
      ]);
      await db.arenaParticipant.create({
        data: {
          arenaEventId: event.id,
          memberId,
          points: INITIAL_POINTS,
          rank: null,
          challengesRemaining: input.challengesPerParticipant ?? CHALLENGES_PER_EVENT,
          monthlyParticipationCount: monthlyCount,
          yearlyParticipationCount: yearlyCount,
        },
      });
    }

    await recalculateArenaRankings(db, event.id);
    return { eventId: event.id, participantCount: eligibleMemberIds.length };
  } catch (e) {
    await db.arenaEvent.delete({ where: { id: event.id } }).catch(() => {});
    throw e;
  }
}

/**
 * Validate challenge rules (Step 5): same event, rankDiff <= event.maxRankDiff, challengesRemaining > 0, no duplicate challenge.
 */
export async function validateArenaMatchSubmission(
  tx: Pick<PrismaClient, "arenaEvent" | "arenaMatch" | "arenaParticipant">,
  eventId: string,
  challengerParticipantId: string,
  opponentParticipantId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (challengerParticipantId === opponentParticipantId) {
    return { ok: false, error: "Challenger and opponent must be different." };
  }

  const [event, challenger, opponent] = await Promise.all([
    tx.arenaEvent.findUnique({
      where: { id: eventId },
      select: { maxRankDiff: true },
    }),
    tx.arenaParticipant.findUnique({
      where: { id: challengerParticipantId },
      select: { id: true, arenaEventId: true, rank: true, challengesRemaining: true },
    }),
    tx.arenaParticipant.findUnique({
      where: { id: opponentParticipantId },
      select: { id: true, arenaEventId: true, rank: true },
    }),
  ]);

  if (!challenger || !opponent) {
    return { ok: false, error: "Participant not found." };
  }
  if (challenger.arenaEventId !== eventId || opponent.arenaEventId !== eventId) {
    return { ok: false, error: "Participants must belong to the same event." };
  }
  if (challenger.arenaEventId !== eventId) {
    return { ok: false, error: "Event mismatch." };
  }
  if (challenger.challengesRemaining <= 0) {
    return { ok: false, error: "No challenges remaining." };
  }
  const maxRankDiff = event?.maxRankDiff ?? MAX_RANK_DIFF_FOR_CHALLENGE;
  const challengerRank = challenger.rank ?? 0;
  const opponentRank = opponent.rank ?? 0;
  const rankDiff = Math.abs(challengerRank - opponentRank);
  if (rankDiff > maxRankDiff) {
    return { ok: false, error: `Rank difference must be at most ${maxRankDiff}.` };
  }

  const existing = await tx.arenaMatch.findUnique({
    where: {
      challengerId_opponentId: {
        challengerId: challengerParticipantId,
        opponentId: opponentParticipantId,
      },
    },
  });
  if (existing) {
    return { ok: false, error: "Already challenged this opponent." };
  }

  return { ok: true };
}

/**
 * Submit match result (Step 7): validate, calculate points, update participants, create ArenaMatch, recalc rankings.
 */
export async function submitArenaMatch(
  tx: Pick<
    PrismaClient,
    | "arenaEvent"
    | "arenaParticipant"
    | "arenaMatch"
    | "arenaHistoricalRanking"
  >,
  input: {
    eventId: string;
    challengerParticipantId: string;
    opponentParticipantId: string;
    challengerScore: number;
    opponentScore: number;
  },
): Promise<{ ok: true; matchId: string } | { ok: false; error: string }> {
  const validation = await validateArenaMatchSubmission(
    tx,
    input.eventId,
    input.challengerParticipantId,
    input.opponentParticipantId,
  );
  if (!validation.ok) return validation;

  const [event, challenger, opponent] = await Promise.all([
    tx.arenaEvent.findUnique({
      where: { id: input.eventId },
      select: { maxRankDiff: true },
    }),
    tx.arenaParticipant.findUniqueOrThrow({
      where: { id: input.challengerParticipantId },
      select: { id: true, rank: true, points: true },
    }),
    tx.arenaParticipant.findUniqueOrThrow({
      where: { id: input.opponentParticipantId },
      select: { id: true, rank: true, points: true },
    }),
  ]);

  const maxRankDiff = event?.maxRankDiff ?? MAX_RANK_DIFF_FOR_CHALLENGE;
  const challengerRank = challenger.rank ?? 0;
  const opponentRank = opponent.rank ?? 0;
  const didChallengerWin = input.challengerScore > input.opponentScore;
  const winnerRank = didChallengerWin ? challengerRank : opponentRank;
  const loserRank = didChallengerWin ? opponentRank : challengerRank;
  const rankDiff = winnerRank - loserRank;
  const { winnerDelta, loserDelta } = calculatePointsChange(
    winnerRank,
    loserRank,
    maxRankDiff,
  );
  const challengerDelta = didChallengerWin ? winnerDelta : loserDelta;
  const opponentDelta = didChallengerWin ? loserDelta : winnerDelta;

  const match = await tx.arenaMatch.create({
    data: {
      arenaEventId: input.eventId,
      challengerId: input.challengerParticipantId,
      opponentId: input.opponentParticipantId,
      status: "COMPLETED",
      challengerScore: input.challengerScore,
      opponentScore: input.opponentScore,
      rankDiff,
      challengerRankAtMatch: challenger.rank ?? undefined,
      opponentRankAtMatch: opponent.rank ?? undefined,
      challengerPointsAtMatch: challenger.points,
      opponentPointsAtMatch: opponent.points,
      challengerPointsChange: challengerDelta,
      opponentPointsChange: opponentDelta,
    },
  });

  const challengerWon = didChallengerWin;
  await tx.arenaParticipant.update({
    where: { id: input.challengerParticipantId },
    data: {
      points: { increment: challengerDelta },
      challengesRemaining: { decrement: 1 },
      wins: challengerWon ? { increment: 1 } : undefined,
      losses: challengerWon ? undefined : { increment: 1 },
      scoreFor: { increment: input.challengerScore },
      scoreAgainst: { increment: input.opponentScore },
    },
  });
  await tx.arenaParticipant.update({
    where: { id: input.opponentParticipantId },
    data: {
      points: { increment: opponentDelta },
      wins: challengerWon ? undefined : { increment: 1 },
      losses: challengerWon ? { increment: 1 } : undefined,
      scoreFor: { increment: input.opponentScore },
      scoreAgainst: { increment: input.challengerScore },
    },
  });

  await recalculateArenaRankings(tx, input.eventId);
  return { ok: true, matchId: match.id };
}

/**
 * Create a scheduled match (no result yet). Admin can enter result later via completeArenaMatch.
 * Does not decrement challengesRemaining until the match is completed.
 */
export async function createScheduledArenaMatch(
  tx: Pick<PrismaClient, "arenaEvent" | "arenaMatch" | "arenaParticipant">,
  input: {
    eventId: string;
    challengerParticipantId: string;
    opponentParticipantId: string;
  },
): Promise<{ ok: true; matchId: string } | { ok: false; error: string }> {
  if (input.challengerParticipantId === input.opponentParticipantId) {
    return { ok: false, error: "Challenger and opponent must be different." };
  }

  const [event, challenger, opponent] = await Promise.all([
    tx.arenaEvent.findUnique({
      where: { id: input.eventId },
      select: { id: true, status: true },
    }),
    tx.arenaParticipant.findUnique({
      where: { id: input.challengerParticipantId },
      select: { id: true, arenaEventId: true },
    }),
    tx.arenaParticipant.findUnique({
      where: { id: input.opponentParticipantId },
      select: { id: true, arenaEventId: true },
    }),
  ]);

  if (!event || !challenger || !opponent) {
    return { ok: false, error: "Event or participant not found." };
  }
  if (event.status !== "ACTIVE") {
    return { ok: false, error: "Start the event before scheduling matches." };
  }
  if (challenger.arenaEventId !== input.eventId || opponent.arenaEventId !== input.eventId) {
    return { ok: false, error: "Participants must belong to this event." };
  }

  const existing = await tx.arenaMatch.findUnique({
    where: {
      challengerId_opponentId: {
        challengerId: input.challengerParticipantId,
        opponentId: input.opponentParticipantId,
      },
    },
  });
  if (existing) {
    return { ok: false, error: "This match pair already exists (scheduled or completed)." };
  }

  const match = await tx.arenaMatch.create({
    data: {
      arenaEventId: input.eventId,
      challengerId: input.challengerParticipantId,
      opponentId: input.opponentParticipantId,
      status: "SCHEDULED",
    },
  });
  return { ok: true, matchId: match.id };
}

/**
 * Complete a scheduled match: set result, apply points, decrement challenger challenges, recalc rankings.
 */
export async function completeArenaMatch(
  tx: Pick<
    PrismaClient,
    | "arenaEvent"
    | "arenaParticipant"
    | "arenaMatch"
    | "arenaHistoricalRanking"
  >,
  input: {
    matchId: string;
    challengerScore: number;
    opponentScore: number;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const match = await tx.arenaMatch.findUnique({
    where: { id: input.matchId },
    select: {
      id: true,
      arenaEventId: true,
      challengerId: true,
      opponentId: true,
      status: true,
    },
  });

  if (!match || match.status !== "SCHEDULED") {
    return { ok: false, error: "Match not found or already completed." };
  }

  const high = Math.max(input.challengerScore, input.opponentScore);
  const low = Math.min(input.challengerScore, input.opponentScore);
  if (high < 21 || high > 30 || (high === 21 && low > 19) || (high === 30 && low !== 29) || (high > 21 && high < 30 && high - low !== 2)) {
    return { ok: false, error: "Invalid score. BWF single game: first to 21 (or 2 clear from 20–20); max 30–29." };
  }

  const [event, challenger, opponent] = await Promise.all([
    tx.arenaEvent.findUnique({
      where: { id: match.arenaEventId },
      select: { maxRankDiff: true },
    }),
    tx.arenaParticipant.findUniqueOrThrow({
      where: { id: match.challengerId },
      select: { id: true, rank: true, points: true },
    }),
    tx.arenaParticipant.findUniqueOrThrow({
      where: { id: match.opponentId },
      select: { id: true, rank: true, points: true },
    }),
  ]);

  const maxRankDiff = event?.maxRankDiff ?? MAX_RANK_DIFF_FOR_CHALLENGE;
  const challengerRank = challenger.rank ?? 0;
  const opponentRank = opponent.rank ?? 0;
  const didChallengerWin = input.challengerScore > input.opponentScore;
  const winnerRank = didChallengerWin ? challengerRank : opponentRank;
  const loserRank = didChallengerWin ? opponentRank : challengerRank;
  const rankDiff = winnerRank - loserRank;
  const { winnerDelta, loserDelta } = calculatePointsChange(
    winnerRank,
    loserRank,
    maxRankDiff,
  );
  const challengerDelta = didChallengerWin ? winnerDelta : loserDelta;
  const opponentDelta = didChallengerWin ? loserDelta : winnerDelta;

  await tx.arenaMatch.update({
    where: { id: input.matchId },
    data: {
      status: "COMPLETED",
      challengerScore: input.challengerScore,
      opponentScore: input.opponentScore,
      rankDiff,
      challengerRankAtMatch: challenger.rank ?? undefined,
      opponentRankAtMatch: opponent.rank ?? undefined,
      challengerPointsAtMatch: challenger.points,
      opponentPointsAtMatch: opponent.points,
      challengerPointsChange: challengerDelta,
      opponentPointsChange: opponentDelta,
    },
  });

  const challengerWon = didChallengerWin;
  await tx.arenaParticipant.update({
    where: { id: match.challengerId },
    data: {
      points: { increment: challengerDelta },
      challengesRemaining: { decrement: 1 },
      wins: challengerWon ? { increment: 1 } : undefined,
      losses: challengerWon ? undefined : { increment: 1 },
      scoreFor: { increment: input.challengerScore },
      scoreAgainst: { increment: input.opponentScore },
    },
  });
  await tx.arenaParticipant.update({
    where: { id: match.opponentId },
    data: {
      points: { increment: opponentDelta },
      wins: challengerWon ? undefined : { increment: 1 },
      losses: challengerWon ? { increment: 1 } : undefined,
      scoreFor: { increment: input.opponentScore },
      scoreAgainst: { increment: input.challengerScore },
    },
  });

  await recalculateArenaRankings(tx, match.arenaEventId);
  return { ok: true };
}

export { INITIAL_POINTS, MAX_RANK_DIFF_FOR_CHALLENGE, CHALLENGES_PER_EVENT };
