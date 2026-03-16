BEGIN;

-- 1. Create blacklist table
CREATE TABLE IF NOT EXISTS inventory_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_code text NOT NULL,
  blocked_until timestamptz NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- RLS for blacklist
ALTER TABLE inventory_blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access for authenticated users on blacklist" ON inventory_blacklist FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read access for anon users on blacklist" ON inventory_blacklist FOR SELECT TO anon USING (true);
CREATE POLICY "Allow insert for authenticated users on blacklist" ON inventory_blacklist FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Update create_inventory_reservation RPC to add blacklist check and 2-hour buffer.

DROP FUNCTION IF EXISTS create_inventory_reservation(uuid, text, text, text, timestamptz, timestamptz, text);

CREATE OR REPLACE FUNCTION create_inventory_reservation(
  p_product_id uuid,
  p_campus text,
  p_requester_name text,
  p_requester_code text,
  p_start_at timestamptz,
  p_end_at timestamptz,
  p_purpose text DEFAULT NULL
)
RETURNS inventory_reservations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_unit_id uuid;
  v_reservation inventory_reservations;
BEGIN
  -- CHECK BLACKLIST (Baneo de 1 mes)
  IF p_requester_code IS NOT NULL AND EXISTS(
      SELECT 1 FROM inventory_blacklist 
      WHERE requester_code = p_requester_code 
      AND blocked_until > now()
  ) THEN
    RAISE EXCEPTION 'Usuario penalizado. No puede realizar reservas hasta que expire su sanción.';
  END IF;

  IF p_campus NOT IN ('Monterrico', 'San Miguel') THEN
    RAISE EXCEPTION 'La sede es invalida';
  END IF;

  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'La hora de fin debe ser mayor que la hora de inicio';
  END IF;

  -- Maintain existing 4 hours limit
  IF (p_end_at - p_start_at) > interval '4 hours' THEN
    RAISE EXCEPTION 'La reserva no puede exceder 4 horas';
  END IF;

  -- Step 1: find the best available unit
  SELECT iu.id
  INTO v_unit_id
  FROM inventory_units iu
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS uses_count, MAX(r.start_at) AS last_used_at
    FROM inventory_reservations r
    WHERE r.unit_id = iu.id
      AND r.status IN ('reserved', 'completed')
  ) usage_stats ON true
  WHERE iu.product_id = p_product_id
    AND iu.campus = p_campus
    AND iu.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM inventory_reservations overlap
      WHERE overlap.unit_id = iu.id
        AND overlap.status = 'reserved'
        -- 2 hour buffer logic applied on both sides
        AND overlap.start_at < (p_end_at + interval '2 hours')
        AND overlap.end_at > (p_start_at - interval '2 hours')
    )
  ORDER BY usage_stats.uses_count ASC NULLS FIRST,
           usage_stats.last_used_at ASC NULLS FIRST,
           iu.unit_code ASC
  LIMIT 1;

  -- Step 2: lock the chosen unit row to prevent concurrent inserts
  IF v_unit_id IS NOT NULL THEN
    SELECT id INTO v_unit_id
    FROM inventory_units
    WHERE id = v_unit_id
    FOR UPDATE SKIP LOCKED;
  END IF;

  IF v_unit_id IS NULL THEN
    RAISE EXCEPTION 'No hay unidades disponibles para el rango solicitado';
  END IF;

  INSERT INTO inventory_reservations (
    product_id,
    unit_id,
    requester_name,
    requester_code,
    purpose,
    start_at,
    end_at,
    status
  ) VALUES (
    p_product_id,
    v_unit_id,
    p_requester_name,
    p_requester_code,
    p_purpose,
    p_start_at,
    p_end_at,
    'reserved'
  )
  RETURNING * INTO v_reservation;

  RETURN v_reservation;
END;
$$;

GRANT EXECUTE ON FUNCTION create_inventory_reservation(uuid, text, text, text, timestamptz, timestamptz, text) TO anon, authenticated;

COMMIT;
