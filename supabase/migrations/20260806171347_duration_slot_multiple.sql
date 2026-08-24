-- D-19: la duracion de una reserva tiene que ser multiplo de slot_minutes.
-- Cierra Q-11.
--
-- El enunciado de Q-11 estaba incompleto por dos lados, y conviene dejarlo escrito
-- porque el enunciado equivocado sigue circulando:
--
--   1. Subir min_duration_minutes a 30 NO alinea nada. 45 minutos sigue siendo
--      mayor que 30 y sigue terminando a mitad de bloque. La regla que hace falta
--      es el multiplo, no el minimo.
--
--   2. Lo que desalinea la rejilla es duracion + buffer, no la duracion sola. Con
--      buffer_minutes = 120, una reserva de 10:00 a 10:15 no bloquea hasta las
--      10:30 sino hasta las 12:15. El hueco perdido esta al final del BLOQUEO.
--
-- Lo segundo no lo cierra esta migracion: el buffer puede desalinear la cola por
-- su cuenta y un CHECK de tabla no puede leer app_settings. Queda como Q-14, con
-- riesgo nulo hoy porque los 34 productos tienen buffer 120, multiplo de 30.
--
-- La validacion va DESPUES de la comprobacion de rango, no antes. 20 minutos
-- viola las dos reglas, y contestar por el multiplo seria cierto e inutil: la
-- regla mas fundamental es que no llega al minimo. Es la leccion de la tanda 2.
--
-- CREATE OR REPLACE conserva los privilegios de la funcion, asi que el revoke a
-- public y anon de 20260806010454 sigue en pie. No se da por hecho: MEDIDO en
-- local el 2026-08-06, junto con el contraejemplo -drop + create SI los resetea,
-- anon vuelve a true-. De ahi que aqui no haya un drop delante. Vigilado desde
-- ahora por 19_function_hardening.sql.
--
-- Ver MIGRATION_DOCS/FASE_2_DISENO.md, seccion 11.1.


alter table public.app_settings
  alter column min_duration_minutes set default 30;

update public.app_settings
   set min_duration_minutes = 30
 where min_duration_minutes < 30;


