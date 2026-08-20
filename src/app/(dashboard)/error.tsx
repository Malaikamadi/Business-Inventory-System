"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Safety net for render failures. The route guard turns away unauthorized
 * requests before a page runs, so anything reaching here is unexpected — the
 * message is deliberately generic because React strips error details in
 * production builds and internals should not be shown regardless.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] render failed", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-danger-light">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>
      <h1 className="mb-1 text-lg font-semibold text-text-primary">
        This page could not be loaded
      </h1>
      <p className="mb-6 max-w-md text-sm text-text-secondary">
        Something went wrong while loading this page. Try again, and if the
        problem continues let the business owner know.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-text-muted">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
