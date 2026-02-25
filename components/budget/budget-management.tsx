"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useActionState } from "react";
import { BudgetCategoryType } from "@prisma/client";

import {
  createExpenseAction,
  deleteExpenseAction,
  type BudgetActionState,
  updateExpenseAction,
  updateMonthlyBudgetAction,
} from "@/app/(dashboard)/budget/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useActionToast } from "@/lib/use-action-toast";
import { WalletCards } from "lucide-react";

type SessionOption = {
  id: string;
  title: string;
  sessionDate: Date;
  court: {
    name: string;
  } | null;
};

type TransactionItem = {
  id: string;
  amount: number;
  category: BudgetCategoryType;
  description: string | null;
  date: Date;
  sessionId: string | null;
  sessionTitle: string | null;
};

type HistoryItem = {
  id: string;
  year: number;
  month: number;
  totalAmount: number;
  spentAmount: number;
  remainingAmount: number;
};

type TrendPoint = {
  label: string;
  spentAmount: number;
};

type CategoryPoint = {
  category: BudgetCategoryType;
  total: number;
};

type BudgetManagementProps = {
  year: number;
  month: number;
  canManage: boolean;
  selectedBudget: {
    id: string;
    totalAmount: number;
    spentAmount: number;
    remainingAmount: number;
  };
  transactions: TransactionItem[];
  sessions: SessionOption[];
  history: HistoryItem[];
  monthlyTrend: TrendPoint[];
  categoryBreakdown: CategoryPoint[];
  summary: {
    totalBudgetAllMonths: number;
    totalSpentAllMonths: number;
    totalRemainingAllMonths: number;
  };
};

const SpendingTrendChart = dynamic(
  () => import("@/components/budget/budget-charts").then((mod) => mod.SpendingTrendChart),
  { ssr: false },
);

const CategoryBreakdownChart = dynamic(
  () =>
    import("@/components/budget/budget-charts").then((mod) => mod.CategoryBreakdownChart),
  { ssr: false },
);

