# TouchStone Builders — Project Memory

## Overview

A lightweight inventory & sales web app for a Philippine hardware and construction supply store. Built as a Single Page Application (SPA) with React + Vite, styled with Tailwind CSS v4 + DaisyUI v5, backed by Supabase (PostgreSQL + Auth).

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 19 + Vite 8 | Fast dev, small bundle, huge ecosystem |
| Styling | Tailwind CSS v4 + DaisyUI v5 | Utility-first, pre-built components, fast UI |
| Routing | React Router v7 | Standard SPA routing |
| Forms | React Hook Form + Zod | Lightweight form handling + schema validation |
| Tables | TanStack Table v8 | Headless, sortable, filterable, paginated |
| Charts | Recharts | Simple React-native chart components |
| Dates | date-fns v4 | Lightweight date formatting/manipulation |
| Backend/Database | Supabase (PostgreSQL) | Auth, DB, RLS, realtime — all-in-one |
| Auth | Supabase Auth (email/password) | Built-in, JWT-based, session management |
| Hosting | Vercel / Netlify (static build) | Free tier, simple deploy from `npm run build` |

---

## Development Workflow

Every phase follows this strict sequence:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  1. CODE     │ ──→ │  2. TEST      │ ──→ │  3. DEBUG     │
│  (I build)   │     │  (npm run build │     │  Agent        │
│              │     │   + console)  │     │  reviews)     │
└─────────────┘     └──────────────┘     └──────────────┘
                                               │
                                               ↓
                                        ┌──────────────┐
                                        │  REPORT       │
                                        │  bugs → fix   │
                                        │  → loop       │
                                        └──────────────┘
