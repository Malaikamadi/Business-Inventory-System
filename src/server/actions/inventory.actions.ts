"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PERMISSIONS } from "@/lib/constants";
import {
  stockAdjustmentSchema,
  stockArrivalSchema,
} from "@/lib/validations/inventory";
import {
  assertCan,
  assertShopAccess,
  getCurrentUser,
} from "@/server/auth-context";
import {
  recordStockAdjustment,
  recordStockArrival,
  recordStockTransfer,
} from "@/server/services/inventory.service";
import { AUDIT_ACTIONS, recordAudit } from "@/server/services/audit.service";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

const transferSchema = z.object({
  fromShopId: z.string().uuid("Source shop is required"),
  toShopId: z.string().uuid("Destination shop is required"),
  productId: z.string().uuid("Product is required"),
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  reason: z.string().optional(),
});

function revalidateInventory() {
  revalidatePath("/inventory");
  revalidatePath("/inventory/low-stock");
  revalidatePath("/inventory/out-of-stock");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
}

export async function recordArrivalAction(
  input: unknown
): Promise<ActionResult<{ quantityAfter: number }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.STOCK_ARRIVALS_CREATE);

    const data = stockArrivalSchema.parse(input);
    assertShopAccess(user, data.shopId);

    const result = await recordStockArrival({
      shopId: data.shopId,
      productId: data.productId,
      quantity: data.quantity,
      notes: data.notes || undefined,
      performedBy: user.id,
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.STOCK_ARRIVAL,
      entityType: "stock_movement",
      entityId: result.movementId,
      shopId: data.shopId,
      details: {
        productId: data.productId,
        quantity: data.quantity,
        quantityAfter: result.quantityAfter,
      },
    });

    revalidateInventory();
    return { quantityAfter: result.quantityAfter };
  });
}

export async function recordAdjustmentAction(
  input: unknown
): Promise<ActionResult<{ quantityAfter: number }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.STOCK_ADJUSTMENTS_CREATE);

    const data = stockAdjustmentSchema.parse(input);
    assertShopAccess(user, data.shopId);

    const result = await recordStockAdjustment({
      shopId: data.shopId,
      productId: data.productId,
      quantityChange: data.quantityChange,
      reason: data.reason,
      performedBy: user.id,
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.STOCK_ADJUSTMENT,
      entityType: "stock_movement",
      entityId: result.movementId,
      shopId: data.shopId,
      details: {
        productId: data.productId,
        quantityChange: data.quantityChange,
        quantityBefore: result.quantityBefore,
        quantityAfter: result.quantityAfter,
        reason: data.reason,
      },
    });

    revalidateInventory();
    return { quantityAfter: result.quantityAfter };
  });
}

export async function recordTransferAction(
  input: unknown
): Promise<ActionResult<{ fromQuantity: number; toQuantity: number }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.STOCK_ADJUSTMENTS_CREATE);

    const data = transferSchema.parse(input);
    assertShopAccess(user, data.fromShopId);
    assertShopAccess(user, data.toShopId);

    const result = await recordStockTransfer({
      fromShopId: data.fromShopId,
      toShopId: data.toShopId,
      productId: data.productId,
      quantity: data.quantity,
      reason: data.reason,
      performedBy: user.id,
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.STOCK_TRANSFER,
      entityType: "stock_movement",
      entityId: result.out.movementId,
      shopId: data.fromShopId,
      details: {
        productId: data.productId,
        quantity: data.quantity,
        toShopId: data.toShopId,
      },
    });

    revalidateInventory();
    return {
      fromQuantity: result.out.quantityAfter,
      toQuantity: result.in.quantityAfter,
    };
  });
}
