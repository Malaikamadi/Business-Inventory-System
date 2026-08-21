import { PERMISSIONS } from "@/lib/constants";
import { can, getCurrentUser } from "@/server/auth-context";
import { requireCanAny } from "@/server/page-guards";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { ShopDashboard } from "@/components/dashboard/shop-dashboard";

export const metadata = { title: "Dashboard · InvSys" };
export const dynamic = "force-dynamic";

/**
 * One route, three jobs. Permission — not the role name — decides which
 * dashboard renders: the owner watches performance, the manager runs stock
 * and staff, and a salesperson starts from the till.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  requireCanAny(
    user,
    [PERMISSIONS.DASHBOARD_GLOBAL_VIEW, PERMISSIONS.DASHBOARD_SHOP_VIEW],
    "/dashboard"
  );

  if (can(user, PERMISSIONS.STOCK_ARRIVALS_CREATE)) {
    return <ManagerDashboard firstName={user.firstName} />;
  }

  if (can(user, PERMISSIONS.DASHBOARD_GLOBAL_VIEW)) {
    return <OwnerDashboard firstName={user.firstName} />;
  }

  return <ShopDashboard user={user} />;
}
