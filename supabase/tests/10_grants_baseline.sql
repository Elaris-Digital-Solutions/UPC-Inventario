-- Los privilegios de partida de public.
--
-- La linea base 20260805030123 dejo dos cosas encendidas:
--   1. GRANT ALL sobre las 11 tablas a anon y a authenticated
--   2. ALTER DEFAULT PRIVILEGES repitiendo ese GRANT ALL en cada tabla futura
--
-- El (2) es el peligroso: staff_members, que decide quien es administrador,
-- naceria con permiso de escritura para el rol anonimo. Verificado el 2026-08-05
-- creando una tabla vacia: salia con anon=arwdDxtm.
--
-- Esta prueba vigila que la fabrica siga apagada.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(3);


-- Una tabla nueva no hereda privilegios de nadie.
create table public.canario (id int);
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_name = 'canario' and grantee in ('anon', 'authenticated')),
  0,
  'una tabla nueva no concede nada a anon ni a authenticated'
);


-- Ninguna tabla de public deja escribir al anonimo.
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee = 'anon'
      and privilege_type in ('INSERT', 'UPDATE', 'DELETE')),
  0,
  'anon no puede escribir en ninguna tabla de public'
);


-- service_role si conserva lo suyo: es la clave de servidor y salta RLS por diseno.
select isnt(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'service_role'),
  0,
  'service_role conserva sus privilegios'
);


select * from finish();

rollback;
