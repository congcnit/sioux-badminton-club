import { BudgetCategoryType, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

const DEFAULT_MONTHLY_BUDGET = 2_000_000;

type TrendPoint = {
  label: string;
  spentAmount: number;
};

type CategoryBreakdownPoint = {
  category: BudgetCategoryType;
  total: number;
};

function asObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object") {
    return input as Record<string, unknown>;
  }
  return {};
}

function asArray(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;
  const root = asObject(input);
  const cursor = asObject(root.cursor);
  return Array.isArray(cursor.firstBatch) ? (cursor.firstBatch as unknown[]) : [];
}

function asNumber(input: unknown): number {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function ensureMonthlyBudget(year: number, month: number) {
  return db.monthlyBudget.upsert({
    where: { year_month: { year, month } },
    update: {},
    create: {
      year,
      month,
      totalAmount: DEFAULT_MONTHLY_BUDGET,
      spentAmount: 0,
      remainingAmount: DEFAULT_MONTHLY_BUDGET,
    },
  });
}

export async function createBudgetExpense(input: {
  amount: number;
  category: BudgetCategoryType;
  description?: string;
  date: Date;
  budgetYear?: number;
  budgetMonth?: number;
  sessionId?: string;
  createdBy: string;
}) {
  const year = input.budgetYear ?? input.date.getFullYear();
  const month = input.budgetMonth ?? (input.date.getMonth() + 1);

  await db.$transaction(async (tx) => {
    const budget = await tx.monthlyBudget.upsert({
      where: { year_month: { year, month } },
      update: {},
      create: {
        year,
        month,
        totalAmount: DEFAULT_MONTHLY_BUDGET,
        spentAmount: 0,
        remainingAmount: DEFAULT_MONTHLY_BUDGET,
      },
    });

    await tx.budgetTransaction.create({
      data: {
        monthlyBudgetId: budget.id,
        amount: input.amount,
        category: input.category,
        description: input.description?.trim() || null,
        date: input.date,
        sessionId: input.sessionId || null,
        createdBy: input.createdBy,
      },
    });

    await tx.monthlyBudget.update({
      where: { id: budget.id },
      data: {
        spentAmount: { increment: input.amount },
        remainingAmount: { decrement: input.amount },
      },
    });
  });
}

export async function updateBudgetTotal(input: { budgetId: string; totalAmount: number }) {
  await db.$transaction(async (tx) => {
    const budget = await tx.monthlyBudget.findUnique({
      where: { id: input.budgetId },
      select: { spentAmount: true },
    });
    if (!budget) return;

    await tx.monthlyBudget.update({
      where: { id: input.budgetId },
      data: {
        totalAmount: input.totalAmount,
        remainingAmount: input.totalAmount - budget.spentAmount,
      },
    });
  });
}

export async function updateBudgetTransaction(input: {
  transactionId: string;
  amount: number;
  category: BudgetCategoryType;
  description?: string;
  date: Date;
  sessionId?: string;
}) {
  await db.$transaction(async (tx) => {
    const existing = await tx.budgetTransaction.findUnique({
      where: { id: input.transactionId },
      include: { monthlyBudget: true },
    });
    if (!existing) return;

    const sourceBudget = existing.monthlyBudget;
    const targetYear = input.date.getFullYear();
    const targetMonth = input.date.getMonth() + 1;

    const targetBudget = await tx.monthlyBudget.upsert({
      where: { year_month: { year: targetYear, month: targetMonth } },
      update: {},
      create: {
        year: targetYear,
        month: targetMonth,
        totalAmount: DEFAULT_MONTHLY_BUDGET,
        spentAmount: 0,
        remainingAmount: DEFAULT_MONTHLY_BUDGET,
      },
    });

    await tx.budgetTransaction.update({
      where: { id: existing.id },
      data: {
        amount: input.amount,
        category: input.category,
        description: input.description?.trim() || null,
        date: input.date,
        sessionId: input.sessionId || null,
        monthlyBudgetId: targetBudget.id,
      },
    });

    if (sourceBudget.id === targetBudget.id) {
      const delta = input.amount - existing.amount;
      await tx.monthlyBudget.update({
        where: { id: sourceBudget.id },
        data: {
          spentAmount: { increment: delta },
          remainingAmount: { decrement: delta },
        },
      });
      return;
    }

    await tx.monthlyBudget.update({
      where: { id: sourceBudget.id },
      data: {
        spentAmount: { decrement: existing.amount },
        remainingAmount: { increment: existing.amount },
      },
    });

    await tx.monthlyBudget.update({
      where: { id: targetBudget.id },
      data: {
        spentAmount: { increment: input.amount },
        remainingAmount: { decrement: input.amount },
      },
    });
  });
}

export async function deleteBudgetTransaction(input: { transactionId: string }) {
  await db.$transaction(async (tx) => {
    const existing = await tx.budgetTransaction.findUnique({
      where: { id: input.transactionId },
      include: { monthlyBudget: true },
    });
    if (!existing) return;

    await tx.budgetTransaction.delete({
      where: { id: input.transactionId },
    });

    await tx.monthlyBudget.update({
      where: { id: existing.monthlyBudgetId },
      data: {
        spentAmount: { decrement: existing.amount },
        remainingAmount: { increment: existing.amount },
      },
    });
  });
}

export async function getBudgetPageData(year: number, month: number) {
  const selectedBudget = await ensureMonthlyBudget(year, month);
  const [history, sessions, transactions] = await Promise.all([
    db.monthlyBudget.findMany({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    }),
    db.badmintonSession.findMany({
      orderBy: { sessionDate: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        sessionDate: true,
        court: {
          select: { name: true },
        },
      },
    }),
    db.budgetTransaction.findMany({
      where: { monthlyBudgetId: selectedBudget.id },
      include: { session: true },
      orderBy: { date: "desc" },
    }),
  ]);

  const trendRows = asArray(
    await db.monthlyBudget.aggregateRaw({
      pipeline: [
        { $sort: { year: 1, month: 1 } },
        { $project: { _id: 0, year: 1, month: 1, spentAmount: 1 } },
      ],
    }),
  );

  const monthlyTrend: TrendPoint[] = trendRows.map((row) => {
    const obj = asObject(row);
    const y = asNumber(obj.year);
    const m = asNumber(obj.month);
    return {
      label: `${m.toString().padStart(2, "0")}/${y}`,
      spentAmount: asNumber(obj.spentAmount),
    };
  });

  const categoryTotals = new Map<BudgetCategoryType, number>();
  for (const tx of transactions) {
    categoryTotals.set(tx.category, (categoryTotals.get(tx.category) ?? 0) + tx.amount);
  }
  const categoryBreakdown: CategoryBreakdownPoint[] = Array.from(categoryTotals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  const selectedSpentAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const selectedBudgetWithCalculatedSpent = {
    ...selectedBudget,
    spentAmount: selectedSpentAmount,
    remainingAmount: selectedBudget.totalAmount - selectedSpentAmount,
  };

  const totalSpentAllMonths = history.reduce((sum, item) => sum + item.spentAmount, 0);
  const totalBudgetAllMonths = history.reduce((sum, item) => sum + item.totalAmount, 0);

  return {
    selectedBudget: selectedBudgetWithCalculatedSpent,
    transactions,
    history,
    sessions,
    monthlyTrend,
    categoryBreakdown,
    summary: {
      totalBudgetAllMonths,
      totalSpentAllMonths,
      totalRemainingAllMonths: totalBudgetAllMonths - totalSpentAllMonths,
    },
  };
}

export function normalizeBudgetYearMonth(params: {
  year?: string;
  month?: string;
}) {
  const now = new Date();
  const parsedYear = Number(params.year);
  const parsedMonth = Number(params.month);

  const year =
    Number.isInteger(parsedYear) && parsedYear >= 2000 && parsedYear <= 3000
      ? parsedYear
      : now.getFullYear();
  const month =
    Number.isInteger(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
      ? parsedMonth
      : now.getMonth() + 1;

  return { year, month };
}

export function toPrismaKnownError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}
