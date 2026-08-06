-- Reservas y encuestas: lectura acotada, escritura por ninguna puerta.
--
-- En la tanda 1 nadie recibe INSERT ni UPDATE sobre inventory_reservations. La
-- unica via sera la RPC de la tanda 2, y por eso las reglas de negocio (ventana
-- movil, feriados, limite diario, buffer) no se podran esquivar llamando a la API
-- directamente. Eso es P1-9.
--
-- Las politicas de encuesta de la linea base tenian el mismo defecto que
-- alumnos_update_own: UPDATE sin WITH CHECK. Se rehacen.
--
-- Actualizada en la tanda 2: la escritura del alumno sobre inventory_reservations
-- sigue cerrada, pero cambio el mecanismo que la cierra. Ver el comentario largo
-- junto a la prueba del alumno B.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


-- Se siembra una reserva del alumno B. Corre como postgres, que es dueno de la
-- tabla y por tanto no pasa por RLS.
insert into public.inventory_reservations
  (product_id, unit_id, alumno_id, start_at, end_at, status)
values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   'dddddddd-0000-0000-0000-000000000001',
   (select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000002'),
   now() + interval '1 day',
   now() + interval '1 day 2 hours',
   'reserved');


-- Alumno A: no ve la reserva de B, y no puede crear ni modificar ninguna.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.inventory_reservations), 0,
  'el alumno A no ve reservas ajenas');

select throws_ok(
  $$insert into public.inventory_reservations (product_id, unit_id, alumno_id, start_at, end_at)
    values ('bbbbbbbb-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000002',
            'a0000000-0000-0000-0000-000000000001', now(), now() + interval '1 hour')$$,
  '42501', null,
  'un alumno no inserta reservas: la unica puerta sera la RPC');

-- Encuesta propia: si. Ajena: no.
select lives_ok(
  $$insert into public.final_satisfaction_surveys (alumno_id, platform_rating)
    values ((select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'), 5)$$,
  'el alumno responde su propia encuesta');

select throws_ok(
  $$insert into public.final_satisfaction_surveys (alumno_id, platform_rating)
    values ((select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000002'), 1)$$,
  '42501', null,
  'el alumno NO puede responder la encuesta de otro');

reset role;


-- Alumno B: ve la suya, y no la mueve.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.inventory_reservations), 1,
  'el alumno B ve su propia reserva');

-- Esta prueba cambio de forma en la tanda 2, y el motivo importa.
--
-- Antes decia throws_ok(..., '42501'): el alumno no tenia NINGUN privilegio sobre
-- la tabla y el UPDATE moria por falta de privilegio. La tanda 2 concede
-- UPDATE (status, cancellation_reason) a `authenticated` para que la politica del
-- personal tenga sobre que aplicarse, y `authenticated` incluye a los alumnos.
--
-- Ahora al alumno le falta POLITICA, no privilegio: su UPDATE afecta a cero filas
-- y no lanza nada. Las dos formas son igual de seguras, pero solo una se puede
-- comprobar con throws_ok. Se comprueba el efecto.
update public.inventory_reservations set status = 'active';

reset role;

select is(
  (select status::text from public.inventory_reservations),
  'reserved',
  'el alumno B no mueve el estado de su propia reserva');


-- Operador: ve todas, porque tiene que entregarlas y recibirlas.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.inventory_reservations), 1,
  'el operador ve las reservas que tiene que atender');

reset role;


select * from finish();

rollback;