```

**Rules:**
- Every phase must pass `npm run build` (0 errors, 0 warnings) before moving on.
- After the build passes, a dedicated **Debug Agent** thoroughly reviews all new/modified code.
- The Debug Agent checks: runtime errors, logic bugs, security gaps, RLS issues, accessibility, React anti-patterns, Tailwind/DaisyUI compatibility, edge cases.
- All reported issues (critical/high/medium) must be fixed before proceeding to the next phase.
- No code is committed until the user explicitly asks.

---

## Branching & Commits

- The repo has no .git (not initialized). Only commit when explicitly asked.
- Commit messages should be concise and match the style of the existing log if initialized.

---

## Database Schema (Supabase PostgreSQL)

### Tables

All tables are in the `public` schema. All use `CREATE TABLE IF NOT EXISTS` for idempotent re-runs.

**profiles** — extends Supabase Auth users
- `id` UUID PK → `auth.users(id) ON DELETE CASCADE`
- `email` TEXT
- `full_name` TEXT NOT NULL
- `role` TEXT NOT NULL DEFAULT 'worker' CHECK ('admin','worker')
- `created_at` TIMESTAMPTZ

**categories**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `name` TEXT NOT NULL UNIQUE
- `description` TEXT
- `created_at` TIMESTAMPTZ

**products**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `sku` TEXT NOT NULL UNIQUE
- `name` TEXT NOT NULL
- `description` TEXT
- `category_id` BIGINT → categories(id)
- `unit` TEXT NOT NULL DEFAULT 'pcs' (e.g. pcs, kg, sack, meter, liter, sheet, box, pack, set, gallon, roll, bd.ft, cu.m, pair)
- `price` DECIMAL(12,2) ≥ 0 — selling price in PHP
- `cost` DECIMAL(12,2) ≥ 0 — cost price in PHP
- `stock_quantity` DECIMAL(12,3) ≥ 0 DEFAULT 0
- `reorder_level` DECIMAL(12,3) ≥ 0 DEFAULT 0 — alert when stock ≤ this
- `image_url` TEXT
- `created_at` TIMESTAMPTZ
- `updated_at` TIMESTAMPTZ (auto-updated via trigger)

**customers**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `name` TEXT NOT NULL
- `phone` TEXT
- `email` TEXT
- `address` TEXT
- `created_at` TIMESTAMPTZ

**suppliers**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `name` TEXT NOT NULL UNIQUE
- `contact_person` TEXT
- `phone` TEXT
- `email` TEXT
- `address` TEXT
- `created_at` TIMESTAMPTZ

**sales**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `invoice_no` TEXT NOT NULL UNIQUE (auto-generated: TB-0001, TB-0002...)
- `customer_id` BIGINT → customers(id)
- `user_id` UUID NOT NULL → profiles(id) ON DELETE CASCADE
- `subtotal` DECIMAL(12,2) ≥ 0
- `discount` DECIMAL(12,2) ≥ 0 DEFAULT 0
- `total` DECIMAL(12,2) ≥ 0
- `created_at` TIMESTAMPTZ

**sale_items**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `sale_id` BIGINT NOT NULL → sales(id) ON DELETE CASCADE
- `product_id` BIGINT NOT NULL → products(id)
- `quantity` DECIMAL(12,3) > 0
- `unit_price` DECIMAL(12,2) ≥ 0 — price at time of sale
- `subtotal` DECIMAL(12,2) ≥ 0

**purchases**
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `product_id` BIGINT NOT NULL → products(id)
- `supplier_id` BIGINT → suppliers(id)
- `user_id` UUID NOT NULL → profiles(id) ON DELETE CASCADE
- `quantity` DECIMAL(12,3) > 0
- `unit_cost` DECIMAL(12,2) ≥ 0
- `total_cost` DECIMAL(12,2) ≥ 0
- `created_at` TIMESTAMPTZ

### Indexes

All foreign keys and commonly-queried columns are indexed: product name, SKU, category, sale created_at, invoice_no, sale_items(product_id + sale_id), purchases(product_id + supplier_id + user_id), customer name, sales(customer_id + user_id).

### Triggers

1. **`update_updated_at`** — BEFORE UPDATE on `products`: sets `updated_at = NOW()`
2. **`handle_new_user`** — AFTER INSERT on `auth.users`: auto-creates a profile row
3. **`generate_invoice_no`** — BEFORE INSERT on `sales`: sets `invoice_no = 'TB-' || LPAD(nextval, 4, '0')`
4. **`check_and_deduct_stock`** — BEFORE INSERT on `sale_items`: checks stock (with `SELECT FOR UPDATE` row lock) and deducts
5. **`adjust_stock_on_sale_item_update`** — AFTER UPDATE on `sale_items`: adjusts stock by quantity diff
6. **`restore_stock_on_sale_item_delete`** — AFTER DELETE on `sale_items`: adds stock back
7. **`add_stock_on_purchase`** — AFTER INSERT on `purchases`: adds quantity to product stock
8. **`adjust_stock_on_purchase_update`** — AFTER UPDATE on `purchases`: adjusts stock by diff

### Row Level Security (RLS)

All tables have RLS enabled. Helper function `is_admin()` checks `profiles.role = 'admin'` for the current user.

**Policy summary:**
- `profiles`: users read/update own; admins manage all. Self-update cannot change `role`.
- `categories`, `products`, `suppliers`: any authenticated user can read; only admins can insert/update/delete.
- `customers`: any authenticated user can read/insert/update; only admins can delete.
- `sales`: any authenticated user can read; users can only insert with `user_id = auth.uid()`; only admins can update/delete.
- `sale_items`: any authenticated user can read; users can only insert/update items belonging to their own sales; only admins can delete.
- `purchases`: any authenticated user can read; users can only insert with `user_id = auth.uid()`; only admins can update/delete.

### Seed Data

- 10 categories (Lumber, Cement, Roofing, Plumbing, Electrical, Paint, Hardware, Tools, Tiles, Doors)
- 49 products covering all categories with realistic prices and stock
- 5 sample customers (Filipino names, PH addresses)
- 10 sample suppliers (PH-based)

---

## Project Structure

```
touchstone-builders/
├── index.html
├── vite.config.js
├── .env.example              # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── package.json
├── memory.md
├── supabase/
│   ├── reset.sql              # Drops everything, safe re-run
│   └── schema.sql             # Full schema + seed (idempotent)
└── src/
    ├── main.jsx               # Entry point
    ├── App.jsx                # Router + route guards
    ├── index.css              # Tailwind v4 + DaisyUI v5 imports
    ├── lib/
    │   └── supabaseClient.js  # Supabase client from env vars
    ├── hooks/
    │   └── useAuth.jsx        # Auth context + provider
    ├── components/
    │   ├── layout/
    │   │   └── AppLayout.jsx  # Responsive sidebar + navbar
    │   └── ui/
    │       ├── PageHeader.jsx
    │       └── LoadingScreen.jsx
    └── pages/
        ├── Login.jsx          # Email/password form
        ├── Dashboard.jsx      # KPI cards + recent sales + alerts
        ├── NotFound.jsx       # 404 page
        └── PlaceholderPage.jsx# Generic "Coming soon" page
