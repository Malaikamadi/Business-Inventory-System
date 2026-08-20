import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const PERMISSIONS_DATA = [
  // Dashboard
  { key: "dashboard:global:view", resource: "dashboard", action: "global:view", description: "View global dashboard" },
  { key: "dashboard:shop:view", resource: "dashboard", action: "shop:view", description: "View shop dashboard" },
  // Shops
  { key: "shops:create", resource: "shops", action: "create", description: "Create shops" },
  { key: "shops:update", resource: "shops", action: "update", description: "Update shops" },
  { key: "shops:delete", resource: "shops", action: "delete", description: "Delete shops" },
  { key: "shops:view:all", resource: "shops", action: "view:all", description: "View all shops" },
  { key: "shops:view:assigned", resource: "shops", action: "view:assigned", description: "View assigned shop" },
  // Products
  { key: "products:create", resource: "products", action: "create", description: "Create products" },
  { key: "products:update", resource: "products", action: "update", description: "Update products" },
  { key: "products:delete", resource: "products", action: "delete", description: "Delete products" },
  { key: "products:view", resource: "products", action: "view", description: "View products" },
  // Categories
  { key: "categories:manage", resource: "categories", action: "manage", description: "Manage categories" },
  // Inventory
  { key: "inventory:view:all", resource: "inventory", action: "view:all", description: "View all inventory" },
  { key: "inventory:view:assigned", resource: "inventory", action: "view:assigned", description: "View assigned inventory" },
  // Stock
  { key: "stock:arrivals:create", resource: "stock", action: "arrivals:create", description: "Record stock arrivals" },
  { key: "stock:adjustments:create", resource: "stock", action: "adjustments:create", description: "Make stock adjustments" },
  { key: "stock:movements:view:all", resource: "stock", action: "movements:view:all", description: "View all movements" },
  { key: "stock:movements:view:assigned", resource: "stock", action: "movements:view:assigned", description: "View assigned movements" },
  // Sales
  { key: "sales:create", resource: "sales", action: "create", description: "Create sales" },
  { key: "sales:view:all", resource: "sales", action: "view:all", description: "View all sales" },
  { key: "sales:view:assigned", resource: "sales", action: "view:assigned", description: "View assigned sales" },
  { key: "sales:void", resource: "sales", action: "void", description: "Void sales" },
  // Users
  { key: "users:create", resource: "users", action: "create", description: "Create users" },
  { key: "users:update", resource: "users", action: "update", description: "Update users" },
  { key: "users:deactivate", resource: "users", action: "deactivate", description: "Deactivate users" },
  { key: "users:view", resource: "users", action: "view", description: "View users" },
  // Reports
  { key: "reports:global", resource: "reports", action: "global", description: "Access global reports" },
  { key: "reports:shop", resource: "reports", action: "shop", description: "Access shop reports" },
  // Audit
  { key: "audit:view", resource: "audit", action: "view", description: "View audit logs" },
];

