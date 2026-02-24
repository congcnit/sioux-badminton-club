import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { ProfileForm } from "@/components/settings/profile-form";
import { PageMotion, HeroMotion } from "@/components/ui/motion";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";

export default async function ProfileSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      memberProfile: {
        select: {
          phone: true,
          dateOfBirth: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <PageMotion className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <HeroMotion
          title="Profile Settings"
          subtitle="Update your avatar, profile details, and contact information."
        />
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/settings/password">Change Password</Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
      <ProfileForm
        name={user.name ?? ""}
        email={user.email}
        avatar={user.image ?? ""}
        phone={user.memberProfile?.phone ?? ""}
        dateOfBirth={
          user.memberProfile?.dateOfBirth
            ? user.memberProfile.dateOfBirth.toISOString().slice(0, 10)
            : ""
        }
      />
    </PageMotion>
  );
}
