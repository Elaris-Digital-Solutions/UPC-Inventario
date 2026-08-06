> ## ✅ Ejecutado el 2026-08-05 · cinco correcciones
>
> El plan de abajo es **el que se escribió antes de ejecutar**. Resultado: 6 migraciones, 46 aserciones
> pgTAP nuevas (108 en total), y P1-6, P1-7 y P1-9 cerrados. Las seis tareas salieron en el orden
> previsto; ninguna hubo que reordenarla.
>
> 1. **El `SET LOCAL` de una migración no hace nada.** *Punto a verificar 1, resuelto por el segundo
>    desenlace.* La migración del `EXCLUDE` empezaba con `set local search_path = public, extensions;` y
>    la CLI respondió `WARNING (25P01): SET LOCAL can only be used in transaction blocks`: aplica cada
>    migración fuera de un bloque explícito. El constraint se creó igual, pero **gracias al `search_path`
>    que Supabase deja puesto en la base, no gracias al archivo**. Habría funcionado sin que nadie se
>    enterara hasta que esa configuración cambiara. Se resolvió cualificando el opclass:
>    `unit_id extensions.gist_uuid_ops with =`.
> 2. **El orden de las validaciones de la RPC importa tanto como las validaciones.** *Detectado
>    ejecutando.* La comprobación de alineación con el bloque —añadida sobre el diseño, ver punto a
>    verificar 3— quedó **antes** que la de fecha pasada. Pedir una hora de ayer devolvía «La hora de
>    inicio no cae en un bloque de 30 minutos»: cierto e inútil. Se movió después de la ventana y del
>    horario. La prueba lo encontró porque afirma el **mensaje**; con `throws_ok(..., 'P0001')` habría
>    pasado en verde con el mensaje equivocado.
> 3. **`throws_like` distingue mayúsculas.** *Detectado ejecutando.* Usa `LIKE`, así que
>    `'%completa tu perfil%'` no casa con «Completa tu perfil antes de reservar». Cuatro pruebas fallaban
>    por la capitalización, que es lo único que no interesaba comprobar. Toda la batería 23 usa
>    `throws_ilike`.
> 4. **Ampliar un privilegio cambia el modo de fallo de quien no debería tenerlo.** *Detectado
>    ejecutando.* La Task 3 concede `UPDATE (status, cancellation_reason)` a `authenticated` para que la
>    política del personal tenga sobre qué aplicarse, y `authenticated` incluye a los alumnos. Eso rompió
>    `17_rls_reservations.sql`, de la tanda 1, que afirmaba `42501`: al alumno ya no le falta privilegio,
>    le falta **política**, y sin política el `UPDATE` afecta a cero filas sin error. Sigue igual de
>    cerrado, pero solo una de las dos formas se comprueba con `throws_ok`. Es la lección de la tanda 1
>    apareciendo por el lado contrario: allí una prueba con `throws_ok` era un falso negativo; aquí una
>    que era correcta dejó de serlo al ampliar los privilegios.
> 5. **Una prueba pasaba por casualidad.** *Detectado al verla fallar.* «Cancelar libera la franja» estaba
>    escrita sobre la cámara, que tiene tres unidades: la rotación justa le daba otra unidad al segundo
>    alumno y la aserción se cumplía **sin que ninguna cancelación hubiera ocurrido** — pasaba en verde
>    antes de que la función existiera. Reescrita sobre el trípode, que tiene una unidad única. Sin el
>    paso de «verla fallar» habría quedado una prueba que no comprueba nada, en verde para siempre.
>
> **Decisiones tomadas al ejecutar:** D-16 (mueven el estado admin y operador, punto a verificar 2) y
> D-17 (las migraciones se empujan al remoto al cerrar la Fase 1, no por tanda). **Pendiente abierto:**
> Q-11, la tensión entre `min_duration_minutes` = 15 y `slot_minutes` = 30.
>
> **Lo que el plan acertó:** las tres trampas que la autorrevisión anticipó —fechas relativas y no
> literales, `throws_ok` donde falta política, y el seed sin reservas— no dieron ni un fallo. Las cinco
> correcciones son todas de cosas que el plan no había mirado.

# Tanda 2 — Reglas de reserva · Plan de implementación

**Goal:** que reservar sea imposible fuera de las reglas. Hoy no se puede reservar por ninguna vía: la
tanda 1 cerró la escritura sobre `inventory_reservations` y dejó la puerta por abrir. Esta tanda la abre,
y la abre **solo** en forma de RPC. Corrige P1-6, P1-7 y P1-9.

**Architecture:** tres cercos concéntricos, del más externo al más interno. **La RPC** valida las reglas
que necesitan contexto (perfil, sanción, ventana, horario, límite diario) y elige la unidad. **Los
triggers** imponen lo que ninguna aplicación debe poder saltarse: la máquina de estados y el rango
bloqueado. **El `EXCLUDE`** es la última red, la que gana cuando dos alumnos piden la misma unidad en el
mismo milisegundo. Si el cerco exterior falla, el interior sigue en pie.

**Tech Stack:** PostgreSQL 17 · `btree_gist` · pgTAP · Supabase CLI 2.111.0

## Global Constraints

- **Ninguna escritura directa sobre `inventory_reservations` para el alumno.** El `INSERT` solo existe
  dentro de `create_reservation`; el `UPDATE` de estado, solo para el personal y solo por transiciones
  válidas. Eso es lo que cierra P1-9.
- Toda función nueva lleva `security definer set search_path = ''` y **todas** sus referencias
  cualificadas con esquema. Con `search_path` vacío, `now()` sigue resolviendo (está en `pg_catalog`,
  que siempre es implícito), pero `auth.uid()` y cualquier tabla necesitan prefijo.
- A las RPC se les **revoca** `EXECUTE` a `public` y `anon`, y se les **concede** a `authenticated`. Al
  crear una función, `PUBLIC` recibe `EXECUTE` por defecto: revocárselo solo a `anon` no cambia nada.
  *(Lección de la tanda 0.)*
- **`activo` y `banned_until` de `alumnos` siguen sin `GRANT` para nadie.** Las escriben el trigger de
  sanciones y las RPC de admin, que son `SECURITY DEFINER` y no dependen de privilegios de tabla.
- Toda tabla nueva: `enable row level security` **y** al menos una política. `18_rls_coverage.sql` es
  genérico y detiene el CI si falta cualquiera de las dos.
- **El seed no lleva reservas.** `14_rls_alumnos.sql` afirma que «el operador solo se ve a sí mismo
  mientras no haya reservas vivas». Una reserva sembrada rompe esa prueba. Los datos transaccionales de
  cada prueba se crean dentro de su propia transacción, que se revierte.