```

---

## Auth Flow

1. **Login**: User submits email/password → `supabase.auth.signInWithPassword()` → JWT session stored by Supabase
2. **Session persistence**: On app mount, `supabase.auth.getSession()` restores existing session + fetches profile from `profiles` table
3. **Auth state changes**: `supabase.auth.onAuthStateChange()` listener keeps context in sync
4. **Route guards**:
   - `GuestRoute` — redirects authenticated users to `/`
   - `ProtectedRoute` — redirects unauthenticated users to `/login`
   - `AdminRoute` — redirects non-admin users to `/`
5. **Loading state**: `loading = true` until both session AND profile fetch resolve. Prevents flash of wrong content.

---

## Coding Conventions

### General
- No comments in code unless absolutely necessary (e.g., complex business logic).
- Use concise variable/function names. Prefer clarity over brevity.
- No emojis in production code (removed from AppLayout in Phase 3).

### React
- React 19 — use hooks, functional components
- No class components
- Default exports for pages, named exports for hooks/utils
- Destructure props at component top
- Use `async/await` for data fetching, `.catch()` for error boundaries
- All `.map()` calls must have unique `key` props

### Styling (Tailwind v4 + DaisyUI v5)
- Use DaisyUI components (`card`, `btn`, `input`, `table`, `modal`, `alert`, `badge`, `drawer`, `navbar`, `menu`, `avatar`, `loading`, `tooltip`)
- Tailwind v4 uses `@import "tailwindcss"` and `@plugin "daisyui"` in CSS
- No `tailwind.config.js` (v4 uses CSS-based config via `@theme`)
- Color opacity uses `/` syntax: `bg-primary/20`, NOT `bg-opacity-20`
- Sizing: use Tailwind's scale (`w-64` for 16rem). Use arbitrary values (`w-[4.5rem]`) only when scale doesn't support it
- Avoid `w-18` — not in Tailwind v4 scale. Use `w-[4.5rem]` instead

### Accessibility
- Interactive elements must have `aria-label` if they use icon-only buttons
- Decorative SVGs must have `aria-hidden="true"`
- Loading states need `role="status"` and `aria-label`
- Error/alert states need `role="alert"`
- Sidebar should have `aria-label="Sidebar navigation"`
- Use semantic HTML (`<main>`, `<nav>`, `<aside>`, `<header>`) where appropriate

### Supabase
- Client initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` env vars
- RLS handles authorization at the DB level — never trust client-side role alone
- Use `.single()` for unique row queries, handle `error` return from Supabase responses
- For transactions (sale + sale_items), rely on DB-level foreign keys and triggers — the app inserts a sale, gets the id, inserts sale_items, and DB triggers handle stock/invoice

---

## Completed Phases

### Phase 1 — Scaffold + Auth ✓
- Vite React project created
- All dependencies installed
- Tailwind v4 + DaisyUI v5 configured
- Supabase client lib
- Auth context with session management, profile fetch, login/logout
- Login page with error handling
- Route guards (guest, protected, admin)
- Debug Agent reviewed and fixed: loading-before-profile race condition, silent error swallowing, logout state cleanup, duplicate profile fetch

### Phase 2 — Database Schema ✓
- Full schema with 8 tables, indexes, triggers, RLS policies
- Idempotent (IF NOT EXISTS, DROP IF EXISTS patterns)
- Seed data for demo/testing
- Debug Agent reviewed and fixed: stock check before deduction, RLS self-elevation vulnerability, impersonation via user_id, NULL email crash, missing ON DELETE CASCADE, missing indexes, concurrent stock race condition
- reset.sql created for clean re-deploys

### Phase 3 — Layout & Navigation ✓
- Responsive AppLayout with sidebar (DaisyUI drawer)
- Desktop sidebar collapse/expand toggle (state-based, stored in local state)
- SVG icons (Heroicons-style) replacing emojis
- Top navbar with user avatar and logout on all screen sizes
- PageHeader reusable component (title + description + actions)
- LoadingScreen component (centered spinner with ARIA)
- 404 NotFound page
- PlaceholderPage for coming-soon routes
- Dashboard with 4 stat cards (placeholder values) + Recent Sales / Low Stock panels
- Debug Agent reviewed and fixed: Tailwind v4 incompatibilities (w-18, bg-opacity-20), missing ARIA labels, decorative icon accessibility

