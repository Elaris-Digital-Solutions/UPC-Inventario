# Tanda 3 — Derivados, linter y limpieza · Plan de implementación

> Escrito **antes** de ejecutar. La cabecera de correcciones se añade arriba al cerrar la tanda, sin
> reescribir lo de abajo *(ver [`README.md`](./README.md))*.

**Goal:** cerrar la Fase 1. Apagar los avisos del linter, dar disponibilidad por franja a quien pinta el
calendario, tapar los tres huecos que quedan en la batería, y borrar los 23 `.sql` sueltos. Al final,
empujar al remoto *(D-17)*.

**Architecture:** es la tanda que no añade reglas, sino que quita deuda. Dos migraciones pequeñas, una
función de lectura, tres aserciones que faltaban y un `git rm`. Lo único con diseño propio es la
disponibilidad por franja, y su detalle importante es que tiene que ser `SECURITY DEFINER`: un alumno no
ve las reservas ajenas, así que contando con sus propios ojos vería libre todo lo ocupado.

**Tech Stack:** PostgreSQL 17 · pgTAP · Supabase CLI 2.111.0

## Global Constraints

- Toda función nueva: `set search_path = ''` y referencias cualificadas. Verificado el 2026-08-05 sobre
  las 15 funciones existentes: la única sin él es `fn_update_updated_at`, y la cierra la Task 1.
