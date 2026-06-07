-- =============================================
-- TouchStone Builders — Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

-- 0. Sequence for invoice numbering
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

-- 1. TABLES (all use IF NOT EXISTS for safe re-runs)

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id BIGINT REFERENCES categories(id),
  unit TEXT NOT NULL DEFAULT 'pcs',
  price DECIMAL(12,2) NOT NULL CHECK (price >= 0),
  cost DECIMAL(12,2) NOT NULL CHECK (cost >= 0),
  stock_quantity DECIMAL(12,3) NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reorder_level DECIMAL(12,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id BIGINT REFERENCES customers(id),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0),
  discount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  total DECIMAL(12,2) NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sale_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal DECIMAL(12,2) NOT NULL CHECK (subtotal >= 0)
);

CREATE TABLE IF NOT EXISTS purchases (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  supplier_id BIGINT REFERENCES suppliers(id),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity DECIMAL(12,3) NOT NULL CHECK (quantity > 0),
  unit_cost DECIMAL(12,2) NOT NULL CHECK (unit_cost >= 0),
  total_cost DECIMAL(12,2) NOT NULL CHECK (total_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. INDEXES

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_no);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_product ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_user ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- 3. AUTO UPDATE updated_at

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 4. AUTO PROFILE ON USER SIGNUP

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 5. AUTO INVOICE NUMBER

CREATE OR REPLACE FUNCTION generate_invoice_no()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.invoice_no := 'TB-' || LPAD(NEXTVAL('sale_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_invoice_no ON sales;
CREATE TRIGGER trg_sales_invoice_no
  BEFORE INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION generate_invoice_no();

-- 6. STOCK MANAGEMENT TRIGGERS

-- Check stock and deduct on sale (BEFORE INSERT with row lock to prevent race conditions)
CREATE OR REPLACE FUNCTION check_and_deduct_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  available DECIMAL(12,3);
  product_name TEXT;
BEGIN
  SELECT stock_quantity, name INTO available, product_name
  FROM products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF available < NEW.quantity THEN
    RAISE EXCEPTION 'Insufficient stock for "%". Available: %, requested: %',
      product_name, available, NEW.quantity;
  END IF;

  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_items_check_and_deduct ON sale_items;
CREATE TRIGGER trg_sale_items_check_and_deduct
  BEFORE INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION check_and_deduct_stock();

-- Adjust stock when sale item quantity changes
CREATE OR REPLACE FUNCTION adjust_stock_on_sale_item_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  diff DECIMAL(12,3);
  available DECIMAL(12,3);
  product_name TEXT;
BEGIN
  diff := NEW.quantity - OLD.quantity;

  IF diff > 0 THEN
    SELECT stock_quantity, name INTO available, product_name
    FROM products
    WHERE id = NEW.product_id
    FOR UPDATE;

    IF available < diff THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %, additional needed: %',
        product_name, available, diff;
    END IF;
  END IF;

  UPDATE products
  SET stock_quantity = stock_quantity - diff
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_items_adjust_stock ON sale_items;
CREATE TRIGGER trg_sale_items_adjust_stock
  AFTER UPDATE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION adjust_stock_on_sale_item_update();

-- Restore stock on sale item delete (e.g. void/cancel)
CREATE OR REPLACE FUNCTION restore_stock_on_sale_item_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + OLD.quantity
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_sale_items_restore_stock ON sale_items;
CREATE TRIGGER trg_sale_items_restore_stock
  AFTER DELETE ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION restore_stock_on_sale_item_delete();

-- Add stock on purchase
CREATE OR REPLACE FUNCTION add_stock_on_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity + NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchases_add_stock ON purchases;
CREATE TRIGGER trg_purchases_add_stock
  AFTER INSERT ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION add_stock_on_purchase();

-- Adjust stock when purchase quantity changes
CREATE OR REPLACE FUNCTION adjust_stock_on_purchase_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  diff DECIMAL(12,3);
BEGIN
  diff := NEW.quantity - OLD.quantity;
  UPDATE products
  SET stock_quantity = stock_quantity + diff
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchases_adjust_stock ON purchases;
CREATE TRIGGER trg_purchases_adjust_stock
  AFTER UPDATE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION adjust_stock_on_purchase_update();

-- 7. ROW LEVEL SECURITY

-- Helper: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all profiles" ON profiles;
CREATE POLICY "Admins can manage all profiles"
  ON profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- CATEGORIES
DROP POLICY IF EXISTS "Anyone can read categories" ON categories;
CREATE POLICY "Anyone can read categories"
  ON categories FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage categories" ON categories;
CREATE POLICY "Admins can manage categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete categories" ON categories;
CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin());

-- PRODUCTS
DROP POLICY IF EXISTS "Anyone can read products" ON products;
CREATE POLICY "Anyone can read products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage products" ON products;
CREATE POLICY "Admins can manage products"
  ON products FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products"
  ON products FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products"
  ON products FOR DELETE
  USING (is_admin());

-- CUSTOMERS
DROP POLICY IF EXISTS "Anyone can read customers" ON customers;
CREATE POLICY "Anyone can read customers"
  ON customers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can insert customers" ON customers;
CREATE POLICY "Anyone can insert customers"
  ON customers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can update customers" ON customers;
CREATE POLICY "Anyone can update customers"
  ON customers FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can delete customers" ON customers;
CREATE POLICY "Admins can delete customers"
  ON customers FOR DELETE
  USING (is_admin());

-- SUPPLIERS
DROP POLICY IF EXISTS "Anyone can read suppliers" ON suppliers;
CREATE POLICY "Anyone can read suppliers"
  ON suppliers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage suppliers" ON suppliers;
CREATE POLICY "Admins can manage suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update suppliers" ON suppliers;
CREATE POLICY "Admins can update suppliers"
  ON suppliers FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete suppliers" ON suppliers;
CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  USING (is_admin());

-- SALES
DROP POLICY IF EXISTS "Anyone can read sales" ON sales;
CREATE POLICY "Anyone can read sales"
  ON sales FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can insert own sales" ON sales;
CREATE POLICY "Anyone can insert own sales"
  ON sales FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update sales" ON sales;
CREATE POLICY "Admins can update sales"
  ON sales FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete sales" ON sales;
CREATE POLICY "Admins can delete sales"
  ON sales FOR DELETE
  USING (is_admin());

-- SALE ITEMS
DROP POLICY IF EXISTS "Anyone can read sale_items" ON sale_items;
CREATE POLICY "Anyone can read sale_items"
  ON sale_items FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can insert sale_items" ON sale_items;
CREATE POLICY "Anyone can insert sale_items"
  ON sale_items FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sales
      WHERE id = sale_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can update own sale_items" ON sale_items;
CREATE POLICY "Anyone can update own sale_items"
  ON sale_items FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM sales WHERE id = sale_id AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can delete sale_items" ON sale_items;
CREATE POLICY "Admins can delete sale_items"
  ON sale_items FOR DELETE
  USING (is_admin());

-- PURCHASES
DROP POLICY IF EXISTS "Anyone can read purchases" ON purchases;
CREATE POLICY "Anyone can read purchases"
  ON purchases FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can insert own purchases" ON purchases;
CREATE POLICY "Anyone can insert own purchases"
  ON purchases FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can update purchases" ON purchases;
CREATE POLICY "Admins can update purchases"
  ON purchases FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete purchases" ON purchases;
CREATE POLICY "Admins can delete purchases"
  ON purchases FOR DELETE
  USING (is_admin());

-- 8. SEED DATA (safe to re-run — guarded by existence checks)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM categories) THEN
    INSERT INTO categories (name, description) VALUES
      ('Lumber & Plywood', 'Lumber, plywood, and wood products'),
      ('Cement & Aggregates', 'Cement, sand, gravel, and concrete products'),
      ('Roofing', 'Roofing sheets, gutters, and accessories'),
      ('Plumbing', 'Pipes, fittings, valves, and plumbing supplies'),
      ('Electrical', 'Wires, switches, outlets, and electrical supplies'),
      ('Paint & Coatings', 'Paint, thinner, brushes, and painting tools'),
      ('Hardware & Fasteners', 'Nails, screws, bolts, and general hardware'),
      ('Tools', 'Hand tools and power tools'),
      ('Tiles & Flooring', 'Ceramic tiles, vinyl, and flooring materials'),
      ('Doors & Windows', 'Doors, windows, and door hardware');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM products) THEN
    INSERT INTO products (sku, name, description, category_id, unit, price, cost, stock_quantity, reorder_level) VALUES
      ('LBR-001', 'Good Lumber 2x2x10', 'Kiln-dried good lumber 2 inches by 2 inches by 10 feet', 1, 'bd.ft', 28.00, 18.00, 500, 100),
      ('LBR-002', 'Good Lumber 2x3x10', 'Kiln-dried good lumber 2x3x10 feet', 1, 'bd.ft', 35.00, 22.00, 400, 100),
      ('LBR-003', 'Plywood 1/4" 4x8', 'Standard marine plywood 1/4 inch thickness', 1, 'sheet', 520.00, 380.00, 80, 15),
      ('LBR-004', 'Plywood 1/2" 4x8', 'Standard marine plywood 1/2 inch thickness', 1, 'sheet', 780.00, 550.00, 60, 10),
      ('CMT-001', 'Portland Cement 40kg', 'Type 1 Portland cement, 40kg bag', 2, 'sack', 250.00, 190.00, 200, 50),
      ('CMT-002', 'Portland Cement 50kg', 'Type 1 Portland cement, 50kg bag', 2, 'sack', 310.00, 235.00, 150, 40),
      ('CMT-003', 'Washed Sand', 'Fine washed sand for construction', 2, 'cu.m', 1200.00, 800.00, 30, 10),
      ('CMT-004', 'Gravel 3/4"', 'Crushed gravel 3/4 inch', 2, 'cu.m', 1400.00, 950.00, 25, 10),
      ('CMT-005', 'CHB 4"', 'Concrete hollow block 4 inches', 2, 'pcs', 18.00, 12.00, 1000, 200),
      ('CMT-006', 'CHB 6"', 'Concrete hollow block 6 inches', 2, 'pcs', 22.00, 15.00, 800, 200),
      ('RFG-001', 'GI Corrugated Roofing 0.4mm', 'Galvanized iron corrugated sheet 0.4mm thickness, 8ft', 3, 'sheet', 380.00, 280.00, 100, 20),
      ('RFG-002', 'GI Corrugated Roofing 0.5mm', 'Galvanized iron corrugated sheet 0.5mm thickness, 8ft', 3, 'sheet', 480.00, 350.00, 80, 15),
      ('RFG-003', 'Ridge Roll 0.4mm', 'Galvanized ridge roll 0.4mm, 8ft', 3, 'pcs', 280.00, 200.00, 50, 10),
      ('PLB-001', 'PVC Pipe 1/2" x 10ft', 'Standard PVC pipe, 1/2 inch diameter, 10 feet', 4, 'pcs', 85.00, 55.00, 200, 40),
      ('PLB-002', 'PVC Pipe 3/4" x 10ft', 'Standard PVC pipe, 3/4 inch diameter, 10 feet', 4, 'pcs', 120.00, 78.00, 150, 30),
      ('PLB-003', 'PVC Pipe 1" x 10ft', 'Standard PVC pipe, 1 inch diameter, 10 feet', 4, 'pcs', 160.00, 105.00, 120, 25),
      ('PLB-004', 'PVC Elbow 1/2"', 'PVC 90-degree elbow, 1/2 inch', 4, 'pcs', 12.00, 6.00, 500, 100),
      ('PLB-005', 'Faucet Standard 1/2"', 'Brass standard faucet, 1/2 inch', 4, 'pcs', 180.00, 120.00, 60, 15),
      ('ELC-001', 'THHN Wire #12 (100m)', 'THHN stranded copper wire, gauge 12, 100 meter roll', 5, 'roll', 1850.00, 1350.00, 30, 8),
      ('ELC-002', 'THHN Wire #14 (100m)', 'THHN stranded copper wire, gauge 14, 100 meter roll', 5, 'roll', 1250.00, 900.00, 35, 8),
      ('ELC-003', 'Switch Universal', 'Universal flush switch, white', 5, 'pcs', 45.00, 28.00, 300, 60),
      ('ELC-004', 'Outlet Universal', 'Universal flush outlet, white', 5, 'pcs', 55.00, 35.00, 250, 50),
      ('ELC-005', 'LED Bulb 10W', 'LED bulb 10 watts, warm white', 5, 'pcs', 65.00, 40.00, 400, 80),
      ('ELC-006', 'LED Bulb 15W', 'LED bulb 15 watts, daylight', 5, 'pcs', 85.00, 55.00, 350, 70),
      ('PNT-001', 'Latex Paint White 1L', 'Water-based latex paint, white, 1 liter', 6, 'liter', 180.00, 120.00, 80, 20),
      ('PNT-002', 'Latex Paint White 4L', 'Water-based latex paint, white, 4 liters', 6, 'gallon', 580.00, 400.00, 50, 10),
      ('PNT-003', 'Quick Drying Enamel 1L', 'Quick drying enamel paint, assorted colors, 1 liter', 6, 'liter', 210.00, 145.00, 60, 15),
      ('PNT-004', 'Paintbrush 2"', 'Nylon paintbrush, 2 inches', 6, 'pcs', 45.00, 25.00, 100, 25),
      ('PNT-005', 'Paintbrush 4"', 'Nylon paintbrush, 4 inches', 6, 'pcs', 85.00, 50.00, 80, 20),
      ('PNT-006', 'Paint Thinner 1L', 'Standard paint thinner, 1 liter', 6, 'liter', 95.00, 60.00, 60, 15),
      ('HRD-001', 'Common Nails 1"', 'Common wire nails, 1 inch, per kilo', 7, 'kg', 60.00, 38.00, 100, 25),
      ('HRD-002', 'Common Nails 2"', 'Common wire nails, 2 inches, per kilo', 7, 'kg', 55.00, 35.00, 100, 25),
      ('HRD-003', 'Common Nails 3"', 'Common wire nails, 3 inches (casing nails), per kilo', 7, 'kg', 55.00, 35.00, 80, 20),
      ('HRD-004', 'Wood Screws #8 x 1"', 'Stainless wood screws #8 x 1 inch, per pack of 50', 7, 'pack', 45.00, 28.00, 150, 30),
      ('HRD-005', 'Wood Screws #10 x 2"', 'Stainless wood screws #10 x 2 inches, per pack of 50', 7, 'pack', 55.00, 35.00, 120, 25),
      ('HRD-006', 'GI Tie Wire #16', 'GI tie wire gauge 16, per kilo', 7, 'kg', 85.00, 55.00, 80, 20),
      ('TL-001', 'Claw Hammer 16oz', 'Drop forged claw hammer, 16 ounces, with fiber handle', 8, 'pcs', 250.00, 165.00, 40, 10),
      ('TL-002', 'Measuring Tape 5m', 'Steel measuring tape, 5 meters, 1 inch width', 8, 'pcs', 120.00, 75.00, 50, 15),
      ('TL-003', 'Hacksaw 12"', 'Adjustable hacksaw frame, 12 inches', 8, 'pcs', 180.00, 115.00, 35, 10),
      ('TL-004', 'Level Bar 24"', 'Aluminum level bar, 24 inches', 8, 'pcs', 220.00, 145.00, 25, 8),
      ('TL-005', 'Shovel Round', 'Round point shovel with wooden handle', 8, 'pcs', 280.00, 190.00, 30, 8),
      ('TLR-001', 'Ceramic Tile 40x40cm Beige', 'Floor ceramic tile 40x40cm, beige color, per box (12 pcs)', 9, 'box', 620.00, 420.00, 40, 10),
      ('TLR-002', 'Ceramic Tile 30x30cm Gray', 'Floor ceramic tile 30x30cm, gray color, per box (15 pcs)', 9, 'box', 480.00, 320.00, 45, 10),
      ('TLR-003', 'Tile Adhesive 25kg', 'Standard tile adhesive, 25kg bag', 9, 'sack', 210.00, 145.00, 60, 15),
      ('TLR-004', 'Tile Grout White 1kg', 'Tile grout, white, 1kg pack', 9, 'pack', 85.00, 50.00, 80, 20),
      ('DRW-001', 'Panel Door 0.8m x 2.1m', 'Standard hollow panel door, 0.8mx2.1m, without frame', 10, 'pcs', 1450.00, 1050.00, 20, 5),
      ('DRW-002', 'Panel Door 0.9m x 2.1m', 'Standard hollow panel door, 0.9mx2.1m, without frame', 10, 'pcs', 1550.00, 1120.00, 18, 5),
      ('DRW-003', 'Door Knob Set', 'Stainless steel door knob set with lock', 10, 'set', 380.00, 250.00, 60, 15),
      ('DRW-004', 'Door Hinge 4"', 'Steel door hinge, 4 inches, per pair', 10, 'pair', 85.00, 50.00, 100, 20),
      ('DRW-005', 'Sliding Window 1.2m', 'Standard aluminum sliding window, 1.2 meters wide', 10, 'pcs', 2800.00, 2000.00, 10, 3);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM customers) THEN
    INSERT INTO customers (name, phone, email, address) VALUES
      ('Juan dela Cruz', '09171234567', 'juan@example.com', '123 Rizal St., Barangay Central, Manila'),
      ('Maria Santos', '09182345678', 'maria@example.com', '456 Mabini Ave., Quezon City'),
      ('Pedro Reyes', '09193456789', 'pedro@example.com', '789 Bonifacio Drive, Makati'),
      ('Ana Gonzales', '09204567890', 'ana@example.com', '321 Katipunan Rd., Pasig'),
      ('Jose Mercado', '09215678901', 'jose@example.com', '654 Taft Ave., Manila');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM suppliers) THEN
    INSERT INTO suppliers (name, contact_person, phone, email, address) VALUES
      ('Northern Lumber Supply', 'Carlos Mendoza', '09161112222', 'carlos@northernlumber.com', 'McArthur Hwy, Valenzuela'),
      ('Cement Masters Inc.', 'Liza Fernandez', '09172223333', 'liza@cementmasters.com', 'Tondo Industrial Zone, Manila'),
      ('BuildRight Hardware Trading', 'Ramon Torres', '09183334444', 'ramon@buildright.com', 'EDSA, Mandaluyong'),
      ('PhilRib Roofing Supply', 'Dennis Reyes', '09194445555', 'dennis@philrib.com', 'East Service Rd., Parañaque'),
      ('Allied Plumbing Supply', 'Sandra Lim', '09205556666', 'sandra@alliedplumbing.com', 'Banawe St., Quezon City'),
      ('ElectroTech Supplies', 'Mike Tan', '09216667777', 'mike@electrotech.com', 'Raon St., Quiapo, Manila'),
      ('Prime Paint & Coatings', 'Grace Santos', '09227778888', 'grace@primepaint.com', 'Shaw Blvd., Pasig'),
      ('Metal Fasteners Corp.', 'Jake Rivera', '09238889999', 'jake@metalfasteners.com', 'North Bay Blvd., Navotas'),
      ('ProTool Hardware', 'Eric Villanueva', '09249990000', 'eric@protool.com', 'Tandang Sora Ave., Quezon City'),
      ('Tiles Plus Trading', 'Karen Gomez', '09251112222', 'karen@tilesplus.com', 'Macapagal Blvd., Pasay');
  END IF;
