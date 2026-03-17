/**
 * Supabase RPC Functions for UPC Inventory
 * 
 * SQL functions (RPCs) to implement:
 * 1. register_alumno - Register new student with carrera
 * 2. login_with_magic_link - Generate magic link token
 * 3. verify_magic_token - Verify token and return student
 * 4. create_inventory_reservation - Create reservation (carrera pulled from user profile)
 * 5. get_alumno_with_carrera - Get student with carrera details
 * 
 * Usage: Call these from Supabase JS client with supabase.rpc()
 */

-- =====================================================
-- 1. REGISTER_ALUMNO - Register new student
-- =====================================================

CREATE OR REPLACE FUNCTION public.register_alumno(
  p_email TEXT,
  p_nombre TEXT,
  p_apellido TEXT,
  p_carrera_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  alumno_id UUID,
  message TEXT
) AS $$
DECLARE
  v_alumno_id UUID;
  v_carrera_exists BOOLEAN;
BEGIN
  -- Validate inputs
  IF p_email IS NULL OR p_email = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Email is required'::TEXT;
    RETURN;
  END IF;

  IF p_nombre IS NULL OR p_nombre = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'First name is required'::TEXT;
    RETURN;
  END IF;

  IF p_apellido IS NULL OR p_apellido = '' THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Last name is required'::TEXT;
    RETURN;
  END IF;

  IF p_carrera_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Carrera is required'::TEXT;
    RETURN;
  END IF;

  -- Normalize email (lowercase, trim)
  p_email := LOWER(TRIM(p_email));

  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.alumnos WHERE email = p_email) THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Email already registered'::TEXT;
    RETURN;
  END IF;

  -- Validate carrera exists and is active
  SELECT EXISTS (
    SELECT 1 FROM public.carreras 
    WHERE id = p_carrera_id AND activa = true
  ) INTO v_carrera_exists;

  IF NOT v_carrera_exists THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid carrera'::TEXT;
    RETURN;
  END IF;

  -- Insert new alumno
  INSERT INTO public.alumnos (
    email,
    nombre,
    apellido,
    carrera_id,
    activo,
    email_verificado
  ) VALUES (
    p_email,
    TRIM(p_nombre),
    TRIM(p_apellido),
    p_carrera_id,
    true,
    false
  ) RETURNING alumnos.id INTO v_alumno_id;

  RETURN QUERY SELECT true, v_alumno_id, 'Student registered successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.register_alumno TO anon, authenticated;

-- =====================================================
-- 2. LOGIN_WITH_MAGIC_LINK - Generate magic link token
-- =====================================================

CREATE OR REPLACE FUNCTION public.login_with_magic_link(
  p_email TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  token TEXT,
  alumno_id UUID
) AS $$
DECLARE
  v_alumno_id UUID;
  v_token TEXT;
  v_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Normalize email
  p_email := LOWER(TRIM(p_email));

  -- Validate input
  IF p_email IS NULL OR p_email = '' THEN
    RETURN QUERY SELECT false, 'Email is required'::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if user exists
  SELECT id INTO v_alumno_id FROM public.alumnos WHERE email = p_email;

  IF v_alumno_id IS NULL THEN
    -- For security: don't reveal if email exists
    -- But log it for debugging
    RETURN QUERY SELECT true, 'If an account exists, magic link sent to email'::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Generate random 32-character token
  v_token := encode(gen_random_bytes(24), 'hex');
  v_expiry := NOW() + INTERVAL '15 minutes';

  -- Store token in database
  UPDATE public.alumnos
  SET
    magic_token = v_token,
    magic_token_expiry = v_expiry
  WHERE id = v_alumno_id;

  -- Return success with token
  -- In production: send token via email and return null
  RETURN QUERY SELECT true, 'Magic link generated'::TEXT, v_token, v_alumno_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.login_with_magic_link TO anon, authenticated;

-- =====================================================
-- 3. VERIFY_MAGIC_TOKEN - Verify token and return user
-- =====================================================

