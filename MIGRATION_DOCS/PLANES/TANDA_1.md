> ## ✅ Ejecutado el 2026-08-05 · tres correcciones
>
> El plan de abajo es **el que se escribió antes de ejecutar**. Resultado: 8 migraciones, 62 aserciones
> pgTAP, y P0-2, P0-5 y P1-10 cerrados.
>
> 1. **La sanción no puede vivir en un `GRANT` de columna.** *Detectado al autorrevisar el plan, antes de
>    escribir SQL — por eso ya está corregido en la Task 5 de abajo.* El diseño concedía
>    `UPDATE (activo, banned_until)` a `authenticated` para que el admin sancionara; pero un privilegio de
>    columna se concede a un **rol**, y `authenticated` incluye a los alumnos, a quienes
>    `alumnos_update_own` ya les permite escribir su propia fila. Habría reabierto P1-10. Esas columnas no
>    se conceden a nadie. **Deuda para la tanda 2:** una RPC de admin para levantar sanciones a mano.
> 2. **Una política que consulta otra tabla protegida hereda sus políticas.** *Detectado ejecutando.* La
>    versión original de `alumnos_select_staff` leía `inventory_reservations` con un `exists`, y esa tabla
>    tenía una política que leía `alumnos`: `infinite recursion detected in policy for relation "alumnos"`.
>    Se resolvió con el helper `private.tiene_reserva_viva(uuid)`, `SECURITY DEFINER`, que salta RLS y corta
>    el ciclo. **El plan de abajo no lo tiene**; la migración sí.
> 3. **Falta de privilegio y falta de política fallan distinto.** *Detectado ejecutando.* Sin privilegio,
>    Postgres lanza `42501`. Sin política, RLS no encuentra filas y el `UPDATE` o `DELETE` afecta a **cero
>    filas, sin error**. Las dos son seguras, pero varias pruebas de abajo están escritas con `throws_ok`
>    donde correspondía comprobar el efecto, y daban falso negativo. En la batería final, los intentos del
>    operador se verifican leyendo el valor después.
>
> Y una trampa heredada que apareció antes de crear nada: la línea base traía un `ALTER DEFAULT PRIVILEGES`
> que concedía **todos** los privilegios a `anon` en cada tabla nueva de `public`. Medido sobre una tabla
> vacía: `anon=arwdDxtm`. `staff_members` habría nacido escribible por el rol anónimo. Por eso la Task 1
> no crea nada: revoca.

# Tanda 1 — Identidad y autorización · Plan de implementación

**Goal:** que la base decida quién puede hacer qué, sin que el cliente participe en la decisión. Cierra
P0-2, P0-5 y P1-10.

**Architecture:** dos capas. Primero los privilegios de Postgres (por operación y por columna), después
RLS (por fila). Los helpers de rol viven en el esquema `private`, que PostgREST no expone, y son
`SECURITY DEFINER` para poder leer `staff_members` sin caer en recursión.

**Tech Stack:** PostgreSQL 17 · RLS · pgTAP · Supabase CLI 2.111.0

## Global Constraints

- **Orden obligatorio:** la revocación de `ALTER DEFAULT PRIVILEGES` va **antes** de crear cualquier
  tabla. Verificado el 2026-08-05: una tabla nueva en `public` nace con `arwdDxtm` para `anon` y
  `authenticated`.
- A los helpers de `private` se les **concede** `EXECUTE` a `authenticated`. Revocarlo rompe la política.
  Medido en `supabase/tests/01_grants_definer.sql`.
- Toda política `TO authenticated` (o `TO anon, authenticated` en catálogo público). Todo `UPDATE` con
  `USING` **y** `WITH CHECK`.
