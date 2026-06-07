-- =============================================
-- Inventory Delete Support
-- Run this in Supabase SQL Editor after migration_stock_adjustments.sql
-- =============================================

-- Allow admins to delete purchases (stock will be reversed by existing trigger)
DROP POLICY IF EXISTS "Admins can delete purchases" ON purchases;
CREATE POLICY "Admins can delete purchases"
  ON purchases FOR DELETE
  USING (is_admin());

-- Allow admins to delete stock_adjustments
DROP POLICY IF EXISTS "Admins can delete stock_adjustments" ON stock_adjustments;
CREATE POLICY "Admins can delete stock_adjustments"
  ON stock_adjustments FOR DELETE
  USING (is_admin());

-- Reverse stock when a purchase is deleted
CREATE OR REPLACE FUNCTION reverse_stock_on_purchase_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - OLD.quantity
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_purchases_reverse_stock ON purchases;
CREATE TRIGGER trg_purchases_reverse_stock
  AFTER DELETE ON purchases
  FOR EACH ROW
  EXECUTE FUNCTION reverse_stock_on_purchase_delete();

-- Reverse stock when a stock_adjustment is deleted
CREATE OR REPLACE FUNCTION reverse_stock_on_adjustment_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - OLD.quantity_change
  WHERE id = OLD.product_id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_stock_adjustments_reverse_stock ON stock_adjustments;
CREATE TRIGGER trg_stock_adjustments_reverse_stock
  AFTER DELETE ON stock_adjustments
  FOR EACH ROW
  EXECUTE FUNCTION reverse_stock_on_adjustment_delete();
