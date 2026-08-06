-- D-20: la rejilla del dia en una sola llamada.
--
-- Con bloques de 30 minutos de 08:00 a 22:00, pintar un dia con available_units
-- son 28 llamadas. El coste no es solo la latencia: son 28 fotos distintas de la
-- base, y la primera franja y la ultima se responden con estados diferentes.
--
-- DELEGA en available_units en vez de repetir el calculo del rango. Si las dos
-- formulas se separan, el calendario miente -es la advertencia que ya lleva
-- escrita 20260806023952_available_units.sql-.
--
-- SECURITY DEFINER por el mismo motivo medido en la tanda 3: un alumno no ve las
-- reservas ajenas, y con sus propios privilegios veria libre todo lo ocupado.
--
-- Los tres filtros no son cosmetica. La propiedad que sostiene el calendario es
-- que TODO lo que la rejilla ofrece lo acepta create_reservation:
--
--   * el pasado, con > y no >=: en el instante exacto la rejilla no lo ofrece y
--     la RPC si lo aceptaria. La rejilla puede ser mas ESTRICTA, nunca mas laxa.
--   * la ventana movil, comparando INSTANTES y no fechas. Comparar
--     p_date <= hoy + 7 ofreceria el septimo dia entero mientras la RPC solo
--     acepta hasta la hora actual de ese dia.
--   * el dia inhabilitado, que devuelve cero filas y no 28 franjas grises.
--
-- La ultima franja es closing_time - duracion, para que la reserva termine justo
-- al cierre: la RPC rechaza end_at::time > closing_time pero acepta la igualdad.
--
-- Ver MIGRATION_DOCS/FASE_2_DISENO.md, seccion 11.2, y la correccion 1 de
-- MIGRATION_DOCS/PLANES/FASE_2_TANDA_0.md.

create or replace function public.available_slots(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_date             date,
  p_duration_minutes int
) returns table (slot_start timestamptz, free int)
language sql stable security definer set search_path = ''
as $$
  with s as (select * from public.app_settings),
  grid as (
    select generate_series(
             ((p_date + (select opening_time from s)) at time zone 'America/Lima'),
             ((p_date + (select closing_time from s)) at time zone 'America/Lima')
               - make_interval(mins => p_duration_minutes),
             make_interval(mins => (select slot_minutes from s))
           ) as slot_start
  )
  select g.slot_start,
         public.available_units(p_product_id, p_campus_id, g.slot_start, p_duration_minutes)
    from grid g
   where g.slot_start > now()
     and g.slot_start <= now()
           + make_interval(days => (select booking_window_days from s))
     and not exists (
       select 1 from public.disabled_days d where d.date = p_date
     );
$$;

-- Al crear una funcion, PUBLIC recibe EXECUTE por defecto. (Leccion de la tanda 0
-- de la Fase 1, y lo que vigila 19_function_hardening.sql desde D-19.)
revoke execute on function
  public.available_slots(uuid, uuid, date, int) from public, anon;
grant execute on function
  public.available_slots(uuid, uuid, date, int) to authenticated;
