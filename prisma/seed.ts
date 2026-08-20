import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { OWNER_PERMISSIONS, PERMISSIONS, SALESPERSON_PERMISSIONS } from "../src/lib/constants";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

/**
 * Permission rows are derived from the application's own permission list rather
 * than restated here. Keeping a second copy meant a permission could exist in
 * code while being absent from every role in the database, which fails as a
 * silent loss of access rather than an error.
 */
const DESCRIPTIONS: Record<string, string> = {
  "dashboard:global:view": "View the business-wide dashboard",
  "dashboard:shop:view": "View the dashboard for an assigned shop",
  "shops:create": "Create shops",
  "shops:update": "Update shop details",
  "shops:delete": "Delete shops",
  "shops:view:all": "View every shop",
  "shops:view:assigned": "View an assigned shop",
  "products:create": "Add products to the catalogue",
  "products:update": "Update products",
  "products:delete": "Discontinue products",
  "products:view": "View products and selling prices",
  "products:view:cost": "View cost prices, margins and stock valuation",
  "categories:manage": "Manage product categories",
  "inventory:view:all": "View inventory at every shop",
  "inventory:view:assigned": "View inventory at an assigned shop",
  "stock:arrivals:create": "Record stock arrivals",
  "stock:adjustments:create": "Make stock adjustments",
  "stock:movements:view:all": "View the movement ledger for every shop",
  "stock:movements:view:assigned": "View the movement ledger for an assigned shop",
  "sales:create": "Record sales",
  "sales:view:all": "View sales at every shop",
  "sales:view:assigned": "View sales at an assigned shop",
  "sales:void": "Void sales",
  "users:create": "Create users",
  "users:update": "Update users",
  "users:deactivate": "Deactivate users",
  "users:view": "View users",
  "reports:global": "View business-wide reports",
  "reports:shop": "View reports for an assigned shop",
  "audit:view": "View the audit log",
};

const PERMISSIONS_DATA = Object.values(PERMISSIONS).map((key) => {
  const [resource, ...rest] = key.split(":");
  return {
    key,
    resource,
    action: rest.join(":"),
    description: DESCRIPTIONS[key] ?? key,
  };
});