- `service_role` conserva sus privilegios: es la clave de servidor y salta RLS por diseño.
- Cada llamada a un helper dentro de una política va envuelta en `(select …)`.
- Migraciones versionadas con `npx supabase migration new`. Nada de SQL suelto.
- Local: `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo.**
- Mensajes de commit sin acentos. Claude no toca el remoto.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `…_revoke_blanket_grants.sql` | Apaga los privilegios por defecto y barre los `GRANT ALL` existentes |
| `…_private_helpers.sql` | Esquema `private` y los cuatro helpers de identidad y rol |
| `…_staff_members.sql` | Tabla de personal, su RLS y sus privilegios |
| `…_alumno_provisioning.sql` | Columnas nullable, trigger sobre `auth.users`, privilegios y RLS de `alumnos` |
| `…_catalog_policies.sql` | Lectura pública y escritura de admin sobre el catálogo |
| `…_traceability.sql` | `created_by` por defecto, log de estados solo-anexar |
| `…_reservation_policies.sql` | Lectura de reservas; sin política de escritura |
| `supabase/seed.sql` | Se amplía con usuarios de `auth.users` y personal de prueba |
| `supabase/tests/1*.sql` | Una batería por frente |

Una migración por frente, no una gigante: si algo hay que revertir, se revierte lo justo.

---

### Task 1: Apagar la fábrica de permisos

Es la tarea que hace segura a toda la tanda. Si va después de crear `staff_members`, esa tabla nace con
permiso de escritura para `anon`.

**Files:**
- Create: `supabase/migrations/<ts>_revoke_blanket_grants.sql`
- Create: `supabase/tests/10_grants_baseline.sql`

**Interfaces:**
- Produces: un `public` donde `anon` y `authenticated` **no tienen nada** salvo lo que se conceda
  explícitamente. Todas las tareas siguientes conceden sobre esa base.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(3);

-- Una tabla nueva no debe heredar privilegios de nadie.
create table public.canario (id int);
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_name = 'canario' and grantee in ('anon', 'authenticated')),
  0,
  'una tabla nueva no concede nada a anon ni a authenticated'
);

-- Las tablas de la linea base tampoco.
select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'anon' and privilege_type in ('INSERT','UPDATE','DELETE')),
  0,
  'anon no puede escribir en ninguna tabla de public'
);

-- service_role conserva lo suyo.
select isnt(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema = 'public' and grantee = 'service_role'),
  0,
  'service_role conserva sus privilegios'
);

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: fallan las dos primeras. La tercera pasa ya.

- [ ] **Step 3: Escribir la migración**

```sql
-- El orden importa: esto va antes de cualquier CREATE TABLE de la Fase 1.
--
-- La linea base 20260805030123 dejo dos cosas encendidas:
--   1. GRANT ALL sobre las 11 tablas a anon y authenticated
--   2. ALTER DEFAULT PRIVILEGES que repite ese GRANT ALL en cada tabla futura
--
-- El (2) es el peligroso: staff_members naceria con permiso de escritura para
-- el rol anonimo. Verificado el 2026-08-05 creando una tabla vacia: sale con
-- anon=arwdDxtm. Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 2.
--
-- service_role no se toca: es la clave de servidor, salta RLS por diseno.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Lo que sigue se vuelve a conceder, pieza por pieza, en las migraciones
-- posteriores de esta tanda. Entre esta migracion y esas, la API no sirve
-- ninguna fila: es lo esperado.
```

- [ ] **Step 4: Aplicar y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 3 aserciones nuevas en verde. **Las de `00_smoke.sql` deben seguir pasando**: consultan
como `postgres`, que no depende de estos privilegios.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 1.1: revoca los privilegios generales de la linea base' -m 'ALTER DEFAULT PRIVILEGES concedia arwdDxtm a anon y authenticated en cada tabla nueva. Va antes de crear nada.'
```

---

### Task 2: Esquema `private` y helpers

**Files:**
- Create: `supabase/migrations/<ts>_private_helpers.sql`
- Create: `supabase/tests/11_private_helpers.sql`

**Interfaces:**
- Produces, y todas las políticas posteriores dependen de estas firmas exactas:
  - `private.current_alumno_id() → uuid` — `NULL` si no hay alumno activo para la sesión
  - `private.current_staff_role() → public.staff_role` — `NULL` si no es personal activo
  - `private.is_admin() → boolean`
  - `private.is_staff() → boolean`
