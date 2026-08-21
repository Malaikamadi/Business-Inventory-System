/**
 * Asserts which routes and menu items each role can reach, without a running
 * server. Complements `verify:routes`, which checks HTTP status against a
 * live app.
 */

import {
  MANAGER_PERMISSIONS,
  OWNER_PERMISSIONS,
  SALESPERSON_PERMISSIONS,
} from "../src/lib/constants";
import { canAccessPath } from "../src/lib/route-access";
import { navItemsFor } from "../src/components/layout/nav-items";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean) {
  console.log(`  ${condition ? "PASS" : "FAIL"}  ${label}`);
  if (condition) passed++;
  else failed++;
}

function labels(permissions: string[]): string[] {
  return navItemsFor(permissions).flatMap((item) =>
    item.children
      ? item.children.map((child) => child.label)
      : [item.label]
  );
}

const MANAGER_ONLY = [
  "/products/new",
  "/products/categories",
  "/inventory/arrivals",
  "/inventory/adjustments",
  "/shops/new",
  "/users",
  "/users/new",
];

const OWNER_AND_MANAGER = [
  "/reviews",
  "/audit-log",
];

const SHARED = [
  "/dashboard",
  "/shops",
  "/products",
  "/inventory",
  "/inventory/low-stock",
  "/inventory/out-of-stock",
  "/inventory/movements",
  "/sales",
  "/reports",
  "/settings/profile",
];

const SALESPERSON_ONLY = ["/sales/new"];

console.log("\nOwner routes");
for (const path of [...SHARED, ...OWNER_AND_MANAGER]) {
  check(`owner can open ${path}`, canAccessPath(path, OWNER_PERMISSIONS));
}
for (const path of [...MANAGER_ONLY, ...SALESPERSON_ONLY]) {
  check(
    `owner cannot open ${path}`,
    !canAccessPath(path, OWNER_PERMISSIONS)
  );
}

console.log("\nManager routes");
for (const path of [...SHARED, ...MANAGER_ONLY, ...OWNER_AND_MANAGER]) {
  check(`manager can open ${path}`, canAccessPath(path, MANAGER_PERMISSIONS));
}
for (const path of SALESPERSON_ONLY) {
  check(
    `manager cannot open ${path}`,
    !canAccessPath(path, MANAGER_PERMISSIONS)
  );
}

console.log("\nSalesperson routes");
for (const path of [...SHARED, ...SALESPERSON_ONLY]) {
  check(
    `salesperson can open ${path}`,
    canAccessPath(path, SALESPERSON_PERMISSIONS)
  );
}
for (const path of [...MANAGER_ONLY, ...OWNER_AND_MANAGER]) {
  check(
    `salesperson cannot open ${path}`,
    !canAccessPath(path, SALESPERSON_PERMISSIONS)
  );
}

console.log("\nMenus");
const ownerMenu = labels(OWNER_PERMISSIONS);
const managerMenu = labels(MANAGER_PERMISSIONS);
const staffMenu = labels(SALESPERSON_PERMISSIONS);

for (const label of [
  "Dashboard",
  "Shops",
  "Products",
  "Overview",
  "Sales",
  "Reports",
  "Reviews",
  "Audit Log",
]) {
  check(`owner menu includes ${label}`, ownerMenu.includes(label));
}
for (const label of [
  "Categories",
  "Stock Arrivals",
  "Adjustments",
  "Users",
  "Record sale",
]) {
  check(`owner menu hides ${label}`, !ownerMenu.includes(label));
}

for (const label of [
  "Dashboard",
  "Shops",
  "All Products",
  "Categories",
  "Overview",
  "Stock Arrivals",
  "Adjustments",
  "Sales",
  "Users",
  "Reviews",
  "Audit Log",
]) {
  check(`manager menu includes ${label}`, managerMenu.includes(label));
}
check(`manager menu hides Record sale`, !managerMenu.includes("Record sale"));

for (const label of ["Dashboard", "Shops", "Record sale", "Products", "Overview", "Sales", "Reports"]) {
  check(`salesperson menu includes ${label}`, staffMenu.includes(label));
}

for (const label of ["Categories", "Stock Arrivals", "Adjustments", "Users", "Reviews", "Audit Log"]) {
  check(`salesperson menu hides ${label}`, !staffMenu.includes(label));
}

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
