import { type FundTransactionCategory, FundTransactionType } from "@prisma/client";

import { db } from "@/lib/db";

function parseDateParam(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function endOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function asObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object") return input as Record<string, unknown>;
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

export function getFundDateFilter(search: { from?: string; to?: string }) {
  const from = parseDateParam(search.from);
  const to = parseDateParam(search.to);

  if (!from && !to) return undefined;
  return {
    gte: from ?? undefined,
    lte: to ? endOfDay(to) : undefined,
  };
}

function getCurrentYearDateFilter() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = endOfDay(new Date(now.getFullYear(), 11, 31));
  return { gte: start, lte: end };
}

export function isIncomeType(type: FundTransactionType) {
  return type === FundTransactionType.INCOME;
}

export type FundCategoryPoint = { name: string; value: number };

export async function getFundPageData() {
  const dateFilter = getCurrentYearDateFilter();

  const [
    transactions,
    totalBalanceRows,
    incomeGrouped,
    expenseGrouped,
  ] = await Promise.all([
    db.fundTransaction.findMany({
      where: { date: dateFilter },
      orderBy: { date: "desc" },
      take: 100,
    }),
    db.fundTransaction.aggregateRaw({
      pipeline: [
        {
          $group: {
            _id: null,
            income: {
              $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0] },
            },
            expense: {
              $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            balance: { $subtract: ["$income", "$expense"] },
          },
        },
      ],
    }),
    db.fundTransaction.groupBy({
      by: ["category"],
      where: { date: dateFilter, type: FundTransactionType.INCOME },
      _sum: { amount: true },
    }),
    db.fundTransaction.groupBy({
      by: ["category"],
      where: { date: dateFilter, type: FundTransactionType.EXPENSE },
      _sum: { amount: true },
    }),
  ]);

  const totalAgg = asObject(asArray(totalBalanceRows)[0]);

  const filteredIncome = transactions.reduce(
    (sum, tx) => sum + (tx.type === FundTransactionType.INCOME ? tx.amount : 0),
    0,
  );
  const filteredExpense = transactions.reduce(
    (sum, tx) => sum + (tx.type === FundTransactionType.EXPENSE ? tx.amount : 0),
    0,
  );

  const toCategoryPoint = (row: {
    category: FundTransactionCategory;
    _sum: { amount: number | null };
  }): FundCategoryPoint => ({
    name: row.category.replace(/_/g, " "),
    value: row._sum.amount ?? 0,
  });

  const incomeByCategory: FundCategoryPoint[] = incomeGrouped
    .map(toCategoryPoint)
    .filter((p) => p.value > 0);
  const expenseByCategory: FundCategoryPoint[] = expenseGrouped
    .map(toCategoryPoint)
    .filter((p) => p.value > 0);

  return {
    transactions,
    summary: {
      currentBalance: asNumber(totalAgg.balance),
      filteredIncome,
      filteredExpense,
      filteredNet: filteredIncome - filteredExpense,
    },
    incomeByCategory,
    expenseByCategory,
  };
}
