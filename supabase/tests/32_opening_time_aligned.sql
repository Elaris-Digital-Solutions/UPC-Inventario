-- Q-19 / D-54: la hora de apertura tiene que caer en un bloque exacto.
--
-- LA REGLA ES LA MISMA Y LA TABLA ES OTRA. Hasta la F3-T4 vivia en
-- app_settings.opening_time y la sostenia un CHECK; con D-75 el horario se mudo
-- a campus_hours y el CHECK dejo de ser posible:
--
--   ERROR:  cannot use subquery in check constraint
--
-- El motivo es que en app_settings la regla funcionaba por una casualidad de
-- forma -opening_time y slot_minutes viven en la MISMA FILA-, y un CHECK no
-- puede leer otra tabla. Asi que la sostienen dos disparadores, y esta bateria
-- prueba los dos.
--
-- LA ESTRUCTURA DE LA PRUEBA NO CAMBIA, y eso es lo que dice que la regla es la
-- misma: una asercion para la via directa, su control positivo, y una tercera
-- para la puerta de atras -cambiar solo slot_minutes desalinea aperturas ya
-- guardadas-. Esa tercera es la que el CHECK viejo cubria gratis por estar en la
-- misma tabla, y aqui hay que reponer a mano.
--
-- Y EL DAÑO CRECIO DE TAMAÑO, que es el motivo de la cuarta asercion. En
-- app_settings desalinear afectaba a UNA fila; en campus_hours, a las 14 de una
-- vez -2 sedes x 7 dias-. El mensaje del disparador dice cuantas, y se comprueba
-- que dice el numero y no un "hay filas mal".
--
-- Los UPDATE van como postgres, sin set local role y sin claims: lo que se
-- prueba son disparadores del motor, que aplican a todo el mundo, no politicas
-- de fila.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);


-- 1) Con el bloque de 30 vigente, 09:10 no cae en un multiplo de 30 minutos:
-- 33000 % 1800 = 600.
select throws_ok(
  $$update public.campus_hours set opens_at = '09:10'
     where campus_id = 'cccccccc-0000-0000-0000-000000000001' and weekday = 1$$,
  '23514', null,
  'una apertura de sede que no cae en un bloque exacto de 30 minutos se rechaza');

-- 2) El contraejemplo: 09:00 si cae en un multiplo de 30 minutos
-- (32400 % 1800 = 0). Sin esta asercion, el rechazo de arriba no probaria que
-- el disparador distingue nada.
select lives_ok(
  $$update public.campus_hours set opens_at = '09:00'
     where campus_id = 'cccccccc-0000-0000-0000-000000000001' and weekday = 1$$,
  'una apertura alineada con el bloque vigente se acepta sin problema');


-- Preparacion para la asercion 3, no es una asercion: mueve TODAS las aperturas
-- a 08:30, que con el bloque de 30 vigente siguen alineadas (30600 % 1800 = 0)
-- pero dejaron de ser una hora en punto: sus 30600 segundos NO son multiplo de
-- 3600, asi que ahi si hay valores de slot_minutes que las desalinean.
update public.campus_hours set opens_at = '08:30';

-- 3) La puerta de atras: cambiar solo slot_minutes puede desalinear aperturas ya
-- guardadas. 20 es un valor legal por las otras restricciones de app_settings
-- (60 % 20 = 0, y esta entre 5 y 60), pero con las aperturas en 08:30 la cuenta
-- da 30600 % 1200 = 600.
--
-- Se comprueba el MENSAJE ademas del codigo, porque el numero es la parte util:
-- decirle al admin que dejaria 14 horarios sin alinear le dice el tamaño de lo
-- que estaba a punto de romper.
select throws_ilike(
  $$update public.app_settings set slot_minutes = 20$$,
  '%14 horario(s) de sede sin alinear%',
  'cambiar solo slot_minutes se rechaza, y dice CUANTOS horarios dejaria mal');

-- 4) Y su control positivo, que aqui hace falta mas que nunca: con las aperturas
-- de vuelta en 08:00 el mismo 20 es legal (28800 % 1200 = 0). Sin esto, el
-- rechazo de arriba no distingue "el disparador mide la alineacion" de "el
-- disparador prohibe tocar slot_minutes".
update public.campus_hours set opens_at = '08:00';

select lives_ok(
  $$update public.app_settings set slot_minutes = 20$$,
  'el mismo cambio de bloque se acepta cuando ninguna apertura queda desalineada');


select * from finish();

rollback;
