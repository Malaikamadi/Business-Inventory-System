import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  /** Current query string without the page parameter. */
  baseParams: URLSearchParams;
  basePath: string;
}

export function Pagination({
  page,
  totalPages,
  total,
  baseParams,
  basePath,
}: PaginationProps) {
  if (total === 0) return null;

  const href = (target: number) => {
    const params = new URLSearchParams(baseParams);
    if (target > 1) params.set("page", String(target));
    else params.delete("page");
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
      <p className="text-sm text-text-secondary">
        Page {formatNumber(page)} of {formatNumber(totalPages)} ·{" "}
        {formatNumber(total)} {total === 1 ? "record" : "records"}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={href(page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Link>
        <Link
          href={href(page + 1)}
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= totalPages && "pointer-events-none opacity-50"
          )}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
