"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import {
  createMatchAction,
  type MatchActionState,
} from "@/app/(dashboard)/matches/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionToast } from "@/lib/use-action-toast";

type MemberOption = {
  id: string;
  name: string;
};

const initialState: MatchActionState = { success: false, message: "" };

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Submitting…
        </>
      ) : (
        "Submit Match"
      )}
    </Button>
  );
}

export function NewMatchForm({ members }: { members: MemberOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action] = useActionState(createMatchAction, initialState);
  useActionToast(state, {
    successPrefix: "Match submitted",
    errorPrefix: "Unable to submit match",
  });

  useEffect(() => {
    if (state.success && state.toastKey) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.success, state.toastKey, router]);

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="text-lg font-medium">Submit Match Result</h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            defaultValue="MENS_SINGLES"
          >
            <option value="MENS_SINGLES">Men&apos;s Singles</option>
            <option value="WOMENS_SINGLES">Women&apos;s Singles</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="player1">Player A</Label>
          <select
            id="player1"
            name="player1Id"
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select player A
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {state.errors?.player1Id ? (
            <p className="text-xs text-destructive">{state.errors.player1Id[0]}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="player2">Player B</Label>
          <select
            id="player2"
            name="player2Id"
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select player B
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {state.errors?.player2Id ? (
            <p className="text-xs text-destructive">{state.errors.player2Id[0]}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="winner">Winner</Label>
          <select
            id="winner"
            name="winnerId"
            className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            defaultValue=""
          >
            <option value="" disabled>
              Select winner
            </option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          {state.errors?.winnerId ? (
            <p className="text-xs text-destructive">{state.errors.winnerId[0]}</p>
          ) : null}
        </div>

        <div className="space-y-1">
          <Label htmlFor="scoreLine">Score</Label>
          <Input id="scoreLine" name="scoreLine" placeholder="21-18, 21-19" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={todayInputValue()} />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Input id="notes" name="notes" placeholder="Optional notes" />
        </div>
      </div>

      {state.message && !state.success ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <SubmitButton />
        <Button asChild type="button" variant="outline">
          <Link href="/arena">Back to Arena</Link>
        </Button>
      </div>
    </form>
  );
}
