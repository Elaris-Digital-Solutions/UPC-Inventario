BEGIN;

-- Intentar eliminar las restricciones automáticas generadas por Supabase/Postgres
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS inventory_reservations_check;
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS inventory_reservations_check1;
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS inventory_reservations_check2;

-- Agregar una nueva restricción con nombre para permitir hasta 4 horas
ALTER TABLE inventory_reservations ADD CONSTRAINT inventory_reservations_max_duration_check 
  CHECK ((end_at - start_at) <= interval '4 hours');

COMMIT;