CREATE OR REPLACE FUNCTION public.verify_magic_token(
  p_token TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  alumno_id UUID,
  email TEXT,
  nombre TEXT,
  apellido TEXT,
  carrera_id UUID
) AS $$
DECLARE
  v_alumno RECORD;
BEGIN
  -- Validate input
  IF p_token IS NULL OR p_token = '' THEN
    RETURN QUERY SELECT false, 'Token is required'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Find user with matching token
  SELECT id, email, nombre, apellido, carrera_id, magic_token_expiry, activo
  INTO v_alumno
  FROM public.alumnos
  WHERE magic_token = p_token AND activo = true;

  -- Check if token found
  IF v_alumno IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid token'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Check if token expired
  IF v_alumno.magic_token_expiry < NOW() THEN
    RETURN QUERY SELECT false, 'Token has expired'::TEXT, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Clear token and mark email as verified
  UPDATE public.alumnos
  SET
    magic_token = NULL,
    magic_token_expiry = NULL,
    email_verificado = true
  WHERE id = v_alumno.id;

  -- Return user data
  RETURN QUERY SELECT 
    true,
    'Token verified successfully'::TEXT,
    v_alumno.id,
    v_alumno.email,
    v_alumno.nombre,
    v_alumno.apellido,
    v_alumno.carrera_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_magic_token TO anon, authenticated;

-- =====================================================
-- 4. CREATE_INVENTORY_RESERVATION - Create reservation from user profile
-- =====================================================

CREATE OR REPLACE FUNCTION public.create_inventory_reservation(
  p_product_id UUID,
  p_unit_id UUID,
  p_start_at TIMESTAMP WITH TIME ZONE,
  p_end_at TIMESTAMP WITH TIME ZONE,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  reservation_id UUID,
  user_carrera_id UUID
) AS $$
DECLARE
  v_user RECORD;
  v_duration_hours NUMERIC;
  v_conflict_exists BOOLEAN;
  v_reservation_id UUID;
