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
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-primary bg-accent shadow-[4px_4px_0_0_#121212]">
        <AlertTriangle className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-1 font-display text-2xl font-bold text-text-primary">
        this page glitched
      </h1>
      <p className="mb-6 max-w-md text-sm text-text-secondary">
        something went sideways loading this. hit try again — if it keeps
        happening, ping the owner.
      </p>
      {error.digest && (
        <p className="mb-6 font-mono text-xs text-text-muted">
          Reference: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset}>try again</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">take me home</Link>
        </Button>
      </div>
    </div>
  );
}
