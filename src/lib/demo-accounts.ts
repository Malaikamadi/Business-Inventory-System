/**
 * Seeded accounts shown on the login screen so a role can be chosen without
 * knowing the emails by heart. These match `prisma/seed.ts`.
 *
 * One-click sign-in is for local use. Do not ship this list to a live shop.
 */
export const DEMO_PASSWORD = "password123";

export const DEMO_ACCOUNTS = [
  {
    role: "Owner",
    name: "Ram Jalloh",
    email: "admin@invsys.com",
    shop: "All shops",
    summary:
      "Sees shop performance, stock the manager adds, and sales by each salesperson.",
  },
  {
    role: "Manager",
    name: "Isata Koroma",
    email: "manager@invsys.com",
    shop: "All shops",
    summary: "Adds stock, manages the catalog and staff, and watches live sales.",
  },
  {
    role: "Salesperson",
    name: "Fatmata Kamara",
    email: "fatmata@invsys.com",
    shop: "Freetown Central",
    summary: "Records sales at Freetown Central.",
  },
  {
    role: "Salesperson",
    name: "Mohamed Sesay",
    email: "mohamed@invsys.com",
    shop: "Lumley Branch",
    summary: "Records sales at Lumley.",
  },
  {
    role: "Salesperson",
    name: "Aminata Bangura",
    email: "aminata@invsys.com",
    shop: "Bo Town Branch",
    summary: "Records sales in Bo.",
  },
] as const;
