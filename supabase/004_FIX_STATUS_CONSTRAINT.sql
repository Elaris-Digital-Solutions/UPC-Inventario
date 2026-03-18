-- ==========================================
-- 004_FIX_STATUS_CONSTRAINT.sql
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Eliminar la restricción actual de estado
ALTER TABLE inventory_reservations DROP CONSTRAINT IF EXISTS inventory_reservations_status_check;

-- 2. Crear la nueva restricción permitiendo los nuevos estados
ALTER TABLE inventory_reservations ADD CONSTRAINT inventory_reservations_status_check 
CHECK (status IN ('reserved', 'active', 'completed', 'cancelled', 'not_picked_up', 'not_returned'));
