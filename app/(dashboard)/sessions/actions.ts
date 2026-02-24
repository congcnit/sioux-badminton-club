"use server";

import {
  Role,
  SessionAttendanceStatus,
  SessionStatus,
} from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createSessionSchema,
  deleteSessionSchema,
  joinSessionSchema,
  markAttendanceSchema,
  updateSessionNotesSchema,
  updateSessionSchema,
} from "@/lib/validations/attendance";

const SESSIONS_PATH = "/sessions";
const DEFAULT_UNEXCUSED_ABSENCE_FINE = 50000;

export type AttendanceActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  toastKey?: number;
};

export type AttendanceInlineActionState = {
  success: boolean;
  message: string;
};

const initialState: AttendanceActionState = {
  success: false,
  message: "",
};

function combineSessionDateAndTime(sessionDate: string, time?: string) {
  if (!time) return null;
  const combined = new Date(`${sessionDate}T${time}:00`);
  if (Number.isNaN(combined.getTime())) return null;
  return combined;
}

function parseUnexcusedAbsenceFineAmount() {
  const raw = process.env.NO_SHOW_FINE_AMOUNT;
  const parsed = Number(raw);
  if (Number.isNaN(parsed) || parsed < 0) return DEFAULT_UNEXCUSED_ABSENCE_FINE;
  return parsed;
}

function buildSessionLabel(sessionDate: string, courtName?: string) {
  const date = new Date(sessionDate).toISOString().slice(0, 10);
  const courtLabel = courtName?.trim();
  return courtLabel ? `Session ${date} - ${courtLabel}` : `Session ${date}`;
}

