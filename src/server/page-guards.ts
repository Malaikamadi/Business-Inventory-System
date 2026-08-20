import { redirect } from "next/navigation";

import { NO_ACCESS_PATH } from "@/lib/route-access";
import { canAccessShop } from "@/server/auth-context";
import type { SessionUser } from "@/types";

/**
 * Record-level access checks for pages.
 *
 * The route guard can tell that someone may view *a* shop, but not whether they
 * belong to the one in the URL — that needs the record. Denials here redirect
 * rather than throw so they read like the rest of the permission system instead
 * of surfacing as an unexpected error.
 *
 * Server actions must keep using `assertShopAccess`, which throws: a mutation
 * has to fail loudly, not navigate.
 */
export function requireShopAccess(
  user: SessionUser,
  shopId: string,
  from: string
): void {
  if (!canAccessShop(user, shopId)) {
    redirect(`${NO_ACCESS_PATH}?from=${encodeURIComponent(from)}`);
  }
}
