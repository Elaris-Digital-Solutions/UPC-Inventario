-- H-14: "la baja es desactivar, nunca borrar" y "nadie se cambia el rol a si
-- mismo" viven en la base, no en TypeScript.
--
-- Antes de la migracion 42 las dos reglas solo las aplicaba lib/admin/acciones.ts,
-- y el admin del seed podia, por la API: borrar al operador, y degradarse a si
-- mismo escribiendo su uuid en mayusculas y entre llaves -Postgres lo acepta y
-- la comparacion de JavaScript no-. Medido el 2026-09-18: la base se quedaba sin
-- ningun admin.
--
-- La 6 es el CONTROL NEGATIVO: sin ella, los rechazos no distinguen "protege la
-- fila propia" de "el admin ya no puede tocar a nadie".

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;


-- 1) y 2) Borrar no se puede, ni siendo admin.
select throws_ok(
  $$delete from public.staff_members where user_id = 'a0000000-0000-0000-0000-00000000000b'$$,
  '42501',
  null,
  'el admin no puede borrar a nadie del personal');

select is(
  (select count(*)::int from public.staff_members
    where user_id = 'a0000000-0000-0000-0000-00000000000b'),
  1,
  'y el operador sigue ahi');

-- 3) a 5) La fila propia no cambia de rol, de acceso ni de dueño. El uuid va en
--         la forma que se saltaba la comprobacion de TypeScript.
select throws_ilike(
  $$update public.staff_members set role = 'operator'
     where user_id = '{A0000000-0000-0000-0000-00000000000A}'$$,
  '%a si mismo%',
  'el admin no puede cambiarse su propio rol');

select throws_ilike(
  $$update public.staff_members set activo = false
     where user_id = '{A0000000-0000-0000-0000-00000000000A}'$$,
  '%a si mismo%',
  'el admin no puede desactivarse a si mismo');

select throws_ilike(
  $$update public.staff_members set user_id = 'a0000000-0000-0000-0000-000000000001'
     where user_id = 'a0000000-0000-0000-0000-00000000000a'$$,
  '%a si mismo%',
  'el admin no puede pasarle su fila a otra cuenta');

-- 6) CONTROL NEGATIVO: sobre la fila de OTRO, el admin si cambia el rol. Se mira
--    el efecto y no la ausencia de error: RLS filtra en silencio.
update public.staff_members set role = 'admin'
 where user_id = 'a0000000-0000-0000-0000-00000000000b';

select is(
  (select role from public.staff_members
    where user_id = 'a0000000-0000-0000-0000-00000000000b'),
  'admin'::public.staff_role,
  'sobre otra persona, el admin sigue pudiendo cambiar el rol');

reset role;


select * from finish();

rollback;