export async function createSessionAction(
  prevState: AttendanceActionState = initialState,
  formData: FormData,
): Promise<AttendanceActionState> {
  void prevState;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    return {
      success: false,
      message: "Only admin can create sessions.",
      toastKey: Date.now(),
    };
  }

  const parsed = createSessionSchema.safeParse({
    sessionDate: formData.get("sessionDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    courtId: formData.get("courtId"),
    memberIds: formData.getAll("memberIds"),
    notes: formData.get("notes"),
    status: formData.get("status") ?? SessionStatus.SCHEDULED,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  const court = await db.court.findUnique({
    where: { id: parsed.data.courtId },
    select: { id: true, name: true },
  });

  if (!court) {
    return {
      success: false,
      message: "Selected court does not exist.",
      errors: { courtId: ["Selected court does not exist."] },
      toastKey: Date.now(),
    };
  }

  const selectedMemberIds = Array.from(new Set(parsed.data.memberIds));

  const selectedMembers = await db.member.findMany({
    where: {
      id: { in: selectedMemberIds },
      user: {
        role: {
          not: Role.ADMIN,
        },
      },
    },
    select: { id: true },
  });

  if (selectedMembers.length !== selectedMemberIds.length) {
    return {
      success: false,
      message: "Some selected members are invalid.",
      errors: { memberIds: ["Some selected members are invalid."] },
      toastKey: Date.now(),
    };
  }

  await db.badmintonSession.create({
    data: {
      title: buildSessionLabel(parsed.data.sessionDate, court.name),
      sessionDate: new Date(parsed.data.sessionDate),
      startTime: combineSessionDateAndTime(
        parsed.data.sessionDate,
        parsed.data.startTime,
      ),
      endTime: combineSessionDateAndTime(parsed.data.sessionDate, parsed.data.endTime),
      courtId: court.id,
      notes: parsed.data.notes?.trim() || null,
      status: parsed.data.status,
      createdBy: session.user.id,
      ...(selectedMembers.length > 0
        ? {
            attendances: {
              create: selectedMembers.map((member) => ({
                memberId: member.id,
                status: SessionAttendanceStatus.PRESENT,
              })),
            },
          }
        : {}),
    },
  });

  revalidatePath(SESSIONS_PATH);
  return {
    success: true,
    message: "Session created successfully.",
    toastKey: Date.now(),
  };
}

export async function markAttendanceAction(
  _prevState: AttendanceInlineActionState,
  formData: FormData,
): Promise<AttendanceInlineActionState> {
  const actor = await getServerSession(authOptions);
  if (!actor?.user?.id || actor.user.role !== Role.ADMIN) {
    return { success: false, message: "Only admin can update attendance." };
  }

  const parsed = markAttendanceSchema.safeParse({
    sessionId: formData.get("sessionId"),
    memberId: formData.get("memberId"),
    status: formData.get("status"),
    note: formData.get("note"),
    fineAmount: formData.get("fineAmount"),
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid attendance data." };
  }

  const targetMember = await db.member.findUnique({
    where: { id: parsed.data.memberId },
    select: {
      id: true,
      user: {
        select: { role: true },
      },
    },
  });

  if (!targetMember || targetMember.user.role === Role.ADMIN) {
    return { success: false, message: "Invalid member." };
  }

  const fineAmount =
    parsed.data.fineAmount !== undefined
      ? parsed.data.fineAmount
      : parsed.data.status === SessionAttendanceStatus.UNEXCUSED_ABSENCE
        ? parseUnexcusedAbsenceFineAmount()
        : null;

  await db.sessionAttendance.upsert({
    where: {
      sessionId_memberId: {
        sessionId: parsed.data.sessionId,
        memberId: parsed.data.memberId,
      },
    },
    update: {
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
      fineAmount,
    },
    create: {
      sessionId: parsed.data.sessionId,
      memberId: parsed.data.memberId,
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
      fineAmount,
    },
  });

  revalidatePath(SESSIONS_PATH);
  revalidatePath("/");
  return { success: true, message: "Saved" };
}

export type JoinSessionActionState = {
  success: boolean;
  message: string;
  toastKey?: number;
};

const initialJoinState: JoinSessionActionState = {
  success: false,
  message: "",
};

export async function joinSessionAction(
  _prevState: JoinSessionActionState = initialJoinState,
  formData: FormData,
): Promise<JoinSessionActionState> {
  const actor = await getServerSession(authOptions);
  if (!actor?.user?.id) {
    return { success: false, message: "You must be signed in to join a session.", toastKey: Date.now() };
  }
  if (actor.user.role === Role.ADMIN) {
    return { success: false, message: "Admins join via session edit; use the sessions list.", toastKey: Date.now() };
  }

  const member = await db.member.findUnique({
    where: { userId: actor.user.id },
    select: { id: true },
  });
  if (!member) {
    return { success: false, message: "You must have a member profile to join a session.", toastKey: Date.now() };
  }

  const parsed = joinSessionSchema.safeParse({
    sessionId: formData.get("sessionId") ?? "",
    note: formData.get("note") ?? undefined,
  });
  if (!parsed.success) {
    const first = parsed.error.flatten().fieldErrors.sessionId?.[0] ?? parsed.error.message;
    return { success: false, message: first, toastKey: Date.now() };
  }

  const session = await db.badmintonSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: { id: true, status: true },
  });
  if (!session) {
    return { success: false, message: "Session not found.", toastKey: Date.now() };
  }
  if (session.status !== SessionStatus.SCHEDULED) {
    return { success: false, message: "You can only join sessions that are scheduled.", toastKey: Date.now() };
  }

  const note = parsed.data.note?.trim() || undefined;
  await db.sessionAttendance.upsert({
    where: {
      sessionId_memberId: {
        sessionId: parsed.data.sessionId,
        memberId: member.id,
      },
    },
    update: { status: SessionAttendanceStatus.REGISTERED, note },
    create: {
      sessionId: parsed.data.sessionId,
      memberId: member.id,
      status: SessionAttendanceStatus.REGISTERED,
      note,
    },
  });

  revalidatePath(SESSIONS_PATH);
  revalidatePath("/");
  return { success: true, message: "You have joined this session.", toastKey: Date.now() };
}

export async function updateSessionAction(
  prevState: AttendanceActionState = initialState,
  formData: FormData,
): Promise<AttendanceActionState> {
  void prevState;
  const actor = await getServerSession(authOptions);
  if (!actor?.user?.id || actor.user.role !== Role.ADMIN) {
    return {
      success: false,
      message: "Only admin can edit sessions.",
      toastKey: Date.now(),
    };
  }

  const parsed = updateSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
    sessionDate: formData.get("sessionDate"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    courtId: formData.get("courtId"),
    memberIds: formData.getAll("memberIds"),
    notes: formData.get("notes"),
    status: formData.get("status") ?? SessionStatus.SCHEDULED,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  const existing = await db.badmintonSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: { id: true, courtId: true, status: true },
  });

  if (!existing) {
    return {
      success: false,
      message: "Session not found.",
      toastKey: Date.now(),
    };
  }

  let courtId: string | null = null;
  let courtName: string | undefined;

  if (parsed.data.courtId?.trim()) {
    const court = await db.court.findUnique({
      where: { id: parsed.data.courtId.trim() },
      select: { id: true, name: true },
    });
    if (!court) {
      return {
        success: false,
        message: "Selected court does not exist.",
        errors: { courtId: ["Selected court does not exist."] },
        toastKey: Date.now(),
      };
    }
    courtId = court.id;
    courtName = court.name;
  }

  const selectedMemberIds = Array.from(new Set(parsed.data.memberIds));

  const selectedMembers = await db.member.findMany({
    where: {
      id: { in: selectedMemberIds },
      user: {
        role: {
          not: Role.ADMIN,
        },
      },
    },
    select: { id: true },
  });

  if (selectedMembers.length !== selectedMemberIds.length) {
    return {
      success: false,
      message: "Some selected members are invalid.",
      errors: { memberIds: ["Some selected members are invalid."] },
      toastKey: Date.now(),
    };
  }

  const sessionDate = new Date(parsed.data.sessionDate);
  const title = buildSessionLabel(parsed.data.sessionDate, courtName ?? undefined);

  const previousStatus = existing.status;
  const isCompletingSession =
    previousStatus === SessionStatus.SCHEDULED && parsed.data.status === SessionStatus.COMPLETED;

  await db.$transaction(async (tx) => {
    await tx.badmintonSession.update({
      where: { id: parsed.data.sessionId },
      data: {
        title,
        sessionDate,
        startTime: combineSessionDateAndTime(
          parsed.data.sessionDate,
          parsed.data.startTime,
        ),
        endTime: combineSessionDateAndTime(
          parsed.data.sessionDate,
          parsed.data.endTime,
        ),
        courtId,
        notes: parsed.data.notes?.trim() || null,
        status: parsed.data.status,
      },
    });

    if (isCompletingSession) {
      await tx.sessionAttendance.updateMany({
        where: {
          sessionId: parsed.data.sessionId,
          status: SessionAttendanceStatus.REGISTERED,
        },
        data: { status: SessionAttendanceStatus.PRESENT },
      });
    }

    const currentAttendances = await tx.sessionAttendance.findMany({
      where: { sessionId: parsed.data.sessionId },
      select: { memberId: true },
    });
    const currentMemberIds = new Set(currentAttendances.map((a) => a.memberId));
    const newMemberIds = new Set(selectedMemberIds);

    const toAdd = selectedMembers.filter((m) => !currentMemberIds.has(m.id));
    const toRemove = Array.from(currentMemberIds).filter((id) => !newMemberIds.has(id));

    if (toAdd.length) {
      await tx.sessionAttendance.createMany({
        data: toAdd.map((member) => ({
          sessionId: parsed.data.sessionId,
          memberId: member.id,
          status: SessionAttendanceStatus.PRESENT,
        })),
      });
    }

    if (toRemove.length) {
      await tx.sessionAttendance.deleteMany({
        where: {
          sessionId: parsed.data.sessionId,
          memberId: { in: toRemove },
        },
      });
    }
  });

  revalidatePath(SESSIONS_PATH);
  revalidatePath("/");
  return {
    success: true,
    message: "Session updated successfully.",
    toastKey: Date.now(),
  };
}

