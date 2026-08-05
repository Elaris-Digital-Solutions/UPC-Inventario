-- Cobertura de RLS: que no quede ninguna tabla fuera.
--
-- Esta prueba no verifica una regla concreta, verifica que no haya olvidos. Una
-- tabla con RLS apagada queda expuesta a lo que permita el GRANT; una tabla con
-- RLS encendida y cero politicas queda inaccesible incluso para quien deberia
-- leerla, que fue exactamente lo que le paso a reservation_status_log en la linea
-- base y por lo que la auditoria nunca se escribio.
--
-- Si alguien anade una tabla en una tanda futura y se olvida de cualquiera de las
-- dos cosas, esto lo detiene en el CI.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(2);


select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and not c.relrowsecurity),
  0,
  'todas las tablas de public tienen RLS activo'
);


select is(
  (select count(*)::int
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)),
  0,
  'ninguna tabla con RLS se queda sin politicas'
);


select * from finish();

rollback;
