"use server";

import { Gender, MemberStatus, Prisma, Role } from "@prisma/client";
import { hash } from "bcrypt";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createMemberSchema,
  deleteMemberSchema,
  updateMemberSchema,
} from "@/lib/validations/member";

export type MemberActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  toastKey?: number;
};

const defaultState: MemberActionState = {
  success: false,
  message: "",
};

function optionalToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDateOrNull(value?: string) {
  if (!value) return null;
  return new Date(value);
}

function randomCodeSuffix() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function generateUniqueMemberCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `M${Date.now().toString().slice(-6)}${randomCodeSuffix()}`;
    const existing = await db.member.findUnique({
      where: { memberCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `M${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

async function resolveMemberCode(inputCode?: string, existingCode?: string) {
  const normalizedInput = inputCode?.trim().toUpperCase();
  if (normalizedInput) return normalizedInput;
  if (existingCode) return existingCode;
  return generateUniqueMemberCode();
}

async function isAuthenticated() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id && session.user.role === Role.ADMIN);
}

function normalizePrismaError(error: unknown): string {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Email or member code already exists.";
  }

  return "Unexpected error. Please try again.";
}

export async function createMemberAction(
  prevState: MemberActionState = defaultState,
  formData: FormData,
): Promise<MemberActionState> {
  void prevState;
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "Only admin can manage members.",
      toastKey: Date.now(),
    };
  }

  const parsed = createMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    memberCode: formData.get("memberCode"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender") || undefined,
    status: formData.get("status") ?? MemberStatus.ACTIVE,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  try {
    const hashedPassword = await hash(parsed.data.password, 10);

    const user = await db.user.create({
      data: {
        email: parsed.data.email.toLowerCase(),
        name: parsed.data.name.trim(),
        password: hashedPassword,
        role: Role.MEMBER,
      },
    });

    const memberCode = await resolveMemberCode(parsed.data.memberCode);

    await db.member.create({
      data: {
        userId: user.id,
        memberCode,
        phone: optionalToNull(parsed.data.phone),
        dateOfBirth: parseDateOrNull(parsed.data.dateOfBirth),
        gender: parsed.data.gender ?? undefined,
        status: parsed.data.status,
        notes: optionalToNull(parsed.data.notes),
      },
    });
  } catch (error) {
    return {
      success: false,
      message: normalizePrismaError(error),
      toastKey: Date.now(),
    };
  }

  revalidatePath("/members");
  return {
    success: true,
    message: "Member created successfully.",
    toastKey: Date.now(),
  };
}

export async function updateMemberAction(
  _prevState: MemberActionState = defaultState,
  formData: FormData,
): Promise<MemberActionState> {
  if (!(await isAuthenticated())) {
    return {
      success: false,
      message: "Only admin can manage members.",
      toastKey: Date.now(),
    };
  }

  const parsed = updateMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
    memberCode: formData.get("memberCode"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
    gender: formData.get("gender") || undefined,
    status: formData.get("status") ?? MemberStatus.ACTIVE,
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
      toastKey: Date.now(),
    };
  }

  try {
    const currentMember = await db.member.findUnique({
      where: { id: parsed.data.memberId },
      select: { memberCode: true },
    });

    await db.user.update({
      where: { id: parsed.data.userId },
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase(),
      },
    });

    const memberCode = await resolveMemberCode(
      parsed.data.memberCode,
      currentMember?.memberCode,
    );

    await db.member.update({
      where: { id: parsed.data.memberId },
      data: {
        memberCode,
        phone: optionalToNull(parsed.data.phone),
        dateOfBirth: parseDateOrNull(parsed.data.dateOfBirth),
        gender: parsed.data.gender ?? undefined,
        status: parsed.data.status,
        notes: optionalToNull(parsed.data.notes),
      },
    });
  } catch (error) {
    return {
      success: false,
      message: normalizePrismaError(error),
      toastKey: Date.now(),
    };
  }

  revalidatePath("/members");
  return {
    success: true,
    message: "Member updated successfully.",
    toastKey: Date.now(),
  };
}

export async function deleteMemberAction(formData: FormData) {
  if (!(await isAuthenticated())) return;

  const parsed = deleteMemberSchema.safeParse({
    memberId: formData.get("memberId"),
    userId: formData.get("userId"),
  });

  if (!parsed.success) return;

  try {
    await db.member.delete({
      where: { id: parsed.data.memberId },
    });

    await db.user.delete({
      where: { id: parsed.data.userId },
    });
  } catch {
    return;
  }

  revalidatePath("/members");
}