- Las columnas `activo` y `banned_until` de `alumnos` siguen sin `GRANT` para nadie.
- Ninguna escritura nueva sobre `inventory_reservations`: esta tanda solo lee.
- Toda tabla nueva —no se prevé ninguna— con RLS y política. `18_rls_coverage.sql` lo vigila.
- Migraciones versionadas con `npx supabase migration new`. Nada de SQL suelto.
- Local: `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo.**
- Mensajes de commit sin acentos. Claude no toca el remoto: el `db push` y el PR los ejecuta Alejandro.

## Correcciones al diseño, antes de empezar

Tres cosas de `FASE_1_DISENO.md` §7 y §8 que ya no son ciertas. Se anotan aquí para no descubrirlas a
mitad de la ejecución.

1. **El 🔵 INFO del linter ya está cerrado.** §7 pide «políticas de lectura para `reservation_status_log`».
   La tanda 1 ya las creó: `log_select_own`, en `20260805195549_traceability.sql`, con lectura para el
   personal y para el alumno sobre sus propias reservas, y sin ningún `GRANT` de escritura. La tarea 1.9
   se reduce a **dos** arreglos, no tres.
2. **La batería de §8 está casi entera hecha.** De los siete archivos que lista, seis existen ya con otro
   nombre: `rls_alumnos`→`14`, `rls_staff`→`12`, `rls_log`→`16`, `constraint_overlap`→`21`,
   `rpc_reservation`→`23`, `state_machine`→`22`, `penalties`→`25`. La tarea 1.11 **no es escribir una
   batería**: es tapar los tres huecos concretos que quedan, que están en la Task 3.
3. **La disponibilidad por franja no cabe en la vista.** §7 dice «la vista gana disponibilidad por
   franja». Una vista no puede: la disponibilidad depende de la franja que se pregunte, y una vista no
   recibe parámetros. Es una **función**. `product_availability` se queda como está —stock por sede— y la
   franja la responde `available_units(...)`.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `…_linter_fixes.sql` | `security_invoker` en la vista y `search_path` en `fn_update_updated_at` |
| `…_available_units.sql` | La función de disponibilidad por franja |
| `supabase/tests/26_linter.sql` | Que los dos avisos estén realmente apagados, y con qué efecto |
| `supabase/tests/27_available_units.sql` | Que la disponibilidad coincida con lo que el `EXCLUDE` permitiría |
| `supabase/tests/19_function_hardening.sql` | Cobertura: ninguna función sin `search_path` fijo |
| `supabase/tests/16, 21, 25` | Se amplían con las tres aserciones que faltaban |
| `supabase/*.sql` | Se borran los 22 sueltos. `seed.sql` se queda |

## Puntos a verificar

1. **Qué ve el visitante anónimo del catálogo.** Es el punto que decide la Task 1 y no es técnico, es de
   producto. Hoy `product_availability` no tiene `security_invoker`, así que **se salta el RLS de quien
   consulta**: un anónimo ve el conteo de unidades. Con `security_invoker = on`, el anónimo deja de ver
   `inventory_units` —la tanda 1 decidió que el inventario físico no es público— y la vista le devolvería
   una fila por producto con `active_units = 0` e `in_stock = false`. **Mostrar «sin stock» es peor que no
   mostrar nada.**
   → **Este plan revoca `select on product_availability from anon`**, consistente con la decisión de la
   tanda 1: la disponibilidad se ve con sesión. La landing pública muestra el catálogo sin stock.
   → Si se prefiere que el anónimo vea disponibilidad, el arreglo **no** es dejar la vista sin
   `security_invoker`: es conceder a `anon` una política de lectura sobre `inventory_units` y un `GRANT`
   acotado a `(id, product_id, campus_id, status)`, que deja ver cuántas hay sin enseñar `asset_code` ni
   `unit_code`. Se registra como decisión (D-18) sea cual sea la respuesta.
2. **`available_units` tiene que ser `SECURITY DEFINER`, y eso hay que comprobarlo, no suponerlo.** Un
   alumno solo ve sus propias reservas. Si la función se evaluara con sus privilegios, el `not exists`
   sobre las reservas ajenas sería siempre cierto y **le diría que está libre todo lo que otros tienen
   reservado**. La Task 2 lo prueba con dos alumnos distintos.
   → Si al ejecutar resultara que la función devuelve conteos distintos según quién pregunte, es que el
   `SECURITY DEFINER` no está surtiendo efecto y hay que revisar el dueño de la función.
3. **`alter table ... disable trigger` dentro de una prueba.** La aserción de los 90 días necesita una
   reserva con `updated_at` antiguo, y no se puede escribir a mano porque
   `trg_inventory_reservations_updated_at` lo pisa con `now()`. La salida es desactivar ese trigger dentro
   de la transacción de la prueba, que se revierte.
   → Si `disable trigger` no fuera transaccional en esta versión —lo es, pero conviene confirmarlo con la
   prueba delante—, la alternativa es contar sobre `reservation_status_log.changed_at`, que es lo que ya
   propone la corrección 4 del plan de la tanda 2.
4. **Borrar los 23 sueltos deja de haber referencia.** Se borran en la Task 4, que va **después** de que
   todo lo demás esté en verde, no antes. Recuperación: `git show <commit>:supabase/<archivo>.sql`.

---

### Task 1: Apagar los dos avisos del linter *(1.9)*

**Files:**
- Create: `supabase/migrations/<ts>_linter_fixes.sql`
- Create: `supabase/tests/26_linter.sql`

**Interfaces:**
- Produces: `public.product_availability` con `security_invoker = on` y sin `SELECT` para `anon`;
  `public.fn_update_updated_at()` con `search_path` fijo. Ningún cambio de firma: los cinco triggers que
  la usan siguen igual.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Los dos avisos del linter que quedaban de la linea base.
--
-- El 🔴 ERROR: product_availability sin security_invoker se evalua con los
-- privilegios de su dueno, asi que se salta el RLS de quien consulta. El 🟡 WARN:
-- fn_update_updated_at sin search_path fijo.
--
-- El 🔵 INFO -reservation_status_log con RLS y cero politicas- ya lo cerro la
-- tanda 1 con log_select_own.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);


select ok(
  (select 'security_invoker=on' = any(c.reloptions)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'product_availability'),
  'la vista respeta el RLS de quien consulta');

select isnt(
  (select p.proconfig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'fn_update_updated_at'),
  null,
  'fn_update_updated_at tiene search_path fijo');


-- La vista deja de estar al alcance del anonimo (ver punto a verificar 1).
set local role anon;

select throws_ok(
  $$select count(*) from public.product_availability$$,
  '42501', null,
  'un anonimo no consulta la disponibilidad');

reset role;


-- Con sesion, sigue diciendo la verdad. La camara tiene 3 unidades activas en
-- Monterrico; el microfono tiene 1 activa y 1 en mantenimiento en San Miguel.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select active_units::int from public.product_availability
    where product_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and campus_id  = 'cccccccc-0000-0000-0000-000000000001'),
  3,
  'con sesion, la vista cuenta las unidades activas');

select is(
  (select active_units::int from public.product_availability
    where product_id = 'bbbbbbbb-0000-0000-0000-000000000004'
      and campus_id  = 'cccccccc-0000-0000-0000-000000000002'),
  1,
  'la unidad en mantenimiento no cuenta como disponible');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: fallan las tres primeras. Las dos últimas ya pasan: la vista cuenta bien, lo que cambia es
quién puede consultarla.

- [ ] **Step 3: Escribir la migración**

```sql
-- Los dos avisos del linter que quedaban (tarea 1.9).
--
-- 1. product_availability sin security_invoker se evalua con los privilegios de
--    su DUENO, no con los de quien consulta. Es el 🔴 ERROR del linter, y no es
--    teorico: la tanda 1 decidio que el inventario fisico no es publico -un
--    anonimo no tiene por que saber cuantas camaras hay- y esta vista se lo
--    contaba igual, porque leia inventory_units saltandose el RLS.
--
--    Con security_invoker = on, un anonimo deja de ver inventory_units y la vista
--    le devolveria una fila por producto con active_units = 0 e in_stock = false.
--    Decir "sin stock" es peor que no decir nada, asi que se le revoca el SELECT
--    sobre la vista: la disponibilidad se ve con sesion. (Ver TANDA_3.md, punto a
--    verificar 1.)
--
-- 2. fn_update_updated_at sin search_path fijo es el 🟡 WARN. La funcion viene de
--    la linea base y la usan cinco triggers; se recrea con el mismo cuerpo y la
--    misma firma, asi que los triggers no se tocan. now() sigue resolviendo con
--    search_path vacio porque vive en pg_catalog, que es implicito siempre.
--
-- El 🔵 INFO -reservation_status_log con RLS y cero politicas- ya lo cerro la
-- tanda 1 con log_select_own.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 7.

alter view public.product_availability set (security_invoker = on);

revoke select on public.product_availability from anon;


create or replace function public.fn_update_updated_at() returns trigger
  language plpgsql set search_path = '' as $$
  begin
    new.updated_at = now();
    return new;
  end $$;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 5 pasan, y las 108 anteriores siguen pasando.

> **Ninguna prueba anterior debería romperse, y está comprobado.** Se buscó quién consulta la vista:
> `grep product_availability supabase/tests/*.sql` no devuelve nada, y en `migrations/` solo aparece en el
> `GRANT` de `20260805195304_catalog_policies.sql`. Es decir, **la vista lleva toda la Fase 1 sin una sola
> prueba encima**; `26_linter.sql` es la primera que la mira. Si aun así algo cae, será una dependencia
> que este grep no vio.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 3.1: apaga los dos avisos del linter' -m 'security_invoker en product_availability, que se saltaba el RLS y le contaba el inventario al anonimo; y search_path fijo en fn_update_updated_at. El aviso de reservation_status_log ya lo habia cerrado la tanda 1.'
```

---

### Task 2: Disponibilidad por franja *(1.10)*

Lo que necesita quien pinta el calendario: dada una franja, cuántas unidades quedan. No es una columna de
la vista, porque depende de la pregunta.

**Files:**
- Create: `supabase/migrations/<ts>_available_units.sql`
- Create: `supabase/tests/27_available_units.sql`

**Interfaces:**
- Consumes: `inventory_reservations.blocked_range` y `products.buffer_minutes` *(tanda 2)*.
- Produces:
  `public.available_units(p_product_id uuid, p_campus_id uuid, p_start_at timestamptz, p_duration_minutes int) returns int`,
  ejecutable solo por `authenticated`.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Disponibilidad por franja (1.10).
--
-- La asercion que de verdad importa es la ultima: dos alumnos distintos tienen
-- que obtener el MISMO numero. Un alumno solo ve sus propias reservas, asi que si
-- la funcion se evaluara con sus privilegios, las reservas ajenas serian
-- invisibles y le diria que esta libre todo lo que otros tienen ocupado.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

delete from public.disabled_days;


-- La camara: 3 unidades en Monterrico.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
    120),
  3,
  'sin reservas, las tres camaras estan disponibles');

select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
  120, 'Ocupa una');

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
    120),
  2,
  'una reserva descuenta una unidad de esa franja');

-- El buffer cuenta: a 30 min del final sigue ocupada; despues del buffer, no.
select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '13:00') at time zone 'America/Lima',
    60),
  2,
  'dentro del buffer, la unidad sigue sin estar disponible');

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '14:00') at time zone 'America/Lima',
    60),
  3,
  'pasado el buffer, vuelve a estar disponible');

reset role;


-- El alumno B no ve la reserva de A, pero tiene que ver el mismo conteo.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select is(
  public.available_units(
    'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
    (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
    120),
  2,
  'otro alumno ve el mismo conteo aunque no vea la reserva ajena');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: `function public.available_units(...) does not exist`.

- [ ] **Step 3: Escribir la migración**

```sql
-- Disponibilidad por franja (tarea 1.10).
--
-- El diseno decia que esto era una columna nueva de product_availability. No
-- puede serlo: la disponibilidad depende de la franja que se pregunte y una vista
-- no recibe parametros. product_availability se queda contando stock por sede;
-- la franja la responde esta funcion.
--
-- SECURITY DEFINER, y no por comodidad. Un alumno solo ve sus propias reservas
-- -reservations_select_own-, asi que evaluando el NOT EXISTS con sus privilegios
-- las reservas ajenas serian invisibles y la funcion le diria que esta libre todo
-- lo que otros tienen ocupado. Justo el error que hace que un calendario ofrezca
-- franjas que luego la RPC rechaza.
--
-- Devuelve un conteo, no filas: no filtra por RLS porque no expone ninguna fila.
-- Quien pregunta se entera de CUANTAS quedan, no de quien las tiene.
--
-- El rango candidato se construye igual que blocked_range -buffer del producto
-- sumado solo al final-, para que la respuesta coincida exactamente con lo que el
-- EXCLUDE dejaria pasar. Si las dos formulas se separan, el calendario miente.

create or replace function public.available_units(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_start_at         timestamptz,
  p_duration_minutes int
) returns int
language sql stable security definer set search_path = ''
as $$
  select count(*)::int
    from public.inventory_units u
   where u.product_id = p_product_id
     and u.campus_id  = p_campus_id
     and u.status     = 'active'
     and not exists (
       select 1
         from public.inventory_reservations r
        where r.unit_id = u.id
          and r.status in ('reserved', 'active')
          and r.blocked_range && tstzrange(
                p_start_at,
                p_start_at
                  + make_interval(mins => p_duration_minutes)
                  + make_interval(mins => coalesce(
                      (select p.buffer_minutes from public.products p where p.id = p_product_id),
                      120)),
                '[)')
     );
$$;

revoke execute on function
  public.available_units(uuid, uuid, timestamptz, int) from public, anon;
grant execute on function
  public.available_units(uuid, uuid, timestamptz, int) to authenticated;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 5 pasan.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 3.2: disponibilidad por franja' -m 'No cabe en la vista, porque depende de la franja que se pregunte: es una funcion. SECURITY DEFINER porque un alumno no ve las reservas ajenas y contando con sus privilegios veria libre todo lo ocupado. El rango candidato se construye igual que blocked_range para que la respuesta coincida con lo que el EXCLUDE dejaria pasar.'
```

---

### Task 3: Los tres huecos de la batería *(1.11)*

La batería de §8 ya existe casi entera. Faltan tres aserciones concretas y una prueba de cobertura.

**Files:**
- Modify: `supabase/tests/16_traceability.sql` — `plan(5)` → `plan(6)`
- Modify: `supabase/tests/21_no_overlap.sql` — `plan(5)` → `plan(6)`
- Modify: `supabase/tests/25_penalties.sql` — `plan(7)` → `plan(8)`
- Create: `supabase/tests/19_function_hardening.sql`

**Interfaces:**
- Produces: nada de esquema. Cuatro aserciones más, 117 en total.

- [ ] **Step 1: El log tampoco se edita** — en `16_traceability.sql`, subir el plan a `plan(6)` y añadir
      antes del `reset role` del bloque de admin:

```sql
select throws_ok(
  $$update public.reservation_status_log set new_status = 'completed'$$,
  '42501', null,
  'ni el admin edita una linea de la auditoria');
```

- [ ] **Step 2: El borde del buffer, por el otro lado** — en `21_no_overlap.sql`, subir a `plan(6)` y
      añadir después de la aserción de la reserva «pegada»:

```sql
-- A exactamente buffer - 1 minuto, se rechaza. Junto con la anterior, esto fija
-- el borde: 4 h entra, 3 h 59 min no.
select throws_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000002',
           alumno_a, 'casi pegada',
           t10 + interval '3 hours 59 minutes', t10 + interval '5 hours'
      from fx$$,
  '23P01', null,
  'a un minuto del borde del buffer, se rechaza');
```

> **Ojo con la unidad.** La aserción usa `dddddddd-…0002`, no `…0001`: para entonces la unidad 1 ya tiene
> la reserva «pegada» en `[t10+4h, t10+6h)`, y una reserva a `t10+3h59` chocaría contra ella y no contra
> la que se quiere probar. Se necesita una unidad con una sola reserva previa, así que la prueba tiene que
> sembrar antes una reserva base en la unidad 2. Al escribirlo, comprobar contra qué está chocando de
> verdad: un `23P01` por el motivo equivocado pasa igual de verde.

- [ ] **Step 3: Dos plantones separados más de 90 días no sancionan** — en `25_penalties.sql`, subir a
      `plan(8)` y añadir al final, antes del `finish()`:

```sql
-- El reloj de la sancion son 90 dias. Para envejecer una reserva hay que apagar
-- el trigger de updated_at, que si no la pisa con now(). ALTER TABLE es
-- transaccional: el rollback del final lo deja como estaba.
alter table public.inventory_reservations disable trigger trg_inventory_reservations_updated_at;
update public.inventory_reservations
   set updated_at = now() - interval '120 days'
 where id in ('33333333-0000-0000-0000-000000000001',
              '33333333-0000-0000-0000-000000000002',
              '33333333-0000-0000-0000-000000000003');
alter table public.inventory_reservations enable trigger trg_inventory_reservations_updated_at;

update public.alumnos set banned_until = null where id = (select alumno_a from fx);

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '33333333-0000-0000-0000-00000000000c',
       'bbbbbbbb-0000-0000-0000-000000000004',
       'dddddddd-0000-0000-0000-000000000007',
       alumno_a, 'planton viejo', t10, t10 + interval '2 hours'
  from fx;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-00000000000c';

reset role;

select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  null::timestamptz,
  'los plantones de hace mas de 90 dias no cuentan');
```

- [ ] **Step 4: Prueba de cobertura de `search_path`** — crear
      `supabase/tests/19_function_hardening.sql`:

```sql
-- Cobertura, no una regla concreta: que no quede ninguna funcion sin search_path
-- fijo. Es el hermano de 18_rls_coverage.sql.
--
-- Una funcion SECURITY DEFINER sin search_path fijo es escalable: quien la llama
-- controla que tabla resuelve cada nombre sin cualificar. Todas las de la Fase 1
-- lo llevan; esto detiene el CI si alguien anade una que no.

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
      and not ('search_path=' = any(p.proconfig))),
  0,
  'las SECURITY DEFINER lo tienen ademas vacio, no solo fijo'
);


select * from finish();

rollback;
```

> **Punto a verificar dentro de la prueba.** La segunda aserción compara con la cadena exacta
> `search_path=`. Es la forma en que Postgres almacena `set search_path = ''`, verificada el 2026-08-05
> con `select proconfig from pg_proc`. Si al ejecutar apareciera otra representación, ajustar la
> comparación a lo que devuelva la base, no al revés.

- [ ] **Step 5: Correr y confirmar que pasan las cuatro nuevas**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: 117 aserciones. Las cuatro nuevas deben **fallar primero si se quitan los arreglos de la
Task 1**: la de cobertura es la que valida que 1.9 se hizo de verdad.

- [ ] **Step 6: Commit**

```
git add supabase/tests
git commit -m 'Tanda 3.3: cierra los tres huecos de la bateria' -m 'La auditoria tampoco se edita; el borde del buffer por el lado que faltaba; dos plantones separados mas de 90 dias no sancionan. Y una prueba de cobertura de search_path, hermana de 18_rls_coverage.sql, que detiene el CI si alguien anade una funcion sin endurecer.'
```

---

### Task 4: Borrar los 23 `.sql` sueltos *(1.12, D-15, cierra Q-9)*

Va después de que todo esté en verde, no antes: mientras se reescribe esa lógica, son referencia.

**Files:**
- Delete: los 22 `.sql` de `supabase/` **menos `seed.sql`**

- [ ] **Step 1: Confirmar qué se borra**

```powershell
git ls-files 'supabase/*.sql'
```

Deben salir 23: los 22 a borrar más `seed.sql`, que **se queda**.

- [ ] **Step 2: Borrarlos**

```powershell
git rm supabase/0*.sql supabase/ADD_*.sql supabase/FIX_*.sql supabase/INVENTORY_*.sql supabase/POSTGRES_LOCAL_SCHEMA.sql supabase/PRODUCT_IMAGES_METADATA_MIGRATION.sql supabase/RESET_INVENTORY_DATA.sql
```

- [ ] **Step 3: Comprobar que solo queda `seed.sql`**

```powershell
git status --short; git ls-files 'supabase/*.sql'
```

- [ ] **Step 4: Correr la batería, que no debería notarlo**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: 117. Si algo falla, es que `seed.sql` dependía de uno de ellos, y eso sería un hallazgo.

- [ ] **Step 5: Commit**

```
git commit -m 'Tanda 3.4: borra los 22 SQL sueltos de supabase' -m 'D-15, cierra Q-9. Contenian cinco versiones sucesivas de la RPC de reserva y tres modelos incompatibles de lista negra; la Fase 1 los reemplaza por migraciones versionadas. El historial de git es el archivo: git show <commit>:supabase/<archivo>.sql los recupera.'
```

---

### Task 5: Cierre de la Fase 1 y empuje al remoto *(D-17)*

- [ ] **Step 1: Batería completa en verde y conteo anotado**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

- [ ] **Step 2: Cerrar 1.9 a 1.12 en `ESTADO_Y_PLAN.md`; marcar la Fase 1 como cerrada, y actualizar el
      inventario de la sección 2.3, que todavía habla de «23 archivos `.sql` sueltos»**

- [ ] **Step 3: Actualizar la tabla de avisos del linter de la sección 2.2: los tres quedan cerrados**

- [ ] **Step 4: Anotar en `FASE_1_DISENO.md` §7 y §8 las tres correcciones de arriba, fechadas**

- [ ] **Step 5: Cabecera de correcciones en este archivo y tabla de `PLANES/README.md`; tabla de tandas de
      `CLAUDE.md` con la Fase 1 cerrada**

- [ ] **Step 6: Commit de documentación, `push` y PR** — los ejecuta Alejandro

- [ ] **Step 7: Verificar el CI con `gh run list`**

- [ ] **Step 8: Empujar al remoto** *(D-17)* — comandos para Alejandro, uno por línea:

```powershell
npx supabase migration list
```
```powershell
npx supabase db push
```
```powershell
npx supabase migration list
```

> El proyecto **hiberna**: si falla, reintentar, que la primera llamada lo despierta. Las 18 migraciones
> se aplican sobre una base con catálogo real y tablas transaccionales vacías, que es lo que hace seguras
> las dos que podrían dar guerra: añadir columnas con `default` sobre `products` poblada, y el
> `blocked_range NOT NULL`, que exige `inventory_reservations` vacía.

- [ ] **Step 9: Sembrar el primer miembro del personal en el remoto**

El seed **no viaja**: `db push` sube solo `migrations/`. Sin esta sentencia no hay ningún admin, y como
todas las políticas de personal cuelgan de `staff_members`, el panel no funcionaría. Se ejecuta **una vez**,
desde el SQL Editor del dashboard, y **después** de que esa persona haya entrado por primera vez con su
cuenta UPC:

```sql
insert into public.staff_members (user_id, role)
select id, 'admin' from auth.users where email = '<correo>@upc.edu.pe';
```

- [ ] **Step 10: Correr los advisors de seguridad contra el remoto y anotar el resultado**

Es el momento en que dan señal: los tres avisos conocidos están cerrados, así que lo que reporten es
nuevo. Si sale algo, se abre como tarea de la Fase 2, no se parchea a mano.

---

## Autorrevisión

**Cobertura del diseño.** §7 `security_invoker` → Task 1. §7 `search_path` → Task 1. §7 políticas del log
→ **ya hecho en la tanda 1**, ver corrección 1. §7 disponibilidad por franja → Task 2, como función y no
como columna, ver corrección 3. §7 borrado de los sueltos → Task 4. §8 batería → **casi toda hecha**, ver
corrección 2; los huecos van en la Task 3. **Sin huecos.**

**Sin marcadores.** Las cuatro aserciones nuevas van escritas enteras, con el `plan(n)` que hay que subir
en cada archivo.

**Consistencia.** `available_units` usa los cuatro parámetros en el mismo orden en la migración, en la
prueba y en los `grant`. Los UUID son los del seed. El rango candidato de `available_units` replica el de
`set_blocked_range`: buffer del producto, sumado solo al final, `'[)'`.

**Lo que más fácilmente sale mal.** La Task 3 Step 2. Es la única aserción del plan que depende del estado
que dejaron las anteriores dentro del mismo archivo, y hay una unidad ya ocupada por la reserva «pegada».
Un `23P01` por chocar contra la reserva equivocada pasa igual de verde y no prueba nada — el mismo error
que la tanda 2 encontró en «cancelar libera la franja». Al escribirla, verificar contra qué choca.

**Riesgo conocido.** La Task 1 cambia lo que ve un visitante sin sesión. Es la única tarea de toda la
Fase 1 con efecto visible en la interfaz pública, y la Fase 2 se construirá sobre esa decisión: si la
landing tiene que mostrar disponibilidad, hay que resolverlo **antes** de escribir el catálogo, no
después.
