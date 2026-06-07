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

**stock_adjustments** (NEW — Phase 11)
- `id` BIGINT GENERATED ALWAYS AS IDENTITY PK
- `product_id` BIGINT NOT NULL → products(id)
- `quantity_change` DECIMAL(12,3) NOT NULL — positive to add, negative to remove
- `reason` TEXT NOT NULL
- `user_id` UUID NOT NULL → profiles(id)
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
9. **`reverse_stock_on_purchase_delete`** — AFTER DELETE on `purchases`: subtracts quantity from stock
10. **`reverse_stock_on_adjustment_delete`** — AFTER DELETE on `stock_adjustments`: reverses the adjustment
11. **`adjust_stock` RPC** — Manual stock adjustment with audit trail

### Row Level Security (RLS)

All tables have RLS enabled. Helper function `is_admin()` checks `profiles.role = 'admin'` for the current user.

**Policy summary:**
- `profiles`: users read/update own; admins manage all. Self-update cannot change `role`.
- `categories`, `products`, `suppliers`: any authenticated user can read; only admins can insert/update/delete.
- `customers`: any authenticated user can read/insert/update; only admins can delete.
- `sales`: any authenticated user can read; users can only insert with `user_id = auth.uid()`; only admins can update/delete.
- `sale_items`: any authenticated user can read; users can only insert/update items belonging to their own sales; only admins can delete.
- `purchases`: any authenticated user can read; users can only insert with `user_id = auth.uid()`; only admins can update/delete.
- `stock_adjustments`: authenticated users can read/insert; only admins can delete.

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
├── package.json
├── memory.md
├── supabase/
│   ├── reset.sql
│   ├── schema.sql
│   ├── migration_users.sql
│   ├── migration_stock_adjustments.sql
│   └── migration_inventory_delete.sql
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── index.css
    ├── lib/
    │   ├── supabaseClient.js
    │   └── format.js
    ├── hooks/
    │   ├── useAuth.jsx
    │   ├── useProducts.js
    │   ├── useCategories.js
    │   ├── useCustomers.js
    │   ├── useSuppliers.js
    │   ├── useSales.js
    │   ├── usePurchases.js
    │   ├── useDashboard.js
    │   ├── useReports.js
    │   ├── useUsers.js
    │   ├── useInventory.js
    │   └── useToast.jsx
    ├── components/
    │   ├── layout/
    │   │   └── AppLayout.jsx
    │   └── ui/
    │       ├── PageHeader.jsx
    │       ├── LoadingScreen.jsx
    │       ├── DataTable.jsx
    │       ├── Modal.jsx
    │       ├── ConfirmModal.jsx
    │       ├── DateRangePicker.jsx
    │       └── ErrorBoundary.jsx
    └── pages/
        ├── Login.jsx
        ├── Dashboard.jsx
        ├── Products.jsx
        ├── Categories.jsx
        ├── Customers.jsx
        ├── Suppliers.jsx
        ├── Sales.jsx
        ├── SaleNew.jsx
        ├── SaleDetail.jsx
        ├── Purchases.jsx
        ├── PurchaseNew.jsx
        ├── Reports.jsx
        ├── Users.jsx
        ├── Inventory.jsx
        ├── NotFound.jsx
        └── PlaceholderPage.jsx
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
- Mobile-first responsive design with bottom nav bar for mobile users

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

### Phase 4 — Products & Categories CRUD ✓
- DataTable reusable component (TanStack Table v8: sortable, searchable, paginated, with ARIA attributes)
- Modal reusable component (DaisyUI dialog with ref-stable onClose, aria-labelledby)
- useProducts hook (CRUD with Supabase queries, error state, mountedRef unmount guard)
- useCategories hook (CRUD with `products(count)` join for product count)
- Products page: full CRUD, category filter, SKU/name/price/stock columns, low stock warning badge, admin-only Edit/Del/Add buttons, form with unit select and numeric validation
- Categories page: full CRUD, product count column, admin-only Edit/Del/Add, delete with FK constraint error handling
- Catches: null crash on edit (`String(product.price ?? '')`), NaN in numeric fields (`parseFloat || 0`), misleading delete error messages, "Page 1 of 0" in pagination, unmount memory leaks, silent hook errors
- Debug Agent reviewed and fixed: all 1 critical, 5 high, 5 medium issues resolved. Build passes with 0 errors.

### Phase 5 — Customers & Suppliers ✓
- useCustomers hook (CRUD with `sales(count)` join) and useSuppliers hook (CRUD with `purchases(count)` join)
- Customers page: full CRUD, sales count column, **Edit visible to all authenticated users, Del admin-only** (matches RLS intent), trimmed-name validation, friendly FK error on delete-with-sales, sortable count column, separate page/form error state
- Suppliers page: admin-only CRUD with in-page `isAdmin` defense-in-depth + "Access denied" fallback, purchases count column, friendly FK error on delete-with-purchases, textarea address for consistency
- Catches: Edit button incorrectly hidden for non-admins (contradicting RLS), no `isAdmin` gate on Suppliers (route-only defense), whitespace-only name accepted, non-sortable count columns, duplicate page/modal error alerts
- Debug Agent reviewed and fixed: 2 high, 3 medium, 3 low issues resolved. Build passes with 0 errors.

