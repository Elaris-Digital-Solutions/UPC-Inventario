-- Anti-doble-reserva (P1-6).
--
-- Las inserciones van como postgres, no como alumno: nadie tiene privilegio de
-- INSERT sobre inventory_reservations, y lo que se prueba aca es el constraint,
-- no la autorizacion. El dueno de la tabla no esta sujeto a RLS, pero si a los
-- constraints, que es justo lo que interesa.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);


-- Manana a las 10:00 en Lima. Fijo respecto del momento de la corrida, para que
-- la prueba no dependa de la hora a la que se ejecute.
create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;


insert into public.inventory_reservations
  (product_id, unit_id, alumno_id, purpose, start_at, end_at)
select 'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'primera', t10, t10 + interval '2 hours'
  from fx;

-- El buffer se suma solo al final: producto 1 usa el valor por defecto, 120 min.
select is(
  (select upper(blocked_range) from public.inventory_reservations
    where purpose = 'primera'),
  (select t10 + interval '4 hours' from fx),
  'blocked_range se rellena solo y suma el buffer al final');

-- Y sale del producto, no de una constante: el tripode tiene 30 min en el seed.
insert into public.inventory_reservations
  (product_id, unit_id, alumno_id, purpose, start_at, end_at)
select 'bbbbbbbb-0000-0000-0000-000000000002',
       'dddddddd-0000-0000-0000-000000000004',
       alumno_a, 'tripode', t10, t10 + interval '2 hours'
  from fx;

select is(
  (select upper(blocked_range) from public.inventory_reservations
    where purpose = 'tripode'),
  (select t10 + interval '2 hours 30 minutes' from fx),
  'el buffer sale de products.buffer_minutes (D-10)');


-- Misma unidad, franja pisada: el constraint lo rechaza.
select throws_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000001',
           alumno_a, 'pisada', t10 + interval '1 hour', t10 + interval '3 hours'
      from fx$$,
  '23P01', null,
  'dos reservas de la misma unidad no pueden solaparse');

-- Justo al terminar el buffer si entra. Sumar el buffer a los dos lados
-- rechazaria esta, que es exactamente el limite permitido.
select lives_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000001',
           alumno_a, 'pegada', t10 + interval '4 hours', t10 + interval '6 hours'
      from fx$$,
  'una reserva que empieza justo al terminar el buffer si entra');


-- El otro lado del borde: a un minuto de distancia, se rechaza. Junto con la
-- anterior, esto fija el limite exacto: 4 h entra, 3 h 59 min no.
--
-- Va sobre la UNIDAD 2, no sobre la 1. La unidad 1 ya tiene dos reservas -"primera"
-- y "pegada"- y una a t10+3h59 chocaria contra las dos: saldria 23P01 igual, pero
-- por el motivo equivocado, y la prueba pasaria sin probar nada. La unidad 2 se
-- siembra aqui con una sola reserva, para que el unico conflicto posible sea el
-- que interesa.
insert into public.inventory_reservations
  (product_id, unit_id, alumno_id, purpose, start_at, end_at)
select 'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000002',
       alumno_a, 'base del borde', t10, t10 + interval '2 hours'
  from fx;

select throws_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000002',
           alumno_a, 'casi pegada',
           t10 + interval '3 hours 59 minutes', t10 + interval '5 hours'
      from fx$$,
  '23P01', null,
  'a un minuto del borde del buffer, se rechaza');


-- El EXCLUDE es parcial: una reserva cancelada deja de bloquear.
-- El motivo va desde ya porque la Task 3 lo hara obligatorio.
update public.inventory_reservations
   set status = 'cancelled', cancellation_reason = 'prueba'
 where purpose = 'primera';

select lives_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000001',
           alumno_a, 'reemplazo', t10, t10 + interval '2 hours'
      from fx$$,
  'una reserva cancelada libera su franja');


select * from finish();

rollback;
