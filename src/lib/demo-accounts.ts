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
    summary: "the whole empire. shops, stock, staff. no till though.",
  },
  {
    role: "Salesperson",
    name: "Fatmata Kamara",
    email: "fatmata@invsys.com",
    shop: "Freetown Central",
    summary: "rings up sales at Freetown Central. that's the job.",
  },
  {
    role: "Salesperson",
    name: "Mohamed Sesay",
    email: "mohamed@invsys.com",
    shop: "Lumley Branch",
    summary: "rings up sales at Lumley. that's the job.",
  },
  {
    role: "Salesperson",
    name: "Aminata Bangura",
    email: "aminata@invsys.com",
    shop: "Bo Town Branch",
    summary: "rings up sales in Bo. that's the job.",
  },
] as const;