- Migraciones versionadas con `npx supabase migration new`. Nada de SQL suelto.
- Local: `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo.**
- Mensajes de commit sin acentos. Claude no toca el remoto.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `…_reservation_settings.sql` | `max_duration_hours`, `buffer_minutes` y la tabla `app_settings` con su fila única |
| `…_blocked_range.sql` | Columna `blocked_range`, trigger que la puebla y `EXCLUDE` anti-solape |
| `…_reservation_state_machine.sql` | Trigger de transiciones válidas, privilegio y política de escritura del personal |
| `…_create_reservation_rpc.sql` | La RPC de reserva: la única puerta de entrada |
| `…_cancel_reservation_rpc.sql` | Cancelación con motivo obligatorio, para el alumno y para el personal |
| `…_penalties.sql` | Trigger único de sanciones y las dos RPC de admin sobre `alumnos` |
| `supabase/seed.sql` | Perfiles de alumno completos y duraciones/buffers distintos por producto |
| `supabase/tests/2*.sql` | Una batería por frente |

Una migración por frente. El orden importa: `app_settings` y `buffer_minutes` existen antes de que nada
los lea, y el `EXCLUDE` existe antes que la RPC que se apoya en él.

## Puntos a verificar

Lo que este plan **no** sabe con certeza. Cada uno con los dos desenlaces y qué se hace en cada caso.

1. **El opclass de `btree_gist` y el `search_path` de la migración.** El `EXCLUDE` mezcla `uuid with =` y
   `tstzrange with &&`; el operador para `uuid` lo aporta `btree_gist`, instalada en el esquema
   `extensions`. Si el `search_path` con el que corre la migración no incluye `extensions`, falla con
   `data type uuid has no default operator class for access method gist`.
   → **Se previene** poniendo `set local search_path = public, extensions;` en la cabecera de la
   migración. Si aun así falla, cualificar el opclass: `unit_id extensions.gist_uuid_ops with =`.
2. **Quién mueve el estado.** El diseño no lo dice. Este plan concede el `UPDATE` de estado a **todo el
   personal**, admin y operador: quien está en el mostrador es quien sabe si el equipo se entregó, se
   devolvió o nadie lo recogió, y la máquina de estados ya impide los saltos absurdos.
   → Si al revisarlo se prefiere que `not_returned` sea solo del admin, es partir la política en dos:
   `reservations_update_staff` con `using (is_staff())` para `active`/`completed`/`cancelled`, y otra con
   `is_admin()` para los dos estados de incumplimiento. **Se registra como decisión (D-16) al cerrar**,
   sea cual sea la respuesta.
3. **`slot_minutes` no lo usa nadie en el diseño.** La columna existe y ninguna regla la lee. Este plan
   añade a la RPC la validación de que la hora de inicio caiga en un bloque, porque una configuración que
   no se aplica es una mentira. Para que la regla esté bien definida, `app_settings` recibe además
   `check (60 % slot_minutes = 0)`.
   → Queda una tensión sin resolver: `min_duration_minutes` vale 15 y `slot_minutes` vale 30, así que una
   reserva de 15 minutos empieza alineada y **termina** a mitad de bloque. Se abre como **Q-11**; no se
   valida la alineación de la duración hasta responderla.
4. **El reloj de la sanción es `updated_at`.** El trigger cuenta las `not_picked_up` de los últimos 90
   días mirando `inventory_reservations.updated_at`, y esa columna la mueve cualquier `UPDATE`. Si el
   personal edita el `cancellation_reason` de una reserva terminal, le reinicia el reloj.
   → El plan mantiene la versión del diseño, que es la aprobada. Si en la ejecución se decide endurecerlo,
   la alternativa es contar sobre `reservation_status_log.changed_at`, que es solo-anexar; hay que tener
   en cuenta que los dos triggers `AFTER` se disparan por orden alfabético de nombre, así que
   `trg_apply_penalties` corre **antes** de que `trg_log_reservation_status` escriba el evento en curso, y
   la comparación pasaría a ser `v_count + 1 >= 2`.
5. **Orden de disparo de los triggers de `inventory_reservations`.** Quedan cinco. `BEFORE UPDATE`:
   `trg_enforce_reservation_transition`, `trg_inventory_reservations_updated_at`,
   `trg_set_blocked_range` — alfabético, y el que valida corre primero, que es lo que se quiere.
   `AFTER UPDATE`: `trg_apply_penalties` y `trg_log_reservation_status`, en ese orden.
   → Si al ejecutar el orden no fuera el esperado, se renombra: es lo único que Postgres mira.

---

### Task 1: Configuración por producto y ajustes globales *(1.4)*

Va primera porque todo lo demás la lee: el trigger de `blocked_range` necesita `buffer_minutes` y la RPC
necesita la fila de `app_settings`.

**Files:**
- Create: `supabase/migrations/<ts>_reservation_settings.sql`
- Modify: `supabase/seed.sql`
- Create: `supabase/tests/20_settings.sql`

**Interfaces:**
- Produces: `public.products.max_duration_hours smallint`, `public.products.buffer_minutes smallint`,
  y la tabla `public.app_settings` con **exactamente una fila** (`id = true`) y las columnas
  `booking_window_days`, `opening_time`, `closing_time`, `slot_minutes`, `min_duration_minutes`,
  `daily_limit_per_product`.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Configuracion: por producto lo que varia por producto (D-1, D-10), y una unica
-- fila para lo global (D-3).
--
-- La prueba del alumno NO usa throws_ok. El alumno tiene privilegio sobre esas
-- columnas -se concede a `authenticated`, que lo incluye- y lo que le falta es
-- politica. Sin politica el UPDATE afecta a cero filas y no lanza nada. Se
-- comprueba el efecto, no la excepcion. (Leccion de la tanda 1.)

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


select has_column('public', 'products', 'max_duration_hours',
  'products lleva su propia duracion maxima (D-1)');
select has_column('public', 'products', 'buffer_minutes',
  'products lleva su propio buffer (D-10)');

select is(
  (select count(*)::int from public.app_settings), 1,
  'app_settings tiene exactamente una fila');

-- El truco de la fila unica: id es booleano con check (id), asi que solo `true`
-- es valido y la clave primaria impide repetirlo.
select throws_ok(
  $$insert into public.app_settings (id) values (false)$$,
  '23514', null,
  'no se puede colar una segunda fila de configuracion');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_settings' and c.relrowsecurity),
  1,
  'app_settings tiene RLS activo');


-- Alumno A: cero filas afectadas, sin error.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

update public.app_settings set booking_window_days = 60;

reset role;

select is(
  (select booking_window_days::int from public.app_settings), 7,
  'un alumno no cambia la configuracion: el UPDATE no afecta ninguna fila');


-- Admin: si.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

update public.app_settings set booking_window_days = 14;

reset role;

select is(
  (select booking_window_days::int from public.app_settings), 14,
  'el admin si cambia la configuracion');


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: falla al no existir `app_settings` ni las columnas nuevas.

- [ ] **Step 3: Escribir la migración**

```sql
-- Configuracion de las reglas de reserva (tarea 1.4).
--
-- Dos niveles, a proposito:
--
--   products.max_duration_hours y buffer_minutes -> lo que depende del equipo.
--     Una camara no se presta el mismo tiempo que un tripode, ni tarda lo mismo
--     en volver a estar disponible: el buffer es tiempo de retorno -revisar,
--     cargar bateria, limpiar-. (D-1, D-10)
--
--   app_settings -> lo que es del servicio y no del equipo: horario, ventana
--     movil, limite diario. (D-3)
--
-- Fila unica sin trucos raros: la clave primaria es un booleano con check (id),
-- asi que solo `true` es un valor valido y la PK impide que se repita. No hace
-- falta ni trigger ni indice parcial.
--
-- La fila por defecto se inserta ACA y no en seed.sql: seed.sql no llega al
-- proyecto remoto, y sin esta fila la RPC de reserva aborta con "Falta la fila de
-- configuracion". Es esquema, no dato de prueba.
--
-- 60 % slot_minutes = 0 no es decoracion: la RPC valida que la hora de inicio
-- caiga en un bloque, y con un tamano que no divide la hora esa regla no esta
-- bien definida.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.1.

alter table public.products
  add column max_duration_hours smallint not null default 4
    check (max_duration_hours between 1 and 8),
  add column buffer_minutes smallint not null default 120
    check (buffer_minutes between 0 and 480);


create table public.app_settings (
  id                      boolean primary key default true,
  booking_window_days     smallint not null default 7
                            check (booking_window_days between 1 and 60),
  opening_time            time not null default '08:00',
  closing_time            time not null default '22:00',
  slot_minutes            smallint not null default 30
                            check (slot_minutes between 5 and 60),
  min_duration_minutes    smallint not null default 15
                            check (min_duration_minutes between 5 and 480),
  daily_limit_per_product smallint not null default 1
                            check (daily_limit_per_product between 1 and 10),
  updated_at              timestamptz not null default now(),
  constraint app_settings_singleton    check (id),
  constraint app_settings_horario      check (closing_time > opening_time),
  constraint app_settings_slot_divisor check (60 % slot_minutes = 0)
);

insert into public.app_settings (id) values (true);

