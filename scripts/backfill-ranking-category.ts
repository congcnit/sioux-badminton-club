/**
 * One-time script: set category = MENS_SINGLES on existing Ranking, Match, and Challenge
 * documents (after adding the category field to the schema).
 *
 * Run with: npx tsx scripts/backfill-ranking-category.ts
 * Then: npx prisma generate (if not already done)
 */

import { db } from "../lib/db";

async function main() {
  const [r, m, c] = await Promise.all([
    db.ranking.updateMany({
      where: {},
      data: { category: "MENS_SINGLES" },
    }),
    db.match.updateMany({
      where: {},
      data: { category: "MENS_SINGLES" },
    }),
    db.challenge.updateMany({
      where: {},
      data: { category: "MENS_SINGLES" },
    }),
  ]);
  console.log("Backfill complete:", { rankings: r.count, matches: m.count, challenges: c.count });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
