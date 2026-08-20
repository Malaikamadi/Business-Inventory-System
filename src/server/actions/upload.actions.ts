"use server";

import { PERMISSIONS } from "@/lib/constants";
import { can, getCurrentUser } from "@/server/auth-context";
import { ForbiddenError, ValidationError } from "@/server/services/errors";
import { storeProductImage } from "@/server/services/image-storage";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

/**
 * Accepts a product photo and returns the path to save on the product.
 *
 * The image is stored immediately, before the product is saved, so a picture
 * chosen for a form that is later abandoned leaves an unreferenced file behind.
 * That is a deliberate trade for keeping the upload independent of the form
 * submission; see `npm run images:prune` to reclaim the space.
 */
export async function uploadProductImageAction(
  formData: FormData
): Promise<ActionResult<{ imageUrl: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (
      !can(user, PERMISSIONS.PRODUCTS_CREATE) &&
      !can(user, PERMISSIONS.PRODUCTS_UPDATE)
    ) {
      throw new ForbiddenError("You cannot change product images.");
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ValidationError("No image was received.");
    }

    return { imageUrl: await storeProductImage(file) };
  });
}
