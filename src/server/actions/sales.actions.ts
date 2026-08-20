"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/constants";
import { saleSchema } from "@/lib/validations/sale";
import {
  assertCan,
  getCurrentUser,
  resolveWriteShop,
} from "@/server/auth-context";
import { recordSale, voidSale } from "@/server/services/sales.service";
import { AUDIT_ACTIONS, recordAudit } from "@/server/services/audit.service";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

const voidSaleSchema = z.object({
  saleId: z.string().uuid(),
  reason: z.string().trim().min(5, "Please give a reason of at least 5 characters."),
});

export async function createSaleAction(
  input: unknown
): Promise<ActionResult<{ saleId: string; saleNumber: string; totalAmount: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.SALES_CREATE);

    const data = saleSchema.parse(input);
    const shopId = resolveWriteShop(user, data.shopId);

    const result = await recordSale({
      shopId,
      salespersonId: user.id,
      items: data.items,
      notes: data.notes,
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.SALE_RECORDED,
      entityType: "sale",
      entityId: result.saleId,
      shopId,
      details: {
        saleNumber: result.saleNumber,
        totalAmount: result.totalAmount,
        itemsCount: result.itemsCount,
      },
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return {
      saleId: result.saleId,
      saleNumber: result.saleNumber,
      totalAmount: result.totalAmount,
    };
  });
}

export async function voidSaleAction(
  input: unknown
): Promise<ActionResult<{ saleNumber: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.SALES_VOID);

    const data = voidSaleSchema.parse(input);
    const result = await voidSale({
      saleId: data.saleId,
      reason: data.reason,
      performedBy: user.id,
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.SALE_VOIDED,
      entityType: "sale",
      entityId: data.saleId,
      details: { saleNumber: result.saleNumber, reason: data.reason },
    });

    revalidatePath("/sales");
    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return result;
  });
}
