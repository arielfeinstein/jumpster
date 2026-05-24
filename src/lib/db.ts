import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

// In development, Next.js hot-reloads modules on every change, which would
// create a new PrismaClient on each reload and exhaust the connection pool.
// We work around this by attaching the client to `globalThis`, which persists
// across reloads in dev but is garbage-collected normally in production.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // Prisma 7 requires a driver adapter — it no longer accepts a bare URL.
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
