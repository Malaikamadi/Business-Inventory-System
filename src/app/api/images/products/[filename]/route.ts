import { readStoredImage } from "@/server/services/image-storage";

/**
 * Serves product photos from the upload directory.
 *
 * Filenames are content hashes, so a given URL always returns the same bytes
 * and can be cached indefinitely. Images are readable without a session: they
 * are product photos rather than business data, and the unguessable name keeps
 * them from being enumerated.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const image = await readStoredImage(filename);

  if (!image) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(image.body), {
    headers: {
      "Content-Type": image.mime,
      "Content-Length": String(image.body.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
