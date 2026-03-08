"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Trash2, Trophy } from "lucide-react";

import type { SoloRankEntry, SoloMatchWithPlayers } from "@/lib/solo-service";
import {
  updateSoloMatchAction,
  deleteSoloMatchAction,
  type SoloActionState,
} from "@/app/(dashboard)/solo/actions";
import { AddMatchForm } from "@/components/solo/add-match-form";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActionToast } from "@/lib/use-action-toast";
import { cn } from "@/lib/utils";

type Member = { id: string; name: string };

type Props = {
  year: number;
  availableYears: number[];
  leaderboard: SoloRankEntry[];
  matches: SoloMatchWithPlayers[];
  canManage: boolean;
  members: Member[];
};

const rankBadgeBase =
  "inline-flex min-w-7 justify-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums shadow-sm";

function rankBadgeClass(rank: number): string {
  if (rank === 1)
    return "bg-sport-gold/25 text-sport-gold border-sport-gold/50 shadow-sport-gold/20";
  if (rank === 2)
    return "bg-sport-silver/25 text-sport-silver border-sport-silver/50 shadow-sport-silver/20";
  if (rank === 3)
    return "bg-sport-bronze/25 text-sport-bronze border-sport-bronze/50 shadow-sport-bronze/20";
  return "bg-muted/80 text-muted-foreground border-border";
}

const inputCls =
  "border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm";

const initialActionState: SoloActionState = { success: false, message: "" };

// ─── Edit Match Dialog ────────────────────────────────────────────────────────

function EditMatchDialog({
  match,
  members,
  onClose,
}: {
  match: SoloMatchWithPlayers;
  members: Member[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, isPending] = useActionState(updateSoloMatchAction, initialActionState);

  useActionToast(state, {
    successPrefix: "Match updated",
    errorPrefix: "Failed to update match",
  });

  useEffect(() => {
    if (state.success && state.toastKey) {
      onClose();
      router.refresh();
    }
  }, [state.success, state.toastKey, onClose, router]);

  const matchDateStr = new Date(match.matchDate).toISOString().slice(0, 10);

  return (
    <AlertDialogContent onOverlayClick={onClose}>
      <AlertDialogHeader>
        <AlertDialogTitle>Edit match</AlertDialogTitle>
      </AlertDialogHeader>
      <form action={action} className="space-y-4">
        <fieldset disabled={isPending} className="space-y-4">
          <legend className="sr-only">Edit solo match</legend>
          <input type="hidden" name="id" value={match.id} />

          <div className="space-y-1">
            <Label htmlFor={`edit-p1-${match.id}`}>Player 1</Label>
            <select
              id={`edit-p1-${match.id}`}
              name="player1Id"
              defaultValue={match.player1Id}
              className={inputCls}
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`edit-p2-${match.id}`}>Player 2</Label>
            <select
              id={`edit-p2-${match.id}`}
              name="player2Id"
              defaultValue={match.player2Id}
              className={inputCls}
              required
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`edit-s1-${match.id}`}>Player 1 score</Label>
              <input
                id={`edit-s1-${match.id}`}
                name="player1Score"
                type="number"
                min={0}
                max={30}
                defaultValue={match.player1Score}
                className={inputCls}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`edit-s2-${match.id}`}>Player 2 score</Label>
              <input
                id={`edit-s2-${match.id}`}
                name="player2Score"
                type="number"
                min={0}
                max={30}
                defaultValue={match.player2Score}
                className={inputCls}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            BWF single game: first to 21; if 20–20, win by 2; max 30–29.
          </p>

          <div className="space-y-1">
            <Label htmlFor={`edit-date-${match.id}`}>Match date</Label>
            <input
              id={`edit-date-${match.id}`}
              name="matchDate"
              type="date"
              defaultValue={matchDateStr}
              className={inputCls}
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`edit-notes-${match.id}`}>Notes (optional)</Label>
            <input
              id={`edit-notes-${match.id}`}
              name="notes"
              type="text"
              maxLength={500}
              defaultValue={match.notes ?? ""}
              className={inputCls}
            />
          </div>
        </fieldset>

        {state.message && !state.success ? (
          <p className="text-sm text-destructive">{state.message}</p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel type="button" disabled={isPending} onClick={onClose}>
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
  );
}

// ─── Delete Match Button ──────────────────────────────────────────────────────

function DeleteMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSoloMatchAction(matchId);
      if (result.success) {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 text-muted-foreground hover:text-destructive"
        aria-label="Delete match"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
      <AlertDialogContent onOverlayClick={() => setOpen(false)}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete match?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this match result. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild variant="destructive">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              aria-busy={isPending}
              className="inline-flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Deleting…
                </>
              ) : (
                "Delete"
              )}
            </button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Year Navigation ──────────────────────────────────────────────────────────

