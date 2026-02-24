BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS inventory_units (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_code text NOT NULL,
  campus text NOT NULL DEFAULT 'Monterrico' CHECK (campus IN ('Monterrico', 'San Miguel')),
  asset_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'retired')),
  current_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(product_id, unit_code)
);

ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS campus text;
UPDATE inventory_units SET campus = 'Monterrico' WHERE campus IS NULL;
ALTER TABLE inventory_units ALTER COLUMN campus SET DEFAULT 'Monterrico';
ALTER TABLE inventory_units ALTER COLUMN campus SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_units_campus_check'
  ) THEN
    ALTER TABLE inventory_units
      ADD CONSTRAINT inventory_units_campus_check
      CHECK (campus IN ('Monterrico', 'San Miguel'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS inventory_unit_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id uuid NOT NULL REFERENCES inventory_units(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  unit_id uuid NOT NULL REFERENCES inventory_units(id) ON DELETE RESTRICT,
  requester_name text NOT NULL,
  requester_code text,
  purpose text,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'cancelled', 'completed')),
  CHECK (end_at > start_at),
  CHECK ((end_at - start_at) <= interval '2 hours')
);

CREATE INDEX IF NOT EXISTS idx_inventory_units_product ON inventory_units(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_status ON inventory_units(status);
CREATE INDEX IF NOT EXISTS idx_inventory_res_product ON inventory_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_res_unit ON inventory_reservations(unit_id);
CREATE INDEX IF NOT EXISTS idx_inventory_res_time ON inventory_reservations(start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_inventory_notes_unit ON inventory_unit_notes(unit_id, created_at DESC);

ALTER TABLE inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_unit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inventory units public read" ON inventory_units;
DROP POLICY IF EXISTS "Inventory units admin full" ON inventory_units;
DROP POLICY IF EXISTS "Inventory notes public read" ON inventory_unit_notes;
DROP POLICY IF EXISTS "Inventory notes admin full" ON inventory_unit_notes;
DROP POLICY IF EXISTS "Inventory reservations public read" ON inventory_reservations;
DROP POLICY IF EXISTS "Inventory reservations public create" ON inventory_reservations;
DROP POLICY IF EXISTS "Inventory reservations admin full" ON inventory_reservations;

CREATE POLICY "Inventory units public read" ON inventory_units
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inventory units admin full" ON inventory_units
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Inventory notes public read" ON inventory_unit_notes
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inventory notes admin full" ON inventory_unit_notes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Inventory reservations public read" ON inventory_reservations
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inventory reservations public create" ON inventory_reservations
FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Inventory reservations admin full" ON inventory_reservations
FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION touch_inventory_units_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_inventory_units_updated_at ON inventory_units;
CREATE TRIGGER trg_inventory_units_updated_at
BEFORE UPDATE ON inventory_units
FOR EACH ROW EXECUTE FUNCTION touch_inventory_units_updated_at();

CREATE OR REPLACE FUNCTION create_inventory_reservation(
  p_product_id uuid,
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
  IF p_end_at <= p_start_at THEN
    RAISE EXCEPTION 'La hora de fin debe ser mayor que la hora de inicio';
  END IF;

  IF (p_end_at - p_start_at) > interval '2 hours' THEN
    RAISE EXCEPTION 'La reserva no puede exceder 2 horas';
  END IF;

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
    AND iu.status = 'active'
    AND NOT EXISTS (
      SELECT 1
      FROM inventory_reservations overlap
      WHERE overlap.unit_id = iu.id
        AND overlap.status = 'reserved'
        AND overlap.start_at < p_end_at
        AND overlap.end_at > p_start_at
    )
  ORDER BY usage_stats.uses_count ASC NULLS FIRST,
           usage_stats.last_used_at ASC NULLS FIRST,
           iu.unit_code ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

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

GRANT EXECUTE ON FUNCTION create_inventory_reservation(uuid, text, text, timestamptz, timestamptz, text) TO anon, authenticated;

COMMIT;
