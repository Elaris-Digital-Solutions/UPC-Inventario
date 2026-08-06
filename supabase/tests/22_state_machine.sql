-- Maquina de estados (P1-7).
--
-- El intento del alumno NO se prueba con throws_ok: tiene el privilegio de columna
-- -se concede a `authenticated`- y lo que le falta es politica. Sin politica el
-- UPDATE afecta a cero filas y no lanza nada. Se comprueba el efecto.
--
-- Quien mueve el estado es TODO el personal, admin y operador (D-16).

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '11111111-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'entrega', t10, t10 + interval '2 hours'
  from fx;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '11111111-0000-0000-0000-000000000002',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000002',
       alumno_a, 'saltos', t10, t10 + interval '2 hours'
  from fx;


-- Saltos invalidos: se rechazan sea quien sea el que los intente, porque los
-- impone un trigger y no una politica.
select throws_ok(
  $$update public.inventory_reservations set status = 'completed'
     where id = '11111111-0000-0000-0000-000000000002'$$,
  '23514', null,
  'de reserved no se salta a completed');

select throws_ok(
  $$update public.inventory_reservations set status = 'cancelled'
     where id = '11111111-0000-0000-0000-000000000002'$$,
  '23514', null,
  'cancelar sin motivo se rechaza (BR-17)');


-- El operador entrega y recibe.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$update public.inventory_reservations set status = 'active'
     where id = '11111111-0000-0000-0000-000000000001'$$,
  'el operador marca la entrega: reserved -> active');

select lives_ok(
  $$update public.inventory_reservations set status = 'completed'
     where id = '11111111-0000-0000-0000-000000000001'$$,
  'el operador marca la recepcion: active -> completed');

reset role;

select is(
  (select count(*)::int from public.reservation_status_log
    where reservation_id = '11111111-0000-0000-0000-000000000001'),
  2,
  'cada cambio de estado deja su rastro en la auditoria');


-- Un estado terminal no se abandona.
select throws_ok(
  $$update public.inventory_reservations set status = 'active'
     where id = '11111111-0000-0000-0000-000000000001'$$,
  '23514', null,
  'de un estado terminal no se sale');


-- El alumno: cero filas, sin error.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'active'
 where id = '11111111-0000-0000-0000-000000000002';

reset role;

select is(
  (select status::text from public.inventory_reservations
    where id = '11111111-0000-0000-0000-000000000002'),
  'reserved',
  'el alumno no mueve el estado de su propia reserva');


select * from finish();

rollback;
