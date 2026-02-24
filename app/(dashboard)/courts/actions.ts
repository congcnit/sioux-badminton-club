"use server";

import { Prisma, Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  createCourtSchema,
  deleteCourtSchema,
  updateCourtSchema,
} from "@/lib/validations/court";

export type CourtActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const initialState: CourtActionState = {
  success: false,
  message: "",
};

function optionalToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session?.user?.id && session.user.role === Role.ADMIN);
}

function normalizePrismaError(error: unknown) {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return "Court name already exists.";
  }
  return "Unexpected error. Please try again.";
}

export async function createCourtAction(
  prevState: CourtActionState = initialState,
  formData: FormData,
): Promise<CourtActionState> {
  void prevState;
  if (!(await assertAdmin())) {
    return { success: false, message: "Only admin can manage courts." };
  }

  const parsed = createCourtSchema.safeParse({
    name: formData.get("name"),
    locationLink: formData.get("locationLink"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the form fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await db.court.create({
      data: {
        name: parsed.data.name,
        locationLink: optionalToNull(parsed.data.locationLink),
        notes: optionalToNull(parsed.data.notes),
      },
    });
  } catch (error) {
    return { success: false, message: normalizePrismaError(error) };
  }

  revalidatePath("/courts");
  return { success: true, message: "Court created." };
}

export async function updateCourtAction(formData: FormData) {
  if (!(await assertAdmin())) return;

  const parsed = updateCourtSchema.safeParse({
    courtId: formData.get("courtId"),
    name: formData.get("name"),
    locationLink: formData.get("locationLink"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return;

  try {
    await db.court.update({
      where: { id: parsed.data.courtId },
      data: {
        name: parsed.data.name,
        locationLink: optionalToNull(parsed.data.locationLink),
        notes: optionalToNull(parsed.data.notes),
      },
    });
  } catch {
    return;
  }

  revalidatePath("/courts");
}

export async function deleteCourtAction(formData: FormData) {
  if (!(await assertAdmin())) return;

  const parsed = deleteCourtSchema.safeParse({
    courtId: formData.get("courtId"),
  });
  if (!parsed.success) return;

  try {
    await db.court.delete({
      where: { id: parsed.data.courtId },
    });
  } catch {
    return;
  }

  revalidatePath("/courts");
}
