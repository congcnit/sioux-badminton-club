"use server";

import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createFundTransactionSchema,
  deleteFundTransactionSchema,
  updateFundTransactionSchema,
} from "@/lib/validations/fund";

export type FundActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  toastKey?: number;
};

const defaultState: FundActionState = { success: false, message: "" };

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) return null;
  return session;
}

function revalidateFundPages() {
  revalidatePath("/fund");
  revalidatePath("/fund/new");
  revalidatePath("/");
}

export async function createFundTransactionAction(
  prevState: FundActionState = defaultState,
  formData: FormData,
): Promise<FundActionState> {
  void prevState;
  const session = await assertAdmin();
  if (!session) return { success: false, message: "Only admin can manage fund.", toastKey: Date.now() };

  const parsed = createFundTransactionSchema.safeParse({
    type: formData.get("type"),
    category: formData.get("category"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  await db.fundTransaction.create({
    data: {
      type: parsed.data.type,
      category: parsed.data.category,
      status: parsed.data.status,
      amount: parsed.data.amount,
      description: parsed.data.description?.trim() || null,
      date: new Date(parsed.data.date),
      createdBy: session.user.id,
    },
  });

  revalidateFundPages();
  return { success: true, message: "Fund transaction saved successfully.", toastKey: Date.now() };
}

export async function updateFundTransactionAction(
  prevState: FundActionState = defaultState,
  formData: FormData,
): Promise<FundActionState> {
  void prevState;
  const session = await assertAdmin();
  if (!session) return { success: false, message: "Only admin can manage fund.", toastKey: Date.now() };

  const parsed = updateFundTransactionSchema.safeParse({
    transactionId: formData.get("transactionId"),
    type: formData.get("type"),
    category: formData.get("category"),
    status: formData.get("status"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    date: formData.get("date"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  await db.fundTransaction.update({
    where: { id: parsed.data.transactionId },
    data: {
      type: parsed.data.type,
      category: parsed.data.category,
      status: parsed.data.status,
      amount: parsed.data.amount,
      description: parsed.data.description?.trim() || null,
      date: new Date(parsed.data.date),
    },
  });

  revalidateFundPages();
  return { success: true, message: "Fund transaction updated.", toastKey: Date.now() };
}

export async function deleteFundTransactionAction(
  prevState: FundActionState = defaultState,
  formData: FormData,
): Promise<FundActionState> {
  void prevState;
  const session = await assertAdmin();
  if (!session) return { success: false, message: "Only admin can manage fund.", toastKey: Date.now() };

  const parsed = deleteFundTransactionSchema.safeParse({
    transactionId: formData.get("transactionId"),
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid request.", toastKey: Date.now() };
  }

  await db.fundTransaction.delete({
    where: { id: parsed.data.transactionId },
  });

  revalidateFundPages();
  return { success: true, message: "Fund transaction deleted.", toastKey: Date.now() };
}
