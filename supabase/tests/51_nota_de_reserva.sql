-- Una nota de unidad puede decir de que reserva es, para que el historial de
-- /admin/reservas la muestre en su fila.
--
-- La FK es COMPUESTA (reservation_id, unit_id): una nota no puede colgar de la
-- reserva de OTRA unidad. Lo cierra la base, no la pantalla.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);


create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '11111111-0000-0000-0000-000000000051',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'nota', t10, t10 + interval '2 hours'
  from fx;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$insert into public.inventory_unit_notes (unit_id, note, reservation_id)
    values ('dddddddd-0000-0000-0000-000000000001', 'Volvio sin el cargador',
            '11111111-0000-0000-0000-000000000051')$$,
  'el operador anota la devolucion atada a su reserva');

select is(
  (select count(*)::int from public.inventory_unit_notes
    where reservation_id = '11111111-0000-0000-0000-000000000051'),
  1,
  'la nota se encuentra por su reserva');

select throws_ok(
  $$insert into public.inventory_unit_notes (unit_id, note, reservation_id)
    values ('dddddddd-0000-0000-0000-000000000002', 'otra unidad',
            '11111111-0000-0000-0000-000000000051')$$,
  '23503', null,
  'una nota no cuelga de la reserva de otra unidad');

select lives_ok(
  $$insert into public.inventory_unit_notes (unit_id, note)
    values ('dddddddd-0000-0000-0000-000000000001', 'sin reserva')$$,
  'la nota general del mostrador sigue sin reserva');

reset role;


-- Borrar la reserva no borra la nota: queda en el historial de la unidad.
delete from public.inventory_reservations where id = '11111111-0000-0000-0000-000000000051';

select is(
  (select reservation_id from public.inventory_unit_notes where note = 'Volvio sin el cargador'),
  null,
  'al borrar la reserva la nota se queda, sin reserva');


select * from finish();

rollback;
