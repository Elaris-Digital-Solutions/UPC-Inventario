-- D-74 / D-90: la rejilla y la validacion salen de los turnos, no de una hora
-- de apertura unica.
--
-- LAS DOS FIRMAS NO CAMBIAN, y eso no es suerte: las dos RPC ya recibian
-- p_campus_id desde la Fase 2 y lo IGNORABAN al leer el horario. Ninguna llamada
-- del cliente se toca.
--
-- LA REJILLA NACE DE campus_hours Y LOS TURNOS LA RECORTAN, nunca al reves.
-- Generarla desde los tramos de la interseccion parece lo natural y rompe dos
-- veces: dos turnos solapados producen la misma franja dos veces, y un turno que
-- empiece a las 09:07 produce una rejilla DESALINEADA del bloque -justo lo que
-- D-54 existe para impedir-. Generando desde el techo de la sede y filtrando por
-- cobertura, las dos desaparecen solas: cero duplicados sin distinct y cero
-- desalineacion sin restriccion nueva sobre staff_shifts.
--
-- LA COBERTURA ES POR LA UNION DE LOS TURNOS (D-90), no por un turno solo. Con
-- el operador A de 08:00 a 12:00 y el B de 12:00 a 16:00, una reserva de 11:00 a
-- 13:00 NO cabe entera en ninguno de los dos y si tiene a alguien en el mostrador
-- todo el rato: se retira con A y se devuelve con B. Por eso la comprobacion es
-- "cada BLOQUE del tramo cae en algun turno" y no "el tramo cabe en un turno", y
-- como D-19 obliga a que la duracion sea multiplo del bloque, eso se escribe sin
-- unir intervalos y sin distinct.
--
-- Medido en local antes de escribir esto, con control negativo: con los dos
-- turnos consecutivos la rejilla de 2 h ofrece 13 franjas, incluida 11:00-13:00;
-- con un hueco de una hora entre ellos ofrece 8, y las 5 que faltan son
-- exactamente las que cruzan el hueco. Sobrevive 09:00-11:00, que termina en el
-- borde: por eso ends_at se compara con >= y no con >.
--
-- OJO CON LOS PARENTESIS: `at time zone` liga MAS FUERTE que `+`. Escribir
-- `x + make_interval(...) at time zone 'America/Lima'` falla con
-- "function pg_catalog.timezone(unknown, interval) does not exist", y el mensaje
-- no señala al operador culpable. Medido al prototipar.
--
-- SE CONSERVA LA PROPIEDAD QUE SOSTIENE EL CALENDARIO: todo lo que la rejilla
-- ofrece, create_reservation lo acepta. La rejilla puede ser MAS ESTRICTA, nunca
-- mas laxa. Esta escrita en la cabecera de la migracion 21 y se repite aqui
-- porque es la unica que rompe en silencio.
--
-- app_settings.opening_time y closing_time siguen existiendo tras esta migracion
-- y ya NO gobiernan nada. Las borra la 35 (D-91), en migracion propia: primero
-- las RPC dejan de leerlas, despues se quitan.
--
-- Ver MIGRATION_DOCS/FASE_3_DISENO.md seccion 5 y
-- MIGRATION_DOCS/PLANES/FASE_3_TANDA_4.md.


-- 1 ----------------------------------------------------------- available_slots