BEGIN
  -- Validate inputs
  IF p_product_id IS NULL THEN
    RETURN QUERY SELECT false, 'Product ID is required'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF p_unit_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unit ID is required'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF p_start_at IS NULL OR p_end_at IS NULL THEN
    RETURN QUERY SELECT false, 'Start and end times are required'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User ID is required'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Validate time range
  IF p_end_at <= p_start_at THEN
    RETURN QUERY SELECT false, 'End time must be after start time'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Validate duration
  v_duration_hours := EXTRACT(EPOCH FROM (p_end_at - p_start_at)) / 3600.0;

  IF v_duration_hours < 0.25 THEN  -- 15 minutes minimum
    RETURN QUERY SELECT false, 'Reservation must be at least 15 minutes'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  IF v_duration_hours > 2 THEN
    RETURN QUERY SELECT false, 'Reservation cannot exceed 2 hours'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Check user exists and is active
  SELECT id, carrera_id, nombre, apellido, email
  INTO v_user
  FROM public.alumnos
  WHERE id = p_user_id AND activo = true;

  IF v_user IS NULL THEN
    RETURN QUERY SELECT false, 'User not found or inactive'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- CRITICAL: Check user has carrera assigned
  IF v_user.carrera_id IS NULL THEN
    RETURN QUERY SELECT false, 'Your profile does not have a carrera assigned. Please contact support.'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Check for conflicting reservations
  SELECT EXISTS (
    SELECT 1 FROM public.inventory_reservations
    WHERE unit_id = p_unit_id
      AND status NOT IN ('cancelled', 'completed')
      AND (
        (p_start_at >= start_at AND p_start_at < end_at)
        OR
        (p_end_at > start_at AND p_end_at <= end_at)
        OR
        (p_start_at <= start_at AND p_end_at >= end_at)
      )
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RETURN QUERY SELECT false, 'Unit is not available for the selected time period'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- All validations passed - create reservation
  INSERT INTO public.inventory_reservations (
    product_id,
    unit_id,
    user_id,
    start_at,
    end_at,
    status
  ) VALUES (
    p_product_id,
    p_unit_id,
    p_user_id,
    p_start_at,
    p_end_at,
    'reserved'
  ) RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT 
    true,
    'Reservation created successfully'::TEXT,
    v_reservation_id,
    v_user.carrera_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_inventory_reservation TO anon, authenticated;

-- =====================================================
-- 5. GET_ALUMNO_WITH_CARRERA - Get student with carrera details
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_alumno_with_carrera(
  p_alumno_id UUID
)
RETURNS TABLE (
  id UUID,
  email TEXT,
  nombre TEXT,
  apellido TEXT,
  email_verificado BOOLEAN,
  activo BOOLEAN,
  carrera_id UUID,
  carrera_nombre TEXT,
  carrera_codigo TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.email,
    a.nombre,
    a.apellido,
    a.email_verificado,
    a.activo,
    a.carrera_id,
    c.nombre as carrera_nombre,
    c.codigo as carrera_codigo
  FROM public.alumnos a
  LEFT JOIN public.carreras c ON a.carrera_id = c.id
  WHERE a.id = p_alumno_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_alumno_with_carrera TO anon, authenticated;

-- =====================================================
-- 6. GET_ALUMNO_RESERVATIONS - Get all reservations for a student
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_alumno_reservations(
  p_alumno_id UUID
)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  unit_id UUID,
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  carrera_id UUID,
  carrera_nombre TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ir.id,
    ir.product_id,
    ir.unit_id,
    ir.start_at,
    ir.end_at,
    ir.status,
    ir.created_at,
    a.carrera_id,
    c.nombre as carrera_nombre
  FROM public.inventory_reservations ir
  JOIN public.alumnos a ON ir.user_id = a.id
  LEFT JOIN public.carreras c ON a.carrera_id = c.id
  WHERE a.id = p_alumno_id
  ORDER BY ir.start_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_alumno_reservations TO anon, authenticated;

-- =====================================================
-- 7. CANCEL_RESERVATION - Cancel a reservation (ownership check)
-- =====================================================

CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_reservation RECORD;
BEGIN
  -- Get reservation and verify ownership
  SELECT id, user_id, status
  INTO v_reservation
  FROM public.inventory_reservations
  WHERE id = p_reservation_id;

  IF v_reservation IS NULL THEN
    RETURN QUERY SELECT false, 'Reservation not found'::TEXT;
    RETURN;
  END IF;

  IF v_reservation.user_id != p_user_id THEN
    RETURN QUERY SELECT false, 'Unauthorized: you can only cancel your own reservations'::TEXT;
    RETURN;
  END IF;

  IF v_reservation.status = 'completed' THEN
    RETURN QUERY SELECT false, 'Cannot cancel a completed reservation'::TEXT;
    RETURN;
  END IF;

  -- Update status to cancelled
  UPDATE public.inventory_reservations
  SET status = 'cancelled'
  WHERE id = p_reservation_id;

  RETURN QUERY SELECT true, 'Reservation cancelled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.cancel_reservation TO anon, authenticated;

-- =====================================================
-- 8. GET_UNIT_AVAILABILITY - Get booked time slots for a unit on a date
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_unit_availability(
  p_unit_id UUID,
  p_date DATE
)
RETURNS TABLE (
  start_at TIMESTAMP WITH TIME ZONE,
  end_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ir.start_at,
    ir.end_at
  FROM public.inventory_reservations ir
  WHERE ir.unit_id = p_unit_id
    AND ir.status IN ('reserved', 'completed')
    AND DATE(ir.start_at) = p_date
  ORDER BY ir.start_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_unit_availability TO anon, authenticated;

-- =====================================================
-- 9. GET_ALL_CARRERAS - Get all active carreras
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_all_carreras()
RETURNS TABLE (
  id UUID,
  nombre TEXT,
  codigo TEXT,
  description TEXT,
  activa BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.nombre,
    c.codigo,
    c.description,
    c.activa
  FROM public.carreras c
  WHERE c.activa = true
  ORDER BY c.nombre ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_all_carreras TO anon, authenticated;
