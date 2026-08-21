/**
 * Adds the manager role on an existing database without wiping sales.
 *
 * - Trims the owner role to oversight permissions
 * - Creates the manager role (or refreshes its permissions)
 * - Creates manager@invsys.com if missing and assigns them to a shop
 *
 * Prefer `npm run db:seed` when you can wipe sample data: that script
 * creates a manager and salesperson for each of the three shops.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import {
  MANAGER_PERMISSIONS,
  OWNER_PERMISSIONS,
  PERMISSIONS,
  SALESPERSON_PERMISSIONS,
} from "../src/lib/constants";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function syncRole(
  name: string,
  description: string,
  keys: readonly string[]
) {
  const role = await prisma.role.upsert({
    where: { name },
    create: { name, description, isSystem: true },
    update: { description },
  });

  const permissions = await prisma.permission.findMany({
    where: { key: { in: [...keys] } },
    select: { id: true, key: true },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId: role.id,
      permissionId: permission.id,
    })),
  });

  return role;
}

async function main() {
  // New permission rows are created by seed; this script only rewires roles.
  const known = await prisma.permission.count({
    where: { key: PERMISSIONS.DASHBOARD_GLOBAL_VIEW },
  });
  if (known === 0) {
    throw new Error("Run `npm run db:seed` once before applying role changes.");
  }

  const ownerRole = await syncRole(
    "owner",
    "Business owner. Sees shop performance, stock arrivals, and sales by staff.",
    OWNER_PERMISSIONS
  );
  const managerRole = await syncRole(
    "manager",
    "Shop manager. Catalog, arrivals, and stock for the assigned shop.",
    MANAGER_PERMISSIONS
  );

  await syncRole(
    "salesperson",
    "Salesperson with shop-level access. Records sales; does not see revenue or sales history.",
    SALESPERSON_PERMISSIONS
  );

  const passwordHash = await bcrypt.hash("password123", 10);

  const pharmacyShop =
    (await prisma.shop.findFirst({
      where: { name: { contains: "Pharmacy", mode: "insensitive" } },
      select: { id: true, name: true },
    })) ??
    (await prisma.shop.findFirst({
      select: { id: true, name: true },
    }));

  const existingManager = await prisma.user.findUnique({
    where: { email: "manager@invsys.com" },
    select: { id: true },
  });

  const managerId = existingManager
    ? (
        await prisma.user.update({
          where: { id: existingManager.id },
          data: { roleId: managerRole.id },
          select: { id: true },
        })
      ).id
    : (
        await prisma.user.create({
          data: {
            email: "manager@invsys.com",
            passwordHash,
            firstName: "Isata",
            lastName: "Koroma",
            phone: "+232 76 100 005",
            roleId: managerRole.id,
          },
          select: { id: true },
        })
      ).id;

  console.log(
    existingManager
      ? "Updated manager@invsys.com onto the manager role"
      : "Created manager@invsys.com"
  );

  if (pharmacyShop) {
    await prisma.userShopAssignment.deleteMany({ where: { userId: managerId } });
    await prisma.userShopAssignment.create({
      data: { userId: managerId, shopId: pharmacyShop.id, isPrimary: true },
    });
    console.log(`Assigned manager@invsys.com to ${pharmacyShop.name}.`);
  } else {
    console.log("No shop found to assign the manager. Create a shop, then re-run.");
  }

  await prisma.user.updateMany({
    where: { email: "admin@invsys.com" },
    data: { roleId: ownerRole.id },
  });

  console.log("Owner (admin@invsys.com) now has oversight permissions.");
  console.log("Salespeople can record sales but cannot open sales history or reports.");
  console.log("Sign out and back in so sessions pick up the new permissions.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
