BEGIN;

ALTER TABLE IF EXISTS inventory_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory_unit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Inventory units public update" ON inventory_units;
DROP POLICY IF EXISTS "Inventory notes public create" ON inventory_unit_notes;
DROP POLICY IF EXISTS "Inventory notes public delete" ON inventory_unit_notes;

DROP POLICY IF EXISTS "Inventory units admin full" ON inventory_units;
CREATE POLICY "Inventory units admin full" ON inventory_units
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Inventory notes admin full" ON inventory_unit_notes;
CREATE POLICY "Inventory notes admin full" ON inventory_unit_notes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMIT;
