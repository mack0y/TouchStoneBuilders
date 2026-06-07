-- =============================================
-- TouchStone Builders — Full Reset
-- Safe to run regardless of which tables exist
-- =============================================

-- Drop tables first (CASCADE drops their triggers too)
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop the auth trigger separately (auth.users table is not ours to drop)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS generate_invoice_no CASCADE;
DROP FUNCTION IF EXISTS check_and_deduct_stock CASCADE;
DROP FUNCTION IF EXISTS adjust_stock_on_sale_item_update CASCADE;
DROP FUNCTION IF EXISTS restore_stock_on_sale_item_delete CASCADE;
DROP FUNCTION IF EXISTS add_stock_on_purchase CASCADE;
DROP FUNCTION IF EXISTS adjust_stock_on_purchase_update CASCADE;
DROP FUNCTION IF EXISTS is_admin CASCADE;
DROP FUNCTION IF EXISTS create_sale CASCADE;

-- Drop sequence
DROP SEQUENCE IF EXISTS sale_number_seq CASCADE;
