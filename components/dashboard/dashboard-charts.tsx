"use client";

import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type SpendingPoint = {
  label: string;
  spending: number;
};

type FundPiePoint = {
  name: "Income" | "Expense";
  value: number;
};

const fundColors: Record<FundPiePoint["name"], string> = {
  Income: "hsl(142, 71%, 45%)",
  Expense: "var(--destructive)",
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function DashboardSpendingLineChart({ data }: { data: SpendingPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <XAxis dataKey="label" />
        <YAxis />
        <Tooltip formatter={(value) => formatVnd(Number(value))} />
        <Line type="monotone" dataKey="spending" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DashboardFundPieChart({ data }: { data: FundPiePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" outerRadius={90} label>
          {data.map((entry) => (
            <Cell key={entry.name} fill={fundColors[entry.name] ?? "#6b7280"} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => formatVnd(Number(value))} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
