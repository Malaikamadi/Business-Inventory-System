"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Store,
  Package,
  Boxes,
  BarChart3,
  Users,
  ClipboardList,
  Settings,
  AlertTriangle,
  PackageX,
  TruckIcon,
  Wrench,
  ArrowRightLeft,
  Tags,
} from "lucide-react";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}

const ownerNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Shops", href: "/shops", icon: Store },
  { label: "Products", href: "/products", icon: Package },
  { label: "Categories", href: "/products/categories", icon: Tags },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle },
  { label: "Out of Stock", href: "/inventory/out-of-stock", icon: PackageX },
  { label: "Stock Arrivals", href: "/inventory/arrivals", icon: TruckIcon },
  { label: "Adjustments", href: "/inventory/adjustments", icon: Wrench },
  { label: "Movements", href: "/inventory/movements", icon: ArrowRightLeft },
  { label: "Sales", href: "/sales", icon: ShoppingCart },
  { label: "Reports", href: "/reports/sales", icon: BarChart3 },
  { label: "Users", href: "/users", icon: Users },
  { label: "Audit Log", href: "/audit-log", icon: ClipboardList },
  { label: "Settings", href: "/settings/profile", icon: Settings },
];

const salespersonNavItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Record Sale", href: "/sales/new", icon: ShoppingCart },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Low Stock", href: "/inventory/low-stock", icon: AlertTriangle },
  { label: "Out of Stock", href: "/inventory/out-of-stock", icon: PackageX },
  { label: "Sales History", href: "/sales", icon: ShoppingCart },
  { label: "Settings", href: "/settings/profile", icon: Settings },
];

export function MobileNav({ isOpen, onClose, userRole }: MobileNavProps) {
  const pathname = usePathname();
  const navItems =
    userRole === "owner" ? ownerNavItems : salespersonNavItems;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sheet */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar text-white transform transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white font-bold text-sm">
              IS
            </div>
            <span className="text-base font-semibold">InvSys</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/60 hover:text-white hover:bg-sidebar-hover"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="overflow-y-auto py-4 px-3 space-y-1 h-[calc(100vh-4rem)]">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "text-white bg-sidebar-active/20"
                  : "text-white/60 hover:text-white hover:bg-sidebar-hover"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}

// Floating Action Button for salesperson mobile view
export function SaleFAB() {
  return (
    <Link
      href="/sales/new"
      className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 hover:bg-accent-hover transition-all duration-200 hover:scale-105 lg:hidden"
    >
      <ShoppingCart className="h-6 w-6" />
      <span className="sr-only">Record Sale</span>
    </Link>
  );
}
