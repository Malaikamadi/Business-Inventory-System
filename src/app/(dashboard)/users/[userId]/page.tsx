import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { startOfBusinessMonth } from "@/lib/dates";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import { can, getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleUserActive } from "@/components/users/toggle-user-active";

export const metadata = { title: "User · inv." };

export default async function UserDetailPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;
  const actor = await getCurrentUser();
  requireCan(actor, PERMISSIONS.USERS_VIEW, `/users/${userId}`);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      role: { select: { name: true } },
      shopAssignments: {
        select: { isPrimary: true, shop: { select: { id: true, name: true } } },
      },
    },
  });

  if (!target) notFound();

  const monthStart = startOfBusinessMonth();
  const performance = await prisma.sale.aggregate({
    where: {
      salespersonId: userId,
      status: "COMPLETED",
      createdAt: { gte: monthStart },
    },
    _sum: { totalAmount: true },
    _count: true,
  });

  return (
    <div className="space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <PageHeader
        title={`${target.firstName} ${target.lastName}`}
        description={target.email}
      >
        {!target.isActive && <Badge variant="secondary">Deactivated</Badge>}
        {can(actor, PERMISSIONS.USERS_UPDATE) && (
          <Button asChild variant="outline">
            <Link href={`/users/${target.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
          </Button>
        )}
        {can(actor, PERMISSIONS.USERS_DEACTIVATE) && actor.id !== target.id && (
          <ToggleUserActive userId={target.id} isActive={target.isActive} />
        )}
      </PageHeader>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-text-secondary">Role</dt>
                <dd className="mt-0.5 font-medium capitalize">
                  {target.role.name}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">Phone</dt>
                <dd className="mt-0.5 font-medium">{target.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-text-secondary">Last sign-in</dt>
                <dd className="mt-0.5 font-medium">
                  {target.lastLoginAt
                    ? formatDateTime(target.lastLoginAt)
                    : "Never"}
                </dd>
              </div>
              <div>
                <dt className="text-text-secondary">Account created</dt>
                <dd className="mt-0.5 font-medium">
                  {formatDateTime(target.createdAt)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-text-secondary">Shop access</dt>
                <dd className="mt-1.5 flex flex-wrap gap-2">
                  {target.shopAssignments.length === 0 ? (
                    <Badge variant="outline">All shops</Badge>
                  ) : (
                    target.shopAssignments.map((assignment) => (
                      <Link
                        key={assignment.shop.id}
                        href={`/shops/${assignment.shop.id}`}
                      >
                        <Badge
                          variant={assignment.isPrimary ? "default" : "outline"}
                        >
                          {assignment.shop.name}
                          {assignment.isPrimary && " · primary"}
                        </Badge>
                      </Link>
                    ))
                  )}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales this month</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Revenue</dt>
                <dd className="font-semibold tabular-nums">
                  {formatCurrency(Number(performance._sum.totalAmount ?? 0))}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-text-secondary">Sales recorded</dt>
                <dd className="font-semibold tabular-nums">
                  {formatNumber(performance._count)}
                </dd>
              </div>
            </dl>
            <Link
              href={`/sales?user=${target.id}`}
              className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
            >
              View their sales
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