-- La funcion se copia entera desde 20260806010454_create_reservation_rpc.sql, con
-- la misma firma y el mismo search_path vacio. Lo unico nuevo es el bloque del
-- paso 3-bis.
create or replace function public.create_reservation(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_start_at         timestamptz,
  p_duration_minutes int,
  p_purpose          text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_alumno     public.alumnos;
  v_settings   public.app_settings;
  v_product    public.products;
  v_end_at     timestamptz;
  v_local_date date;
  v_unit_id    uuid;
  v_id         uuid;
begin
  -- 1 · identidad y perfil completo
  select * into v_alumno
    from public.alumnos
   where auth_user_id = (select auth.uid())
     and activo;
  if not found then
    raise exception 'No hay un alumno activo para esta sesion' using errcode = '42501';
  end if;
  if v_alumno.nombre is null or v_alumno.apellido is null or v_alumno.carrera_id is null then
    raise exception 'Completa tu perfil antes de reservar' using errcode = 'check_violation';
  end if;

  -- 2 · sancion vigente (D-12)
  if v_alumno.banned_until is not null and v_alumno.banned_until > now() then
    raise exception 'Tienes una sancion vigente hasta %', v_alumno.banned_until
      using errcode = 'check_violation';
  end if;

  select * into v_settings from public.app_settings;
  if not found then
    raise exception 'Falta la fila de configuracion en app_settings';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception 'Producto inexistente';
  end if;

  -- 3 · duracion, contra el producto y no contra una constante (D-1)
  if p_duration_minutes < v_settings.min_duration_minutes
     or p_duration_minutes > v_product.max_duration_hours * 60 then
    raise exception 'Duracion fuera del rango permitido para este producto';
  end if;

  -- 3-bis · y ademas multiplo del bloque (D-19). El orden respecto del paso 3 no
  --         es libre: quien pide 20 minutos viola las dos reglas, y contestarle
  --         por el multiplo seria cierto e inutil. Lo mas fundamental es que no
  --         llega al minimo.
  if p_duration_minutes % v_settings.slot_minutes <> 0 then
    raise exception 'La duracion tiene que ser multiplo de % minutos', v_settings.slot_minutes
      using errcode = 'check_violation';
  end if;

  v_end_at := p_start_at + make_interval(mins => p_duration_minutes);

  -- 4 · ventana movil (D-3)
  if p_start_at < now() then
    raise exception 'No se puede reservar en el pasado';
  end if;
  if p_start_at > now() + make_interval(days => v_settings.booking_window_days) then
    raise exception 'Fuera de la ventana de reserva';
  end if;

  -- 5 · dia inhabilitado y horario, siempre en America/Lima (C-7, M-7).
  --     La comparacion de fechas se hace en hora local: en UTC, una reserva de las
  --     20:00 de Lima cae al dia siguiente y el feriado no coincidiria.
  v_local_date := (p_start_at at time zone 'America/Lima')::date;

  if exists (select 1 from public.disabled_days d where d.date = v_local_date) then
    raise exception 'Ese dia no hay atencion';
  end if;

  if (p_start_at at time zone 'America/Lima')::time < v_settings.opening_time
     or (v_end_at at time zone 'America/Lima')::time > v_settings.closing_time
     or (v_end_at at time zone 'America/Lima')::date <> v_local_date then
    raise exception 'Fuera del horario de atencion';
  end if;

  -- 6 · alineacion con la grilla de bloques que ofrece la interfaz. Sin esto,
  --     slot_minutes seria una columna que nadie aplica y una llamada directa a
  --     la API podria pedir las 10:07. El check 60 % slot_minutes = 0 de
  --     app_settings garantiza que el bloque divide la hora.
  --
  --     Va DESPUES de la ventana y del horario, no antes. Es la comprobacion mas
  --     especifica de las tres, y ponerla primera hacia que a quien pedia una hora
  --     de ayer se le contestara por la rejilla en vez de por lo evidente. Lo
  --     detecto la prueba "no se reserva hacia atras", que recibio el mensaje del
  --     bloque.
  if (extract(epoch from (p_start_at - date_trunc('hour', p_start_at)))::int
        % (v_settings.slot_minutes * 60)) <> 0 then
    raise exception 'La hora de inicio no cae en un bloque de % minutos', v_settings.slot_minutes
      using errcode = 'check_violation';
  end if;

  -- 7 · limite diario por producto (BR-09)
  if (select count(*) from public.inventory_reservations r
        where r.alumno_id  = v_alumno.id
          and r.product_id = p_product_id
          and r.status in ('reserved', 'active')
          and (r.start_at at time zone 'America/Lima')::date = v_local_date)
     >= v_settings.daily_limit_per_product then
    raise exception 'Ya tienes una reserva de este producto para ese dia';
  end if;

  -- 8 · rotacion justa (M-8, BR-12): se recorren las unidades de menos usada a
  --     mas usada en vez de rendirse en la primera ocupada. El desempate por
  --     unit_code hace la eleccion determinista, y por tanto comprobable.
  for v_unit_id in
    select u.id
      from public.inventory_units u
      left join public.inventory_reservations r
        on r.unit_id = u.id
       and r.status in ('reserved', 'active', 'completed')
     where u.product_id = p_product_id
       and u.campus_id  = p_campus_id
       and u.status     = 'active'
     group by u.id, u.unit_code
     order by count(r.id) asc, u.unit_code asc
  loop
    begin
      perform 1 from public.inventory_units where id = v_unit_id for update skip locked;
      if not found then
        continue;
      end if;

      insert into public.inventory_reservations
        (product_id, unit_id, alumno_id, purpose, start_at, end_at)
      values (p_product_id, v_unit_id, v_alumno.id, p_purpose, p_start_at, v_end_at)
      returning id into v_id;

      return v_id;
    exception
      when exclusion_violation then
        continue;
    end;
  end loop;

  raise exception 'No hay unidades disponibles en esa franja';
end $$;
