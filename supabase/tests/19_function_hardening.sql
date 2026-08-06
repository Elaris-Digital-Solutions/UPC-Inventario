-- Cobertura, no una regla concreta: que no quede ninguna funcion sin search_path
-- fijo. Es el hermano de 18_rls_coverage.sql.
--
-- Una funcion SECURITY DEFINER sin search_path fijo es escalable: corre con los
-- privilegios de su dueno, y quien la llama controla que tabla resuelve cada
-- nombre sin cualificar. Basta con crear una tabla en un esquema propio y ponerlo
-- delante del search_path para que la funcion, con privilegios de postgres,
-- trabaje sobre ella.
--
-- Las 16 funciones de la Fase 1 lo llevan. Esto detiene el CI si alguien anade
-- una que no.
--
-- La cadena que se compara es la representacion real que guarda Postgres:
-- `set search_path = ''` se almacena como el elemento search_path="". Verificado
-- el 2026-08-05 con `select proconfig from pg_proc`.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(2);


select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and p.proconfig is null),
  0,
  'ninguna funcion de public ni private se queda sin search_path fijo'
);

select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname in ('public', 'private')
      and p.prokind = 'f'
      and p.prosecdef
      and not ('search_path=""' = any(p.proconfig))),
  0,
  'las SECURITY DEFINER lo tienen ademas vacio, no solo fijo'
);


select * from finish();

rollback;
