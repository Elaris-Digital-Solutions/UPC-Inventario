# Fase 1 — Diseño del esquema

> Documento de diseño, aprobado el **2026-08-05**. Describe *cómo* se construye la base de datos de la
> Fase 1. El estado y el avance viven en [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md); las reglas de negocio,
> en [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md).
>
> Se implementa en cuatro entregas, una por tanda, cada una con su PR y sus pruebas.

---

## 1. Qué resuelve

| Defecto | Cómo se cierra |
|---|---|
| **P0-2** · autorización de admin solo en React | Rol en `staff_members`, verificado por RLS. Ninguna decisión de permiso en el cliente |
| **P0-5** · `INSERT` anónimo en `alumnos` | `anon` deja de tener `INSERT`. La fila la crea un trigger sobre `auth.users` |
| **P1-6** · doble reserva | `EXCLUDE USING gist` sobre `(unit_id, blocked_range)` |
| **P1-7** · filtro de conflictos invertido | Máquina de estados: `active` bloquea en todas partes |
| **P1-9** · reglas de negocio en el cliente | Una RPC `SECURITY DEFINER` es la única puerta de escritura |
| **P1-10** · políticas `public` y `UPDATE` sin `WITH CHECK` | Todo `TO authenticated`, todo `UPDATE` con las dos cláusulas, y privilegios por columna |
| **C-2 / C-3** · tres modelos de sanción | Uno solo: `alumnos.banned_until`, poblado por un único trigger |
| **C-7** · días inhabilitados sin validar | Los valida la RPC, no el calendario |
| **M-8** · `SKIP LOCKED` que aborta | La RPC recorre las unidades en vez de rendirse en la primera |

### Corrección al plan (2026-08-05)

**La tarea 1.10 es más chica de lo que dice el plan.** `products.stock`, `products.in_stock` e
`inventory_units.current_note` **no existen en el esquema canónico** — eran columnas del proyecto
deprecado `jgqebhvbovtpsjoujgdw`. La vista `product_availability` ya deriva el stock. 1.10 se reduce a
darle `security_invoker` y añadirle disponibilidad por franja; no hay columnas que eliminar.

### Corrección al diagnóstico de P0-2 (2026-08-05)

La auditoría lo describe como «~40 escrituras privilegiadas salen del navegador con la clave anónima».
Verificado contra la línea base: las once tablas tienen RLS activo y **solo políticas de `SELECT`**. Un
`INSERT` o `UPDATE` de admin desde el navegador se deniega por falta de política. Es decir, **el panel de
administración no funciona contra el proyecto canónico**; no hay una vía de escritura abierta.

El riesgo real no es lo que hoy entra, sino lo que entraría si las políticas de escritura de 1.2 se
escribieran permisivas. Eso no rebaja la prioridad: la sube, porque la Fase 1 es exactamente el momento
en que se abre esa superficie.

### Lo que sí está abierto hoy

`alumnos_update_own` (línea 501 de la línea base) es `FOR UPDATE USING (auth_user_id = auth.uid())`
**sin `WITH CHECK`**, y `authenticated` tiene `GRANT ALL` sobre la tabla. Un alumno autenticado puede
actualizar su propia fila y ponerse `banned_until = NULL`: **levantarse su propia sanción**. También puede
reescribir `email`, `activo` y `auth_user_id`. Mismo defecto en `surveys_update_own`.

Catalogado como P1-10 «alto», pero en la práctica anula el modelo de penalizaciones completo. Se cierra en
la tanda 1.

---

## 2. Principio rector: dos capas

La línea base otorga `GRANT ALL ON TABLE … TO anon` y `TO authenticated` en las once tablas
(líneas 767-835). El único freno es RLS. El diseño invierte el orden: **primero los privilegios de
Postgres, después RLS.**

