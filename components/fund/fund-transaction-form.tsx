"use client";

import {
  FundTransactionCategory,
  FundTransactionStatus,
  FundTransactionType,
} from "@prisma/client";
import { useActionState } from "react";

import {
  createFundTransactionAction,
  type FundActionState,
} from "@/app/(dashboard)/fund/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/lib/use-action-toast";

const initialState: FundActionState = {
  success: false,
  message: "",
};

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export function FundTransactionForm() {
  const [state, action] = useActionState(createFundTransactionAction, initialState);
  useActionToast(state, {
    successPrefix: "Fund transaction saved",
    errorPrefix: "Unable to save transaction",
  });

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-medium">Add Fund Transaction</h2>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="type">Type</Label>
          <select
            id="type"
            name="type"
            defaultValue={FundTransactionType.INCOME}
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value={FundTransactionType.INCOME}>Income</option>
            <option value={FundTransactionType.EXPENSE}>Expense</option>
          </select>
          {state.errors?.type ? (
            <p className="text-xs text-destructive">{state.errors.type[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            defaultValue={FundTransactionCategory.DONATION}
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
          >
            {Object.values(FundTransactionCategory).map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          {state.errors?.category ? (
            <p className="text-xs text-destructive">{state.errors.category[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={FundTransactionStatus.PENDING}
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value={FundTransactionStatus.PENDING}>Pending</option>
            <option value={FundTransactionStatus.COMPLETED}>Completed</option>
          </select>
          {state.errors?.status ? (
            <p className="text-xs text-destructive">{state.errors.status[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount">Amount (VND)</Label>
          <Input id="amount" name="amount" type="number" min={1} placeholder="100000" />
          {state.errors?.amount ? (
            <p className="text-xs text-destructive">{state.errors.amount[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={todayInputValue()} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" placeholder="Transaction note" />
        </div>
      </div>
      {state.message && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit">Save Transaction</Button>
    </form>
  );
}
