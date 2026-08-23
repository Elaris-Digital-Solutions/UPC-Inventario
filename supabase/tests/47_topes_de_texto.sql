-- H-1 de la auditoria del 2026-08-23: las nueve columnas con tope de longitud.
--
-- LAS DOS PUNTAS EN CADA COLUMNA, y esto es lo unico importante de este archivo.
-- Con solo la punta que falla, un tope de CERO daria verde en las nueve: todo
-- fallaria, incluido lo legitimo, y la bateria lo llamaria exito. La asercion
-- que PASA es la que distingue "hay un tope" de "no entra nada".
--
-- TODO COMO postgres, sin un solo `set local role`, y es deliberado: un CHECK lo
-- aplica el MOTOR y no depende del rol que escriba. Probarlo con el rol mas
-- privilegiado que existe es la version fuerte de la afirmacion -- si postgres
-- no puede saltarselo, `authenticated` tampoco. Quien decide QUE FILAS ve cada
-- rol es RLS, y eso ya lo cubren 14_rls_alumnos.sql y 17_rls_reservations.sql;
-- aca se prueba CUANTO PESA una fila, que es otra pregunta.
--
-- SE PRUEBA POR UPDATE Y NO POR INSERT en las cinco tablas: el CHECK se evalua
-- igual en los dos caminos, y el update esquiva el EXCLUDE anti-solape de
-- inventory_reservations, sus dos triggers de estado y las claves ajenas de
-- todas. Menos andamiaje que montar y menos formas de que la prueba falle por
-- algo que no es lo que mide.
--
-- repeat('x', n) y no una cadena literal de 500 caracteres: el numero queda
-- LEGIBLE al lado del tope que afirma, y no hay que contar nada a mano.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(18);


-- ─────────────────────────────────────────────────────────────────────────────
-- alumnos.nombre y alumnos.apellido, tope 80
-- ─────────────────────────────────────────────────────────────────────────────

select lives_ok(
  $$update public.alumnos set nombre = repeat('x', 80)
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  'alumnos.nombre acepta 80');

select throws_ok(
  $$update public.alumnos set nombre = repeat('x', 81)
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'alumnos.nombre rechaza 81');

select lives_ok(
  $$update public.alumnos set apellido = repeat('x', 80)
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  'alumnos.apellido acepta 80');

select throws_ok(
  $$update public.alumnos set apellido = repeat('x', 81)
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '23514', null,
  'alumnos.apellido rechaza 81');


-- ─────────────────────────────────────────────────────────────────────────────
-- inventory_reservations.purpose (120) y .cancellation_reason (300)
--
-- La fila base se inserta aca y no en el seed: el seed NO siembra reservas a
-- proposito -- 14_rls_alumnos.sql afirma que el operador solo se ve a si mismo,
-- y una reserva sembrada le daria visibilidad sobre un alumno y rompria esa
-- prueba. Esta vive dentro de la transaccion y se va con el rollback.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '47474747-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       a.id, 'base para medir los topes',
       now() + interval '2 days', now() + interval '2 days 2 hours'
  from public.alumnos a
 where a.auth_user_id = 'a0000000-0000-0000-0000-000000000001';

select lives_ok(
  $$update public.inventory_reservations set purpose = repeat('x', 120)
     where id = '47474747-0000-0000-0000-000000000001'$$,
  'reservations.purpose acepta 120');

select throws_ok(
  $$update public.inventory_reservations set purpose = repeat('x', 121)
     where id = '47474747-0000-0000-0000-000000000001'$$,
  '23514', null,
  'reservations.purpose rechaza 121');

select lives_ok(
  $$update public.inventory_reservations set cancellation_reason = repeat('x', 300)
     where id = '47474747-0000-0000-0000-000000000001'$$,
  'reservations.cancellation_reason acepta 300');

select throws_ok(
  $$update public.inventory_reservations set cancellation_reason = repeat('x', 301)
     where id = '47474747-0000-0000-0000-000000000001'$$,
  '23514', null,
  'reservations.cancellation_reason rechaza 301');


-- ─────────────────────────────────────────────────────────────────────────────
-- final_satisfaction_surveys: best_feature (500), improvement_area (500),
-- comments (1000)
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.final_satisfaction_surveys (id, alumno_id)
select '47474747-0000-0000-0000-000000000002', a.id
  from public.alumnos a
 where a.auth_user_id = 'a0000000-0000-0000-0000-000000000001';

select lives_ok(
  $$update public.final_satisfaction_surveys set best_feature = repeat('x', 500)
     where id = '47474747-0000-0000-0000-000000000002'$$,
  'surveys.best_feature acepta 500');

select throws_ok(
  $$update public.final_satisfaction_surveys set best_feature = repeat('x', 501)
     where id = '47474747-0000-0000-0000-000000000002'$$,
  '23514', null,
  'surveys.best_feature rechaza 501');

select lives_ok(
  $$update public.final_satisfaction_surveys set improvement_area = repeat('x', 500)
     where id = '47474747-0000-0000-0000-000000000002'$$,
  'surveys.improvement_area acepta 500');

select throws_ok(
  $$update public.final_satisfaction_surveys set improvement_area = repeat('x', 501)
     where id = '47474747-0000-0000-0000-000000000002'$$,
  '23514', null,
  'surveys.improvement_area rechaza 501');

select lives_ok(
  $$update public.final_satisfaction_surveys set comments = repeat('x', 1000)
     where id = '47474747-0000-0000-0000-000000000002'$$,
  'surveys.comments acepta 1000');

select throws_ok(
  $$update public.final_satisfaction_surveys set comments = repeat('x', 1001)
     where id = '47474747-0000-0000-0000-000000000002'$$,
  '23514', null,
  'surveys.comments rechaza 1001');


-- ─────────────────────────────────────────────────────────────────────────────
-- inventory_unit_notes.note, tope 500
--
-- El seed no siembra notas, asi que la fila base se crea aca. `author_id` queda
-- NULL: la columna lo admite y esta prueba no mide autoria.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.inventory_unit_notes (id, unit_id, note)
values ('47474747-0000-0000-0000-000000000003',
        'dddddddd-0000-0000-0000-000000000001',
        'base para medir el tope');

select lives_ok(
  $$update public.inventory_unit_notes set note = repeat('x', 500)
     where id = '47474747-0000-0000-0000-000000000003'$$,
  'unit_notes.note acepta 500');

select throws_ok(
  $$update public.inventory_unit_notes set note = repeat('x', 501)
     where id = '47474747-0000-0000-0000-000000000003'$$,
  '23514', null,
  'unit_notes.note rechaza 501');


-- ─────────────────────────────────────────────────────────────────────────────
-- disabled_days.reason, tope 200
--
-- Una fecha lejana a proposito: inhabilitar un dia cercano podria interferir con
-- las reservas que insertan otras pruebas si algun dia se agrupan.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.disabled_days (date, reason)
values (current_date + 3650, 'base para medir el tope');

select lives_ok(
  format($$update public.disabled_days set reason = repeat('x', 200)
            where date = %L$$, current_date + 3650),
  'disabled_days.reason acepta 200');

select throws_ok(
  format($$update public.disabled_days set reason = repeat('x', 201)
            where date = %L$$, current_date + 3650),
  '23514', null,
  'disabled_days.reason rechaza 201');


select * from finish();

rollback;
