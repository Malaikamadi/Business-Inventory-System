import { auth } from "@/lib/auth";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants";
import type { SessionUser } from "@/types";
import { ForbiddenError, UnauthorizedError } from "./services/errors";

/**
 * The single place server code learns who the caller is and what they may do.
 *
 * Pages and actions must obtain scope from here rather than trusting anything
 * that arrived in the request. In particular `resolveShopScope` decides which
 * shops a query may read; passing its result is what keeps a salesperson from
 * seeing another branch's data even if they forge a shop id.
 */

export async function getCurrentUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  return session.user as SessionUser;
}

export function can(user: SessionUser, permission: PermissionKey): boolean {
  return user.permissions.includes(permission);
}

export function assertCan(user: SessionUser, permission: PermissionKey): void {
  if (!can(user, permission)) {
    throw new ForbiddenError(
      "You do not have permission to perform this action."
    );
  }
}

/** Owners see every shop; everyone else is limited to their assignments. */
export function canAccessShop(user: SessionUser, shopId: string): boolean {
  if (can(user, PERMISSIONS.SHOPS_VIEW_ALL)) return true;
  return user.shopIds.includes(shopId);
}

export function assertShopAccess(user: SessionUser, shopId: string): void {
  if (!canAccessShop(user, shopId)) {
    throw new ForbiddenError("You do not have access to this shop.");
  }
}

/**
 * The shop filter to apply to a query.
 *
 * `undefined` means "no filter — all shops" and is returned only for users with
 * business-wide read access. A user with no shop assignment gets an empty
 * array, which correctly yields no rows rather than everything.
 */
export function resolveShopScope(
  user: SessionUser,
  requestedShopId?: string | null
): string[] | undefined {
  const global = can(user, PERMISSIONS.INVENTORY_VIEW_ALL) ||
    can(user, PERMISSIONS.SALES_VIEW_ALL);

  if (requestedShopId) {
    assertShopAccess(user, requestedShopId);
    return [requestedShopId];
  }

  return global ? undefined : user.shopIds;
}

/**
 * Resolves the shop a write should be applied to. Unlike reads, a write always
 * targets exactly one shop and must name it explicitly unless the user has a
 * single assignment to fall back on.
 */
export function resolveWriteShop(
  user: SessionUser,
  requestedShopId?: string | null
): string {
  const shopId = requestedShopId ?? user.primaryShopId;
  if (!shopId) {
    throw new ForbiddenError("No shop selected for this action.");
  }
  assertShopAccess(user, shopId);
  return shopId;
}
