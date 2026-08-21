"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Recharts measures its parent on first paint. During SSR that parent has no
 * width, which throws in production. Wait until the browser has laid out.
 */
export function ClientChartFrame({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        style={{ height }}
        className="rounded-md bg-surface-hover/50"
        aria-hidden
      />
    );
  }

  return <>{children}</>;
}
