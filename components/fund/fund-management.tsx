"use client";

import {
  FundTransaction,
  FundTransactionCategory,
  FundTransactionStatus,
  FundTransactionType,
} from "@prisma/client";
import { useActionState, useState } from "react";

import {
  deleteFundTransactionAction,
  type FundActionState,
  updateFundTransactionAction,
} from "@/app/(dashboard)/fund/actions";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isIncomeType } from "@/lib/fund-service";
import { useActionToast } from "@/lib/use-action-toast";
import { HandCoins } from "lucide-react";

import { FundCategoryCharts } from "@/components/fund/fund-category-charts";
import { FundTransactionForm } from "@/components/fund/fund-transaction-form";
import type { FundCategoryPoint } from "@/lib/fund-service";

const fundInitialState: FundActionState = { success: false, message: "" };

const chipBase = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium";

function fundTypeChipClass(type: FundTransactionType) {
  return type === FundTransactionType.INCOME
    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
    : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40";
}

function fundCategoryChipClass(category: FundTransactionCategory) {
  switch (category) {
    case "DONATION":
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40";
    case "FINE":
      return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40";
    case "GUEST_FEE":
      return "bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40";
    case "COURT":
      return "bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/40";
    case "SHUTTLECOCK":
      return "bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-500/40";
    case "ACTIVITY":
      return "bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-500/40";
    case "OTHER":
      return "bg-slate-500/20 text-slate-700 dark:text-slate-400 border border-slate-500/40";
    default:
      return "bg-muted/80 text-muted-foreground border border-border";
  }
}

function fundStatusChipClass(status: FundTransactionStatus) {
  return status === FundTransactionStatus.COMPLETED
    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
    : "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40";
}

