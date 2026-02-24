import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { BudgetManagement } from "@/components/budget/budget-management";
import { getBudgetPageData, normalizeBudgetYearMonth } from "@/lib/budget-service";

type BudgetDetailPageProps = {
  params: Promise<{
    year: string;
    month: string;
  }>;
};

function mapBudgetProps(data: Awaited<ReturnType<typeof getBudgetPageData>>) {
  return {
    selectedBudget: data.selectedBudget,
    transactions: data.transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      category: tx.category,
      description: tx.description,
      date: tx.date,
      sessionId: tx.sessionId,
      sessionTitle: tx.session?.title ?? null,
    })),
    sessions: data.sessions,
    history: data.history,
    monthlyTrend: data.monthlyTrend.slice(-12),
    categoryBreakdown: data.categoryBreakdown,
    summary: data.summary,
  };
}

export default async function BudgetDetailPage({ params }: BudgetDetailPageProps) {
  const session = await getServerSession(authOptions);
  const canManage = session?.user?.role === Role.ADMIN;

  const routeParams = await params;
  const { year, month } = normalizeBudgetYearMonth(routeParams);
  const data = await getBudgetPageData(year, month);

  return (
    <BudgetManagement
      year={year}
      month={month}
      canManage={canManage}
      {...mapBudgetProps(data)}
    />
  );
}
