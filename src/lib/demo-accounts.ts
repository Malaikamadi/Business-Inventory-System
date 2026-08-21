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
    shop: "All three businesses",
    summary:
      "Sees electronics, pharmacy, and building materials: shop performance, stock added, and sales by staff.",
  },
  {
    role: "Manager",
    name: "Mohamed Sesay",
    email: "mohamed@invsys.com",
    shop: "Jalloh Electronics",
    summary: "Runs the electronics shop: catalog, arrivals, and stock.",
  },
  {
    role: "Manager",
    name: "Isata Koroma",
    email: "manager@invsys.com",
    shop: "Jalloh Pharmacy",
    summary: "Runs the pharmacy: catalog, arrivals, and stock.",
  },
  {
    role: "Manager",
    name: "Ibrahim Turay",
    email: "ibrahim@invsys.com",
    shop: "Jalloh Building Materials",
    summary: "Runs the building materials shop: catalog, arrivals, and stock.",
  },
  {
    role: "Salesperson",
    name: "Fatmata Kamara",
    email: "fatmata@invsys.com",
    shop: "Jalloh Electronics",
    summary: "Records sales at the electronics shop.",
  },
  {
    role: "Salesperson",
    name: "Aminata Bangura",
    email: "aminata@invsys.com",
    shop: "Jalloh Pharmacy",
    summary: "Records sales at the pharmacy.",
  },
  {
    role: "Salesperson",
    name: "Musa Conteh",
    email: "musa@invsys.com",
    shop: "Jalloh Building Materials",
    summary: "Records sales at the building materials shop.",
  },
] as const;
