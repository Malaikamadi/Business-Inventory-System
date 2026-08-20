"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Store,
  Package,
  Boxes,
  ShoppingCart,
  BarChart3,
  Users,
  ClipboardList,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  PackageX,
  TruckIcon,
  Wrench,
  ArrowRightLeft,
  Tags,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: string;
  children?: NavItem[];
}

const ownerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shops", href: "/shops", icon: Store },
  {
    label: "Products",
    href: "/products",
    icon: Package,
    children: [
      { label: "All Products", href: "/products", icon: Package },
      { label: "Categories", href: "/products/categories", icon: Tags },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    children: [
      { label: "Overview", href: "/inventory", icon: Boxes },
      { label: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle },
      { label: "Out of Stock", href: "/inventory/out-of-stock", icon: PackageX },
      { label: "Stock Arrivals", href: "/inventory/arrivals", icon: TruckIcon },
      { label: "Adjustments", href: "/inventory/adjustments", icon: Wrench },
      { label: "Movements", href: "/inventory/movements", icon: ArrowRightLeft },
    ],
  },
  { label: "Sales", href: "/sales", icon: ShoppingCart },
  { label: "Reports", href: "/reports/sales", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Audit Log", href: "/audit-log", icon: ClipboardList },
];

const salespersonNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Record Sale", href: "/sales/new", icon: ShoppingCart },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Boxes,
    children: [
      { label: "Available Stock", href: "/inventory", icon: Boxes },
      { label: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle },
      { label: "Out of Stock", href: "/inventory/out-of-stock", icon: PackageX },
    ],
  },
  { label: "Sales History", href: "/sales", icon: ShoppingCart },
];

interface SidebarProps {
  userRole: string;
  collapsed?: boolean;
}

export function Sidebar({ userRole }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = userRole === "owner" ? ownerNavItems : salespersonNavItems;

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col h-screen bg-sidebar text-white border-r border-white/5 transition-all duration-300 fixed left-0 top-0 z-40",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm shrink-0">
            IS
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight">
              InvSys
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <Separator className="bg-white/10" />

      {/* Settings */}
      <div className="p-3">
        <NavLink
          href="/settings/profile"
          icon={Settings}
          label="Settings"
          isActive={pathname.startsWith("/settings")}
          collapsed={collapsed}
        />
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/10">
        <Button
          variant="ghost"
          size="icon-sm"
          className="w-full text-white/60 hover:text-white hover:bg-sidebar-hover"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </aside>
  );
}

function NavItemComponent({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isActive =
    pathname === item.href ||
    (item.children &&
      item.children.some((child) => pathname === child.href));

  if (item.children && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            isActive
              ? "text-white bg-sidebar-hover"
              : "text-white/60 hover:text-white hover:bg-sidebar-hover"
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              open && "rotate-90"
            )}
          />
        </button>
        {open && (
          <div className="ml-4 mt-1 space-y-0.5 border-l border-white/10 pl-3">
            {item.children.map((child) => (
              <NavLink
                key={child.href}
                href={child.href}
                icon={child.icon}
                label={child.label}
                isActive={pathname === child.href}
                collapsed={false}
                compact
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      href={item.href}
      icon={item.icon}
      label={item.label}
      isActive={pathname === item.href}
      collapsed={collapsed}
    />
  );
}

function NavLink({
  href,
  icon: Icon,
  label,
  isActive,
  collapsed,
  compact,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-md text-sm font-medium transition-colors relative",
        compact ? "px-3 py-2" : "px-3 py-2.5",
        isActive
          ? "text-white bg-sidebar-active/20 nav-link-active"
          : "text-white/60 hover:text-white hover:bg-sidebar-hover",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("shrink-0", compact ? "h-4 w-4" : "h-[18px] w-[18px]")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
