import { MemberStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { isBirthdayTodayInTimezone } from "@/lib/birthday-utils";
import { db } from "@/lib/db";
import { createMailTransport, sendHappyBirthdayEmail } from "@/lib/mail";

/** Daily 00:00 UTC = 07:00 Asia/Ho_Chi_Minh (UTC+7, no DST). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 120;

const BIRTHDAY_TIMEZONE = "Asia/Ho_Chi_Minh";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (secret) {
    return authHeader === `Bearer ${secret}`;
  }
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return true;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const members = await db.member.findMany({
      where: {
        status: MemberStatus.ACTIVE,
        dateOfBirth: { not: null },
      },
      select: {
        status: true,
        dateOfBirth: true,
        user: {
          select: { email: true, name: true, deletedAt: true },
        },
      },
    });

    const birthdayMembers = members.filter(
      (member) =>
        !member.user.deletedAt &&
        member.dateOfBirth &&
        member.user.email &&
        isBirthdayTodayInTimezone(member.dateOfBirth, BIRTHDAY_TIMEZONE),
    );

    if (birthdayMembers.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        failed: 0,
      });
    }

    const transport = createMailTransport();
    const results: { email: string; ok: boolean; error?: string }[] = [];

    for (const member of birthdayMembers) {
      try {
        await sendHappyBirthdayEmail(
          member.user.email,
          member.user.name,
          transport,
        );
        results.push({ email: member.user.email, ok: true });
      } catch (err) {
        console.error("[cron] birthday email failed:", member.user.email, err);
        results.push({
          email: member.user.email,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    const sent = results.filter((r) => r.ok).length;
    const failed = results.filter((r) => !r.ok).length;

    return NextResponse.json({
      ok: true,
      sent,
      failed,
      ...(process.env.NODE_ENV === "development" ? { details: results } : {}),
    });
  } catch (err) {
    console.error("[cron]", err);
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 },
    );
  }
}
