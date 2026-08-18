-- D-77: el salon de devolucion es de la sede, no del producto.
--
-- POR QUE POR NOMBRE Y NO POR ID: el seed local y produccion comparten los
-- nombres 'Monterrico' y 'San Miguel' -comprobado el 2026-08-18- pero NO los
-- id, que en el seed son literales 'cccccccc-...'. Una prueba por id pasaria
-- en local y no diria nada del proyecto real.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);

select has_column(
  'public', 'campuses', 'salon_devolucion',
  'campuses tiene la columna del salon de devolucion'
);

select is(
  (select salon_devolucion from public.campuses where name = 'San Miguel'),
  'SM-SB608',
  'San Miguel devuelve en SM-SB608'
);

select is(
  (select salon_devolucion from public.campuses where name = 'Monterrico'),
  'MO-UH40',
  'Monterrico devuelve en MO-UH40'
);

-- CONTROL NEGATIVO: sin el, una columna que devolviera el mismo texto para
-- cualquier fila pasaria las dos comprobaciones de arriba.
select isnt(
  (select salon_devolucion from public.campuses where name = 'San Miguel'),
  (select salon_devolucion from public.campuses where name = 'Monterrico'),
  'las dos sedes NO comparten salon'
);

select * from finish();

rollback;