- Consumes: `public.staff_members` (Task 3). **Por eso el tipo `staff_role` y la tabla se crean aquí**,
  al principio de esta migración: un helper no puede referenciar una tabla que no existe.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(4);

select has_schema('private', 'existe el esquema private');
select has_function('private', 'is_admin', 'existe private.is_admin');

-- Sin sesion, los helpers devuelven nulo en vez de reventar.
select is(private.current_alumno_id(), null::uuid, 'sin sesion, current_alumno_id es nulo');
select is(private.is_admin(), false, 'sin sesion, is_admin es falso');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: FAIL, `schema "private" does not exist`.

- [ ] **Step 3: Escribir la migración**

```sql
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- staff_role y staff_members se crean aca porque los helpers los referencian.
create type public.staff_role as enum ('admin', 'operator');

create table public.staff_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       public.staff_role not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;

create trigger trg_staff_members_updated_at before update on public.staff_members
  for each row execute function public.fn_update_updated_at();

-- SECURITY DEFINER no es solo rendimiento: es lo que corta la recursion.
-- La politica de staff_members necesita saber si sos admin, y saberlo exige
-- leer staff_members. Al saltarse RLS, el helper rompe el ciclo.
--
-- EXECUTE se concede, no se revoca. Ver supabase/tests/01_grants_definer.sql.

create or replace function private.current_alumno_id() returns uuid
  language sql stable security definer set search_path = '' as $$
    select a.id from public.alumnos a
    where a.auth_user_id = (select auth.uid()) and a.activo
  $$;

create or replace function private.current_staff_role() returns public.staff_role
  language sql stable security definer set search_path = '' as $$
    select s.role from public.staff_members s
    where s.user_id = (select auth.uid()) and s.activo
  $$;

create or replace function private.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
    select exists (
      select 1 from public.staff_members s
      where s.user_id = (select auth.uid()) and s.activo and s.role = 'admin'
    )
  $$;

create or replace function private.is_staff() returns boolean
  language sql stable security definer set search_path = '' as $$
    select exists (
      select 1 from public.staff_members s
      where s.user_id = (select auth.uid()) and s.activo
    )
  $$;

grant execute on function private.current_alumno_id()  to authenticated;
grant execute on function private.current_staff_role() to authenticated;
grant execute on function private.is_admin()           to authenticated;
grant execute on function private.is_staff()           to authenticated;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 1.2: esquema private, helpers de rol y tabla staff_members' -m 'Los helpers son SECURITY DEFINER para cortar la recursion de la politica de staff_members.'
```

---

### Task 3: Personal de prueba en el seed, y RLS de `staff_members`

Sin usuarios en `auth.users` no hay nada que probar. El seed los crea; el trigger de la Task 4 los
convertirá en alumnos.

**Files:**
- Modify: `supabase/seed.sql`
- Create: `supabase/migrations/<ts>_staff_policies.sql`
- Create: `supabase/tests/12_rls_staff.sql`

**Interfaces:**
- Produces, y las pruebas de todas las tareas siguientes usan estos identificadores:

| Rol | `auth.users.id` | Correo |
|---|---|---|
| Alumno A | `a0000000-0000-0000-0000-000000000001` | `alumno.a@upc.edu.pe` |
| Alumno B | `a0000000-0000-0000-0000-000000000002` | `alumno.b@upc.edu.pe` |
| Admin | `a0000000-0000-0000-0000-00000000000a` | `admin@upc.edu.pe` |
| Operador | `a0000000-0000-0000-0000-00000000000b` | `operador@upc.edu.pe` |
| Externo | `a0000000-0000-0000-0000-00000000000f` | `alguien@gmail.com` |

- [ ] **Step 1: Ampliar el seed**

