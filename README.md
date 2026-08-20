# Multi-Branch Inventory & Sales Management System

Inventory and sales management for a business operating several shops. Owners
get a business-wide view; salespeople get a shop-scoped view built around
recording sales quickly.

## The one rule that shapes everything

**Stock quantities are never edited directly.** Every change is an append-only
row in `stock_movements`, and `shop_inventory` is a cached running balance
updated inside the same transaction as the movement that caused it.

This means the current quantity of any product at any shop can always be
re-derived from its history, and any drift between the cache and the ledger is
detectable. `npm run verify:rules` asserts they agree.

Consequences that are deliberate, not accidental:

- Sales, arrivals, adjustments, transfers and voids all go through
  `applyMovement`. Nothing else writes to either table.
- Stock cannot go negative. The check happens under a row lock, so two tills
  selling the last unit at the same moment cannot both succeed.
- Sales are never deleted. Voiding marks the sale and writes compensating
  movements that return the stock.
- Products with stock cannot be discontinued, and shops with stock cannot be
  deactivated — otherwise inventory would silently vanish from business totals.

## Stack

Next.js 16 (App Router), TypeScript, PostgreSQL via Prisma 7, Auth.js v5
(credentials + JWT), Tailwind CSS v4, Radix primitives, Recharts.

## Getting started

Requires Node 20+ and a PostgreSQL 14+ database.

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
```

### Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing key — generate with `openssl rand -base64 32` |
| `AUTH_URL` | Canonical app URL |
| `NEXT_PUBLIC_BUSINESS_TIMEZONE` | Business calendar for "today" and "this month" (defaults to `UTC`) |

### Seeded accounts

All use the password `password123`. Replace them before any real deployment.

| Email | Role | Shop |
| --- | --- | --- |
| `admin@invsys.com` | Owner | All shops |
| `james@invsys.com` | Salesperson | Downtown Store |
| `sarah@invsys.com` | Salesperson | Westside Mall |
| `michael@invsys.com` | Salesperson | Harbor Point |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run lint` | ESLint |
| `npm run db:push` | Sync schema to the database |
| `npm run db:seed` | Reset and seed sample data |
| `npm run verify:rules` | Assert inventory and sales invariants against the database |
| `npm run verify:routes` | Sign in as a seeded user and check every route's status |

`verify:rules` creates and removes its own shops and products, but it writes to
the configured database — point it at a development database, not production.

## Architecture

```
src/
  app/(auth)/          Sign-in
  app/(dashboard)/     All authenticated pages
  components/          UI primitives, layout shell, feature components
  lib/                 Auth config, Prisma client, validation, formatting, dates
  server/
    auth-context.ts    Who the caller is and what they may do
    actions/           Server actions: authorize, validate, delegate, audit
    services/          Business logic and queries. The only code touching Prisma
                       for writes.
  proxy.ts             Route guard (Next 16's replacement for middleware.ts)
```

### Authorization

Three layers, because any one of them can be bypassed on its own:

1. `proxy.ts` turns away unauthenticated requests and redirects users away from
   routes their permissions do not cover.
2. Every page resolves its data scope through `resolveShopScope`, which returns
   the shop filter a query may use. A salesperson who hand-edits a `?shop=`
   parameter gets a `ForbiddenError`, not another branch's data.
3. Every server action re-checks the permission before calling a service.
   Nothing trusts the client, and nothing trusts the route guard.

Permissions are keyed strings (`sales:void`, `stock:arrivals:create`) attached
to roles in the database, so a new role is a data change rather than a code
change. Navigation is generated from the viewer's permissions.

### Money and time

Prices are `DECIMAL(12,2)` in Postgres and `Prisma.Decimal` in application code;
floating point is never used for arithmetic on money. Sale line items snapshot
the product's name, cost and selling price at the moment of sale, so editing a
product later does not rewrite history.

Timestamps are stored in UTC. "Today" and "this month" are resolved against
`NEXT_PUBLIC_BUSINESS_TIMEZONE`, so a shop's trading day does not depend on
where the server happens to run.

## Known gaps

- Sale numbers are allocated per business day from a counter row, which
  serialises sale creation briefly. Fine at multi-shop retail volume; it would
  need a different scheme at high throughput.
- Inter-shop transfers exist in the service layer and are covered by tests, but
  have no UI yet.
- There is no partial return or refund flow — only a full void.
- Password reset is owner-initiated; there is no self-service email reset.
