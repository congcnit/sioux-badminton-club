"use client";

import { useEffect } from "react";
import { toast } from "sonner";

/** State from useActionState; toastKey ensures the effect runs on every new submission. */
export type ActionFeedbackState = {
  success: boolean;
  message: string;
  /** Set by server actions so each response triggers the toast (required for 2nd+ saves). */
  toastKey?: number;
};

type UseActionToastOptions = {
  successPrefix?: string;
  errorPrefix?: string;
};

export function useActionToast(
  state: ActionFeedbackState,
  options: UseActionToastOptions = {},
) {
  const message = state.message.trim();
  const toastKey = state.toastKey ?? 0;

  useEffect(() => {
    if (!message) return;

    if (state.success) {
      toast.success(options.successPrefix ? `${options.successPrefix}: ${message}` : message);
    } else {
      toast.error(options.errorPrefix ? `${options.errorPrefix}: ${message}` : message);
    }
  }, [toastKey]); // eslint-disable-line react-hooks/exhaustive-deps -- Intentionally run only when toastKey (new submission) changes; message/success are read at that time.
}
