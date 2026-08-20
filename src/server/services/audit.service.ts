import { headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";

/**
 * Security and administrative audit trail.
 *
 * Inventory changes are already traceable through `stock_movements`; this log
 * captures authentication and configuration changes that leave no other record.
 */

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "login.success",
  LOGIN_FAILED: "login.failed",
  PRODUCT_CREATED: "product.created",
  PRODUCT_UPDATED: "product.updated",
  PRODUCT_DISCONTINUED: "product.discontinued",
  CATEGORY_CREATED: "category.created",
  CATEGORY_UPDATED: "category.updated",
  SHOP_CREATED: "shop.created",
  SHOP_UPDATED: "shop.updated",
  USER_CREATED: "user.created",
  USER_UPDATED: "user.updated",
  USER_DEACTIVATED: "user.deactivated",
  USER_SHOPS_CHANGED: "user.shops_changed",
  STOCK_ARRIVAL: "stock.arrival",
  STOCK_ADJUSTMENT: "stock.adjustment",
  STOCK_TRANSFER: "stock.transfer",
  SALE_RECORDED: "sale.recorded",
  SALE_VOIDED: "sale.voided",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

interface AuditInput {
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  shopId?: string;
  details?: Prisma.InputJsonValue;
}

async function requestContext() {
  try {
    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for");
    return {
      ipAddress: forwarded?.split(",")[0]?.trim() ?? null,
      userAgent: headerList.get("user-agent"),
    };
  } catch {
    // Outside a request scope (scripts, background jobs).
    return { ipAddress: null, userAgent: null };
  }
}

/**
 * Writes an audit entry. Never throws: a failure to log must not roll back the
 * business operation that succeeded, but it is surfaced in server logs.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const { ipAddress, userAgent } = await requestContext();
    await prisma.auditLog.create({
      data: {
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        shopId: input.shopId,
        details: input.details,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    console.error("[audit] failed to write entry", input.action, error);
  }
}

/**
 * Reduces a before/after pair to only the fields that actually changed, so the
 * log answers "what changed" without storing whole record snapshots.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, next] of Object.entries(after)) {
    const previous = before[key];
    if (String(previous) !== String(next)) {
      changes[key] = { from: previous ?? null, to: next ?? null };
    }
  }
  return changes;
}

export async function listAuditLogs(query: {
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

  const where: Prisma.AuditLogWhereInput = {
    ...(query.action ? { action: query.action } : {}),
    ...(query.entityType ? { entityType: query.entityType } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        details: true,
        ipAddress: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true, email: true } },
        shop: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
