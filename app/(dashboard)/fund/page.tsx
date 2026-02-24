import { FundManagement } from "@/components/fund/fund-management";
import { authOptions } from "@/lib/auth";
import { getFundPageData } from "@/lib/fund-service";
import { Role } from "@prisma/client";
import { getServerSession } from "next-auth";

export default async function FundPage() {
  const session = await getServerSession(authOptions);
  const canManage = session?.user?.role === Role.ADMIN;

  const data = await getFundPageData();
  const currentYear = new Date().getFullYear();

  return (
    <FundManagement
      transactions={data.transactions}
      summary={data.summary}
      incomeByCategory={data.incomeByCategory}
      expenseByCategory={data.expenseByCategory}
      chartYear={currentYear}
      canManage={canManage}
    />
  );
}