export type DeleteSessionActionState = {
  success: boolean;
  toastKey?: number;
};

const initialDeleteState: DeleteSessionActionState = {
  success: false,
};

export async function deleteSessionAction(
  _prevState: DeleteSessionActionState = initialDeleteState,
  formData: FormData,
): Promise<DeleteSessionActionState> {
  const actor = await getServerSession(authOptions);
  if (!actor?.user?.id || actor.user.role !== Role.ADMIN) {
    return { success: false, toastKey: Date.now() };
  }

  const parsed = deleteSessionSchema.safeParse({
    sessionId: formData.get("sessionId"),
  });
  if (!parsed.success) {
    return { success: false, toastKey: Date.now() };
  }

  try {
    await db.badmintonSession.delete({
      where: { id: parsed.data.sessionId },
    });
  } catch {
    return { success: false, toastKey: Date.now() };
  }

  revalidatePath(SESSIONS_PATH);
  revalidatePath("/");
  revalidatePath("/budget");
  return { success: true, toastKey: Date.now() };
}

export async function updateSessionNotesAction(
  _prevState: AttendanceInlineActionState,
  formData: FormData,
): Promise<AttendanceInlineActionState> {
  const actor = await getServerSession(authOptions);
  if (!actor?.user?.id || actor.user.role !== Role.ADMIN) {
    return { success: false, message: "Only admin can update session notes." };
  }

  const parsed = updateSessionNotesSchema.safeParse({
    sessionId: formData.get("sessionId"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { success: false, message: "Invalid session note." };
  }

  try {
    await db.badmintonSession.update({
      where: { id: parsed.data.sessionId },
      data: {
        notes: parsed.data.notes?.trim() || null,
      },
    });
  } catch {
    return { success: false, message: "Unable to update session note." };
  }

  revalidatePath(SESSIONS_PATH);
  return { success: true, message: "Session note updated." };
}

export type SessionListItemSerialized = {
  id: string;
  sessionDate: string;
  startTime: string | null;
  endTime: string | null;
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

export async function getMoreSessionsAction(
  offset: number,
  limit: number,
): Promise<{ sessions: SessionListItemSerialized[] }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { sessions: [] };
  }
  if (offset < 0 || limit < 1 || limit > 50) {
    return { sessions: [] };
  }

  const sessions = await db.badmintonSession.findMany({
    include: {
      attendances: {
        include: {
          member: {
            include: { user: true },
          },
        },
      },
      court: {
        select: { name: true },
      },
    },
    orderBy: { sessionDate: "desc" },
    skip: offset,
    take: limit,
  });

  const items: SessionListItemSerialized[] = sessions.map((s) => ({
    id: s.id,
    sessionDate: s.sessionDate.toISOString(),
    startTime: s.startTime?.toISOString() ?? null,
    endTime: s.endTime?.toISOString() ?? null,
    courtId: s.courtId ?? null,
    courtName: s.court?.name ?? null,
    notes: s.notes,
    status: s.status,
    attendees: s.attendances.map((a) => ({
      memberId: a.memberId,
      memberName: a.member.user.name ?? a.member.user.email,
      status: a.status,
      fineAmount: a.fineAmount,
      note: a.note,
    })),
  }));

  return { sessions: items };
}
