-- Los helpers de identidad y rol.
--
-- Viven en el esquema private, que no esta en config.toml -> api.schemas, asi que
-- PostgREST no los expone. Son SECURITY DEFINER no solo por rendimiento: es lo que
-- corta la recursion de la politica de staff_members, que para saber si sos admin
-- necesita leer staff_members.
--
-- Sin sesion deben devolver nulo o falso, nunca reventar: una politica que lanza
-- excepcion deja la tabla inaccesible en vez de vacia.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


select has_schema('private', 'existe el esquema private');

select has_function('private', 'current_alumno_id',  'existe private.current_alumno_id');
select has_function('private', 'current_staff_role', 'existe private.current_staff_role');
select has_function('private', 'is_admin',           'existe private.is_admin');
select has_function('private', 'is_staff',           'existe private.is_staff');


-- Sin sesion: nulo y falso, sin excepcion.
select is(private.current_alumno_id(), null::uuid, 'sin sesion, current_alumno_id es nulo');
select is(private.is_admin(), false, 'sin sesion, is_admin es falso');


select * from finish();

rollback;
