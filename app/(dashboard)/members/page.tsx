import { MemberManagement } from "@/components/members/member-management";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { Role } from "@prisma/client";

export default async function MembersPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user?.role === Role.ADMIN;

  const members = await db.member.findMany({
    include: {
      user: true,
    },
    orderBy: {
      joinDate: "desc",
    },
  });

  const listItems = members.map((member) => ({
    id: member.id,
    phone: member.phone,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    status: member.status,
    notes: member.notes,
    userId: member.user.id,
    userName: member.user.name,
    userEmail: member.user.email,
    userImage: member.user.image,
  }));

  return <MemberManagement members={listItems} canManage={isAdmin} />;
}
