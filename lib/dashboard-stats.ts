import { db } from "@/lib/db";
import { FundTransactionType, SessionAttendanceStatus } from "@prisma/client";

type SpendingTrendPoint = {
  label: string;
  spending: number;
};

type FundPiePoint = {
  name: "Income" | "Expense";
  value: number;
};

type AttendanceRankingItem = {
  memberId: string;
  memberCode: string;
  memberName: string;
  attendanceCount: number;
};

type FineRankingItem = {
  memberId: string;
  memberCode: string;
  memberName: string;
  totalFine: number;
};

export type DashboardStats = {
  year: number;
  currentFundBalance: number;
  monthlyBudgetRemaining: number;
  totalSessionsThisMonth: number;
  yourAttendanceThisMonth: number;
  monthlySpendingTrend: SpendingTrendPoint[];
  fundIncomeVsExpense: FundPiePoint[];
  attendanceRanking: AttendanceRankingItem[];
  fineRanking: FineRankingItem[];
};

function asObject(input: unknown): Record<string, unknown> {
  if (input && typeof input === "object") {
    return input as Record<string, unknown>;
  }
  return {};
}

function asArray(input: unknown): unknown[] {
  if (Array.isArray(input)) return input;

  const obj = asObject(input);
  const cursor = asObject(obj.cursor);
  const firstBatch = cursor.firstBatch;
  if (Array.isArray(firstBatch)) return firstBatch;

  return [];
}

function asNumber(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input === "string") {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (input != null && typeof input === "object") {
    const obj = input as Record<string, unknown>;
    if (typeof obj.toNumber === "function") return Number((obj.toNumber as () => number)());
    if (typeof obj.valueOf === "function") {
      const n = (obj.valueOf as () => number)();
      return Number.isFinite(n) ? n : 0;
    }
  }
  return 0;
}

function extractObjectId(input: unknown): string {
  if (typeof input === "string") return input;
  const obj = asObject(input);
  const oid = obj.$oid;
  return typeof oid === "string" ? oid : "";
}

function startAndEndOfYear(year: number) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return { start, end };
}

/** Reference month for "this month" in the selected year: current month if viewing current year, else December. */
function referenceMonthForYear(year: number): number {
  const now = new Date();
  return year === now.getFullYear() ? now.getMonth() + 1 : 12;
}

