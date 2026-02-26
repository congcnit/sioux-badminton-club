"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createArenaEventAction, type ArenaActionState } from "@/app/(dashboard)/arena/actions";
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
import { Loader2 } from "lucide-react";

const initialState: ArenaActionState = { success: false, message: "" };

const CATEGORY_OPTIONS: { value: "MEN" | "WOMEN"; label: string }[] = [
  { value: "MEN", label: "Men's" },
  { value: "WOMEN", label: "Women's" },
];

export function CreateArenaEventForm({
  defaultCategory,
}: {
  defaultCategory: "MEN" | "WOMEN";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(createArenaEventAction, initialState);
  useActionToast(state, {
    successPrefix: "Arena event created",
    errorPrefix: "Failed to create arena event",
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
        <Button variant="sport">Create arena event</Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Create arena event</AlertDialogTitle>
        </AlertDialogHeader>
        <form action={action} className="space-y-4">
          <fieldset disabled={isPending} className="space-y-4">
            <legend className="sr-only">Create arena event</legend>
          <div className="space-y-1">
            <Label htmlFor="arena-event-category">Category</Label>
            <select
              id="arena-event-category"
              name="category"
              defaultValue={defaultCategory}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
              required
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="arena-event-date">Date</Label>
            <input
              id="arena-event-date"
              name="date"
              type="date"
              defaultValue={today}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="arena-event-min-sessions">Min sessions required</Label>
            <input
              id="arena-event-min-sessions"
              name="minSessionsRequired"
              type="number"
              min={0}
              defaultValue={1}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Members must have at least this many session attendances in the event month to participate.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="arena-event-challenges">Max challenges per participant</Label>
            <input
              id="arena-event-challenges"
              name="challengesPerParticipant"
              type="number"
              min={0}
              max={99}
              defaultValue={2}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Each participant can use up to this many challenges in this event.
            </p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="arena-event-rank-diff">Max rank difference for challenges</Label>
            <input
              id="arena-event-rank-diff"
              name="maxRankDiff"
              type="number"
              min={1}
              max={10}
              defaultValue={2}
              className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
              required
            />
            <p className="text-xs text-muted-foreground">
              Participants can only challenge opponents within this many rank positions (e.g. 2 = within 2 positions).
            </p>
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
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Creating…
                </>
              ) : (
                "Create"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
