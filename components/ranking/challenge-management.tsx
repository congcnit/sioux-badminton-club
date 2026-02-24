"use client";

import { type RankingCategory, ChallengeStatus } from "@prisma/client";
import { useActionState } from "react";

import {
  createChallengeAction,
  type ChallengeActionState,
  updateChallengeStatusAction,
} from "@/app/(dashboard)/rankings/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActionToast } from "@/lib/use-action-toast";
import { Trophy } from "lucide-react";

type PlayerOption = {
  memberId: string;
  memberName: string;
  rank: number;
};

type ChallengeItem = {
  id: string;
  challengerId: string;
  challengedId: string;
  challengerName: string;
  challengedName: string;
  status: ChallengeStatus;
  createdAt: Date;
};

const initialState: ChallengeActionState = { success: false, message: "" };

export function ChallengeManagement({
  category,
  canManage,
  players,
  challenges,
}: {
  category: RankingCategory;
  canManage: boolean;
  players: PlayerOption[];
  challenges: ChallengeItem[];
}) {
  const [state, createAction] = useActionState(createChallengeAction, initialState);
  useActionToast(state, {
    successPrefix: "Challenge created",
    errorPrefix: "Unable to create challenge",
  });

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={createAction} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <input type="hidden" name="category" value={category} />
          <h2 className="text-lg font-medium">Create Challenge</h2>
          <p className="text-xs text-muted-foreground">
            Rule: lower rank can challenge up to 3 positions above, max 2 challenges/month.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">Challenger</label>
            <select
              name="challengerId"
              defaultValue=""
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Select challenger
              </option>
              {players.map((player) => (
                <option key={player.memberId} value={player.memberId}>
                  #{player.rank} {player.memberName}
                </option>
              ))}
            </select>
            {state.errors?.challengerId ? (
              <p className="text-xs text-destructive">{state.errors.challengerId[0]}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm">Challenged Player</label>
            <select
              name="challengedId"
              defaultValue=""
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Select challenged player
              </option>
              {players.map((player) => (
                <option key={player.memberId} value={player.memberId}>
                  #{player.rank} {player.memberName}
                </option>
              ))}
            </select>
            {state.errors?.challengedId ? (
              <p className="text-xs text-destructive">{state.errors.challengedId[0]}</p>
            ) : null}
          </div>
          </div>
          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <Button type="submit">Create Challenge</Button>
        </form>
      ) : null}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium">Challenge Queue</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Challenger</TableHead>
              <TableHead>Challenged</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {challenges.map((challenge) => (
              <TableRow key={challenge.id}>
                <TableCell>{challenge.createdAt.toISOString().slice(0, 10)}</TableCell>
                <TableCell>{challenge.challengerName}</TableCell>
                <TableCell>{challenge.challengedName}</TableCell>
                <TableCell>{challenge.status}</TableCell>
                {canManage ? (
                  <TableCell>
                    {challenge.status === ChallengeStatus.PENDING ? (
                      <div className="flex gap-2">
                        <form action={updateChallengeStatusAction}>
                          <input type="hidden" name="challengeId" value={challenge.id} />
                          <input type="hidden" name="status" value={ChallengeStatus.ACCEPTED} />
                          <Button size="sm" type="submit" variant="outline">
                            Accept
                          </Button>
                        </form>
                        <form action={updateChallengeStatusAction}>
                          <input type="hidden" name="challengeId" value={challenge.id} />
                          <input type="hidden" name="status" value={ChallengeStatus.REJECTED} />
                          <Button size="sm" type="submit" variant="destructive">
                            Reject
                          </Button>
                        </form>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
            {!challenges.length ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="p-4">
                  <EmptyState
                    title="No challenges yet"
                    description={
                      canManage
                        ? "Create a challenge to start competitive ranking movement."
                        : "No challenges available yet."
                    }
                    icon={Trophy}
                  />
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
