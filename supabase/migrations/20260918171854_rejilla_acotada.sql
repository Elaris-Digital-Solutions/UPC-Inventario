-- H-10 (segunda auditoria, 2026-09-17): available_slots solo arma la rejilla
-- para una duracion que create_reservation aceptaria.
--
-- EL DEFECTO. La duracion no se validaba, y con -2147483648 el final de la serie
-- se iba 4 083 años adelante: 71 582 788 filas generadas ANTES del filtro de la
-- ventana, porque el planificador no sabe que la serie crece. Cada llamada de un
-- alumno cualquiera agotaba los 8 s del statement_timeout de authenticated
-- (medido en local el 2026-09-18: 8 009 ms).
--
-- LA CORRECCION ES LA REGLA QUE YA EXISTIA, no un tope nuevo: los pasos 3 y
-- 3-bis de create_reservation -minimo de app_settings, maximo del producto,
-- multiplo del bloque-. Asi se cierra de paso lo que la cabecera de la migracion
-- 34 prometia y no cumplia: con 45 minutos la rejilla ofrecia 27 franjas que la
-- RPC rechazaba todas.
--
-- La fecha dentro de la ventana no cambia ningun resultado -el filtro de abajo
-- ya los descarta-: solo corta antes. Por eso no tiene asercion propia.
--
-- Un producto inexistente pasa de ofrecer franjas con free = 0 a cero filas.
-- Ninguna pantalla llega a pedirlo.
--
-- La firma no cambia. Prueba: supabase/tests/49_rejilla_acotada.sql.

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
  -- Las cuatro ultimas condiciones son H-10: con ellas `h` tambien sale vacia.
  h as (
    select ch.opens_at, ch.closes_at,
           extract(dow from p_date)::smallint as weekday
      from public.campus_hours ch, s
     where ch.campus_id = p_campus_id
       and ch.weekday   = extract(dow from p_date)::smallint
       and p_duration_minutes >= s.min_duration_minutes
       and p_duration_minutes <= (select p.max_duration_hours * 60
                                    from public.products p
                                   where p.id = p_product_id)
       and p_duration_minutes % s.slot_minutes = 0
       and p_date between (now() at time zone 'America/Lima')::date
                      and ((now() + make_interval(days => s.booking_window_days))
                             at time zone 'America/Lima')::date
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
