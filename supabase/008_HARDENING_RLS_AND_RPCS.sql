-- =============================================================================
-- 008_HARDENING_RLS_AND_RPCS.sql
-- Hardening completo de seguridad: RLS, RPCs, validaciones de negocio.
-- Idempotente. Ejecutar en Supabase SQL Editor o vía Management API.
--
-- Resuelve hallazgos de auditoría:
--   C-1, C-2: RLS en alumnos y carreras
--   C-3..C-7: políticas "admin full USING(true)" cerradas
--   C-8: register_alumno con validación de dominio
--   C-9: ownership check en create_inventory_reservation
--   C-12: drop overload viejo
--   A-2: validaciones de negocio en RPC (disabled_days, daily-limit, futuro, etc.)
--   A-4: trigger de transición de estados
--   A-7: email_verificado validado server-side
--   Foundation: tabla app_admins para soportar roles Admin/Gestor.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. Tabla de roles administrativos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_admins (
  email      TEXT PRIMARY KEY,
  role       TEXT NOT NULL CHECK (role IN ('admin','gestor')),
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_admins IS 'Personal autorizado del sistema (admin total / gestor operativo).';

INSERT INTO public.app_admins(email, role)
VALUES ('admin@upc.edu.pe','admin')
ON CONFLICT (email) DO UPDATE SET role = 'admin', active = true;

ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_admins self read" ON public.app_admins;
CREATE POLICY "app_admins self read" ON public.app_admins
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.email()));

-- Drop helpers first to avoid signature conflicts
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.is_staff();

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins
    WHERE lower(email) = lower(coalesce(auth.email(), ''))
      AND role = 'admin'
      AND active
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_admins
    WHERE lower(email) = lower(coalesce(auth.email(), ''))
      AND role IN ('admin','gestor')
      AND active
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO anon, authenticated;

-- Política gestionable solo por admins (después de crear is_admin)
DROP POLICY IF EXISTS "app_admins admin manage" ON public.app_admins;
CREATE POLICY "app_admins admin manage" ON public.app_admins
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 1. RLS en alumnos (C-1)
-- ---------------------------------------------------------------------------
ALTER TABLE public.alumnos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Alumnos authenticated read"   ON public.alumnos;
DROP POLICY IF EXISTS "Alumnos authenticated create" ON public.alumnos;
DROP POLICY IF EXISTS "Alumnos authenticated update own" ON public.alumnos;
DROP POLICY IF EXISTS "Alumnos read own or staff"     ON public.alumnos;
DROP POLICY IF EXISTS "Alumnos admin write"           ON public.alumnos;
DROP POLICY IF EXISTS "Alumnos staff read"            ON public.alumnos;

-- SELECT: el propio alumno o staff (admin/gestor)
CREATE POLICY "Alumnos read own or staff" ON public.alumnos
  FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.email()) OR public.is_staff());

-- INSERT/UPDATE/DELETE: solo admin (estudiantes registran vía RPC SECURITY DEFINER)
CREATE POLICY "Alumnos admin write" ON public.alumnos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. RLS en carreras (C-2)
-- ---------------------------------------------------------------------------
ALTER TABLE public.carreras ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Carreras public read" ON public.carreras;
DROP POLICY IF EXISTS "Carreras admin write" ON public.carreras;

CREATE POLICY "Carreras public read" ON public.carreras
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Carreras admin write" ON public.carreras
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Cerrar políticas "admin full USING(true)" (C-3..C-6)
-- ---------------------------------------------------------------------------

-- inventory_units
DROP POLICY IF EXISTS "Inventory units admin full"   ON public.inventory_units;
DROP POLICY IF EXISTS "Inventory units public read"  ON public.inventory_units;

CREATE POLICY "Inventory units public read" ON public.inventory_units
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Inventory units staff write" ON public.inventory_units
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- inventory_unit_notes
DROP POLICY IF EXISTS "Inventory notes admin full"  ON public.inventory_unit_notes;
DROP POLICY IF EXISTS "Inventory notes public read" ON public.inventory_unit_notes;

CREATE POLICY "Inventory notes staff read" ON public.inventory_unit_notes
  FOR SELECT TO authenticated
  USING (public.is_staff());

