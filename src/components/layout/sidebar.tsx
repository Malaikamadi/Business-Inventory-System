"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { navItemsFor, type NavItem } from "./nav-items";

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({ permissions }: { permissions: string[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const navItems = navItemsFor(permissions);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-white/5 bg-sidebar text-white transition-[width] duration-200 lg:flex",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      <div className="flex h-16 items-center border-b border-white/10 px-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            IS
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight">InvSys</span>
          )}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <SidebarItem
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>

      <Separator className="bg-white/10" />

      <div className="p-3">
        <NavLink
          href="/settings/profile"
          icon={Settings}
          label="Settings"
          isActive={pathname.startsWith("/settings")}
          collapsed={collapsed}
        />
      </div>

      <div className="border-t border-white/10 p-3">
        <Button
          variant="ghost"
          size="icon-sm"
          className="w-full text-white/60 hover:bg-sidebar-hover hover:text-white"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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

function SidebarItem({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
}) {
  const hasActiveChild =
    item.children?.some((child) => isActivePath(pathname, child.href)) ?? false;
  const [open, setOpen] = useState(hasActiveChild);

  if (item.children && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
            hasActiveChild
              ? "bg-sidebar-hover text-white"
              : "text-white/60 hover:bg-sidebar-hover hover:text-white"
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          <ChevronRight
            className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
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
      isActive={isActivePath(pathname, item.href)}
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
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
        compact ? "px-3 py-2" : "px-3 py-2.5",
        isActive
          ? "nav-link-active bg-sidebar-active/20 text-white"
          : "text-white/60 hover:bg-sidebar-hover hover:text-white",
        collapsed && "justify-center px-0"
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("shrink-0", compact ? "h-4 w-4" : "h-[18px] w-[18px]")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}