```sql
-- Usuarios de prueba. Las contrasenas son un literal inservible a proposito:
-- las pruebas pgTAP no inician sesion, falsifican el claim del JWT.
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at,
   raw_app_meta_data, raw_user_meta_data, is_super_admin)
values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'alumno.a@upc.edu.pe',  'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'alumno.b@upc.edu.pe',  'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'admin@upc.edu.pe',     'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'operador@upc.edu.pe',  'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-00000000000f', 'authenticated', 'authenticated', 'alguien@gmail.com',    'no-login', now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false);

-- El primer admin se siembra a mano. En produccion es una sentencia puntual con
-- service_role, no una migracion: un correo concreto es dato de entorno, no esquema.
insert into public.staff_members (user_id, role) values
  ('a0000000-0000-0000-0000-00000000000a', 'admin'),
  ('a0000000-0000-0000-0000-00000000000b', 'operator');
```

- [ ] **Step 2: Escribir la prueba que falla**

Patrón de suplantación que usan **todas** las pruebas de RLS de aquí en adelante. El claim se fija
antes del rol, porque después el rol ya no puede cambiar ajustes de sesión:

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(5);

-- Admin: se ve a si mismo y al operador.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.staff_members), 2, 'el admin ve todo el personal');
select is(private.is_admin(), true, 'is_admin reconoce al admin');
reset role;

-- Operador: solo su propia fila, y no es admin.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.staff_members), 1, 'el operador solo se ve a si mismo');
select is(private.is_admin(), false, 'is_admin niega al operador');
reset role;

-- Alumno: no ve personal.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;
select is((select count(*)::int from public.staff_members), 0, 'un alumno no ve el personal');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 3: Correr y confirmar que falla**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: FAIL. Sin privilegios ni políticas, `authenticated` recibe `permission denied for table
staff_members`. Ese es el fallo correcto: confirma que la Task 1 hizo su trabajo.

- [ ] **Step 4: Escribir la migración**

```sql
grant select on public.staff_members to authenticated;
grant insert, update, delete on public.staff_members to authenticated;

-- El GRANT de escritura parece abierto leido solo. No lo es: es condicion
-- necesaria pero no suficiente. Sin el, la sentencia ni se planifica; con el,
-- RLS sigue exigiendo private.is_admin(). Postgres pide las dos cosas.

create policy staff_select_self on public.staff_members
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy staff_admin_all on public.staff_members
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
```

- [ ] **Step 5: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 6: Commit**

```
git add supabase supabase/tests
git commit -m 'Tanda 1.3: RLS de staff_members y personal de prueba en el seed' -m 'El operador solo se ve a si mismo; el admin ve y gestiona a todos.'
```

---

### Task 4: Alta automática de alumno *(D-9, cierra P0-5)*

**Files:**
- Create: `supabase/migrations/<ts>_alumno_provisioning.sql`
- Create: `supabase/tests/13_alumno_provisioning.sql`

**Interfaces:**
- Produces: por cada fila de `auth.users` con correo `@upc.edu.pe`, una fila en `alumnos` con
  `auth_user_id` ya puesto y el perfil sin completar.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(4);

select col_is_null('public', 'alumnos', 'nombre', 'alumnos.nombre admite nulo');

select is(
  (select count(*)::int from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
  1, 'el alumno A tiene fila creada por el trigger');

select is(
  (select count(*)::int from public.alumnos where email = 'alguien@gmail.com'),
  0, 'un correo que no es de la UPC no genera fila en alumnos');

-- Alta nueva: el trigger reacciona.
insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-0000000000c1',
        'authenticated', 'authenticated', 'nuevo@upc.edu.pe', 'no-login', now(), now());
