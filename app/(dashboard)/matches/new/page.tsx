import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { NewMatchForm } from "@/components/matches/new-match-form";
import { db } from "@/lib/db";

export default async function NewMatchPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    redirect("/matches");
  }

  const members = await db.member.findMany({
    include: {
      user: true,
    },
    orderBy: {
      memberCode: "asc",
    },
  });

  const memberOptions = members.map((member) => ({
    id: member.id,
    name: member.user.name ?? member.user.email,
  }));

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">New Match</h1>
        <p className="text-sm text-muted-foreground">
          Submit result and update Elo ratings automatically (K = 32).
        </p>
      </div>
      <NewMatchForm members={memberOptions} />
    </section>
  );
}
