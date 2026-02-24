"use server";

import { MemberStatus, Prisma } from "@prisma/client";
import { compare, hash } from "bcrypt";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  changePasswordSchema,
  updateProfileSchema,
} from "@/lib/validations/account";

export type AccountActionState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

const initialState: AccountActionState = {
  success: false,
  message: "",
};

const MAX_AVATAR_BYTES = 500 * 1024;

function optionalToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function parseDateOrNull(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function randomCodeSuffix() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function generateUniqueMemberCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `M${Date.now().toString().slice(-6)}${randomCodeSuffix()}`;
    const existing = await tx.member.findUnique({
      where: { memberCode: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
  }

  return `M${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}

async function fileToDataUrl(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:${file.type};base64,${base64}`;
}

export async function updateProfileAction(
  prevState: AccountActionState = initialState,
  formData: FormData,
): Promise<AccountActionState> {
  void prevState;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in." };
  }

  const parsed = updateProfileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    dateOfBirth: formData.get("dateOfBirth"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const avatarFile = formData.get("avatar");
  let nextImage: string | undefined;
  if (avatarFile instanceof File && avatarFile.size > 0) {
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return {
        success: false,
        message: "Avatar must be 500KB or smaller.",
        errors: { avatar: ["Avatar must be 500KB or smaller."] },
      };
    }

    if (!avatarFile.type.startsWith("image/")) {
      return {
        success: false,
        message: "Avatar must be an image file.",
        errors: { avatar: ["Avatar must be an image file."] },
      };
    }

    nextImage = await fileToDataUrl(avatarFile);
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          name: parsed.data.name,
          email: parsed.data.email.toLowerCase(),
          image: nextImage,
        },
      });

      await tx.member.upsert({
        where: { userId: session.user.id },
        update: {
          phone: optionalToNull(parsed.data.phone),
          dateOfBirth: parseDateOrNull(parsed.data.dateOfBirth),
        },
        create: {
          userId: session.user.id,
          memberCode: await generateUniqueMemberCode(tx),
          phone: optionalToNull(parsed.data.phone),
          dateOfBirth: parseDateOrNull(parsed.data.dateOfBirth),
          status: MemberStatus.ACTIVE,
        },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        message: "This email is already used by another account.",
      };
    }

    return {
      success: false,
      message: "Unable to update profile right now.",
    };
  }

  revalidatePath("/settings/profile");
  revalidatePath("/");

  return {
    success: true,
    message: "Profile updated successfully.",
  };
}

export async function updatePasswordAction(
  prevState: AccountActionState = initialState,
  formData: FormData,
): Promise<AccountActionState> {
  void prevState;
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { success: false, message: "You must be signed in." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });

  if (!user?.password) {
    return {
      success: false,
      message: "Password is not configured for this account.",
    };
  }

  const validCurrentPassword = await compare(
    parsed.data.currentPassword,
    user.password,
  );

  if (!validCurrentPassword) {
    return {
      success: false,
      message: "Current password is incorrect.",
      errors: { currentPassword: ["Current password is incorrect."] },
    };
  }

  const hashedPassword = await hash(parsed.data.newPassword, 10);
  await db.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  revalidatePath("/settings/password");

  return {
    success: true,
    message: "Password updated successfully.",
  };
}
