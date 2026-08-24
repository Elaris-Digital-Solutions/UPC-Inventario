-- La migracion 37 muda el numero de orden de compra de products.description a
-- product_purchase_orders, que solo lee el personal (Q-24).
--
-- POR QUE HAY FIXTURES Y NO SE USA EL SEED: ninguno de los 4 productos del seed
-- lleva el prefijo "O.C", asi que sin estas filas la prueba pasaria VACIA, y
-- cero filas movidas es indistinguible de cero filas que mover. Misma trampa
-- que documentan 36_desempaquetar_descripcion.sql y 38_deduplicar_notas.sql.
--
-- POR QUE SE LLAMA A LA FUNCION Y NO SE COPIA SU SQL: una migracion corre una
-- vez y ANTES que el seed, asi que ninguna prueba puede ejercitarla. La funcion
-- si. Se prueba el codigo que corrio, no una copia suya.
--
-- EL CASO REAL, medido en produccion el 2026-08-22: 13 de 34 descripciones
-- empiezan por "O.C <numero>", con tres separadores distintos, y la mas corta
-- deja 10 caracteres al quitarlo.
--
-- OJO: LAS DOS ULTIMAS SON EL PUNTO DE ESTE CAMBIO. Mover el dato solo sirve si
-- el destino es privado, y un 0 filas para el alumno no distingue "la politica
-- funciona" de "la tabla esta vacia": por eso al lado va el personal leyendo 3.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(10);

-- Las TRES formas de separador que hay en produccion, mas un control negativo.
insert into public.products (id, name, category, description, sort_order) values
  ('dddddddd-0000-0000-0000-00000000000c', 'FIXTURE OC ESPACIO', 'Cables',
   'O.C 115965 MAGNETIC WEBCAM', 91),
  ('dddddddd-0000-0000-0000-00000000000d', 'FIXTURE OC BARRA', 'Cables',
   'O.C 115962 / COD. NLN-00001', 92),
  ('dddddddd-0000-0000-0000-00000000000e', 'FIXTURE OC GUION', 'Cables',
   'O.C 115963 - SPACE GREY', 93),
  -- OJO, CONTROL NEGATIVO: esta NO lleva el prefijo. Si la funcion la tocara,
  -- el regex estaria mordiendo de mas y ninguna de las tres pruebas de arriba
  -- lo delataria: las tres seguirian pasando igual.
  ('dddddddd-0000-0000-0000-00000000000f', 'FIXTURE SIN OC', 'Cables',
   'CABLE HDMI DE 2M, SIN ORDEN DE COMPRA', 94);

-- 1. Mueve EXACTAMENTE las tres del prefijo. Si diera 4 se estaria comiendo el
--    control negativo; si diera menos de 3, una forma se le escapa.
select is(private.mover_orden_de_compra(), 3,
  'Mueve las tres descripciones con prefijo y ninguna mas');

-- 2, 3 y 4. Una por separador: el prefijo se va y lo que describe al equipo se
--    queda entero, sin espacio ni separador delante.
select is((select description from public.products
            where id = 'dddddddd-0000-0000-0000-00000000000c'),
  'MAGNETIC WEBCAM', 'Separador espacio: queda la especificacion sola');

select is((select description from public.products
            where id = 'dddddddd-0000-0000-0000-00000000000d'),
  'COD. NLN-00001', 'Separador barra: se va tambien la barra');

select is((select description from public.products
            where id = 'dddddddd-0000-0000-0000-00000000000e'),
  'SPACE GREY', 'Separador guion: se va tambien el guion');

-- 5. EL CONTROL NEGATIVO. Sin el, los tres de arriba no distinguen "quita el
--    prefijo" de "reescribe cualquier descripcion".
select is((select description from public.products
            where id = 'dddddddd-0000-0000-0000-00000000000f'),
  'CABLE HDMI DE 2M, SIN ORDEN DE COMPRA',
  'La descripcion sin prefijo queda intacta');

-- 6. Ninguna queda vacia. Es lo que decide si esto crea un producto sin texto.
select is((select count(*)::int from public.products
            where id::text like 'dddddddd-0000-0000-0000-00000000000%'
              and coalesce(description, '') = ''),
  0, 'Ninguna descripcion queda vacia al quitar el prefijo');

-- 7. Y EL DATO NO SE PERDIO, que es la mitad que separa mudar de borrar.
select is((select purchase_order from public.product_purchase_orders
            where product_id = 'dddddddd-0000-0000-0000-00000000000e'),
  '115963', 'El numero queda guardado en la tabla del personal');

-- 8. Idempotente: correrla dos veces no mueve nada la segunda. Importa porque
--    el CI aplica las migraciones sobre un Postgres limpio.
select is(private.mover_orden_de_compra(), 0,
  'La segunda llamada no mueve ninguna fila');

-- 9. EL ALUMNO NO LO VE. Es el punto entero del cambio.
--    Ojo con la forma del fallo: falta de PRIVILEGIO lanza 42501; falta de
--    POLITICA filtra a cero filas. Aqui el grant existe, asi que lo que se mide
--    es la politica y el resultado correcto es 0 filas, no una excepcion.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.product_purchase_orders), 0,
  'Un alumno no ve ninguna orden de compra');

reset role;

-- 10. CONTROL POSITIVO, y sin el la anterior no vale nada: un 0 para el alumno
--     no distingue "la politica lo filtra" de "la tabla esta vacia".
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.product_purchase_orders), 3,
  'El personal si ve las tres');

reset role;

select * from finish();

rollback;
