import Link from "next/link";
import { Lock } from "lucide-react";

import { sectionForPath } from "@/lib/route-access";
import { getCurrentUser } from "@/server/auth-context";
import { navItemsFor } from "@/components/layout/nav-items";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "No access · inv." };

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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-primary bg-accent shadow-[4px_4px_0_0_#121212]">
            <Lock className="h-5 w-5" aria-hidden />
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {section
                ? `${section} isn't your lane`
                : "that page isn't your lane"}
            </h1>
            <p className="text-sm text-text-secondary">
              you&apos;re in as {user.firstName} {user.lastName}. this bit is
              locked to another role — nothing broke. ask the owner if you
              actually need it.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-block text-sm font-medium text-accent hover:underline"
          >
            take me home
          </Link>
        </CardContent>
      </Card>

      {available.length > 0 && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="font-display text-base font-bold text-text-primary">
              your spots
            </h2>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {available.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-2xl border-2 border-primary px-3 py-2.5 text-sm font-semibold text-text-primary shadow-[3px_3px_0_0_#121212] transition-all hover:-translate-y-0.5 hover:bg-accent"
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