**Por qué hacen falta las dos.** RLS no sabe de columnas. No hay forma de escribir una política que
diga «puedes actualizar tu fila, pero no la columna `banned_until`»: `WITH CHECK` ve la fila nueva y
nunca la vieja, así que no puede detectar que un valor cambió.

Lo que sí existe es el privilegio por columna:

```sql
revoke all on public.alumnos from anon, authenticated;
grant select on public.alumnos to authenticated;
grant update (nombre, apellido, carrera_id) on public.alumnos to authenticated;
```

Con eso el auto-desbloqueo deja de ser posible a nivel de motor: la sentencia ni siquiera se planifica.

> **Regla:** RLS decide **qué filas**. El `GRANT` decide **qué columnas**.

El mismo mecanismo da la trazabilidad de D-2 sin escribir un solo trigger: `created_by` recibe
`DEFAULT auth.uid()` y **no se otorga `INSERT` sobre esa columna**. El cliente no puede falsearla y el
valor se rellena solo.

```sql
alter table public.inventory_unit_notes alter column created_by set default auth.uid();
grant insert (unit_id, note) on public.inventory_unit_notes to authenticated;
```

---

## 3. Decisiones nuevas

| ID | Decisión | Fecha |
|---|---|---|
| D-9 | **Autenticación primero, perfil después.** Desaparece el registro previo. Un trigger sobre `auth.users` crea la fila en `alumnos` ya vinculada cuando el correo termina en `@upc.edu.pe`; el alumno completa nombre, apellido y carrera en su primer ingreso. Cierra P0-5 por ausencia de política, no por validación. Deja sin efecto BR-02: el dominio pasa a ser la única puerta | 2026-08-05 |
| D-10 | **Buffer por producto** (`products.buffer_minutes`, por defecto 120), en espejo de D-1. El buffer es tiempo de retorno —revisar, cargar batería, limpiar— y eso varía por equipo. *Resuelve Q-1* | 2026-08-05 |
| D-11 | **El operador es estrictamente operativo.** Lee las reservas que va a entregar o recibir, con nombre y correo del alumno porque lo necesita en el mostrador, y escribe anotaciones de unidad. Sin estadísticas, sin inventario, sin acceso a alumnos fuera de sus reservas vigentes. *Resuelve Q-3* | 2026-08-05 |
| D-12 | **Un único modelo de sanción:** `alumnos.banned_until`, poblado por un solo trigger. Se descartan las tres variantes de `inventory_blacklist`. El disparador de la sanción de 15 días son **2 `not_picked_up` acumuladas en los últimos 90 días**, no dos de por vida: si no, un alumno queda a un fallo del bloqueo para siempre. `not_returned` sigue siendo bloqueo permanente (`banned_until = 'infinity'`). *Resuelve C-2 y C-3* | 2026-08-05 |
| D-13 | **Privilegios por columna además de RLS.** Se revocan los `GRANT ALL` de la línea base y se otorga por operación y por columna. Ver sección 2 | 2026-08-05 |
| D-14 | **Las pruebas se escriben en pgTAP**, no en Vitest. Un arnés en JavaScript se apoya en el toolchain de Vite, que la Fase 2 borra; las pruebas en SQL sobreviven a la migración y viven junto a las migraciones que verifican. Además RLS se prueba mejor dentro del motor que a través de HTTP | 2026-08-05 |
| D-15 | **Los 23 `.sql` sueltos se borran en la tanda 3.** Se conservan durante las tandas 1 y 2 como referencia mientras se reescribe esa misma lógica. *Resuelve Q-9* | 2026-08-05 |

---

## 4. Tanda 0 · Entorno local *(cierra Q-8)* — ✅ **CERRADA el 2026-08-05**

Sin esto no hay dónde correr las pruebas. No toca el esquema remoto.

**Lo que quedó, y dos desvíos respecto de lo planeado:**

