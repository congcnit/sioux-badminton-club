import { Gender, MemberStatus } from "@prisma/client";
import { z } from "zod";

const optionalDate = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return undefined;
    if (typeof v === "string") {
      const t = v.trim();
      return t === "" ? undefined : t;
    }
    return undefined;
  })
  .optional()
  .refine((value) => !value || !Number.isNaN(new Date(value).getTime()), {
    message: "Date of birth must be a valid date.",
  });

export const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z
    .string()
    .min(1, "Email is required.")
    .pipe(z.email({ message: "Email is invalid." })),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(100, "Password is too long."),
  memberCode: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => (typeof value === "string" ? value.trim() : "") || "")
    .refine((value) => value.length === 0 || value.length >= 2, {
      message: "Member code must be at least 2 characters.",
    })
    .refine((value) => value.length <= 20, {
      message: "Member code is too long.",
    }),
  phone: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : undefined))
    .pipe(z.string().max(20, "Phone is too long.").optional()),
  dateOfBirth: optionalDate,
  gender: z
    .union([z.enum([Gender.MALE, Gender.FEMALE, Gender.OTHER]), z.literal("")])
    .transform((v) => (v === "" ? undefined : v))
    .optional(),
  status: z.enum([MemberStatus.ACTIVE, MemberStatus.INACTIVE, MemberStatus.SUSPENDED]).default(MemberStatus.ACTIVE),
  notes: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (typeof v === "string" ? v.trim() : undefined))
    .pipe(z.string().max(500, "Notes are too long.").optional()),
});

export const updateMemberSchema = createMemberSchema
  .omit({ password: true })
  .extend({
    memberId: z.string().min(1, "Member id is required."),
    userId: z.string().min(1, "User id is required."),
  });

export const deleteMemberSchema = z.object({
  memberId: z.string().min(1, "Member id is required."),
  userId: z.string().min(1, "User id is required."),
});

export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
