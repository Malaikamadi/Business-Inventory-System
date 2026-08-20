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
  /** Holding any one of these reveals the item. Mirrors the route guard, where
   *  most sections are reachable business-wide or for your own shop. */
  anyOf?: string[];
  children?: NavItem[];
}

const INVENTORY_VIEW = [
  PERMISSIONS.INVENTORY_VIEW_ALL,
  PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
];

const SALES_VIEW = [
  PERMISSIONS.SALES_VIEW_ALL,
  PERMISSIONS.SALES_VIEW_ASSIGNED,
];

const ALL_NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    anyOf: [
      PERMISSIONS.DASHBOARD_GLOBAL_VIEW,
      PERMISSIONS.DASHBOARD_SHOP_VIEW,
    ],
  },
  {
    label: "Shops",
    href: "/shops",
    icon: Store,
    anyOf: [PERMISSIONS.SHOPS_VIEW_ALL, PERMISSIONS.SHOPS_VIEW_ASSIGNED],
  },
  {
    label: "Ring it up",
    href: "/sales/new",
    icon: ShoppingCart,
    anyOf: [PERMISSIONS.SALES_CREATE],
  },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    anyOf: [PERMISSIONS.PRODUCTS_VIEW],
    children: [
      {
        label: "All Products",
        href: "/products",
        icon: Package,
        anyOf: [PERMISSIONS.PRODUCTS_VIEW],
      },
      {
        label: "Categories",
        href: "/products/categories",
        icon: Tags,
        anyOf: [PERMISSIONS.CATEGORIES_MANAGE],
      },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    anyOf: INVENTORY_VIEW,
    children: [
      { label: "Overview", href: "/inventory", icon: Boxes, anyOf: INVENTORY_VIEW },
      {
        label: "Low Stock",
        href: "/inventory/low-stock",
        icon: AlertTriangle,
        anyOf: INVENTORY_VIEW,
      },
      {
        label: "Out of Stock",
        href: "/inventory/out-of-stock",
        icon: PackageX,
        anyOf: INVENTORY_VIEW,
      },
      {
        label: "Stock Arrivals",
        href: "/inventory/arrivals",
        icon: TruckIcon,
        anyOf: [PERMISSIONS.STOCK_ARRIVALS_CREATE],
      },
      {
        label: "Adjustments",
        href: "/inventory/adjustments",
        icon: Wrench,
        anyOf: [PERMISSIONS.STOCK_ADJUSTMENTS_CREATE],
      },
      {
        label: "Movements",
        href: "/inventory/movements",
        icon: ArrowRightLeft,
        anyOf: [
          PERMISSIONS.STOCK_MOVEMENTS_VIEW_ALL,
          PERMISSIONS.STOCK_MOVEMENTS_VIEW_ASSIGNED,
        ],
      },
    ],
  },
  { label: "Sales", href: "/sales", icon: ShoppingCart, anyOf: SALES_VIEW },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    anyOf: [PERMISSIONS.REPORTS_GLOBAL, PERMISSIONS.REPORTS_SHOP],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    anyOf: [PERMISSIONS.USERS_VIEW],
  },
  {
    label: "Audit Log",
    href: "/audit-log",
    icon: ClipboardList,
    anyOf: [PERMISSIONS.AUDIT_VIEW],
  },
];

function isVisible(item: NavItem, permissions: string[]): boolean {
  if (!item.anyOf) return true;
  return item.anyOf.some((permission) => permissions.includes(permission));
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
  const items: NavItem[] = [
    { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  ];

  if (permissions.includes(PERMISSIONS.SALES_CREATE)) {
    items.push({ label: "Ring", href: "/sales/new", icon: ShoppingCart });
  }
  if (
    permissions.includes(PERMISSIONS.INVENTORY_VIEW_ALL) ||
    permissions.includes(PERMISSIONS.INVENTORY_VIEW_ASSIGNED)
  ) {
    items.push({ label: "Stock", href: "/inventory", icon: Boxes });
  }
  if (
    permissions.includes(PERMISSIONS.SALES_VIEW_ALL) ||
    permissions.includes(PERMISSIONS.SALES_VIEW_ASSIGNED)
  ) {
    items.push({ label: "Sales", href: "/sales", icon: ClipboardList });
  }

  return items;
}