- `analytics` y `storage` se apagan en `config.toml`, **no** con `supabase start -x`. No responden a ese
  flag; el arranque fallaba con `LegacyHealthCheckTimeoutError` hasta descubrirlo. Storage además no lo
  usa este proyecto: las imágenes van a Cloudinary.
- La lista de servicios excluibles de la CLI 2.111.0 **no incluye `pgbouncer`**, que este documento daba
  por válido. Un nombre inexistente hace fallar `supabase start` entero.
- **`supabase db reset` exige el stack completo**, porque al terminar reinicia los contenedores. Con
  servicios excluidos muere en `failed to bootstrap the local database`. Por eso el CI no lo usa: en un
  runner limpio, `supabase start` ya crea la base, aplica las migraciones y carga el seed.

**Cómo se trabaja en local, entonces:**

| Para | Comando |
|---|---|
| Desarrollar, o rehacer la base tras cambiar una migración | `npx supabase start` y luego `npx supabase db reset` |
| Solo correr las pruebas | `npx supabase test db` |

- `supabase init` → `supabase/config.toml` versionado.
- Extensiones: `btree_gist` (la exige el `EXCLUDE` de la tanda 2) y `pgtap` (las pruebas).
- `supabase/seed.sql` determinista: 2 sedes, 5 carreras, 4 productos con distinto `max_duration_hours` y
  `buffer_minutes`, 8 unidades repartidas entre sedes, 3 alumnos y 2 miembros de personal (un admin y un
  operador). UUID fijos, escritos a mano, para que las aserciones sean estables.
- Un `.github/workflows` que corra `supabase db reset` y `supabase test db` en los PR hacia `develop`.

### Resuelto: `GRANT EXECUTE` en los helpers de política *(medido el 2026-08-05)*

La pregunta era si a un helper `SECURITY DEFINER` se le puede revocar `EXECUTE` a `authenticated` y aun
así seguir usándolo dentro de una política RLS. **La respuesta es no.** Evidencia reproducible en
`supabase/tests/01_grants_definer.sql`:

| Caso | Resultado observado |
|---|---|
| `EXECUTE` concedido a `authenticated` | La política evalúa el helper y devuelve la fila |
| `EXECUTE` revocado a `authenticated` **y a `PUBLIC`** | `ERROR: permission denied for function allowed` (SQLSTATE `42501`) |

**La expresión de una política se evalúa como el usuario que consulta, no como el dueño de la tabla.**
Quitarle el permiso al helper no lo blinda: rompe la política entera, y la consulta se deniega antes
siquiera de filtrar filas.

**Regla para la tanda 1:** a los helpers de `private` se les **concede** `EXECUTE` a `authenticated`. Lo
que los mantiene fuera del alcance de un cliente HTTP no es el permiso, sino el esquema: PostgREST solo
expone lo que liste `config.toml` → `api.schemas`, hoy `["public", "graphql_public"]`.

> Detalle que se lleva por delante el experimento ingenuo: al crear una función, `PUBLIC` recibe
> `EXECUTE` por defecto. Revocárselo solo a `authenticated` no cambia nada. Hay que revocar a los dos —
> razón de más para no hacerlo.

---

## 5. Tanda 1 · Identidad y autorización *(1.1, 1.2, 1.3)* — ✅ **CERRADA el 2026-08-05**

8 migraciones, 62 aserciones pgTAP. Cierra **P0-2**, **P0-5** y **P1-10**. Tres correcciones al diseño,
al final de la sección.

### 5.1 Esquema `private` y helpers

```sql
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- EXECUTE se concede, no se revoca: sin el, la politica no se puede evaluar.
-- Medido en supabase/tests/01_grants_definer.sql, ver seccion 4.
-- (repetir por cada helper, tras crearlo)

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
```

Siempre invocados como `(select private.is_admin())`, para que el planificador los evalúe **una vez por
sentencia** en lugar de una vez por fila.

