BEGIN;

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

COMMIT;
