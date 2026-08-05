-- Extensiones que el esquema de la Fase 1 necesita en produccion.
--
-- btree_gist permite mezclar dentro de un mismo indice gist un tipo escalar
-- (unit_id uuid, con el operador =) y un rango (blocked_range tstzrange, con &&).
-- Sin ella, gist no sabe indexar uuid con = y el EXCLUDE anti-solape de la tanda 2
-- no se puede crear.
--
-- pgtap NO va aca a proposito: solo lo usan las pruebas, y vive en seed.sql para
-- que sus funciones nunca lleguen a la base de produccion.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.2.

create extension if not exists btree_gist with schema extensions;