`SECURITY DEFINER` no está solo por rendimiento: **es lo que evita la recursión**. La política de
`staff_members` necesita saber si quien consulta es admin, y saberlo exige leer `staff_members`. Al
saltarse RLS, el helper corta el ciclo.

### 5.2 `staff_members` *(1.1)*

```sql
create type public.staff_role as enum ('admin', 'operator');

create table public.staff_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       public.staff_role not null,
  activo     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;

revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;
grant insert, update, delete on public.staff_members to authenticated;

create policy staff_select_self on public.staff_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy staff_admin_all on public.staff_members for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
```

> El `grant insert, update, delete … to authenticated` parece demasiado abierto leído solo. No lo es: el
> `GRANT` es condición **necesaria** pero no suficiente. Sin él la sentencia no se planifica; con él, RLS
> sigue exigiendo `private.is_admin()`. Postgres pide las dos cosas, y hace falta conceder el privilegio
> al rol para que la política tenga a quién aplicarse.

**El primer admin es un cabo suelto deliberado.** No hay admin que lo inserte y RLS bloquea el intento.
Se resuelve con una sentencia puntual vía `service_role`, una vez que Alejandro haya entrado por primera
vez con su cuenta UPC. Queda en el runbook, **no en una migración**: una migración que codifique un
correo concreto es un dato de entorno disfrazado de esquema.

### 5.3 Alta del alumno *(D-9)*

`alumnos.nombre` y `apellido` pasan a admitir `NULL` — la tabla está vacía, el cambio es gratis. Una
cadena vacía sería mentir sobre el estado del perfil, y la RPC de reserva necesita distinguir «sin
completar» de «completado».

```sql
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

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();
```

El `where … is null` del `on conflict` evita que un alta posterior secuestre una fila ya vinculada.

Un correo que no sea `@upc.edu.pe` puede autenticarse pero no tendrá fila en `alumnos`, y todas las
políticas cuelgan de ahí: queda sin acceso a nada.

### 5.4 Políticas *(1.2)*

Todas `TO authenticated` —o `TO anon, authenticated` en el catálogo público— y todo `UPDATE` con `USING`
y `WITH CHECK`.

```sql
-- Lectura del propio perfil, y del personal sobre quienes tienen reserva vigente (D-11)
create policy alumnos_select_own on public.alumnos for select to authenticated
  using (auth_user_id = (select auth.uid()));

-- private.tiene_reserva_viva() existe para romper una recursion, no por comodidad.
-- Ver la corrección C-2 al final de esta sección.
create policy alumnos_select_staff on public.alumnos for select to authenticated
  using (
    (select private.is_admin())
    or (
      (select private.current_staff_role()) = 'operator'
      and private.tiene_reserva_viva(alumnos.id)
    )
  );

-- El UPDATE del alumno ya está acotado por GRANT a tres columnas (sección 2)
create policy alumnos_update_own on public.alumnos for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));
```

`inventory_reservations` **no recibe política de `INSERT` para nadie**. La única puerta es la RPC de la
tanda 2. Lo mismo con el cambio de estado: pasa por RPC, no por `UPDATE` directo.

#### Correcciones descubiertas al implementar *(2026-08-05)*

**C-1 · La sanción no puede vivir en un `GRANT`.** El diseño concedía
`UPDATE (activo, banned_until)` a `authenticated` para que el admin sancionara. **No sirve.** Un
privilegio de columna se concede a un **rol**, y `authenticated` son todos los usuarios con sesión: dárselo
al admin se lo da también al alumno, a quien la política `alumnos_update_own` ya le permite escribir en su
propia fila. P1-10 reabierto por la puerta de atrás.

Esas dos columnas **no se conceden a nadie**. Las escribe el trigger de sanciones de la tanda 2, que es
`SECURITY DEFINER` y no depende de privilegios de tabla. **Deuda que hereda la tanda 2:** una RPC de admin
para levantar una sanción a mano; sin ella, una sanción solo caduca por tiempo.