CREATE POLICY "Inventory notes staff write" ON public.inventory_unit_notes
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- products
DROP POLICY IF EXISTS "Admin full access"  ON public.products;
DROP POLICY IF EXISTS "Public read access" ON public.products;

CREATE POLICY "Public read access" ON public.products
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Products admin write" ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- product_images
DROP POLICY IF EXISTS "Admin full access"  ON public.product_images;
DROP POLICY IF EXISTS "Public read access" ON public.product_images;

CREATE POLICY "Public read access" ON public.product_images
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Product images admin write" ON public.product_images
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- inventory_blacklist (C-7)
DROP POLICY IF EXISTS "Allow insert for authenticated users on blacklist" ON public.inventory_blacklist;
DROP POLICY IF EXISTS "Allow read access for anon users on blacklist"     ON public.inventory_blacklist;
DROP POLICY IF EXISTS "Allow read access for authenticated users on blacklist" ON public.inventory_blacklist;
DROP POLICY IF EXISTS "Blacklist read own"  ON public.inventory_blacklist;
DROP POLICY IF EXISTS "Blacklist staff write" ON public.inventory_blacklist;

CREATE POLICY "Blacklist read own" ON public.inventory_blacklist
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR user_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()))
  );

CREATE POLICY "Blacklist staff write" ON public.inventory_blacklist
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------------
-- 4. Migrar políticas previas que usan email hardcodeado → is_admin/is_staff
-- ---------------------------------------------------------------------------

-- disabled_days: SELECT público sigue público; INSERT/DELETE → admin
DROP POLICY IF EXISTS "Admin insert disabled_days" ON public.disabled_days;
DROP POLICY IF EXISTS "Admin delete disabled_days" ON public.disabled_days;

CREATE POLICY "Admin insert disabled_days" ON public.disabled_days
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin delete disabled_days" ON public.disabled_days
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- inventory_reservations: dueño + staff (gestor lee/edita reservas, admin todo)
DROP POLICY IF EXISTS "Inventory reservations owner read"   ON public.inventory_reservations;
DROP POLICY IF EXISTS "Inventory reservations owner create" ON public.inventory_reservations;
DROP POLICY IF EXISTS "Inventory reservations admin full"   ON public.inventory_reservations;

CREATE POLICY "Reservations owner or staff read" ON public.inventory_reservations
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR user_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  );

CREATE POLICY "Reservations owner create" ON public.inventory_reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_staff()
    OR user_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  );

CREATE POLICY "Reservations owner update" ON public.inventory_reservations
  FOR UPDATE TO authenticated
  USING (
    public.is_staff()
    OR user_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  )
  WITH CHECK (
    public.is_staff()
    OR user_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  );

CREATE POLICY "Reservations admin delete" ON public.inventory_reservations
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- final_satisfaction_surveys: dueño escribe, staff lee
DROP POLICY IF EXISTS "Final survey read own"   ON public.final_satisfaction_surveys;
DROP POLICY IF EXISTS "Final survey insert own" ON public.final_satisfaction_surveys;
DROP POLICY IF EXISTS "Final survey update own" ON public.final_satisfaction_surveys;

CREATE POLICY "Final survey read own" ON public.final_satisfaction_surveys
  FOR SELECT TO authenticated
  USING (
    public.is_staff()
    OR alumno_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  );

CREATE POLICY "Final survey insert own" ON public.final_satisfaction_surveys
  FOR INSERT TO authenticated
  WITH CHECK (
    alumno_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  );

CREATE POLICY "Final survey update own" ON public.final_satisfaction_surveys
  FOR UPDATE TO authenticated
  USING (
    alumno_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  )
  WITH CHECK (
    alumno_id = (SELECT id FROM public.alumnos WHERE lower(email) = lower(auth.email()) AND activo = true)
  );

-- ---------------------------------------------------------------------------
-- 5. Limpiar overload viejo de create_inventory_reservation (C-12)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_inventory_reservation(
  uuid, text, text, text, timestamptz, timestamptz, text
);

