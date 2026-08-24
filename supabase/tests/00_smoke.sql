-- Prueba de humo del esquema base.
--
-- No verifica reglas de negocio: verifica que la linea base se aplico, que las
-- extensiones estan y que el seed cargo lo que dice cargar. Si esta falla, todo
-- lo demas es ruido.
--
-- pgtap vive en el esquema extensions (ver supabase/seed.sql), asi que se fija el
-- search_path de forma explicita en vez de confiar en el del rol.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(9);


-- Tablas de la linea base 20260805030123
select has_table('public', 'alumnos', 'existe public.alumnos');
select has_table('public', 'inventory_reservations', 'existe public.inventory_reservations');
select has_table('public', 'reservation_status_log', 'existe public.reservation_status_log');

-- Enums de la linea base
select has_type('public', 'reservation_status', 'existe el enum reservation_status');
select has_type('public', 'unit_status', 'existe el enum unit_status');

-- Extension de la migracion 20260805184306
select has_extension('extensions', 'btree_gist', 'btree_gist esta instalada');

-- Conteos del seed. Fijos a proposito: si alguien toca seed.sql sin querer,
-- esto lo delata antes que cualquier prueba de negocio.
select is((select count(*)::int from public.campuses), 2, 'el seed cargo 2 sedes');
select is((select count(*)::int from public.inventory_units), 8, 'el seed cargo 8 unidades');
select is((select count(*)::int from public.products), 4, 'el seed cargo 4 productos');


select * from finish();

rollback;
