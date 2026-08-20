"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { shopSchema } from "@/lib/validations/shop";
import { assertCan, getCurrentUser } from "@/server/auth-context";
import {
  AUDIT_ACTIONS,
  diffFields,
  recordAudit,
} from "@/server/services/audit.service";
import { NotFoundError, ValidationError } from "@/server/services/errors";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

function nullIfBlank(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createShopAction(
  input: unknown
): Promise<ActionResult<{ shopId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.SHOPS_CREATE);

    const data = shopSchema.parse(input);

    const shop = await prisma.shop.create({
      data: {
        name: data.name.trim(),
        location: nullIfBlank(data.location),
        address: nullIfBlank(data.address),
        phone: nullIfBlank(data.phone),
        email: nullIfBlank(data.email),
      },
      select: { id: true },
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.SHOP_CREATED,
      entityType: "shop",
      entityId: shop.id,
      shopId: shop.id,
      details: { name: data.name },
    });

    revalidatePath("/shops");
    return { shopId: shop.id };
  });
}

const updateShopSchema = shopSchema.extend({
  id: z.string().uuid(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
});

export async function updateShopAction(
  input: unknown
): Promise<ActionResult<{ shopId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.SHOPS_UPDATE);

    const data = updateShopSchema.parse(input);

    const existing = await prisma.shop.findUnique({
      where: { id: data.id },
      select: { name: true, location: true, phone: true, email: true, status: true },
    });
    if (!existing) throw new NotFoundError("Shop");

    // Deactivating a shop hides it from operations, so any stock left there
    // would silently disappear from business totals.
    if (data.status === "INACTIVE" && existing.status === "ACTIVE") {
      const remaining = await prisma.shopInventory.aggregate({
        where: { shopId: data.id },
        _sum: { quantity: true },
      });
      if ((remaining._sum.quantity ?? 0) > 0) {
        throw new ValidationError(
          `This shop still holds ${remaining._sum.quantity} units. Transfer the stock to another shop before deactivating it.`
        );
      }
    }

    const next = {
      name: data.name.trim(),
      location: nullIfBlank(data.location),
      address: nullIfBlank(data.address),
      phone: nullIfBlank(data.phone),
      email: nullIfBlank(data.email),
      ...(data.status ? { status: data.status } : {}),
    };

    await prisma.shop.update({ where: { id: data.id }, data: next });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.SHOP_UPDATED,
      entityType: "shop",
      entityId: data.id,
      shopId: data.id,
      details: { changes: diffFields(existing, next) },
    });

    revalidatePath("/shops");
    revalidatePath(`/shops/${data.id}`);
    return { shopId: data.id };
  });
}
