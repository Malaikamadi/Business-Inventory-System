import { PERMISSIONS, type PermissionKey } from "@/lib/constants";

/**
 * Which permission each page requires.
 *
 * This is a coarse first gate only. Every server action and data query must
 * still authorize independently — a route guard cannot protect a mutation, and
 * it cannot decide which shops a query may read.
 *
 * Rules are matched in order, so narrower paths come before the sections that
 * contain them: `/shops/new` has to be tested before `/shops/:id`, or creating
 * a shop would be checked as if it were viewing one.
 *
 * `anyOf` holds alternatives rather than requirements. Most sections are
 * reachable two ways — business-wide or limited to your own shop — and which
 * one you hold decides how much of the page you see, not whether you may open
 * it.
 */
interface RouteRule {
  pattern: RegExp;
  anyOf: PermissionKey[];
  /** Shown on the no-access page so the refusal names the actual section. */
  section: string;
}

const ID = "[^/]+";

const RULES: RouteRule[] = [
  {
    pattern: new RegExp(`^/products/categories(?:/|$)`),
    anyOf: [PERMISSIONS.CATEGORIES_MANAGE],
    section: "Categories",
  },
  {
    pattern: new RegExp(`^/products/new$`),
    anyOf: [PERMISSIONS.PRODUCTS_CREATE],
    section: "Add product",
  },
  {
    pattern: new RegExp(`^/products/${ID}/edit$`),
    anyOf: [PERMISSIONS.PRODUCTS_UPDATE],
    section: "Edit product",
  },
  {
    pattern: new RegExp(`^/products(?:/|$)`),
    anyOf: [PERMISSIONS.PRODUCTS_VIEW],
    section: "Products",
  },

  {
    pattern: new RegExp(`^/inventory/arrivals(?:/|$)`),
    anyOf: [PERMISSIONS.STOCK_ARRIVALS_CREATE],
    section: "Stock arrivals",
  },
  {
    pattern: new RegExp(`^/inventory/adjustments(?:/|$)`),
    anyOf: [PERMISSIONS.STOCK_ADJUSTMENTS_CREATE],
    section: "Stock adjustments",
  },
  {
    pattern: new RegExp(`^/inventory/movements(?:/|$)`),
    anyOf: [
      PERMISSIONS.STOCK_MOVEMENTS_VIEW_ALL,
      PERMISSIONS.STOCK_MOVEMENTS_VIEW_ASSIGNED,
    ],
    section: "Stock movements",
  },
  {
    pattern: new RegExp(`^/inventory(?:/|$)`),
    anyOf: [
      PERMISSIONS.INVENTORY_VIEW_ALL,
      PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
    ],
    section: "Inventory",
  },

  {
    pattern: new RegExp(`^/shops/new$`),
    anyOf: [PERMISSIONS.SHOPS_CREATE],
    section: "Add shop",
  },
  {
    pattern: new RegExp(`^/shops/${ID}/edit$`),
    anyOf: [PERMISSIONS.SHOPS_UPDATE],
    section: "Edit shop",
  },
  {
    // Staff may open the branch they work at; membership itself is checked on
    // the page, since a permission cannot tell one shop id from another.
    pattern: new RegExp(`^/shops/${ID}$`),
    anyOf: [PERMISSIONS.SHOPS_VIEW_ALL, PERMISSIONS.SHOPS_VIEW_ASSIGNED],
    section: "Shop",
  },
  {
    pattern: new RegExp(`^/shops$`),
    anyOf: [PERMISSIONS.SHOPS_VIEW_ALL],
    section: "Shops",
  },

  {
    pattern: new RegExp(`^/sales/new$`),
    anyOf: [PERMISSIONS.SALES_CREATE],
    section: "Record sale",
  },
  {
    pattern: new RegExp(`^/sales(?:/|$)`),
    anyOf: [PERMISSIONS.SALES_VIEW_ALL, PERMISSIONS.SALES_VIEW_ASSIGNED],
    section: "Sales",
  },

  {
    pattern: new RegExp(`^/users/new$`),
    anyOf: [PERMISSIONS.USERS_CREATE],
    section: "Add user",
  },
  {
    pattern: new RegExp(`^/users/${ID}/edit$`),
    anyOf: [PERMISSIONS.USERS_UPDATE],
    section: "Edit user",
  },
  {
    pattern: new RegExp(`^/users(?:/|$)`),
    anyOf: [PERMISSIONS.USERS_VIEW],
    section: "Users",
  },

  {
    pattern: new RegExp(`^/audit-log(?:/|$)`),
    anyOf: [PERMISSIONS.AUDIT_VIEW],
    section: "Audit log",
  },
  {
    pattern: new RegExp(`^/reports(?:/|$)`),
    anyOf: [PERMISSIONS.REPORTS_GLOBAL, PERMISSIONS.REPORTS_SHOP],
    section: "Reports",
  },
  {
    pattern: new RegExp(`^/dashboard(?:/|$)`),
    anyOf: [
      PERMISSIONS.DASHBOARD_GLOBAL_VIEW,
      PERMISSIONS.DASHBOARD_SHOP_VIEW,
    ],
    section: "Dashboard",
  },
];

/**
 * Where unauthorized users are sent. Must never itself require a permission, or
 * a user who can reach nothing would be redirected in a loop.
 */
export const NO_ACCESS_PATH = "/no-access";

export function ruleForPath(pathname: string): RouteRule | null {
  return RULES.find((rule) => rule.pattern.test(pathname)) ?? null;
}

export function sectionForPath(pathname: string): string | null {
  return ruleForPath(pathname)?.section ?? null;
}

export function canAccessPath(pathname: string, permissions: string[]): boolean {
  const rule = ruleForPath(pathname);
  if (!rule) return true;
  return rule.anyOf.some((permission) => permissions.includes(permission));
}
