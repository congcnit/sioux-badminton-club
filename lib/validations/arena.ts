import { ArenaCategory, ArenaEventStatus } from "@prisma/client";
import { z } from "zod";

export const createArenaEventSchema = z.object({
  date: z
    .string()
    .refine((v) => !Number.isNaN(new Date(v).getTime()), { message: "Invalid date" }),
  category: z.nativeEnum(ArenaCategory),
  minSessionsRequired: z.coerce.number().int().min(0),
  challengesPerParticipant: z
    .union([z.coerce.number().int().min(0).max(99), z.literal("")])
    .optional()
    .default(2)
    .transform((v) => (v === "" ? 2 : v)),
  maxRankDiff: z
    .union([z.coerce.number().int().min(1).max(10), z.literal("")])
    .optional()
    .default(2)
    .transform((v) => (v === "" ? 2 : v)),
  status: z.nativeEnum(ArenaEventStatus).nullish(),
});

export const updateArenaEventSchema = z.object({
  status: z.nativeEnum(ArenaEventStatus).optional(),
});

export const updateParticipantChallengesSchema = z.object({
  participantId: z.string().min(1, "Participant is required"),
  challengesRemaining: z.coerce.number().int().min(0).max(99),
});

/**
 * BWF (Badminton World Federation) single-game scoring:
 * - First to 21 wins; if 20–20, win by 2; at 29–29, first to 30 wins (30–29).
 * - Valid scores: 21–0..19, 22–20, 23–21, … 29–27, 30–29 (or reversed).
 */
function isValidBwfSingleGameScore(high: number, low: number): boolean {
  if (high < 21 || high > 30) return false;
  if (high === 21) return low <= 19;
  if (high === 30) return low === 29;
  return high - low === 2;
}

export const submitArenaMatchSchema = z
  .object({
    challengerParticipantId: z.string().min(1, "Challenger participant is required"),
    opponentParticipantId: z.string().min(1, "Opponent participant is required"),
    challengerScore: z.coerce.number().int().min(0).max(30),
    opponentScore: z.coerce.number().int().min(0).max(30),
  })
  .refine((d) => d.challengerParticipantId !== d.opponentParticipantId, {
    message: "Challenger and opponent must be different",
    path: ["opponentParticipantId"],
  })
  .refine(
    (d) => {
      const high = Math.max(d.challengerScore, d.opponentScore);
      const low = Math.min(d.challengerScore, d.opponentScore);
      return isValidBwfSingleGameScore(high, low);
    },
    {
      message:
        "Invalid score. BWF single game: first to 21 (or 2 clear from 20–20); max 30–29.",
      path: ["challengerScore"],
    },
  );

export const createScheduledArenaMatchSchema = z
  .object({
    eventId: z.string().min(1, "Event is required"),
    challengerParticipantId: z.string().min(1, "Challenger is required"),
    opponentParticipantId: z.string().min(1, "Opponent is required"),
  })
  .refine((d) => d.challengerParticipantId !== d.opponentParticipantId, {
    message: "Challenger and opponent must be different",
    path: ["opponentParticipantId"],
  });

/** Member challenge: current user is challenger, only opponent is chosen. */
export const challengeOpponentSchema = z
  .object({
    eventId: z.string().min(1, "Event is required"),
    opponentParticipantId: z.string().min(1, "Opponent is required"),
  });

export const completeArenaMatchSchema = z
  .object({
    matchId: z.string().min(1, "Match is required"),
    challengerScore: z.coerce.number().int().min(0).max(30),
    opponentScore: z.coerce.number().int().min(0).max(30),
  })
  .refine(
    (d) => {
      const high = Math.max(d.challengerScore, d.opponentScore);
      const low = Math.min(d.challengerScore, d.opponentScore);
      return isValidBwfSingleGameScore(high, low);
    },
    {
      message:
        "Invalid score. BWF single game: first to 21 (or 2 clear from 20–20); max 30–29.",
      path: ["challengerScore"],
    },
  );

export type CreateArenaEventInput = z.infer<typeof createArenaEventSchema>;
export type UpdateArenaEventInput = z.infer<typeof updateArenaEventSchema>;
export type SubmitArenaMatchInput = z.infer<typeof submitArenaMatchSchema>;
export type CreateScheduledArenaMatchInput = z.infer<typeof createScheduledArenaMatchSchema>;
export type ChallengeOpponentInput = z.infer<typeof challengeOpponentSchema>;
export type CompleteArenaMatchInput = z.infer<typeof completeArenaMatchSchema>;
