-- La migracion 38 pone descripcion a los dos productos que quedaron sin ella
-- tras el desempaquetado de D-82 (Q-23).
--
-- POR QUE HAY FIXTURES Y NO SE USA EL SEED: los dos ids son de PRODUCCION y en
-- local no existen, asi que sin estas filas la funcion no tocaria nada y la
-- prueba pasaria VACIA. Misma trampa que documentan 36_desempaquetar_descripcion.sql
-- y 38_deduplicar_notas.sql.
--
-- OJO: LOS DOS FIXTURES ESTAN EN ESTADOS DISTINTOS A PROPOSITO, y esa es toda
-- la gracia de esta prueba. Una sola llamada mide las DOS direcciones de la
-- guarda:
--   UGREEN, con la descripcion vacia .... TIENE que rellenarse
--   JBL, con una descripcion ya puesta .. NO tiene que tocarse
-- Sin el segundo, "rellena las vacias" no se distingue de "reescribe las dos", y
-- el dano de la segunda es silencioso: pisaria un texto que alguien escribio a
-- mano desde /admin/inventario.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);

insert into public.products (id, name, category, description, sort_order) values
  -- Caso positivo: vacia, como esta hoy en produccion.
  ('b93f7503-decb-4ae2-8087-b48b6f648c1a',
   'UGREEN 4K USB-C MULTIFUNCTION ADAPTER 7-IN-1', 'Cables', '', 95),
  -- OJO, CONTROL NEGATIVO: esta YA tiene texto. Representa el caso de que
  -- alguien la haya escrito a mano entre que se planeo esta migracion y se
  -- aplico.
  ('b8d64304-177a-4a2a-99d9-08deb7463fcc',
   'Parlante JBL FLIP ESSENTIAL', 'Audio', 'TEXTO ESCRITO A MANO', 96);

-- 1. Pone UNA, no dos. Si devolviera 2 estaria pisando la que ya tenia texto.
select is(private.sembrar_descripciones_faltantes(), 1,
  'Rellena solo la descripcion vacia');

-- 2. El caso positivo.
select is((select description from public.products
            where id = 'b93f7503-decb-4ae2-8087-b48b6f648c1a'),
  'ADAPTADOR USB-C 7 EN 1 CON SALIDA DE VIDEO 4K',
  'El UGREEN recibe su descripcion');

-- 3. EL CONTROL NEGATIVO. Sin el, la 1 y la 2 no distinguen "rellena las
--    vacias" de "reescribe estos dos ids pasase lo que pasase".
select is((select description from public.products
            where id = 'b8d64304-177a-4a2a-99d9-08deb7463fcc'),
  'TEXTO ESCRITO A MANO',
  'No pisa una descripcion que ya tenia texto');

-- 4. Idempotente: la segunda llamada no encuentra ninguna vacia. Importa
--    porque el CI aplica las migraciones sobre un Postgres limpio.
select is(private.sembrar_descripciones_faltantes(), 0,
  'La segunda llamada no pone ninguna');

select * from finish();

rollback;