select is(
  (select count(*)::int from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-0000000000c1'),
  1, 'un alta nueva en auth.users crea el alumno vinculado');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: FAIL en las cuatro. `nombre` es `NOT NULL` y el trigger no existe.

- [ ] **Step 3: Escribir la migración**

```sql
-- Una cadena vacia mentiria sobre el estado del perfil, y la RPC de reserva
-- necesita distinguir "sin completar" de "completado". La tabla esta vacia:
-- el cambio no migra datos.
alter table public.alumnos alter column nombre   drop not null;
alter table public.alumnos alter column apellido drop not null;

create or replace function public.handle_new_auth_user() returns trigger
  language plpgsql security definer set search_path = '' as $$
  begin
    if new.email is not null and lower(new.email) like '%@upc.edu.pe' then
      insert into public.alumnos (auth_user_id, email)
      values (new.id, lower(new.email))
      on conflict (email) do update
        set auth_user_id = excluded.auth_user_id
        where public.alumnos.auth_user_id is null;
    end if;
    return new;
  end $$;

-- El WHERE del ON CONFLICT evita que un alta posterior secuestre una fila ya
-- vinculada a otra cuenta.
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

**Ojo:** el seed inserta los `auth.users` **después** de que exista el trigger, así que las filas de
`alumnos` aparecen solas. Si `00_smoke.sql` empieza a fallar por conteos, es esto.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 1.4: alta automatica de alumno desde auth.users' -m 'Cierra P0-5: anon nunca necesita INSERT en alumnos, asi que la politica no existe.'
```

---

### Task 5: Privilegios y RLS de `alumnos` *(cierra P1-10)*

La tarea que cierra el agujero vivo: hoy un alumno puede ponerse `banned_until = NULL`.

**Files:**
- Create: `supabase/migrations/<ts>_alumno_policies.sql`
- Create: `supabase/tests/14_rls_alumnos.sql`

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(5);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is((select count(*)::int from public.alumnos), 1, 'el alumno A solo se ve a si mismo');

select lives_ok(
  $$update public.alumnos set nombre = 'Ana' where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  'el alumno puede completar su nombre');

-- El caso de P1-10: levantarse la propia sancion.
select throws_ok(
  $$update public.alumnos set banned_until = null where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'el alumno NO puede tocar su propia sancion');

select throws_ok(
  $$update public.alumnos set auth_user_id = 'a0000000-0000-0000-0000-000000000002' where auth_user_id = 'a0000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'el alumno NO puede reasignar su fila a otra cuenta');

select throws_ok(
  $$insert into public.alumnos (email) values ('colado@upc.edu.pe')$$,
  '42501', null,
  'nadie inserta en alumnos por la API');

reset role;
select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`

- [ ] **Step 3: Escribir la migración**

```sql
-- RLS no sabe de columnas: WITH CHECK ve la fila nueva y nunca la vieja, asi que
-- no puede impedir que banned_until cambie. El privilegio por columna si.
grant select on public.alumnos to authenticated;
grant update (nombre, apellido, carrera_id) on public.alumnos to authenticated;
-- Sin INSERT ni DELETE para nadie: las filas las crea el trigger de auth.users.

create policy alumnos_select_own on public.alumnos
  for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- El operador necesita identificar al alumno en el mostrador, pero solo a quien
-- tiene una reserva viva. El admin ve a todos. (D-11)
create policy alumnos_select_staff on public.alumnos
  for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.current_staff_role()) = 'operator'
      and exists (
        select 1 from public.inventory_reservations r
        where r.alumno_id = alumnos.id and r.status in ('reserved', 'active')
      )
    )
  );

create policy alumnos_update_own on public.alumnos
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- activo y banned_until NO se conceden a NADIE, ni siquiera al admin.
--
-- Un GRANT de columna se concede a un rol, no a una politica, y `authenticated`
-- son todos los usuarios con sesion. Concederle banned_until al admin se lo
-- concede tambien al alumno, y su politica alumnos_update_own le bastaria para
-- volver a ponerselo en NULL: P1-10 reabierto por la puerta de atras.
--
-- Quien escribe esas dos columnas es el trigger de sanciones de la tanda 2, que
-- es SECURITY DEFINER y no depende de privilegios de tabla. Levantar una sancion
-- a mano sera una RPC de admin, tambien en la tanda 2.

