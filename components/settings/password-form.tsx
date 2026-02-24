"use client";

import { useActionState } from "react";

import {
  type AccountActionState,
  updatePasswordAction,
} from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/lib/use-action-toast";

const initialState: AccountActionState = {
  success: false,
  message: "",
};

export function PasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialState);
  useActionToast(state, {
    successPrefix: "Password updated",
    errorPrefix: "Unable to update password",
  });

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-medium">Change Password</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input id="currentPassword" name="currentPassword" type="password" />
          {state.errors?.currentPassword ? (
            <p className="text-xs text-destructive">
              {state.errors.currentPassword[0]}
            </p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="newPassword">New password</Label>
          <Input id="newPassword" name="newPassword" type="password" />
          {state.errors?.newPassword ? (
            <p className="text-xs text-destructive">{state.errors.newPassword[0]}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" />
          {state.errors?.confirmPassword ? (
            <p className="text-xs text-destructive">
              {state.errors.confirmPassword[0]}
            </p>
          ) : null}
        </div>
      </div>
      {state.message && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}
      <Button type="submit">Update password</Button>
    </form>
  );
}
