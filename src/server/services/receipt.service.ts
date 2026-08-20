import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { BUSINESS_NAME, BUSINESS_PHONE } from "@/lib/business";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { ReceiptData } from "@/lib/receipt";

/** Helvetica is WinAnsi-only; currency locales often insert narrow spaces. */
function winAnsi(text: string): string {
  return text.replace(/[^\u0020-\u007E]/g, (ch) => {
    if (ch === "\u00A0" || ch === "\u202F" || ch === "\u2009" || ch === "\u200A") {
      return " ";
    }
    return "";
  });
}

export async function buildReceiptPdf(receipt: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.12, 0.16, 0.23);
  const muted = rgb(0.4, 0.45, 0.52);
  const rule = rgb(0.89, 0.91, 0.94);

  let y = 800;
  const left = 48;
  const right = 547;

  const write = (
    text: string,
    x: number,
    size: number,
    face = font,
    color = ink
  ) => {
    page.drawText(winAnsi(text), { x, y, size, font: face, color });
  };

  write(BUSINESS_NAME, left, 18, bold);
  y -= 18;
  write(receipt.shop.name, left, 11, font, muted);
  y -= 14;
  if (receipt.shop.address) {
    write(receipt.shop.address, left, 10, font, muted);
    y -= 13;
  } else if (receipt.shop.location) {
    write(receipt.shop.location, left, 10, font, muted);
    y -= 13;
  }
  const phone = receipt.shop.phone || BUSINESS_PHONE;
  if (phone) {
    write(phone, left, 10, font, muted);
    y -= 13;
  }

  y -= 8;
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: rule,
  });
  y -= 22;

  write(`Receipt ${receipt.saleNumber}`, left, 14, bold);
  if (receipt.status === "VOIDED") {
    write("VOIDED", right - 60, 12, bold, rgb(0.72, 0.11, 0.11));
  }
  y -= 16;
  write(formatDateTime(receipt.createdAt), left, 10, font, muted);
  y -= 14;
  write(
    `Served by ${receipt.salesperson.firstName} ${receipt.salesperson.lastName}`,
    left,
    10,
    font,
    muted
  );
  y -= 22;

  write("Item", left, 9, bold, muted);
  write("Qty", 340, 9, bold, muted);
  write("Price", 400, 9, bold, muted);
  write("Amount", 490, 9, bold, muted);
  y -= 8;
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 0.5,
    color: rule,
  });
  y -= 16;

  for (const item of receipt.items) {
    const name =
      item.name.length > 40 ? `${item.name.slice(0, 37)}...` : item.name;
    write(name, left, 10, font);
    write(String(item.quantity), 340, 10, font);
    write(formatCurrency(item.unitPrice), 400, 10, font);
    write(formatCurrency(item.lineTotal), 490, 10, bold);
    y -= 14;
    if (item.sku) {
      write(item.sku, left, 8, font, muted);
      y -= 12;
    }
    if (y < 80) break;
  }

  y -= 6;
  page.drawLine({
    start: { x: left, y },
    end: { x: right, y },
    thickness: 1,
    color: rule,
  });
  y -= 22;
  write("Total", 400, 12, bold);
  write(formatCurrency(receipt.totalAmount), 490, 12, bold);

  if (receipt.notes) {
    y -= 28;
    write("Notes", left, 9, bold, muted);
    y -= 13;
    write(receipt.notes.slice(0, 90), left, 10, font);
  }

  page.drawText(winAnsi("Thank you for your custom."), {
    x: left,
    y: 48,
    size: 10,
    font,
    color: muted,
  });

  return doc.save();
}
