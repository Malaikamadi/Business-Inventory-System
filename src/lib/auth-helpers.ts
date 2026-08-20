import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/types";
import { ROLES } from "@/lib/constants";

/**
 * Get the current authenticated session user.
 * Throws if not authenticated.
 */
export async function getSessionUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user as SessionUser;
}

/**
 * Check if the current user has a specific permission.
 */
export function hasPermission(user: SessionUser, permission: string): boolean {
  return user.permissions.includes(permission);
}

/**
 * Require that the current user has a specific permission.
 * Throws ForbiddenError if not.
 */
export function requirePermission(
  user: SessionUser,
  permission: string
): void {
  if (!hasPermission(user, permission)) {
    throw new Error("Forbidden: insufficient permissions");
  }
}

/**
 * Check if the user is assigned to a specific shop.
 * Owners have access to all shops.
 */
export function hasShopAccess(user: SessionUser, shopId: string): boolean {
  if (user.isOwner) return true;
  return user.shopIds.includes(shopId);
}

/**
 * Require that the user has access to a specific shop.
 */
export function requireShopAccess(user: SessionUser, shopId: string): void {
  if (!hasShopAccess(user, shopId)) {
    throw new Error("Forbidden: no access to this shop");
  }
}

/**
 * Require a specific permission AND shop access.
 */
export function requirePermissionAndShopAccess(
  user: SessionUser,
  permission: string,
  shopId: string
): void {
  requirePermission(user, permission);
  requireShopAccess(user, shopId);
}

/**
 * Get the shop IDs a user can access.
 * Returns undefined for owners (meaning all shops).
 */
export function getAccessibleShopIds(
  user: SessionUser
): string[] | undefined {
  if (user.isOwner) return undefined; // no filter — all shops
  return user.shopIds;
}

/**
 * Create an audit log entry.
 */
export async function createAuditLog(params: {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  shopId?: string;
  details?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      shopId: params.shopId,
      details: params.details ? (params.details as object) : undefined,
    },
  });
}
