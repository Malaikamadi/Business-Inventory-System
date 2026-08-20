"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { mobileBarItemsFor, navItemsFor } from "./nav-items";

/** Full navigation drawer, opened from the header on small screens. */
export function MobileNav({
  isOpen,
  onClose,
  permissions,
}: {
  isOpen: boolean;
  onClose: () => void;
  permissions: string[];
}) {
  const pathname = usePathname();

  // Sub-items are flattened here: a phone drawer should not require expanding
  // a section to reach a destination.
  const links = navItemsFor(permissions).flatMap((item) =>
    item.children ? item.children : [item]
  );

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform bg-sidebar text-white transition-transform duration-200 ease-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal={isOpen}
        aria-label="Navigation"
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-xs font-semibold text-white">
              IS
            </div>
            <span className="text-base font-semibold">InvSys</span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-white/60 hover:bg-sidebar-hover hover:text-white"
            onClick={onClose}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="h-[calc(100vh-4rem)] space-y-1 overflow-y-auto px-3 py-4">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "nav-link-active font-semibold"
                  : "text-white/65 hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}

          <Link
            href="/settings/profile"
            onClick={onClose}
            className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-white/60 transition-colors hover:bg-sidebar-hover hover:text-white"
          >
            <Settings className="h-[18px] w-[18px] shrink-0" />
            <span>Settings</span>
          </Link>
        </nav>
      </div>
    </>
  );
}

/**
 * Persistent bottom bar on phones. Sales are often recorded one-handed, so the
 * few destinations that matter stay within thumb reach instead of behind a menu.
 */
export function MobileTabBar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname();
  const items = mobileBarItemsFor(permissions);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm lg:hidden">
      <div className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                active ? "bg-accent text-white" : "text-text-muted hover:text-text-primary"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
