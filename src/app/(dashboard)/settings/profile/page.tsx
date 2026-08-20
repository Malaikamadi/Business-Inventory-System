import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { getCurrentUser } from "@/server/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";

export const metadata = { title: "Profile · inv." };

export default async function ProfilePage() {
  const user = await getCurrentUser();

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      lastLoginAt: true,
      role: { select: { name: true } },
      shopAssignments: {
        select: { isPrimary: true, shop: { select: { id: true, name: true } } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Your profile"
        description="Your account details and access."
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-text-secondary">Name</dt>
              <dd className="mt-0.5 font-medium">
                {profile?.firstName} {profile?.lastName}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Email</dt>
              <dd className="mt-0.5 font-medium">{profile?.email}</dd>
            </div>
            <div>
              <dt className="text-text-secondary">Role</dt>
              <dd className="mt-0.5 font-medium capitalize">
                {profile?.role.name}
              </dd>
            </div>
            <div>
              <dt className="text-text-secondary">Last sign-in</dt>
              <dd className="mt-0.5 font-medium">
                {profile?.lastLoginAt
                  ? formatDateTime(profile.lastLoginAt)
                  : "First session"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-text-secondary">Shop access</dt>
              <dd className="mt-1.5 flex flex-wrap gap-2">
                {!profile || profile.shopAssignments.length === 0 ? (
                  <Badge variant="outline">All shops</Badge>
                ) : (
                  profile.shopAssignments.map((assignment) => (
                    <Badge
                      key={assignment.shop.id}
                      variant={assignment.isPrimary ? "default" : "outline"}
                    >
                      {assignment.shop.name}
                      {assignment.isPrimary && " · primary"}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-text-muted">
            Contact the business owner to change your name, role or shop access.
          </p>
        </CardContent>
      </Card>

      <ChangePasswordForm />
    </div>
  );
}
