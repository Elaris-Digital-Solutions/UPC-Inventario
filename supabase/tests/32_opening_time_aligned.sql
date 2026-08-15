-- Q-19 / D-54: la restriccion nueva ata opening_time a slot_minutes.
--
-- La asercion 3 prueba la puerta de atras: cambiar SOLO slot_minutes puede
-- desalinear una apertura que ya estaba guardada. Pero no se puede montar esa
-- prueba desde la apertura por defecto (08:00): los ocho valores validos de
-- slot_minutes -5, 6, 10, 12, 15, 20, 30 y 60- dividen todos a 3600, asi que
-- ningun cambio de slot_minutes desalinea las 08:00. Por eso la asercion 3
-- mueve antes la apertura a 08:30, que con el bloque de 30 vigente sigue
-- alineada (30600 % 1800 = 0) pero dejo de ser una hora en punto: sus 30600
-- segundos NO son multiplo de 3600, asi que ahi si hay valores de slot_minutes
-- que la desalinean.
--
-- Los UPDATE van como postgres, sin set local role y sin claims: lo que se
-- prueba es una restriccion del motor, que aplica a todo el mundo, no una
-- politica de fila.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(3);


-- 1) Con el bloque de 30 vigente, 09:10 no cae en un multiplo de 30 minutos:
-- 33000 % 1800 = 600.
select throws_ok(
  $$update public.app_settings set opening_time = '09:10'$$,
  '23514', null,
  'una apertura que no cae en un bloque exacto de 30 minutos se rechaza');

-- 2) El contraejemplo: 09:00 si cae en un multiplo de 30 minutos
-- (32400 % 1800 = 0). Sin esta asercion, el rechazo de arriba no probaria que
-- la restriccion distingue nada.
select lives_ok(
  $$update public.app_settings set opening_time = '09:00'$$,
  'una apertura alineada con el bloque vigente se acepta sin problema');


-- Preparacion para la asercion 3, no es una asercion: mueve la apertura a
-- 08:30, que con el bloque de 30 vigente sigue alineada (30600 % 1800 = 0).
update public.app_settings set opening_time = '08:30';

-- 3) La puerta de atras que la pantalla no vigila: cambiar solo slot_minutes
-- puede desalinear una apertura ya guardada. 20 es un valor legal por las
-- otras dos restricciones (60 % 20 = 0, y esta entre 5 y 60), pero con la
-- apertura en 08:30 la cuenta da 30600 % 1200 = 600.
select throws_ok(
  $$update public.app_settings set slot_minutes = 20$$,
  '23514', null,
  'cambiar solo slot_minutes tambien se rechaza si desalinea la apertura ya guardada');


select * from finish();

rollback;
