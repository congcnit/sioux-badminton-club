import { z } from "zod";

export const createMatchSchema = z
  .object({
    player1Id: z.string().min(1, "Player A is required."),
    player2Id: z.string().min(1, "Player B is required."),
    winnerId: z.string().min(1, "Winner is required."),
    category: z.enum(["MENS_SINGLES", "WOMENS_SINGLES"]).optional(),
    scoreLine: z.string().trim().max(100, "Score is too long.").optional(),
    date: z
      .string()
      .refine((value) => !Number.isNaN(new Date(value).getTime()), {
        message: "Date is invalid.",
      }),
    notes: z.string().trim().max(300, "Notes are too long.").optional(),
  })
  .refine((data) => data.player1Id !== data.player2Id, {
    message: "Players must be different.",
    path: ["player2Id"],
  })
  .refine(
    (data) => data.winnerId === data.player1Id || data.winnerId === data.player2Id,
    {
      message: "Winner must be one of the two players.",
      path: ["winnerId"],
    },
  );