const SALESPERSON_PERMISSION_KEYS: string[] = SALESPERSON_PERMISSIONS;

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clean existing data ──────────────────────────────────────────
  await prisma.auditLog.deleteMany();
  await prisma.saleCounter.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.shopInventory.deleteMany();
  await prisma.userShopAssignment.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.shop.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  console.log("  ✓ Cleaned existing data");

  // ─── Permissions ──────────────────────────────────────────────────
  const permissions = await Promise.all(
    PERMISSIONS_DATA.map((p) =>
      prisma.permission.create({ data: p })
    )
  );
  console.log(`  ✓ Created ${permissions.length} permissions`);

  // ─── Roles ────────────────────────────────────────────────────────
  const ownerRole = await prisma.role.create({
    data: {
      name: "owner",
      description: "Business owner with full system access",
      isSystem: true,
      rolePermissions: {
        create: permissions
          .filter((p) =>
            OWNER_PERMISSIONS.includes(p.key as (typeof OWNER_PERMISSIONS)[number])
          )
          .map((p) => ({ permissionId: p.id })),
      },
    },
  });

  const salespersonRole = await prisma.role.create({
    data: {
      name: "salesperson",
      description: "Salesperson with shop-level access",
      isSystem: true,
      rolePermissions: {
        create: permissions
          .filter((p) => SALESPERSON_PERMISSION_KEYS.includes(p.key))
          .map((p) => ({ permissionId: p.id })),
      },
    },
  });
  console.log("  ✓ Created roles (owner, salesperson)");

  // ─── Shops ────────────────────────────────────────────────────────
  const shopA = await prisma.shop.create({
    data: {
      name: "Freetown Central",
      location: "Central Freetown",
      address: "24 Siaka Stevens Street, Freetown",
      phone: "+232 76 100 101",
      email: "central@invsys.com",
    },
  });

  const shopB = await prisma.shop.create({
    data: {
      name: "Lumley Branch",
      location: "Lumley, Freetown",
      address: "8 Lumley Beach Road, Lumley, Freetown",
      phone: "+232 76 100 102",
      email: "lumley@invsys.com",
    },
  });

  const shopC = await prisma.shop.create({
    data: {
      name: "Bo Town Branch",
      location: "Bo, Southern Province",
      address: "15 Fenton Road, Bo",
      phone: "+232 76 100 103",
      email: "bo@invsys.com",
    },
  });
  console.log("  ✓ Created 3 shops");

  // ─── Users ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@invsys.com",
      passwordHash,
      firstName: "Ram",
      lastName: "Jalloh",
      phone: "+232 76 100 001",
      roleId: ownerRole.id,
    },
  });

  const sp1 = await prisma.user.create({
    data: {
      email: "fatmata@invsys.com",
      passwordHash,
      firstName: "Fatmata",
      lastName: "Kamara",
      phone: "+232 76 100 002",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: shopA.id, isPrimary: true },
      },
    },
  });

  const sp2 = await prisma.user.create({
    data: {
      email: "mohamed@invsys.com",
      passwordHash,
      firstName: "Mohamed",
      lastName: "Sesay",
      phone: "+232 76 100 003",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: shopB.id, isPrimary: true },
      },
    },
  });

  const sp3 = await prisma.user.create({
    data: {
      email: "aminata@invsys.com",
      passwordHash,
      firstName: "Aminata",
      lastName: "Bangura",
      phone: "+232 76 100 004",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: shopC.id, isPrimary: true },
      },
    },
  });
  console.log("  ✓ Created 4 users (1 admin, 3 salespersons)");

  // ─── Categories ───────────────────────────────────────────────────
  const beverages = await prisma.category.create({
    data: { name: "Beverages", description: "Drinks and liquid refreshments" },
  });
  const snacks = await prisma.category.create({
    data: { name: "Snacks", description: "Light food items and quick bites" },
  });
  const electronics = await prisma.category.create({
    data: { name: "Electronics", description: "Electronic devices and accessories" },
  });
  const clothing = await prisma.category.create({
    data: { name: "Clothing", description: "Apparel and fashion items" },
  });
  const personalCare = await prisma.category.create({
    data: { name: "Personal Care", description: "Health and hygiene products" },
  });
  console.log("  ✓ Created 5 categories");

  // ─── Products ─────────────────────────────────────────────────────
  // Prices are in new leones (SLE) at roughly Freetown retail levels, so the
  // dashboards and reports read like real trading figures rather than the
  // single-digit amounts a dollar price list would produce.
  const products = await Promise.all([
    prisma.product.create({
      data: { name: "Coca-Cola 500ml", sku: "BEV-CC-500", categoryId: beverages.id, costPrice: 8.00, sellingPrice: 13.00, lowStockThreshold: 20, description: "Classic Coca-Cola in 500ml PET bottle" },
    }),
    prisma.product.create({
      data: { name: "Pepsi 500ml", sku: "BEV-PP-500", categoryId: beverages.id, costPrice: 8.00, sellingPrice: 13.00, lowStockThreshold: 20, description: "Pepsi cola in 500ml PET bottle" },
    }),
    prisma.product.create({
      data: { name: "Spring Water 1L", sku: "BEV-SW-1L", categoryId: beverages.id, costPrice: 3.50, sellingPrice: 6.00, lowStockThreshold: 30, description: "Natural spring water, 1 liter" },
    }),
    prisma.product.create({
      data: { name: "Orange Juice 330ml", sku: "BEV-OJ-330", categoryId: beverages.id, costPrice: 11.00, sellingPrice: 18.00, lowStockThreshold: 15, description: "Fresh orange juice, 330ml carton" },
    }),
    prisma.product.create({
      data: { name: "Lay's Classic Chips", sku: "SNK-LC-150", categoryId: snacks.id, costPrice: 13.00, sellingPrice: 22.00, lowStockThreshold: 15, description: "Lay's classic potato chips, 150g bag" },
    }),
    prisma.product.create({
      data: { name: "Pringles Original", sku: "SNK-PR-165", categoryId: snacks.id, costPrice: 32.00, sellingPrice: 55.00, lowStockThreshold: 10, description: "Pringles original flavor, 165g can" },
    }),
    prisma.product.create({
      data: { name: "Snickers Bar", sku: "SNK-SN-52", categoryId: snacks.id, costPrice: 7.50, sellingPrice: 13.00, lowStockThreshold: 25, description: "Snickers chocolate bar, 52g" },
    }),
    prisma.product.create({
      data: { name: "USB-C Cable 1m", sku: "ELC-UC-1M", categoryId: electronics.id, costPrice: 28.00, sellingPrice: 55.00, lowStockThreshold: 10, description: "USB-C charging cable, 1 meter" },
    }),
    prisma.product.create({
      data: { name: "Wireless Earbuds", sku: "ELC-WE-BT", categoryId: electronics.id, costPrice: 240.00, sellingPrice: 430.00, lowStockThreshold: 5, description: "Bluetooth wireless earbuds with case" },
    }),
    prisma.product.create({
      data: { name: "Phone Case Universal", sku: "ELC-PC-UNI", categoryId: electronics.id, costPrice: 22.00, sellingPrice: 45.00, lowStockThreshold: 10, description: "Universal silicone phone case" },
    }),
    prisma.product.create({
      data: { name: "Cotton T-Shirt Black", sku: "CLT-TS-BLK", categoryId: clothing.id, costPrice: 65.00, sellingPrice: 130.00, lowStockThreshold: 8, description: "100% cotton t-shirt, black, unisex" },
    }),
    prisma.product.create({
      data: { name: "Cotton T-Shirt White", sku: "CLT-TS-WHT", categoryId: clothing.id, costPrice: 65.00, sellingPrice: 130.00, lowStockThreshold: 8, description: "100% cotton t-shirt, white, unisex" },
    }),
    prisma.product.create({
      data: { name: "Hand Sanitizer 250ml", sku: "PC-HS-250", categoryId: personalCare.id, costPrice: 18.00, sellingPrice: 34.00, lowStockThreshold: 12, description: "Antibacterial hand sanitizer, 250ml" },
    }),
    prisma.product.create({
      data: { name: "Face Mask Box (50pc)", sku: "PC-FM-50", categoryId: personalCare.id, costPrice: 42.00, sellingPrice: 78.00, lowStockThreshold: 5, description: "Disposable face masks, box of 50" },
    }),
    prisma.product.create({
      data: { name: "Toothpaste Mint 100ml", sku: "PC-TP-100", categoryId: personalCare.id, costPrice: 16.00, sellingPrice: 29.00, lowStockThreshold: 10, description: "Mint toothpaste, 100ml tube" },
    }),
  ]);
  console.log(`  ✓ Created ${products.length} products`);

  // ─── Sales history ────────────────────────────────────────────────
  // Sales are planned before any stock is written so that opening balances can
  // be sized to end at the target levels below. Seeding stock and then selling
  // from it independently is what lets a ledger drift from its balances.
  const shops = [shopA, shopB, shopC];
  const closingLevels = [
    // Target [shopA, shopB, shopC] quantity per product after all sales.
    [45, 30, 60], // Coca-Cola
    [35, 25, 40], // Pepsi
    [80, 50, 70], // Spring Water
    [20, 15, 25], // Orange Juice
    [18, 12, 22], // Lay's
    [10, 8, 14], // Pringles
    [30, 20, 35], // Snickers
    [12, 8, 15], // USB-C Cable
    [6, 4, 7], // Wireless Earbuds
    [15, 10, 12], // Phone Case
    [5, 8, 10], // T-Shirt Black (low at Freetown Central)
    [3, 6, 12], // T-Shirt White (low at Freetown Central)
    [14, 10, 18], // Hand Sanitizer
    [4, 2, 6], // Face Masks (low at Lumley)
    [0, 8, 12], // Toothpaste (out of stock at Freetown Central)
  ];

  const salespersons = [
    { user: sp1, shop: shopA },
    { user: sp2, shop: shopB },
    { user: sp3, shop: shopC },
  ];

  interface PlannedItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    lineTotal: number;
  }
  interface PlannedSale {
    shopId: string;
    salespersonId: string;
    at: Date;
    items: PlannedItem[];
    totalAmount: number;
    totalCost: number;
  }

  const plannedSales: PlannedSale[] = [];
  const now = new Date();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    for (const { user: sp, shop } of salespersons) {
      const numSales = 2 + Math.floor(Math.random() * 3);

      for (let s = 0; s < numSales; s++) {
        const at = new Date(day);
        at.setHours(
          9 + Math.floor(Math.random() * 9),
          Math.floor(Math.random() * 60),
          0,
          0
        );

        const chosen = [...products]
          .sort(() => Math.random() - 0.5)
          .slice(0, 1 + Math.floor(Math.random() * 3));

        let totalAmount = 0;
        let totalCost = 0;
        const items: PlannedItem[] = chosen.map((product) => {
          const quantity = 1 + Math.floor(Math.random() * 3);
          const unitPrice = Number(product.sellingPrice);
          const unitCost = Number(product.costPrice);
          const lineTotal = unitPrice * quantity;
          totalAmount += lineTotal;
          totalCost += unitCost * quantity;
          return {
            productId: product.id,
            productName: product.name,
            quantity,
            unitPrice,
            unitCost,
            lineTotal,
          };
        });

        plannedSales.push({
          shopId: shop.id,
          salespersonId: sp.id,
          at,
          items,
          totalAmount,
          totalCost,
        });
      }
    }
  }

  plannedSales.sort((a, b) => a.at.getTime() - b.at.getTime());

  // ─── Opening stock ────────────────────────────────────────────────
  const key = (shopId: string, productId: string) => `${shopId}:${productId}`;
  const soldTotals = new Map<string, number>();
  for (const sale of plannedSales) {
    for (const item of sale.items) {
      const k = key(sale.shopId, item.productId);
      soldTotals.set(k, (soldTotals.get(k) ?? 0) + item.quantity);
    }
  }

  const balances = new Map<string, number>();
  const openingAt = new Date(now);
  openingAt.setDate(openingAt.getDate() - 7);

  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    for (let sIdx = 0; sIdx < shops.length; sIdx++) {
      const k = key(shops[sIdx].id, products[pIdx].id);
      const opening = closingLevels[pIdx][sIdx] + (soldTotals.get(k) ?? 0);
      balances.set(k, opening);

      await prisma.shopInventory.create({
        data: {
          shopId: shops[sIdx].id,
          productId: products[pIdx].id,
          quantity: opening,
          updatedAt: openingAt,
        },
      });
      await prisma.stockMovement.create({
        data: {
          shopId: shops[sIdx].id,
          productId: products[pIdx].id,
          movementType: "OPENING",
          quantityChange: opening,
          quantityBefore: 0,
          quantityAfter: opening,
          referenceType: "seed",
          reason: "Initial stock setup",
          performedBy: admin.id,
          createdAt: openingAt,
        },
      });
    }
  }
  console.log("  ✓ Created opening stock for all shops");

  // ─── Apply sales through the ledger ───────────────────────────────
  const dailyCounters = new Map<string, number>();

  for (const sale of plannedSales) {
    const dateStr = [
      sale.at.getFullYear(),
      String(sale.at.getMonth() + 1).padStart(2, "0"),
      String(sale.at.getDate()).padStart(2, "0"),
    ].join("");

    const sequence = (dailyCounters.get(dateStr) ?? 0) + 1;
    dailyCounters.set(dateStr, sequence);

    const created = await prisma.sale.create({
      data: {
        saleNumber: `SL-${dateStr}-${String(sequence).padStart(4, "0")}`,
        shopId: sale.shopId,
        salespersonId: sale.salespersonId,
        totalAmount: sale.totalAmount,
        totalCost: sale.totalCost,
        itemsCount: sale.items.length,
        createdAt: sale.at,
        items: {
          create: sale.items.map((item) => ({ ...item, createdAt: sale.at })),
        },
      },
      select: { id: true },
    });

    for (const item of sale.items) {
      const k = key(sale.shopId, item.productId);
      const before = balances.get(k)!;
      const after = before - item.quantity;
      balances.set(k, after);

      await prisma.stockMovement.create({
        data: {
          shopId: sale.shopId,
          productId: item.productId,
          movementType: "SALE",
          quantityChange: -item.quantity,
          quantityBefore: before,
          quantityAfter: after,
          referenceType: "sale",
          referenceId: created.id,
          performedBy: sale.salespersonId,
          createdAt: sale.at,
        },
      });
    }
  }

  // Balances now reflect every movement that was written.
  for (const [k, quantity] of balances) {
    const [shopId, productId] = k.split(":");
    await prisma.shopInventory.update({
      where: { shopId_productId: { shopId, productId } },
      data: { quantity },
    });
  }

  await prisma.saleCounter.deleteMany();
  for (const [dateStr, lastNumber] of dailyCounters) {
    await prisma.saleCounter.create({
      data: {
        businessDate: new Date(
          `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}T00:00:00Z`
        ),
        lastNumber,
      },
    });
  }

  console.log(
    `  ✓ Created ${plannedSales.length} sales with matching stock movements`
  );

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("\n✅ Seeding complete!\n");
  console.log("  Login Credentials:");
  console.log("  ──────────────────────────────────────");
  console.log("  Owner (Ram Jalloh):  admin@invsys.com / password123");
  console.log("  Fatmata Kamara:      fatmata@invsys.com / password123  (Freetown Central)");
  console.log("  Mohamed Sesay:       mohamed@invsys.com / password123  (Lumley Branch)");
  console.log("  Aminata Bangura:     aminata@invsys.com / password123  (Bo Town Branch)");
  console.log("");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
