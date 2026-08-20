/**
 * Deletes product photos that no product points at.
 *
 * Uploads happen before the product form is submitted, so abandoning a form
 * after choosing a picture leaves a file with nothing referencing it. Run this
 * occasionally to reclaim the space; nothing depends on it being run.
 *
 *   npm run images:prune          # report only
 *   npm run images:prune -- --delete
 */

import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";

import { prisma } from "../src/lib/db";

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads");
const PRODUCT_IMAGE_DIR = path.join(UPLOAD_ROOT, "products");

/** Newly uploaded files are skipped so a form still open in a browser tab does
 *  not lose the picture it is about to save. */
const MIN_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  const shouldDelete = process.argv.includes("--delete");

  let files: string[];
  try {
    files = await readdir(PRODUCT_IMAGE_DIR);
  } catch {
    console.log(`No upload directory at ${PRODUCT_IMAGE_DIR}. Nothing to do.`);
    return;
  }

  const products = await prisma.product.findMany({
    where: { imageUrl: { not: null } },
    select: { imageUrl: true },
  });
  const referenced = new Set(
    products.map((product) => path.basename(product.imageUrl!))
  );

  const now = Date.now();
  let reclaimed = 0;
  let count = 0;

  for (const file of files) {
    if (referenced.has(file)) continue;

    const absolute = path.join(PRODUCT_IMAGE_DIR, file);
    const info = await stat(absolute);
    if (now - info.mtimeMs < MIN_AGE_MS) continue;

    count += 1;
    reclaimed += info.size;
    if (shouldDelete) await unlink(absolute);
  }

  const mb = (reclaimed / (1024 * 1024)).toFixed(2);
  console.log(
    shouldDelete
      ? `Deleted ${count} unreferenced image(s), reclaiming ${mb}MB.`
      : `Found ${count} unreferenced image(s) using ${mb}MB. Re-run with --delete to remove them.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