-- Resto de columnas administrativas del alumno: ninguna por ahora.
```

- [ ] **Step 4: Correr, leer el resultado y decidir**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 5: Ajustar el diseño a lo observado y registrar el resultado en `FASE_1_DISENO.md`**

- [ ] **Step 6: Commit**

```
git add supabase/migrations supabase/tests MIGRATION_DOCS/FASE_1_DISENO.md
git commit -m 'Tanda 1.5: privilegios por columna y RLS de alumnos' -m 'Cierra P1-10: el alumno ya no puede levantarse su propia sancion.'
```

---

### Task 6: Catálogo — lectura abierta, escritura de admin

**Files:**
- Create: `supabase/migrations/<ts>_catalog_policies.sql`
- Create: `supabase/tests/15_rls_catalog.sql`

Alcance: `campuses`, `carreras`, `products`, `product_images`, `inventory_units`, `disabled_days` y la
vista `product_availability`.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(5);

-- Anonimo: lee el catalogo publico, no escribe.
set local role anon;
select is((select count(*)::int from public.products), 4, 'el anonimo lee el catalogo');
select throws_ok($$insert into public.products (name) values ('colado')$$, '42501', null,
  'el anonimo no crea productos');
reset role;

-- Operador: no toca inventario.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;
select throws_ok($$delete from public.inventory_units where unit_code = 'CAM-001'$$, '42501', null,
  'el operador no borra inventario');
reset role;

-- Admin: si.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;
select lives_ok($$update public.products set featured = true where name = 'Tripode Manfrotto MT055'$$,
  'el admin edita productos');
select lives_ok($$insert into public.disabled_days (date, reason) values (date '2026-07-28', 'Fiestas Patrias')$$,
  'el admin inhabilita dias');
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`

- [ ] **Step 3: Escribir la migración**

Se repite el mismo patrón por tabla; se escribe entero, sin abreviar con «ídem»:

```sql
-- Catalogo publico: lo lee cualquiera, lo escribe solo el admin.
grant select on public.campuses, public.carreras, public.products,
                public.product_images, public.product_availability to anon, authenticated;
grant select on public.inventory_units, public.disabled_days to authenticated;

grant insert, update, delete on public.products, public.product_images,
                                public.inventory_units, public.campuses,
                                public.carreras, public.disabled_days to authenticated;

create policy products_select_all on public.products
  for select to anon, authenticated using (true);
create policy products_admin_all on public.products
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy product_images_select_all on public.product_images
  for select to anon, authenticated using (true);
create policy product_images_admin_all on public.product_images
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy campuses_select_all on public.campuses
  for select to anon, authenticated using (true);
create policy campuses_admin_all on public.campuses
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy carreras_select_all on public.carreras
  for select to anon, authenticated using (true);
create policy carreras_admin_all on public.carreras
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy units_select_auth on public.inventory_units
  for select to authenticated using (true);
create policy units_admin_all on public.inventory_units
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

create policy disabled_days_select_auth on public.disabled_days
  for select to authenticated using (true);
create policy disabled_days_admin_all on public.disabled_days
  for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

-- Las politicas de la linea base eran para el rol `public`, que incluye a todos.
-- Se reemplazan por las de arriba, que son TO anon, authenticated.
drop policy if exists products_select_public       on public.products;
drop policy if exists product_images_select_public on public.product_images;
drop policy if exists campuses_select_public       on public.campuses;
drop policy if exists carreras_select_public       on public.carreras;
drop policy if exists inventory_units_select_auth  on public.inventory_units;
drop policy if exists disabled_days_select_auth    on public.disabled_days;
```

> **Cuidado con el orden:** el `drop policy … disabled_days_select_auth` borra la política de la línea
> base, que se llama igual que la nueva. Crear primero y borrar después chocaría por nombre duplicado.
> Los `drop` van **antes** de los `create` de esos dos nombres, o se renombra la nueva.

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 1.6: politicas del catalogo' -m 'Lectura publica, escritura solo de admin. Reemplaza las politicas TO public de la linea base.'
```

---

### Task 7: Trazabilidad y log solo-anexar *(1.3, D-2)*

**Files:**
- Create: `supabase/migrations/<ts>_traceability.sql`
- Create: `supabase/tests/16_traceability.sql`

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(3);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

insert into public.inventory_unit_notes (unit_id, note)
values ('dddddddd-0000-0000-0000-000000000001', 'Rayon en la carcasa');

select is(
  (select created_by from public.inventory_unit_notes where note = 'Rayon en la carcasa'),
  'a0000000-0000-0000-0000-00000000000b'::uuid,
  'created_by se rellena solo con quien escribe');

select throws_ok(
  $$insert into public.inventory_unit_notes (unit_id, note, created_by)
    values ('dddddddd-0000-0000-0000-000000000001', 'falsa', 'a0000000-0000-0000-0000-00000000000a')$$,
  '42501', null,
  'nadie puede falsear created_by');

select throws_ok(
  $$insert into public.reservation_status_log (reservation_id, new_status)
    values ('dddddddd-0000-0000-0000-000000000001', 'active')$$,
  '42501', null,
  'la auditoria no se escribe a mano');

reset role;
select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`

