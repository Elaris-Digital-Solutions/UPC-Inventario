-- Sanciones (D-12): un unico modelo, un unico trigger.
--
-- El disparador de los 15 dias son DOS not_picked_up en los ultimos 90 dias, no
-- dos de por vida: si no, el alumno queda a un fallo del bloqueo para siempre.
-- not_returned si es permanente.
--
-- Las transiciones van como operador, que es quien las hace en el mostrador (D-16).

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
select ('33333333-0000-0000-0000-00000000000' || n)::uuid,
       'bbbbbbbb-0000-0000-0000-000000000001',
       ('dddddddd-0000-0000-0000-00000000000' || n)::uuid,
       alumno_a, 'planton ' || n, t10, t10 + interval '2 hours'
  from fx, generate_series(1, 3) as n;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-000000000001';

reset role;

-- El nulo va tipado: is() es polimorfica y con un NULL sin tipo Postgres no
-- resuelve la firma.
select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  null::timestamptz,
  'una sola no_recogida no sanciona');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-000000000002';

reset role;

select ok(
  (select banned_until from public.alumnos where id = (select alumno_a from fx))
    between now() + interval '14 days' and now() + interval '16 days',
  'la segunda no_recogida en 90 dias sanciona 15 dias');


-- Una sancion nueva no acorta la que ya corria: greatest() se queda con la mayor.
update public.alumnos set banned_until = now() + interval '60 days'
 where id = (select alumno_a from fx);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-000000000003';

reset role;

select ok(
  (select banned_until from public.alumnos where id = (select alumno_a from fx))
    > now() + interval '59 days',
  'una sancion nueva no acorta una que ya estaba corriendo');


-- No devolver es permanente.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '33333333-0000-0000-0000-000000000009',
       'bbbbbbbb-0000-0000-0000-000000000003',
       'dddddddd-0000-0000-0000-000000000005',
       alumno_a, 'sin devolver', t10, t10 + interval '2 hours'
  from fx;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'active'
 where id = '33333333-0000-0000-0000-000000000009';
update public.inventory_reservations set status = 'not_returned'
 where id = '33333333-0000-0000-0000-000000000009';

reset role;

select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  'infinity'::timestamptz,
  'no devolver el equipo sanciona de forma permanente');


-- Las RPC de admin. Cierran la deuda de la tanda 1: banned_until y activo no
-- tienen GRANT para nadie, asi que sin esto la sancion solo caduca por tiempo.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.admin_set_ban(
      (select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
      null)$$,
  '42501', null,
  'un alumno no levanta sanciones');

reset role;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.admin_set_ban(
      (select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
      null)$$,
  'el admin levanta la sancion a mano');

reset role;

select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  null::timestamptz,
  'la sancion queda levantada');


select * from finish();

rollback;
