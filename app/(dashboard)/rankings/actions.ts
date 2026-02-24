"use server";

import { ChallengeStatus, type RankingCategory, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRatedMatch } from "@/lib/match-service";
import {
  completeChallengeSchema,
  createChallengeSchema,
  updateChallengeStatusSchema,
} from "@/lib/validations/challenge";

const RANKINGS_PATH = "/rankings";

export type ChallengeActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const initialState: ChallengeActionState = { success: false, message: "" };

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) return null;
  return session;
}

function currentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

function getRankPositionMap(memberIdsInOrder: string[]) {
  const map = new Map<string, number>();
  memberIdsInOrder.forEach((memberId, index) => map.set(memberId, index + 1));
  return map;
}

export async function createChallengeAction(
  prevState: ChallengeActionState = initialState,
  formData: FormData,
): Promise<ChallengeActionState> {
  void prevState;
  const session = await assertAdmin();
  if (!session) return { success: false, message: "Only admin can create challenges." };

  const category = (formData.get("category") as RankingCategory) ?? "MENS_SINGLES";
  const parsed = createChallengeSchema.safeParse({
    challengerId: formData.get("challengerId"),
    challengedId: formData.get("challengedId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct challenge fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { start, end } = currentMonthRange();

  const [rankings, monthlyChallengeCount] = await Promise.all([
    db.ranking.findMany({
      where: { category },
      orderBy: { score: "desc" },
      select: { memberId: true },
    }),
    db.challenge.count({
      where: {
        challengerId: parsed.data.challengerId,
        category,
        createdAt: { gte: start, lt: end },
      },
    }),
  ]);

  if (monthlyChallengeCount >= 2) {
    return {
      success: false,
      message: "This challenger already reached max 2 challenges this month.",
    };
  }

  const rankMap = getRankPositionMap(rankings.map((ranking) => ranking.memberId));
  const challengerRank = rankMap.get(parsed.data.challengerId);
  const challengedRank = rankMap.get(parsed.data.challengedId);

  if (!challengerRank || !challengedRank) {
    return {
      success: false,
      message: "Both players need rankings before challenge.",
    };
  }

  const rankGap = challengerRank - challengedRank;
  if (rankGap <= 0 || rankGap > 3) {
    return {
      success: false,
      message: "Challenger must be lower ranked and within 3 positions.",
    };
  }

  await db.challenge.create({
    data: {
      challengerId: parsed.data.challengerId,
      challengedId: parsed.data.challengedId,
      category,
      status: ChallengeStatus.PENDING,
    },
  });

  revalidatePath(RANKINGS_PATH);
  revalidatePath("/matches");
  return { success: true, message: "Challenge created." };
}

export async function updateChallengeStatusAction(formData: FormData) {
  const session = await assertAdmin();
  if (!session) return;

  const parsed = updateChallengeStatusSchema.safeParse({
    challengeId: formData.get("challengeId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  if (
    parsed.data.status !== ChallengeStatus.ACCEPTED &&
    parsed.data.status !== ChallengeStatus.REJECTED
  ) {
    return;
  }

  await db.challenge.update({
    where: { id: parsed.data.challengeId },
    data: {
      status: parsed.data.status,
      respondedAt: new Date(),
    },
  });

  revalidatePath(RANKINGS_PATH);
  revalidatePath("/matches");
}

export async function completeChallengeAction(formData: FormData) {
  const session = await assertAdmin();
  if (!session?.user?.id) return;

  const parsed = completeChallengeSchema.safeParse({
    challengeId: formData.get("challengeId"),
    winnerId: formData.get("winnerId"),
    scoreLine: formData.get("scoreLine"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;

  await db.$transaction(async (tx) => {
    const challenge = await tx.challenge.findUnique({
      where: { id: parsed.data.challengeId },
    });
    if (!challenge || challenge.status !== ChallengeStatus.ACCEPTED) return;

    if (
      parsed.data.winnerId !== challenge.challengerId &&
      parsed.data.winnerId !== challenge.challengedId
    ) {
      return;
    }

    const match = await createRatedMatch(tx, {
      player1Id: challenge.challengerId,
      player2Id: challenge.challengedId,
      winnerId: parsed.data.winnerId,
      category: challenge.category,
      scoreLine: parsed.data.scoreLine,
      date: new Date(parsed.data.date),
      notes: parsed.data.notes,
      createdBy: session.user.id,
    });

    await tx.challenge.update({
      where: { id: challenge.id },
      data: {
        status: ChallengeStatus.COMPLETED,
        completedAt: new Date(),
        matchId: match.id,
      },
    });
  });

  revalidatePath(RANKINGS_PATH);
  revalidatePath("/matches");
  revalidatePath("/");
}
