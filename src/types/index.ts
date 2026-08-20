import type { Decimal } from "@prisma/client/runtime/library";

// ─── User Types ──────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleId: string;
  permissions: string[];
  shopIds: string[];
  primaryShopId: string | null;
  isOwner: boolean;
}

// ─── Product Types ───────────────────────────────────────────────────

export interface ProductWithInventory {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  description: string | null;
  costPrice: Decimal;
  sellingPrice: Decimal;
  lowStockThreshold: number;
  imageUrl: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string } | null;
  shopInventory: {
    id: string;
    shopId: string;
    quantity: number;
    shop: { id: string; name: string };
  }[];
}

// ─── Sale Types ──────────────────────────────────────────────────────

export interface SaleFormItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  availableStock: number;
  unitPrice: number;
  unitCost: number;
  lineTotal: number;
}

export interface SaleFormData {
  shopId: string;
  items: SaleFormItem[];
  notes?: string;
}

// ─── Stock Movement Types ────────────────────────────────────────────

export interface StockArrivalFormData {
  shopId: string;
  productId: string;
  quantity: number;
  notes?: string;
}

export interface StockAdjustmentFormData {
  shopId: string;
  productId: string;
  quantityChange: number;
  reason: string;
}

// ─── Dashboard Types ─────────────────────────────────────────────────

export interface DashboardKPIs {
  totalRevenue: number;
  totalSales: number;
  totalProducts: number;
  totalShops: number;
  monthlyRevenue: number;
  monthlySales: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryUnits: number;
}

export interface ShopDashboardKPIs {
  todayRevenue: number;
  todaySales: number;
  todayItemsSold: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface SalesDataPoint {
  date: string;
  revenue: number;
  count: number;
}

export interface ShopPerformance {
  shopId: string;
  shopName: string;
  revenue: number;
  salesCount: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

// ─── Report Types ────────────────────────────────────────────────────

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  dateRange?: DateRange;
  shopId?: string;
  productId?: string;
  salespersonId?: string;
}

// ─── API Response Types ──────────────────────────────────────────────

export interface ActionResult<T = undefined> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
