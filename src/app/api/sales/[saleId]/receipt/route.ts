import { NextResponse } from "next/server";
import { PERMISSIONS } from "@/lib/constants";
import type { ReceiptData } from "@/lib/receipt";
import {
  assertCanAny,
  assertShopAccess,
  getCurrentUser,
} from "@/server/auth-context";
import { getSaleDetail } from "@/server/services/sales.queries";
import { buildReceiptPdf } from "@/server/services/receipt.service";
import { ForbiddenError, UnauthorizedError } from "@/server/services/errors";

export async function GET(
  _request: Request,
  context: { params: Promise<{ saleId: string }> }
) {
  try {
    const { saleId } = await context.params;
    const user = await getCurrentUser();
    assertCanAny(user, [
      PERMISSIONS.SALES_VIEW_ALL,
      PERMISSIONS.SALES_VIEW_ASSIGNED,
    ]);

    const sale = await getSaleDetail(saleId);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found." }, { status: 404 });
    }

    assertShopAccess(user, sale.shopId);

    const receipt: ReceiptData = {
      saleId: sale.id,
      saleNumber: sale.saleNumber,
      status: sale.status,
      createdAt: sale.createdAt,
      notes: sale.notes,
      totalAmount: Number(sale.totalAmount),
      itemsCount: sale.itemsCount,
      shop: sale.shop,
      salesperson: sale.salesperson,
      items: sale.items.map((item) => ({
        name: item.productName,
        sku: item.product?.sku ?? null,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        lineTotal: Number(item.lineTotal),
      })),
    };

    const pdf = await buildReceiptPdf(receipt);

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${sale.saleNumber}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}
