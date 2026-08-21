import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

import { OWNER_PERMISSIONS, MANAGER_PERMISSIONS, PERMISSIONS, SALESPERSON_PERMISSIONS } from "../src/lib/constants";
import { seedImageUrlForSku } from "../src/lib/seed-product-images";

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
      description: "Business owner. Sees shop performance, stock arrivals, and sales by staff.",
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

  const managerRole = await prisma.role.create({
    data: {
      name: "manager",
      description: "Shop manager. Catalog, arrivals, and stock for the assigned shop.",
      isSystem: true,
      rolePermissions: {
        create: permissions
          .filter((p) =>
            MANAGER_PERMISSIONS.includes(p.key as (typeof MANAGER_PERMISSIONS)[number])
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
  console.log("  ✓ Created roles (owner, manager, salesperson)");

  // ─── Shops: three distinct businesses, not branches of one catalog ─
  const electronics = await prisma.shop.create({
    data: {
      name: "Jalloh Electronics",
      location: "Central Freetown",
      address: "24 Siaka Stevens Street, Freetown",
      phone: "+232 76 100 101",
      email: "electronics@invsys.com",
    },
  });

  const pharmacy = await prisma.shop.create({
    data: {
      name: "Jalloh Pharmacy",
      location: "Lumley, Freetown",
      address: "8 Lumley Beach Road, Lumley, Freetown",
      phone: "+232 76 100 102",
      email: "pharmacy@invsys.com",
    },
  });

  const building = await prisma.shop.create({
    data: {
      name: "Jalloh Building Materials",
      location: "Bo, Southern Province",
      address: "15 Fenton Road, Bo",
      phone: "+232 76 100 103",
      email: "building@invsys.com",
    },
  });
  console.log("  ✓ Created 3 shops (electronics, pharmacy, building materials)");

  // ─── Users ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.create({
    data: {
      email: "admin@invsys.com",
      passwordHash,
      firstName: "Ram",
      lastName: "Jalloh",
      phone: "+232 76 100 001",
      roleId: ownerRole.id,
    },
  });

  const electronicsManager = await prisma.user.create({
    data: {
      email: "mohamed@invsys.com",
      passwordHash,
      firstName: "Mohamed",
      lastName: "Sesay",
      phone: "+232 76 100 003",
      roleId: managerRole.id,
      shopAssignments: {
        create: { shopId: electronics.id, isPrimary: true },
      },
    },
  });

  const pharmacyManager = await prisma.user.create({
    data: {
      email: "manager@invsys.com",
      passwordHash,
      firstName: "Isata",
      lastName: "Koroma",
      phone: "+232 76 100 005",
      roleId: managerRole.id,
      shopAssignments: {
        create: { shopId: pharmacy.id, isPrimary: true },
      },
    },
  });

  const buildingManager = await prisma.user.create({
    data: {
      email: "ibrahim@invsys.com",
      passwordHash,
      firstName: "Ibrahim",
      lastName: "Turay",
      phone: "+232 76 100 006",
      roleId: managerRole.id,
      shopAssignments: {
        create: { shopId: building.id, isPrimary: true },
      },
    },
  });

  const electronicsSales = await prisma.user.create({
    data: {
      email: "fatmata@invsys.com",
      passwordHash,
      firstName: "Fatmata",
      lastName: "Kamara",
      phone: "+232 76 100 002",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: electronics.id, isPrimary: true },
      },
    },
  });

  const pharmacySales = await prisma.user.create({
    data: {
      email: "aminata@invsys.com",
      passwordHash,
      firstName: "Aminata",
      lastName: "Bangura",
      phone: "+232 76 100 004",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: pharmacy.id, isPrimary: true },
      },
    },
  });

  const buildingSales = await prisma.user.create({
    data: {
      email: "musa@invsys.com",
      passwordHash,
      firstName: "Musa",
      lastName: "Conteh",
      phone: "+232 76 100 007",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: building.id, isPrimary: true },
      },
    },
  });
  console.log("  ✓ Created 7 users (1 owner, 3 managers, 3 salespersons)");

  const managerByShop = new Map([
    [electronics.id, electronicsManager.id],
    [pharmacy.id, pharmacyManager.id],
    [building.id, buildingManager.id],
  ]);

  // ─── Categories (per shop) ────────────────────────────────────────
  const [cables, audio, phoneAcc] = await Promise.all([
    prisma.category.create({
      data: {
        shopId: electronics.id,
        name: "Cables & Power",
        description: "Charging cables, power banks, and lighting",
      },
    }),
    prisma.category.create({
      data: {
        shopId: electronics.id,
        name: "Audio",
        description: "Earbuds, speakers, and sound accessories",
      },
    }),
    prisma.category.create({
      data: {
        shopId: electronics.id,
        name: "Phone Accessories",
        description: "Cases and other phone add-ons",
      },
    }),
  ]);

  const [painFever, firstAid, personalCare] = await Promise.all([
    prisma.category.create({
      data: {
        shopId: pharmacy.id,
        name: "Pain & Fever",
        description: "Over-the-counter pain and fever relief",
      },
    }),
    prisma.category.create({
      data: {
        shopId: pharmacy.id,
        name: "First Aid",
        description: "Wound care, ORS, and emergency supplies",
      },
    }),
    prisma.category.create({
      data: {
        shopId: pharmacy.id,
        name: "Personal Care",
        description: "Hygiene and everyday health products",
      },
    }),
  ]);

  const [cementMasonry, hardware, timberPaint] = await Promise.all([
    prisma.category.create({
      data: {
        shopId: building.id,
        name: "Cement & Masonry",
        description: "Cement, wire, and masonry supplies",
      },
    }),
    prisma.category.create({
      data: {
        shopId: building.id,
        name: "Hardware",
        description: "Nails, locks, pipe, and fittings",
      },
    }),
    prisma.category.create({
      data: {
        shopId: building.id,
        name: "Timber & Paint",
        description: "Sawn timber and decorative paint",
      },
    }),
  ]);
  console.log("  ✓ Created 9 shop-specific categories");

  // ─── Products ─────────────────────────────────────────────────────
  // Prices are in new leones (SLE) at roughly Freetown / Bo retail levels.
  const productImage = async (sku: string) =>
    (await seedImageUrlForSku(sku)) ?? undefined;

  type CatalogItem = {
    shopId: string;
    categoryId: string;
    name: string;
    sku: string;
    costPrice: number;
    sellingPrice: number;
    lowStockThreshold: number;
    description: string;
  };

  const catalog: CatalogItem[] = [
    {
      shopId: electronics.id,
      categoryId: cables.id,
      name: "USB-C Cable 1m",
      sku: "ELC-UC-1M",
      costPrice: 28,
      sellingPrice: 55,
      lowStockThreshold: 10,
      description: "USB-C charging cable, 1 meter",
    },
    {
      shopId: electronics.id,
      categoryId: audio.id,
      name: "Wireless Earbuds",
      sku: "ELC-WE-BT",
      costPrice: 240,
      sellingPrice: 430,
      lowStockThreshold: 5,
      description: "Bluetooth wireless earbuds with case",
    },
    {
      shopId: electronics.id,
      categoryId: phoneAcc.id,
      name: "Phone Case Universal",
      sku: "ELC-PC-UNI",
      costPrice: 22,
      sellingPrice: 45,
      lowStockThreshold: 10,
      description: "Universal silicone phone case",
    },
    {
      shopId: electronics.id,
      categoryId: cables.id,
      name: "Power Bank 10000mAh",
      sku: "ELC-PB-10K",
      costPrice: 180,
      sellingPrice: 320,
      lowStockThreshold: 6,
      description: "Portable power bank, 10000mAh",
    },
    {
      shopId: electronics.id,
      categoryId: audio.id,
      name: "Bluetooth Speaker",
      sku: "ELC-SP-BT",
      costPrice: 150,
      sellingPrice: 275,
      lowStockThreshold: 5,
      description: "Portable Bluetooth speaker",
    },
    {
      shopId: electronics.id,
      categoryId: cables.id,
      name: "LED Bulb 12W",
      sku: "ELC-LED-12",
      costPrice: 18,
      sellingPrice: 35,
      lowStockThreshold: 12,
      description: "Energy-saving LED bulb, 12 watt",
    },
    {
      shopId: pharmacy.id,
      categoryId: painFever.id,
      name: "Paracetamol 500mg (20 tabs)",
      sku: "PH-PCM-20",
      costPrice: 8,
      sellingPrice: 15,
      lowStockThreshold: 20,
      description: "Paracetamol 500mg tablets, pack of 20",
    },
    {
      shopId: pharmacy.id,
      categoryId: firstAid.id,
      name: "ORS Sachets (10-pack)",
      sku: "PH-ORS-10",
      costPrice: 12,
      sellingPrice: 22,
      lowStockThreshold: 15,
      description: "Oral rehydration salts, box of 10 sachets",
    },
    {
      shopId: pharmacy.id,
      categoryId: painFever.id,
      name: "Cough Syrup 100ml",
      sku: "PH-CS-100",
      costPrice: 28,
      sellingPrice: 48,
      lowStockThreshold: 8,
      description: "Cough syrup, 100ml bottle",
    },
    {
      shopId: pharmacy.id,
      categoryId: firstAid.id,
      name: "Adhesive Plasters (20pc)",
      sku: "PH-PL-20",
      costPrice: 10,
      sellingPrice: 18,
      lowStockThreshold: 10,
      description: "Assorted adhesive plasters, pack of 20",
    },
    {
      shopId: pharmacy.id,
      categoryId: personalCare.id,
      name: "Hand Sanitizer 250ml",
      sku: "PC-HS-250",
      costPrice: 18,
      sellingPrice: 34,
      lowStockThreshold: 12,
      description: "Antibacterial hand sanitizer, 250ml",
    },
    {
      shopId: pharmacy.id,
      categoryId: personalCare.id,
      name: "Face Mask Box (50pc)",
      sku: "PC-FM-50",
      costPrice: 42,
      sellingPrice: 78,
      lowStockThreshold: 5,
      description: "Disposable face masks, box of 50",
    },
    {
      shopId: pharmacy.id,
      categoryId: personalCare.id,
      name: "Toothpaste Mint 100ml",
      sku: "PC-TP-100",
      costPrice: 16,
      sellingPrice: 29,
      lowStockThreshold: 10,
      description: "Mint toothpaste, 100ml tube",
    },
    {
      shopId: building.id,
      categoryId: cementMasonry.id,
      name: "Portland Cement 50kg",
      sku: "BLD-CEM-50",
      costPrice: 95,
      sellingPrice: 125,
      lowStockThreshold: 15,
      description: "Portland cement, 50kg bag",
    },
    {
      shopId: building.id,
      categoryId: cementMasonry.id,
      name: "Binding Wire 25kg",
      sku: "BLD-BW-25",
      costPrice: 85,
      sellingPrice: 120,
      lowStockThreshold: 8,
      description: "Galvanised binding wire, 25kg coil",
    },
    {
      shopId: building.id,
      categoryId: hardware.id,
      name: "Roofing Nails 1kg",
      sku: "BLD-RN-1K",
      costPrice: 22,
      sellingPrice: 38,
      lowStockThreshold: 12,
      description: "Umbrella head roofing nails, 1kg",
    },
    {
      shopId: building.id,
      categoryId: timberPaint.id,
      name: "Emulsion Paint 4L",
      sku: "BLD-EP-4L",
      costPrice: 95,
      sellingPrice: 155,
      lowStockThreshold: 6,
      description: "Interior emulsion paint, 4 litre",
    },
    {
      shopId: building.id,
      categoryId: timberPaint.id,
      name: "Timber 2x4 12ft",
      sku: "BLD-TM-24",
      costPrice: 45,
      sellingPrice: 75,
      lowStockThreshold: 10,
      description: "Sawn timber, 2x4 inches, 12 feet",
    },
    {
      shopId: building.id,
      categoryId: hardware.id,
      name: "Padlock 50mm",
      sku: "BLD-PL-50",
      costPrice: 28,
      sellingPrice: 55,
      lowStockThreshold: 8,
      description: "Brass padlock, 50mm",
    },
    {
      shopId: building.id,
      categoryId: hardware.id,
      name: "PVC Pipe 3/4\" 6m",
      sku: "BLD-PVC-34",
      costPrice: 18,
      sellingPrice: 32,
      lowStockThreshold: 10,
      description: "PVC pressure pipe, 3/4 inch, 6 metres",
    },
  ];

  const products = await Promise.all(
    catalog.map(async (item) =>
      prisma.product.create({
        data: {
          shopId: item.shopId,
          categoryId: item.categoryId,
          name: item.name,
          sku: item.sku,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          lowStockThreshold: item.lowStockThreshold,
          description: item.description,
          imageUrl: await productImage(item.sku),
        },
      })
    )
  );
  console.log(`  ✓ Created ${products.length} products`);

  const closingBySku = new Map<string, number>([
    ["ELC-UC-1M", 12],
    ["ELC-WE-BT", 4],
    ["ELC-PC-UNI", 15],
    ["ELC-PB-10K", 8],
    ["ELC-SP-BT", 6],
    ["ELC-LED-12", 2],
    ["PH-PCM-20", 40],
    ["PH-ORS-10", 25],
    ["PH-CS-100", 8],
    ["PH-PL-20", 18],
    ["PC-HS-250", 14],
    ["PC-FM-50", 3],
    ["PC-TP-100", 0],
    ["BLD-CEM-50", 30],
    ["BLD-BW-25", 12],
    ["BLD-RN-1K", 20],
    ["BLD-EP-4L", 8],
    ["BLD-TM-24", 15],
    ["BLD-PL-50", 4],
    ["BLD-PVC-34", 10],
  ]);

  // ─── Sales history ────────────────────────────────────────────────
  // Sales are planned before any stock is written so that opening balances can
  // be sized to end at the target levels below. Seeding stock and then selling
  // from it independently is what lets a ledger drift from its balances.
  const catalogByShop = new Map<string, typeof products>();
  for (const product of products) {
    const list = catalogByShop.get(product.shopId) ?? [];
    list.push(product);
    catalogByShop.set(product.shopId, list);
  }

  const salespersons = [
    { user: electronicsSales, shop: electronics },
    { user: pharmacySales, shop: pharmacy },
    { user: buildingSales, shop: building },
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

  for (let dayOffset = 6; dayOffset >= 1; dayOffset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - dayOffset);

    for (const { user: sp, shop } of salespersons) {
      const shopCatalog = catalogByShop.get(shop.id) ?? [];
      const numSales = 2 + Math.floor(Math.random() * 3);

      for (let s = 0; s < numSales; s++) {
        const at = new Date(day);
        at.setHours(
          9 + Math.floor(Math.random() * 9),
          Math.floor(Math.random() * 60),
          0,
          0
        );

        const chosen = [...shopCatalog]
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

  // ─── Opening stock (only at the product's own shop) ───────────────
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

  for (const product of products) {
    const k = key(product.shopId, product.id);
    const closing = closingBySku.get(product.sku) ?? 10;
    const opening = closing + (soldTotals.get(k) ?? 0);
    balances.set(k, opening);

    await prisma.shopInventory.create({
      data: {
        shopId: product.shopId,
        productId: product.id,
        quantity: opening,
        updatedAt: openingAt,
      },
    });
    await prisma.stockMovement.create({
      data: {
        shopId: product.shopId,
        productId: product.id,
        movementType: "OPENING",
        quantityChange: opening,
        quantityBefore: 0,
        quantityAfter: opening,
        referenceType: "seed",
        reason: "Initial stock setup",
        performedBy: managerByShop.get(product.shopId)!,
        createdAt: openingAt,
      },
    });
  }
  console.log("  ✓ Created opening stock for each shop's own products");

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
  console.log("  Owner (Ram Jalloh):              admin@invsys.com / password123");
  console.log("  Mohamed Sesay (Electronics):     mohamed@invsys.com / password123");
  console.log("  Isata Koroma (Pharmacy):         manager@invsys.com / password123");
  console.log("  Ibrahim Turay (Building):        ibrahim@invsys.com / password123");
  console.log("  Fatmata Kamara (Electronics):    fatmata@invsys.com / password123");
  console.log("  Aminata Bangura (Pharmacy):      aminata@invsys.com / password123");
  console.log("  Musa Conteh (Building):          musa@invsys.com / password123");
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