export async function getDashboardStats(
  year: number,
  currentUserId?: string,
): Promise<DashboardStats> {
  const DEFAULT_MONTHLY_BUDGET = 2_000_000;
  const { start: yearStart, end: yearEnd } = startAndEndOfYear(year);
  const refMonth = referenceMonthForYear(year);
  const monthStart = new Date(Date.UTC(year, refMonth - 1, 1, 0, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(year, refMonth, 1, 0, 0, 0, 0));

  const [
    fundBalanceRows,
    yearlyFundTransactions,
    sessionsThisMonthCount,
    yourAttendanceThisMonthCount,
    monthlyBudget,
    trendRows,
    attendanceRows,
    fineRows,
  ] = await Promise.all([
    db.fundTransaction.aggregateRaw({
      pipeline: [
        {
          $group: {
            _id: null,
            inflow: {
              $sum: { $cond: [{ $eq: ["$type", "INCOME"] }, "$amount", 0] },
            },
            outflow: {
              $sum: { $cond: [{ $eq: ["$type", "EXPENSE"] }, "$amount", 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            balance: { $subtract: ["$inflow", "$outflow"] },
          },
        },
      ],
    }),
    db.fundTransaction.findMany({
      where: {
        date: { gte: yearStart, lt: yearEnd },
      },
      select: { type: true, amount: true },
    }),
    db.badmintonSession.count({
      where: {
        sessionDate: { gte: monthStart, lt: monthEnd },
      },
    }),
    (async () => {
      if (!currentUserId) return 0;
      const member = await db.member.findUnique({
        where: { userId: currentUserId },
        select: { id: true },
      });
      if (!member) return 0;
      return db.sessionAttendance.count({
        where: {
          memberId: member.id,
          status: { in: [SessionAttendanceStatus.PRESENT, SessionAttendanceStatus.LATE] },
          session: {
            sessionDate: { gte: monthStart, lt: monthEnd },
          },
        },
      });
    })(),
    db.monthlyBudget.findUnique({
      where: {
        year_month: { year, month: refMonth },
      },
      select: {
        remainingAmount: true,
      },
    }),
    db.monthlyBudget.aggregateRaw({
      pipeline: [
        { $match: { year } },
        { $sort: { month: 1 } },
        { $project: { _id: 0, year: 1, month: 1, spentAmount: 1 } },
      ],
    }),
    db.sessionAttendance.findMany({
      where: {
        status: { in: [SessionAttendanceStatus.PRESENT, SessionAttendanceStatus.LATE] },
        session: {
          sessionDate: { gte: yearStart, lt: yearEnd },
        },
      },
      select: {
        memberId: true,
        member: {
          select: {
            memberCode: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    db.sessionAttendance.findMany({
      where: {
        fineAmount: { gt: 0 },
        session: {
          sessionDate: { gte: yearStart, lt: yearEnd },
        },
      },
      select: {
        memberId: true,
        fineAmount: true,
        member: {
          select: {
            memberCode: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const parsedFundBalanceRows = asArray(fundBalanceRows);
  const parsedTrendRows = asArray(trendRows);

  let yearlyIncome = 0;
  let yearlyExpense = 0;
  for (const tx of yearlyFundTransactions) {
    const amount = Number(tx.amount);
    if (tx.type === FundTransactionType.INCOME) yearlyIncome += amount;
    else yearlyExpense += amount;
  }
  const attendanceByMember = new Map<
    string,
    { memberCode: string; memberName: string; attendanceCount: number }
  >();
  for (const row of attendanceRows) {
    const existing = attendanceByMember.get(row.memberId);
    if (existing) {
      existing.attendanceCount += 1;
      continue;
    }
    attendanceByMember.set(row.memberId, {
      memberCode: row.member.memberCode,
      memberName: row.member.user.name ?? row.member.user.email,
      attendanceCount: 1,
    });
  }

  const attendanceRanking: AttendanceRankingItem[] = Array.from(attendanceByMember.entries())
    .map(([memberId, data]) => ({
      memberId,
      memberCode: data.memberCode,
      memberName: data.memberName,
      attendanceCount: data.attendanceCount,
    }))
    .sort((a, b) => b.attendanceCount - a.attendanceCount)
    .slice(0, 10);

  const fineByMember = new Map<
    string,
    { memberCode: string; memberName: string; totalFine: number }
  >();
  for (const row of fineRows) {
    const fineAmount = row.fineAmount ?? 0;
    const existing = fineByMember.get(row.memberId);
    if (existing) {
      existing.totalFine += fineAmount;
      continue;
    }
    fineByMember.set(row.memberId, {
      memberCode: row.member.memberCode,
      memberName: row.member.user.name ?? row.member.user.email,
      totalFine: fineAmount,
    });
  }

  const fineRanking: FineRankingItem[] = Array.from(fineByMember.entries())
    .map(([memberId, data]) => ({
      memberId,
      memberCode: data.memberCode,
      memberName: data.memberName,
      totalFine: data.totalFine,
    }))
    .sort((a, b) => b.totalFine - a.totalFine)
    .slice(0, 10);

  const spentByMonth = new Map<number, number>();
  for (const row of parsedTrendRows) {
    const obj = asObject(row);
    spentByMonth.set(asNumber(obj.month), asNumber(obj.spentAmount));
  }
  const monthlySpendingTrend: SpendingTrendPoint[] = Array.from(
    { length: 12 },
    (_, i) => {
      const month = i + 1;
      return {
        label: `${month.toString().padStart(2, "0")}/${year}`,
        spending: spentByMonth.get(month) ?? 0,
      };
    },
  );

  const fundIncomeVsExpense: FundPiePoint[] = [
    { name: "Income", value: yearlyIncome },
    { name: "Expense", value: yearlyExpense },
  ];

  const fundBalanceRow = parsedFundBalanceRows[0];
  return {
    year,
    currentFundBalance: asNumber(fundBalanceRow != null ? asObject(fundBalanceRow).balance : 0),
    monthlyBudgetRemaining: monthlyBudget?.remainingAmount ?? DEFAULT_MONTHLY_BUDGET,
    totalSessionsThisMonth: sessionsThisMonthCount,
    yourAttendanceThisMonth: yourAttendanceThisMonthCount,
    monthlySpendingTrend,
    fundIncomeVsExpense,
    attendanceRanking,
    fineRanking,
  };
}
