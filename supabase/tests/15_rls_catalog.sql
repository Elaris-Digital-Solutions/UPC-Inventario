-- Catalogo: lo lee cualquiera, lo escribe solo el admin.
--
-- Cierra la parte de P0-2 que corresponde al inventario: la autorizacion deja de
-- ser un `if (isAdmin)` en React y pasa a ser una politica.
--
-- Ojo con la forma del fallo, que no es la misma en los dos casos:
--   sin privilegio  -> error 42501
--   sin politica    -> cero filas afectadas, sin error
-- Por eso el intento del operador se verifica por su efecto, no por la excepcion.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);


-- Anonimo: lee el catalogo publico, no escribe.
set local role anon;

select is((select count(*)::int from public.products), 4,
  'el anonimo lee el catalogo');

select throws_ok(
  $$insert into public.products (name) values ('colado')$$,
  '42501', null,
  'el anonimo no crea productos');

reset role;


-- Operador: no toca inventario. Tiene el privilegio de DELETE pero ninguna
-- politica se lo permite, asi que el borrado no falla: no afecta a nada.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$delete from public.inventory_units where unit_code = 'CAM-001'$$,
  'el DELETE del operador no lanza error: RLS filtra en silencio');

select is(
  (select count(*)::int from public.inventory_units where unit_code = 'CAM-001'),
  1,
  'pero la unidad sigue ahi: el operador no borra inventario');

reset role;


-- Admin: si.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$update public.products set featured = true where name = 'Tripode Manfrotto MT055'$$,
  'el admin edita productos');

select lives_ok(
  $$insert into public.disabled_days (date, reason) values (date '2026-07-28', 'Fiestas Patrias')$$,
  'el admin inhabilita dias');

reset role;


select * from finish();

rollback;
