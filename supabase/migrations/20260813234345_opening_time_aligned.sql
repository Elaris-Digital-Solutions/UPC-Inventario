-- Q-19 / D-54: la hora de apertura tiene que caer en un bloque exacto.
--
-- La medicion que lo motivo, hecha en la T3B: con apertura 09:10 y bloque de 20
-- minutos la base ACEPTA la configuracion -no habia ninguna restriccion que
-- atara las dos columnas-, `available_slots` ofrece 35 franjas con 3 unidades
-- libres, y `create_reservation` rechaza las 35. La franja alineada de las 09:00
-- cae fuera del horario. Ninguna franja del dia era reservable, con la pantalla
-- y la base en verde.
--
-- El contraejemplo, que acota la regla a esta sola columna: con la apertura
-- alineada y el CIERRE desalineado (21:50), la ultima franja se reservo con HTTP
-- 200. `generate_series` arranca en la apertura, asi que el cierre solo recorta.
-- No hay que ampliar esta restriccion al cierre.
--
-- Por que la restriccion vieja no bastaba: `app_settings_slot_divisor` ya obliga
-- a que el bloque divida a 60, asi que desde una apertura en hora exacta ningun
-- `slot_minutes` valido la desalinea. El riesgo vive en los minutos y los
-- segundos de la apertura, y por ahi no habia nada.
--
-- D-54 ya lo mitiga desde la aplicacion, con un aviso en /admin/ajustes. Esta
-- restriccion no lo sustituye: lo respalda. El aviso de pantalla sigue siendo
-- mejor experiencia que un error de Postgres.

alter table public.app_settings
  add constraint app_settings_apertura_alineada
  check (extract(epoch from opening_time)::int % (slot_minutes * 60) = 0);
