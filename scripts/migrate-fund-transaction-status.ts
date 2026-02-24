/**
 * One-time migration: set status to COMPLETED for all existing fund transactions.
 * Run once after adding the FundTransactionStatus enum and status field.
 *
 * Usage: npx tsx scripts/migrate-fund-transaction-status.ts
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const collection = "fund_transactions";

async function main() {
  const result = await (db as unknown as { $runCommandRaw: (cmd: unknown) => Promise<{ n: number }> })
    .$runCommandRaw({
      update: collection,
      updates: [
        {
          q: {},
          u: { $set: { status: "COMPLETED" } },
          multi: true,
        },
      ],
    });

  const n = (result as { n?: number }).n ?? 0;
  console.log(`Updated ${n} fund transaction(s) to status COMPLETED.`);
  console.log("Migration finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
