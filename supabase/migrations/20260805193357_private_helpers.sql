-- Esquema private, tabla staff_members y los cuatro helpers de identidad y rol.
--
-- Por que private y no public: PostgREST solo expone los esquemas de
-- config.toml -> api.schemas, hoy ["public", "graphql_public"]. Lo que vive en
-- private es inalcanzable por HTTP sin depender de ningun privilegio.
--
-- Por que SECURITY DEFINER: no es solo rendimiento. La politica de staff_members
-- necesita saber si quien consulta es admin, y saberlo exige leer staff_members.
-- Al saltarse RLS, el helper corta esa recursion.
--
-- Por que se CONCEDE execute y no se revoca: medido el 2026-08-05 en
-- supabase/tests/01_grants_definer.sql. La expresion de una politica RLS se
-- evalua como el usuario que consulta, asi que sin EXECUTE la politica no se
-- puede evaluar y la consulta muere en "permission denied for function". El
-- aislamiento lo da el esquema, no el privilegio.
--
-- staff_role y staff_members se crean aca, en la misma migracion, porque los
-- helpers los referencian y no pueden apuntar a lo que no existe.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, secciones 4 y 5.1.


create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;


create type public.staff_role as enum ('admin', 'operator');

create table public.staff_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       public.staff_role not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;

create trigger trg_staff_members_updated_at
  before update on public.staff_members
  for each row execute function public.fn_update_updated_at();


-- Los cuatro helpers. Devuelven nulo o falso sin sesion: una politica que lanza
-- excepcion deja la tabla inaccesible en vez de vacia.
--
-- auth.uid() va envuelto en (select ...) para que el planificador lo evalue una
-- vez por sentencia y no una vez por fila.

create or replace function private.current_alumno_id() returns uuid
  language sql stable security definer set search_path = '' as $$
    select a.id
      from public.alumnos a
     where a.auth_user_id = (select auth.uid())
       and a.activo
  $$;

create or replace function private.current_staff_role() returns public.staff_role
  language sql stable security definer set search_path = '' as $$
    select s.role
      from public.staff_members s
     where s.user_id = (select auth.uid())
       and s.activo
  $$;

create or replace function private.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
    select exists (
      select 1
        from public.staff_members s
       where s.user_id = (select auth.uid())
         and s.activo
         and s.role = 'admin'
    )
  $$;

create or replace function private.is_staff() returns boolean
  language sql stable security definer set search_path = '' as $$
    select exists (
      select 1
        from public.staff_members s
       where s.user_id = (select auth.uid())
         and s.activo
    )
  $$;


grant execute on function private.current_alumno_id()  to authenticated;
grant execute on function private.current_staff_role() to authenticated;
grant execute on function private.is_admin()           to authenticated;
grant execute on function private.is_staff()           to authenticated;
