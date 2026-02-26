"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ArenaEventStatus } from "@prisma/client";
import { ArrowDown, ArrowUp, Loader2, MoreVertical, RefreshCw } from "lucide-react";
import {
  startArenaEventAction,
  completeArenaEventAction,
  createScheduledArenaMatchAction,
  challengeOpponentAction,
  completeArenaMatchAction,
  deleteArenaEventAction,
  deleteScheduledArenaMatchAction,
  type ArenaActionState,
} from "@/app/(dashboard)/arena/actions";
import { SportCard, SportCardHeader } from "@/components/ui/sport-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useActionToast } from "@/lib/use-action-toast";

type Participant = {
  id: string;
  rank: number | null;
  points: number;
  challengesRemaining: number;
  member: {
    user: { name: string | null; email: string };
  };
};

type ArenaMatchWithPlayers = {
  id: string;
  status: "SCHEDULED" | "COMPLETED";
  challengerScore: number | null;
  opponentScore: number | null;
  challengerRankAtMatch: number | null;
  opponentRankAtMatch: number | null;
  challengerPointsAtMatch: number | null;
  opponentPointsAtMatch: number | null;
  challengerPointsChange: number | null;
  opponentPointsChange: number | null;
  createdAt: Date;
  challenger: {
    id: string;
    rank?: number | null;
    points?: number;
    member: { user: { name: string | null; email: string } };
  };
  opponent: {
    id: string;
    rank?: number | null;
    points?: number;
    member: { user: { name: string | null; email: string } };
  };
};

export type ArenaEventWithParticipants = {
  id: string;
  date: Date;
  month: number;
  year: number;
  category: string;
  minSessionsRequired: number;
  maxRankDiff?: number;
  status: ArenaEventStatus;
  participants: Participant[];
  matches: ArenaMatchWithPlayers[];
  _count: { matches: number };
};

const statusLabels: Record<ArenaEventStatus, string> = {
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  COMPLETED: "Completed",
};

const chipBase = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";

function statusChipClass(status: ArenaEventStatus): string {
  switch (status) {
    case "SCHEDULED":
      return "bg-sky-500/20 text-sky-700 dark:text-sky-400 border-sky-500/40";
    case "ACTIVE":
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/40";
    case "COMPLETED":
      return "bg-muted/80 text-muted-foreground border-border";
    default:
      return "bg-muted/80 text-muted-foreground border-border";
  }
}

const rankBadgeBase =
  "inline-flex min-w-7 justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums shadow-sm";

function rankBadgeClass(displayRank: number): string {
  if (displayRank === 1)
    return "bg-sport-gold/25 text-sport-gold border-sport-gold/50 shadow-sport-gold/20";
  if (displayRank === 2)
    return "bg-sport-silver/25 text-sport-silver border-sport-silver/50 shadow-sport-silver/20";
  if (displayRank === 3)
    return "bg-sport-bronze/25 text-sport-bronze border-sport-bronze/50 shadow-sport-bronze/20";
  return "bg-muted/80 text-muted-foreground border-border";
}

const initialState: ArenaActionState = { success: false, message: "" };

