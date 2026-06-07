-- Fix: rename output columns of create_sale to avoid ambiguity with sales table columns
-- Error was: column reference "invoice_no" is ambiguous

DROP FUNCTION IF EXISTS create_sale(bigint, numeric, jsonb);

CREATE OR REPLACE FUNCTION create_sale(
  p_customer_id BIGINT,
  p_discount DECIMAL,
  p_items JSONB
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

  SELECT COALESCE(SUM((item->>'quantity')::DECIMAL * (item->>'unit_price')::DECIMAL), 0)
  INTO v_subtotal
  FROM jsonb_array_elements(p_items) AS item;

  v_total := GREATEST(v_subtotal - COALESCE(p_discount, 0), 0);

  INSERT INTO sales (customer_id, user_id, subtotal, discount, total)
  VALUES (p_customer_id, auth.uid(), v_subtotal, COALESCE(p_discount, 0), v_total)
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