- [ ] **Step 3: Escribir la migración**

```sql
-- Trazabilidad sin trigger: el valor lo pone el DEFAULT, y el cliente no recibe
-- privilegio sobre esa columna, asi que no puede sobrescribirlo.
alter table public.inventory_unit_notes alter column created_by set default auth.uid();
alter table public.disabled_days        alter column created_by set default auth.uid();

grant select on public.inventory_unit_notes to authenticated;
grant insert (unit_id, note) on public.inventory_unit_notes to authenticated;
grant delete on public.inventory_unit_notes to authenticated;
grant insert (date, reason) on public.disabled_days to authenticated;

create policy unit_notes_select_auth on public.inventory_unit_notes
  for select to authenticated using (true);
create policy unit_notes_insert_staff on public.inventory_unit_notes
  for insert to authenticated with check ((select private.is_staff()));
create policy unit_notes_delete_admin on public.inventory_unit_notes
  for delete to authenticated using ((select private.is_admin()));

-- reservation_status_log queda solo-anexar: ni el admin edita la auditoria.
-- Solo lectura por API; la escritura la hace el trigger, que es SECURITY DEFINER.
grant select on public.reservation_status_log to authenticated;

create policy log_select_own on public.reservation_status_log
  for select to authenticated
  using (
    (select private.is_staff())
    or exists (
      select 1 from public.inventory_reservations r
      where r.id = reservation_status_log.reservation_id
        and r.alumno_id = (select private.current_alumno_id())
    )
  );

create or replace function public.log_reservation_status() returns trigger
  language plpgsql security definer set search_path = '' as $$
  begin
    if new.status is distinct from old.status then
      insert into public.reservation_status_log
        (reservation_id, old_status, new_status, reason, changed_by)
      values (new.id, old.status, new.status, new.cancellation_reason, (select auth.uid()));
    end if;
    return null;
  end $$;

create trigger trg_log_reservation_status
  after update of status on public.inventory_reservations
  for each row execute function public.log_reservation_status();

drop policy if exists inventory_unit_notes_select_auth on public.inventory_unit_notes;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 1.7: trazabilidad y auditoria solo-anexar' -m 'created_by por DEFAULT auth.uid() sin privilegio de escritura sobre la columna. El log de estados no lo edita nadie.'
```

---

### Task 8: Lectura de reservas, sin escritura

La escritura llega en la tanda 2, por RPC. Aquí solo se abre la lectura.

**Files:**
- Create: `supabase/migrations/<ts>_reservation_policies.sql`
- Create: `supabase/tests/17_rls_reservations.sql`

- [ ] **Step 1: Escribir la prueba que falla**

```sql
begin;
set local search_path = extensions, public, pg_catalog;
select plan(2);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$insert into public.inventory_reservations (product_id, unit_id, alumno_id, start_at, end_at)
    values ('bbbbbbbb-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
            (select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
            now() + interval '1 day', now() + interval '1 day 2 hours')$$,
  '42501', null,
  'un alumno no inserta reservas directamente: solo por RPC');

select is((select count(*)::int from public.inventory_reservations), 0,
  'el alumno A no ve reservas ajenas');

reset role;
select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`

- [ ] **Step 3: Escribir la migración**

