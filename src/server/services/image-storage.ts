import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { isStoredImagePath } from "@/lib/images";
import { ValidationError } from "@/server/services/errors";

/**
 * Product image storage.
 *
 * Files are written outside `public/` so that uploads are not part of the build
 * output and survive redeploys, and are served back through a route handler.
 * Names are the SHA-256 of the bytes, which makes writes idempotent (uploading
 * the same photo twice costs one file) and lets the serving route mark every
 * response immutable.
 */

const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "storage", "uploads");

const PRODUCT_IMAGE_DIR = path.join(UPLOAD_ROOT, "products");

/** Kept small on purpose: the client downscales before upload, so anything
 *  larger than this is a misuse rather than a legitimate product photo. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

type ImageKind = { ext: "jpg" | "png" | "webp"; mime: string };

/**
 * Identify the image from its leading bytes. The browser-supplied MIME type and
 * filename are attacker-controlled, so neither is trusted. SVG is deliberately
 * unsupported — it can carry script and would execute on our own origin.
 */
function sniff(bytes: Uint8Array): ImageKind | null {
  if (bytes.length < 12) return null;

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", mime: "image/jpeg" };
  }

  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (PNG.every((byte, index) => bytes[index] === byte)) {
    return { ext: "png", mime: "image/png" };
  }

  const ascii = (start: number, end: number) =>
    String.fromCharCode(...bytes.subarray(start, end));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", mime: "image/webp" };
  }

  return null;
}

/**
 * Resolve a request path segment to a file on disk, or `null` if it is not a
 * name we generated. Rejecting anything that is not 64 hex characters plus a
 * known extension leaves no room for traversal via `..` or encoded separators.
 */
export function resolveStoredImage(
  filename: string
): { absolutePath: string; mime: string } | null {
  if (!isStoredImagePath(`/api/images/products/${filename}`)) return null;

  const ext = filename.split(".").pop() as ImageKind["ext"];
  const mime =
    ext === "jpg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";

  return { absolutePath: path.join(PRODUCT_IMAGE_DIR, filename), mime };
}

export async function readStoredImage(filename: string) {
  const resolved = resolveStoredImage(filename);
  if (!resolved) return null;

  try {
    // The upload directory is runtime state, not build input. Without this the
    // bundler traces the entire project into the deploy output on the
    // assumption that the path could reach any file.
    const body = await readFile(/* turbopackIgnore: true */ resolved.absolutePath);
    return { body, mime: resolved.mime };
  } catch {
    return null;
  }
}

/**
 * Persist an uploaded product image and return the path to store on the
 * product. Throws `ValidationError` for anything that is not a supported image.
 */
export async function storeProductImage(file: File): Promise<string> {
  if (file.size === 0) {
    throw new ValidationError("The selected image is empty.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ValidationError(
      `Images must be smaller than ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) {
    throw new ValidationError("Only JPEG, PNG, and WebP images are supported.");
  }

  const digest = createHash("sha256").update(bytes).digest("hex");
  const name = `${digest}.${kind.ext}`;

  await mkdir(/* turbopackIgnore: true */ PRODUCT_IMAGE_DIR, {
    recursive: true,
  });
  await writeFile(
    /* turbopackIgnore: true */ path.join(PRODUCT_IMAGE_DIR, name),
    bytes
  );

  return `/api/images/products/${name}`;
}
