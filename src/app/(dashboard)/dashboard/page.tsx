import { PERMISSIONS } from "@/lib/constants";
import { can, getCurrentUser } from "@/server/auth-context";
import { requireCanAny } from "@/server/page-guards";
import { OwnerDashboard } from "@/components/dashboard/owner-dashboard";
import { ShopDashboard } from "@/components/dashboard/shop-dashboard";

export const metadata = { title: "Dashboard · InvSys" };
export const dynamic = "force-dynamic";

/**
 * One route, two very different jobs: an owner needs a business overview while
 * a salesperson needs to start selling. Which one renders is decided by
 * permission, not by role name.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  requireCanAny(
    user,
    [PERMISSIONS.DASHBOARD_GLOBAL_VIEW, PERMISSIONS.DASHBOARD_SHOP_VIEW],
    "/dashboard"
  );

  if (can(user, PERMISSIONS.DASHBOARD_GLOBAL_VIEW)) {
    return <OwnerDashboard firstName={user.firstName} />;
  }

  return <ShopDashboard user={user} />;
}
