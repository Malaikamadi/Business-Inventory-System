/**
 * Shape of the only image paths the application stores or serves.
 *
 * Lives apart from the storage service so client code and validation can reuse
 * it without pulling in Node built-ins. The name is the SHA-256 of the file
 * contents, which is what makes these paths safe to cache forever.
 */
export const STORED_IMAGE_PATH =
  /^\/api\/images\/products\/[a-f0-9]{64}\.(?:jpg|png|webp)$/;

export function isStoredImagePath(value: string): boolean {
  return STORED_IMAGE_PATH.test(value);
}
