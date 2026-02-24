import "dotenv/config";

import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

function parseRole(rawRole: string | undefined): Role {
  if (!rawRole) return Role.ADMIN;

  const normalized = rawRole.toUpperCase();
  if (normalized === Role.ADMIN) return Role.ADMIN;
  if (normalized === Role.MEMBER) return Role.MEMBER;
  if (normalized === Role.COACH) return Role.COACH;

  throw new Error("SEED_USER_ROLE must be ADMIN, MEMBER, or COACH.");
}

async function main() {
  const email = process.env.SEED_USER_EMAIL;
  const password = process.env.SEED_USER_PASSWORD;
  const name = process.env.SEED_USER_NAME ?? "Seed User";
  const role = parseRole(process.env.SEED_USER_ROLE);

  if (!email) {
    throw new Error("Missing SEED_USER_EMAIL in environment.");
  }

  if (!password || password.length < 8) {
    throw new Error("SEED_USER_PASSWORD is required and must be at least 8 characters.");
  }

  const hashedPassword = await hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role,
      password: hashedPassword,
    },
    create: {
      email,
      name,
      role,
      password: hashedPassword,
    },
  });

  console.log(`Seeded user: ${user.email} (${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
