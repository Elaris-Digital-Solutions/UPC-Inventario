-- La migracion 30 limpia los duplicados que dejo la 28 en inventory_unit_notes.
--
-- POR QUE HAY FIXTURES Y NO SE USA EL SEED: el seed no siembra ni una nota, y
-- mucho menos una duplicada. Sin estas filas la prueba pasaria VACIA, y cero
-- filas borradas es indistinguible de cero filas que borrar. Es la misma
-- trampa que documenta 36_desempaquetar_descripcion.sql.
--
-- POR QUE SE LLAMA A LA FUNCION Y NO SE COPIA SU SQL: una migracion corre una
-- vez y ANTES que el seed, asi que ninguna prueba puede ejercitarla. La funcion
-- si. Se prueba el codigo que corrio, no una copia suya.
--
-- EL CASO REAL, medido en produccion el 2026-08-19: la 28 inserto 50 notas en
-- 50 unidades -una cada una, correctamente-, pero 41 de ellas eran copia exacta
-- de una que ya estaba ahi desde el 2026-02-24. La 28 no inserto de mas: la
-- medicion previa no miro la tabla de destino.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);

-- Un producto con tres unidades, para montar los tres casos que decide la
-- funcion: el duplicado, el que no lo es, y el que tiene autor.
insert into public.products (id, name, category, description, sort_order) values
  ('dddddddd-0000-0000-0000-000000000009', 'FIXTURE NOTAS DUPLICADAS', 'Audio',
   'Producto de prueba', 99);

insert into public.inventory_units (id, product_id, campus_id, unit_code, status) values
  ('eeeeeeee-0000-0000-0000-000000000009', 'dddddddd-0000-0000-0000-000000000009',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-DUP-1', 'active'),
  ('eeeeeeee-0000-0000-0000-00000000000a', 'dddddddd-0000-0000-0000-000000000009',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-DUP-2', 'active');

-- CASO 1, el que la migracion existe para limpiar: la misma nota dos veces en
-- la misma unidad, sin autor, con fechas distintas. Reproduce el par real
-- -una de febrero y una del 2026-08-19-.
insert into public.inventory_unit_notes (id, unit_id, note, created_by, created_at) values
  ('ffffffff-0000-0000-0000-000000000001', 'eeeeeeee-0000-0000-0000-000000000009',
   'falta bateria', null, '2026-02-24 01:54:08+00'),
  ('ffffffff-0000-0000-0000-000000000002', 'eeeeeeee-0000-0000-0000-000000000009',
   'falta bateria', null, '2026-08-19 00:00:00+00');

-- CASO 2: una nota distinta en la misma unidad. NO es duplicado y se queda.
insert into public.inventory_unit_notes (id, unit_id, note, created_by, created_at) values
  ('ffffffff-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000009',
   'carcasa con un golpe', null, '2026-08-19 00:00:00+00');

-- CASO 3, EL QUE PROTEGE A LAS PERSONAS: dos notas iguales en otra unidad, pero
-- CON autor. Repetir un texto a proposito es informacion, no un artefacto, asi
-- que la funcion no las toca.
insert into public.inventory_unit_notes (id, unit_id, note, created_by, created_at) values
  ('ffffffff-0000-0000-0000-000000000004', 'eeeeeeee-0000-0000-0000-00000000000a',
   'no carga', 'a0000000-0000-0000-0000-00000000000b', '2026-02-24 01:54:08+00'),
  ('ffffffff-0000-0000-0000-000000000005', 'eeeeeeee-0000-0000-0000-00000000000a',
   'no carga', 'a0000000-0000-0000-0000-00000000000b', '2026-08-19 00:00:00+00');

-- Primera pasada. Devuelve cuantas borro, asi que la asercion mira el numero y
-- no solo el estado final: si borrara de mas, este 1 lo delata antes que nada.
select is(
  private.deduplicar_notas_migradas(),
  1,
  'borra exactamente una fila: el duplicado sin autor'
);

select is(
  (select count(*)::int from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000009' and note = 'falta bateria'),
  1,
  'del par duplicado queda una sola nota'
);

-- CUAL de las dos queda, que es la mitad que un recuento no comprueba: la mas
-- antigua. Un criterio invertido dejaria tambien "una sola" y pasaria la de
-- arriba.
select is(
  (select id from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000009' and note = 'falta bateria'),
  'ffffffff-0000-0000-0000-000000000001'::uuid,
  'la que sobrevive es la MAS ANTIGUA, no la ultima'
);

-- CONTROL: la nota distinta de la misma unidad sigue ahi. Sin esto, una funcion
-- que borrase por unidad en vez de por (unidad, texto) daria verde arriba.
select is(
  (select count(*)::int from public.inventory_unit_notes
    where id = 'ffffffff-0000-0000-0000-000000000003'),
  1,
  'una nota con otro texto en la misma unidad NO se toca'
);

-- CONTROL QUE PROTEGE A LAS PERSONAS: las dos con autor siguen las dos.
select is(
  (select count(*)::int from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-00000000000a'),
  2,
  'dos notas iguales CON autor no se tocan: repetirlas fue deliberado'
);

-- IDEMPOTENCIA: la segunda pasada no encuentra nada que hacer.
select is(
  private.deduplicar_notas_migradas(),
  0,
  'una segunda llamada borra cero'
);

-- Y EL PRIVILEGIO, que es lo que se olvida: Postgres concede EXECUTE a PUBLIC
-- en toda funcion nueva, y private tiene usage para authenticated, asi que sin
-- el revoke cualquiera con sesion podria llamarla y borrar notas.
select is(
  has_function_privilege('authenticated', 'private.deduplicar_notas_migradas()', 'execute'),
  false,
  'authenticated NO puede ejecutar la funcion'
);

select * from finish();

rollback;
