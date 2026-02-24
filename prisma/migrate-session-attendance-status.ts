import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STATUS_MAPPINGS: Record<string, string> = {
  ATTENDED: "PRESENT",
  PENDING: "PRESENT",
  EXCUSED: "EXCUSED_ABSENCE",
  NO_SHOW: "UNEXCUSED_ABSENCE",
};

async function getStatusCounts() {
  const result = (await prisma.$runCommandRaw({
    aggregate: "session_attendances",
    pipeline: [
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ],
    cursor: {},
  })) as {
    cursor?: {
      firstBatch?: Array<{ _id: string | null; count: number }>;
    };
  };

  return result.cursor?.firstBatch ?? [];
}

async function run() {
  console.log("Session attendance status migration started.");
  console.log("Before migration:", await getStatusCounts());

  for (const [fromStatus, toStatus] of Object.entries(STATUS_MAPPINGS)) {
    const updateResult = (await prisma.$runCommandRaw({
      update: "session_attendances",
      updates: [
        {
          q: { status: fromStatus },
          u: { $set: { status: toStatus } },
          multi: true,
        },
      ],
    })) as { n?: number; nModified?: number };

    console.log(
      `Mapped ${fromStatus} -> ${toStatus}:`,
      `matched=${updateResult.n ?? 0}, modified=${updateResult.nModified ?? 0}`,
    );
  }

  console.log("After migration:", await getStatusCounts());
  console.log("Session attendance status migration completed.");
}

run()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
