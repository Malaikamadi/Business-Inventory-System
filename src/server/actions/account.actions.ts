"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/auth-context";
import { AUDIT_ACTIONS, recordAudit } from "@/server/services/audit.service";
import { NotFoundError, ValidationError } from "@/server/services/errors";
import { runAction } from "./action-result";
import type { ActionResult } from "@/types";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "New password must be at least 8 characters."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The new passwords do not match.",
    path: ["confirmPassword"],
  });

/**
 * Self-service password change. Requires the current password so that a
 * momentarily unattended session cannot be used to take over the account.
 */
export async function changePasswordAction(
  input: unknown
): Promise<ActionResult<undefined>> {
  return runAction(async () => {
    const user = await getCurrentUser();
    const data = changePasswordSchema.parse(input);

    const record = await prisma.user.findUnique({
      where: { id: user.id },
      select: { passwordHash: true },
    });
    if (!record) throw new NotFoundError("User");

    const valid = await bcrypt.compare(data.currentPassword, record.passwordHash);
    if (!valid) {
      throw new ValidationError("Your current password is incorrect.");
    }

    if (data.currentPassword === data.newPassword) {
      throw new ValidationError(
        "The new password must be different from the current one."
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(data.newPassword, 12) },
    });

    await recordAudit({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_UPDATED,
      entityType: "user",
      entityId: user.id,
      details: { selfServicePasswordChange: true },
    });

    return undefined;
  });
}
