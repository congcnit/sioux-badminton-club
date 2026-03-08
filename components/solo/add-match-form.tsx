"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import {
  createSoloMatchAction,
  type SoloActionState,
} from "@/app/(dashboard)/solo/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useActionToast } from "@/lib/use-action-toast";

const initialState: SoloActionState = { success: false, message: "" };

const inputCls =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm";

type Member = { id: string; name: string };

export function AddMatchForm({ members }: { members: Member[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(createSoloMatchAction, initialState);

  useActionToast(state, {
    successPrefix: "Match recorded",
    errorPrefix: "Failed to record match",
  });

  useEffect(() => {
    if (state.success && state.toastKey) {
      setOpen(false);
      router.refresh();
    }
  }, [state.success, state.toastKey, router]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="sport" size="sm">
          <Plus className="size-4" aria-hidden />
          Add match
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Add solo match</AlertDialogTitle>
        </AlertDialogHeader>
        <form action={action} className="space-y-4">
          <fieldset disabled={isPending} className="space-y-4">
            <legend className="sr-only">Add solo match</legend>

            <div className="space-y-1">
              <Label htmlFor="solo-player1">Player 1</Label>
              <select id="solo-player1" name="player1Id" className={inputCls} required>
                <option value="">Select player…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="solo-player2">Player 2</Label>
              <select id="solo-player2" name="player2Id" className={inputCls} required>
                <option value="">Select player…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="solo-p1-score">Player 1 score</Label>
                <input
                  id="solo-p1-score"
                  name="player1Score"
                  type="number"
                  min={0}
                  max={30}
                  className={inputCls}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="solo-p2-score">Player 2 score</Label>
                <input
                  id="solo-p2-score"
                  name="player2Score"
                  type="number"
                  min={0}
                  max={30}
                  className={inputCls}
                  required
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              BWF single game: first to 21; if 20–20, win by 2; max 30–29.
            </p>

            <div className="space-y-1">
              <Label htmlFor="solo-match-date">Match date</Label>
              <input
                id="solo-match-date"
                name="matchDate"
                type="date"
                defaultValue={today}
                className={inputCls}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="solo-notes">Notes (optional)</Label>
              <input
                id="solo-notes"
                name="notes"
                type="text"
                maxLength={500}
                placeholder="e.g. tournament qualifier, friendly…"
                className={inputCls}
              />
            </div>
          </fieldset>

          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
