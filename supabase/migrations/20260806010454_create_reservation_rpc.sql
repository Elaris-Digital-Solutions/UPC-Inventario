-- La RPC de reserva (tarea 1.5). Corrige P1-9 y resuelve C-4, C-7 y M-8.
--
-- Es la unica puerta de entrada. La tanda 1 no concedio INSERT sobre
-- inventory_reservations a nadie, asi que no hay forma de crear una reserva
-- saltandose estas validaciones ni llamando a PostgREST directamente. Eso es
-- exactamente lo que P1-9 describia como imposible.
--
-- SECURITY DEFINER con search_path vacio: corre como el dueno de la tabla, que no
-- esta sujeto a RLS, y por eso resuelve la identidad por su cuenta con auth.uid()
-- en vez de confiar en el parametro. El alumno no se pasa: se deduce.
--
-- De las cinco versiones sucesivas de esta RPC en los SQL sueltos se conserva la
-- variante por sede, que es la que trae rotacion justa, limite diario y sancion.
--
-- El EXCLUDE queda como ultima red: si dos alumnos piden la misma unidad en la
-- misma franja a la vez, uno recibe exclusion_violation y el bucle le busca otra
-- unidad en lugar de rendirse.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.4.


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


-- Al crear una funcion, PUBLIC recibe EXECUTE por defecto: revocarselo solo a
-- anon no cambiaria nada. (Leccion de la tanda 0.)
revoke execute on function
  public.create_reservation(uuid, uuid, timestamptz, int, text) from public, anon;
grant execute on function
  public.create_reservation(uuid, uuid, timestamptz, int, text) to authenticated;
