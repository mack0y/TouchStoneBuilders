# TouchStone Builders — Inventory & Sales Management

A lightweight, single-page inventory and sales management application built for a Philippine hardware store.

**Live site:** [mack0y.github.io/TouchStoneBuilders](https://mack0y.github.io/TouchStoneBuilders/)

---

## Tech Stack

- **React 19** + **Vite 8** — fast dev and build
- **Tailwind CSS v4** + **DaisyUI v5** — utility-first styling and components
- **React Router v7** — lazy-loaded client-side routing
- **Supabase** — PostgreSQL database + authentication
- **TanStack Table v8** — sortable, searchable, paginated data tables
- **Recharts** — sales trend area chart on dashboard
- **date-fns v4** — date formatting and filtering (PHT +08:00)
- **React Hook Form** + **Zod** — form validation

## Features

| Module | Description |
|--------|-------------|
| **Dashboard** | Live KPIs (total products, sales, customers), sales trend chart, low-stock alerts, top products, recent sales, quick action buttons |
| **Products** | Full CRUD with category filter, low-stock badge, SKU management |
| **Categories** | CRUD with product count per category |
| **Customers** | CRUD with sales history count |
| **Suppliers** | Admin-only CRUD with purchase history count |
| **Sales** | Create sales with product picker, cart, customer search, delivery info, discount; view invoices (print-friendly); refund and void support |
| **Inventory** | Bill of Materials (BOM) for multi-input products, unit conversions, SKU generation, purchase receiving, stock adjustments with reason tracking, movement log, CSV export |
| **Reports** | Sales, Inventory, and Profit & Loss tabs with summary cards, product breakdowns, CSV export per tab |
| **Users** | Admin-only user management — add, promote/demote, activate/deactivate |
| **Auth** | Login/logout with role-based route guards (guest, protected, admin) |

## Database

8 tables with row-level security, DB-level stock triggers (race-condition safe), and automatic invoice numbering (TB-####).

- `profiles` — extends `auth.users` with `role` (admin/worker) and `is_active`
- `categories`, `products` — product catalog with SKU and reorder levels
- `customers`, `suppliers` — contact management
- `sales`, `sale_items` — transactional sales with stock deduction
- `purchases` — stock replenishment tracking

## Project Structure

```
src/
├── App.jsx                 # Router, providers, route guards
├── main.jsx                # Entry point
├── lib/
│   └── supabaseClient.js   # Supabase client init
├── hooks/
│   ├── useAuth.jsx         # Auth context (login/logout/profile)
│   ├── useToast.jsx        # Toast notifications
│   ├── useProducts.js      # Products CRUD
│   ├── useCategories.js    # Categories CRUD
│   ├── useCustomers.js     # Customers CRUD
│   ├── useSuppliers.js     # Suppliers CRUD
│   ├── useSales.js         # Sales list/create/detail
│   ├── usePurchases.js     # Purchases list/create
│   ├── useDashboard.js     # Dashboard KPIs & charts
│   ├── useReports.js       # Sales/inventory/profit reports
│   └── useUsers.js         # User management
├── components/
│   ├── layout/AppLayout.jsx    # Sidebar + navbar + mobile nav
│   └── ui/                     # DataTable, Modal, ConfirmModal,
│                                # DateRangePicker, ErrorBoundary,
│                                # LoadingScreen, PageHeader
└── pages/                  # Dashboard, Products, Categories,
                             # Customers, Suppliers, Sales,
                             # SaleNew, SaleDetail, Inventory,
                             # Reports, Users, Login, NotFound
supabase/
├── schema.sql              # Full schema + triggers + seed data
├── reset.sql               # Drop all tables/functions/triggers
└── migration_users.sql     # is_active column + admin RPCs
```

## Local Development

1. **Clone and install**
   ```bash
   git clone https://github.com/mack0y/TouchStoneBuilders.git
   cd TouchStoneBuilders
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```
   `.env.example` has valid Supabase URL and anon key. Copy to `.env` to use.

3. **Run database schema**
   - Go to your Supabase project → SQL Editor
   - Run `supabase/schema.sql` (creates tables, triggers, RLS, seed data)
   - Run `supabase/migration_users.sql` (adds user management support)

4. **Start dev server**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   npm run preview
   ```

## Deployment

The app is deployed via GitHub Actions to GitHub Pages (see `.github/workflows/deploy.yml`). Pushes to `master` trigger automatic build and deploy. Supabase URL and anon key are passed as repository secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

## License

MIT
