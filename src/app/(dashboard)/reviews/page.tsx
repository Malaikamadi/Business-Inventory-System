import { ShieldAlert } from "lucide-react";
import { PERMISSIONS } from "@/lib/constants";
import { getCurrentUser } from "@/server/auth-context";
import { requireCan } from "@/server/page-guards";
import { listActivityReviews } from "@/server/services/review.service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ReviewQueue } from "@/components/review/review-queue";

export const metadata = { title: "Reviews · InvSys" };

export default async function ReviewsPage() {
  const user = await getCurrentUser();
  requireCan(user, PERMISSIONS.AUDIT_VIEW, "/reviews");

  const items = await listActivityReviews({ limit: 60 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity review"
        description="Patterns that often need a second look: repeated voids, large or after-hours stock changes, and shops well below their usual sales."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Nothing to review"
          description="No unusual voids, stock adjustments, or sales drops were found in the recent window."
        />
      ) : (
        <ReviewQueue items={items} heading="Flagged activity" />
      )}
    </div>
  );
}