type FundManagementProps = {
  transactions: FundTransaction[];
  summary: {
    currentBalance: number;
    filteredIncome: number;
    filteredExpense: number;
    filteredNet: number;
  };
  incomeByCategory: FundCategoryPoint[];
  expenseByCategory: FundCategoryPoint[];
  chartYear: number;
  canManage: boolean;
};

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FundManagement({
  transactions,
  summary,
  incomeByCategory,
  expenseByCategory,
  chartYear,
  canManage,
}: FundManagementProps) {
  const negativeBalance = summary.currentBalance < 0;
  const [deleteDialogTransactionId, setDeleteDialogTransactionId] = useState<string | null>(null);
  const [updateState, updateAction] = useActionState(updateFundTransactionAction, fundInitialState);
  const [deleteState, deleteAction] = useActionState(deleteFundTransactionAction, fundInitialState);

  useActionToast(updateState, {
    successPrefix: "Transaction saved",
    errorPrefix: "Unable to save transaction",
  });
  useActionToast(deleteState, {
    successPrefix: "Transaction deleted",
    errorPrefix: "Unable to delete transaction",
  });

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Club Fund</h1>
        <p className="text-sm text-muted-foreground">
          {canManage
            ? "Manage incomes and expenses with running balance."
            : "View fund transactions and running balance."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-card p-5 shadow-sm dark:border-emerald-900/50">
          <p className="text-sm text-muted-foreground">Income</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">
            {formatVnd(summary.filteredIncome)}
          </p>
        </div>
        <div className="rounded-xl border border-destructive/50 bg-card p-5 shadow-sm dark:border-destructive/50">
          <p className="text-sm text-muted-foreground">Expense</p>
          <p className="mt-2 text-2xl font-semibold text-destructive">
            {formatVnd(summary.filteredExpense)}
          </p>
        </div>
        <div
          className={`rounded-xl border bg-card p-5 shadow-sm ${
            negativeBalance ? "border-destructive" : "border-emerald-200 dark:border-emerald-900/50"
          }`}
        >
          <p className="text-sm text-muted-foreground">Balance</p>
          <p
            className={`mt-2 text-2xl font-semibold ${negativeBalance ? "text-destructive" : "text-emerald-700 dark:text-emerald-400"}`}
          >
            {formatVnd(summary.currentBalance)}
          </p>
        </div>
      </div>

      {canManage ? <FundTransactionForm /> : null}

      <FundCategoryCharts
        incomeByCategory={incomeByCategory}
        expenseByCategory={expenseByCategory}
        year={chartYear}
      />

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Transactions</h2>
        <Table className="min-w-[900px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Date</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
              <TableHead className="w-[110px]">Category</TableHead>
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="min-w-[200px] w-[200px]">Description</TableHead>
              <TableHead className="w-[120px] shrink-0 text-right">Amount</TableHead>
              {canManage ? <TableHead className="w-[160px]">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((tx) => {
              const formId = `update-fund-${tx.id}`;
              return canManage ? (
                <TableRow key={tx.id}>
                  <TableCell className="align-middle">
                    <form id={formId} action={updateAction}>
                      <input type="hidden" name="transactionId" value={tx.id} />
                      <Input
                        name="date"
                        type="date"
                        defaultValue={tx.date.toISOString().slice(0, 10)}
                        className="h-9 w-full"
                      />
                    </form>
                  </TableCell>
                  <TableCell className="align-middle">
                    <select
                      name="type"
                      form={formId}
                      defaultValue={tx.type}
                      className={`border-input bg-background h-7 w-full rounded-full border px-2.5 text-xs font-medium ${fundTypeChipClass(tx.type)}`}
                    >
                      <option value={FundTransactionType.INCOME}>Income</option>
                      <option value={FundTransactionType.EXPENSE}>Expense</option>
                    </select>
                  </TableCell>
                  <TableCell className="align-middle">
                    <select
                      name="category"
                      form={formId}
                      defaultValue={tx.category}
                      className={`border-input bg-background h-7 w-full rounded-full border px-2.5 text-xs font-medium ${fundCategoryChipClass(tx.category)}`}
                    >
                      {Object.values(FundTransactionCategory).map((value) => (
                        <option key={value} value={value}>
                          {value.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="align-middle">
                    <select
                      name="status"
                      form={formId}
                      defaultValue={tx.status ?? FundTransactionStatus.COMPLETED}
                      className={`border-input bg-background h-7 w-full rounded-full border px-2.5 text-xs font-medium ${fundStatusChipClass(tx.status ?? FundTransactionStatus.COMPLETED)}`}
                    >
                      <option value={FundTransactionStatus.PENDING}>Pending</option>
                      <option value={FundTransactionStatus.COMPLETED}>Completed</option>
                    </select>
                  </TableCell>
                  <TableCell className="align-middle min-w-[200px]">
                    <Input
                      name="description"
                      form={formId}
                      defaultValue={tx.description ?? ""}
                      className="h-9 min-w-0 w-full"
                    />
                  </TableCell>
                  <TableCell className="align-middle w-[120px] shrink-0 text-right">
                    <Input
                      name="amount"
                      form={formId}
                      type="number"
                      min={1}
                      defaultValue={Math.round(tx.amount)}
                      className={`h-9 w-full text-right ${isIncomeType(tx.type) ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex gap-2">
                      <Button size="sm" type="submit" form={formId}>
                        Save
                      </Button>
                      <AlertDialog
                        open={deleteDialogTransactionId === tx.id}
                        onOpenChange={(open) => {
                          if (!open) setDeleteDialogTransactionId(null);
                        }}
                      >
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            type="button"
                            variant="destructive"
                            onClick={() => setDeleteDialogTransactionId(tx.id)}
                          >
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent
                          size="sm"
                          onOverlayClick={() => setDeleteDialogTransactionId(null)}
                        >
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone and will change fund balances.
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
                    <span className={`${chipBase} ${fundTypeChipClass(tx.type)}`}>
                      {tx.type === FundTransactionType.INCOME ? "Income" : "Expense"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`${chipBase} ${fundCategoryChipClass(tx.category)}`}>
                      {tx.category.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`${chipBase} ${fundStatusChipClass(tx.status ?? FundTransactionStatus.COMPLETED)}`}>
                      {tx.status === FundTransactionStatus.COMPLETED ? "Completed" : "Pending"}
                    </span>
                  </TableCell>
                  <TableCell className="min-w-[200px]">
                    <span className="block truncate" title={tx.description ?? undefined}>
                      {tx.description ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`w-[120px] shrink-0 text-right font-medium ${
                      isIncomeType(tx.type) ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"
                    }`}
                  >
                    {formatVnd(tx.amount)}
                  </TableCell>
                </TableRow>
              );
            })}
            {!transactions.length ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="p-4">
                  <EmptyState
                    title="No transactions found"
                    description={
                      canManage
                        ? "No transactions this year yet. Add a new fund transaction."
                        : "No transactions this year yet."
                    }
                    icon={HandCoins}
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
