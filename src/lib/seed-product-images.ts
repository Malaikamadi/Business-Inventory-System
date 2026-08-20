import { existsSync } from "node:fs";
import path from "node:path";

import { storeProductImageFromPath } from "../server/services/image-storage";

const SEED_IMAGES_DIR = path.join(process.cwd(), "prisma", "seed-images");

/**
 * Catalog photos that ship with seed data. Filenames are the product SKU.
 */
export async function seedImageUrlForSku(sku: string): Promise<string | null> {
  for (const ext of ["jpg", "jpeg", "png", "webp"] as const) {
    const file = path.join(SEED_IMAGES_DIR, `${sku}.${ext}`);
    if (!existsSync(file)) continue;
    return storeProductImageFromPath(file);
  }
  return null;
}
