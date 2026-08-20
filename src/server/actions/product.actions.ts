"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PERMISSIONS } from "@/lib/constants";
import { categorySchema, productSchema } from "@/lib/validations/product";
import { assertCan, getCurrentUser } from "@/server/auth-context";
import {
  AUDIT_ACTIONS,
  diffFields,
  recordAudit,
} from "@/server/services/audit.service";
import {
  NotFoundError,
  ValidationError,
} from "@/server/services/errors";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

/** Empty optional form fields arrive as "" and must be stored as NULL. */
function nullIfBlank(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function createProductAction(
  input: unknown
): Promise<ActionResult<{ productId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.PRODUCTS_CREATE);

    const data = productSchema.parse(input);
    if (data.sellingPrice < data.costPrice) {
      throw new ValidationError(
        "Selling price is below cost price. Adjust the prices or confirm this is intentional."
      );
    }

    try {
      const product = await prisma.product.create({
        data: {
          name: data.name.trim(),
          sku: data.sku.trim().toUpperCase(),
          categoryId: nullIfBlank(data.categoryId),
          description: nullIfBlank(data.description),
          costPrice: new Prisma.Decimal(data.costPrice),
          sellingPrice: new Prisma.Decimal(data.sellingPrice),
          lowStockThreshold: data.lowStockThreshold,
          imageUrl: nullIfBlank(data.imageUrl),
        },
        select: { id: true, sku: true },
      });

      await recordAudit({
        userId: user.id,
        action: AUDIT_ACTIONS.PRODUCT_CREATED,
        entityType: "product",
        entityId: product.id,
        details: { name: data.name, sku: product.sku },
      });

      revalidatePath("/products");
      return { productId: product.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ValidationError(
          `SKU "${data.sku.trim().toUpperCase()}" is already used by another product.`
        );
      }
      throw error;
    }
  });
}

const updateProductSchema = productSchema.extend({
  id: z.string().uuid(),
});

export async function updateProductAction(
  input: unknown
): Promise<ActionResult<{ productId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.PRODUCTS_UPDATE);

    const data = updateProductSchema.parse(input);

    const existing = await prisma.product.findUnique({
      where: { id: data.id },
      select: {
        name: true,
        sku: true,
        costPrice: true,
        sellingPrice: true,
        lowStockThreshold: true,
        categoryId: true,
      },
    });
    if (!existing) throw new NotFoundError("Product");

    const next = {
      name: data.name.trim(),
      sku: data.sku.trim().toUpperCase(),
      categoryId: nullIfBlank(data.categoryId),
      description: nullIfBlank(data.description),
      costPrice: new Prisma.Decimal(data.costPrice),
      sellingPrice: new Prisma.Decimal(data.sellingPrice),
      lowStockThreshold: data.lowStockThreshold,
      imageUrl: nullIfBlank(data.imageUrl),
    };

    try {
      await prisma.product.update({ where: { id: data.id }, data: next });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ValidationError(
          `SKU "${next.sku}" is already used by another product.`
        );
      }
      throw error;
    }

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.PRODUCT_UPDATED,
      entityType: "product",
      entityId: data.id,
      details: {
        changes: diffFields(existing, {
          name: next.name,
          sku: next.sku,
          costPrice: next.costPrice,
          sellingPrice: next.sellingPrice,
          lowStockThreshold: next.lowStockThreshold,
          categoryId: next.categoryId,
        }),
      },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${data.id}`);
    revalidatePath("/inventory");
    return { productId: data.id };
  });
}

/**
 * Products are never deleted: sale history references them and must stay
 * readable. Discontinuing hides the product from new sales instead.
 */
export async function discontinueProductAction(
  input: unknown
): Promise<ActionResult<{ productId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.PRODUCTS_DELETE);

    const { id } = z.object({ id: z.string().uuid() }).parse(input);

    const product = await prisma.product.findUnique({
      where: { id },
      select: { name: true, status: true },
    });
    if (!product) throw new NotFoundError("Product");

    const remaining = await prisma.shopInventory.aggregate({
      where: { productId: id },
      _sum: { quantity: true },
    });
    if ((remaining._sum.quantity ?? 0) > 0) {
      throw new ValidationError(
        `${product.name} still has ${remaining._sum.quantity} units in stock. Transfer or write off the stock before discontinuing it.`
      );
    }

    await prisma.product.update({
      where: { id },
      data: { status: "DISCONTINUED" },
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.PRODUCT_DISCONTINUED,
      entityType: "product",
      entityId: id,
      details: { name: product.name },
    });

    revalidatePath("/products");
    return { productId: id };
  });
}

export async function createCategoryAction(
  input: unknown
): Promise<ActionResult<{ categoryId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.CATEGORIES_MANAGE);

    const data = categorySchema.parse(input);

    try {
      const category = await prisma.category.create({
        data: {
          name: data.name.trim(),
          description: nullIfBlank(data.description),
          parentId: nullIfBlank(data.parentId),
        },
        select: { id: true },
      });

      await recordAudit({
        userId: user.id,
        action: AUDIT_ACTIONS.CATEGORY_CREATED,
        entityType: "category",
        entityId: category.id,
        details: { name: data.name },
      });

      revalidatePath("/products/categories");
      return { categoryId: category.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ValidationError(`A category named "${data.name}" already exists.`);
      }
      throw error;
    }
  });
}
