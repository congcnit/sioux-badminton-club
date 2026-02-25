"use client";

import { useActionState, useId, useState, useEffect } from "react";
import { SessionAttendanceStatus, SessionStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

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
import {
  createSessionAction,
  deleteSessionAction,
  getMoreSessionsAction,
  type AttendanceActionState,
  type AttendanceInlineActionState,
  type DeleteSessionActionState,
  joinSessionAction,
  type JoinSessionActionState,
  markAttendanceAction,
  updateSessionAction,
} from "@/app/(dashboard)/sessions/actions";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageMotion, HeroMotion } from "@/components/ui/motion";
import { SportCard } from "@/components/ui/sport-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useActionToast } from "@/lib/use-action-toast";
import { cn } from "@/lib/utils";
import { CalendarCheck2, CalendarX2, Loader2 } from "lucide-react";

type SessionListItem = {
  id: string;
  sessionDate: Date | string;
  startTime: Date | string | null;
  endTime: Date | string | null;
  courtId: string | null;
  courtName: string | null;
  notes: string | null;
  status: SessionStatus;
  attendees: {
    memberId: string;
    memberName: string;
    status: SessionAttendanceStatus;
    fineAmount: number | null;
    note: string | null;
  }[];
};

type MemberListItem = {
  id: string;
  name: string;
};

type CourtListItem = {
  id: string;
  name: string;
};

type AttendanceManagementProps = {
  initialSessions: SessionListItem[];
  totalSessionCount: number;
  limitStep: number;
  members: MemberListItem[];
  courts: CourtListItem[];
  canManage: boolean;
  currentMemberId: string | null;
};

const statuses = [
  SessionAttendanceStatus.PRESENT,
  SessionAttendanceStatus.LATE,
  SessionAttendanceStatus.EXCUSED_ABSENCE,
  SessionAttendanceStatus.UNEXCUSED_ABSENCE,
  SessionAttendanceStatus.REGISTERED,
];

const sessionStatuses = [
  SessionStatus.SCHEDULED,
  SessionStatus.COMPLETED,
  SessionStatus.CANCELLED,
];

const initialState: AttendanceActionState = {
  success: false,
  message: "",
};

const initialInlineState: AttendanceInlineActionState = {
  success: false,
  message: "",
};

function attendanceStatusLabel(status: SessionAttendanceStatus) {
  switch (status) {
    case SessionAttendanceStatus.PRESENT:
      return "Present";
    case SessionAttendanceStatus.LATE:
      return "Late";
    case SessionAttendanceStatus.EXCUSED_ABSENCE:
      return "Excused Absence";
    case SessionAttendanceStatus.UNEXCUSED_ABSENCE:
      return "Unexcused Absence";
    case SessionAttendanceStatus.REGISTERED:
      return "Registered";
    default:
      return status;
  }
}

function sessionStatusChipClass(status: SessionStatus) {
  switch (status) {
    case SessionStatus.SCHEDULED:
      return "bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40";
    case SessionStatus.COMPLETED:
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40";
    case SessionStatus.CANCELLED:
      return "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function attendanceStatusChipClass(status: SessionAttendanceStatus) {
  switch (status) {
    case SessionAttendanceStatus.PRESENT:
      return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40";
    case SessionAttendanceStatus.LATE:
      return "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40";
    case SessionAttendanceStatus.EXCUSED_ABSENCE:
      return "bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40";
    case SessionAttendanceStatus.UNEXCUSED_ABSENCE:
      return "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40";
    case SessionAttendanceStatus.REGISTERED:
      return "bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-500/40";
    default:
      return "bg-muted text-muted-foreground border border-border";
  }
}

function toDateInputValue(value: Date | string) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toTimeInputValue(value: Date | string | null) {
  if (value == null) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatVnd(amount: number | null | undefined): string {
  if (amount == null || !Number.isFinite(amount)) return "-";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTimeRange(
  startTime: Date | string | null,
  endTime: Date | string | null,
) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const toDate = (v: Date | string | null) =>
    v == null ? null : typeof v === "string" ? new Date(v) : v;
  const startLabel = startTime ? formatter.format(toDate(startTime)!) : "--:--";
  const endLabel = endTime ? formatter.format(toDate(endTime)!) : "--:--";
  return `${startLabel} - ${endLabel}`;
}

function AttendanceEditableRow({
  sessionId,
  attendee,
}: {
  sessionId: string;
  attendee: SessionListItem["attendees"][number];
}) {
  const formId = useId();
  const [state, action, isPending] = useActionState(markAttendanceAction, initialInlineState);
  useActionToast(state, {
    successPrefix: "Attendance updated",
    errorPrefix: "Unable to update attendance",
  });

  return (
    <TableRow className={isPending ? "opacity-70" : undefined}>
      <TableCell>{attendee.memberName}</TableCell>
      <TableCell>
        <select
          name="status"
          form={formId}
          defaultValue={attendee.status}
          disabled={isPending}
          className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm disabled:cursor-not-allowed disabled:opacity-70"
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {attendanceStatusLabel(value)}
            </option>
          ))}
        </select>
      </TableCell>
      <TableCell>
        <Input
          name="fineAmount"
          form={formId}
          type="number"
          min={0}
          defaultValue={attendee.fineAmount ?? ""}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <Input
          name="note"
          form={formId}
          placeholder="Optional note"
          defaultValue={attendee.note ?? ""}
          disabled={isPending}
        />
      </TableCell>
      <TableCell>
        <form id={formId} action={action} className="flex items-center gap-2">
          <input type="hidden" name="sessionId" value={sessionId} />
          <input type="hidden" name="memberId" value={attendee.memberId} />
          <Button type="submit" size="sm" disabled={isPending} aria-busy={isPending}>
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
              </>
            ) : (
              "Save"
            )}
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
}

