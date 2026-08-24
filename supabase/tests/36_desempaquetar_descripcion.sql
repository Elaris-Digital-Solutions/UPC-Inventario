-- D-82: products.description empaqueta tres datos con tres publicos.
--
-- POR QUE HAY FIXTURES Y NO SE USA EL SEED: el seed.sql NO tiene ni una
-- descripcion con la forma de produccion -siembra 'Camara full frame sin
-- espejo, 24 MP'-. Sin estas filas la prueba pasaria VACIA, y cero filas
-- cambiadas es indistinguible de cero filas que cambiar.
--
-- POR QUE SE LLAMA A LA FUNCION Y NO SE COPIA SU SQL: una migracion corre una
-- vez y ANTES que el seed, asi que ninguna prueba puede ejercitarla. La funcion
-- si. Se prueba el codigo que corrio, no una copia suya.
--
-- LAS TRES FORMAS, medidas en produccion el 2026-08-18 sobre los 34 productos:
--   16 son  Lab | especificacion | Obs
--   16 son  Lab | algo                  (sin observacion)
--    2 son  Lab | Obs                   (SIN especificacion)
-- La tercera es la trampa: un split_part(description, ' | ', 2) a ciegas le
-- deja a esos dos "Obs: ..." COMO DESCRIPCION PUBLICA, que es justo lo que
-- D-82 existe para esconder.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(8);

-- Tres productos, uno por forma, con una unidad cada uno para que la nota
-- tenga donde caer.
insert into public.products (id, name, category, description, sort_order) values
  ('dddddddd-0000-0000-0000-000000000001', 'FIXTURE TRES PARTES', 'Cables',
   'Lab: MO-UH40 | O.C 999001 CABLE DE PRUEBA 2M | Obs: Correcto funcionamiento', 90),
  ('dddddddd-0000-0000-0000-000000000002', 'FIXTURE DOS PARTES', 'Tablets',
   'Lab: SM-SB608 | IPAD', 91),
  ('dddddddd-0000-0000-0000-000000000003', 'FIXTURE LAB Y OBS', 'Audio',
   'Lab: SM-SB608 | Obs: falta bateria', 92);

insert into public.inventory_units (id, product_id, campus_id, unit_code, status) values
  ('eeeeeeee-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-000000000001',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-001', 'active'),
  ('eeeeeeee-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-000000000002',
   (select id from public.campuses where name = 'San Miguel'), 'FIX-002', 'active'),
  ('eeeeeeee-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-000000000003',
   (select id from public.campuses where name = 'San Miguel'), 'FIX-003', 'active');

select private.desempaquetar_descripciones();

-- Forma 1: se queda la especificacion, sin el salon y sin la observacion.
select is(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000001'),
  'O.C 999001 CABLE DE PRUEBA 2M',
  'tres partes: queda solo la especificacion'
);

-- Forma 2: se queda lo que habia en medio, aunque sea un tipo y no una
-- descripcion. La funcion no inventa texto.
select is(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000002'),
  'IPAD',
  'dos partes sin Obs: queda el trozo del medio tal cual'
);

-- Forma 3, LA QUE IMPORTA: la observacion se muda y la descripcion queda VACIA,
-- no con el texto de la observacion dentro.
select is(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000003'),
  '',
  'Lab + Obs: la descripcion queda vacia, NO con la observacion'
);

-- Y la contraria de la anterior, que es la que detecta el fallo de verdad.
--
-- unalike() y NO unlike(): pgTAP no tiene unlike. Para patrones LIKE son
-- alike/unalike, y para expresiones regulares matches/doesnt_match. Medido al
-- ejecutar: "function unlike(text, unknown, unknown) does not exist".
select unalike(
  (select description from public.products where id = 'dddddddd-0000-0000-0000-000000000003'),
  '%bateria%',
  'la observacion NO se queda publicada como descripcion'
);

-- Las observaciones llegaron a su tabla, una por unidad del producto.
select is(
  (select note from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000003'),
  'falta bateria',
  'la observacion de la forma 3 esta en las notas de unidad'
);

select is(
  (select note from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000001'),
  'Correcto funcionamiento',
  'la observacion de la forma 1 esta en las notas de unidad'
);

-- CONTROL NEGATIVO: el producto sin observacion no genera nota. Sin esta
-- comprobacion, una funcion que escribiera una nota por unidad pasase lo que
-- pasase daria verde en las dos de arriba.
select is(
  (select count(*)::int from public.inventory_unit_notes
    where unit_id = 'eeeeeeee-0000-0000-0000-000000000002'),
  0,
  'el producto sin observacion NO genera nota'
);

-- CONTROL DEL FILTRO, anadido al ejecutar y no previsto en el plan: una
-- descripcion que NO empieza por 'Lab: ' tiene que quedar INTACTA. Sin esto,
-- una funcion sin WHERE -o con uno mal escrito- arrasaria el catalogo entero y
-- las siete comprobaciones de arriba seguirian en verde, porque ninguna mira
-- una fila que no sea suya.
select is(
  (select description from public.products where name = 'Camara Sony A7 III'),
  'Camara full frame sin espejo, 24 MP',
  'una descripcion sin el prefijo Lab: queda intacta'
);

select * from finish();

rollback;