alter table public.app_settings enable row level security;

create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.fn_update_updated_at();


-- Lectura para cualquiera con sesion: el cliente necesita el horario y la ventana
-- para pintar el calendario. Escritura solo de admin, y solo de las columnas de
-- configuracion: id y updated_at no se conceden a nadie.
--
-- Sin INSERT ni DELETE para nadie: la fila unica no se borra ni se duplica por API.
grant select on public.app_settings to authenticated;
grant update (booking_window_days, opening_time, closing_time, slot_minutes,
              min_duration_minutes, daily_limit_per_product)
  on public.app_settings to authenticated;

create policy app_settings_select_auth on public.app_settings
  for select to authenticated
  using (true);

create policy app_settings_update_admin on public.app_settings
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
```

- [ ] **Step 4: Ampliar el seed**

Al final de `supabase/seed.sql`, **después** del `insert into auth.users` (las filas de `alumnos` las crea
el trigger al insertar los usuarios, así que antes no existen):

```sql
-- Duraciones y buffers distintos por producto, para que las pruebas ejerciten
-- D-1 y D-10 en vez de leer siempre el valor por defecto.
--   producto 2 (tripode) -> buffer de 30 min: se revisa rapido
--   producto 3 (laptop)  -> hasta 8 horas: jornada completa de edicion
update public.products set buffer_minutes     = 30 where id = 'bbbbbbbb-0000-0000-0000-000000000002';
update public.products set max_duration_hours = 8  where id = 'bbbbbbbb-0000-0000-0000-000000000003';


-- Perfiles completos. El trigger de alta crea la fila con nombre y apellido en
-- nulo (D-9), y la RPC de reserva exige el perfil completo: sin esto ninguna
-- prueba de reserva pasaria de la primera validacion.
--
-- La prueba de "perfil incompleto" pone nombre en nulo dentro de su propia
-- transaccion, que se revierte.
update public.alumnos
   set nombre = 'Ana', apellido = 'Perez',
       carrera_id = 'caaaaaaa-0000-0000-0000-000000000001'
 where auth_user_id = 'a0000000-0000-0000-0000-000000000001';

update public.alumnos
   set nombre = 'Bruno', apellido = 'Diaz',
       carrera_id = 'caaaaaaa-0000-0000-0000-000000000002'
 where auth_user_id = 'a0000000-0000-0000-0000-000000000002';

-- NO se siembran reservas. 14_rls_alumnos.sql afirma que el operador solo se ve a
-- si mismo mientras no haya reservas vivas; una reserva sembrada rompe esa prueba.
```

- [ ] **Step 5: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 7 nuevas pasan y **las 62 anteriores siguen pasando**. El seed cambió: si alguna de la
tanda 1 falla, es por eso y no por la migración.

- [ ] **Step 6: Commit**

```
git add supabase/migrations supabase/tests supabase/seed.sql
git commit -m 'Tanda 2.1: configuracion por producto y app_settings' -m 'max_duration_hours y buffer_minutes en products (D-1, D-10); app_settings de fila unica con la ventana movil y el horario (D-3). Lectura para cualquiera con sesion, escritura solo de admin. La fila por defecto va en la migracion, no en el seed, porque seed.sql no llega al remoto.'
```

---

### Task 2: Rango bloqueado y `EXCLUDE` anti-solape *(1.6, corrige P1-6)*

El defecto P1-6 es «se consulta y luego se inserta»: entre la consulta y el `INSERT` cabe otra reserva.
Ninguna cantidad de validación en la aplicación lo arregla; lo arregla un constraint.

**Files:**
- Create: `supabase/migrations/<ts>_blocked_range.sql`
- Create: `supabase/tests/21_no_overlap.sql`

**Interfaces:**
- Consumes: `products.buffer_minutes` *(Task 1)*.
- Produces: `inventory_reservations.blocked_range tstzrange not null`, poblada por
  `public.set_blocked_range()`, y el constraint `inventory_reservations_no_overlap`, que lanza
  `exclusion_violation` (SQLSTATE `23P01`). La RPC de la Task 4 captura ese error por nombre.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Anti-doble-reserva (P1-6).
--
-- Las inserciones van como postgres, no como alumno: nadie tiene privilegio de
-- INSERT sobre inventory_reservations, y lo que se prueba aca es el constraint,
-- no la autorizacion. El dueno de la tabla no esta sujeto a RLS, pero si a los
-- constraints, que es justo lo que interesa.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);


-- Manana a las 10:00 en Lima. Fijo respecto del momento de la corrida, para que
-- la prueba no dependa de la hora a la que se ejecute.
create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;


insert into public.inventory_reservations
  (product_id, unit_id, alumno_id, purpose, start_at, end_at)
select 'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'primera', t10, t10 + interval '2 hours'
  from fx;

-- El buffer se suma solo al final: producto 1 usa el valor por defecto, 120 min.
select is(
  (select upper(blocked_range) from public.inventory_reservations
    where purpose = 'primera'),
  (select t10 + interval '4 hours' from fx),
  'blocked_range se rellena solo y suma el buffer al final');

-- Y sale del producto, no de una constante: el tripode tiene 30 min en el seed.
insert into public.inventory_reservations
  (product_id, unit_id, alumno_id, purpose, start_at, end_at)
select 'bbbbbbbb-0000-0000-0000-000000000002',
       'dddddddd-0000-0000-0000-000000000004',
       alumno_a, 'tripode', t10, t10 + interval '2 hours'
  from fx;

select is(
  (select upper(blocked_range) from public.inventory_reservations
    where purpose = 'tripode'),
  (select t10 + interval '2 hours 30 minutes' from fx),
  'el buffer sale de products.buffer_minutes (D-10)');


-- Misma unidad, franja pisada: el constraint lo rechaza.
select throws_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000001',
           alumno_a, 'pisada', t10 + interval '1 hour', t10 + interval '3 hours'
      from fx$$,
  '23P01', null,
  'dos reservas de la misma unidad no pueden solaparse');

-- Justo al terminar el buffer si entra. Sumar el buffer a los dos lados
-- rechazaria esta, que es exactamente el limite permitido.
select lives_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000001',
           alumno_a, 'pegada', t10 + interval '4 hours', t10 + interval '6 hours'
      from fx$$,
  'una reserva que empieza justo al terminar el buffer si entra');


-- El EXCLUDE es parcial: una reserva cancelada deja de bloquear.
-- El motivo va desde ya porque la Task 3 lo hara obligatorio.
update public.inventory_reservations
   set status = 'cancelled', cancellation_reason = 'prueba'
 where purpose = 'primera';

select lives_ok(
  $$insert into public.inventory_reservations
      (product_id, unit_id, alumno_id, purpose, start_at, end_at)
    select 'bbbbbbbb-0000-0000-0000-000000000001',
           'dddddddd-0000-0000-0000-000000000001',
           alumno_a, 'reemplazo', t10, t10 + interval '2 hours'
      from fx$$,
  'una reserva cancelada libera su franja');


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: falla en la primera aserción — la columna `blocked_range` no existe.

- [ ] **Step 3: Escribir la migración**

```sql
-- Anti-doble-reserva (tarea 1.6, corrige P1-6).
--
-- El EXCLUDE no puede calcular el buffer sobre la marcha. `timestamptz - interval`
-- esta marcada STABLE, no IMMUTABLE, porque el resultado depende del huso horario
-- en vigor, y las expresiones de indice exigen IMMUTABLE. No compilan ni
--   exclude using gist (..., tstzrange(start_at, end_at + '2h'))
-- ni una columna generada equivalente.
--
-- La salida es una columna real poblada por trigger: un trigger si puede usar
-- funciones STABLE, y de paso lee el buffer del producto en vez de una constante.
--
-- El buffer se suma SOLO AL FINAL. Con A = [10:00, 12:00) y buffer de 2 h, si se
-- expandieran las dos reservas 2 h a cada lado, una B que empezara a las 14:00
-- -exactamente el buffer despues- se rechazaria: [08:00,14:00) y [12:00,18:00) se
-- solapan. Sumando el buffer completo solo al final, [10:00,14:00) contra
-- [14:00,18:00) no se tocan y B pasa; una B a las 13:00 si se rechaza. Da una
-- separacion minima exacta de 2 h en ambos sentidos.
--
-- El EXCLUDE es parcial a proposito: sin el WHERE, una reserva cancelada seguiria
-- bloqueando su franja para siempre.
--
-- blocked_range es NOT NULL a proposito: un rango nulo nunca entra en conflicto,
-- asi que sin esa restriccion el constraint se podria esquivar dejandola vacia.
--
-- Nota operativa: cambiar products.buffer_minutes NO reescribe los blocked_range
-- ya guardados. Afecta solo a las reservas nuevas. Si hiciera falta, se rehacen
-- con un UPDATE que toque start_at y dispare el trigger.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.2.