**C-2 · Una política que lee otra tabla protegida hereda sus políticas.** La versión original de
`alumnos_select_staff` consultaba `inventory_reservations` con un `exists`. Esa tabla tenía en la línea
base una política que consultaba `alumnos`, y el resultado fue
`infinite recursion detected in policy for relation "alumnos"`.

Se resuelve con `private.tiene_reserva_viva(uuid)`, `SECURITY DEFINER`, que salta RLS y corta el ciclo —
la misma razón por la que los helpers de rol lo son. **Regla:** si dos tablas se consultan mutuamente
desde sus políticas, la consulta va en un helper.

**C-3 · Falta de privilegio y falta de política fallan distinto.** Sin privilegio, Postgres lanza
`42501`. Sin política, RLS no encuentra filas y el `UPDATE` o `DELETE` afecta a **cero filas, sin error**.
Las dos son seguras, pero una prueba escrita con `throws_ok` donde correspondía comprobar el efecto da un
falso negativo. En la batería, los intentos del operador se verifican leyendo el valor después, no
esperando la excepción.

### 5.5 Trazabilidad *(1.3)*

`inventory_unit_notes.created_by` y `disabled_days.created_by` se resuelven con `DEFAULT auth.uid()` más
`GRANT` acotado, como en la sección 2. Sin trigger.

`reservation_status_log` sí necesita trigger, porque la escritura la dispara un cambio en otra tabla:

```sql
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
```

`SECURITY DEFINER` es imprescindible: la tabla no tendrá política de `INSERT` para nadie. Queda
**solo-anexar** — ni el admin puede editar ni borrar una línea de la auditoría.

---

## 6. Tanda 2 · Reglas de reserva *(1.4 a 1.8)*

### 6.1 Configuración *(1.4)*

```sql
alter table public.products
  add column max_duration_hours smallint not null default 4
    check (max_duration_hours between 1 and 8),          -- D-1
  add column buffer_minutes smallint not null default 120
    check (buffer_minutes between 0 and 480);            -- D-10

create table public.app_settings (
  id                      boolean primary key default true,
  booking_window_days     smallint not null default 7 check (booking_window_days between 1 and 60),
  opening_time            time not null default '08:00',
  closing_time            time not null default '22:00',
  slot_minutes            smallint not null default 30,
  min_duration_minutes    smallint not null default 15,
  daily_limit_per_product smallint not null default 1,
  updated_at              timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);
```

El truco de la fila única: la clave primaria es un booleano con `check (id)`, así que solo el valor
`true` es válido y solo puede existir una fila.

### 6.2 Anti-doble-reserva *(1.6, corrige P1-6)*

**El `EXCLUDE` no puede calcular el buffer sobre la marcha.** `timestamptz - interval` está marcada
`STABLE` en Postgres, no `IMMUTABLE`, porque el resultado depende del huso horario en vigor. Las
expresiones de índice exigen `IMMUTABLE`. Por eso no compilan ni
`exclude using gist (…, tstzrange(start_at - '2h', end_at + '2h'))` ni una columna generada equivalente.

La salida es una columna real poblada por trigger: el trigger sí puede usar funciones `STABLE`, y de paso
puede leer el buffer del producto.

```sql
alter table public.inventory_reservations add column blocked_range tstzrange;

create or replace function public.set_blocked_range() returns trigger
  language plpgsql set search_path = '' as $$
  declare v_buffer smallint;
  begin
    select p.buffer_minutes into v_buffer from public.products p where p.id = new.product_id;
    new.blocked_range := tstzrange(
      new.start_at,
      new.end_at + make_interval(mins => coalesce(v_buffer, 120)),
      '[)'
    );
    return new;
  end $$;

create trigger trg_set_blocked_range
  before insert or update of start_at, end_at, product_id on public.inventory_reservations
  for each row execute function public.set_blocked_range();

alter table public.inventory_reservations alter column blocked_range set not null;

create extension if not exists btree_gist with schema extensions;

alter table public.inventory_reservations
  add constraint inventory_reservations_no_overlap
  exclude using gist (unit_id with =, blocked_range with &&)
  where (status in ('reserved', 'active'));
```

