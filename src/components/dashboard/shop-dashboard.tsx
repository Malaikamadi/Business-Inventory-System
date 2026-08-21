import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  Package,
  PackageX,
  Plus,
  Store,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { can, canAny } from "@/server/auth-context";
import { getStockAlertCounts } from "@/server/services/dashboard.service";
import { StatCard } from "@/components/shared/stat-card";
import { LiveRefresh } from "@/components/shared/live-refresh";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StockAlerts } from "./stock-alerts";
import type { SessionUser } from "@/types";

/**
 * Till view for salespeople. Stock they need to sell is here; revenue and
 * what was sold stay on the owner and manager dashboards.
 */
export async function ShopDashboard({ user }: { user: SessionUser }) {
  const shopId = user.primaryShopId ?? user.shopIds[0];

  if (!shopId) {
    return (
      <EmptyState
        title="No shop assigned"
        description="Your account is not assigned to a shop yet. Ask the business owner to assign you before recording sales."
      />
    );
  }

  const [shop, alerts] = await Promise.all([
    prisma.shop.findUnique({
      where: { id: shopId },
      select: { name: true, location: true },
    }),
    getStockAlertCounts([shopId]),
  ]);

  return (
    <div className="space-y-6">
      <LiveRefresh />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
            Welcome, {user.firstName}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {shop?.name ?? "Your shop"} — record sales and check what is in
            stock. Shop revenue is for the manager and owner.
          </p>
        </div>
        {can(user, PERMISSIONS.SALES_CREATE) && (
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/sales/new">
              <Plus className="h-4 w-4" />
              Record sale
            </Link>
          </Button>
        )}
      </div>

      <RoleShortcuts user={user} shopId={shopId} />

      <section
        aria-label="Stock"
        className="grid grid-cols-2 gap-4"
      >
        <StatCard
          title="Low stock"
          value={formatNumber(alerts.lowStock)}
          icon={AlertTriangle}
          iconClassName={
            alerts.lowStock > 0
              ? "bg-warning-light text-warning-foreground"
              : undefined
          }
        />
        <StatCard
          title="Out of stock"
          value={formatNumber(alerts.outOfStock)}
          icon={PackageX}
          iconClassName={
            alerts.outOfStock > 0 ? "bg-danger-light text-danger" : undefined
          }
        />
      </section>

      <StockAlerts shopIds={[shopId]} />
    </div>
  );
}

function RoleShortcuts({ user, shopId }: { user: SessionUser; shopId: string }) {
  const items = [
    canAny(user, [
      PERMISSIONS.INVENTORY_VIEW_ALL,
      PERMISSIONS.INVENTORY_VIEW_ASSIGNED,
    ]) && {
      href: "/inventory",
      label: "Inventory",
      icon: Boxes,
    },
    can(user, PERMISSIONS.PRODUCTS_VIEW) && {
      href: "/products",
      label: "Products",
      icon: Package,
    },
    canAny(user, [
      PERMISSIONS.SHOPS_VIEW_ALL,
      PERMISSIONS.SHOPS_VIEW_ASSIGNED,
    ]) && {
      href: `/shops/${shopId}`,
      label: "This shop",
      icon: Store,
    },
  ].filter(
    (item): item is { href: string; label: string; icon: typeof Boxes } =>
      Boolean(item)
  );

  if (items.length === 0) return null;

  return (
    <nav aria-label="Your sections" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="flex items-center gap-2.5 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-accent hover:bg-surface-hover"
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
