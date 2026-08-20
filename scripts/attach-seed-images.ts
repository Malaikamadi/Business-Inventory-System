/**
 * Attaches catalog photos to existing products by SKU without reseeding.
 * Does not touch sales, stock, or users.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { seedImageUrlForSku } from "../src/lib/seed-product-images";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const dir = path.join(process.cwd(), "prisma", "seed-images");
  const files = await readdir(dir);
  const skus = files.flatMap((file) => {
    const match = file.match(/^(.*)\.(jpg|jpeg|png|webp)$/i);
    return match ? [match[1]] : [];
  });

  let attached = 0;
  for (const sku of skus) {
    const imageUrl = await seedImageUrlForSku(sku);
    if (!imageUrl) continue;

    const result = await prisma.product.updateMany({
      where: { sku },
      data: { imageUrl },
    });
    if (result.count > 0) {
      attached += result.count;
      console.log(`  ${sku} → ${imageUrl}`);
    }
  }

  console.log(`\nAttached photos to ${attached} product(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
