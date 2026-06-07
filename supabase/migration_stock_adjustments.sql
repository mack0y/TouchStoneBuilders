-- =============================================
-- Stock Adjustments — Manual inventory adjustments
-- Run this in Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  quantity_change DECIMAL(12,3) NOT NULL, -- positive = add, negative = subtract
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product ON stock_adjustments(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created ON stock_adjustments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_adjustments_user ON stock_adjustments(user_id);

-- Enable RLS
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read stock_adjustments" ON stock_adjustments;
CREATE POLICY "Anyone can read stock_adjustments"
  ON stock_adjustments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can insert stock_adjustments" ON stock_adjustments;
CREATE POLICY "Anyone can insert stock_adjustments"
  ON stock_adjustments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can delete stock_adjustments" ON stock_adjustments;
CREATE POLICY "Admins can delete stock_adjustments"
  ON stock_adjustments FOR DELETE
  USING (is_admin());

-- RPC: Apply a stock adjustment (transactional: insert adjustment + update product stock)
CREATE OR REPLACE FUNCTION adjust_stock(
  p_product_id BIGINT,
  p_quantity_change DECIMAL,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_new_stock DECIMAL(12,3);
  v_product_name TEXT;
BEGIN
  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'Quantity change cannot be zero';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required';
  END IF;

  -- Lock the product row and get current stock
  SELECT stock_quantity, name INTO v_new_stock, v_product_name
  FROM products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  v_new_stock := v_new_stock + p_quantity_change;

  IF v_new_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for "%". Current: %, adjustment: %',
      v_product_name, v_new_stock - p_quantity_change, p_quantity_change;
  END IF;

  -- Update product stock
  UPDATE products
  SET stock_quantity = v_new_stock
  WHERE id = p_product_id;

  -- Record the adjustment
  INSERT INTO stock_adjustments (product_id, user_id, quantity_change, reason)
  VALUES (p_product_id, auth.uid(), p_quantity_change, trim(p_reason));
END;
$$;
