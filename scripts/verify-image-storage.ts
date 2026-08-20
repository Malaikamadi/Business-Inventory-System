/**
 * Checks the product image pipeline: what it accepts, what it rejects, and that
 * a stored file can be read back through the same name it hands out.
 */

import { deflateSync } from "node:zlib";
import { rm } from "node:fs/promises";
import path from "node:path";

import {
  readStoredImage,
  resolveStoredImage,
  storeProductImage,
} from "../src/server/services/image-storage";
import { isStoredImagePath } from "../src/lib/images";
import { isDomainError } from "../src/server/services/errors";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
  if (condition) passed++;
  else failed++;
}

async function expectRejection(label: string, run: () => Promise<unknown>) {
  try {
    await run();
    check(label, false);
  } catch (error) {
    check(label, isDomainError(error));
  }
}

/** Minimal but genuinely valid 1x1 PNG, built rather than committed as a fixture. */
function onePixelPng(): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([length, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0]))),
      chunk("IEND", Buffer.alloc(0)),
    ])
  );
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return crc ^ 0xffffffff;
}

async function main() {
  const png = onePixelPng();

  console.log("\nAccepting real images");
  const stored = await storeProductImage(
    new File([png as BufferSource], "photo.png", { type: "image/png" })
  );
  check("a PNG is stored and returns a path", isStoredImagePath(stored));

  const readBack = await readStoredImage(path.basename(stored));
  check("the stored file can be read back", readBack !== null);
  check("it is served as image/png", readBack?.mime === "image/png");
  check(
    "the bytes round-trip unchanged",
    Buffer.compare(Buffer.from(readBack!.body), Buffer.from(png)) === 0
  );

  const again = await storeProductImage(
    new File([png as BufferSource], "different-name.png", { type: "image/png" })
  );
  check("re-uploading the same photo reuses one file", again === stored);

  console.log("\nRejecting what is not an image");
  await expectRejection("a text file disguised as a JPEG", () =>
    storeProductImage(
      new File([Buffer.from("not an image")], "evil.jpg", {
        type: "image/jpeg",
      })
    )
  );
  await expectRejection("an SVG, which could carry script", () =>
    storeProductImage(
      new File([Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')], "x.svg", {
        type: "image/svg+xml",
      })
    )
  );
  await expectRejection("an empty file", () =>
    storeProductImage(new File([], "empty.png", { type: "image/png" }))
  );
  await expectRejection("a file over the size limit", () =>
    storeProductImage(
      new File([Buffer.alloc(4 * 1024 * 1024)], "huge.png", {
        type: "image/png",
      })
    )
  );

  console.log("\nRejecting hostile filenames");
  for (const name of [
    "../../../../etc/passwd",
    "..%2f..%2fetc%2fpasswd",
    "abc.png",
    `${"a".repeat(64)}.exe`,
    `${"g".repeat(64)}.png`,
    "",
  ]) {
    check(
      `"${name || "(empty)"}" resolves to nothing`,
      resolveStoredImage(name) === null
    );
  }

  console.log("\nRejecting foreign image URLs on products");
  for (const value of [
    "https://evil.example.com/tracker.png",
    "/api/images/products/../../secret.png",
    "javascript:alert(1)",
  ]) {
    check(`"${value}" is not a valid stored path`, !isStoredImagePath(value));
  }

  await rm(path.dirname(path.join(process.cwd(), "storage", "uploads")), {
    recursive: true,
    force: true,
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