```sql
grant select on public.inventory_reservations to authenticated;
-- Sin INSERT, UPDATE ni DELETE: la unica puerta sera la RPC de la tanda 2.

drop policy if exists reservations_select_own on public.inventory_reservations;

create policy reservations_select_own on public.inventory_reservations
  for select to authenticated
  using (alumno_id = (select private.current_alumno_id()));

create policy reservations_select_staff on public.inventory_reservations
  for select to authenticated
  using ((select private.is_staff()));

-- Encuestas: se rehacen sobre el helper, y con WITH CHECK en el UPDATE.
drop policy if exists surveys_select_own on public.final_satisfaction_surveys;
drop policy if exists surveys_insert_own on public.final_satisfaction_surveys;
drop policy if exists surveys_update_own on public.final_satisfaction_surveys;

grant select, insert, update on public.final_satisfaction_surveys to authenticated;

create policy surveys_select_own on public.final_satisfaction_surveys
  for select to authenticated
  using (alumno_id = (select private.current_alumno_id()));
create policy surveys_insert_own on public.final_satisfaction_surveys
  for insert to authenticated
  with check (alumno_id = (select private.current_alumno_id()));
create policy surveys_update_own on public.final_satisfaction_surveys
  for update to authenticated
  using (alumno_id = (select private.current_alumno_id()))
  with check (alumno_id = (select private.current_alumno_id()));
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 1.8: politicas de lectura de reservas y encuestas' -m 'Sin privilegio de escritura sobre reservas: la unica puerta sera la RPC de la tanda 2. Las encuestas recuperan su WITH CHECK.'
```

---

### Task 9: Cierre y entrega

- [ ] **Step 1: Correr los advisors de seguridad contra el proyecto local y anotar lo que quede abierto**
- [ ] **Step 2: Marcar 1.1, 1.2, 1.3 y 1.3-bis en `ESTADO_Y_PLAN.md`; cerrar P0-5 y P1-10 en la tabla de defectos**
- [ ] **Step 3: Registrar en la bitácora los desvíos y lo aprendido**
- [ ] **Step 4: Commit de documentación**
- [ ] **Step 5: Entregar los comandos de `push` y `gh pr create`**
- [ ] **Step 6: Verificar el CI con `gh run list`, y el log de pgTAP con `gh run view --log`**

---

## Autorrevisión

**Cobertura del diseño.** §5.1 helpers → Task 2. §5.2 `staff_members` → Tasks 2 y 3. §5.3 alta de alumno
→ Task 4. §5.4 políticas → Tasks 5, 6 y 8. §5.5 trazabilidad → Task 7. §2 privilegios por columna →
Tasks 1 y 5. **Sin huecos.**

**Sin marcadores.** Cada migración y cada prueba van completas. Las políticas del catálogo están escritas
tabla por tabla en vez de abreviadas.

**Consistencia.** Los UUID de la Task 3 son los que usan las Tasks 4 a 8. Las cuatro firmas de helpers de
la Task 2 se invocan con los mismos nombres después. `private.current_alumno_id()` se usa en las Tasks 7
y 8; `private.is_staff()` en 7 y 8; `private.is_admin()` en 3, 5, 6 y 7.

**Fallo del diseño corregido antes de escribir SQL.** El diseño original concedía
`UPDATE (activo, banned_until)` a `authenticated` para que el admin pudiera sancionar. No sirve: un
privilegio de columna se concede a un **rol**, y `authenticated` incluye a los alumnos. La política
`alumnos_update_own` le habría bastado a cualquiera para ponerse `banned_until = NULL` — P1-10 reabierto.
Esas dos columnas quedan sin privilegio para nadie; las escribe el trigger `SECURITY DEFINER` de la
tanda 2. Hay que **actualizar `FASE_1_DISENO.md` §5.4** con esto.

**Un punto que decide la ejecución.** **Task 6** — dos políticas de la línea base se llaman igual que dos
nuevas (`disabled_days_select_auth`, `inventory_units_select_auth`). Los `drop` van antes de los `create`
correspondientes, o hay choque de nombres.

**Deuda que se traslada a la tanda 2.** Una RPC de admin para levantar sanciones a mano. Sin ella, una
sanción solo caduca por tiempo.

**Riesgo conocido.** Entre la Task 1 y la Task 6 la API no sirve ninguna fila. Es lo esperado y no hay
consumidor: la app Vite ya no funciona contra esta base.
