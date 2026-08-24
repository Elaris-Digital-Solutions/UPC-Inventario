-- Q-17 / D-38: no se cancela una reserva reserved cuyo start_at ya paso.
--
-- Las reservas con start_at pasado se insertan directamente, como postgres y
-- antes de cualquier "set local role": create_reservation rechaza el pasado a
-- proposito (20260806171347_duration_slot_multiple.sql:107), asi que la RPC
-- de creacion no sirve para montar esta fixture.
--
-- Por que estas unidades y no otras:
--   R1 y R2 comparten la unidad UNICA del tripode (dddddddd-...0004): R1 ayer
--   a las 10:00 y R2 manana a las 10:00 quedan a casi 24 h de distancia, muy
--   por encima del buffer de 30 min del tripode, asi que el EXCLUDE
--   anti-solape no las choca aunque compartan unidad.
--   R3 usa una unidad de la CAMARA (dddddddd-...0001, hay tres) en vez del
--   tripode: cae en la misma franja horaria que R1 (ayer 10:00-12:00) a
--   proposito, para no depender otra vez de la separacion de fechas, y al ser
--   una unidad distinta el EXCLUDE es indiferente a que coincidan las horas.
--
-- R1 y R3 no pueden ser la misma fila: la asercion 3 mueve R1 a
-- not_picked_up, que es terminal, y la asercion 5 necesita una reserva que
-- siga en reserved para poder cancelarla por la RPC.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

create temporary table fx as
select a.id as alumno_a,
       (((now() at time zone 'America/Lima')::date - 1) + time '10:00')
         at time zone 'America/Lima' as t_ayer,
       (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t_manana
  from public.alumnos a
 where a.auth_user_id = 'a0000000-0000-0000-0000-000000000001';


-- R1: tripode, ayer 10:00-12:00. Para las aserciones 1, 2 y 3.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '31313131-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000002',
       'dddddddd-0000-0000-0000-000000000004',
       alumno_a, 'ya empezo, para el intento de cancelacion', t_ayer, t_ayer + interval '2 hours'
  from fx;

-- R2: tripode, manana 10:00-12:00 (misma unidad que R1, sin solape posible
-- por la distancia de fechas). Para la asercion 4.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '31313131-0000-0000-0000-000000000002',
       'bbbbbbbb-0000-0000-0000-000000000002',
       'dddddddd-0000-0000-0000-000000000004',
       alumno_a, 'todavia no empieza, control de que la regla vieja sigue', t_manana, t_manana + interval '2 hours'
  from fx;

-- R3: camara (unidad distinta de la del tripode), ayer 10:00-12:00. Para la
-- asercion 5.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '31313131-0000-0000-0000-000000000003',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'ya empezo, la cancela el personal', t_ayer, t_ayer + interval '2 hours'
  from fx;


-- 1) El alumno dueno no puede cancelar una reserva reserved que ya empezo.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.cancel_reservation('31313131-0000-0000-0000-000000000001', 'no llegue a tiempo')$$,
  '%ya empezo%',
  'el alumno no cancela una reserva reserved cuyo start_at ya paso (D-38)');

-- 2) Y sigue en reserved: el rechazo no toco la fila. Falta de politica deja
-- un UPDATE en cero filas sin error, asi que se comprueba el efecto y no solo
-- la excepcion.
select is(
  (select status::text from public.inventory_reservations
    where id = '31313131-0000-0000-0000-000000000001'),
  'reserved',
  'la reserva rechazada sigue en reserved despues del intento del alumno');

reset role;


-- 3) El personal SI puede marcarla not_picked_up: es el objetivo entero de
-- Q-17. UPDATE directo, no RPC -el personal tiene reservations_update_staff-,
-- y se comprueba el efecto en la base.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations
   set status = 'not_picked_up'
 where id = '31313131-0000-0000-0000-000000000001';

select is(
  (select status::text from public.inventory_reservations
    where id = '31313131-0000-0000-0000-000000000001'),
  'not_picked_up',
  'el personal si marca not_picked_up sobre la reserva que el alumno no pudo cancelar (Q-17)');

reset role;


-- 4) Una reserva reserved que todavia no empieza se sigue cancelando igual
-- que antes: la regla nueva no rompe la vieja.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.cancel_reservation('31313131-0000-0000-0000-000000000002', 'ya no lo necesito')$$,
  'una reserva reserved que todavia no empieza se sigue cancelando igual que antes');

reset role;


-- 5) El personal SI puede cancelar por la RPC una reserva ya empezada: la
-- comprobacion nueva es solo para el alumno (decision de alcance de D-38).
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.cancel_reservation('31313131-0000-0000-0000-000000000003', 'aviso por telefono, se cayo el laboratorio')$$,
  'el personal si cancela por la RPC una reserva ya empezada (decision de alcance de D-38)');

reset role;


select * from finish();

rollback;