**Por qué el buffer se suma solo al final y no a los dos lados.** Con A = `[10:00, 12:00)` y buffer de
2 h, si se expandieran ambas reservas 2 h a cada lado, una B que empezara a las 14:00 —exactamente el
buffer después— se rechazaría: `[08:00, 14:00)` y `[12:00, 18:00)` se solapan. Sumando el buffer completo
solo al final, `[10:00, 14:00)` contra `[14:00, 18:00)` no se solapan y B pasa; una B a las 13:00 sí se
rechaza. Da una separación mínima **exacta** de 2 h en ambos sentidos.

**El `EXCLUDE` tiene que ser parcial.** Sin `where (status in ('reserved','active'))`, una reserva
cancelada seguiría bloqueando su franja para siempre.

**`blocked_range` es `NOT NULL` a propósito:** un rango nulo nunca entra en conflicto, así que sin esa
restricción el constraint se podría esquivar.

**Nota operativa:** cambiar `products.buffer_minutes` no reescribe los `blocked_range` ya guardados.
Afecta solo a las reservas nuevas. Si hiciera falta, se rehacen con un `UPDATE` que dispare el trigger.

### 6.3 Máquina de estados *(1.7, corrige P1-7)*

| Desde | Hacia |
|---|---|
| `reserved` | `active` · `cancelled` · `not_picked_up` |
| `active` | `completed` · `not_returned` |
| `cancelled` `completed` `not_picked_up` `not_returned` | — terminales |

```sql
create or replace function public.enforce_reservation_transition() returns trigger
  language plpgsql set search_path = '' as $$
  begin
    if new.status = old.status then return new; end if;
    if not (
      (old.status = 'reserved' and new.status in ('active', 'cancelled', 'not_picked_up'))
      or (old.status = 'active' and new.status in ('completed', 'not_returned'))
    ) then
      raise exception 'Transición no permitida: % → %', old.status, new.status
        using errcode = 'check_violation';
    end if;
    return new;
  end $$;
```

Esto corrige P1-7 de raíz: `active` pasa a ser un estado que bloquea en todas partes, y el admin deja de
poder saltar de cualquier estado a cualquier otro.

### 6.4 RPC de reserva *(1.5)*

Firma única. Resuelve C-4 quedándose con la variante por sede, que es la que trae rotación justa, límite
diario y sanciones.

