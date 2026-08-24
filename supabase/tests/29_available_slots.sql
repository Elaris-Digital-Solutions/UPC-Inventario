-- D-20: la rejilla del dia en una sola llamada.
--
-- La propiedad que se prueba no es "devuelve N filas": es que TODO lo que la
-- rejilla ofrece lo acepta create_reservation. Por eso las aserciones miran los
-- bordes -primera franja, ultima franja, dia inhabilitado, fuera de ventana- y no
-- el conteo del medio.
--
-- La rejilla puede ser mas ESTRICTA que la RPC, nunca mas laxa.
--
-- Camara: 3 unidades en Monterrico, max 4 h, buffer 120. Horario 08:00-22:00,
-- bloques de 30. Con duracion 120 la ultima franja empieza a las 20:00 y termina
-- justo al cierre: 25 franjas.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

delete from public.disabled_days;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;


select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120)),
  25,
  'de 08:00 a 22:00 con duracion 120 salen 25 franjas');

select is(
  (select min(slot_start) at time zone 'America/Lima' from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120))::time,
  time '08:00',
  'la primera franja empieza a la hora de apertura');

-- La ultima franja mas la duracion cae exactamente en el cierre. La RPC acepta la
-- igualdad y rechaza pasarse, asi que este borde tiene que coincidir.
select is(
  (select max(slot_start) at time zone 'America/Lima' from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120))::time,
  time '20:00',
  'la ultima franja termina justo al cierre');

select is(
  (select free from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120)
    order by slot_start limit 1),
  3,
  'sin reservas, las tres camaras estan libres en la primera franja');


-- Un dia inhabilitado no devuelve franjas grises: no devuelve nada.
--
-- El insert se hace FUERA del rol de alumno, y no por comodidad: inhabilitar un
-- dia es cosa del personal, asi que bajo `authenticated` RLS lo rechaza con
-- "new row violates row-level security policy". Que haga falta salir del rol para
-- montar el escenario es la prueba de que la politica esta puesta.
reset role;

insert into public.disabled_days (date)
values ((now() at time zone 'America/Lima')::date + 2);

set local role authenticated;

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 2), 120)),
  0,
  'un dia inhabilitado no ofrece ninguna franja');

-- Fuera de la ventana movil de 7 dias, tampoco.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 30), 120)),
  0,
  'fuera de la ventana movil no ofrece ninguna franja');

reset role;


select * from finish();

rollback;
