"use server";

import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createBudgetExpense,
  deleteBudgetTransaction,
  toPrismaKnownError,
  updateBudgetTotal,
  updateBudgetTransaction,
} from "@/lib/budget-service";
import {
  createExpenseSchema,
  deleteExpenseSchema,
  updateExpenseSchema,
  updateMonthlyBudgetSchema,
} from "@/lib/validations/budget";

export type BudgetActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  toastKey?: number;
};

const initialState: BudgetActionState = {
  success: false,
  message: "",
};

function parseBudgetMonth(value?: string) {
  if (!value) return null;
  const [y, m] = value.split("-").map((part) => Number(part));
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return null;
  }
  return { year: y, month: m };
}

export async function createExpenseAction(
  prevState: BudgetActionState = initialState,
  formData: FormData,
): Promise<BudgetActionState> {
  void prevState;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return {
      success: false,
      message: "Only admin can add budget expenses.",
      toastKey: Date.now(),
    };
  }

  const parsed = createExpenseSchema.safeParse({
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description"),
    date: formData.get("date"),
    budgetMonth: formData.get("budgetMonth"),
    sessionId: formData.get("sessionId"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  try {
    const budgetMonth = parseBudgetMonth(parsed.data.budgetMonth);

    await createBudgetExpense({
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      budgetYear: budgetMonth?.year,
      budgetMonth: budgetMonth?.month,
      sessionId: parsed.data.sessionId || undefined,
      createdBy: session.user.id,
    });
  } catch (error) {
    return {
      success: false,
      message: toPrismaKnownError(error)
        ? "Could not save transaction due to database constraint."
        : "Unexpected error while creating expense.",
      toastKey: Date.now(),
    };
  }

  revalidatePath("/budget");
  const budgetMonth = parseBudgetMonth(parsed.data.budgetMonth);
  if (budgetMonth) {
    revalidatePath(`/budget/${budgetMonth.year}/${budgetMonth.month}`);
  } else {
    const expenseDate = new Date(parsed.data.date);
    revalidatePath(`/budget/${expenseDate.getFullYear()}/${expenseDate.getMonth() + 1}`);
  }
  revalidatePath("/");

  return {
    success: true,
    message: "Expense transaction created.",
    toastKey: Date.now(),
  };
}

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) return null;
  return session;
}

export async function updateMonthlyBudgetAction(formData: FormData) {
  const session = await assertAdmin();
  if (!session) return;

  const budgetId = formData.get("budgetId");
  const targetBudget =
    typeof budgetId === "string" && budgetId
      ? await db.monthlyBudget.findUnique({
          where: { id: budgetId },
          select: { year: true, month: true },
        })
      : null;

  const parsed = updateMonthlyBudgetSchema.safeParse({
    budgetId,
    totalAmount: formData.get("totalAmount"),
  });
  if (!parsed.success) return;

  await updateBudgetTotal({
    budgetId: parsed.data.budgetId,
    totalAmount: parsed.data.totalAmount,
  });

  revalidatePath("/budget");
  if (targetBudget) {
    revalidatePath(`/budget/${targetBudget.year}/${targetBudget.month}`);
  }
  revalidatePath("/");
}

export async function updateExpenseAction(
  prevState: BudgetActionState = initialState,
  formData: FormData,
): Promise<BudgetActionState> {
  void prevState;
  const session = await assertAdmin();
  if (!session) {
    return {
      success: false,
      message: "Only admin can update budget expenses.",
      toastKey: Date.now(),
    };
  }

  const parsed = updateExpenseSchema.safeParse({
    transactionId: formData.get("transactionId"),
    amount: formData.get("amount"),
    category: formData.get("category"),
    description: formData.get("description"),
    date: formData.get("date"),
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  try {
    await updateBudgetTransaction({
      transactionId: parsed.data.transactionId,
      amount: parsed.data.amount,
      category: parsed.data.category,
      description: parsed.data.description,
      date: new Date(parsed.data.date),
      sessionId: parsed.data.sessionId || undefined,
    });
  } catch (error) {
    return {
      success: false,
      message: toPrismaKnownError(error)
        ? "Could not update transaction due to database constraint."
        : "Unexpected error while updating transaction.",
      toastKey: Date.now(),
    };
  }

  revalidatePath("/budget");
  const expenseDate = new Date(parsed.data.date);
  revalidatePath(`/budget/${expenseDate.getFullYear()}/${expenseDate.getMonth() + 1}`);
  revalidatePath("/");

  return {
    success: true,
    message: "Transaction updated.",
    toastKey: Date.now(),
  };
}

export async function deleteExpenseAction(
  prevState: BudgetActionState = initialState,
  formData: FormData,
): Promise<BudgetActionState> {
  void prevState;
  const session = await assertAdmin();
  if (!session) {
    return {
      success: false,
      message: "Only admin can delete budget expenses.",
      toastKey: Date.now(),
    };
  }

  const parsed = deleteExpenseSchema.safeParse({
    transactionId: formData.get("transactionId"),
  });
  if (!parsed.success) {
    return {
      success: false,
      message: "Transaction id is invalid.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  const targetBudget = await db.budgetTransaction.findUnique({
    where: { id: parsed.data.transactionId },
    select: {
      monthlyBudget: {
        select: {
          year: true,
          month: true,
        },
      },
    },
  });

  try {
    await deleteBudgetTransaction({ transactionId: parsed.data.transactionId });
  } catch (error) {
    return {
      success: false,
      message: toPrismaKnownError(error)
        ? "Could not delete transaction due to database constraint."
        : "Unexpected error while deleting transaction.",
      toastKey: Date.now(),
    };
  }

  revalidatePath("/budget");
  if (targetBudget?.monthlyBudget) {
    revalidatePath(`/budget/${targetBudget.monthlyBudget.year}/${targetBudget.monthlyBudget.month}`);
  }
  revalidatePath("/");

  return {
    success: true,
    message: "Transaction deleted.",
    toastKey: Date.now(),
  };
}
