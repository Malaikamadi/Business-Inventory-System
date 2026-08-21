// ─── Permission Keys ─────────────────────────────────────────────────

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_GLOBAL_VIEW: "dashboard:global:view",
  DASHBOARD_SHOP_VIEW: "dashboard:shop:view",

  // Shops
  SHOPS_CREATE: "shops:create",
  SHOPS_UPDATE: "shops:update",
  SHOPS_DELETE: "shops:delete",
  SHOPS_VIEW_ALL: "shops:view:all",
  SHOPS_VIEW_ASSIGNED: "shops:view:assigned",

  // Products
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_DELETE: "products:delete",
  PRODUCTS_VIEW: "products:view",
  /**
   * Buying prices, margins, and stock valued at cost. Separate from
   * `PRODUCTS_VIEW` because shop staff need to look up what to charge without
   * learning what the business pays or earns per unit.
   */
  PRODUCTS_VIEW_COST: "products:view:cost",

  // Categories
  CATEGORIES_MANAGE: "categories:manage",

  // Inventory
  INVENTORY_VIEW_ALL: "inventory:view:all",
  INVENTORY_VIEW_ASSIGNED: "inventory:view:assigned",

  // Stock
  STOCK_ARRIVALS_CREATE: "stock:arrivals:create",
  STOCK_ADJUSTMENTS_CREATE: "stock:adjustments:create",
  STOCK_MOVEMENTS_VIEW_ALL: "stock:movements:view:all",
  STOCK_MOVEMENTS_VIEW_ASSIGNED: "stock:movements:view:assigned",

  // Sales
  SALES_CREATE: "sales:create",
  SALES_VIEW_ALL: "sales:view:all",
  SALES_VIEW_ASSIGNED: "sales:view:assigned",
  SALES_VOID: "sales:void",

  // Users
  USERS_CREATE: "users:create",
  USERS_UPDATE: "users:update",
  USERS_DEACTIVATE: "users:deactivate",
  USERS_VIEW: "users:view",

  // Reports
  REPORTS_GLOBAL: "reports:global",
  REPORTS_SHOP: "reports:shop",

  // Audit
  AUDIT_VIEW: "audit:view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─── Role Names ──────────────────────────────────────────────────────

export const ROLES = {
  OWNER: "owner",
  MANAGER: "manager",
  SALESPERSON: "salesperson",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Only the owner sees every shop. Managers and salespeople are assigned. */
export function isBusinessWideRole(name: string): boolean {
  return name === ROLES.OWNER;
}

/**
 * Overall business owner: watches the three shops. Does not run a till or a
 * stockroom. Each shop has its own manager for catalog and arrivals.
 */
export const OWNER_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_GLOBAL_VIEW,
  PERMISSIONS.SHOPS_VIEW_ALL,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_VIEW_COST,
  PERMISSIONS.INVENTORY_VIEW_ALL,
  PERMISSIONS.STOCK_MOVEMENTS_VIEW_ALL,
  PERMISSIONS.SALES_VIEW_ALL,
  PERMISSIONS.REPORTS_GLOBAL,
  PERMISSIONS.AUDIT_VIEW,
];

/**
 * Shop manager: catalog, stock arrivals, and adjustments for the shop they
 * are assigned to. They do not record till sales and they do not see other
 * shops.
 */
export const MANAGER_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_SHOP_VIEW,
  PERMISSIONS.SHOPS_VIEW_ASSIGNED,
  PERMISSIONS.SHOPS_UPDATE,
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.PRODUCTS_DELETE,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.PRODUCTS_VIEW_COST,
  PERMISSIONS.CATEGORIES_MANAGE,
  PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
  PERMISSIONS.STOCK_ARRIVALS_CREATE,
  PERMISSIONS.STOCK_ADJUSTMENTS_CREATE,
  PERMISSIONS.STOCK_MOVEMENTS_VIEW_ASSIGNED,
  PERMISSIONS.SALES_VIEW_ASSIGNED,
  PERMISSIONS.SALES_VOID,
  PERMISSIONS.REPORTS_SHOP,
  PERMISSIONS.AUDIT_VIEW,
];

/**
 * What a shop salesperson may do. They run the till and check stock at their
 * shop. Revenue, sales history, and reports stay with the owner and manager.
 */
export const SALESPERSON_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_SHOP_VIEW,
  PERMISSIONS.SHOPS_VIEW_ASSIGNED,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
  PERMISSIONS.SALES_CREATE,
];

// ─── Movement Types ──────────────────────────────────────────────────

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  OPENING: "Opening Stock",
  ARRIVAL: "Stock Arrival",
  SALE: "Sale",
  ADJUSTMENT: "Adjustment",
  RETURN: "Return",
  TRANSFER_IN: "Transfer In",
  TRANSFER_OUT: "Transfer Out",
};

// ─── Stock Thresholds ────────────────────────────────────────────────

export const DEFAULT_LOW_STOCK_THRESHOLD = 10;

/**
 * Heuristics for the owner review queue. These are signals, not proof of
 * fraud — a flagged row still needs a person to look at it.
 */
export const REVIEW = {
  VOID_WINDOW_DAYS: 7,
  REPEAT_VOID_COUNT: 3,
  QUICK_VOID_MINUTES: 120,
  LARGE_ADJUSTMENT_UNITS: 50,
  LARGE_ADJUSTMENT_SHARE: 0.5,
  LARGE_AFTER_HOURS_UNITS: 20,
  LOW_SALES_LOOKBACK_DAYS: 14,
  LOW_SALES_RATIO: 0.4,
  LOW_SALES_MIN_DAYS: 5,
  /** Only compare today's sales once the trading day is well underway. */
  LOW_SALES_AFTER_HOUR: 16,
} as const;

// ─── Pagination ──────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
