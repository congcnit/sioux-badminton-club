import { SessionAttendanceStatus, SessionStatus } from "@prisma/client";
import { z } from "zod";

const optionalTime = z
  .string()
  .optional()
  .refine((value) => !value || /^([01]\d|2[0-3]):([0-5]\d)$/.test(value), {
    message: "Invalid time.",
  });

export const createSessionSchema = z.object({
  sessionDate: z.string().min(1, "Session date is required."),
  startTime: optionalTime,
  endTime: optionalTime,
  courtId: z.string().min(1, "Court is required."),
  memberIds: z.array(z.string().min(1)).default([]),
  notes: z.string().trim().max(500).optional(),
  status: z.enum(SessionStatus).default(SessionStatus.SCHEDULED),
});

export const markAttendanceSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
  memberId: z.string().min(1, "Member id is required."),
  status: z.enum(SessionAttendanceStatus),
  note: z.string().trim().max(300).optional(),
  fineAmount: z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.trim() === "") return undefined;
      return Number(value);
    })
    .refine((value) => value === undefined || (!Number.isNaN(value) && value >= 0), {
      message: "Fine amount must be a non-negative number.",
    }),
});

export const joinSessionSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
  note: z.preprocess(
    (val) => (val == null || val === "" ? undefined : val),
    z.string().trim().max(300).optional(),
  ),
});

export const deleteSessionSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
});

export const updateSessionNotesSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
  notes: z.string().trim().max(500, "Notes must be at most 500 characters.").optional(),
});

export const updateSessionSchema = z.object({
  sessionId: z.string().min(1, "Session id is required."),
  sessionDate: z.string().min(1, "Session date is required."),
  startTime: optionalTime,
  endTime: optionalTime,
  courtId: z.string().optional(),
  memberIds: z.array(z.string().min(1)).default([]),
  notes: z.string().trim().max(500).optional(),
  status: z.enum(SessionStatus).default(SessionStatus.SCHEDULED),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;
