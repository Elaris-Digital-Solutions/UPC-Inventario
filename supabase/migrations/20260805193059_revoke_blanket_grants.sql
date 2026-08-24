-- Apaga los privilegios generales de la linea base.
--
-- ESTA MIGRACION VA ANTES DE CUALQUIER "CREATE TABLE" DE LA FASE 1.
--
-- La linea base 20260805030123 dejo dos cosas encendidas:
--
--   1. GRANT ALL sobre las 11 tablas a anon y a authenticated.
--   2. ALTER DEFAULT PRIVILEGES que repite ese GRANT ALL en cada tabla nueva
--      que cree el rol postgres en el esquema public.
--
-- El (2) es el peligroso. Medido el 2026-08-05 sobre una tabla vacia recien
-- creada: salia con anon=arwdDxtm/postgres, o sea insert, update y delete
-- incluidos. Con eso, staff_members -la tabla que decide quien es
-- administrador- naceria escribible por el rol anonimo. RLS lo taparia, pero
-- solo mientras nadie olvide activarla en una tabla futura.
--
-- Contados antes de esta migracion: 14 privilegios heredados por tabla nueva,
-- y 39 permisos de escritura para anon repartidos por public.
--
-- El diseno de la Fase 1 se apoya en dos capas: primero el privilegio de
-- Postgres (que operacion, y sobre que columnas), despues RLS (que filas).
-- Esta migracion pone la primera capa en cero para que las siguientes concedan
-- pieza por pieza. Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 2.
--
-- service_role NO se toca: es la clave de servidor, salta RLS por diseno y la
-- usan las tareas administrativas de confianza.
--
-- Entre esta migracion y las que siguen, la API no sirve ninguna fila. Es lo
-- esperado: la app Vite ya no funciona contra esta base, y Next.js sera el
-- primer consumidor del esquema nuevo.


-- 1. Que las tablas futuras no hereden nada.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;


-- 2. Barrer lo ya concedido sobre las tablas de la linea base.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
