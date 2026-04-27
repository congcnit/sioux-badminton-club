/**
 * Fire the birthday cron locally or against any deployed URL.
 *
 * Usage:
 *   npm run cron:test
 *   npm run cron:test -- --url https://your-app.vercel.app
 *
 * Requires `npm run dev` (or a reachable deployment). Loads `.env.local` then `.env`
 * so `CRON_SECRET` matches your Next server.
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

function parseArgs(): { baseUrl?: string } {
  const argv = process.argv.slice(2);
  let baseUrl: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--url" && argv[i + 1]) {
      baseUrl = argv[++i];
    }
  }
  return { baseUrl };
}

async function main() {
  const { baseUrl: urlArg } = parseArgs();
  const baseUrl =
    urlArg ??
    process.env.CRON_TEST_BASE_URL ??
    "http://localhost:3000";

  const cronUrl = new URL("/api/cron", baseUrl);
  const headers = new Headers();
  const secret = process.env.CRON_SECRET;
  if (secret) {
    headers.set("Authorization", `Bearer ${secret}`);
  }

  console.log(`GET ${cronUrl.toString()}`);

  const res = await fetch(cronUrl, { method: "GET", headers });
  const raw = await res.text();
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    // keep text
  }

  console.log(res.status, parsed);
  if (!res.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
