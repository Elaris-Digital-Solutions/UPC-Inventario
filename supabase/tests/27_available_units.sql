-- Disponibilidad por franja (1.10).
--
-- La asercion que de verdad importa es la ultima: dos alumnos distintos tienen
-- que obtener el MISMO numero. Un alumno solo ve sus propias reservas, asi que si
-- la funcion se evaluara con sus privilegios, las reservas ajenas serian
-- invisibles y le diria que esta libre todo lo que otros tienen ocupado. Ese es
-- el calendario que ofrece franjas que la RPC luego rechaza.
--
-- Que esa asercion detecta el fallo esta MEDIDO, no razonado. El 2026-08-06, con
-- una reserva del alumno A sobre una de las tres camaras, se llamo a la funcion
-- como alumno B en sus dos versiones:
--
--   con SECURITY DEFINER ... B ve 2   <- correcto
--   sin SECURITY DEFINER ... B ve 3   <- le ofrece una camara ocupada
--
-- Si alguien quita el SECURITY DEFINER, esta prueba lo detiene.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

delete from public.disabled_days;


-- La camara: 3 unidades en Monterrico, buffer por defecto de 120 min.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
    120),
  3,
  'sin reservas, las tres camaras estan disponibles');

select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
  120, 'Ocupa una');

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
    120),
  2,
  'una reserva descuenta una unidad de esa franja');

-- La reserva ocupa [10:00, 12:00) y su blocked_range llega hasta las 14:00.
select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '13:00') at time zone 'America/Lima',
    60),
  2,
  'dentro del buffer, la unidad sigue sin estar disponible');

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '14:00') at time zone 'America/Lima',
    60),
  3,
  'pasado el buffer, vuelve a estar disponible');

reset role;


-- El alumno B no ve la reserva de A, pero tiene que ver el mismo conteo.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
    120),
  2,
  'otro alumno ve el mismo conteo aunque no vea la reserva ajena');

reset role;


select * from finish();

rollback;
