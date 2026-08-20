import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";

export const metadata = { title: "Add user · inv." };

export default async function NewUserPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.USERS_CREATE, "/users/new");

  const [roles, shops] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <PageHeader
        title="Add user"
        description="Create a staff account and choose which shops it can access."
      />

      <UserForm roles={roles} shops={shops} />
    </div>
  );
}