function YearNav({ currentYear, years }: { currentYear: number; years: number[] }) {
  return (
    <nav
      role="tablist"
      aria-label="Year"
      className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1 shadow-sm"
    >
      {years.map((y) => {
        const isActive = y === currentYear;
        return (
          <Link
            key={y}
            href={`/solo?year=${y}`}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-accent text-accent-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {y}
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function SoloView({
  year,
  availableYears,
  leaderboard,
  matches,
  canManage,
  members,
}: Props) {
  const [editingMatch, setEditingMatch] = useState<SoloMatchWithPlayers | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <YearNav currentYear={year} years={availableYears} />
        {canManage ? <AddMatchForm members={members} /> : null}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">

      {/* Leaderboard */}
      <SportCard variant="leaderboard" className="overflow-hidden">
        <SportCardHeader
          title={`${year} Rankings`}
          subtitle="Ranked by wins · game score diff · session attendance"
        />
        <div className="p-4 pt-0">
          {leaderboard.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No matches recorded for {year} yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">#</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead className="text-right">W</TableHead>
                  <TableHead className="text-right">L</TableHead>
                  <TableHead className="text-right">Score diff</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.map((entry) => (
                  <TableRow key={entry.memberId}>
                    <TableCell>
                      <span
                        className={`${rankBadgeBase} ${rankBadgeClass(entry.rank)}`}
                        title={`Rank ${entry.rank}`}
                      >
                        {entry.rank}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{entry.memberName}</TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">
                      {entry.wins}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {entry.losses}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-medium",
                        entry.gameDiff > 0
                          ? "text-emerald-700 dark:text-emerald-400"
                          : entry.gameDiff < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-muted-foreground",
                      )}
                    >
                      {entry.gameDiff > 0 ? `+${entry.gameDiff}` : entry.gameDiff}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {entry.sessionCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SportCard>

      {/* Match history */}
      {matches.length > 0 ? (
        <SportCard variant="leaderboard" className="overflow-hidden">

          <SportCardHeader
            title="Match history"
            subtitle={`All solo matches in ${year}, newest first.`}
          />
          <div className="space-y-2 p-4 pt-3">
            {matches.map((m) => {
              const p1Won = m.winnerId === m.player1Id;
              const p1Name = m.player1.user.name ?? m.player1.user.email;
              const p2Name = m.player2.user.name ?? m.player2.user.email;

              return (
                <div
                  key={m.id}
                  className="group rounded-lg border border-border/60 bg-card/40 px-4 py-3 transition-colors hover:bg-card/80"
                >
                  {/* Match result row — players + score only, no extra chrome */}
                  <div className="flex items-center gap-2">
                    {/* Player 1 */}
                    <div
                      className={cn(
                        "flex flex-1 items-center justify-end gap-1.5 text-sm",
                        p1Won ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      <span className="text-right">{p1Name}</span>
                      {p1Won ? (
                        <Trophy className="size-3.5 shrink-0 text-sport-gold" aria-hidden />
                      ) : null}
                    </div>

                    {/* Score */}
                    <div className="flex shrink-0 items-center gap-1 rounded-md border border-border/80 bg-muted/40 px-3 py-1 tabular-nums">
                      <span
                        className={cn(
                          "text-base font-bold",
                          p1Won ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {m.player1Score}
                      </span>
                      <span className="text-xs text-muted-foreground">–</span>
                      <span
                        className={cn(
                          "text-base font-bold",
                          !p1Won ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {m.player2Score}
                      </span>
                    </div>

                    {/* Player 2 */}
                    <div
                      className={cn(
                        "flex flex-1 items-center gap-1.5 text-sm",
                        !p1Won ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {!p1Won ? (
                        <Trophy className="size-3.5 shrink-0 text-sport-gold" aria-hidden />
                      ) : null}
                      <span>{p2Name}</span>
                    </div>
                  </div>

                  {/* Meta row: date · notes · admin actions */}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {new Date(m.matchDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      {m.notes ? (
                        <span className="truncate text-xs italic text-muted-foreground">
                          {m.notes}
                        </span>
                      ) : null}
                    </div>
                    {canManage ? (
                      <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          aria-label="Edit match"
                          onClick={() => setEditingMatch(m)}
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </Button>
                        <DeleteMatchButton matchId={m.id} />
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </SportCard>
      ) : null}

      </div>{/* end two-column grid */}

      {/* Edit match dialog (controlled via state) */}
      {canManage ? (
        <AlertDialog
          open={editingMatch !== null}
          onOpenChange={(open) => { if (!open) setEditingMatch(null); }}
        >
          {editingMatch ? (
            <EditMatchDialog
              match={editingMatch}
              members={members}
              onClose={() => setEditingMatch(null)}
            />
          ) : null}
        </AlertDialog>
      ) : null}
    </div>
  );
}