---

## Remaining Phases

### Phase 4 — Products & Categories CRUD
- [ ] DataTable reusable component (TanStack Table: sortable, searchable, paginated)
- [ ] Products page — fetch from Supabase, display in DataTable
- [ ] Add/Edit product modal with React Hook Form + Zod validation
- [ ] Delete product with confirmation
- [ ] Category management (inline in products page or separate modal)
- [ ] Low stock badge (reorder level comparison)
- [ ] Search by name/SKU, filter by category
- [ ] Debug Agent review

### Phase 5 — Customers & Suppliers
- [ ] Customer list page + add/edit modal
- [ ] Supplier list page + add/edit modal
- [ ] Search/filter on both tables
- [ ] Debug Agent review

### Phase 6 — Sales
- [ ] New Sale page: product search/select, line items table, auto-calc totals
- [ ] Customer quick-select dropdown
- [ ] Discount input
- [ ] Confirm sale → inserts sale + items (DB handles stock + invoice number)
- [ ] Sales history page with date range filter
- [ ] Invoice view (read-only detail of a sale)
- [ ] Debug Agent review

### Phase 7 — Purchases
- [ ] New Purchase form: select product, supplier, qty, unit cost
- [ ] Auto-calculates total cost, DB trigger adds to stock
- [ ] Purchase history table
- [ ] Debug Agent review

### Phase 8 — Dashboard (live)
- [ ] KPI cards: total products, low stock count, today's sales count, today's revenue (real Supabase queries)
- [ ] Sales trend chart (Recharts) — last 30 days
- [ ] Low stock alerts list (products where stock <= reorder_level)
- [ ] Recent sales mini-table
- [ ] Top selling products (by quantity)
- [ ] Debug Agent review

### Phase 9 — Reports (Admin)
- [ ] Date range picker component
- [ ] Sales report: total, count, items sold, by date range
- [ ] Inventory report: stock on hand, stock value
- [ ] Profit report: total revenue - COGS (sum of cost of goods sold)
- [ ] CSV export
- [ ] Debug Agent review

### Phase 10 — User Management (Admin)
- [ ] Worker list table
- [ ] Add worker form (creates auth user + profile via Supabase Admin API)
- [ ] Toggle active/inactive
- [ ] Edit role
- [ ] Debug Agent review

---

## Key Design Decisions & Rationale

1. **Immediate sales (no payment method)** — All sales are recorded as completed. Stock deducts immediately. No accounts receivable tracking. Simpler for a small hardware store that primarily takes cash.

2. **Invoice format TB-0001** — Store prefix + zero-padded sequential number. Generated by PostgreSQL sequence/trigger (not application code) for atomicity. Sequence gaps on rollback are acceptable.

3. **No tax column** — Philippine hardware stores often quote prices inclusive of VAT. Tax can be added later if needed.

4. **Stock triggers at DB level** — Stock is adjusted via PostgreSQL triggers on sale_items and purchases. This ensures stock is always consistent even if the application has a bug or if data is modified directly.

5. **Row-level locks (SELECT FOR UPDATE)** — Prevents race conditions when two cashiers sell the same product simultaneously. One transaction will wait for the other.

6. **Role in profiles table (not JWT)** — The `is_admin()` function queries the `profiles` table rather than relying on JWT claims. This makes role changes effective immediately without requiring re-login.

7. **Self-elevation prevented** — The profile UPDATE policy checks that a non-admin user cannot change their own role. Only admins can change roles.

---

## Running the App

```bash
cd touchstone-builders

# Set up env vars
# Create .env with:
#   VITE_SUPABASE_URL=https://your-project.supabase.co
#   VITE_SUPABASE_ANON_KEY=your-anon-key

# Dev
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

### Deploying Database

1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/reset.sql` (or skip if first time)
3. Run `supabase/schema.sql`

### First Admin User

1. Create a user in Supabase Dashboard → Authentication → Users → Add User
2. In SQL Editor, run: `UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';`
