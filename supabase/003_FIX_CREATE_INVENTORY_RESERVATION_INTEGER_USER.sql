BEGIN;

DROP FUNCTION IF EXISTS public.create_inventory_reservation(uuid, uuid, timestamptz, timestamptz, uuid);
DROP FUNCTION IF EXISTS public.create_inventory_reservation(uuid, uuid, timestamptz, timestamptz, integer);
DROP FUNCTION IF EXISTS public.create_inventory_reservation(uuid, uuid, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.create_inventory_reservation(uuid, uuid, timestamptz, timestamptz, text, text);

CREATE OR REPLACE FUNCTION public.create_inventory_reservation(
  p_product_id UUID,
  p_unit_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_user_id INTEGER,
  p_purpose TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  reservation_id UUID,
  user_carrera_id INTEGER
) AS $$
DECLARE
  v_user RECORD;
  v_duration_hours NUMERIC;
  v_conflict_exists BOOLEAN;
  v_reservation_id UUID;
BEGIN
  IF p_product_id IS NULL THEN
    RETURN QUERY SELECT false, 'Product ID is required'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_unit_id IS NULL THEN
    RETURN QUERY SELECT false, 'Unit ID is required'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_start_at IS NULL OR p_end_at IS NULL THEN
    RETURN QUERY SELECT false, 'Start and end times are required'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'User ID is required'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF p_end_at <= p_start_at THEN
    RETURN QUERY SELECT false, 'End time must be after start time'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  v_duration_hours := EXTRACT(EPOCH FROM (p_end_at - p_start_at)) / 3600.0;

  IF v_duration_hours < 0.25 THEN
    RETURN QUERY SELECT false, 'Reservation must be at least 15 minutes'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_duration_hours > 4 THEN
    RETURN QUERY SELECT false, 'Reservation cannot exceed 4 hours'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT id, carrera_id, activo
  INTO v_user
  FROM public.alumnos
  WHERE id = p_user_id;

  IF v_user IS NULL OR v_user.activo IS DISTINCT FROM true THEN
    RETURN QUERY SELECT false, 'User not found or inactive'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF v_user.carrera_id IS NULL THEN
    RETURN QUERY SELECT false, 'Your profile does not have a carrera assigned. Please contact support.'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.inventory_reservations ir
    WHERE ir.unit_id = p_unit_id
      AND ir.status NOT IN ('cancelled', 'completed')
      AND ir.start_at < p_end_at
      AND ir.end_at > p_start_at
  ) INTO v_conflict_exists;

  IF v_conflict_exists THEN
    RETURN QUERY SELECT false, 'Unit is not available for the selected time period'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  INSERT INTO public.inventory_reservations (
    product_id,
    unit_id,
    user_id,
    purpose,
    start_at,
    end_at,
    status
  ) VALUES (
    p_product_id,
    p_unit_id,
    p_user_id,
    p_purpose,
    p_start_at,
    p_end_at,
    'reserved'
  ) RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT true, 'Reservation created successfully'::TEXT, v_reservation_id, v_user.carrera_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_inventory_reservation(uuid, uuid, timestamptz, timestamptz, integer, text)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_inventory_reservation(
  p_product_id UUID,
  p_unit_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_user_id TEXT,
  p_purpose TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  reservation_id UUID,
  user_carrera_id INTEGER
) AS $$
DECLARE
  v_user_id_int INTEGER;
BEGIN
  IF p_user_id IS NULL OR btrim(p_user_id) = '' THEN
    RETURN QUERY SELECT false, 'User ID is required'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  IF btrim(p_user_id) !~ '^[0-9]+$' THEN
    RETURN QUERY SELECT false, 'User ID must be numeric'::TEXT, NULL::UUID, NULL::INTEGER;
    RETURN;
  END IF;

  v_user_id_int := btrim(p_user_id)::INTEGER;

  RETURN QUERY
  SELECT *
  FROM public.create_inventory_reservation(
    p_product_id,
    p_unit_id,
    p_start_at,
    p_end_at,
    v_user_id_int,
    p_purpose
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.create_inventory_reservation(uuid, uuid, timestamptz, timestamptz, text, text)
TO anon, authenticated;

COMMIT;