function ScheduleMatchForm({
  eventId,
  participantsWithMeta,
  matchPairs,
  maxRankDiff,
  participantIdsInScheduledMatches,
}: {
  eventId: string;
  participantsWithMeta: ParticipantOption[];
  matchPairs: { challengerId: string; opponentId: string }[];
  maxRankDiff: number;
  participantIdsInScheduledMatches: Set<string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedChallengerId, setSelectedChallengerId] = useState("");
  const [state, action, isPending] = useActionState(createScheduledArenaMatchAction, initialState);

  const challengerOptions = useMemo(
    () =>
      participantsWithMeta.filter(
        (p) => p.challengesRemaining > 0 && !participantIdsInScheduledMatches.has(p.id),
      ),
    [participantsWithMeta, participantIdsInScheduledMatches],
  );
  const selectedChallenger = useMemo(
    () => participantsWithMeta.find((p) => p.id === selectedChallengerId),
    [participantsWithMeta, selectedChallengerId],
  );
  const opponentOptions = useMemo(() => {
    if (!selectedChallengerId || !selectedChallenger) return [];
    const challengerRank = selectedChallenger.rank;
    const alreadyPaired = new Set(
      matchPairs
        .filter((m) => m.challengerId === selectedChallengerId)
        .map((m) => m.opponentId),
    );
    return participantsWithMeta.filter(
      (p) =>
        p.id !== selectedChallengerId &&
        !participantIdsInScheduledMatches.has(p.id) &&
        Math.abs(p.rank - challengerRank) <= maxRankDiff &&
        !alreadyPaired.has(p.id),
    );
  }, [participantsWithMeta, selectedChallengerId, selectedChallenger, matchPairs, maxRankDiff, participantIdsInScheduledMatches]);

  useActionToast(state, {
    successPrefix: "Match scheduled",
    errorPrefix: "Failed to schedule match",
  });
  useEffect(() => {
    if (state.success && state.toastKey) {
      router.refresh();
      setOpen(false);
      setSelectedChallengerId("");
    }
  }, [state.success, state.toastKey, router]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" type="button">
          Schedule match
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Schedule match</AlertDialogTitle>
          <AlertDialogDescription>
            Create a scheduled match. Enter the result later when the match is played.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <fieldset disabled={isPending} className="space-y-4">
            <legend className="sr-only">Match pair</legend>
            <div className="space-y-1">
              <Label htmlFor="schedule-challenger">Challenger</Label>
              <select
                id="schedule-challenger"
                name="challengerParticipantId"
                value={selectedChallengerId}
                onChange={(e) => setSelectedChallengerId(e.target.value)}
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                required
              >
                <option value="" disabled>Select challenger</option>
                {challengerOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label} ({o.challengesRemaining} left)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="schedule-opponent">Opponent</Label>
              <select
                id="schedule-opponent"
                name="opponentParticipantId"
                key={selectedChallengerId}
                defaultValue=""
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                required
                disabled={!selectedChallengerId}
              >
                <option value="" disabled>
                  {selectedChallengerId
                    ? opponentOptions.length === 0
                      ? "No valid opponents (within rank range, not already played)"
                      : "Select opponent"
                    : "Select challenger first"}
                </option>
                {opponentOptions.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Only participants with challenges remaining can be the challenger. Opponents must be within {maxRankDiff} rank position(s) and not already played.
              </p>
            </div>
          </fieldset>
          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>Cancel</AlertDialogCancel>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Scheduling…
                </>
              ) : (
                "Schedule"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ChallengeOpponentForm({
  eventId,
  challengerParticipantId,
  participantsWithMeta,
  matchPairs,
  maxRankDiff,
  participantIdsInScheduledMatches,
}: {
  eventId: string;
  challengerParticipantId: string;
  participantsWithMeta: ParticipantOption[];
  matchPairs: { challengerId: string; opponentId: string }[];
  maxRankDiff: number;
  participantIdsInScheduledMatches: Set<string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [state, action, isPending] = useActionState(challengeOpponentAction, initialState);

  const challengerRank = useMemo(
    () => participantsWithMeta.find((p) => p.id === challengerParticipantId)?.rank ?? 0,
    [participantsWithMeta, challengerParticipantId],
  );
  const opponentOptions = useMemo(() => {
    const alreadyPaired = new Set(
      matchPairs
        .filter((m) => m.challengerId === challengerParticipantId)
        .map((m) => m.opponentId),
    );
    return participantsWithMeta.filter(
      (p) =>
        p.id !== challengerParticipantId &&
        !participantIdsInScheduledMatches.has(p.id) &&
        Math.abs(p.rank - challengerRank) <= maxRankDiff &&
        !alreadyPaired.has(p.id),
    );
  }, [participantsWithMeta, challengerParticipantId, matchPairs, maxRankDiff, participantIdsInScheduledMatches, challengerRank]);

  useActionToast(state, {
    successPrefix: "Challenge created",
    errorPrefix: "Failed to challenge",
  });
  useEffect(() => {
    if (state.success && state.toastKey) {
      router.refresh();
      setOpen(false);
      setSelectedOpponentId("");
    }
  }, [state.success, state.toastKey, router]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" type="button">
          Challenge
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Challenge an opponent</AlertDialogTitle>
          <AlertDialogDescription>
            Create a scheduled match. An admin will enter the result after you play.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <fieldset disabled={isPending} className="space-y-4">
            <legend className="sr-only">Opponent</legend>
            <div className="space-y-1">
              <Label htmlFor="challenge-opponent">Opponent</Label>
              <select
                id="challenge-opponent"
                name="opponentParticipantId"
                value={selectedOpponentId}
                onChange={(e) => setSelectedOpponentId(e.target.value)}
                className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                required
              >
                <option value="" disabled>
                  {opponentOptions.length === 0
                    ? "No valid opponents (within rank range, not already played)"
                    : "Select opponent"}
                </option>
                {opponentOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                Opponents must be within {maxRankDiff} rank position(s) and not already played this event.
              </p>
            </div>
          </fieldset>
          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>Cancel</AlertDialogCancel>
            <Button type="submit" disabled={isPending || !selectedOpponentId} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Challenging…
                </>
              ) : (
                "Challenge"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CompleteMatchForm({
  matchId,
  challengerName,
  opponentName,
}: {
  matchId: string;
  challengerName: string;
  opponentName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(completeArenaMatchAction, initialState);

  useActionToast(state, {
    successPrefix: "Result recorded",
    errorPrefix: "Failed to complete match",
  });
  useEffect(() => {
    if (state.success && state.toastKey) {
      router.refresh();
      setOpen(false);
    }
  }, [state.success, state.toastKey, router]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" type="button">
          Enter result
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Enter match result</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="font-medium">{challengerName}</span>
            <span className="text-muted-foreground"> vs </span>
            <span className="font-medium">{opponentName}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="matchId" value={matchId} />
          <fieldset disabled={isPending} className="space-y-4">
            <legend className="sr-only">Score</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="complete-challenger-score">Challenger score</Label>
                <input
                  id="complete-challenger-score"
                  name="challengerScore"
                  type="number"
                  min={0}
                  max={30}
                  defaultValue={21}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="complete-opponent-score">Opponent score</Label>
                <input
                  id="complete-opponent-score"
                  name="opponentScore"
                  type="number"
                  min={0}
                  max={30}
                  defaultValue={0}
                  className="border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm"
                  required
                />
              </div>
            </div>
          </fieldset>
          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>Cancel</AlertDialogCancel>
            <Button type="submit" disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
                </>
              ) : (
                "Save result"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteScheduledMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(deleteScheduledArenaMatchAction, initialState);

  useActionToast(state, {
    successPrefix: "Match deleted",
    errorPrefix: "Failed to delete match",
  });
  useEffect(() => {
    if (state.success && state.toastKey) {
      router.refresh();
      setOpen(false);
    }
  }, [state.success, state.toastKey, router]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" type="button" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete scheduled match?</AlertDialogTitle>
          <AlertDialogDescription>
            This match will be deleted from the list. You can schedule a new match later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form action={action}>
          <input type="hidden" name="matchId" value={matchId} />
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>Cancel</AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ArenaEventCard({
  event,
  canManage,
  currentUserParticipantId = null,
}: {
  event: ArenaEventWithParticipants;
  canManage: boolean;
  currentUserParticipantId?: string | null;
}) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [startState, startAction, isStartPending] = useActionState(
    startArenaEventAction,
    initialState,
  );
  const [completeState, completeAction, isCompletePending] = useActionState(
    completeArenaEventAction,
    initialState,
  );
  const [deleteState, deleteAction, isDeletePending] = useActionState(
    deleteArenaEventAction,
    initialState,
  );
  useActionToast(startState, {
    successPrefix: "Event started",
    errorPrefix: "Failed to start event",
  });
  useActionToast(completeState, {
    successPrefix: "Event completed",
    errorPrefix: "Failed to complete event",
  });
  useActionToast(deleteState, {
    successPrefix: "Event deleted",
    errorPrefix: "Failed to delete event",
  });
  useEffect(() => {
    if (startState.success && startState.toastKey) router.refresh();
  }, [startState.success, startState.toastKey, router]);
  useEffect(() => {
    if (completeState.success && completeState.toastKey) router.refresh();
  }, [completeState.success, completeState.toastKey, router]);
  useEffect(() => {
    if (deleteState.success && deleteState.toastKey) {
      router.refresh();
      setDeleteDialogOpen(false);
    }
  }, [deleteState.success, deleteState.toastKey, router]);

  const dateStr = new Date(event.date).toISOString().slice(0, 10);
  const title = `${event.year}-${String(event.month).padStart(2, "0")} ${event.category} — ${dateStr}`;
  const maxRankDiff = event.maxRankDiff ?? 2;
  const subtitle = `${event.participants.length} participants, ${event._count.matches} matches · Min sessions: ${event.minSessionsRequired} · Rank range: ${maxRankDiff}`;

  const statusChip = (
    <span className={`${chipBase} ${statusChipClass(event.status)}`}>
      {statusLabels[event.status]}
    </span>
  );

  const refreshRankList = () => {
    startRefreshTransition(() => {
      router.refresh();
    });
  };

  const startFormId = `start-form-${event.id}`;
  const completeFormId = `complete-form-${event.id}`;

  const headerAction = (
    <span className="inline-flex items-center gap-2">
      {statusChip}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={refreshRankList}
        disabled={isRefreshing}
        aria-label="Refresh rank list"
        aria-busy={isRefreshing}
      >
        {isRefreshing ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <RefreshCw className="size-4" aria-hidden />
        )}
      </Button>
      {canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              aria-label="Event actions"
            >
              <MoreVertical className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {event.status === "SCHEDULED" ? (
              <DropdownMenuItem asChild>
                <button type="submit" form={startFormId} disabled={isStartPending}>
                  {isStartPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Starting…
                    </>
                  ) : (
                    "Start event"
                  )}
                </button>
              </DropdownMenuItem>
            ) : null}
            {event.status === "ACTIVE" ? (
              <DropdownMenuItem asChild>
                <button type="submit" form={completeFormId} disabled={isCompletePending}>
                  {isCompletePending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Completing…
                    </>
                  ) : (
                    "Complete event"
                  )}
                </button>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteDialogOpen(true);
              }}
            >
              Delete event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </span>
  );

  const participantsWithMeta = event.participants
    .filter((p): p is typeof p & { rank: number } => p.rank != null)
    .map((p) => ({
      id: p.id,
      label: `#${p.rank} ${p.member.user.name ?? p.member.user.email}`,
      rank: p.rank,
      challengesRemaining: p.challengesRemaining,
    }));
  const matchPairs = event.matches.map((m) => ({
    challengerId: m.challenger.id,
    opponentId: m.opponent.id,
  }));
  const scheduledMatches = event.matches.filter((m) => m.status === "SCHEDULED");
  const participantIdsInScheduledMatches = new Set(
    scheduledMatches.flatMap((m) => [m.challenger.id, m.opponent.id]),
  );
  const completedMatches = event.matches.filter(
    (m) => m.status === "COMPLETED" || (m.status as string | undefined) === undefined,
  );

  return (
    <div className="space-y-6">
    <SportCard variant="leaderboard" className="overflow-hidden">
      <SportCardHeader title={title} subtitle={subtitle} action={headerAction} />
      <div className="space-y-4 p-4 pt-0">
        {canManage ? (
          <>
            {event.status === "SCHEDULED" ? (
              <form id={startFormId} action={startAction} className="hidden">
                <input type="hidden" name="eventId" value={event.id} />
              </form>
            ) : null}
            {event.status === "ACTIVE" ? (
              <form id={completeFormId} action={completeAction} className="hidden">
                <input type="hidden" name="eventId" value={event.id} />
              </form>
            ) : null}
          </>
        ) : null}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent onOverlayClick={() => setDeleteDialogOpen(false)}>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete arena event?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this event, all participants, and match results.
                    This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
                  <form action={deleteAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <AlertDialogAction asChild variant="destructive">
                      <button
                        type="submit"
                        disabled={isDeletePending}
                        aria-busy={isDeletePending}
                        className="inline-flex items-center justify-center gap-2"
                      >
                        {isDeletePending ? (
                          <>
                            <Loader2 className="size-4 animate-spin" aria-hidden /> Deleting…
                          </>
                        ) : (
                          "Delete"
                        )}
                      </button>
                    </AlertDialogAction>
                  </form>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="text-right">Points</TableHead>
              <TableHead className="text-right">Challenges left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {event.participants.map((p, index) => {
              const displayRank = p.rank ?? index + 1;
              return (
              <TableRow key={p.id}>
                <TableCell>
                  <span
                    className={`${rankBadgeBase} ${rankBadgeClass(displayRank)}`}
                    title={`Rank ${displayRank}`}
                  >
                    {displayRank}
                  </span>
                </TableCell>
                <TableCell>
                  {p.member.user.name ?? p.member.user.email}
                </TableCell>
                <TableCell className="text-right font-semibold tabular-nums">
                  {p.points}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {p.challengesRemaining}
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>

        {canManage && event.status === "ACTIVE" && participantsWithMeta.length >= 2 ? (
          <div className="flex flex-wrap items-center gap-2">
            <ScheduleMatchForm
              eventId={event.id}
              participantsWithMeta={participantsWithMeta}
              matchPairs={matchPairs}
              maxRankDiff={maxRankDiff}
              participantIdsInScheduledMatches={participantIdsInScheduledMatches}
            />
          </div>
        ) : null}

        {!canManage &&
        currentUserParticipantId &&
        event.status === "ACTIVE" &&
        participantsWithMeta.length >= 2 &&
        !participantIdsInScheduledMatches.has(currentUserParticipantId) &&
        (participantsWithMeta.find((p) => p.id === currentUserParticipantId)?.challengesRemaining ?? 0) > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            <ChallengeOpponentForm
              eventId={event.id}
              challengerParticipantId={currentUserParticipantId}
              participantsWithMeta={participantsWithMeta}
              matchPairs={matchPairs}
              maxRankDiff={maxRankDiff}
              participantIdsInScheduledMatches={participantIdsInScheduledMatches}
            />
          </div>
        ) : null}

        {scheduledMatches.length > 0 ? (
          <SportCard variant="leaderboard" className="overflow-hidden">
            <SportCardHeader
              title="Scheduled matches"
              subtitle="Upcoming matches for this event."
            />
            <div className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Challenger</TableHead>
                    <TableHead>Opponent</TableHead>
                    {canManage ? <TableHead className="w-48">Action</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledMatches.map((m) => {
                    const challengerName = m.challenger.member.user.name ?? m.challenger.member.user.email;
                    const opponentName = m.opponent.member.user.name ?? m.opponent.member.user.email;
                    const challengerRank = m.challenger.rank != null ? `#${m.challenger.rank}` : "–";
                    const opponentRank = m.opponent.rank != null ? `#${m.opponent.rank}` : "–";
                    const challengerPts = m.challenger.points != null ? `${m.challenger.points} pts` : "–";
                    const opponentPts = m.opponent.points != null ? `${m.opponent.points} pts` : "–";
                    return (
                      <TableRow key={m.id} className="text-sm">
                        <TableCell>
                          <span className="font-medium">{challengerName}</span>
                          <span className="text-muted-foreground ml-1 text-xs" title="Current rank and points">
                            ({challengerRank} {challengerPts})
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{opponentName}</span>
                          <span className="text-muted-foreground ml-1 text-xs" title="Current rank and points">
                            ({opponentRank} {opponentPts})
                          </span>
                        </TableCell>
                        {canManage ? (
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-2">
                              <CompleteMatchForm
                                matchId={m.id}
                                challengerName={challengerName}
                                opponentName={opponentName}
                              />
                              <DeleteScheduledMatchButton matchId={m.id} />
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SportCard>
        ) : null}

        {completedMatches.length > 0 ? (
          <SportCard variant="leaderboard" className="overflow-hidden">
            <SportCardHeader
              title="Match history"
              subtitle="Completed matches and point changes."
            />
            <div className="p-4 pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Date</TableHead>
                    <TableHead>Challenger</TableHead>
                    <TableHead>Opponent</TableHead>
                    <TableHead className="text-center w-0 whitespace-nowrap">Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedMatches.map((m) => {
                    const challengerName = m.challenger.member.user.name ?? m.challenger.member.user.email;
                    const opponentName = m.opponent.member.user.name ?? m.opponent.member.user.email;
                    const challengerPos =
                      m.challengerRankAtMatch != null ? `#${m.challengerRankAtMatch}` : "–";
                    const opponentPos =
                      m.opponentRankAtMatch != null ? `#${m.opponentRankAtMatch}` : "–";
                    const challengerPts =
                      m.challengerPointsAtMatch != null ? ` ${m.challengerPointsAtMatch} pts` : "";
                    const opponentPts =
                      m.opponentPointsAtMatch != null ? ` ${m.opponentPointsAtMatch} pts` : "";
                    const cs = m.challengerScore ?? 0;
                    const os = m.opponentScore ?? 0;
                    const challengerWon = cs > os;
                    const scoreStr = `${cs}-${os}`;
                    const challengerDelta = m.challengerPointsChange ?? 0;
                    const opponentDelta = m.opponentPointsChange ?? 0;
                    const challengerDeltaStr =
                      challengerDelta >= 0 ? `+${challengerDelta}` : String(challengerDelta);
                    const opponentDeltaStr =
                      opponentDelta >= 0 ? `+${opponentDelta}` : String(opponentDelta);
                    return (
                      <TableRow key={m.id} className="text-sm">
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </TableCell>
                        <TableCell
                          className={
                            challengerWon
                              ? "text-emerald-700 dark:text-emerald-400 font-medium"
                              : "text-red-600 dark:text-red-400 font-medium"
                          }
                        >
                          <span className="font-medium">{challengerName}</span>
                          <span className="text-muted-foreground ml-1 text-xs" title="Rank and points at match time">
                            ({challengerPos}{challengerPts})
                          </span>
                          <span
                            className={
                              challengerDelta >= 0
                                ? "text-emerald-600 dark:text-emerald-400 ml-1.5 inline-flex items-center gap-0.5 text-xs tabular-nums"
                                : "text-red-600 dark:text-red-400 ml-1.5 inline-flex items-center gap-0.5 text-xs tabular-nums"
                            }
                            title="Point change"
                          >
                            {challengerDelta >= 0 ? (
                              <ArrowUp className="size-3.5" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3.5" aria-hidden />
                            )}
                            {challengerDeltaStr}
                          </span>
                        </TableCell>
                        <TableCell
                          className={
                            challengerWon
                              ? "text-red-600 dark:text-red-400 font-medium"
                              : "text-emerald-700 dark:text-emerald-400 font-medium"
                          }
                        >
                          <span className="font-medium">{opponentName}</span>
                          <span className="text-muted-foreground ml-1 text-xs" title="Rank and points at match time">
                            ({opponentPos}{opponentPts})
                          </span>
                          <span
                            className={
                              opponentDelta >= 0
                                ? "text-emerald-600 dark:text-emerald-400 ml-1.5 inline-flex items-center gap-0.5 text-xs tabular-nums"
                                : "text-red-600 dark:text-red-400 ml-1.5 inline-flex items-center gap-0.5 text-xs tabular-nums"
                            }
                            title="Point change"
                          >
                            {opponentDelta >= 0 ? (
                              <ArrowUp className="size-3.5" aria-hidden />
                            ) : (
                              <ArrowDown className="size-3.5" aria-hidden />
                            )}
                            {opponentDeltaStr}
                          </span>
                        </TableCell>
                        <TableCell className="align-middle text-center tabular-nums font-medium w-0 whitespace-nowrap">
                          {scoreStr}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </SportCard>
        ) : null}
      </div>
    </SportCard>
    </div>
  );
}

type ParticipantOption = {
  id: string;
  label: string;
  rank: number;
  challengesRemaining: number;
};
