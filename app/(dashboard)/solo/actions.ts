"use server";

import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSoloMatchSchema, updateSoloMatchSchema } from "@/lib/validations/solo";

export type SoloActionState = {
  success: boolean;
  message: string;
  /** Ensures useActionToast and router.refresh run on every submission. */
  toastKey?: number;
};

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) return null;
  return session;
}

function deriveWinnerId(
  player1Id: string,
  player2Id: string,
  player1Score: number,
  player2Score: number,
): string {
  return player1Score > player2Score ? player1Id : player2Id;
}

export async function createSoloMatchAction(
  _prevState: SoloActionState,
  formData: FormData,
): Promise<SoloActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admins can record matches.", toastKey: Date.now() };
  }

  const parsed = createSoloMatchSchema.safeParse({
    player1Id: formData.get("player1Id"),
    player2Id: formData.get("player2Id"),
    player1Score: formData.get("player1Score"),
    player2Score: formData.get("player2Score"),
    matchDate: formData.get("matchDate"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join("; ");
    return { success: false, message: messages, toastKey: Date.now() };
  }

  const { player1Id, player2Id, player1Score, player2Score, matchDate, notes } = parsed.data;
  const matchDateObj = new Date(matchDate);
  const year = matchDateObj.getFullYear();
  const winnerId = deriveWinnerId(player1Id, player2Id, player1Score, player2Score);

  try {
    await db.soloMatch.create({
      data: {
        year,
        player1Id,
        player2Id,
        winnerId,
        player1Score,
        player2Score,
        matchDate: matchDateObj,
        notes: notes || null,
        createdBy: session.user.id,
      },
    });
  } catch (e: unknown) {
    console.error("createSoloMatchAction error:", e);
    return { success: false, message: "Failed to record match.", toastKey: Date.now() };
  }

  revalidatePath("/solo");
  return { success: true, message: "Match recorded successfully.", toastKey: Date.now() };
}

export async function updateSoloMatchAction(
  _prevState: SoloActionState,
  formData: FormData,
): Promise<SoloActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admins can edit matches.", toastKey: Date.now() };
  }

  const parsed = updateSoloMatchSchema.safeParse({
    id: formData.get("id"),
    player1Id: formData.get("player1Id"),
    player2Id: formData.get("player2Id"),
    player1Score: formData.get("player1Score"),
    player2Score: formData.get("player2Score"),
    matchDate: formData.get("matchDate"),
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    const messages = parsed.error.issues.map((issue) => issue.message).join("; ");
    return { success: false, message: messages, toastKey: Date.now() };
  }

  const { id, player1Id, player2Id, player1Score, player2Score, matchDate, notes } = parsed.data;
  const matchDateObj = new Date(matchDate);
  const year = matchDateObj.getFullYear();
  const winnerId = deriveWinnerId(player1Id, player2Id, player1Score, player2Score);

  try {
    await db.soloMatch.update({
      where: { id },
      data: {
        year,
        player1Id,
        player2Id,
        winnerId,
        player1Score,
        player2Score,
        matchDate: matchDateObj,
        notes: notes || null,
      },
    });
  } catch (e: unknown) {
    console.error("updateSoloMatchAction error:", e);
    return { success: false, message: "Failed to update match.", toastKey: Date.now() };
  }

  revalidatePath("/solo");
  return { success: true, message: "Match updated successfully.", toastKey: Date.now() };
}

export async function deleteSoloMatchAction(matchId: string): Promise<SoloActionState> {
  const session = await assertAdmin();
  if (!session) {
    return { success: false, message: "Only admins can delete matches.", toastKey: Date.now() };
  }

  try {
    await db.soloMatch.delete({ where: { id: matchId } });
  } catch (e: unknown) {
    console.error("deleteSoloMatchAction error:", e);
    return { success: false, message: "Failed to delete match.", toastKey: Date.now() };
  }

  revalidatePath("/solo");
  return { success: true, message: "Match deleted.", toastKey: Date.now() };
}