END $$;

-- 9. RPC: Create sale transactionally (sale + items + stock check)
-- SECURITY INVOKER: RLS applies, user_id is taken from auth.uid() (no impersonation)
-- Items trigger handles stock check + deduction; if any item fails, the whole tx rolls back

CREATE OR REPLACE FUNCTION create_sale(
  p_customer_id BIGINT,
  p_discount DECIMAL,
  p_items JSONB
)
RETURNS TABLE (
  sale_id BIGINT,
  invoice_no TEXT,
  total DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sale_id BIGINT;
  v_invoice_no TEXT;
  v_subtotal DECIMAL(12,2) := 0;
  v_total DECIMAL(12,2);
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale must have at least one item';
  END IF;

  IF p_discount IS NOT NULL AND p_discount < 0 THEN
    RAISE EXCEPTION 'Discount must be non-negative';
  END IF;

  SELECT COALESCE(SUM((item->>'quantity')::DECIMAL * (item->>'unit_price')::DECIMAL), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  v_total := GREATEST(v_subtotal - COALESCE(p_discount, 0), 0);

  INSERT INTO sales (customer_id, user_id, subtotal, discount, total)
  VALUES (p_customer_id, auth.uid(), v_subtotal, COALESCE(p_discount, 0), v_total)
  RETURNING id, invoice_no INTO v_sale_id, v_invoice_no;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
  SELECT
    v_sale_id,
    (item->>'product_id')::BIGINT,
    (item->>'quantity')::DECIMAL,
    (item->>'unit_price')::DECIMAL,
    (item->>'quantity')::DECIMAL * (item->>'unit_price')::DECIMAL
  FROM jsonb_array_elements(p_items) AS item;

  RETURN QUERY SELECT v_sale_id, v_invoice_no, v_total;
END;
$$;
