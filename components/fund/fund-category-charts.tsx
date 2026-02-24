"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { FundCategoryPoint } from "@/lib/fund-service";

const CATEGORY_COLORS: Record<string, string> = {
  DONATION: "hsl(142, 71%, 45%)",
  FINE: "hsl(25, 95%, 53%)",
  GUEST_FEE: "hsl(199, 89%, 48%)",
  COURT: "hsl(221, 83%, 53%)",
  SHUTTLECOCK: "hsl(160, 84%, 39%)",
  ACTIVITY: "hsl(262, 83%, 58%)",
  OTHER: "hsl(215, 14%, 50%)",
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function FundCategoryPieChart({
  data,
  title,
  emptyMessage,
}: {
  data: FundCategoryPoint[];
  title: string;
  emptyMessage: string;
}) {
  const hasData = data.length > 0 && data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <div className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-md">
        <h3 className="mb-3 text-lg font-medium">{title}</h3>
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    name: d.name.replace(/_/g, " "),
  }));

  return (
    <div className="rounded-xl border border-border/80 bg-card/80 p-4 shadow-md backdrop-blur-sm transition-all duration-300 hover:border-accent/20 hover:shadow-lg">
      <h3 className="mb-3 text-lg font-medium">{title}</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={90} label>
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={CATEGORY_COLORS[entry.name.replace(/ /g, "_")] ?? "hsl(215, 14%, 50%)"}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => formatVnd(Number(value))} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function FundCategoryCharts({
  incomeByCategory,
  expenseByCategory,
  year,
}: {
  incomeByCategory: FundCategoryPoint[];
  expenseByCategory: FundCategoryPoint[];
  year: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <FundCategoryPieChart
        data={incomeByCategory}
        title="Income by category"
        emptyMessage={`No income transactions in ${year} yet.`}
      />
      <FundCategoryPieChart
        data={expenseByCategory}
        title="Expense by category"
        emptyMessage={`No expense transactions in ${year} yet.`}
      />
    </div>
  );
}
