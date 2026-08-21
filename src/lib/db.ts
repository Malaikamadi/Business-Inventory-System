import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Hot reload keeps a PrismaClient on `globalThis` so we do not exhaust the
 * connection pool. After `prisma generate` that instance is still the old
 * schema, so we drop it when the generated fields change.
 */
const SCHEMA_STAMP = Object.keys(Prisma.ProductScalarFieldEnum).sort().join(",");

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaStamp: string | undefined;
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaStamp !== SCHEMA_STAMP
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaStamp = SCHEMA_STAMP;
}
