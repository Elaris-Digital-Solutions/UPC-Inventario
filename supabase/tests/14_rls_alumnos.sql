-- Privilegios y RLS de alumnos. Cierra P1-10.
--
-- En la linea base, alumnos_update_own era
--   FOR UPDATE USING (auth_user_id = auth.uid())
-- sin WITH CHECK, y authenticated tenia GRANT ALL sobre la tabla. Con eso, un
-- alumno podia ponerse banned_until = NULL y levantarse su propia sancion, o
-- reescribir email, activo y auth_user_id.
--
-- El arreglo no es una politica mejor: RLS no sabe de columnas. WITH CHECK ve la
-- fila nueva y nunca la vieja, asi que no puede detectar que un valor cambio. Lo
-- que si distingue columnas es el privilegio: se conceden nombre, apellido y
-- carrera_id, y ninguna mas.
--
-- activo y banned_until no se conceden a NADIE, ni siquiera al admin: un GRANT de
-- columna se da a un rol, y `authenticated` incluye a los alumnos. Quien escriba
-- esas columnas sera el trigger de sanciones de la tanda 2, que es SECURITY
-- DEFINER y no depende de privilegios de tabla.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


-- Alumno A
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.alumnos), 1,
  'el alumno A solo se ve a si mismo');

select lives_ok(
  $$update public.alumnos set nombre = 'Ana', apellido = 'Perez'
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  'el alumno puede completar su propio perfil');

-- El caso de P1-10. Falta de privilegio de columna: error duro, no silencio.
select throws_ok(
  $$update public.alumnos set banned_until = null
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'el alumno NO puede tocar su propia sancion');

select throws_ok(
  $$update public.alumnos set auth_user_id = 'a0000000-0000-0000-0000-000000000002'
     where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'el alumno NO puede reasignar su fila a otra cuenta');

select throws_ok(
  $$insert into public.alumnos (email) values ('colado@upc.edu.pe')$$,
  '42501', null,
  'nadie inserta en alumnos por la API: las filas las crea el trigger');

reset role;


-- Admin: ve a todos. Son cuatro, porque admin y operador tambien tienen correo
-- @upc.edu.pe y el trigger les creo su fila de alumno. El de gmail no.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.alumnos), 4,
  'el admin ve a todos los alumnos');

reset role;


-- Operador: sin reservas vivas no ve a nadie (D-11).
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.alumnos), 1,
  'el operador solo se ve a si mismo mientras no haya reservas vivas');

reset role;


select * from finish();

rollback;
