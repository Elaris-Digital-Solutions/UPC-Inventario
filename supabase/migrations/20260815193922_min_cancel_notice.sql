-- M-12 / D-70, D-71: margen minimo para cancelar antes de empezar.
--
-- D-38 -migracion 23, 20260812053243_cancel_before_start.sql- cerro la mitad de
-- M-12: no se cancela una reserva que YA EMPEZO. Esta es la otra mitad.
--
-- POR QUE UNA COLUMNA Y NO UNA CONSTANTE -D-70-: el numero correcto se elige
-- viendo como cancela la gente de verdad, y con una constante cambiarlo exige
-- otra migracion. Se descarto tambien "por producto", como buffer_minutes: no
-- hay ningun indicio de que el margen deba variar por equipo, y D-39 ya
-- resolvio un caso igual eligiendo no tocar SQL.
--
-- EL CERO ES DELIBERADO y no un descuido del rango: deja APAGAR la regla sin
-- otra migracion. Con el margen en 0 la segunda comprobacion de abajo se vuelve
-- `v_start_at <= now()`, que es exactamente D-38, asi que nunca dispara por su
-- cuenta.

alter table public.app_settings
  add column min_cancel_minutes smallint not null default 60
    check (min_cancel_minutes between 0 and 1440);

-- EL GRANT ENUMERA LAS COLUMNAS POR NOMBRE -ver 20260806002459_reservation_settings.sql:67-,
-- asi que una columna nueva NO queda cubierta sola. Sin esta linea,
-- guardarAjustes() -lib/admin/acciones.ts- responde HTTP 403 con 42501 al
-- mandarla, y NINGUNA herramienta local lo ve antes: typecheck, lint y build
-- pasan, porque un privilegio no esta en el tipo.
--
-- Verificado el 2026-08-15 contra PRODUCCION y no solo contra el archivo:
-- information_schema.column_privileges devuelve exactamente seis columnas con
-- UPDATE para authenticated, ninguna mas.
grant update (min_cancel_minutes) on public.app_settings to authenticated;

-- La politica app_settings_update_admin NO se toca: no enumera columnas y su
-- USING ya exige admin.

-- CREATE OR REPLACE conserva los privilegios de la funcion: sin drop delante,
-- como ya midio 20260806171347_duration_slot_multiple.sql. El revoke a public y
-- anon sigue en pie y no se repite aqui.

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason         text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner     uuid;
  v_status    public.reservation_status;
  v_start_at  timestamptz;
  v_alumno_id uuid;
  v_margen    integer;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'La cancelacion exige un motivo' using errcode = 'check_violation';
  end if;

  select r.alumno_id, r.status, r.start_at into v_owner, v_status, v_start_at
    from public.inventory_reservations r
   where r.id = p_reservation_id;
  if not found then
    raise exception 'Reserva inexistente' using errcode = 'no_data_found';
  end if;

  v_alumno_id := private.current_alumno_id();

  if not private.is_staff()
     and (v_alumno_id is null or v_alumno_id <> v_owner) then
    raise exception 'No puedes cancelar una reserva ajena' using errcode = '42501';
  end if;

  if v_status <> 'reserved' then
    raise exception 'Solo se cancela una reserva en estado reserved (esta en %)', v_status
      using errcode = 'check_violation';
  end if;

  -- Q-17 / D-38: solo para el alumno. El personal cancela una reserva ya
  -- empezada por esta misma RPC o por UPDATE directo; las dos puertas quedan
  -- iguales de permisivas para el.
  --
  -- VA PRIMERO Y CON SU MENSAJE ORIGINAL, y las dos cosas importan. Cuando
  -- varias reglas rechazan la misma entrada, contesta la mas fundamental: "ya
  -- empezo" es mas fundamental que "faltan menos de X minutos", y ademas son
  -- dos cosas distintas para quien las lee. Y el texto exacto lo AFIRMA
  -- 31_cancel_before_start.sql:74 con throws_ilike '%ya empezo%'.
  if not private.is_staff() and v_start_at <= now() then
    raise exception 'No puedes cancelar una reserva que ya empezo' using errcode = 'check_violation';
  end if;

  -- M-12 / D-70, D-71: y si todavia no empezo, tiene que faltar al menos el
  -- margen configurado. Misma exencion para el personal, por el mismo motivo
  -- que la comprobacion de arriba.
  --
  -- EL `if not found` NO ES CEREMONIA, y no estaba en el plan: sin el, una
  -- fila de configuracion ausente dejaria v_margen en NULL, la comparacion
  -- daria NULL, y un NULL en un `if` NO DISPARA. O sea que la regla se
  -- apagaria EN SILENCIO justo cuando la base esta mal. Es el mismo genero que
  -- "falta de politica deja el UPDATE en cero filas sin error". Las otras dos
  -- funciones que leen esta tabla -create_reservation y la de
  -- duration_slot_multiple- ya comprueban lo mismo con este mismo mensaje.
  select s.min_cancel_minutes into v_margen from public.app_settings s;
  if not found then
    raise exception 'Falta la fila de configuracion en app_settings';
  end if;

  if not private.is_staff()
     and v_start_at <= now() + make_interval(mins => v_margen) then
    raise exception 'Solo puedes cancelar hasta % minutos antes de que empiece la reserva', v_margen
      using errcode = 'check_violation';
  end if;

  update public.inventory_reservations
     set status = 'cancelled',
         cancellation_reason = p_reason
   where id = p_reservation_id;
end $$;
