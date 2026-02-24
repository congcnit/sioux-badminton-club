import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

import { DashboardChartPanels } from "@/components/dashboard/dashboard-chart-panels";
import { DashboardYearSelect } from "@/components/dashboard/dashboard-year-select";
import { EmptyState } from "@/components/ui/empty-state";
import { PageMotion, StaggerChildren, FadeUpItem, HeroMotion } from "@/components/ui/motion";
import { SportCard, SportCardHeader } from "@/components/ui/sport-card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { authOptions } from "@/lib/auth";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { BarChart3, CalendarCheck2, CircleDollarSign, UserCheck, Wallet } from "lucide-react";

const DASHBOARD_START_YEAR = 2026;

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function parseYearParam(value: string | undefined): number {
  const current = new Date().getFullYear();
  if (value == null || value === "") return current;
  const n = Number(value);
  if (!Number.isFinite(n)) return current;
  return Math.min(current, Math.max(DASHBOARD_START_YEAR, n));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseYearParam(params.year);

  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === Role.ADMIN;

  const stats = await getDashboardStats(selectedYear, session?.user?.id);
  const isFundNegative = stats.currentFundBalance < 0;
  const isBudgetNegative = stats.monthlyBudgetRemaining < 0;
  const refMonth =
    selectedYear === currentYear ? new Date().getMonth() + 1 : 12;
  const refMonthLabel = new Date(selectedYear, refMonth - 1).toLocaleString(
    "en-US",
    { month: "long", year: "numeric" },
  );
  const rankLabelClass = (index: number) => {
    if (index === 0) return "bg-sport-gold/20 text-sport-gold border border-sport-gold/40";
    if (index === 1) return "bg-sport-silver/20 text-sport-silver border border-sport-silver/40";
    if (index === 2) return "bg-sport-bronze/20 text-sport-bronze border border-sport-bronze/40";
    return "bg-muted/80 text-muted-foreground border border-border";
  };

  return (
    <PageMotion className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <HeroMotion
            title="Dashboard"
            subtitle={`Overview of club finance and performance for ${selectedYear}.`}
          />
          {isAdmin && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year</span>
              <DashboardYearSelect currentYear={currentYear} selectedYear={selectedYear} />
            </div>
          )}
        </div>

        <StaggerChildren className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FadeUpItem index={0}>
              <StatCard
            label="Budget Remaining This Month"
            value={formatVnd(stats.monthlyBudgetRemaining)}
            valueClassName={isBudgetNegative ? "text-destructive" : "text-emerald-400"}
            helperText={refMonthLabel}
            icon={<CircleDollarSign className="size-4" />}
          />
          </FadeUpItem>
          <FadeUpItem index={1}>
            <StatCard
              label="Total Sessions This Month"
              value={stats.totalSessionsThisMonth}
              valueClassName="text-sky-400"
              helperText={refMonthLabel}
              icon={<CalendarCheck2 className="size-4" />}
            />
          </FadeUpItem>
          <FadeUpItem index={2}>
            <StatCard
              label="Your Attendance This Month"
              value={stats.yourAttendanceThisMonth}
              valueClassName="text-sky-400"
              helperText={refMonthLabel}
              icon={<UserCheck className="size-4" />}
            />
          </FadeUpItem>
          <FadeUpItem index={3}>
            <StatCard
              label="Fund Balance"
              value={formatVnd(stats.currentFundBalance)}
              valueClassName={isFundNegative ? "text-destructive" : "text-emerald-400"}
              helperText={`${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
              icon={<Wallet className="size-4" />}
            />
          </FadeUpItem>
        </StaggerChildren>

        <div className="grid gap-4 xl:grid-cols-2">
          <SportCard variant="leaderboard" className="overflow-hidden">
            <SportCardHeader
              title="Attendance Ranking"
              subtitle={`Top 10 based on attendance in ${selectedYear}`}
            />
            <div className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.attendanceRanking.map((row, index) => (
                <TableRow key={row.memberId}>
                  <TableCell>
                    <span className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${rankLabelClass(index)}`}>
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell>{row.memberName}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600">
                    {row.attendanceCount}
                  </TableCell>
                </TableRow>
              ))}
              {!stats.attendanceRanking.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-4">
                    <EmptyState
                      title="No attendance data"
                      description="No attendance records have been captured yet."
                      icon={BarChart3}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
            </div>
          </SportCard>

          <SportCard variant="leaderboard" className="overflow-hidden">
            <SportCardHeader
              title="Fine Ranking"
              subtitle={`Top 10 based on attendance fines in ${selectedYear}`}
            />
            <div className="p-4 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Fine Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.fineRanking.map((row, index) => (
                <TableRow key={row.memberId}>
                  <TableCell>
                    <span className={`inline-flex min-w-6 justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${rankLabelClass(index)}`}>
                      {index + 1}
                    </span>
                  </TableCell>
                  <TableCell>{row.memberName}</TableCell>
                  <TableCell className="text-right font-medium text-rose-600">
                    {formatVnd(row.totalFine)}
                  </TableCell>
                </TableRow>
              ))}
              {!stats.fineRanking.length ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-4">
                    <EmptyState
                      title="No fine data"
                      description="No fines have been recorded yet."
                      icon={BarChart3}
                    />
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
            </div>
          </SportCard>
        </div>

        <DashboardChartPanels
        year={stats.year}
        spendingTrend={stats.monthlySpendingTrend}
        fundIncomeVsExpense={stats.fundIncomeVsExpense}
      />
    </PageMotion>
  );
}