set local search_path = public, extensions;


alter table public.inventory_reservations add column blocked_range tstzrange;


create or replace function public.set_blocked_range() returns trigger
  language plpgsql set search_path = '' as $$
  declare v_buffer smallint;
  begin
    select p.buffer_minutes into v_buffer
      from public.products p
     where p.id = new.product_id;

    new.blocked_range := tstzrange(
      new.start_at,
      new.end_at + make_interval(mins => coalesce(v_buffer, 120)),
      '[)'
    );
    return new;
  end $$;

create trigger trg_set_blocked_range
  before insert or update of start_at, end_at, product_id
  on public.inventory_reservations
  for each row execute function public.set_blocked_range();


-- La tabla esta vacia, asi que el NOT NULL no necesita rellenar nada.
alter table public.inventory_reservations alter column blocked_range set not null;


-- btree_gist aporta el operador = para uuid dentro de un indice gist. Se instalo
-- en el esquema extensions en 20260805184306_extensions.sql; de ahi el search_path
-- de arriba.
alter table public.inventory_reservations
  add constraint inventory_reservations_no_overlap
  exclude using gist (unit_id with =, blocked_range with &&)
  where (status in ('reserved', 'active'));
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 5 pasan. **Si falla con `data type uuid has no default operator class`**, es el punto a
verificar 1: cualificar el opclass como `unit_id extensions.gist_uuid_ops with =`.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 2.2: blocked_range y EXCLUDE anti-solape' -m 'Corrige P1-6. El buffer no cabe en la expresion del indice porque timestamptz - interval es STABLE y los indices exigen IMMUTABLE: se resuelve con una columna poblada por trigger, que ademas lee el buffer del producto. El buffer se suma solo al final para que la separacion minima sea exacta y no doble.'
```

---

### Task 3: Máquina de estados *(1.7, corrige P1-7)*

P1-7 era un filtro de conflictos invertido —bloqueaba con `completed`, ignoraba `active`—. La corrección
de raíz no es arreglar el filtro: es que el estado no pueda ir a cualquier parte.

| Desde | Hacia |
|---|---|
| `reserved` | `active` · `cancelled` · `not_picked_up` |
| `active` | `completed` · `not_returned` |
| `cancelled` `completed` `not_picked_up` `not_returned` | — terminales |

**Files:**
- Create: `supabase/migrations/<ts>_reservation_state_machine.sql`
- Create: `supabase/tests/22_state_machine.sql`

**Interfaces:**
- Produces: el trigger `trg_enforce_reservation_transition`, que rechaza con `check_violation` (`23514`)
  toda transición fuera de la tabla y toda cancelación sin motivo; y la política
  `reservations_update_staff`, que es la única que permite un `UPDATE` sobre la tabla.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Maquina de estados (P1-7).
--
-- El intento del alumno NO se prueba con throws_ok: tiene el privilegio de columna
-- -se concede a `authenticated`- y lo que le falta es politica. Sin politica el
-- UPDATE afecta a cero filas y no lanza nada. Se comprueba el efecto.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '11111111-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'entrega', t10, t10 + interval '2 hours'
  from fx;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '11111111-0000-0000-0000-000000000002',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000002',
       alumno_a, 'saltos', t10, t10 + interval '2 hours'
  from fx;


-- Saltos invalidos: se rechazan sea quien sea el que los intente, porque los
-- impone un trigger y no una politica.
select throws_ok(
  $$update public.inventory_reservations set status = 'completed'
     where id = '11111111-0000-0000-0000-000000000002'$$,
  '23514', null,
  'de reserved no se salta a completed');

select throws_ok(
  $$update public.inventory_reservations set status = 'cancelled'
     where id = '11111111-0000-0000-0000-000000000002'$$,
  '23514', null,
  'cancelar sin motivo se rechaza (BR-17)');


-- El operador entrega y recibe.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$update public.inventory_reservations set status = 'active'
     where id = '11111111-0000-0000-0000-000000000001'$$,
  'el operador marca la entrega: reserved -> active');

select lives_ok(
  $$update public.inventory_reservations set status = 'completed'
     where id = '11111111-0000-0000-0000-000000000001'$$,
  'el operador marca la recepcion: active -> completed');

reset role;

select is(
  (select count(*)::int from public.reservation_status_log
    where reservation_id = '11111111-0000-0000-0000-000000000001'),
  2,
  'cada cambio de estado deja su rastro en la auditoria');


-- Un estado terminal no se abandona.
select throws_ok(
  $$update public.inventory_reservations set status = 'active'
     where id = '11111111-0000-0000-0000-000000000001'$$,
  '23514', null,
  'de un estado terminal no se sale');


-- El alumno: cero filas, sin error.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'active'
 where id = '11111111-0000-0000-0000-000000000002';

reset role;

select is(
  (select status::text from public.inventory_reservations
    where id = '11111111-0000-0000-0000-000000000002'),
  'reserved',
  'el alumno no mueve el estado de su propia reserva');


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: fallan las que esperan `23514` —hoy cualquier transición pasa— y las dos del operador, porque
sin privilegio ni política su `UPDATE` no afecta filas. `lives_ok` **no** detecta cero filas: por eso la
aserción del log, que sí lo detecta.

- [ ] **Step 3: Escribir la migración**

```sql
-- Maquina de estados de la reserva (tarea 1.7, corrige P1-7).
--
-- P1-7 en el codigo viejo era un filtro de conflictos invertido: bloqueaba con
-- `completed` e ignoraba `active`. Arreglar el filtro no arregla el problema de
-- fondo, que es que el estado podia ir de cualquier sitio a cualquier otro. Con
-- este trigger, `active` pasa a ser un estado del que solo se sale por dos
-- puertas, y el admin deja de poder resucitar una reserva terminal.
--
-- El motivo obligatorio al cancelar (BR-17) vive aca y no en la RPC de cancelar,
-- a proposito: asi tambien lo cumple el personal cuando cancela por UPDATE. Una
-- regla que solo vive en una de las dos puertas no es una regla.
--
-- Quien puede mover el estado: TODO el personal. Quien esta en el mostrador es
-- quien sabe si el equipo se entrego, si volvio o si nadie lo recogio. La maquina
-- de estados ya impide los saltos absurdos, asi que partir la politica entre
-- admin y operador anadiria complejidad sin cerrar ningun agujero. Si se decide
-- que not_returned sea solo del admin, se parte esta politica en dos.
--
-- El alumno sigue sin poder tocar el estado: tiene el privilegio de columna
-- -se concede al rol `authenticated`, que lo incluye- pero ninguna politica de
-- UPDATE le aplica, asi que su sentencia afecta a cero filas. Su unica via es la
-- RPC cancel_reservation.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.3.


