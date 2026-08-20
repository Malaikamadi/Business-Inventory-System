import { PERMISSIONS, type PermissionKey } from "@/lib/constants";

/**
 * Route prefixes that require a permission beyond being authenticated.
 * Ordered most-specific first so the first match wins.
 *
 * This is a coarse first gate only. Every server action and data query must
 * still authorize independently — a route guard cannot protect a mutation.
 */
const PROTECTED_ROUTES: { prefix: string; permission: PermissionKey }[] = [
  { prefix: "/products/categories", permission: PERMISSIONS.CATEGORIES_MANAGE },
  { prefix: "/inventory/arrivals", permission: PERMISSIONS.STOCK_ARRIVALS_CREATE },
  { prefix: "/inventory/adjustments", permission: PERMISSIONS.STOCK_ADJUSTMENTS_CREATE },
  { prefix: "/shops", permission: PERMISSIONS.SHOPS_VIEW_ALL },
  { prefix: "/users", permission: PERMISSIONS.USERS_VIEW },
  { prefix: "/audit-log", permission: PERMISSIONS.AUDIT_VIEW },
  { prefix: "/reports", permission: PERMISSIONS.REPORTS_GLOBAL },
];

export function requiredPermissionForPath(pathname: string): PermissionKey | null {
  const match = PROTECTED_ROUTES.find(
    (route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`)
  );
  return match?.permission ?? null;
}

export function canAccessPath(pathname: string, permissions: string[]): boolean {
  const required = requiredPermissionForPath(pathname);
  if (!required) return true;
  return permissions.includes(required);
}
