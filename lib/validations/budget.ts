import { BudgetCategoryType } from "@prisma/client";
import { z } from "zod";

export const createExpenseSchema = z.object({
  amount: z
    .string()
    .transform((value) => Number(value))
    .refine((value) => !Number.isNaN(value) && value > 0, {
      message: "Amount must be greater than 0.",
    }),
  category: z.enum(BudgetCategoryType),
  description: z.string().trim().max(300, "Description is too long.").optional(),
  date: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Date is invalid.",
    }),
  budgetMonth: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}-\d{2}$/.test(value), {
      message: "Budget month must be in YYYY-MM format.",
    }),
  sessionId: z.string().optional(),
});

export const updateExpenseSchema = z.object({
  transactionId: z.string().min(1, "Transaction id is required."),
  amount: z
    .string()
    .transform((value) => Number(value))
    .refine((value) => !Number.isNaN(value) && value > 0, {
      message: "Amount must be greater than 0.",
    }),
  category: z.enum(BudgetCategoryType),
  description: z.string().trim().max(300, "Description is too long.").optional(),
  date: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Date is invalid.",
    }),
  sessionId: z.string().optional(),
});

export const deleteExpenseSchema = z.object({
  transactionId: z.string().min(1, "Transaction id is required."),
});

export const updateMonthlyBudgetSchema = z.object({
  budgetId: z.string().min(1, "Budget id is required."),
  totalAmount: z
    .string()
    .transform((value) => Number(value))
    .refine((value) => !Number.isNaN(value) && value >= 0, {
      message: "Total amount must be a non-negative number.",
    }),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
