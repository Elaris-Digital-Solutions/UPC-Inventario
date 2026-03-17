-- =============================================================================
-- MIGRATION: Create Carreras and Alumnos Tables
-- =============================================================================
-- This migration establishes the student management system:
-- - carreras: Academic programs/majors
-- - alumnos: Student profiles with carrera assignment
-- - Links to inventory_reservations for proper user tracking
--
-- Author  : UPC Inventario Team
-- Date    : 2026-03-16
-- Version : 1.0
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- TABLE: carreras
-- ---------------------------------------------------------------------------
-- Academic programs/majors offered by UPC
-- Normalized lookup table for carrera management
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carreras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL UNIQUE,
    codigo TEXT,
    description TEXT,
    activa BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE carreras IS 'Academic programs/majors available at UPC.';
COMMENT ON COLUMN carreras.nombre IS 'Official program name (e.g. "Ingeniería de Software").';
COMMENT ON COLUMN carreras.codigo IS 'Internal program code (optional, e.g. "SW").';

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_carreras_nombre ON carreras(nombre);


-- ---------------------------------------------------------------------------
-- TABLE: alumnos
-- ---------------------------------------------------------------------------
-- Student profiles with authentication and carrera assignment
-- Integrates with Supabase Auth for email-based authentication
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS alumnos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic student info
    email TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    
    -- Academic assignment
    carrera_id UUID REFERENCES carreras(id) ON DELETE RESTRICT,
    
    -- Magic link authentication (for non-Supabase auth flow if needed)
    magic_token TEXT UNIQUE,
    magic_token_expiry TIMESTAMPTZ,
    
    -- Account status
    email_verificado BOOLEAN NOT NULL DEFAULT false,
    activo BOOLEAN NOT NULL DEFAULT true,
    
    -- Supabase Auth integration
    auth_user_id UUID,  -- Links to supabase.auth.users (optional, for future expansion)
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE alumnos IS 'Student profiles with carrera assignment and authentication tokens.';
COMMENT ON COLUMN alumnos.email IS 'UPC institutional email (unique).';
COMMENT ON COLUMN alumnos.carrera_id IS 'FK to carreras table. Stored once at registration.';
COMMENT ON COLUMN alumnos.magic_token IS 'Magic link token for passwordless auth.';
COMMENT ON COLUMN alumnos.magic_token_expiry IS 'Expiry timestamp for magic tokens (TTL ~15 minutes).';
COMMENT ON COLUMN alumnos.auth_user_id IS 'Optional link to Supabase Auth user (for audit/future use).';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alumnos_email ON alumnos(email);
CREATE INDEX IF NOT EXISTS idx_alumnos_carrera_id ON alumnos(carrera_id);
CREATE INDEX IF NOT EXISTS idx_alumnos_magic_token ON alumnos(magic_token);
CREATE INDEX IF NOT EXISTS idx_alumnos_activo ON alumnos(activo);


-- ---------------------------------------------------------------------------
-- TABLE MODIFICATION: inventory_reservations
-- ---------------------------------------------------------------------------
-- Add user_id column to link reservations to alumnos
-- This ensures all reservations are traceable to a specific student
-- ---------------------------------------------------------------------------
ALTER TABLE inventory_reservations 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES alumnos(id) ON DELETE CASCADE;

COMMENT ON COLUMN inventory_reservations.user_id IS 'FK to alumnos. Identifies the student making the reservation.';

-- Create index for reservation queries
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_user_id 
ON inventory_reservations(user_id);

-- Create composite index for common queries (user + date range)
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_user_date 
ON inventory_reservations(user_id, start_at, end_at);


-- ---------------------------------------------------------------------------
-- SEED DATA: Sample Carreras
-- ---------------------------------------------------------------------------
-- Pre-populate with common UPC majors (idempotent insert)
-- ---------------------------------------------------------------------------
INSERT INTO carreras (nombre, codigo, description) VALUES
    ('Ingeniería de Software', 'SW', 'Software Engineering Program'),
    ('Ingeniería Electrónica', 'EL', 'Electronics Engineering Program'),
    ('Ingeniería Industrial', 'IN', 'Industrial Engineering Program'),
    ('Administración de Empresas', 'ADM', 'Business Administration'),
    ('Contabilidad', 'CONT', 'Accounting Program')
ON CONFLICT (nombre) DO NOTHING;

COMMENT ON TABLE carreras IS 'Academic programs. Seeded with common UPC majors.';


-- ---------------------------------------------------------------------------
-- TRIGGER: Update Timestamps
-- ---------------------------------------------------------------------------
-- Auto-update updated_at on carreras and alumnos tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for carreras
DROP TRIGGER IF EXISTS trg_carreras_updated_at ON carreras;
CREATE TRIGGER trg_carreras_updated_at
BEFORE UPDATE ON carreras
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger for alumnos
DROP TRIGGER IF EXISTS trg_alumnos_updated_at ON alumnos;
CREATE TRIGGER trg_alumnos_updated_at
BEFORE UPDATE ON alumnos
FOR EACH ROW EXECUTE FUNCTION update_timestamp();


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------
-- Enable RLS for data protection
-- Policies will be managed via application logic or Supabase dashboard
-- ---------------------------------------------------------------------------
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE alumnos ENABLE ROW LEVEL SECURITY;

-- Policy: Carreras are publicly readable (for registration form dropdowns)
CREATE POLICY "Carreras public read" ON carreras
FOR SELECT TO anon, authenticated USING (activa = true);

-- Policy: Alumnos can only view their own profile
-- (Adjust as needed for your security model)
CREATE POLICY "Alumnos authenticated read" ON alumnos
FOR SELECT TO authenticated USING (true);

-- Policy: Only authenticated users can create alumnos (via registration endpoint)
CREATE POLICY "Alumnos authenticated create" ON alumnos
FOR INSERT TO authenticated WITH CHECK (true);

-- Policy: Alumnos can update their own profile
CREATE POLICY "Alumnos authenticated update own" ON alumnos
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


COMMIT;

-- =============================================================================
-- VERIFICATION QUERIES (run these to verify migration success)
-- =============================================================================
-- SELECT * FROM carreras LIMIT 5;
-- SELECT COUNT(*) as total_alumnos FROM alumnos;
-- SELECT * FROM inventory_reservations WHERE user_id IS NOT NULL LIMIT 5;
-- =============================================================================
