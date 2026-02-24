import { ChallengeStatus } from "@prisma/client";
import { z } from "zod";

export const createChallengeSchema = z
  .object({
    challengerId: z.string().min(1, "Challenger is required."),
    challengedId: z.string().min(1, "Challenged player is required."),
  })
  .refine((data) => data.challengerId !== data.challengedId, {
    message: "Players must be different.",
    path: ["challengedId"],
  });

export const updateChallengeStatusSchema = z.object({
  challengeId: z.string().min(1, "Challenge id is required."),
  status: z.enum(ChallengeStatus),
});

export const completeChallengeSchema = z.object({
  challengeId: z.string().min(1, "Challenge id is required."),
  winnerId: z.string().min(1, "Winner is required."),
  scoreLine: z.string().trim().max(100).optional(),
  date: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Date is invalid.",
    }),
  notes: z.string().trim().max(300).optional(),
});
