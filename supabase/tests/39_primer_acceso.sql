-- La migracion 31 expone auth.users.confirmation_sent_at para el personal
-- (D-80), y solo al admin.
--
-- POR QUE ESTA PRUEBA NO CAMBIA DE ROL CON `set local role`, al reves que
-- 33_unit_notes_staff_only.sql: lo que filtra aca NO es RLS, es el
-- `where (select private.is_admin())` del cuerpo de la funcion, y is_admin()
-- se resuelve por `auth.uid()`, que lee request.jwt.claims. Basta con poner el
-- claim. Quedarse como `postgres` ADEMAS permite leer auth.users para comparar,
-- que es lo unico que hace posible la asercion 9 -- `authenticated` no tiene
-- grant sobre ese esquema, que es justo el motivo de que la funcion exista --.
--
-- LO QUE ESTA PRUEBA NO PUEDE VERIFICAR, dicho para que nadie lo lea de mas:
-- que Supabase Auth escriba confirmation_sent_at al pedir el magic link. En
-- local ese valor lo pone el seed. Eso se verifica contra produccion, en la
-- Tarea 6 del plan de la F3-T2.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(9);

select has_function(
  'public'::name,
  'primer_acceso_personal'::name,
  'existe public.primer_acceso_personal()'
);

-- Sin `security definer` la funcion no puede leer auth.users: el esquema auth
-- no tiene grant para authenticated.
select is(
  (select p.prosecdef
     from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'primer_acceso_personal'),
  true,
  'es security definer: sin eso no alcanza auth.users'
);

-- EL PRIVILEGIO, que es lo que se olvida: Postgres concede EXECUTE a PUBLIC en
-- toda funcion nueva, y siendo definer eso importa el doble.
select is(
  has_function_privilege('anon', 'public.primer_acceso_personal()', 'execute'),
  false,
  'anon NO puede ejecutarla'
);

-- CONTROL POSITIVO de la de arriba. Sin este true, el false anterior no
-- distingue "revocado" de "la sonda pregunta mal".
select is(
  has_function_privilege('authenticated', 'public.primer_acceso_personal()', 'execute'),
  true,
  'authenticated SI puede ejecutarla'
);

-- El admin del seed. El operador del seed tambien esta en staff_members, asi
-- que son dos filas.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

select is(
  (select count(*)::int from public.primer_acceso_personal()),
  2,
  'el admin recibe una fila por cada miembro de staff_members'
);

-- D-11: el operador no tiene nada que hacer en administracion. Recibe CERO
-- FILAS y no un error, que es la misma firma que dejo la migracion 25.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';

select is(
  (select count(*)::int from public.primer_acceso_personal()),
  0,
  'el operador no recibe ninguna fila'
);

-- CONTROL que hace valida la asercion del admin: si un alumno tambien recibiera
-- dos filas, el 2 de arriba no probaria que el filtro existe.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*)::int from public.primer_acceso_personal()),
  0,
  'un alumno no recibe ninguna fila'
);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';

-- LO QUE LA FUNCION EXISTE PARA HACER: devolver el primer magic link.
select is(
  (select primer_acceso from public.primer_acceso_personal()
    where user_id = 'a0000000-0000-0000-0000-00000000000a'),
  (select confirmation_sent_at from auth.users
    where id = 'a0000000-0000-0000-0000-00000000000a'),
  'devuelve confirmation_sent_at'
);

-- Y EL CONTROL DEL FIXTURE, que es lo que hace que la asercion de arriba
-- signifique algo: las cuatro fechas del usuario son DISTINTAS entre si. Si el
-- seed las sembrara todas con now(), una funcion que devolviera created_at o
-- email_confirmed_at pasaria la asercion 8 igual.
select is(
  (select confirmation_sent_at <> created_at
      and confirmation_sent_at <> email_confirmed_at
      and confirmation_sent_at <> last_sign_in_at
     from auth.users where id = 'a0000000-0000-0000-0000-00000000000a'),
  true,
  'las cuatro fechas del seed son distintas: sin esto la asercion 8 no prueba nada'
);

select * from finish();

rollback;
