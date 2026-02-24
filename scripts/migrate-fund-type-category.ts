/**
 * One-time migration: set FundTransaction.type to INCOME | EXPENSE and
 * FundTransaction.category to the previous type (DONATION, FINE, etc.).
 * Run once if you have existing fund_transactions with the old type enum.
 *
 * Usage: npx tsx scripts/migrate-fund-type-category.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const INCOME_CATEGORIES = ["DONATION", "FINE", "GUEST_FEE"] as const;
const EXPENSE_CATEGORIES = ["COURT", "SHUTTLECOCK", "ACTIVITY", "OTHER"] as const;

async function main() {
  const collection = "fund_transactions";

  for (const cat of INCOME_CATEGORIES) {
    const result = await (db as unknown as { $runCommandRaw: (cmd: unknown) => Promise<{ n: number }> }).$runCommandRaw({
      update: collection,
      updates: [
        {
          q: { type: cat },
          u: [{ $set: { category: cat, type: "INCOME" } }],
          multi: true,
        },
      ],
    });
    const n = (result as { n?: number }).n ?? 0;
    if (n > 0) console.log(`Updated ${n} document(s) with type ${cat} -> category=${cat}, type=INCOME`);
  }

  for (const cat of EXPENSE_CATEGORIES) {
    const result = await (db as unknown as { $runCommandRaw: (cmd: unknown) => Promise<{ n: number }> }).$runCommandRaw({
      update: collection,
      updates: [
        {
          q: { type: cat },
          u: [{ $set: { category: cat, type: "EXPENSE" } }],
          multi: true,
        },
      ],
    });
    const n = (result as { n?: number }).n ?? 0;
    if (n > 0) console.log(`Updated ${n} document(s) with type ${cat} -> category=${cat}, type=EXPENSE`);
  }

  console.log("Migration finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