```sql
create or replace function public.create_reservation(
  p_product_id      uuid,
  p_campus_id       uuid,
  p_start_at        timestamptz,
  p_duration_minutes int,
  p_purpose         text
) returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_alumno     public.alumnos;
  v_settings   public.app_settings;
  v_product    public.products;
  v_end_at     timestamptz;
  v_local_date date;
  v_unit_id    uuid;
  v_id         uuid;
begin
  -- 1 · identidad y perfil completo
  select * into v_alumno from public.alumnos
    where auth_user_id = (select auth.uid()) and activo;
  if not found then
    raise exception 'No hay un alumno activo para esta sesión' using errcode = '42501';
  end if;
  if v_alumno.nombre is null or v_alumno.apellido is null or v_alumno.carrera_id is null then
    raise exception 'Completa tu perfil antes de reservar' using errcode = 'check_violation';
  end if;

  -- 2 · sanción vigente
  if v_alumno.banned_until is not null and v_alumno.banned_until > now() then
    raise exception 'Tienes una sanción vigente hasta %', v_alumno.banned_until
      using errcode = 'check_violation';
  end if;

  select * into v_settings from public.app_settings;
  if not found then raise exception 'Falta la fila de configuración en app_settings'; end if;
  select * into v_product  from public.products where id = p_product_id;
  if not found then raise exception 'Producto inexistente'; end if;

  -- 3 · duración, contra el producto y no contra una constante (D-1)
  if p_duration_minutes < v_settings.min_duration_minutes
     or p_duration_minutes > v_product.max_duration_hours * 60 then
    raise exception 'Duración fuera del rango permitido para este producto';
  end if;
  v_end_at := p_start_at + make_interval(mins => p_duration_minutes);

  -- 4 · ventana móvil (D-3)
  if p_start_at < now() then
    raise exception 'No se puede reservar en el pasado';
  end if;
  if p_start_at > now() + make_interval(days => v_settings.booking_window_days) then
    raise exception 'Fuera de la ventana de reserva';
  end if;

  -- 5 · día inhabilitado y horario, siempre en America/Lima (C-7, M-7)
  v_local_date := (p_start_at at time zone 'America/Lima')::date;
  if exists (select 1 from public.disabled_days d where d.date = v_local_date) then
    raise exception 'Ese día no hay atención';
  end if;
  if (p_start_at at time zone 'America/Lima')::time < v_settings.opening_time
     or (v_end_at at time zone 'America/Lima')::time > v_settings.closing_time
     or (v_end_at at time zone 'America/Lima')::date <> v_local_date then
    raise exception 'Fuera del horario de atención';
  end if;

  -- 6 · límite diario por producto (BR-09)
  if (select count(*) from public.inventory_reservations r
        where r.alumno_id = v_alumno.id
          and r.product_id = p_product_id
          and r.status in ('reserved', 'active')
          and (r.start_at at time zone 'America/Lima')::date = v_local_date)
     >= v_settings.daily_limit_per_product then
    raise exception 'Ya tienes una reserva de este producto para ese día';
  end if;

  -- 7 · rotación justa, recorriendo unidades en vez de rendirse en la primera (M-8, BR-12)
  for v_unit_id in
    select u.id
      from public.inventory_units u
      left join public.inventory_reservations r
        on r.unit_id = u.id and r.status in ('reserved', 'active', 'completed')
     where u.product_id = p_product_id
       and u.campus_id  = p_campus_id
       and u.status     = 'active'
     group by u.id, u.unit_code
     order by count(r.id) asc, u.unit_code asc
  loop
    begin
      perform 1 from public.inventory_units where id = v_unit_id for update skip locked;
      if not found then continue; end if;

      insert into public.inventory_reservations
        (product_id, unit_id, alumno_id, purpose, start_at, end_at)
      values (p_product_id, v_unit_id, v_alumno.id, p_purpose, p_start_at, v_end_at)
      returning id into v_id;
      return v_id;
    exception
      when exclusion_violation then continue;
    end;
  end loop;

  raise exception 'No hay unidades disponibles en esa franja';
end $$;

revoke execute on function public.create_reservation(uuid, uuid, timestamptz, int, text)
  from public, anon;
grant execute on function public.create_reservation(uuid, uuid, timestamptz, int, text)
  to authenticated;
```

El `EXCLUDE` queda como última red: si dos alumnos piden la misma unidad y franja a la vez, uno de los
dos recibe `exclusion_violation` y el bucle le busca otra unidad.

**Cancelar también es una RPC**, `cancel_reservation(p_id, p_reason)`, no un `UPDATE` directo. Así la
razón obligatoria de BR-17 se cumple en el motor y no en un diálogo del navegador.

### 6.5 Sanciones *(1.8, D-12)*