create or replace function public.enforce_reservation_transition() returns trigger
  language plpgsql set search_path = '' as $$
  begin
    if new.status = old.status then
      return new;
    end if;

    if not (
      (old.status = 'reserved' and new.status in ('active', 'cancelled', 'not_picked_up'))
      or (old.status = 'active' and new.status in ('completed', 'not_returned'))
    ) then
      raise exception 'Transicion no permitida: % -> %', old.status, new.status
        using errcode = 'check_violation';
    end if;

    if new.status = 'cancelled'
       and coalesce(btrim(new.cancellation_reason), '') = '' then
      raise exception 'Cancelar exige un motivo'
        using errcode = 'check_violation';
    end if;

    return new;
  end $$;

create trigger trg_enforce_reservation_transition
  before update of status on public.inventory_reservations
  for each row execute function public.enforce_reservation_transition();


-- Solo estas dos columnas, y solo para el personal. start_at, end_at, unit_id y
-- alumno_id no se conceden a nadie: mover una reserva de franja o de dueno es
-- cancelar y volver a reservar, que pasa por las reglas.
grant update (status, cancellation_reason)
  on public.inventory_reservations to authenticated;

create policy reservations_update_staff on public.inventory_reservations
  for update to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 7 pasan.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 2.3: maquina de estados de la reserva' -m 'Corrige P1-7 de raiz: el estado deja de poder ir de cualquier sitio a cualquier otro. El motivo obligatorio al cancelar vive en el trigger y no en la RPC, para que tambien lo cumpla el personal. El alumno tiene privilegio de columna pero ninguna politica de UPDATE: su sentencia afecta cero filas.'
```

---

### Task 4: La RPC de reserva *(1.5, corrige P1-9)*

La tarea central de la tanda. Es la que convierte «reglas que el cliente respeta» en «reglas que el motor
impone», y por tanto la que cierra P1-9.

**Files:**
- Create: `supabase/migrations/<ts>_create_reservation_rpc.sql`
- Create: `supabase/tests/23_create_reservation.sql`

**Interfaces:**
- Consumes: `app_settings` y `products.max_duration_hours` *(Task 1)*; el constraint
  `inventory_reservations_no_overlap` *(Task 2)*; `private.current_alumno_id()` *(tanda 1)*.
- Produces:
  `public.create_reservation(p_product_id uuid, p_campus_id uuid, p_start_at timestamptz,
  p_duration_minutes int, p_purpose text) returns uuid`, ejecutable solo por `authenticated`.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- La RPC de reserva (P1-9): las reglas viven en el motor, no en el navegador.
--
-- Dos decisiones de esta bateria:
--
-- 1. Las horas se calculan relativas a la corrida, no literales. Una fecha fija
--    caeria fuera de la ventana movil de 7 dias en cuanto pasara una semana.
--    "Manana a las 10:00 en Lima" siempre esta dentro de la ventana y dentro del
--    horario 08:00-22:00.
--
-- 2. Se comprueba el mensaje con throws_like y no el SQLSTATE con throws_ok. Los
--    rechazos de negocio de la RPC mezclan P0001 y 23514 segun la regla; el
--    mensaje es lo que distingue una de otra.
--
-- El unico dia inhabilitado del seed es el 2026-12-25. Si la bateria corriera un
-- 24 de diciembre, "manana" caeria en feriado y la mitad de las pruebas fallarian
-- por el motivo equivocado. Se vacia la tabla dentro de la transaccion, que se
-- revierte igual.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(14);

delete from public.disabled_days;


-- 1 · Camino feliz. Producto 1 (camara, max 4 h) en Monterrico.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      120, 'Practica de fotografia')$$,
  'el alumno A reserva la camara para manana a las 10:00');

reset role;

select is(
  (select count(*)::int from public.inventory_reservations r
     join public.inventory_units u on u.id = r.unit_id
    where r.alumno_id = (select id from public.alumnos
                          where auth_user_id = 'a0000000-0000-0000-0000-000000000001')
      and r.status = 'reserved'
      and u.product_id = 'bbbbbbbb-0000-0000-0000-000000000001'
      and u.campus_id  = 'cccccccc-0000-0000-0000-000000000001'),
  1,
  'la reserva queda a su nombre, en reserved y con una unidad de la sede pedida');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 2 · Limite diario por producto (BR-09).
select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '15:00') at time zone 'America/Lima',
      120, 'Otra vez')$$,
  '%ya tienes una reserva de este producto%',
  'no se puede reservar dos veces el mismo producto el mismo dia');


-- 3 · Rotacion justa (BR-12, M-8): dos reservas mas, en dias distintos para no
--     chocar con el limite diario. Hay 3 camaras en Monterrico y el orden es por
--     uso ascendente, asi que deben salir tres unidades distintas.
select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 2) + time '10:00') at time zone 'America/Lima',
  120, 'Dia 2');

select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 3) + time '10:00') at time zone 'America/Lima',
  120, 'Dia 3');

reset role;

select is(
  (select count(distinct r.unit_id)::int from public.inventory_reservations r
     join public.inventory_units u on u.id = r.unit_id
    where u.product_id = 'bbbbbbbb-0000-0000-0000-000000000001'),
  3,
  'tres reservas del mismo producto reparten las tres unidades');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- 4 · Horario de atencion (C-7, M-7): 07:00 en Lima es antes de abrir.
select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 4) + time '07:00') at time zone 'America/Lima',
      60, 'Muy temprano')$$,
  '%horario de atencion%',
  'fuera del horario de atencion se rechaza');

-- 5 · Alineacion con la grilla de bloques.
select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 4) + time '10:07') at time zone 'America/Lima',
      60, 'A destiempo')$$,
  '%bloque%',
  'la hora de inicio tiene que caer en un bloque de slot_minutes');

-- 6 · Duracion contra el producto y no contra una constante (D-1). La camara
--     admite 4 h; se piden 5.
select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 4) + time '10:00') at time zone 'America/Lima',
      300, 'Demasiado')$$,
  '%duracion%',
  'la duracion se valida contra max_duration_hours del producto');

-- 7 · En el pasado.
select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      now() - interval '1 day', 120, 'Ayer')$$,
  '%pasado%',
  'no se reserva hacia atras');

-- 8 · Ventana movil de 7 dias (D-3).
select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 30) + time '10:00') at time zone 'America/Lima',
      120, 'Dentro de un mes')$$,
  '%ventana de reserva%',
  'fuera de la ventana movil se rechaza');

reset role;

-- 9 · Dia inhabilitado.
insert into public.disabled_days (date, reason)
values ((now() at time zone 'America/Lima')::date + 5, 'Feriado de prueba');

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 5) + time '10:00') at time zone 'America/Lima',
      120, 'Feriado')$$,
  '%no hay atencion%',
  'un dia inhabilitado se rechaza');

-- 10 · Sin unidades libres: el tripode tiene una sola unidad en Monterrico.
select public.create_reservation(
  'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001',
  (((now() at time zone 'America/Lima')::date + 6) + time '10:00') at time zone 'America/Lima',
  120, 'Tripode de A');

reset role;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000002',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 6) + time '12:00') at time zone 'America/Lima',
      60, 'Tripode de B')$$,
  '%no hay unidades disponibles%',
  'el buffer del producto deja sin unidades a la siguiente reserva');

reset role;

-- 11 · Perfil incompleto (D-9).
update public.alumnos set nombre = null
 where auth_user_id = 'a0000000-0000-0000-0000-000000000002';

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 2) + time '10:00') at time zone 'America/Lima',
      60, 'Sin perfil')$$,
  '%completa tu perfil%',
  'sin perfil completo no se reserva');

reset role;

-- 12 · Sancion vigente (D-12). Se escribe como postgres porque banned_until no
--      tiene GRANT para nadie.
update public.alumnos
   set nombre = 'Bruno', banned_until = now() + interval '5 days'
 where auth_user_id = 'a0000000-0000-0000-0000-000000000002';

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_like(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 2) + time '10:00') at time zone 'America/Lima',
      60, 'Sancionado')$$,
  '%sancion vigente%',
  'un alumno sancionado no reserva');

reset role;

-- 13 · La RPC no es publica.
set local role anon;

select throws_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      now() + interval '1 day', 120, 'Anonimo')$$,
  '42501', null,
  'anon no puede ejecutar la RPC');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: todas fallan con `function public.create_reservation(...) does not exist`.

- [ ] **Step 3: Escribir la migración**

```sql
-- La RPC de reserva (tarea 1.5). Corrige P1-9 y resuelve C-4, C-7 y M-8.
--
-- Es la unica puerta de entrada. La tanda 1 no concedio INSERT sobre
-- inventory_reservations a nadie, asi que no hay forma de crear una reserva
-- saltandose estas validaciones ni llamando a PostgREST directamente. Eso es
-- exactamente lo que P1-9 describia como imposible.
--
-- SECURITY DEFINER con search_path vacio: corre como el dueno de la tabla, que no
-- esta sujeto a RLS, y por eso resuelve la identidad por su cuenta con auth.uid()
-- en vez de confiar en el parametro. El alumno no se pasa: se deduce.
--
-- De las cinco versiones sucesivas de esta RPC en los SQL sueltos se conserva la
-- variante por sede, que es la que trae rotacion justa, limite diario y sancion.
--
-- El EXCLUDE queda como ultima red: si dos alumnos piden la misma unidad en la
-- misma franja a la vez, uno recibe exclusion_violation y el bucle le busca otra
-- unidad en lugar de rendirse.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.4.


