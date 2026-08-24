-- Configuracion: por producto lo que varia por producto (D-1, D-10), y una unica
-- fila para lo global (D-3).
--
-- La prueba del alumno NO usa throws_ok. El alumno tiene privilegio sobre esas
-- columnas -se concede a `authenticated`, que lo incluye- y lo que le falta es
-- politica. Sin politica el UPDATE afecta a cero filas y no lanza nada. Se
-- comprueba el efecto, no la excepcion. (Leccion de la tanda 1.)

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


select has_column('public', 'products', 'max_duration_hours',
  'products lleva su propia duracion maxima (D-1)');
select has_column('public', 'products', 'buffer_minutes',
  'products lleva su propio buffer (D-10)');

select is(
  (select count(*)::int from public.app_settings), 1,
  'app_settings tiene exactamente una fila');

-- El truco de la fila unica: id es booleano con check (id), asi que solo `true`
-- es valido y la clave primaria impide repetirlo.
select throws_ok(
  $$insert into public.app_settings (id) values (false)$$,
  '23514', null,
  'no se puede colar una segunda fila de configuracion');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_settings' and c.relrowsecurity),
  1,
  'app_settings tiene RLS activo');


-- Alumno A: cero filas afectadas, sin error.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

update public.app_settings set booking_window_days = 60;

reset role;

select is(
  (select booking_window_days::int from public.app_settings), 7,
  'un alumno no cambia la configuracion: el UPDATE no afecta ninguna fila');


-- Admin: si.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

update public.app_settings set booking_window_days = 14;

reset role;

select is(
  (select booking_window_days::int from public.app_settings), 14,
  'el admin si cambia la configuracion');


select * from finish();

rollback;
