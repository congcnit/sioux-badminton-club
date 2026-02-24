"use client";

import { BudgetCategoryType } from "@prisma/client";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendPoint = {
  label: string;
  spentAmount: number;
};

type CategoryPoint = {
  category: BudgetCategoryType;
  total: number;
};

const categoryColors: Record<BudgetCategoryType, string> = {
  COURT: "#3b82f6",
  SHUTTLECOCK: "#10b981",
  OTHER: "#f59e0b",
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function SpendingTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip formatter={(value) => formatVnd(Number(value))} />
        <Line
          type="monotone"
          dataKey="spentAmount"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBreakdownChart({ data }: { data: CategoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="total" nameKey="category" outerRadius={90} label>
          {data.map((entry) => (
            <Cell key={entry.category} fill={categoryColors[entry.category] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatVnd(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
