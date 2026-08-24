-- La migracion 32 borra los datos de demo de produccion (D-84).
--
-- POR QUE HAY FIXTURES: los cuatro ids que borra la migracion NO EXISTEN en
-- local, asi que alli borra cero filas -- y eso es correcto, no un fallo --.
-- Sin estas filas la prueba pasaria VACIA, y cero filas borradas es
-- indistinguible de cero filas que borrar. Misma trampa que documentan
-- 36_desempaquetar_descripcion.sql y 38_deduplicar_notas.sql.
--
-- POR QUE SE LLAMA A LA FUNCION Y NO SE COPIA SU SQL: una migracion corre una
-- vez y ANTES que el seed. Se prueba el codigo que corrio, no una copia suya.
--
-- LO QUE DE VERDAD SE ESTA PROBANDO no es que borre -- eso es facil -- sino
-- QUE NO BORRE DE MAS. La ultima asercion es la que hace valida a la prueba:
-- una funcion sin `where`, o con uno mal escrito, vaciaria `alumnos` entero y
-- las siete primeras seguirian en verde.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(8);

select has_function(
  'private'::name,
  'borrar_alumnos_demo'::name,
  array['uuid[]'],
  'existe private.borrar_alumnos_demo(uuid[])'
);

-- EL PRIVILEGIO: Postgres concede EXECUTE a PUBLIC en toda funcion nueva, y
-- private tiene grant usage para authenticated. Sin el revoke, cualquiera con
-- sesion podria borrar alumnos.
select is(
  has_function_privilege('authenticated', 'private.borrar_alumnos_demo(uuid[])', 'execute'),
  false,
  'authenticated NO puede ejecutar la funcion'
);

-- CONTROL POSITIVO de la de arriba: sin este true, el false no distingue
-- "revocado" de "la sonda pregunta mal".
select is(
  has_function_privilege(
    'authenticated',
    'public.create_reservation(uuid,uuid,timestamptz,integer,text)',
    'execute'
  ),
  true,
  'y en cambio SI puede ejecutar create_reservation'
);


-- Producto y unidades propios, para no chocar con el EXCLUDE de no-solape
-- sobre las unidades del seed.
insert into public.products (id, name, category, description, sort_order) values
  ('dddddddd-0000-0000-0000-00000000000d', 'FIXTURE BORRADO DEMO', 'Camaras',
   'Producto de prueba', 98);

insert into public.inventory_units (id, product_id, campus_id, unit_code, status) values
  ('eeeeeeee-0000-0000-0000-00000000000d', 'dddddddd-0000-0000-0000-00000000000d',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-DEMO-1', 'active'),
  ('eeeeeeee-0000-0000-0000-00000000000e', 'dddddddd-0000-0000-0000-00000000000d',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-DEMO-2', 'active'),
  ('eeeeeeee-0000-0000-0000-00000000000f', 'dddddddd-0000-0000-0000-00000000000d',
   (select id from public.campuses where name = 'Monterrico'), 'FIX-DEMO-3', 'active');

-- DOS alumnos de demo -- los que se pasan en el array -- y UNO ajeno, que es
-- el control. Los tres SIN auth_user_id, para que la unica diferencia entre
-- ellos sea estar o no en la lista: si el ajeno tuviera cuenta, sobrevivir no
-- probaria nada sobre el criterio.
insert into public.alumnos (id, email, nombre, apellido) values
  ('aaaaaaaa-0000-0000-0000-0000000000d1', 'fixture.demo.uno@upc.edu.pe',  'Demo', 'Uno'),
  ('aaaaaaaa-0000-0000-0000-0000000000d2', 'fixture.demo.dos@upc.edu.pe',  'Demo', 'Dos'),
  ('aaaaaaaa-0000-0000-0000-0000000000d3', 'fixture.ajeno@upc.edu.pe',     'Ajeno', 'Real');

-- Una reserva por alumno, cada una en su unidad.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
values
  ('40404040-0000-0000-0000-000000000001', 'dddddddd-0000-0000-0000-00000000000d',
   'eeeeeeee-0000-0000-0000-00000000000d', 'aaaaaaaa-0000-0000-0000-0000000000d1',
   'reserva de demo uno', now() + interval '2 days', now() + interval '2 days 2 hours'),
  ('40404040-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d',
   'eeeeeeee-0000-0000-0000-00000000000e', 'aaaaaaaa-0000-0000-0000-0000000000d2',
   'reserva de demo dos', now() + interval '2 days', now() + interval '2 days 2 hours'),
  ('40404040-0000-0000-0000-000000000003', 'dddddddd-0000-0000-0000-00000000000d',
   'eeeeeeee-0000-0000-0000-00000000000f', 'aaaaaaaa-0000-0000-0000-0000000000d3',
   'reserva del alumno ajeno', now() + interval '2 days', now() + interval '2 days 2 hours');

-- Log en una reserva de demo y en la del ajeno: la cascada tiene que llevarse
-- solo la primera.
insert into public.reservation_status_log (id, reservation_id, new_status) values
  ('40404040-0000-0000-0000-00000000000a', '40404040-0000-0000-0000-000000000001', 'active'),
  ('40404040-0000-0000-0000-00000000000b', '40404040-0000-0000-0000-000000000003', 'active');


-- Devuelve cuantos ALUMNOS borro. La asercion mira el numero y no solo el
-- estado final: si borrara de mas, este 2 lo delata antes que nada.
select is(
  private.borrar_alumnos_demo(array[
    'aaaaaaaa-0000-0000-0000-0000000000d1'::uuid,
    'aaaaaaaa-0000-0000-0000-0000000000d2'::uuid
  ]),
  2,
  'devuelve 2: los dos alumnos de la lista'
);

select is(
  (select count(*)::int from public.alumnos
    where id in ('aaaaaaaa-0000-0000-0000-0000000000d1',
                 'aaaaaaaa-0000-0000-0000-0000000000d2')),
  0,
  'los dos alumnos de la lista ya no estan'
);

select is(
  (select count(*)::int from public.inventory_reservations
    where id in ('40404040-0000-0000-0000-000000000001',
                 '40404040-0000-0000-0000-000000000002')),
  0,
  'sus reservas ya no estan'
);

-- LA CASCADA, comprobada y no supuesta.
select is(
  (select count(*)::int from public.reservation_status_log
    where id = '40404040-0000-0000-0000-00000000000a'),
  0,
  'su reservation_status_log se fue por cascade'
);

-- EL CONTROL QUE HACE VALIDA LA PRUEBA ENTERA: el alumno que NO estaba en la
-- lista sigue en pie, con su reserva y su log. Sin esta asercion, una funcion
-- que vaciara la tabla entera daria verde en las siete de arriba.
select is(
  (select count(*)::int from public.alumnos where id = 'aaaaaaaa-0000-0000-0000-0000000000d3')
  + (select count(*)::int from public.inventory_reservations where id = '40404040-0000-0000-0000-000000000003')
  + (select count(*)::int from public.reservation_status_log where id = '40404040-0000-0000-0000-00000000000b'),
  3,
  'el alumno ajeno, su reserva y su log siguen INTACTOS'
);

select * from finish();

rollback;