create or replace function public.available_slots(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_date             date,
  p_duration_minutes int
) returns table (slot_start timestamptz, free int)
language sql stable security definer set search_path = ''
as $$
  with s as (select * from public.app_settings),
  -- Un dia SIN FILA en campus_hours es un dia cerrado (D-75): `h` sale vacia,
  -- `grid` sale vacia y la funcion devuelve cero franjas. No hay que escribir
  -- nada para ese caso, y por eso se dice: parece una omision y es el diseño.
  h as (
    select ch.opens_at, ch.closes_at,
           extract(dow from p_date)::smallint as weekday
      from public.campus_hours ch
     where ch.campus_id = p_campus_id
       and ch.weekday   = extract(dow from p_date)::smallint
  ),
  grid as (
    select generate_series(
             ((p_date + h.opens_at)  at time zone 'America/Lima'),
             ((p_date + h.closes_at) at time zone 'America/Lima')
               - make_interval(mins => p_duration_minutes),
             make_interval(mins => (select slot_minutes from s))
           ) as slot_start,
           h.weekday
      from h
  )
  select g.slot_start,
         public.available_units(p_product_id, p_campus_id, g.slot_start, p_duration_minutes)
    from grid g
   where g.slot_start > now()
     and g.slot_start <= now()
           + make_interval(days => (select booking_window_days from s))
     and not exists (
       select 1 from public.disabled_days d where d.date = p_date
     )
     -- La cobertura, bloque a bloque (D-90). El NOT EXISTS de fuera dice "no
     -- queda ni un bloque descubierto"; el de dentro, "este bloque no lo cubre
     -- ningun turno".
     and not exists (
       select 1
         from generate_series(
                g.slot_start,
                g.slot_start + make_interval(mins => p_duration_minutes)
                  - make_interval(mins => (select slot_minutes from s)),
                make_interval(mins => (select slot_minutes from s))
              ) as b(bloque)
        where not exists (
          select 1
            from public.staff_shifts sh
           where sh.campus_id = p_campus_id
             and sh.weekday   = g.weekday
             and sh.starts_at <= (b.bloque at time zone 'America/Lima')::time
             and sh.ends_at   >= ((b.bloque + make_interval(mins => (select slot_minutes from s)))
                                   at time zone 'America/Lima')::time
        )
     );
$$;

revoke execute on function
  public.available_slots(uuid, uuid, date, int) from public, anon;
grant execute on function
  public.available_slots(uuid, uuid, date, int) to authenticated;


-- 2 -------------------------------------------------------- create_reservation

-- La funcion se copia entera desde 20260806171347_duration_slot_multiple.sql,
-- con la misma firma y el mismo search_path vacio. Lo unico que cambia es el
-- paso 5 -el horario sale de campus_hours- y el paso 6-bis, que es nuevo.
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
  v_weekday    smallint;
  v_horario    public.campus_hours;
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

  -- 5 · dia inhabilitado y horario DE LA SEDE, siempre en America/Lima (C-7, M-7).
  --     La comparacion de fechas se hace en hora local: en UTC, una reserva de las
  --     20:00 de Lima cae al dia siguiente y el feriado no coincidiria.
  v_local_date := (p_start_at at time zone 'America/Lima')::date;
  v_weekday    := extract(dow from v_local_date)::smallint;

  if exists (select 1 from public.disabled_days d where d.date = v_local_date) then
    raise exception 'Ese dia no hay atencion';
  end if;

  -- D-76: "cerrado" y "sin operador" son dos causas distintas y se contestan
  -- distinto. Con un solo mensaje, el admin no sabe si le falta cargar el
  -- horario de la sede o el turno de alguien, que son dos pantallas distintas.
  select * into v_horario
    from public.campus_hours ch
   where ch.campus_id = p_campus_id
     and ch.weekday   = v_weekday;
  if not found then
    raise exception 'Ese dia la sede no abre' using errcode = 'check_violation';
  end if;

  if (p_start_at at time zone 'America/Lima')::time < v_horario.opens_at
     or (v_end_at at time zone 'America/Lima')::time > v_horario.closes_at
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

  -- 6-bis · cobertura de turnos (D-74, D-90). Va la ultima de las validaciones de
  --         tiempo por el mismo criterio que el paso 6: es la mas especifica, y
  --         contestar por el turno a quien pide una hora fuera del horario de la
  --         sede seria cierto e inutil.
  --
  --         La cuenta es IDENTICA a la de available_slots, y tiene que serlo: si
  --         las dos se separan, la rejilla ofrece franjas que la RPC rechaza y el
  --         calendario miente. Es la misma advertencia que lleva escrita
  --         20260806023952_available_units.sql.
  if exists (
    select 1
      from generate_series(
             p_start_at,
             v_end_at - make_interval(mins => v_settings.slot_minutes),
             make_interval(mins => v_settings.slot_minutes)
           ) as b(bloque)
     where not exists (
       select 1
         from public.staff_shifts sh
        where sh.campus_id = p_campus_id
          and sh.weekday   = v_weekday
          and sh.starts_at <= (b.bloque at time zone 'America/Lima')::time
          and sh.ends_at   >= ((b.bloque + make_interval(mins => v_settings.slot_minutes))
                                at time zone 'America/Lima')::time
     )
  ) then
    raise exception 'No hay ningun operador en ese horario' using errcode = 'check_violation';
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

revoke execute on function
  public.create_reservation(uuid, uuid, timestamptz, int, text) from public, anon;
grant execute on function
  public.create_reservation(uuid, uuid, timestamptz, int, text) to authenticated;
