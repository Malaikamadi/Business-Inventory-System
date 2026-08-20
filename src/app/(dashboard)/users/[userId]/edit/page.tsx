import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";

export const metadata = { title: "Edit user · inv." };

export default async function EditUserPage(props: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await props.params;
  const actor = await getCurrentUser();
  requireCan(actor, PERMISSIONS.USERS_UPDATE, `/users/${userId}/edit`);

  const [target, roles, shops] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        roleId: true,
        shopAssignments: { select: { shopId: true, isPrimary: true } },
      },
    }),
    prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.shop.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!target) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/users/${target.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {target.firstName} {target.lastName}
      </Link>

      <PageHeader
        title="Edit user"
        description="Change their details, role, or shop access."
      />

      <UserForm
        roles={roles}
        shops={shops}
        initialValues={{
          id: target.id,
          email: target.email,
          password: "",
          firstName: target.firstName,
          lastName: target.lastName,
          phone: target.phone ?? "",
          roleId: target.roleId,
          shopIds: target.shopAssignments.map((a) => a.shopId),
          primaryShopId:
            target.shopAssignments.find((a) => a.isPrimary)?.shopId ?? "",
        }}
      />
    </div>
  );
}