```sql
create or replace function public.apply_penalties() returns trigger
  language plpgsql security definer set search_path = '' as $$
  declare v_count int;
  begin
    if new.status = 'not_returned' then
      update public.alumnos set banned_until = 'infinity' where id = new.alumno_id;

    elsif new.status = 'not_picked_up' then
      select count(*) into v_count from public.inventory_reservations r
        where r.alumno_id = new.alumno_id
          and r.status = 'not_picked_up'
          and r.updated_at > now() - interval '90 days';
      if v_count >= 2 then
        update public.alumnos
           set banned_until = greatest(coalesce(banned_until, now()), now() + interval '15 days')
         where id = new.alumno_id;
      end if;
    end if;
    return null;
  end $$;
```

Un solo trigger, un solo modelo. `greatest(…)` evita que una sanción nueva acorte una que ya estaba
corriendo.

---

## 7. Tanda 3 · Derivados, linter y limpieza *(1.9, 1.10, Q-9)*

- `product_availability` recreada con `with (security_invoker = on)`: la vista pasa a respetar el RLS de
  quien consulta en lugar de saltárselo. Cierra el 🔴 ERROR del linter.
- `fn_update_updated_at` recreada con `set search_path = ''`. Cierra el 🟡 WARN.
- Políticas de lectura para `reservation_status_log` —admin, y el alumno sobre sus propias reservas— sin
  ningún `GRANT` de escritura. Cierra el 🔵 INFO **manteniendo la tabla solo-anexar**.
- La vista gana disponibilidad por franja, apoyada en `blocked_range` (1.10, ver corrección en §1).
- Se borran los 23 `.sql` sueltos de `supabase/` (D-15). El historial de git es el archivo.

---

## 8. Pruebas *(1.11)*

pgTAP en `supabase/tests/`, corriendo con `supabase test db` sobre el seed determinista. Por orden de
prioridad, según §7.1 del plan:

| Archivo | Qué verifica |
|---|---|
| `rls_alumnos.sql` | El alumno A no lee ni escribe la fila de B. **El alumno no puede modificar su propio `banned_until`** (el caso de P1-10). Un correo sin fila en `alumnos` no ve nada |
| `rls_staff.sql` | El operador no lee `alumnos` sin reserva vigente, no toca inventario ni personal. El admin sí. Un `authenticated` sin fila en `staff_members` no es ninguno de los dos |
| `rls_log.sql` | Nadie puede insertar, editar ni borrar en `reservation_status_log`; el trigger sí escribe |
| `constraint_overlap.sql` | Solape directo rechazado. Reserva a exactamente `buffer` de distancia **aceptada**. A `buffer - 1 min` rechazada. Una reserva cancelada **no** bloquea su franja |
| `rpc_reservation.sql` | Cada una de las siete validaciones falla por separado. Rotación justa: la unidad menos usada primero. Perfil incompleto rechazado. Día inhabilitado rechazado |
| `state_machine.sql` | Cada transición válida pasa; `completed → active` y `cancelled → active` fallan |
| `penalties.sql` | 1 `not_picked_up` no sanciona; 2 en 90 días sí; 2 separadas por más de 90 días no. `not_returned` deja `banned_until = 'infinity'` |

---

## 9. Riesgos

| Riesgo | Mitigación |
|---|---|
| ~~El `REVOKE EXECUTE` sobre helpers rompe las políticas en vez de endurecerlas~~ | ✅ **Confirmado el 2026-08-05.** Sí las rompe. Se concede `EXECUTE`; ver §4 y `supabase/tests/01_grants_definer.sql` |
| Revocar los `GRANT ALL` deja sin acceso a algo no previsto | La app Vite ya no funciona contra esta base; no hay consumidor que romper. Next.js será el primero, construido contra el esquema nuevo |
| El bucle de la RPC abre una subtransacción por unidad | A 92 unidades y pocas por producto, el coste es despreciable. Si creciera, se sustituye por un pre-filtro con `&&` sobre `blocked_range` |
| `supabase db push` contra un proyecto hibernado falla | Reintentar; la primera llamada lo despierta |
| El primer admin queda fuera si nadie ejecuta la sentencia de arranque | Va en el runbook del Anexo A, como paso explícito de la tanda 1 |