create or replace function public.create_reservation(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_start_at         timestamptz,
  p_duration_minutes int,
  p_purpose          text
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
  select * into v_alumno
    from public.alumnos
   where auth_user_id = (select auth.uid())
     and activo;
  if not found then
    raise exception 'No hay un alumno activo para esta sesion' using errcode = '42501';
  end if;
  if v_alumno.nombre is null or v_alumno.apellido is null or v_alumno.carrera_id is null then
    raise exception 'Completa tu perfil antes de reservar' using errcode = 'check_violation';
  end if;

  -- 2 · sancion vigente (D-12)
  if v_alumno.banned_until is not null and v_alumno.banned_until > now() then
    raise exception 'Tienes una sancion vigente hasta %', v_alumno.banned_until
      using errcode = 'check_violation';
  end if;

  select * into v_settings from public.app_settings;
  if not found then
    raise exception 'Falta la fila de configuracion en app_settings';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if not found then
    raise exception 'Producto inexistente';
  end if;

  -- 3 · duracion, contra el producto y no contra una constante (D-1)
  if p_duration_minutes < v_settings.min_duration_minutes
     or p_duration_minutes > v_product.max_duration_hours * 60 then
    raise exception 'Duracion fuera del rango permitido para este producto';
  end if;
  v_end_at := p_start_at + make_interval(mins => p_duration_minutes);

  -- 4 · alineacion con la grilla de bloques que ofrece la interfaz. Sin esto,
  --     slot_minutes seria una columna que nadie aplica y una llamada directa a
  --     la API podria pedir las 10:07. El check 60 % slot_minutes = 0 de
  --     app_settings garantiza que el bloque divide la hora.
  if (extract(epoch from (p_start_at - date_trunc('hour', p_start_at)))::int
        % (v_settings.slot_minutes * 60)) <> 0 then
    raise exception 'La hora de inicio no cae en un bloque de % minutos', v_settings.slot_minutes
      using errcode = 'check_violation';
  end if;

  -- 5 · ventana movil (D-3)
  if p_start_at < now() then
    raise exception 'No se puede reservar en el pasado';
  end if;
  if p_start_at > now() + make_interval(days => v_settings.booking_window_days) then
    raise exception 'Fuera de la ventana de reserva';
  end if;

  -- 6 · dia inhabilitado y horario, siempre en America/Lima (C-7, M-7).
  --     La comparacion de fechas se hace en hora local: en UTC, una reserva de las
  --     20:00 de Lima cae al dia siguiente y el feriado no coincidiria.
  v_local_date := (p_start_at at time zone 'America/Lima')::date;

  if exists (select 1 from public.disabled_days d where d.date = v_local_date) then
    raise exception 'Ese dia no hay atencion';
  end if;

  if (p_start_at at time zone 'America/Lima')::time < v_settings.opening_time
     or (v_end_at at time zone 'America/Lima')::time > v_settings.closing_time
     or (v_end_at at time zone 'America/Lima')::date <> v_local_date then
    raise exception 'Fuera del horario de atencion';
  end if;

  -- 7 · limite diario por producto (BR-09)
  if (select count(*) from public.inventory_reservations r
        where r.alumno_id  = v_alumno.id
          and r.product_id = p_product_id
          and r.status in ('reserved', 'active')
          and (r.start_at at time zone 'America/Lima')::date = v_local_date)
     >= v_settings.daily_limit_per_product then
    raise exception 'Ya tienes una reserva de este producto para ese dia';
  end if;

  -- 8 · rotacion justa (M-8, BR-12): se recorren las unidades de menos usada a
  --     mas usada en vez de rendirse en la primera ocupada. El desempate por
  --     unit_code hace la eleccion determinista, y por tanto comprobable.
  for v_unit_id in
    select u.id
      from public.inventory_units u
      left join public.inventory_reservations r
        on r.unit_id = u.id
       and r.status in ('reserved', 'active', 'completed')
     where u.product_id = p_product_id
       and u.campus_id  = p_campus_id
       and u.status     = 'active'
     group by u.id, u.unit_code
     order by count(r.id) asc, u.unit_code asc
  loop
    begin
      perform 1 from public.inventory_units where id = v_unit_id for update skip locked;
      if not found then
        continue;
      end if;

      insert into public.inventory_reservations
        (product_id, unit_id, alumno_id, purpose, start_at, end_at)
      values (p_product_id, v_unit_id, v_alumno.id, p_purpose, p_start_at, v_end_at)
      returning id into v_id;

      return v_id;
    exception
      when exclusion_violation then
        continue;
    end;
  end loop;

  raise exception 'No hay unidades disponibles en esa franja';
end $$;


-- Al crear una funcion, PUBLIC recibe EXECUTE por defecto: revocarselo solo a
-- anon no cambiaria nada. (Leccion de la tanda 0.)
revoke execute on function
  public.create_reservation(uuid, uuid, timestamptz, int, text) from public, anon;
grant execute on function
  public.create_reservation(uuid, uuid, timestamptz, int, text) to authenticated;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 14 pasan.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 2.4: RPC unica de reserva' -m 'Cierra P1-9: perfil, sancion, duracion por producto, alineacion de bloque, ventana movil, feriados, horario en America/Lima, limite diario y rotacion justa. Como nadie tiene INSERT sobre inventory_reservations, no hay forma de saltarse ninguna. El EXCLUDE queda de ultima red y el bucle busca otra unidad en vez de rendirse.'
```

---

### Task 5: Cancelar también es una RPC

BR-17 exige motivo al cancelar. Si la cancelación fuera un `UPDATE` del alumno, el motivo sería un campo
obligatorio de un formulario, es decir, opcional de verdad.

**Files:**
- Create: `supabase/migrations/<ts>_cancel_reservation_rpc.sql`
- Create: `supabase/tests/24_cancel_reservation.sql`

**Interfaces:**
- Consumes: el trigger de transiciones *(Task 3)* y `private.current_alumno_id()` / `private.is_staff()`
  *(tanda 1)*.
- Produces: `public.cancel_reservation(p_reservation_id uuid, p_reason text) returns void`, ejecutable
  solo por `authenticated`.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Cancelacion con motivo obligatorio (BR-17).

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

delete from public.disabled_days;


create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '22222222-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'para cancelar', t10, t10 + interval '2 hours'
  from fx;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', 'me da igual')$$,
  '42501', null,
  'un alumno no cancela la reserva de otro');

reset role;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_like(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', '   ')$$,
  '%motivo%',
  'cancelar sin motivo se rechaza, y un motivo en blanco es sin motivo');

select lives_ok(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', 'Se suspendio la clase')$$,
  'el alumno cancela su propia reserva');

select throws_like(
  $$select public.cancel_reservation('22222222-0000-0000-0000-000000000001', 'Otra vez')$$,
  '%reserved%',
  'una reserva ya cancelada no se cancela dos veces');

reset role;


select is(
  (select new_status::text || ' | ' || reason from public.reservation_status_log
    where reservation_id = '22222222-0000-0000-0000-000000000001'),
  'cancelled | Se suspendio la clase',
  'la cancelacion y su motivo quedan en la auditoria');


-- El EXCLUDE es parcial: la franja vuelve a estar libre.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      120, 'Aprovecho el hueco')$$,
  'cancelar libera la franja para otro alumno');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: `function public.cancel_reservation(...) does not exist`.

- [ ] **Step 3: Escribir la migración**

```sql
-- Cancelacion (BR-17).
--
-- Es RPC y no UPDATE por la misma razon que la creacion: asi el motivo
-- obligatorio se cumple en el motor. El alumno no tiene politica de UPDATE sobre
-- inventory_reservations, asi que esta es su unica via.
--
-- El personal tambien puede cancelar, por aca o por UPDATE directo: en los dos
-- casos el trigger de la maquina de estados exige el motivo.
--
-- SECURITY DEFINER, asi que se comprueba la propiedad a mano: al correr como
-- dueno de la tabla, RLS no filtra nada y una reserva ajena seria visible.

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason         text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner     uuid;
  v_status    public.reservation_status;
  v_alumno_id uuid;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'La cancelacion exige un motivo' using errcode = 'check_violation';
  end if;

  select r.alumno_id, r.status into v_owner, v_status
    from public.inventory_reservations r
   where r.id = p_reservation_id;
  if not found then
    raise exception 'Reserva inexistente' using errcode = 'no_data_found';
  end if;

  v_alumno_id := private.current_alumno_id();

  if not private.is_staff()
     and (v_alumno_id is null or v_alumno_id <> v_owner) then
    raise exception 'No puedes cancelar una reserva ajena' using errcode = '42501';
  end if;

  if v_status <> 'reserved' then
    raise exception 'Solo se cancela una reserva en estado reserved (esta en %)', v_status
      using errcode = 'check_violation';
  end if;

  update public.inventory_reservations
     set status = 'cancelled',
         cancellation_reason = p_reason
   where id = p_reservation_id;
end $$;

revoke execute on function public.cancel_reservation(uuid, text) from public, anon;
grant execute on function public.cancel_reservation(uuid, text) to authenticated;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 6 pasan.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 2.5: RPC de cancelacion con motivo obligatorio' -m 'BR-17 en el motor y no en un dialogo del navegador. Comprueba la propiedad a mano porque SECURITY DEFINER no pasa por RLS, y solo permite cancelar desde reserved. Al cancelar, el EXCLUDE parcial libera la franja.'
```

---

### Task 6: Sanciones y las dos RPC de admin *(1.8, D-12)*

Cierra además la deuda que la tanda 1 dejó explícita: `activo` y `banned_until` no tienen `GRANT` para
nadie, así que hoy **ninguna persona** puede levantar una sanción ni desactivar a un alumno.

**Files:**
- Create: `supabase/migrations/<ts>_penalties.sql`
- Create: `supabase/tests/25_penalties.sql`

**Interfaces:**
- Consumes: el trigger de transiciones *(Task 3)*, que es lo que garantiza que a `not_picked_up` y
  `not_returned` solo se llega desde `reserved` y `active`.
- Produces: el trigger `trg_apply_penalties`, y
  `public.admin_set_ban(p_alumno_id uuid, p_banned_until timestamptz) returns void` /
  `public.admin_set_alumno_activo(p_alumno_id uuid, p_activo boolean) returns void`, ambas solo para
  admin.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- Sanciones (D-12): un unico modelo, un unico trigger.
--
-- El disparador de los 15 dias son DOS not_picked_up en los ultimos 90 dias, no
-- dos de por vida: si no, el alumno queda a un fallo del bloqueo para siempre.
-- not_returned si es permanente.
--
-- Las transiciones van como operador, que es quien las hace en el mostrador.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(7);


create temporary table fx as
select (((now() at time zone 'America/Lima')::date + 1) + time '10:00')
         at time zone 'America/Lima' as t10,
       (select id from public.alumnos
         where auth_user_id = 'a0000000-0000-0000-0000-000000000001') as alumno_a;

insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '33333333-0000-0000-0000-00000000000' || n,
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-00000000000' || n,
       alumno_a, 'planton ' || n, t10, t10 + interval '2 hours'
  from fx, generate_series(1, 3) as n;


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-000000000001';

reset role;

-- El nulo va tipado: is() es polimorfica y con un NULL sin tipo Postgres no
-- resuelve la firma.
select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  null::timestamptz,
  'una sola no_recogida no sanciona');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-000000000002';

reset role;

select ok(
  (select banned_until from public.alumnos where id = (select alumno_a from fx))
    between now() + interval '14 days' and now() + interval '16 days',
  'la segunda no_recogida en 90 dias sanciona 15 dias');


-- Una sancion nueva no acorta la que ya corria: greatest() se queda con la mayor.
update public.alumnos set banned_until = now() + interval '60 days'
 where id = (select alumno_a from fx);

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'not_picked_up'
 where id = '33333333-0000-0000-0000-000000000003';

reset role;

select ok(
  (select banned_until from public.alumnos where id = (select alumno_a from fx))
    > now() + interval '59 days',
  'una sancion nueva no acorta una que ya estaba corriendo');


-- No devolver es permanente.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '33333333-0000-0000-0000-000000000009',
       'bbbbbbbb-0000-0000-0000-000000000003',
       'dddddddd-0000-0000-0000-000000000005',
       alumno_a, 'sin devolver', t10, t10 + interval '2 hours'
  from fx;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

update public.inventory_reservations set status = 'active'
 where id = '33333333-0000-0000-0000-000000000009';
update public.inventory_reservations set status = 'not_returned'
 where id = '33333333-0000-0000-0000-000000000009';

reset role;

select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  'infinity'::timestamptz,
  'no devolver el equipo sanciona de forma permanente');


-- Las RPC de admin. Cierran la deuda de la tanda 1: banned_until y activo no
-- tienen GRANT para nadie, asi que sin esto la sancion solo caduca por tiempo.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000002","role":"authenticated"}';
set local role authenticated;

select throws_ok(
  $$select public.admin_set_ban(
      (select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
      null)$$,
  '42501', null,
  'un alumno no levanta sanciones');

reset role;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.admin_set_ban(
      (select id from public.alumnos where auth_user_id = 'a0000000-0000-0000-0000-000000000001'),
      null)$$,
  'el admin levanta la sancion a mano');

reset role;

select is(
  (select banned_until from public.alumnos where id = (select alumno_a from fx)),
  null::timestamptz,
  'la sancion queda levantada');


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: fallan todas menos la primera —sin trigger, `banned_until` se queda en nulo siempre— y las de
admin fallan por función inexistente.

- [ ] **Step 3: Escribir la migración**

```sql
-- Sanciones (tarea 1.8, D-12). Resuelve C-2 y C-3.
--
-- Un unico modelo: alumnos.banned_until, poblado por un unico trigger. Se
-- descartan las tres variantes incompatibles de inventory_blacklist que convivian
-- en los SQL sueltos.
--
-- El disparador de los 15 dias son DOS not_picked_up en los ULTIMOS 90 DIAS, no
-- dos de por vida. Con el conteo de por vida, un alumno que falla dos veces en
-- cuatro anos queda a un fallo del bloqueo para el resto de su carrera.
--
-- greatest(...) evita que una sancion nueva acorte una que ya estaba corriendo.
-- Con banned_until = 'infinity', greatest se queda con infinity.
--
-- El trigger es SECURITY DEFINER porque banned_until no tiene GRANT para nadie
-- -ni para el admin-: un privilegio de columna se concede a un ROL, y
-- `authenticated` incluye a los alumnos, que tienen politica de UPDATE sobre su
-- propia fila. Concederselo al admin reabriria P1-10. (Correccion de la tanda 1.)
--
-- La cuenta de los 90 dias se apoya en updated_at, que mueve cualquier UPDATE de
-- la fila. Es la version del diseno aprobado; si se endurece, la alternativa es
-- contar sobre reservation_status_log.changed_at, que es solo-anexar.
--
-- Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.5.


create or replace function public.apply_penalties() returns trigger
  language plpgsql security definer set search_path = '' as $$
  declare v_count int;
  begin
    if new.status = 'not_returned' then
      update public.alumnos
         set banned_until = 'infinity'
       where id = new.alumno_id;

    elsif new.status = 'not_picked_up' then
      -- La fila en curso ya esta actualizada: es un trigger AFTER, asi que se
      -- cuenta a si misma. v_count >= 2 significa "esta es la segunda".
      select count(*) into v_count
        from public.inventory_reservations r
       where r.alumno_id = new.alumno_id
         and r.status    = 'not_picked_up'
         and r.updated_at > now() - interval '90 days';

      if v_count >= 2 then
        update public.alumnos
           set banned_until = greatest(coalesce(banned_until, now()), now() + interval '15 days')
         where id = new.alumno_id;
      end if;
    end if;

    return null;
  end $$;

create trigger trg_apply_penalties
  after update of status on public.inventory_reservations
  for each row execute function public.apply_penalties();


-- Las dos puertas manuales sobre las columnas que no tienen GRANT.
--
-- Sin ellas, una sancion solo caduca por tiempo y un alumno no se puede desactivar
-- por ninguna via: es la deuda que la tanda 1 dejo anotada al descubrir que la
-- sancion no puede vivir en un privilegio de columna.
--
-- Comprueban el rol a mano porque SECURITY DEFINER no pasa por RLS.

create or replace function public.admin_set_ban(
  p_alumno_id    uuid,
  p_banned_until timestamptz
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Solo un administrador modifica una sancion' using errcode = '42501';
  end if;

  update public.alumnos set banned_until = p_banned_until where id = p_alumno_id;
  if not found then
    raise exception 'Alumno inexistente' using errcode = 'no_data_found';
  end if;
end $$;

create or replace function public.admin_set_alumno_activo(
  p_alumno_id uuid,
  p_activo    boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Solo un administrador activa o desactiva a un alumno' using errcode = '42501';
  end if;

  update public.alumnos set activo = p_activo where id = p_alumno_id;
  if not found then
    raise exception 'Alumno inexistente' using errcode = 'no_data_found';
  end if;
end $$;

revoke execute on function public.admin_set_ban(uuid, timestamptz) from public, anon;
grant execute on function public.admin_set_ban(uuid, timestamptz) to authenticated;

revoke execute on function public.admin_set_alumno_activo(uuid, boolean) from public, anon;
grant execute on function public.admin_set_alumno_activo(uuid, boolean) to authenticated;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 7 pasan.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Tanda 2.6: sanciones y RPC de admin sobre alumnos' -m 'D-12: un unico modelo de sancion en banned_until, poblado por un unico trigger. Dos not_picked_up en los ultimos 90 dias, no dos de por vida; not_returned permanente. admin_set_ban y admin_set_alumno_activo cierran la deuda de la tanda 1: esas columnas no tienen GRANT para nadie porque un privilegio de columna se concede a un rol.'
```

---

### Task 7: Cierre y entrega

- [ ] **Step 1: Correr la batería entera y anotar el total**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: 62 aserciones de las tandas 0 y 1 + 46 nuevas (7 + 5 + 7 + 14 + 6 + 7).

- [ ] **Step 2: Correr los advisors de seguridad y anotar lo que quede abierto**

Los tres avisos conocidos (`product_availability` con `SECURITY DEFINER`, `fn_update_updated_at` sin
`search_path`, `reservation_status_log` sin políticas) se cierran en la tanda 3; el aviso que interesa
detectar aquí es cualquier **función nueva** de esta tanda sin `search_path` fijo.

- [ ] **Step 3: Marcar 1.4 a 1.8 en `ESTADO_Y_PLAN.md`, cerrar P1-6, P1-7 y P1-9 en la tabla de defectos**

- [ ] **Step 4: Registrar en `ESTADO_Y_PLAN.md` la decisión D-16 (quién mueve el estado) y el pendiente
      Q-11 (`min_duration_minutes` frente a `slot_minutes`)**

- [ ] **Step 5: Anotar en `FASE_1_DISENO.md` §6 lo que la ejecución haya desmentido**, como corrección
      fechada y sin reescribir el original

- [ ] **Step 6: Añadir a este archivo la cabecera de correcciones y actualizar la tabla de
      [`PLANES/README.md`](./README.md)**

- [ ] **Step 7: Commit de documentación**

- [ ] **Step 8: Entregar los comandos de `push` y `gh pr create` a Alejandro**

- [ ] **Step 9: Verificar el CI con `gh run list` y el log de pgTAP con `gh run view --log`**

---

## Autorrevisión

**Cobertura del diseño.** §6.1 configuración → Task 1. §6.2 anti-doble-reserva → Task 2. §6.3 máquina de
estados → Task 3. §6.4 RPC de reserva → Task 4; la frase «cancelar también es una RPC», que el diseño
despacha en dos líneas, → Task 5. §6.5 sanciones → Task 6. **Sin huecos**, y dos añadidos sobre el
diseño: la validación de `slot_minutes` (que el diseño declara y no usa) y las dos RPC de admin (deuda
explícita de la tanda 1).

**Sin marcadores.** Cada migración y cada prueba van completas. Ninguna dice «similar a la anterior».

**Consistencia de nombres.** `blocked_range` y `set_blocked_range()` de la Task 2 son los que usa el
`EXCLUDE` de esa misma tarea y los que la Task 4 provoca al insertar. `create_reservation` mantiene los
cinco parámetros del diseño en el mismo orden en la migración, en las pruebas y en los `grant`.
`private.is_admin()`, `private.is_staff()` y `private.current_alumno_id()` son las firmas reales de la
tanda 1, verificadas en `20260805193357_private_helpers.sql`. Los UUID del seed coinciden con
`supabase/seed.sql`.

**Tres trampas que este plan evita a propósito.**

1. **Ninguna prueba usa fechas literales.** Una fecha fija sale de la ventana móvil de 7 días en cuanto
   pasa una semana, y la batería empezaría a fallar sola. Todas las horas se calculan como «mañana a las
   10:00 en Lima» respecto del momento de la corrida.
2. **Ninguna prueba usa `throws_ok` donde falta política.** Sin privilegio, Postgres lanza `42501`; sin
   política, el `UPDATE` afecta a cero filas **sin error**. Los intentos del alumno se verifican leyendo
   el valor después. Es el falso negativo que costó la tanda 1.
3. **El seed no lleva reservas.** `14_rls_alumnos.sql` afirma que el operador solo se ve a sí mismo
   mientras no haya reservas vivas. Sembrar una reserva rompería una prueba de la tanda anterior por un
   motivo que no tiene nada que ver con lo que esa prueba mide.

**Riesgo conocido.** Esta tanda es la primera que abre una vía de escritura sobre datos transaccionales.
Todo lo anterior fue cerrar puertas; esto es abrir una, y toda la seguridad del flujo de reserva depende
de que `create_reservation` sea la única. La comprobación que lo demuestra no está en ninguna prueba
funcional: está en que `inventory_reservations` no tiene `GRANT INSERT` para nadie. Si una tanda futura
concede ese privilegio «para simplificar», P1-9 vuelve entero.

**Deuda que se traslada a la tanda 3.** Las RPC de admin no dejan rastro en ninguna auditoría:
`reservation_status_log` es por reserva, y un cambio de `banned_until` no cae ahí. Si hace falta auditar
quién levantó una sanción, es una tabla nueva.
