import { Badge } from "@/components/ui/badge";
import { getStockStatus, getStockStatusLabel, type StockStatus } from "@/lib/utils";

interface StatusBadgeProps {
  quantity: number;
  threshold: number;
}

export function StockStatusBadge({ quantity, threshold }: StatusBadgeProps) {
  const status = getStockStatus(quantity, threshold);
  const label = getStockStatusLabel(status);
  const variant = statusToVariant(status);

  return <Badge variant={variant}>{label}</Badge>;
}

interface GenericStatusBadgeProps {
  status: string;
  variant?: "default" | "success" | "warning" | "danger" | "secondary" | "outline";
}

export function StatusBadge({ status, variant = "default" }: GenericStatusBadgeProps) {
  return <Badge variant={variant}>{status}</Badge>;
}

function statusToVariant(status: StockStatus) {
  switch (status) {
    case "IN_STOCK":
      return "success" as const;
    case "LOW_STOCK":
      return "warning" as const;
    case "OUT_OF_STOCK":
      return "danger" as const;
  }
}
