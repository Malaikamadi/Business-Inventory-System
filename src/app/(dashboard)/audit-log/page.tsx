import { ClipboardList } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { assertCan, getCurrentUser } from "@/server/auth-context";
import { listAuditLogs } from "@/server/services/audit.service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Audit log · InvSys" };

const ACTION_LABELS: Record<string, string> = {
  "login.success": "Signed in",
  "login.failed": "Failed sign-in",
  "product.created": "Product created",
  "product.updated": "Product updated",
  "product.discontinued": "Product discontinued",
  "category.created": "Category created",
  "shop.created": "Shop created",
  "shop.updated": "Shop updated",
  "user.created": "User created",
  "user.updated": "User updated",
  "user.deactivated": "User activation changed",
  "stock.arrival": "Stock arrival",
  "stock.adjustment": "Stock adjustment",
  "stock.transfer": "Stock transfer",
  "sale.recorded": "Sale recorded",
  "sale.voided": "Sale voided",
};

/** Renders the JSON detail blob as readable lines rather than raw JSON. */
function summarise(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;

  const record = details as Record<string, unknown>;

  if (record.changes && typeof record.changes === "object") {
    const changes = record.changes as Record<
      string,
      { from: string | null; to: string | null }
    >;
    const entries = Object.entries(changes);
    if (entries.length === 0) return "No field changes";
    return entries
      .map(([field, change]) => `${field}: ${change.from ?? "—"} → ${change.to ?? "—"}`)
      .join(", ");
  }

  const parts = Object.entries(record)
    .filter(([, value]) => value !== null && typeof value !== "object")
    .map(([key, value]) => `${key}: ${value}`);

  return parts.length > 0 ? parts.join(", ") : null;
}

export default async function AuditLogPage(props: {
  searchParams: Promise<{ action?: string; page?: string }>;
}) {
  const user = await getCurrentUser();
  assertCan(user, PERMISSIONS.AUDIT_VIEW);

  const params = await props.searchParams;
  const result = await listAuditLogs({
    action: params.action,
    page: Number(params.page) || 1,
  });

  const query = new URLSearchParams();
  if (params.action) query.set("action", params.action);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        description="Who did what, and when. Stock quantity changes are recorded separately in the movement ledger."
      />

      <Card>
        <CardContent className="p-0">
          {result.data.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No audit entries"
              description="Administrative actions such as product edits, stock adjustments and user changes will appear here."
            />
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">When</th>
                      <th className="px-4 py-3 font-medium">Who</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                      <th className="hidden px-4 py-3 font-medium lg:table-cell">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.data.map((entry) => {
                      const summary = summarise(entry.details);

                      return (
                        <tr key={entry.id} className="hover:bg-surface-hover">
                          <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                            {formatDateTime(entry.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            {entry.user ? (
                              <>
                                <p className="font-medium text-text-primary">
                                  {entry.user.firstName} {entry.user.lastName}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {entry.ipAddress ?? "unknown IP"}
                                </p>
                              </>
                            ) : (
                              <span className="text-text-muted">System</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-text-primary">
                              {ACTION_LABELS[entry.action] ?? entry.action}
                            </span>
                            {entry.shop && (
                              <p className="text-xs text-text-muted">
                                {entry.shop.name}
                              </p>
                            )}
                          </td>
                          <td className="hidden max-w-md px-4 py-3 text-text-secondary lg:table-cell">
                            {summary ? (
                              <span className="line-clamp-2 text-xs">
                                {summary}
                              </span>
                            ) : (
                              <span className="text-text-muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={result.page}
                totalPages={result.totalPages}
                total={result.total}
                baseParams={query}
                basePath="/audit-log"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
