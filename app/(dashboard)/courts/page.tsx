import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { CourtManagement } from "@/components/courts/court-management";
import { db } from "@/lib/db";

export default async function CourtsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== Role.ADMIN) {
    redirect("/");
  }

  const courts = await db.court.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <CourtManagement
      courts={courts.map((court) => ({
        id: court.id,
        name: court.name,
        locationLink: court.locationLink,
        notes: court.notes,
      }))}
    />
  );
}
