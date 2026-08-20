import { BUSINESS_NAME } from "@/lib/business";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export interface ReceiptLine {
  name: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  saleId: string;
  saleNumber: string;
  status: "COMPLETED" | "VOIDED" | string;
  createdAt: Date | string;
  notes: string | null;
  totalAmount: number;
  itemsCount: number;
  shop: {
    name: string;
    location: string | null;
    address?: string | null;
    phone?: string | null;
  };
  salesperson: {
    firstName: string;
    lastName: string;
  };
  items: ReceiptLine[];
}

export function receiptShareText(receipt: ReceiptData): string {
  const lines = [
    BUSINESS_NAME,
    receipt.shop.name,
    `Receipt ${receipt.saleNumber}`,
    formatDateTime(receipt.createdAt),
    "",
    ...receipt.items.map(
      (item) =>
        `${item.quantity} × ${item.name}  ${formatCurrency(item.lineTotal)}`
    ),
    "",
    `Total: ${formatCurrency(receipt.totalAmount)}`,
  ];
  if (receipt.status === "VOIDED") {
    lines.push("", "VOIDED — this sale is cancelled.");
  }
  lines.push("", "Thank you for your custom.");
  return lines.join("\n");
}
