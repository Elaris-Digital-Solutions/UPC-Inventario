-- Alta automatica de alumno (D-9, cierra P0-5).
--
-- El registro previo desaparece. Cuando alguien con correo @upc.edu.pe entra por
-- primera vez, GoTrue crea su fila en auth.users y un trigger crea la de alumnos,
-- ya vinculada. El perfil lo completa despues el propio alumno.
--
-- Por que esto cierra P0-5 y no una validacion: `anon` nunca necesita INSERT
-- sobre alumnos, asi que esa politica sencillamente no existe. No hay nada que
-- saltarse.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);


-- El perfil nace vacio, asi que nombre y apellido tienen que admitir nulo.
-- Una cadena vacia mentiria sobre el estado del perfil, y la RPC de reserva de
-- la tanda 2 necesita distinguir "sin completar" de "completado".
select col_is_null('public', 'alumnos', 'nombre',   'alumnos.nombre admite nulo');
select col_is_null('public', 'alumnos', 'apellido', 'alumnos.apellido admite nulo');


-- Los usuarios del seed ya generaron su alumno.
select is(
  (select count(*)::int from public.alumnos
    where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
  1,
  'el alumno A tiene fila creada por el trigger');

select is(
  (select email from public.alumnos
    where auth_user_id = 'a0000000-0000-0000-0000-000000000002'),
  'alumno.b@upc.edu.pe',
  'la fila se crea con el correo en minusculas');


-- Un correo de fuera de la UPC puede autenticarse, pero no es alumno: se queda
-- sin fila, y como todas las politicas cuelgan de alumnos, sin acceso a nada.
select is(
  (select count(*)::int from public.alumnos where email = 'alguien@gmail.com'),
  0,
  'un correo que no es de la UPC no genera fila en alumnos');


-- Un alta nueva dispara el trigger.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000c1',
   'authenticated', 'authenticated', 'Nuevo@UPC.edu.pe', 'no-login', now(), now());

select is(
  (select count(*)::int from public.alumnos
    where auth_user_id = 'a0000000-0000-0000-0000-0000000000c1'
      and email = 'nuevo@upc.edu.pe'),
  1,
  'un alta nueva crea el alumno vinculado, normalizando el correo');


select * from finish();

rollback;
