import { PrismaClient, type RankingCategory } from "@prisma/client";

import { calculateNewRating, getDefaultRating } from "@/lib/elo";

export async function createRatedMatch(
  tx: Omit<
    PrismaClient,
    "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
  >,
  input: {
    player1Id: string;
    player2Id: string;
    winnerId: string;
    category?: RankingCategory;
    scoreLine?: string;
    date: Date;
    notes?: string;
    createdBy?: string;
  },
) {
  const category = input.category ?? "MENS_SINGLES";
  const [player1Ranking, player2Ranking] = await Promise.all([
    tx.ranking.upsert({
      where: { memberId_category: { memberId: input.player1Id, category } },
      update: {},
      create: {
        memberId: input.player1Id,
        category,
        score: getDefaultRating(),
        wins: 0,
        losses: 0,
        matches: 0,
      },
    }),
    tx.ranking.upsert({
      where: { memberId_category: { memberId: input.player2Id, category } },
      update: {},
      create: {
        memberId: input.player2Id,
        category,
        score: getDefaultRating(),
        wins: 0,
        losses: 0,
        matches: 0,
      },
    }),
  ]);

  const player1Result = input.winnerId === input.player1Id ? 1 : 0;
  const player2Result = input.winnerId === input.player2Id ? 1 : 0;

  const player1Elo = calculateNewRating(
    player1Ranking.score,
    player2Ranking.score,
    player1Result,
  );
  const player2Elo = calculateNewRating(
    player2Ranking.score,
    player1Ranking.score,
    player2Result,
  );

  const match = await tx.match.create({
    data: {
      player1Id: input.player1Id,
      player2Id: input.player2Id,
      winnerId: input.winnerId,
      category,
      scoreLine: input.scoreLine?.trim() || null,
      date: input.date,
      notes: input.notes?.trim() || null,
      createdBy: input.createdBy ?? null,
    },
  });

  await Promise.all([
    tx.ranking.update({
      where: { memberId_category: { memberId: input.player1Id, category } },
      data: {
        score: player1Elo.newRating,
        wins: { increment: player1Result === 1 ? 1 : 0 },
        losses: { increment: player1Result === 0 ? 1 : 0 },
        matches: { increment: 1 },
      },
    }),
    tx.ranking.update({
      where: { memberId_category: { memberId: input.player2Id, category } },
      data: {
        score: player2Elo.newRating,
        wins: { increment: player2Result === 1 ? 1 : 0 },
        losses: { increment: player2Result === 0 ? 1 : 0 },
        matches: { increment: 1 },
      },
    }),
    tx.ratingChange.create({
      data: {
        matchId: match.id,
        memberId: input.player1Id,
        oldRating: player1Ranking.score,
        expectedScore: player1Elo.expected,
        actualScore: player1Result,
        ratingChange: player1Elo.delta,
        newRating: player1Elo.newRating,
      },
    }),
    tx.ratingChange.create({
      data: {
        matchId: match.id,
        memberId: input.player2Id,
        oldRating: player2Ranking.score,
        expectedScore: player2Elo.expected,
        actualScore: player2Result,
        ratingChange: player2Elo.delta,
        newRating: player2Elo.newRating,
      },
    }),
  ]);

  return match;
}
