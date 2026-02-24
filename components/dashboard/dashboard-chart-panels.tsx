"use client";

import dynamic from "next/dynamic";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartNoAxesCombined } from "lucide-react";

const DashboardSpendingLineChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then(
      (mod) => mod.DashboardSpendingLineChart,
    ),
  { ssr: false },
);

const DashboardFundPieChart = dynamic(
  () =>
    import("@/components/dashboard/dashboard-charts").then(
      (mod) => mod.DashboardFundPieChart,
    ),
  { ssr: false },
);

type SpendingPoint = {
  label: string;
  spending: number;
};

type FundPiePoint = {
  name: "Income" | "Expense";
  value: number;
};

export function DashboardChartPanels({
  year,
  spendingTrend,
  fundIncomeVsExpense,
}: {
  year: number;
  spendingTrend: SpendingPoint[];
  fundIncomeVsExpense: FundPiePoint[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-accent/20 hover:shadow-lg">
        <div className="mb-3">
          <h2 className="text-lg font-medium">Spending Trend</h2>
          <p className="text-xs text-muted-foreground">
            Monthly budget spending for {year} (whole year)
          </p>
        </div>
        {spendingTrend.length ? (
          <div className="h-72 w-full">
            <DashboardSpendingLineChart data={spendingTrend} />
          </div>
        ) : (
          <EmptyState
            className="min-h-72"
            title="No spending trend yet"
            description="Add transactions to visualize monthly spending trends."
            icon={ChartNoAxesCombined}
          />
        )}
      </div>

      <div className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-accent/20 hover:shadow-lg">
        <div className="mb-3">
          <h2 className="text-lg font-medium">Fund Income vs Expense</h2>
          <p className="text-xs text-muted-foreground">
            Fund transactions for {year} (whole year)
          </p>
        </div>
        {fundIncomeVsExpense.length > 0 &&
        fundIncomeVsExpense.some((d) => d.value > 0) ? (
          <div className="h-72 w-full">
            <DashboardFundPieChart data={fundIncomeVsExpense} />
          </div>
        ) : (
          <EmptyState
            className="min-h-72"
            title="No fund flow data"
            description="Income and expense visuals appear after transactions are recorded."
            icon={ChartNoAxesCombined}
          />
        )}
      </div>
    </div>
  );
}
