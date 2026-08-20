import Link from "next/link";
import { Lock } from "lucide-react";

import { sectionForPath } from "@/lib/route-access";
import { getCurrentUser } from "@/server/auth-context";
import { navItemsFor } from "@/components/layout/nav-items";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "No access · InvSys" };

/**
 * Shown when someone opens a page their role does not include.
 *
 * This exists because the alternative — quietly redirecting to the dashboard —
 * is indistinguishable from a broken link. Being refused is a normal outcome in
 * a role-based system, so it is stated plainly and paired with the sections the
 * viewer can actually open.
 */
export default async function NoAccessPage(props: {
  searchParams: Promise<{ from?: string }>;
}) {
  const user = await getCurrentUser();
  const { from } = await props.searchParams;

  const section = from ? sectionForPath(from) : null;
  const available = navItemsFor(user.permissions).filter(
    (item) => item.href !== "/dashboard"
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-text-muted">
            <Lock className="h-5 w-5" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-text-primary">
              {section
                ? `${section} is not part of your role`
                : "That page is not part of your role"}
            </h1>
            <p className="text-sm text-text-secondary">
              You are signed in as {user.firstName} {user.lastName}, and this
              section is limited to staff with wider access. Nothing went wrong
              — ask the owner if you need it opened up.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block text-sm font-medium text-accent hover:underline"
          >
            Back to dashboard
          </Link>
        </CardContent>
      </Card>

      {available.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-sm font-semibold text-text-primary">
              What you can open
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {available.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent hover:text-text-primary"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