function SessionEditDialog({
  session,
  courts,
  members,
  open,
  onOpenChange,
}: {
  session: SessionListItem | null;
  courts: CourtListItem[];
  members: MemberListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const formId = useId();
  const [state, action, isPending] = useActionState(updateSessionAction, initialState);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  useActionToast(state, {
    successPrefix: "Session updated",
    errorPrefix: "Unable to update session",
  });

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  useEffect(() => {
    if (session) {
      setSelectedMemberIds(session.attendees.map((a) => a.memberId));
    }
  }, [session?.id]);

  function toggleMember(memberId: string, checked: boolean) {
    if (checked) {
      setSelectedMemberIds((prev) =>
        prev.includes(memberId) ? prev : [...prev, memberId],
      );
      return;
    }
    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  }

  if (!session) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>Edit session</AlertDialogTitle>
          <AlertDialogDescription>
            Update date, time, court, status, notes, and member list for this session.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form id={formId} action={action} className="space-y-4">
          <input type="hidden" name="sessionId" value={session.id} />
          <fieldset disabled={isPending} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="edit-session-date">
                Session Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-session-date"
                name="sessionDate"
                type="date"
                defaultValue={toDateInputValue(session.sessionDate)}
              />
              {state.errors?.sessionDate ? (
                <p className="text-xs text-destructive">{state.errors.sessionDate[0]}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-session-court">Court</Label>
              <select
                id="edit-session-court"
                name="courtId"
                defaultValue={session.courtId ?? ""}
                className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
              >
                <option value="">No court</option>
                {courts.map((court) => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
              {state.errors?.courtId ? (
                <p className="text-xs text-destructive">{state.errors.courtId[0]}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-session-start">Start Time</Label>
              <Input
                id="edit-session-start"
                name="startTime"
                type="time"
                defaultValue={toTimeInputValue(session.startTime)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-session-end">End Time</Label>
              <Input
                id="edit-session-end"
                name="endTime"
                type="time"
                defaultValue={toTimeInputValue(session.endTime)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-session-status">Status</Label>
              <select
                id="edit-session-status"
                name="status"
                defaultValue={session.status}
                className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
              >
                {sessionStatuses.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="edit-session-notes">Notes</Label>
              <Input
                id="edit-session-notes"
                name="notes"
                placeholder="Optional notes"
                defaultValue={session.notes ?? ""}
                maxLength={500}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Members</Label>
              <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      name="memberIds"
                      value={member.id}
                      checked={selectedMemberIds.includes(member.id)}
                      onChange={(e) => toggleMember(member.id, e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <span>{member.name}</span>
                  </label>
                ))}
              </div>
              {state.errors?.memberIds ? (
                <p className="text-xs text-destructive">{state.errors.memberIds[0]}</p>
              ) : null}
            </div>
          </div>
          </fieldset>
          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              Cancel
            </AlertDialogCancel>
            <Button type="submit" form={formId} disabled={isPending} aria-busy={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

const initialJoinState: JoinSessionActionState = {
  success: false,
  message: "",
};

const initialDeleteState: DeleteSessionActionState = {
  success: false,
};

export function AttendanceManagement({
  initialSessions,
  totalSessionCount,
  limitStep,
  members,
  courts,
  canManage,
  currentMemberId,
}: AttendanceManagementProps) {
  const router = useRouter();
  const [sessionsList, setSessionsList] = useState<SessionListItem[]>(initialSessions);
  const [loadingMore, setLoadingMore] = useState(false);
  const hasMore = totalSessionCount > sessionsList.length;
  const [sessionDate, setSessionDate] = useState("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("09:00");
  const [courtId, setCourtId] = useState("");
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(SessionStatus.SCHEDULED);
  const [notes, setNotes] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionListItem | null>(null);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState<string | null>(null);
  const [joinNote, setJoinNote] = useState("");

  const [state, createSessionFormAction, createSessionPending] = useActionState(
    createSessionAction,
    initialState,
  );
  const [joinState, joinAction, joinPending] = useActionState(joinSessionAction, initialJoinState);
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSessionAction,
    initialDeleteState,
  );

  useEffect(() => {
    setSessionsList(initialSessions);
  }, [initialSessions]);

  useActionToast(state, {
    successPrefix: "Session created",
    errorPrefix: "Unable to create session",
  });
  useActionToast(joinState, {
    successPrefix: "Joined",
    errorPrefix: "Unable to join session",
  });

  useEffect(() => {
    if (state.success && state.toastKey) router.refresh();
  }, [state.success, state.toastKey, router]);
  useEffect(() => {
    if (joinState.success && joinState.toastKey) {
      router.refresh();
      setJoinModalOpen(false);
      setJoinSessionId(null);
      setJoinNote("");
    }
  }, [joinState.success, joinState.toastKey, router]);
  useEffect(() => {
    if (deleteState.success && deleteState.toastKey) router.refresh();
  }, [deleteState.success, deleteState.toastKey, router]);

  function toggleMember(memberId: string, checked: boolean) {
    if (checked) {
      setSelectedMemberIds((prev) =>
        prev.includes(memberId) ? prev : [...prev, memberId],
      );
      return;
    }

    setSelectedMemberIds((prev) => prev.filter((id) => id !== memberId));
  }

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const { sessions: next } = await getMoreSessionsAction(sessionsList.length, limitStep);
      setSessionsList((prev) => [...prev, ...next]);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <PageMotion className="space-y-8">
      <HeroMotion
        title="Sessions & Attendance"
        subtitle={
          canManage
            ? "Create sessions, select members (default Present), then update attendance and fines later."
            : "View sessions and attendance records."
        }
      />

      {canManage ? (
        <SportCard variant="gradient" className="p-5">
          <form action={createSessionFormAction} className="space-y-4">
          <fieldset disabled={createSessionPending} className="space-y-4">
          <legend className="sr-only">Create session</legend>
          <h2 className="text-lg font-medium">Create session</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="session-date">
              Session Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="session-date"
              name="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(event) => setSessionDate(event.target.value)}
            />
            {state.errors?.sessionDate ? (
              <p className="text-xs text-destructive">{state.errors.sessionDate[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-start">Start Time</Label>
            <Input
              id="session-start"
              name="startTime"
              type="time"
              value={startTime}
              onChange={(event) => setStartTime(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-end">End Time</Label>
            <Input
              id="session-end"
              name="endTime"
              type="time"
              value={endTime}
              onChange={(event) => setEndTime(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-court">
              Court <span className="text-destructive">*</span>
            </Label>
            <select
              id="session-court"
              name="courtId"
              value={courtId}
              onChange={(event) => setCourtId(event.target.value)}
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              <option value="" disabled>
                Select court
              </option>
              {courts.map((court) => (
                <option key={court.id} value={court.id}>
                  {court.name}
                </option>
              ))}
            </select>
            {state.errors?.courtId ? (
              <p className="text-xs text-destructive">{state.errors.courtId[0]}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="session-status">Status</Label>
            <select
              id="session-status"
              name="status"
              value={sessionStatus}
              onChange={(event) => setSessionStatus(event.target.value as SessionStatus)}
              className="border-input bg-transparent h-9 w-full rounded-md border px-3 text-sm"
            >
              {sessionStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="session-notes">Notes</Label>
            <Input
              id="session-notes"
              name="notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2 lg:col-span-3">
            <Label>Select Members (optional; default status: Present)</Label>
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2 lg:grid-cols-3">
              {members.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    name="memberIds"
                    value={member.id}
                    checked={selectedMemberIds.includes(member.id)}
                    onChange={(event) => toggleMember(member.id, event.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  <span>{member.name}</span>
                </label>
              ))}
              {!members.length ? (
                <p className="text-xs text-muted-foreground">No members available.</p>
              ) : null}
            </div>
            {state.errors?.memberIds ? (
              <p className="text-xs text-destructive">{state.errors.memberIds[0]}</p>
            ) : null}
          </div>
          </div>
          </fieldset>
          {state.message && !state.success ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <Button
            type="submit"
            variant="sport"
            disabled={createSessionPending}
            aria-busy={createSessionPending}
          >
            {createSessionPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Creating…
              </>
            ) : (
              "Create session"
            )}
          </Button>
        </form>
        </SportCard>
      ) : null}

      {canManage ? (
        <SessionEditDialog
          session={editingSession}
          courts={courts}
          members={members}
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setEditingSession(null);
          }}
        />
      ) : null}

      {!canManage ? (
        <AlertDialog
          open={joinModalOpen && joinSessionId != null}
          onOpenChange={(open) => {
            setJoinModalOpen(open);
            if (!open) {
              setJoinSessionId(null);
              setJoinNote("");
            }
          }}
        >
          <AlertDialogContent size="sm">
            <form action={joinAction}>
              <AlertDialogHeader>
                <AlertDialogTitle>Join this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  Add an optional note, then confirm to join.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <input type="hidden" name="sessionId" value={joinSessionId ?? ""} />
              <div className="space-y-2 py-2">
                <Label htmlFor="join-note">Note</Label>
                <textarea
                  id="join-note"
                  name="note"
                  value={joinNote}
                  onChange={(e) => setJoinNote(e.target.value)}
                  placeholder="e.g. expected arrival time"
                  disabled={joinPending}
                  className="border-input bg-background flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  maxLength={300}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={joinPending}>
                  Cancel
                </AlertDialogCancel>
                <Button type="submit" disabled={joinPending} aria-busy={joinPending}>
                  {joinPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden /> Joining…
                    </>
                  ) : (
                    "Confirm"
                  )}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      {sessionsList.map((session) => (
        <SportCard key={session.id} variant="leaderboard" className="overflow-hidden">
          <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-medium">
                  {toDateInputValue(session.sessionDate)}
                </h3>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    sessionStatusChipClass(session.status),
                  )}
                >
                  {session.status}
                </span>
              </div>
              <p className="mt-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm font-medium text-foreground">
                <span className="text-muted-foreground">Court:</span> {session.courtName ?? "No court"}
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">Time:</span> {formatTimeRange(session.startTime, session.endTime)}
                <span className="mx-2 text-muted-foreground">·</span>
                <span className="text-muted-foreground">Note:</span> {session.notes?.trim() ? session.notes : "-"}
              </p>
            </div>
            {!canManage &&
            session.status === SessionStatus.SCHEDULED &&
            currentMemberId != null &&
            !session.attendees.some((a) => a.memberId === currentMemberId) ? (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => {
                  setJoinSessionId(session.id);
                  setJoinNote("");
                  setJoinModalOpen(true);
                }}
              >
                <CalendarCheck2 className="mr-1.5 size-4" aria-hidden />
                Join Session
              </Button>
            ) : null}
            {canManage ? (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingSession(session);
                    setEditOpen(true);
                  }}
                >
                  Edit Session
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" size="sm" variant="destructive">
                      Delete Session
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. Attendance records for this session will also be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={deletePending}>Cancel</AlertDialogCancel>
                      <AlertDialogAction asChild variant="destructive">
                        <form action={deleteAction}>
                          <input type="hidden" name="sessionId" value={session.id} />
                          <button
                            type="submit"
                            disabled={deletePending}
                            aria-busy={deletePending}
                            className="inline-flex items-center justify-center gap-2"
                          >
                            {deletePending ? (
                              <>
                                <Loader2 className="size-4 animate-spin" aria-hidden /> Deleting…
                              </>
                            ) : (
                              "Delete"
                            )}
                          </button>
                        </form>
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : null}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine Amount</TableHead>
                <TableHead>Note</TableHead>
                {canManage ? <TableHead>Action</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {session.attendees.map((attendee) => (
                canManage ? (
                  <AttendanceEditableRow
                    key={`${session.id}-${attendee.memberId}`}
                    sessionId={session.id}
                    attendee={attendee}
                  />
                ) : (
                  <TableRow key={`${session.id}-${attendee.memberId}`}>
                    <TableCell>{attendee.memberName}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          attendanceStatusChipClass(attendee.status),
                        )}
                      >
                        {attendanceStatusLabel(attendee.status)}
                      </span>
                    </TableCell>
                    <TableCell>{formatVnd(attendee.fineAmount)}</TableCell>
                    <TableCell>{attendee.note ?? "-"}</TableCell>
                  </TableRow>
                )
              ))}
              {session.attendees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="text-center text-muted-foreground">
                    No one has joined this session yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          </div>
        </SportCard>
      ))}

      {!sessionsList.length ? (
        <EmptyState
          title="No sessions yet"
          description={
            canManage
              ? "Create your first training session to start tracking attendance."
              : "No sessions available yet."
          }
          icon={CalendarX2}
        />
      ) : null}

      {sessionsList.length > 0 && hasMore ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              "More"
            )}
          </Button>
        </div>
      ) : null}
    </PageMotion>
  );
}
