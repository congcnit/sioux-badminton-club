import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { DashboardHeaderClient } from "@/components/layout/dashboard-header-client";

const baseNavigation = [
  { href: "/sessions", label: "Sessions" },
  { href: "/budget", label: "Budget" },
  { href: "/fund", label: "Fund" },
  { href: "/members", label: "Members" },
  { href: "/rankings", label: "Rankings" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }
  const isAdmin = session.user.role === Role.ADMIN;
  const navItems = isAdmin
    ? baseNavigation
    : baseNavigation.filter((item) => item.href !== "/rankings");
  const navigation = isAdmin
    ? [...navItems, { href: "/courts", label: "Courts" }]
    : navItems;
  const currentUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
  const initials = (
    currentUser?.name?.trim()?.[0] ??
    currentUser?.email?.[0] ??
    session.user.email?.[0] ??
    "U"
  ).toUpperCase();

  return (
    <DashboardHeaderClient
      navigation={navigation}
      currentUser={currentUser}
      initials={initials}
    >
      {children}
    </DashboardHeaderClient>
  );
}