const SALESPERSON_PERMISSION_KEYS = [
  "dashboard:shop:view",
  "shops:view:assigned",
  "products:view",
  "inventory:view:assigned",
  "stock:movements:view:assigned",
  "sales:create",
  "sales:view:assigned",
  "reports:shop",
];

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Clean existing data ──────────────────────────────────────────
  await prisma.auditLog.deleteMany();
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
        create: permissions.map((p) => ({ permissionId: p.id })),
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
      name: "Downtown Store",
      location: "City Center",
      address: "123 Main Street, Downtown, NY 10001",
      phone: "+1-555-0101",
      email: "downtown@invsys.com",
    },
  });

  const shopB = await prisma.shop.create({
    data: {
      name: "Westside Mall",
      location: "West District",
      address: "456 Commerce Blvd, Mall Level 2, NY 10023",
      phone: "+1-555-0102",
      email: "westside@invsys.com",
    },
  });

  const shopC = await prisma.shop.create({
    data: {
      name: "Harbor Point",
      location: "East Harbor",
      address: "789 Harbor Drive, Suite 4, NY 10038",
      phone: "+1-555-0103",
      email: "harbor@invsys.com",
    },
  });
  console.log("  ✓ Created 3 shops");

  // ─── Users ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@invsys.com",
      passwordHash,
      firstName: "Alex",
      lastName: "Morgan",
      phone: "+1-555-0001",
      roleId: ownerRole.id,
    },
  });

  const sp1 = await prisma.user.create({
    data: {
      email: "james@invsys.com",
      passwordHash,
      firstName: "James",
      lastName: "Wilson",
      phone: "+1-555-0002",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: shopA.id, isPrimary: true },
      },
    },
  });

  const sp2 = await prisma.user.create({
    data: {
      email: "sarah@invsys.com",
      passwordHash,
      firstName: "Sarah",
      lastName: "Chen",
      phone: "+1-555-0003",
      roleId: salespersonRole.id,
      shopAssignments: {
        create: { shopId: shopB.id, isPrimary: true },
      },
    },
  });

  const sp3 = await prisma.user.create({
    data: {
      email: "michael@invsys.com",
      passwordHash,
      firstName: "Michael",
      lastName: "Brown",
      phone: "+1-555-0004",
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
  const products = await Promise.all([
    prisma.product.create({
      data: { name: "Coca-Cola 500ml", sku: "BEV-CC-500", categoryId: beverages.id, costPrice: 0.75, sellingPrice: 1.50, lowStockThreshold: 20, description: "Classic Coca-Cola in 500ml PET bottle" },
    }),
    prisma.product.create({
      data: { name: "Pepsi 500ml", sku: "BEV-PP-500", categoryId: beverages.id, costPrice: 0.70, sellingPrice: 1.50, lowStockThreshold: 20, description: "Pepsi cola in 500ml PET bottle" },
    }),
    prisma.product.create({
      data: { name: "Spring Water 1L", sku: "BEV-SW-1L", categoryId: beverages.id, costPrice: 0.30, sellingPrice: 1.00, lowStockThreshold: 30, description: "Natural spring water, 1 liter" },
    }),
    prisma.product.create({
      data: { name: "Orange Juice 330ml", sku: "BEV-OJ-330", categoryId: beverages.id, costPrice: 0.90, sellingPrice: 2.00, lowStockThreshold: 15, description: "Fresh orange juice, 330ml carton" },
    }),
    prisma.product.create({
      data: { name: "Lay's Classic Chips", sku: "SNK-LC-150", categoryId: snacks.id, costPrice: 1.00, sellingPrice: 2.50, lowStockThreshold: 15, description: "Lay's classic potato chips, 150g bag" },
    }),
    prisma.product.create({
      data: { name: "Pringles Original", sku: "SNK-PR-165", categoryId: snacks.id, costPrice: 1.50, sellingPrice: 3.50, lowStockThreshold: 10, description: "Pringles original flavor, 165g can" },
    }),
    prisma.product.create({
      data: { name: "Snickers Bar", sku: "SNK-SN-52", categoryId: snacks.id, costPrice: 0.60, sellingPrice: 1.25, lowStockThreshold: 25, description: "Snickers chocolate bar, 52g" },
    }),
    prisma.product.create({
      data: { name: "USB-C Cable 1m", sku: "ELC-UC-1M", categoryId: electronics.id, costPrice: 3.00, sellingPrice: 8.99, lowStockThreshold: 10, description: "USB-C charging cable, 1 meter" },
    }),
    prisma.product.create({
      data: { name: "Wireless Earbuds", sku: "ELC-WE-BT", categoryId: electronics.id, costPrice: 15.00, sellingPrice: 39.99, lowStockThreshold: 5, description: "Bluetooth wireless earbuds with case" },
    }),
    prisma.product.create({
      data: { name: "Phone Case Universal", sku: "ELC-PC-UNI", categoryId: electronics.id, costPrice: 2.50, sellingPrice: 7.99, lowStockThreshold: 10, description: "Universal silicone phone case" },
    }),
    prisma.product.create({
      data: { name: "Cotton T-Shirt Black", sku: "CLT-TS-BLK", categoryId: clothing.id, costPrice: 5.00, sellingPrice: 14.99, lowStockThreshold: 8, description: "100% cotton t-shirt, black, unisex" },
    }),
    prisma.product.create({
      data: { name: "Cotton T-Shirt White", sku: "CLT-TS-WHT", categoryId: clothing.id, costPrice: 5.00, sellingPrice: 14.99, lowStockThreshold: 8, description: "100% cotton t-shirt, white, unisex" },
    }),
    prisma.product.create({
      data: { name: "Hand Sanitizer 250ml", sku: "PC-HS-250", categoryId: personalCare.id, costPrice: 1.50, sellingPrice: 3.99, lowStockThreshold: 12, description: "Antibacterial hand sanitizer, 250ml" },
    }),
    prisma.product.create({
      data: { name: "Face Mask Box (50pc)", sku: "PC-FM-50", categoryId: personalCare.id, costPrice: 4.00, sellingPrice: 9.99, lowStockThreshold: 5, description: "Disposable face masks, box of 50" },
    }),
    prisma.product.create({
      data: { name: "Toothpaste Mint 100ml", sku: "PC-TP-100", categoryId: personalCare.id, costPrice: 1.20, sellingPrice: 2.99, lowStockThreshold: 10, description: "Mint toothpaste, 100ml tube" },
    }),
  ]);
  console.log(`  ✓ Created ${products.length} products`);

  // ─── Inventory & Stock Movements ──────────────────────────────────
  const shops = [shopA, shopB, shopC];
  const inventoryLevels = [
    // [shopA, shopB, shopC] quantities per product
    [45, 30, 60],  // Coca-Cola
    [35, 25, 40],  // Pepsi
    [80, 50, 70],  // Spring Water
    [20, 15, 25],  // Orange Juice
    [18, 12, 22],  // Lay's
    [10, 8, 14],   // Pringles
    [30, 20, 35],  // Snickers
    [12, 8, 15],   // USB-C Cable
    [6, 4, 7],     // Wireless Earbuds
    [15, 10, 12],  // Phone Case
    [5, 8, 10],    // T-Shirt Black (low in shopA)
    [3, 6, 12],    // T-Shirt White (low in shopA)
    [14, 10, 18],  // Hand Sanitizer
    [4, 2, 6],     // Face Masks (low in shopB)
    [0, 8, 12],    // Toothpaste (out of stock in shopA)
  ];

  for (let pIdx = 0; pIdx < products.length; pIdx++) {
    for (let sIdx = 0; sIdx < shops.length; sIdx++) {
      const quantity = inventoryLevels[pIdx][sIdx];
      await prisma.shopInventory.create({
        data: {
          shopId: shops[sIdx].id,
          productId: products[pIdx].id,
          quantity,
        },
      });
      await prisma.stockMovement.create({
        data: {
          shopId: shops[sIdx].id,
          productId: products[pIdx].id,
          movementType: "OPENING",
          quantityChange: quantity,
          quantityBefore: 0,
          quantityAfter: quantity,
          referenceType: "seed",
          reason: "Initial stock setup",
          performedBy: admin.id,
        },
      });
    }
  }
  console.log("  ✓ Created inventory for all shops");

  // ─── Sample Sales ─────────────────────────────────────────────────
  const salespersons = [
    { user: sp1, shop: shopA },
    { user: sp2, shop: shopB },
    { user: sp3, shop: shopC },
  ];

  let saleCounter = 0;
  const now = new Date();

  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const saleDate = new Date(now);
    saleDate.setDate(saleDate.getDate() - dayOffset);
    saleDate.setHours(10, 0, 0, 0);

    for (const { user: sp, shop } of salespersons) {
      // 2-4 sales per day per shop
      const numSales = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < numSales; s++) {
        saleCounter++;
        const saleTime = new Date(saleDate);
        saleTime.setHours(9 + Math.floor(Math.random() * 9), Math.floor(Math.random() * 60));

        // Pick 1-3 random products
        const numItems = 1 + Math.floor(Math.random() * 3);
        const selectedProducts = [...products]
          .sort(() => Math.random() - 0.5)
          .slice(0, numItems);

        let totalAmount = 0;
        let totalCost = 0;
        const items: { productId: string; productName: string; quantity: number; unitPrice: number; unitCost: number; lineTotal: number }[] = [];

        for (const product of selectedProducts) {
          const qty = 1 + Math.floor(Math.random() * 3);
          const unitPrice = Number(product.sellingPrice);
          const unitCost = Number(product.costPrice);
          const lineTotal = unitPrice * qty;
          totalAmount += lineTotal;
          totalCost += unitCost * qty;
          items.push({
            productId: product.id,
            productName: product.name,
            quantity: qty,
            unitPrice,
            unitCost,
            lineTotal,
          });
        }

        const dateStr = [
          saleTime.getFullYear(),
          String(saleTime.getMonth() + 1).padStart(2, "0"),
          String(saleTime.getDate()).padStart(2, "0"),
        ].join("");

        await prisma.sale.create({
          data: {
            saleNumber: `SL-${dateStr}-${String(saleCounter).padStart(4, "0")}`,
            shopId: shop.id,
            salespersonId: sp.id,
            totalAmount,
            totalCost,
            itemsCount: items.length,
            createdAt: saleTime,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                unitCost: item.unitCost,
                lineTotal: item.lineTotal,
                createdAt: saleTime,
              })),
            },
          },
        });
      }
    }
  }
  console.log(`  ✓ Created ${saleCounter} sample sales (7 days of data)`);

  // ─── Summary ──────────────────────────────────────────────────────
  console.log("\n✅ Seeding complete!\n");
  console.log("  Login Credentials:");
  console.log("  ──────────────────────────────────────");
  console.log("  Owner:        admin@invsys.com / password123");
  console.log("  Salesperson:  james@invsys.com / password123  (Downtown Store)");
  console.log("  Salesperson:  sarah@invsys.com / password123  (Westside Mall)");
  console.log("  Salesperson:  michael@invsys.com / password123 (Harbor Point)");
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
