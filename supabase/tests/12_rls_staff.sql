-- RLS de staff_members (D-2, D-11).
--
-- El admin ve y gestiona a todo el personal. El operador solo se ve a si mismo:
-- no necesita saber quien mas trabaja ahi, y menos aun poder editarlo. Un alumno
-- no ve nada.
--
-- Patron de suplantacion que usan todas las pruebas de RLS de aqui en adelante:
-- el claim se fija ANTES del rol, porque una vez dentro de `authenticated` ya no
-- se pueden cambiar ajustes de sesion.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(8);


-- Admin
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.staff_members), 2,
  'el admin ve todo el personal');
select is(private.is_admin(), true,
  'is_admin reconoce al admin');
select is(private.current_staff_role(), 'admin'::public.staff_role,
  'current_staff_role devuelve admin');

reset role;


-- Operador
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.staff_members), 1,
  'el operador solo se ve a si mismo');
select is(private.is_admin(), false,
  'is_admin niega al operador');
-- Ojo con la forma del fallo. Falta de PRIVILEGIO lanza 42501; falta de POLITICA
-- no lanza nada: RLS no encuentra filas que tocar y el UPDATE afecta a cero.
-- El operador tiene el privilegio de UPDATE, asi que aca se verifica el efecto,
-- no la excepcion.
select lives_ok(
  $$update public.staff_members set role = 'admin' where user_id = 'a0000000-0000-0000-0000-00000000000b'$$,
  'el UPDATE del operador no lanza error: RLS filtra en silencio');

select is(
  (select role from public.staff_members where user_id = 'a0000000-0000-0000-0000-00000000000b'),
  'operator'::public.staff_role,
  'pero no cambia nada: el operador no puede ascenderse a admin');

reset role;


-- Alumno
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.staff_members), 0,
  'un alumno no ve el personal');

reset role;


select * from finish();

rollback;
