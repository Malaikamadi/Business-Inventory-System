import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { can, getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Users · inv." };

export default async function UsersPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.USERS_VIEW, "/users");

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      lastLoginAt: true,
      role: { select: { name: true } },
      shopAssignments: {
        select: { isPrimary: true, shop: { select: { id: true, name: true } } },
      },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="who's on the team, their role, and which shops they can touch."
      >
        {can(user, PERMISSIONS.USERS_CREATE) && (
          <Button asChild>
            <Link href="/users/new">
              <Plus className="h-4 w-4" />
              Add user
            </Link>
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState
              icon={Users}
              title="nobody here yet"
              description="add staff so someone can actually ring up sales."
            />
          ) : (
            <div className="data-table-wrapper">
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="hidden px-4 py-3 font-medium md:table-cell">
                      Shops
                    </th>
                    <th className="hidden px-4 py-3 font-medium lg:table-cell">
                      Last sign-in
                    </th>
                    <th className="px-4 py-3 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-hover">
                      <td className="px-4 py-3">
                        <Link
                          href={`/users/${row.id}`}
                          className="font-medium text-text-primary hover:text-accent"
                        >
                          {row.firstName} {row.lastName}
                        </Link>
                        <p className="text-xs text-text-muted">{row.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="capitalize text-text-secondary">
                          {row.role.name}
                        </span>
                      </td>
                      <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                        {row.shopAssignments.length === 0
                          ? "All shops"
                          : row.shopAssignments
                              .map((a) => a.shop.name)
                              .join(", ")}
                      </td>
                      <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                        {row.lastLoginAt ? formatDate(row.lastLoginAt) : "Never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {row.isActive ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Deactivated</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
