-- Regla confirmada el 2026-08-05: la expresion de una politica RLS se evalua como
-- el usuario que consulta, no como el dueno de la tabla.
--
-- Consecuencia para la tanda 1: a los helpers de private/ hay que CONCEDERLES
-- EXECUTE a authenticated. Revocarlo no endurece nada, rompe la politica entera y
-- deja la consulta en "permission denied" antes siquiera de filtrar filas.
--
-- Lo que mantiene los helpers fuera del alcance de un cliente HTTP es que viven en
-- el esquema `private`, y PostgREST solo expone los de config.toml -> api.schemas
-- (hoy: public y graphql_public).
--
-- Esta prueba existe para que, si alguien "endurece" los permisos en el futuro,
-- el CI le explique por que no se hace.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(2);


-- Montaje: una tabla con RLS cuya politica depende de un helper SECURITY DEFINER.
create schema probe;
create table probe.t (id int primary key);
alter table probe.t enable row level security;
insert into probe.t values (1);

create function probe.allowed() returns boolean
  language sql stable security definer set search_path = '' as $$ select true $$;

create policy p on probe.t for select to authenticated using ((select probe.allowed()));
grant usage on schema probe to authenticated;
grant select on probe.t to authenticated;


-- Caso A: con EXECUTE concedido, la politica funciona.
grant execute on function probe.allowed() to authenticated;

set local role authenticated;
select is(
  (select count(*)::int from probe.t),
  1,
  'con EXECUTE concedido, la politica evalua el helper y devuelve la fila'
);
reset role;


-- Caso B: sin EXECUTE, la consulta falla. PUBLIC recibe EXECUTE por defecto al
-- crear la funcion, asi que revocarselo solo a authenticated no cambiaria nada.
revoke execute on function probe.allowed() from authenticated, public;

set local role authenticated;
select throws_ok(
  'select count(*) from probe.t',
  '42501',
  'permission denied for function allowed',
  'sin EXECUTE, la politica no se puede evaluar y la consulta se deniega'
);
reset role;


select * from finish();

rollback;
