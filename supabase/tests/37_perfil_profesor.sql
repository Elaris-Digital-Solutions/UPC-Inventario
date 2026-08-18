-- D-79: el formulario de la primera reserva guarda dos datos mas.
--
-- LA CUARTA COMPROBACION ES LA QUE IMPORTA Y ES LA QUE SE OLVIDA: alumnos
-- tiene el grant de UPDATE con las columnas ENUMERADAS
-- -20260805194848_alumno_policies.sql:27-, asi que una columna nueva NO queda
-- cubierta sola. Sin la linea de grant, guardarPerfil() responde 42501 o afecta
-- cero filas, y NINGUNA herramienta local lo ve: typecheck, lint y build pasan,
-- porque un privilegio no esta en el tipo. Es la leccion de la migracion 26,
-- aplicada antes de repetir el fallo y no despues.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

select has_column('public', 'alumnos', 'es_profesor',
  'alumnos tiene es_profesor');

select has_column('public', 'alumnos', 'confirmo_facultad',
  'alumnos tiene confirmo_facultad');

select col_default_is('public', 'alumnos', 'es_profesor', 'false',
  'es_profesor nace en false: nadie es profesor por omision');

-- EL PRIVILEGIO, contado y no supuesto. Cinco columnas exactas con UPDATE
-- para authenticated: las tres de siempre mas las dos nuevas.
select is(
  (select count(*)::int
     from information_schema.column_privileges
    where table_schema   = 'public'
      and table_name     = 'alumnos'
      and grantee        = 'authenticated'
      and privilege_type = 'UPDATE'),
  5,
  'authenticated tiene UPDATE sobre exactamente cinco columnas de alumnos'
);

-- CONTROL POSITIVO del anterior: sin esto, un cero en la consulta de arriba
-- -por un nombre de tabla mal escrito, por ejemplo- no se distinguiria de una
-- sonda rota.
select is(
  (select count(*)::int
     from information_schema.column_privileges
    where table_schema   = 'public'
      and table_name     = 'alumnos'
      and grantee        = 'authenticated'
      and privilege_type = 'UPDATE'
      and column_name    = 'confirmo_facultad'),
  1,
  'confirmo_facultad esta entre las columnas con UPDATE'
);

select * from finish();

rollback;
