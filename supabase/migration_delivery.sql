-- Migration: Add delivery support to sales table
-- Adds delivery_address and delivery_fee columns

-- Add columns to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0);

-- Update the create_sale RPC to accept delivery info
CREATE OR REPLACE FUNCTION create_sale(
  p_customer_id BIGINT,
  p_discount DECIMAL,
  p_items JSONB,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_fee DECIMAL DEFAULT 0
)
RETURNS TABLE (
  sale_id BIGINT,
  inv_no TEXT,
  sale_total DECIMAL
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_sale_id BIGINT;
  v_inv_no TEXT;
  v_subtotal DECIMAL(12,2) := 0;
  v_total DECIMAL(12,2);
BEGIN
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Sale must have at least one item';
  END IF;

  IF p_discount IS NOT NULL AND p_discount < 0 THEN
    RAISE EXCEPTION 'Discount must be non-negative';
  END IF;

  IF p_delivery_fee IS NOT NULL AND p_delivery_fee < 0 THEN
    RAISE EXCEPTION 'Delivery fee must be non-negative';
  END IF;

  SELECT COALESCE(SUM((item->>'quantity')::DECIMAL * (item->>'unit_price')::DECIMAL), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  v_total := GREATEST(v_subtotal - COALESCE(p_discount, 0) + COALESCE(p_delivery_fee, 0), 0);

  INSERT INTO sales (customer_id, user_id, subtotal, discount, total, delivery_address, delivery_fee)
  VALUES (p_customer_id, auth.uid(), v_subtotal, COALESCE(p_discount, 0), v_total, p_delivery_address, COALESCE(p_delivery_fee, 0))
  RETURNING id, sales.invoice_no INTO v_sale_id, v_inv_no;

  INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
  SELECT
    v_sale_id,
    (item->>'product_id')::BIGINT,
    (item->>'quantity')::DECIMAL,
    (item->>'unit_price')::DECIMAL,
    (item->>'quantity')::DECIMAL * (item->>'unit_price')::DECIMAL
  FROM jsonb_array_elements(p_items) AS item;

  RETURN QUERY SELECT v_sale_id, v_inv_no, v_total;
END;
$$;