### Phase 6 — Sales ✓
- **Schema**: new `create_sale` RPC (transactional: sale + sale_items + stock check). `SECURITY INVOKER` so RLS applies; `user_id` taken from `auth.uid()` (no impersonation); input validation guards empty items and negative discount; stock check enforced by existing trigger with `SELECT FOR UPDATE` row lock; one tx rolls back on any item failure
- **useSales.js**: `useSales({startDate, endDate})` (list with PHT-aware date filter), `useSale(id)` (single + items, with numeric-id validation), `createSale(...)` (RPC caller, coerces `sale_id` to number)
- **Sales.jsx** (history): date range filter (auto-applies), invoice link → detail, total column sorts numerically (not as DECIMAL string), label `htmlFor` association, range in description ("from X to Y" etc.)
- **SaleNew.jsx** (new sale form): product search/picker with out-of-stock + low-stock badges, cart table with editable qty + oversell guard, customer dropdown (Walk-in supported) with loading state, discount input (clamped to ≥0), auto-calc subtotal/total with `round2()` to match DB `DECIMAL`, sticky summary panel, **double-click prevention via `savingRef`**, error cleared at top of confirm
- **SaleDetail.jsx** (invoice view): read-only invoice with header (invoice # + date + customer info), items table, totals; print button (CSS `@media print` hides sidebar/navbar/`.no-print` chrome); "New Sale" + "Back" actions
- Catches: timezone-naive date filter (8hr off in PHT), double-click duplicate sale risk, total column sorted as string, negative discount silently ignored, print included full app chrome, invalid IDs surfaced raw PG error, `create_sale` had no input validation, JS double arithmetic drift, BIGINT returned as string, dead `it.unit` fallback
- Debug Agent reviewed and fixed: 0 critical, 3 high, 6 medium, 9 low issues resolved. Build passes with 0 errors.

### Phase 7 — Purchases ✓
- **usePurchases.js** hook: `usePurchases({startDate, endDate})` (PHT-aware list + date filter), `createPurchase(...)` (inserts row, DB trigger auto-adds stock)
- **PurchaseNew.jsx**: searchable product picker (shows stock/cost), supplier dropdown, qty + unit cost inputs, auto-calc total, double-click prevention
- **Purchases.jsx**: history table with date range filter, search, sort (Date, Product, SKU, Supplier, Qty, Unit Cost, Total Cost)
- DB trigger `trg_purchases_add_stock` handles stock increment automatically

### Phase 8 — Dashboard (live) ✓
- **useDashboard.js** hook: fetches all 5 data sets in parallel with `Promise.all`
- KPI cards: total products, low stock count, today's sales count, today's revenue (real Supabase queries)
- Sales trend chart (Recharts AreaChart with gradient fill) — last 30 days, gaps filled with 0
- Top selling products (by quantity, aggregated from sale_items)
- Recent sales mini-table (last 5)
- Low stock alerts list (products where stock <= reorder_level, color-coded)
- PHT timezone handling via `toLocaleString('en-US', { timeZone: 'Asia/Manila' })`

### Phase 9 — Reports (Admin) ✓
- **DateRangePicker.jsx** reusable component: date inputs, preset buttons (Today/7d/30d/90d), Clear
- **useReports.js** hook: 3 reports in parallel:
  - Sales report: total sales count, revenue, discount, items sold, avg order value
  - Inventory report: product list with stock value at selling price and cost, low/out-of-stock counts
  - Profit report: revenue - COGS, margin %, top 10 products by profit
- **Reports.jsx**: tabs UI (Sales/Inventory/Profit & Loss), summary cards, full inventory table, top products by profit table
- CSV export on every tab via `convertToCSV()` + `downloadCSV()` utilities

### Phase 10 — User Management (Admin) ✓
- **migration_users.sql**: adds `is_active` column to profiles, `admin_create_user()` RPC (creates auth user via `SECURITY DEFINER`), `admin_toggle_user_active()` RPC
- **useUsers.js** hook: list profiles, RPC-based create/toggleActive, direct supabase update for role
- **Users.jsx**: table with Name/Email/Role/Status/Created, Promote/Demote buttons (disabled for self), Activate/Deactivate, Add User modal (email + password + name + role)

### Phase 11 — Inventory Management ✓
- **Stock Adjustments**: manual stock corrections with audit trail (reason + user attribution)
- **migration_stock_adjustments.sql**: `stock_adjustments` table, RLS policies, `adjust_stock` RPC
- **migration_inventory_delete.sql**: delete policies + reverse-stock triggers for purchases and adjustments
- **useInventory.js**: full CRUD — receiveStock, adjustStock, deletePurchase, deleteAdjustment, updateProduct, createProduct, createCategory, createSupplier, generateSku, movementLog
- **Inventory.jsx**: single hub for all stock activities with 4 prominent tabs:
  - **Add Inventory** — searchable product combobox (products only show when typing), 2-step new product wizard, inline new category/supplier creation
  - **Stock Levels** — full DataTable with category/status filters, per-row admin actions (Receive, Adjust, Edit)
  - **Adjust Stock** — inline form with reason field + recent adjustments list with delete
  - **History** — unified movement log combining purchases and adjustments

### Phase 12 — UI/UX Overhaul ✓
- **Visual Polish**: gradient branding, KPI card gradients, card hover effects, modal/toast animations, chart gradient fill, zebra striping, search icons
- **Mobile-Friendly**: fixed bottom navigation bar (5 items), card view for tables on small screens, touch-friendly targets, safe area insets, stacked layouts
- **Component Upgrades**: typed toast notifications, animated confirm modals, branded loading screen, branded error boundary
- **Dashboard Quick Actions**: New Sale, Stock In (now Inventory), Inventory buttons for one-click access

### Phase 13 — Non-Tech User UX ✓
- **Auto-SKU Generation**: item codes auto-generated from category (e.g., CMT-001, PLB-003)
- **2-Step Product Wizard**: Step 1 (name + category + unit) → Step 2 (pricing + delivery details)
- **Searchable Product Combobox**: products only appear when typing, not all at once
- **Plain Language Labels**: "What product are you receiving?", "How many did you receive?", "Cost per piece from supplier"
- **Skip Options**: "I don't know the selling price yet" checkbox with edit-later note
- **Visual Category Dropdown**: bigger select-lg with emoji icons
- **New Category/Supplier Creation**: inline forms from the Add Inventory wizard
- **Clear Price Labels**: "Selling Price — What your customers pay" vs "Cost per piece from supplier — What the supplier charges"
- **Error Handling**: user-friendly messages for 403 Forbidden on category/supplier creation

### Phase 14 — UI/UX Refinement & Bug Fixes ✓
- **Professional UI Redesign**: navy (#1e3a5f) corporate theme, clean KPI cards with left accent borders, removed gradient/glass/bouncy effects, replaced emojis with SVG icons, consistent slate color palette
- **Confirmation Dialogs**: all critical transactions (sales, stock receipt, stock adjustment) now show summary dialogs before execution. Delete operations use danger-styled confirm modals
- **Number Input Step Fix**: arrow keys on price/quantity inputs now increment by ₱1/1 unit instead of ₱0.01/0.001
- **create_sale RPC Fix**: renamed output parameters (`out_sale_id`, `out_inv_no`, `out_sale_total`) to avoid ambiguous column reference with `sales.invoice_no` in RETURNING clause. Added `DROP FUNCTION` to migration.

---

## Key Design Decisions & Rationale

1. **Immediate sales (no payment method)** — All sales are recorded as completed. Stock deducts immediately. No accounts receivable tracking. Simpler for a small hardware store that primarily takes cash.

2. **Invoice format TB-0001** — Store prefix + zero-padded sequential number. Generated by PostgreSQL sequence/trigger (not application code) for atomicity. Sequence gaps on rollback are acceptable.

3. **No tax column** — Philippine hardware stores often quote prices inclusive of VAT. Tax can be added later if needed.

4. **Stock triggers at DB level** — Stock is adjusted via PostgreSQL triggers on sale_items and purchases. This ensures stock is always consistent even if the application has a bug or if data is modified directly.

5. **Row-level locks (SELECT FOR UPDATE)** — Prevents race conditions when two cashiers sell the same product simultaneously. One transaction will wait for the other.

6. **Role in profiles table (not JWT)** — The `is_admin()` function queries the `profiles` table rather than relying on JWT claims. This makes role changes effective immediately without requiring re-login.

7. **Self-elevation prevented** — The profile UPDATE policy checks that a non-admin user cannot change their own role. Only admins can change roles.

8. **Inventory as single hub** — All stock activities (add, adjust, view) consolidated into one tabbed Inventory page instead of separate pages. Users don't need to navigate between multiple pages for stock management.

9. **Auto-SKU from category** — Non-tech users don't understand SKUs. Auto-generating from category abbreviation + sequence number (CMT-001) removes this burden while keeping codes meaningful.

10. **Cost flows from delivery receipt** — The product's cost price is auto-set from the delivery receipt's unit cost. No separate "cost" field needed — the delivery receipt IS the source of truth.

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
4. Run `supabase/migration_users.sql` (for user management features)
5. Run `supabase/migration_stock_adjustments.sql` (for inventory adjustments)
6. Run `supabase/migration_inventory_delete.sql` (for delete + reverse-stock triggers)
7. Run `supabase/migration_fix_create_sale.sql` (fixes ambiguous column reference in create_sale RPC)

### First Admin User

1. Create a user in Supabase Dashboard → Authentication → Users → Add User
2. In SQL Editor, run: `UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';`
