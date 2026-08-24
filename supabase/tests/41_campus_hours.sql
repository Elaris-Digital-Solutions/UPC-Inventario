-- D-75: la tabla de horarios por sede.
--
-- Esta bateria cubre la FORMA de la tabla -clave, orden, dominio, cascada- y su
-- RLS. La alineacion con slot_minutes vive en 32_opening_time_aligned.sql, que
-- es donde vivia cuando la regla era de app_settings: se mudo de tabla, no de
-- archivo, para no partir en dos la historia de D-54.
--
-- LA CASCADA SE PRUEBA CON UNA SEDE PROPIA Y NO CON UNA DEL SEED, y eso se
-- descubrio ejecutando: `delete from campuses` sobre San Miguel falla con
-- inventory_units_campus_id_fkey, porque esa FK NO lleva cascada. Probar la
-- cascada de campus_hours borrando una sede sembrada mide otra cosa -mide que
-- las unidades la protegen- y aborta la transaccion entera.
--
-- Y LA RLS DE ESCRITURA SE PRUEBA CON INSERT, NO CON UPDATE. Tambien medido: un
-- UPDATE que la politica no deja ver no lanza 42501, simplemente afecta a CERO
-- filas y termina bien. El 42501 solo salta cuando el WITH CHECK rechaza una
-- fila nueva. Un `throws_ok` sobre el UPDATE habria dado "no exception" y se
-- habria leido como "la politica no cierra", cuando lo que no cerraba era la
-- prueba.
--
-- Las aserciones de RLS van en las DOS direcciones. Un "no puede" sin un "si
-- puede" al lado no distingue "la politica cierra" de "la sonda pregunta mal".

begin;

set local search_path = extensions, public, pg_catalog;

select plan(8);


-- 1) La clave primaria: una sede no puede tener dos horarios el mismo dia. Si
--    pudiera, "un dia sin fila es un dia cerrado" dejaria de tener sentido,
--    porque tampoco sabriamos cual de las dos filas manda.
select throws_ok(
  $$insert into public.campus_hours (campus_id, weekday, opens_at, closes_at)
    values ('cccccccc-0000-0000-0000-000000000001', 1, '09:00', '18:00')$$,
  '23505', null,
  'una sede no puede tener dos horarios para el mismo dia');

-- 2) El orden. Un horario que cierra antes de abrir generaria una rejilla vacia
--    en silencio, que es indistinguible de "cerrado".
select throws_ok(
  $$update public.campus_hours set closes_at = '07:00'
     where campus_id = 'cccccccc-0000-0000-0000-000000000001' and weekday = 1$$,
  '23514', null,
  'el cierre no puede ser anterior a la apertura');

-- 3) El dominio del dia. extract(dow) devuelve 0..6, asi que un 7 solo puede
--    entrar por SQL directo, y una fila con weekday = 7 seria invisible para
--    siempre: ninguna consulta la encontraria y nadie sabria por que.
select throws_ok(
  $$insert into public.campus_hours (campus_id, weekday, opens_at, closes_at)
    values ('cccccccc-0000-0000-0000-000000000001', 7, '09:00', '18:00')$$,
  '23514', null,
  'weekday solo acepta de 0 a 6');


-- La cascada, sobre una sede propia -----------------------------------------

insert into public.campuses (id, name, address, activo)
values ('cccccccc-0000-0000-0000-0000000000ff', 'Sede de prueba', 'Calle Falsa 123', true);

insert into public.campus_hours (campus_id, weekday, opens_at, closes_at)
select 'cccccccc-0000-0000-0000-0000000000ff', d.weekday, '08:00', '22:00'
  from generate_series(0, 6) as d(weekday);

-- 4) Control positivo de la 5: los horarios existen ANTES de borrar. Sin el, un
--    cero despues no distingue "la cascada funciono" de "nunca hubo filas".
select is(
  (select count(*)::int from public.campus_hours
    where campus_id = 'cccccccc-0000-0000-0000-0000000000ff'),
  7,
  'la sede de prueba arranca con sus siete horarios');

delete from public.campuses where id = 'cccccccc-0000-0000-0000-0000000000ff';

-- 5) Y borrar la sede se los lleva. Dejarlos huerfanos no rompe nada visible, y
--    por eso nadie los encontraria.
select is(
  (select count(*)::int from public.campus_hours
    where campus_id = 'cccccccc-0000-0000-0000-0000000000ff'),
  0,
  'borrar una sede se lleva sus siete horarios');


-- RLS ------------------------------------------------------------------------
-- El horario de una sede es informacion de SERVICIO: cualquiera con sesion puede
-- saber si su sede abre el jueves. Lo que no puede es cambiarlo.

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 6) El alumno LEE las catorce del seed. Es el control positivo de la 7: sin el,
--    un rechazo de escritura no distingue "la politica de escritura cierra" de
--    "el alumno no ve nada de esta tabla".
select is(
  (select count(*)::int from public.campus_hours),
  14,
  'un alumno lee los catorce horarios de las dos sedes');

-- 7) Y no escribe. Con INSERT, que es lo que dispara el WITH CHECK: ver la
--    cabecera.
select throws_ok(
  $$insert into public.campus_hours (campus_id, weekday, opens_at, closes_at)
    values ('cccccccc-0000-0000-0000-0000000000ee', 1, '09:00', '18:00')$$,
  '42501', null,
  'un alumno no puede crear el horario de una sede');

reset role;

-- 8) El admin SI escribe. Sin esta asercion, el 42501 de arriba podria venir de
--    que la tabla este cerrada para todo el mundo, y eso romperia la pantalla de
--    horarios sin que ninguna prueba lo dijera.
insert into public.campuses (id, name, address, activo)
values ('cccccccc-0000-0000-0000-0000000000ee', 'Sede del admin', 'Calle Falsa 456', true);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$insert into public.campus_hours (campus_id, weekday, opens_at, closes_at)
    values ('cccccccc-0000-0000-0000-0000000000ee', 1, '09:00', '18:00')$$,
  'el admin si puede crear el horario de una sede');

reset role;


select * from finish();

rollback;