-- ---------------------------------------------------------------------------
-- 6. RPC create_inventory_reservation con ownership + validaciones (C-9, A-2)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_inventory_reservation(
  p_product_id uuid,
  p_unit_id    uuid,
  p_start_at   timestamptz,
  p_end_at     timestamptz,
  p_user_id    integer,
  p_purpose    text DEFAULT NULL
) RETURNS TABLE(success boolean, message text, reservation_id uuid, user_carrera_id integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_email   text := lower(coalesce(auth.email(), ''));
  v_user           RECORD;
  v_unit           RECORD;
  v_duration_hours numeric;
  v_conflict       boolean;
  v_reservation_id uuid;
  v_lima_today     date := (now() AT TIME ZONE 'America/Lima')::date;
  v_lima_target    date := (p_start_at AT TIME ZONE 'America/Lima')::date;
  v_max_date       date;
  v_dow            integer;
BEGIN
  -- Caller debe estar autenticado
  IF v_caller_email = '' THEN
    RETURN QUERY SELECT false, 'No autenticado'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Inputs básicos
  IF p_product_id IS NULL OR p_unit_id IS NULL OR p_start_at IS NULL OR p_end_at IS NULL OR p_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Datos de la reserva incompletos'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  IF p_end_at <= p_start_at THEN
    RETURN QUERY SELECT false, 'La hora de fin debe ser posterior a la de inicio'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  v_duration_hours := EXTRACT(EPOCH FROM (p_end_at - p_start_at)) / 3600.0;
  IF v_duration_hours < 0.25 THEN
    RETURN QUERY SELECT false, 'La reserva debe durar al menos 15 minutos'::text, NULL::uuid, NULL::int; RETURN;
  END IF;
  IF v_duration_hours > 4 THEN
    RETURN QUERY SELECT false, 'La reserva no puede exceder 4 horas'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Inicio en el futuro
  IF p_start_at <= now() THEN
    RETURN QUERY SELECT false, 'No puedes reservar en el pasado'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Ownership: p_user_id debe corresponder al alumno con email = caller
  -- Staff puede saltarse este check (admin gestiona reservas).
  SELECT id, carrera_id, activo, lower(email) AS email, banned_until
    INTO v_user FROM public.alumnos WHERE id = p_user_id;

  IF v_user IS NULL OR v_user.activo IS DISTINCT FROM true THEN
    RETURN QUERY SELECT false, 'Alumno no encontrado o inactivo'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  IF NOT public.is_staff() AND v_user.email <> v_caller_email THEN
    RETURN QUERY SELECT false, 'No puedes reservar a nombre de otro alumno'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  IF v_user.carrera_id IS NULL THEN
    RETURN QUERY SELECT false, 'Tu perfil no tiene carrera asignada'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Penalización vigente (banned_until)
  IF v_user.banned_until IS NOT NULL AND v_user.banned_until > now() THEN
    RETURN QUERY SELECT false, 'Tu cuenta está suspendida temporalmente'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Blacklist activa
  IF EXISTS (
    SELECT 1 FROM public.inventory_blacklist
    WHERE user_id = p_user_id AND blocked_until > now()
  ) THEN
    RETURN QUERY SELECT false, 'Tu cuenta está penalizada para reservar'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Día deshabilitado
  IF EXISTS (SELECT 1 FROM public.disabled_days WHERE date = v_lima_target) THEN
    RETURN QUERY SELECT false, 'Día no disponible para reservas'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Ventana semanal: domingo→domingo
  v_dow := EXTRACT(DOW FROM v_lima_today)::int;
  v_max_date := v_lima_today + (CASE WHEN v_dow = 0 THEN 7 ELSE (7 - v_dow) END);
  IF v_lima_target > v_max_date OR v_lima_target < v_lima_today THEN
    RETURN QUERY SELECT false, 'Fecha fuera de la ventana de reservas'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Daily limit: 1 reserva activa por producto/día
  IF EXISTS (
    SELECT 1 FROM public.inventory_reservations r
    WHERE r.user_id = p_user_id
      AND r.product_id = p_product_id
      AND r.status IN ('reserved','active','completed')
      AND (r.start_at AT TIME ZONE 'America/Lima')::date = v_lima_target
  ) THEN
    RETURN QUERY SELECT false, 'Solo 1 reserva por día por tipo de producto'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Unit válida: pertenece al producto, está activa, lock optimista
  SELECT id, product_id, status INTO v_unit
    FROM public.inventory_units
    WHERE id = p_unit_id
    FOR UPDATE;

  IF v_unit IS NULL THEN
    RETURN QUERY SELECT false, 'Unidad no encontrada'::text, NULL::uuid, NULL::int; RETURN;
  END IF;
  IF v_unit.product_id <> p_product_id THEN
    RETURN QUERY SELECT false, 'Unidad no corresponde al producto'::text, NULL::uuid, NULL::int; RETURN;
  END IF;
  IF v_unit.status <> 'active' THEN
    RETURN QUERY SELECT false, 'Unidad no disponible'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Conflicto temporal (con buffer de 2h respetando lógica previa)
  SELECT EXISTS (
    SELECT 1 FROM public.inventory_reservations ir
    WHERE ir.unit_id = p_unit_id
      AND ir.status NOT IN ('cancelled','not_picked_up','not_returned')
      AND ir.start_at < (p_end_at   + interval '2 hours')
      AND ir.end_at   > (p_start_at - interval '2 hours')
  ) INTO v_conflict;

  IF v_conflict THEN
    RETURN QUERY SELECT false, 'Unidad ya reservada en ese horario'::text, NULL::uuid, NULL::int; RETURN;
  END IF;

  -- Insert
  INSERT INTO public.inventory_reservations (
    product_id, unit_id, user_id, purpose, start_at, end_at, status
  ) VALUES (
    p_product_id, p_unit_id, p_user_id,
    -- limitar longitud
    CASE WHEN p_purpose IS NOT NULL THEN left(trim(p_purpose), 500) ELSE NULL END,
    p_start_at, p_end_at, 'reserved'
  ) RETURNING id INTO v_reservation_id;

  RETURN QUERY SELECT true, 'Reserva creada'::text, v_reservation_id, v_user.carrera_id;
END $$;

REVOKE ALL ON FUNCTION public.create_inventory_reservation(uuid,uuid,timestamptz,timestamptz,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_inventory_reservation(uuid,uuid,timestamptz,timestamptz,integer,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. RPC register_alumno (C-8)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.register_alumno(text,text,text,uuid);
DROP FUNCTION IF EXISTS public.register_alumno(text,text,text,integer);

CREATE OR REPLACE FUNCTION public.register_alumno(
  p_email       text,
  p_nombre      text,
  p_apellido    text,
  p_carrera_id  integer
) RETURNS TABLE(success boolean, message text, alumno_id integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_email text := lower(trim(coalesce(p_email,'')));
  v_id    integer;
BEGIN
  IF v_email !~ '^[a-z0-9._%+-]+@upc\.edu\.pe$' THEN
    RETURN QUERY SELECT false, 'Solo se permiten correos @upc.edu.pe'::text, NULL::integer; RETURN;
  END IF;
  IF p_nombre IS NULL OR length(trim(p_nombre)) < 2 OR length(trim(p_nombre)) > 80 THEN
    RETURN QUERY SELECT false, 'Nombre inválido'::text, NULL::integer; RETURN;
  END IF;
  IF p_apellido IS NULL OR length(trim(p_apellido)) < 2 OR length(trim(p_apellido)) > 80 THEN
    RETURN QUERY SELECT false, 'Apellido inválido'::text, NULL::integer; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.carreras WHERE id = p_carrera_id) THEN
    RETURN QUERY SELECT false, 'Carrera inválida'::text, NULL::integer; RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM public.alumnos WHERE lower(email) = v_email) THEN
    -- mensaje genérico, no enumera
    RETURN QUERY SELECT true, 'Registro completado'::text, NULL::integer; RETURN;
  END IF;

  INSERT INTO public.alumnos(email, nombre, apellido, carrera_id, email_verificado, activo)
  VALUES (v_email, trim(p_nombre), trim(p_apellido), p_carrera_id, false, true)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT true, 'Registro completado'::text, v_id;
END $$;

REVOKE ALL ON FUNCTION public.register_alumno(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_alumno(text,text,text,integer) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 8. RPC cancel_reservation server-side
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_reservation(
  p_reservation_id uuid,
  p_reason text DEFAULT NULL
) RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_caller_email text := lower(coalesce(auth.email(), ''));
  v_res RECORD;
  v_alumno_id integer;
BEGIN
  IF v_caller_email = '' THEN
    RETURN QUERY SELECT false, 'No autenticado'::text; RETURN;
  END IF;

  SELECT id, user_id, status, start_at INTO v_res
    FROM public.inventory_reservations WHERE id = p_reservation_id;

  IF v_res IS NULL THEN
    RETURN QUERY SELECT false, 'Reserva no encontrada'::text; RETURN;
  END IF;

  IF NOT public.is_staff() THEN
    SELECT id INTO v_alumno_id FROM public.alumnos WHERE lower(email) = v_caller_email;
    IF v_res.user_id IS DISTINCT FROM v_alumno_id THEN
      RETURN QUERY SELECT false, 'Operación no permitida'::text; RETURN;
    END IF;
  END IF;

  -- Estados cancelables (solo reserved / active)
  IF v_res.status NOT IN ('reserved','active') THEN
    RETURN QUERY SELECT false, 'La reserva ya no se puede cancelar'::text; RETURN;
  END IF;

  UPDATE public.inventory_reservations
     SET status = 'cancelled',
         cancellation_reason = CASE WHEN p_reason IS NOT NULL THEN left(trim(p_reason), 500) ELSE NULL END
   WHERE id = p_reservation_id;

  RETURN QUERY SELECT true, 'Reserva cancelada'::text;
END $$;

REVOKE ALL ON FUNCTION public.cancel_reservation(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_reservation(uuid,text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. RPC disable_day (admin) — atómico: marca día y cancela reservas
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.disable_day(
  p_date date,
  p_reason text DEFAULT 'Día inhabilitado por administración'
) RETURNS TABLE(success boolean, message text, cancelled_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'Solo administradores'::text, 0; RETURN;
  END IF;

  INSERT INTO public.disabled_days(date) VALUES (p_date) ON CONFLICT (date) DO NOTHING;

  UPDATE public.inventory_reservations
     SET status = 'cancelled',
         cancellation_reason = left(coalesce(p_reason,'Día inhabilitado'), 500)
   WHERE status IN ('reserved','active')
     AND (start_at AT TIME ZONE 'America/Lima')::date = p_date;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT true, 'Día deshabilitado'::text, v_count;
END $$;

REVOKE ALL ON FUNCTION public.disable_day(date,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_day(date,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enable_day(p_date date)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT false, 'Solo administradores'::text; RETURN;
  END IF;
  DELETE FROM public.disabled_days WHERE date = p_date;
  RETURN QUERY SELECT true, 'Día habilitado'::text;
END $$;

REVOKE ALL ON FUNCTION public.enable_day(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enable_day(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10. Trigger: máquina de estados de reservation.status (A-4)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_reservation_status_transition()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'reserved'      AND NEW.status IN ('active','cancelled','not_picked_up')) OR
    (OLD.status = 'active'        AND NEW.status IN ('completed','cancelled','not_returned')) OR
    (OLD.status = 'not_returned'  AND NEW.status = 'completed') OR
    (OLD.status = 'not_picked_up' AND NEW.status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Transición de estado inválida: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reservation_status_transition ON public.inventory_reservations;
CREATE TRIGGER trg_reservation_status_transition
BEFORE UPDATE OF status ON public.inventory_reservations
FOR EACH ROW EXECUTE FUNCTION public.fn_reservation_status_transition();

COMMIT;

-- =============================================================================
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente):
--   SELECT relrowsecurity FROM pg_class WHERE relname IN ('alumnos','carreras');
--   SELECT * FROM pg_policies WHERE schemaname='public' ORDER BY tablename;
--   SELECT proname, prosecdef FROM pg_proc WHERE proname IN
--     ('is_admin','is_staff','create_inventory_reservation','register_alumno','cancel_reservation','disable_day','enable_day');
-- =============================================================================
