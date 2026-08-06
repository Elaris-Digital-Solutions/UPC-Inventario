-- Cancelacion con motivo obligatorio (BR-17).
--
-- Se usa el TRIPODE y no la camara a proposito. El tripode tiene una sola unidad
-- en Monterrico; la camara tiene tres. Con la camara, la ultima prueba -"cancelar
-- libera la franja"- pasaria igual sin haber cancelado nada, porque a quien pide
-- la franja le tocaria otra de las tres unidades. Pasaba en verde por casualidad.
-- Con una unidad unica, si la cancelacion no libera, la RPC responde que no hay
-- unidades disponibles.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

delete from public.disabled_days;


create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '22222222-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000002',
       'dddddddd-0000-0000-0000-000000000004',
       alumno_a, 'para cancelar', t10, t10 + interval '2 hours'
  from fx;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', 'me da igual')$$,
  '42501', null,
  'un alumno no cancela la reserva de otro');

reset role;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', '   ')$$,
  '%motivo%',
  'cancelar sin motivo se rechaza, y un motivo en blanco es sin motivo');

select lives_ok(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', 'Se suspendio la clase')$$,
  'el alumno cancela su propia reserva');

select throws_ilike(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', 'Otra vez')$$,
  '%reserved%',
  'una reserva ya cancelada no se cancela dos veces');

reset role;


select is(
  (select new_status::text || ' | ' || reason from public.reservation_status_log
    where reservation_id = '22222222-0000-0000-0000-000000000001'),
  'cancelled | Se suspendio la clase',
  'la cancelacion y su motivo quedan en la auditoria');


-- El EXCLUDE es parcial: la franja de la unica unidad vuelve a estar libre.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000002',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      120, 'Aprovecho el hueco')$$,
  'cancelar libera la franja para otro alumno');

reset role;


select * from finish();

rollback;
