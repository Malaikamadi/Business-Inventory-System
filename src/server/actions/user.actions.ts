"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PERMISSIONS, ROLES, isBusinessWideRole } from "@/lib/constants";
import { createUserSchema, updateUserSchema } from "@/lib/validations/user";
import { assertCan, getCurrentUser } from "@/server/auth-context";
import {
  AUDIT_ACTIONS,
  diffFields,
  recordAudit,
} from "@/server/services/audit.service";
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/server/services/errors";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

const PASSWORD_COST = 12;

/**
 * A salesperson is meaningless without a shop. Owner and manager see every
 * branch, so they must not be pinned to one.
 */
async function resolveShopAssignments(
  roleId: string,
  shopIds: string[] | undefined,
  primaryShopId: string | undefined
) {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { name: true },
  });
  if (!role) throw new NotFoundError("Role");

  if (isBusinessWideRole(role.name)) return { role, assignments: [] };

  const shops = shopIds?.filter(Boolean) ?? [];
  if (shops.length === 0) {
    throw new ValidationError("Assign this user to at least one shop.");
  }

  const primary =
    primaryShopId && shops.includes(primaryShopId) ? primaryShopId : shops[0];

  const existing = await prisma.shop.count({ where: { id: { in: shops } } });
  if (existing !== shops.length) throw new NotFoundError("Shop");

  return {
    role,
    assignments: shops.map((shopId) => ({
      shopId,
      isPrimary: shopId === primary,
    })),
  };
}

export async function createUserAction(
  input: unknown
): Promise<ActionResult<{ userId: string }>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    assertCan(user, PERMISSIONS.USERS_CREATE);

    const data = createUserSchema.parse(input);
    const { role, assignments } = await resolveShopAssignments(
      data.roleId,
      data.shopIds,
      data.primaryShopId || undefined
    );

    try {
      const created = await prisma.user.create({
        data: {
          email: data.email.trim().toLowerCase(),
          passwordHash: await bcrypt.hash(data.password, PASSWORD_COST),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || null,
          roleId: data.roleId,
          shopAssignments: { create: assignments },
        },
        select: { id: true },
      });

      await recordAudit({
        userId: user.id,
        action: AUDIT_ACTIONS.USER_CREATED,
        entityType: "user",
        entityId: created.id,
        details: {
          email: data.email,
          role: role.name,
          shopIds: assignments.map((a) => a.shopId),
        },
      });

      revalidatePath("/users");
      return { userId: created.id };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ValidationError("An account with that email already exists.");
      }
      throw error;
    }
  });
}

const updateSchema = updateUserSchema.extend({ id: z.string().uuid() });

export async function updateUserAction(
  input: unknown
): Promise<ActionResult<{ userId: string }>> {
  return runAction(async () => {
    const actor = await getCurrentUser();
    assertCan(actor, PERMISSIONS.USERS_UPDATE);

    const data = updateSchema.parse(input);

    const existing = await prisma.user.findUnique({
      where: { id: data.id },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roleId: true,
        role: { select: { name: true } },
      },
    });
    if (!existing) throw new NotFoundError("User");

    // Removing your own admin rights would lock you out mid-session.
    if (data.id === actor.id && data.roleId !== existing.roleId) {
      throw new ForbiddenError("You cannot change your own role.");
    }

    const { role, assignments } = await resolveShopAssignments(
      data.roleId,
      data.shopIds,
      data.primaryShopId || undefined
    );

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: data.id },
        data: {
          email: data.email.trim().toLowerCase(),
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone: data.phone?.trim() || null,
          roleId: data.roleId,
          ...(data.password
            ? { passwordHash: await bcrypt.hash(data.password, PASSWORD_COST) }
            : {}),
        },
      });

      await tx.userShopAssignment.deleteMany({ where: { userId: data.id } });
      if (assignments.length > 0) {
        await tx.userShopAssignment.createMany({
          data: assignments.map((a) => ({ ...a, userId: data.id })),
        });
      }
    });

    await recordAudit({
      userId: actor.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: "user",
      entityId: data.id,
      details: {
        changes: diffFields(
          { ...existing, roleName: existing.role.name },
          {
            email: data.email,
            firstName: data.firstName,
            lastName: data.lastName,
            roleName: role.name,
          }
        ),
        passwordReset: Boolean(data.password),
        shopIds: assignments.map((a) => a.shopId),
      },
    });

    revalidatePath("/users");
    revalidatePath(`/users/${data.id}`);
    return { userId: data.id };
  });
}

/**
 * Accounts are deactivated rather than deleted so their sales and stock
 * movements keep a valid actor.
 */
export async function setUserActiveAction(
  input: unknown
): Promise<ActionResult<{ userId: string }>> {
  return runAction(async () => {
    const actor = await getCurrentUser();
    assertCan(actor, PERMISSIONS.USERS_DEACTIVATE);

    const data = z
      .object({ id: z.string().uuid(), isActive: z.boolean() })
      .parse(input);

    if (data.id === actor.id && !data.isActive) {
      throw new ForbiddenError("You cannot deactivate your own account.");
    }

    const target = await prisma.user.findUnique({
      where: { id: data.id },
      select: { email: true, role: { select: { name: true } } },
    });
    if (!target) throw new NotFoundError("User");

    // The business must always retain at least one account that can administer it.
    if (!data.isActive && target.role.name === ROLES.OWNER) {
      const activeOwners = await prisma.user.count({
        where: { isActive: true, role: { name: ROLES.OWNER } },
      });
      if (activeOwners <= 1) {
        throw new ValidationError(
          "This is the only active owner account. Create another owner before deactivating this one."
        );
      }
    }

    await prisma.user.update({
      where: { id: data.id },
      data: { isActive: data.isActive },
    });

    await recordAudit({
      userId: actor.id,
      action: AUDIT_ACTIONS.USER_DEACTIVATED,
      entityType: "user",
      entityId: data.id,
      details: { email: target.email, isActive: data.isActive },
    });

    revalidatePath("/users");
    return { userId: data.id };
  });
}
