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
  SALESPERSON: "salesperson",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

// ─── Owner Permissions ───────────────────────────────────────────────

export const OWNER_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

// ─── Salesperson Permissions ─────────────────────────────────────────

export const SALESPERSON_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_SHOP_VIEW,
  PERMISSIONS.SHOPS_VIEW_ASSIGNED,
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
  PERMISSIONS.STOCK_MOVEMENTS_VIEW_ASSIGNED,
  PERMISSIONS.SALES_CREATE,
  PERMISSIONS.SALES_VIEW_ASSIGNED,
  PERMISSIONS.REPORTS_SHOP,
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

// ─── Pagination ──────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
