import { redirect } from "next/navigation";

import type { PermissionKey } from "@/lib/constants";
import { NO_ACCESS_PATH } from "@/lib/route-access";
import { can, canAccessShop, canAny } from "@/server/auth-context";
import type { SessionUser } from "@/types";

/**
 * Page-level access checks. These redirect to a page that names the refused
 * section, rather than throwing — a thrown `ForbiddenError` in a Server
 * Component surfaces as a generic crash, which looks like the section is
 * missing rather than restricted.
 *
 * Server actions must keep using `assertCan` / `assertShopAccess`, which throw:
 * a mutation has to fail loudly, not navigate.
 */

function bounce(from: string): never {
  redirect(`${NO_ACCESS_PATH}?from=${encodeURIComponent(from)}`);
}

export function requireCan(
  user: SessionUser,
  permission: PermissionKey,
  from: string
): void {
  if (!can(user, permission)) bounce(from);
}

export function requireCanAny(
  user: SessionUser,
  permissions: PermissionKey[],
  from: string
): void {
  if (!canAny(user, permissions)) bounce(from);
}

export function requireShopAccess(
  user: SessionUser,
  shopId: string,
  from: string
): void {
  if (!canAccessShop(user, shopId)) bounce(from);
}
