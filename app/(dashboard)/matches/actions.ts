"use server";

import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRatedMatch } from "@/lib/match-service";
import { createMatchSchema } from "@/lib/validations/match";

export type MatchActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const initialState: MatchActionState = { success: false, message: "" };

export async function createMatchAction(
  prevState: MatchActionState = initialState,
  formData: FormData,
): Promise<MatchActionState> {
  void prevState;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return { success: false, message: "Only admin can submit match results." };
  }

  const parsed = createMatchSchema.safeParse({
    player1Id: formData.get("player1Id"),
    player2Id: formData.get("player2Id"),
    winnerId: formData.get("winnerId"),
    category: formData.get("category"),
    scoreLine: formData.get("scoreLine"),
    date: formData.get("date"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const category = parsed.data.category === "WOMENS_SINGLES" ? "WOMENS_SINGLES" : "MENS_SINGLES";

  await db.$transaction(async (tx) => {
    await createRatedMatch(tx, {
      player1Id: parsed.data.player1Id,
      player2Id: parsed.data.player2Id,
      winnerId: parsed.data.winnerId,
      category,
      scoreLine: parsed.data.scoreLine,
      date: new Date(parsed.data.date),
      notes: parsed.data.notes,
      createdBy: session.user.id,
    });
  });

  revalidatePath("/rankings");
  revalidatePath("/rankings");
  revalidatePath("/matches");
  revalidatePath("/matches/new");
  revalidatePath("/");

  return { success: true, message: "Match result submitted and ratings updated." };
}
