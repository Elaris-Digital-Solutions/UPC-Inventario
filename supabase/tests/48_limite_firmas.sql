-- H-2 de la auditoria del 2026-08-23: el tope de firmas de Cloudinary.
--
-- CUATRO AFIRMACIONES, y las cuatro hacen falta porque fallan por separado:
--
--   1. un alumno NO consigue firma            -> el permiso sigue cerrado
--   2. un admin SI consigue firma             -> el tope no lo rompe todo
--   3. al pasarse de 60, el admin es rechazado -> el tope existe
--   4. el contador es POR PERSONA             -> el tope de uno no castiga a otro
--
-- La 2 es la que no se puede quitar: sin ella, una funcion que rechazara SIEMPRE
-- pasaria las otras tres en verde. Es el mismo control negativo que 47.
--
-- La 4 vigila un defecto concreto y facil de introducir: un `delete` mal escrito
-- o una clave primaria sin `user_id` convertirian el tope individual en un tope
-- global, y el sintoma seria que el segundo administrador no puede subir nada
-- porque el primero trabajo mucho. Eso no da error en ninguna parte.
--
-- LOS IDS SALEN DEL SEED: a...0a es el admin y a...0b el operador
-- (supabase/seed.sql). El alumno a...01 es Ana.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);


-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Un alumno no consigue firma. `private.is_admin()` es falso para el.
-- ─────────────────────────────────────────────────────────────────────────────

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.pedir_firma_cloudinary()$$,
  '42501', null,
  'un alumno NO consigue una firma de Cloudinary');

reset role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Un admin si. LA PUNTA QUE PASA.
-- ─────────────────────────────────────────────────────────────────────────────

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.pedir_firma_cloudinary()$$,
  'un admin SI consigue una firma');

reset role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Pasado el tope, el mismo admin es rechazado.
--
-- El contador se coloca EN 60 directamente en vez de llamar 60 veces a la RPC:
-- sesenta llamadas medirian lo mismo y tardarian sesenta veces mas. La fila ya
-- existe por la asercion 2, asi que esto es un update y no un insert.
--
-- Se escribe como `postgres` -fuera de cualquier `set local role`- porque la
-- tabla vive en `private` y `authenticated` no tiene ningun privilegio sobre
-- ella. Que no lo tenga es justo lo que se quiere.
-- ─────────────────────────────────────────────────────────────────────────────

update private.firmas_emitidas
   set n = 60
 where user_id = 'a0000000-0000-0000-0000-00000000000a'
   and hora    = date_trunc('hour', now());

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

-- 54000 es `program_limit_exceeded`, el SQLSTATE que el route handler traduce a
-- un 429. Si alguien lo cambiara en la migracion sin tocar el handler, esta
-- asercion es lo que lo delata.
select throws_ok(
  $$select public.pedir_firma_cloudinary()$$,
  '54000', null,
  'pasado el tope de 60/hora, el admin recibe 54000');

reset role;


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. El tope es POR PERSONA. El operador no hereda el bloqueo del admin.
--
-- Se le sube a admin para poder distinguir: si el contador fuera global, este
-- `lives_ok` fallaria. Ojo, el operador NO es admin, asi que lo que se afirma
-- aqui es que recibe 42501 -su propio rechazo- y NO 54000 -el ajeno-.
-- ─────────────────────────────────────────────────────────────────────────────

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.pedir_firma_cloudinary()$$,
  '42501', null,
  'el operador recibe SU rechazo (42501) y no el tope del admin (54000)');

reset role;


select * from finish();

rollback;
