-- =============================================
-- TouchStone Builders — User Management
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Add is_active column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. RPC: Admin creates a user (auth user + profile via trigger)
CREATE OR REPLACE FUNCTION admin_create_user(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'worker'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  v_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, aud, role
  ) VALUES (
    v_user_id, '00000000-0000-0000-0000-000000000000',
    p_email, crypt(p_password, gen_salt('bf', 10)),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', p_full_name, 'role', p_role),
    NOW(), NOW(), 'authenticated', 'authenticated'
  );

  RETURN v_user_id;
END;
$$;

-- 3. RPC: Admin toggles user active status
CREATE OR REPLACE FUNCTION admin_toggle_user_active(
  p_user_id UUID,
  p_is_active BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can toggle user status';
  END IF;

  UPDATE profiles
  SET is_active = p_is_active
  WHERE id = p_user_id;
END;
$$;