const initialState: BudgetActionState = { success: false, message: "" };

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function budgetCategoryChipClass(category: BudgetCategoryType) {
  switch (category) {
    case BudgetCategoryType.COURT:
      return "bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40";
    case BudgetCategoryType.SHUTTLECOCK:
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40";
    case BudgetCategoryType.OTHER:
      return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function monthPath(year: number, month: number) {
  return `/budget/${year}/${month}`;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function budgetMonthValue(year: number, month: number) {
  return `${year}-${month.toString().padStart(2, "0")}`;
}

function sessionOptionLabel(session: SessionOption) {
  const date = session.sessionDate.toISOString().slice(0, 10);
  return session.court?.name ? `${date} - ${session.court.name}` : date;
}

export function BudgetManagement({
  year,
  month,
  canManage,
  selectedBudget,
  transactions,
  sessions,
  history,
  monthlyTrend,
  categoryBreakdown,
  summary,
}: BudgetManagementProps) {
  const router = useRouter();
  const [createState, createAction] = useActionState(createExpenseAction, initialState);
  const [updateState, updateAction] = useActionState(updateExpenseAction, initialState);
  const [deleteState, deleteAction] = useActionState(deleteExpenseAction, initialState);

  useActionToast(createState, {
    successPrefix: "Expense added",
    errorPrefix: "Unable to add expense",
  });
  useActionToast(updateState, {
    successPrefix: "Transaction saved",
    errorPrefix: "Unable to save transaction",
  });
  useActionToast(deleteState, {
    successPrefix: "Transaction deleted",
    errorPrefix: "Unable to delete transaction",
  });

  useEffect(() => {
    if (createState.success && createState.toastKey) router.refresh();
  }, [createState.success, createState.toastKey, router]);
  useEffect(() => {
    if (updateState.success && updateState.toastKey) router.refresh();
  }, [updateState.success, updateState.toastKey, router]);
  useEffect(() => {
    if (deleteState.success && deleteState.toastKey) router.refresh();
  }, [deleteState.success, deleteState.toastKey, router]);
  const isOverBudget = selectedBudget.remainingAmount < 0;
  const utilization =
    selectedBudget.totalAmount > 0
      ? (selectedBudget.spentAmount / selectedBudget.totalAmount) * 100
      : 0;
  const totalAmountClass = "text-primary";
  const spentAmountClass = isOverBudget ? "text-destructive" : "text-amber-600";
  const remainingAmountClass = isOverBudget ? "text-destructive" : "text-emerald-600";
  const usageAmountClass = isOverBudget ? "text-destructive" : "text-sky-600";

  return (
    <section className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Monthly Budget</h1>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? `Manage budget for ${month.toString().padStart(2, "0")}/${year}`
            : `Budget overview for ${month.toString().padStart(2, "0")}/${year}`}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Monthly Budget</p>
          <p className={`mt-2 text-2xl font-semibold ${totalAmountClass}`}>
            {formatVnd(selectedBudget.totalAmount)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Spent Amount</p>
          <p className={`mt-2 text-2xl font-semibold ${spentAmountClass}`}>
            {formatVnd(selectedBudget.spentAmount)}
          </p>
        </div>
        <div className={`rounded-xl border bg-card p-5 shadow-sm ${isOverBudget ? "border-destructive" : ""}`}>
          <p className="text-sm text-muted-foreground">Remaining Amount</p>
          <p className={`mt-2 text-2xl font-semibold ${remainingAmountClass}`}>
            {formatVnd(selectedBudget.remainingAmount)}
          </p>
          {isOverBudget ? (
            <p className="mt-1 text-xs text-destructive">Budget exceeded for this month.</p>
          ) : null}
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Budget Usage</p>
          <p className={`mt-2 text-2xl font-semibold ${usageAmountClass}`}>
            {utilization.toFixed(1)}%
          </p>
        </div>
      </div>

      {canManage ? (
        <form action={updateMonthlyBudgetAction} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-medium">Update Monthly Budget Amount</h2>
          <input type="hidden" name="budgetId" value={selectedBudget.id} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="total-amount">Total Amount (VND)</Label>
              <Input
                id="total-amount"
                name="totalAmount"
                type="number"
                min={0}
                defaultValue={Math.round(selectedBudget.totalAmount)}
              />
            </div>
            <Button type="submit">Update total budget</Button>
          </div>
        </form>
      ) : null}

      {canManage ? (
        <form action={createAction} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-medium">Add Expense Transaction</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1">
            <Label htmlFor="amount">Amount (VND)</Label>
            <Input id="amount" name="amount" type="number" min={1} placeholder="150000" />
            {createState.errors?.amount ? (
              <p className="text-xs text-destructive">{createState.errors.amount[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="budgetMonth">Budget Month</Label>
            <Input
              id="budgetMonth"
              name="budgetMonth"
              type="month"
              defaultValue={budgetMonthValue(year, month)}
            />
            {createState.errors?.budgetMonth ? (
              <p className="text-xs text-destructive">{createState.errors.budgetMonth[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              defaultValue={BudgetCategoryType.COURT}
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              {Object.values(BudgetCategoryType).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={todayInputValue()} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sessionId">Session</Label>
            <select
              id="sessionId"
              name="sessionId"
              defaultValue=""
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="">No session</option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {sessionOptionLabel(session)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2 lg:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Court booking fee" />
          </div>
        </div>
          {createState.message && !createState.success ? (
            <p className="text-sm text-destructive">{createState.message}</p>
          ) : null}
          <Button type="submit">Add expense</Button>
        </form>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Monthly Spending Trend</h2>
          <div className="h-72 w-full">
            <SpendingTrendChart data={monthlyTrend} />
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Category Breakdown</h2>
          <div className="h-72 w-full">
            <CategoryBreakdownChart data={categoryBreakdown} />
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Transactions This Month</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Amount</TableHead>
              {canManage ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) =>
              canManage ? (
                <TableRow
                  key={`${tx.id}-${tx.sessionId ?? ""}-${tx.date.toISOString?.() ?? tx.date}-${tx.category}-${tx.amount}-${tx.description ?? ""}`}
                >
                  <TableCell>
                    <Input
                      form={`update-expense-${tx.id}`}
                      name="date"
                      type="date"
                      defaultValue={tx.date.toISOString().slice(0, 10)}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      form={`update-expense-${tx.id}`}
                      name="category"
                      defaultValue={tx.category}
                      className={cn(
                        "h-9 w-full rounded-full border px-2.5 text-xs font-medium",
                        budgetCategoryChipClass(tx.category),
                      )}
                    >
                      {Object.values(BudgetCategoryType).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      form={`update-expense-${tx.id}`}
                      name="description"
                      defaultValue={tx.description ?? ""}
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      form={`update-expense-${tx.id}`}
                      name="sessionId"
                      defaultValue={tx.sessionId ?? ""}
                      className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="">No session</option>
                      {sessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {sessionOptionLabel(session)}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Input
                      form={`update-expense-${tx.id}`}
                      name="amount"
                      type="number"
                      min={1}
                      defaultValue={Math.round(tx.amount)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <form id={`update-expense-${tx.id}`} action={updateAction}>
                        <input type="hidden" name="transactionId" value={tx.id} />
                        <Button size="sm" type="submit">
                          Save
                        </Button>
                      </form>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" type="button">
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent size="sm">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. The transaction will be removed and
                              monthly budget totals will be recalculated.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <form action={deleteAction}>
                              <input type="hidden" name="transactionId" value={tx.id} />
                              <AlertDialogAction asChild variant="destructive">
                                <button type="submit">Confirm Delete</button>
                              </AlertDialogAction>
                            </form>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow key={tx.id}>
                  <TableCell>{tx.date.toISOString().slice(0, 10)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        budgetCategoryChipClass(tx.category),
                      )}
                    >
                      {tx.category}
                    </span>
                  </TableCell>
                  <TableCell>{tx.description ?? "-"}</TableCell>
                  <TableCell>{tx.sessionTitle ?? "-"}</TableCell>
                  <TableCell>{formatVnd(tx.amount)}</TableCell>
                </TableRow>
              ),
            )}
            {!transactions.length ? (
              <TableRow>
                <TableCell colSpan={canManage ? 6 : 5} className="p-4">
                  <EmptyState
                    title="No transactions this month"
                    description={
                      canManage
                        ? "Add an expense transaction to start budget tracking."
                        : "No transactions found for this month."
                    }
                    icon={WalletCards}
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Budget History</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                {canManage ? <TableHead>Update</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link className="underline" href={monthPath(item.year, item.month)}>
                      {item.month.toString().padStart(2, "0")}/{item.year}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">{formatVnd(item.totalAmount)}</TableCell>
                  <TableCell className="text-right">{formatVnd(item.spentAmount)}</TableCell>
                  <TableCell
                    className={`text-right ${item.remainingAmount < 0 ? "text-destructive font-medium" : ""}`}
                  >
                    {formatVnd(item.remainingAmount)}
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <form action={updateMonthlyBudgetAction} className="flex items-center gap-2">
                        <input type="hidden" name="budgetId" value={item.id} />
                        <Input
                          name="totalAmount"
                          type="number"
                          min={0}
                          defaultValue={Math.round(item.totalAmount)}
                          className="h-8 w-32"
                        />
                        <Button size="sm" type="submit" variant="outline">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Financial Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Budget (History)</span>
              <span className="font-medium">{formatVnd(summary.totalBudgetAllMonths)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Spent (History)</span>
              <span className="font-medium">{formatVnd(summary.totalSpentAllMonths)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total Remaining (History)</span>
              <span
                className={`font-medium ${summary.totalRemainingAllMonths < 0 ? "text-destructive" : ""}`}
              >
                {formatVnd(summary.totalRemainingAllMonths)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
