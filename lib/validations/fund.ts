import {
  FundTransactionCategory,
  FundTransactionStatus,
  FundTransactionType,
} from "@prisma/client";
import { z } from "zod";

const amountSchema = z
  .string()
  .transform((value) => Number(value))
  .refine((value) => !Number.isNaN(value) && value > 0, {
    message: "Amount must be greater than 0.",
  });

const dateSchema = z
  .string()
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Date is invalid.",
  });

export const createFundTransactionSchema = z.object({
  type: z.nativeEnum(FundTransactionType),
  category: z.nativeEnum(FundTransactionCategory),
  status: z.nativeEnum(FundTransactionStatus).default("PENDING"),
  amount: amountSchema,
  description: z.string().trim().max(300, "Description is too long.").optional(),
  date: dateSchema,
});

export const updateFundTransactionSchema = createFundTransactionSchema
  .extend({
    transactionId: z.string().min(1, "Transaction id is required."),
  })
  .required({ status: true });

export const deleteFundTransactionSchema = z.object({
  transactionId: z.string().min(1, "Transaction id is required."),
});
