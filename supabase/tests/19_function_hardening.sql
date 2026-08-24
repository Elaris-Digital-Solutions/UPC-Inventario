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

select plan(4);


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


-- Una funcion de trigger no tiene por que ser invocable por HTTP. PostgREST
-- publica en /rest/v1/rpc/ todo lo que el rol pueda ejecutar, y al crear una
-- funcion PUBLIC recibe EXECUTE por defecto: si no se revoca, quedan ahi.
--
-- Hoy plpgsql las rechaza con "trigger functions can only be called as triggers",
-- pero esa proteccion es del intérprete y no del diseño: desaparece en cuanto
-- alguna deje de ser de trigger.
--
-- prorettype = trigger es como Postgres las identifica, asi que esta asercion
-- cubre tambien las que se anadan en el futuro sin enumerarlas.
--
-- Revocarles EXECUTE es seguro, y esta MEDIDO: un trigger no necesita el
-- privilegio porque lo invoca el motor. Ojo con generalizarlo -a un helper de
-- politica RLS revocarselo SI la rompe (ver 01_grants_definer.sql)-: la expresion
-- de una politica se evalua como el usuario que consulta.
--
-- Quien lo demuestra no es esta asercion sino 21, 22 y 25: si los triggers
-- dejaran de dispararse, esas tres caen.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'pg_catalog.trigger'::regtype
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  0,
  'ninguna funcion de trigger queda expuesta como RPC'
);


-- El hueco que destapo el diseno de la Fase 2: la asercion de arriba vigila las
-- funciones de TRIGGER, pero nadie afirmaba lo mismo de las RPC de verdad.
--
-- Importa ahora porque D-19 recrea create_reservation con CREATE OR REPLACE. La
-- documentacion dice que reemplazar una funcion conserva sus privilegios, y esta
-- MEDIDO contra esta misma base el 2026-08-06: tras el replace, anon sigue en
-- false. El contraejemplo tambien se midio -drop + create lo devuelve a true-,
-- que es el motivo de que la migracion de D-19 no lleve un drop delante.
--
-- Si alguna vez alguien la recreara con DROP + CREATE, la RPC volveria a
-- publicarse en /rest/v1/rpc/ para el rol anonimo sin que nada lo notara.
--
-- btree_gist y pgtap viven en `extensions`, asi que public no tiene funciones de
-- extension que ensucien este conteo.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype <> 'pg_catalog.trigger'::regtype
      and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'ninguna funcion de public es ejecutable por anon'
);


select * from finish();

rollback;
