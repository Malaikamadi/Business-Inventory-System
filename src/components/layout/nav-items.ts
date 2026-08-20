import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Package,
  PackageX,
  ShoppingCart,
  Store,
  Tags,
  TruckIcon,
  Users,
  Wrench,
} from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";

/**
 * Navigation is derived from the viewer's permissions rather than their role
 * name, so adding a role does not require touching the menu. Hiding a link is
 * a convenience only — the route guard and every action authorize separately.
 */

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: NavItem[];
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Shops",
    href: "/shops",
    icon: Store,
    permission: PERMISSIONS.SHOPS_VIEW_ALL,
  },
  {
    label: "Record Sale",
    href: "/sales/new",
    icon: ShoppingCart,
    permission: PERMISSIONS.SALES_CREATE,
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    permission: PERMISSIONS.PRODUCTS_VIEW,
    children: [
      {
        label: "All Products",
        href: "/products",
        icon: Package,
        permission: PERMISSIONS.PRODUCTS_VIEW,
      },
      {
        label: "Categories",
        href: "/products/categories",
        icon: Tags,
        permission: PERMISSIONS.CATEGORIES_MANAGE,
      },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    children: [
      { label: "Overview", href: "/inventory", icon: Boxes },
      { label: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle },
      {
        label: "Out of Stock",
        href: "/inventory/out-of-stock",
        icon: PackageX,
      },
      {
        label: "Stock Arrivals",
        href: "/inventory/arrivals",
        icon: TruckIcon,
        permission: PERMISSIONS.STOCK_ARRIVALS_CREATE,
      },
      {
        label: "Adjustments",
        href: "/inventory/adjustments",
        icon: Wrench,
        permission: PERMISSIONS.STOCK_ADJUSTMENTS_CREATE,
      },
      {
        label: "Movements",
        href: "/inventory/movements",
        icon: ArrowRightLeft,
      },
    ],
  },
  { label: "Sales", href: "/sales", icon: ShoppingCart },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    permission: PERMISSIONS.REPORTS_GLOBAL,
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    permission: PERMISSIONS.USERS_VIEW,
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: ClipboardList,
    permission: PERMISSIONS.AUDIT_VIEW,
  },
];

function isVisible(item: NavItem, permissions: string[]): boolean {
  return !item.permission || permissions.includes(item.permission);
}

export function navItemsFor(permissions: string[]): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => isVisible(item, permissions)).map(
    (item) => {
      if (!item.children) return item;
      const children = item.children.filter((child) =>
        isVisible(child, permissions)
      );
      // A parent whose only remaining child duplicates its own link is noise.
      return children.length > 1 ? { ...item, children } : { ...item, children: undefined };
    }
  );
}

/** Bottom bar for phones, where salespeople record most sales. */
export function mobileBarItemsFor(permissions: string[]): NavItem[] {
  const canSell = permissions.includes(PERMISSIONS.SALES_CREATE);
  return [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
    ...(canSell
      ? [{ label: "Sell", href: "/sales/new", icon: ShoppingCart }]
      : []),
    { label: "Stock", href: "/inventory", icon: Boxes },
    { label: "Sales", href: "/sales", icon: ClipboardList },
  ];
}
