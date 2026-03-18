-- ==========================================
-- 003_PENALTIES_AND_DISABLED_DATES.sql
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Añadir columna de penalidad a la tabla de alumnos
ALTER TABLE alumnos ADD COLUMN IF NOT EXISTS banned_until timestamp with time zone;

-- 2. Modificar el campo status de la tabla inventory_reservations
-- Nota: Si status no es un ENUM en la base de datos (es decir, es un text check), 
-- entonces solo se actualiza en el código. Pero por si acaso:
-- ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'not_picked_up';
-- ALTER TYPE reservation_status ADD VALUE IF NOT EXISTS 'not_returned';

-- 3. Crear tabla de días inhabilitados (para el calendario administrativo)
CREATE TABLE IF NOT EXISTS disabled_days (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  date date UNIQUE NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Habilitar RLS e insertar políticas simples
ALTER TABLE disabled_days ENABLE ROW LEVEL SECURITY;

-- Permitir a cualquier usuario autenticado leer los días inhabilitados
CREATE POLICY "Public read disabled_days"
  ON disabled_days FOR SELECT
  USING (true);

-- Permitir a todos insertar/eliminar (el frontend Admin.tsx restringirá mediante la UI)
CREATE POLICY "Public insert disabled_days"
  ON disabled_days FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public delete disabled_days"
  ON disabled_days FOR DELETE
  USING (true);
