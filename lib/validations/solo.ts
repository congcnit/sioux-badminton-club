import { z } from "zod";

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Invalid date" });

function isValidBwfSingleGameScore(high: number, low: number): boolean {
  if (high < 21 || high > 30) return false;
  if (high === 21) return low <= 19;
  if (high === 30) return low === 29;
  return high - low === 2;
}

const scoreRefinement = {
  message: "Invalid score. BWF single game: first to 21 (or 2 clear from 20–20); max 30–29.",
  path: ["player1Score"],
};

export const createSoloMatchSchema = z
  .object({
    player1Id: z.string().min(1, "Player 1 is required"),
    player2Id: z.string().min(1, "Player 2 is required"),
    player1Score: z.coerce.number().int().min(0).max(30),
    player2Score: z.coerce.number().int().min(0).max(30),
    matchDate: dateString,
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.player1Id !== d.player2Id, {
    message: "Player 1 and Player 2 must be different",
    path: ["player2Id"],
  })
  .refine(
    (d) => {
      const high = Math.max(d.player1Score, d.player2Score);
      const low = Math.min(d.player1Score, d.player2Score);
      return isValidBwfSingleGameScore(high, low);
    },
    scoreRefinement,
  );

export const updateSoloMatchSchema = z
  .object({
    id: z.string().min(1, "Match ID is required"),
    player1Id: z.string().min(1, "Player 1 is required"),
    player2Id: z.string().min(1, "Player 2 is required"),
    player1Score: z.coerce.number().int().min(0).max(30),
    player2Score: z.coerce.number().int().min(0).max(30),
    matchDate: dateString,
    notes: z.string().max(500).optional().or(z.literal("")),
  })
  .refine((d) => d.player1Id !== d.player2Id, {
    message: "Player 1 and Player 2 must be different",
    path: ["player2Id"],
  })
  .refine(
    (d) => {
      const high = Math.max(d.player1Score, d.player2Score);
      const low = Math.min(d.player1Score, d.player2Score);
      return isValidBwfSingleGameScore(high, low);
    },
    scoreRefinement,
  );

export type CreateSoloMatchInput = z.infer<typeof createSoloMatchSchema>;
export type UpdateSoloMatchInput = z.infer<typeof updateSoloMatchSchema>;
