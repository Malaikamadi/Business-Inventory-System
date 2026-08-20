import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReviewBadge } from "./review-badge";
import type { ReviewItem } from "@/server/services/review.service";

export function ReviewQueue({
  items,
  heading = "Review recommended",
}: {
  items: ReviewItem[];
  heading?: string;
}) {
  if (items.length === 0) return null;

  return (
    <Card className="border-warning/40">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-warning-foreground">
          <ShieldAlert className="h-4 w-4" />
          {heading}
        </CardTitle>
        <ReviewBadge label={`${items.length} to check`} />
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block px-6 py-3 hover:bg-surface-hover"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">
                      {item.title}
                    </p>
                    <p className="mt-0.5 text-sm text-text-secondary">
                      {item.description}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {formatDateTime(item.occurredAt)}
                      {item.shopName ? ` · ${item.shopName}` : ""}
                      {item.actorName ? ` · ${item.actorName}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-warning-foreground">
                    {item.severity === "high" ? "High" : "Check"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
