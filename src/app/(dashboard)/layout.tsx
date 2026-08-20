import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/auth-context";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy already redirects anonymous requests; this resolves the identity
  // that the shell renders from, so nothing is drawn before it is known.
  const user = await getCurrentUser();

  const shop = user.primaryShopId
    ? await prisma.shop.findUnique({
        where: { id: user.primaryShopId },
        select: { name: true },
      })
    : null;

  return (
    <AppShell
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
      }}
      shopName={shop?.name}
    >
      {children}
    </AppShell>
  );
}
