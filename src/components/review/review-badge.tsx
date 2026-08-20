import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export function ReviewBadge({
  label = "Review recommended",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-warning-light px-2 py-0.5 text-[11px] font-medium text-warning-foreground",
        className
      )}
    >
      <ShieldAlert className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}
