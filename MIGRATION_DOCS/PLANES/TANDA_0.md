> ## ✅ Ejecutado el 2026-08-05 · tres desvíos
>
> El plan de abajo es **el que se escribió antes de ejecutar**, sin retocar. Lo que la realidad
> desmintió va acá, no editado dentro:
>
> 1. **`analytics` y `storage` no se apagan con `supabase start -x`.** No responden a ese flag; el
>    interruptor está en `config.toml`. Hasta descubrirlo, el arranque moría con
>    `LegacyHealthCheckTimeoutError`. Storage además no lo usa este proyecto: las imágenes van a Cloudinary.
> 2. **La lista de servicios excluibles no incluye `pgbouncer`**, que el plan daba por válido. Un nombre
>    inexistente hace fallar `supabase start` entero, así que el workflow habría reventado en el primer PR.
>    La lista real la da `supabase start --help`.
> 3. **`supabase db reset` exige el stack completo**, porque al terminar reinicia los contenedores. Con
>    servicios excluidos muere en `failed to bootstrap the local database`. El CI no lo usa: en un runner
>    limpio, `supabase start` ya crea la base, migra y siembra.
>
> Lo que sí salió como estaba previsto: la prueba de humo escrita primero con una aserción falsa
> (99 productos donde hay 4) falló por el motivo correcto antes de corregirla, y el experimento sobre
> `GRANT EXECUTE` confirmó la hipótesis y quedó como prueba permanente.

# Tanda 0 — Entorno local de Supabase · Plan de implementación

**Goal:** dejar el stack local de Supabase levantable y con pruebas pgTAP corriendo en el CI, sin tocar el
esquema remoto, y responder con evidencia la pregunta abierta de la sección 4 del diseño.

**Architecture:** `supabase init` genera `config.toml`. Una migración añade `btree_gist` (la necesita el
`EXCLUDE` de la tanda 2, y sí va a producción). `pgtap` va en `seed.sql`, que es local y **nunca se
empuja**, para no dejar funciones de test en la base de producción. Las pruebas viven en `supabase/tests/`
y las corre un workflow **separado** del CI de Node.

**Tech Stack:** Supabase CLI 2.111.0 · Docker 28.2.2 · PostgreSQL 17 · pgTAP · GitHub Actions

## Global Constraints

- Shell del desarrollador: **PowerShell 5.1**. Sin `&&`, sin `||`, sin here-strings.
- **Claude no escribe en el remoto.** `git push`, PRs y merges los ejecuta Alejandro.
- Proyecto Supabase canónico: `zqfkzgdyeqxzgzpxgadi`. **Hiberna**; reintentar si un comando falla.
- Docker Desktop debe estar arrancado (confirmado en marcha: 28.2.2).
- Toda modificación de esquema entra como **migración versionada del CLI**. Nada de SQL suelto.
- Rama de trabajo: `feature/fase-1-tanda-0`, sacada de `develop`.
- Mensajes de commit **sin acentos** (convención del historial).

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `supabase/config.toml` | Configuración del stack local. Generado por `supabase init`, luego ajustado |
| `supabase/migrations/<ts>_extensions.sql` | `btree_gist`. Va a producción |
| `supabase/seed.sql` | `pgtap` (solo local) + catálogo determinista con UUID fijos |
| `supabase/tests/00_smoke.sql` | El esquema de la línea base es el que creemos que es |
| `supabase/tests/01_grants_definer.sql` | Comportamiento confirmado del `REVOKE EXECUTE` sobre helpers |
| `.github/workflows/db.yml` | Levanta el stack y corre pgTAP. **Bloqueante** |

**Por qué un workflow separado y no un job dentro de `ci.yml`:** `ci.yml` verifica la app Vite, que
desaparece en la Fase 2; `db.yml` verifica la base, que sobrevive. Además el job de base necesita Docker y
tarda bastante más, y mezclarlos haría esperar a las comprobaciones rápidas de Node.

---

### Task 1: Inicializar el stack local

**Files:**
- Create: `supabase/config.toml`
- Modify: `.gitignore` si `supabase init` deja artefactos nuevos

**Interfaces:**
- Produces: un `supabase/config.toml` con `project_id = "UPC-Inventario"`, sobre el que se apoyan todas
  las tareas siguientes.

- [ ] **Step 1: Verificar que no hay `config.toml` previo**

Run: `Test-Path supabase/config.toml`
Expected: `False` (Q-8 dice que falta; confirmarlo antes de generar nada)

- [ ] **Step 2: Inicializar**

Run: `npx supabase init`
Expected: crea `supabase/config.toml`. Si pregunta por ajustes de VS Code o IntelliJ, responder que no:
este repositorio no versiona configuración de editor.

- [ ] **Step 3: Levantar el stack por primera vez**

Run: `npx supabase start`
Expected: descarga imágenes (varios minutos la primera vez) y termina imprimiendo `API URL`, `DB URL`,
`anon key`. Aplica la línea base `20260805030123_baseline.sql`.

- [ ] **Step 4: Confirmar que la línea base se aplicó**

Run: `npx supabase migration list --local`
Expected: `20260805030123` aparece como aplicada en local.

- [ ] **Step 5: Commit**

```
git add supabase/config.toml .gitignore
git commit -m 'Tanda 0.1: inicializa el stack local de Supabase' -m 'Genera supabase/config.toml con supabase init. Cierra la parte de Q-8 que bloqueaba supabase start.'
```

---

### Task 2: Extensiones

**Files:**
- Create: `supabase/migrations/<timestamp>_extensions.sql`

**Interfaces:**
- Produces: `btree_gist` disponible en el esquema `extensions`. La tanda 2 la necesita para
  `EXCLUDE USING gist (unit_id WITH =, blocked_range WITH &&)`: sin ella, gist no sabe indexar `uuid`
  con el operador `=`.

- [ ] **Step 1: Crear la migración**

Run: `npx supabase migration new extensions`
Expected: crea un archivo vacío con marca de tiempo.

- [ ] **Step 2: Escribir el contenido**

```sql
-- btree_gist permite mezclar un tipo escalar (unit_id uuid, con el operador =) y un rango
-- (blocked_range tstzrange, con &&) dentro del mismo indice gist. Es el requisito del
-- EXCLUDE anti-solape de la tanda 2. Ver MIGRATION_DOCS/FASE_1_DISENO.md, seccion 6.2.
create extension if not exists btree_gist with schema extensions;
```

- [ ] **Step 3: Aplicar y verificar**

Run: `npx supabase db reset`
Expected: aplica línea base + esta migración + seed, sin errores.

Run: `npx supabase test db` no aplica todavía. Verificar a mano con:
`npx supabase db reset; if ($?) { Write-Output 'reset ok' }`

- [ ] **Step 4: Commit**

```
git add supabase/migrations
git commit -m 'Tanda 0.2: anade la extension btree_gist' -m 'Requisito del EXCLUDE anti-solape de la tanda 2.'
```

---

### Task 3: Seed determinista

**Files:**
- Create: `supabase/seed.sql`

**Interfaces:**
- Produces: UUID fijos que todas las pruebas posteriores dan por ciertos:
  - Sedes: `cccccccc-0000-0000-0000-000000000001` (Monterrico), `…0002` (San Miguel)
  - Carreras: `caaaaaaa-0000-0000-0000-00000000000{1..5}`
  - Productos: `bbbbbbbb-0000-0000-0000-00000000000{1..4}`
  - Unidades: `dddddddd-0000-0000-0000-00000000000{1..8}`

**Nota de alcance:** el seed solo puebla lo que el esquema de hoy admite. `staff_members`,
`app_settings`, `max_duration_hours` y `buffer_minutes` no existen todavía; el seed crece en cada tanda.
Los alumnos tampoco entran aquí: dependen de filas en `auth.users`, que es trabajo de la tanda 1.

- [ ] **Step 1: Escribir el seed**

```sql
-- Seed determinista para desarrollo y pruebas locales.
-- NO se aplica al proyecto remoto: `supabase db push` solo empuja migrations/.
--
-- Los UUID estan escritos a mano y son estables a proposito: las pruebas pgTAP
-- los referencian directamente. No regenerarlos.

-- pgtap vive aca y no en una migracion para que las funciones de prueba
-- nunca lleguen a la base de produccion.
create extension if not exists pgtap with schema extensions;

insert into public.campuses (id, name, address, activo) values
  ('cccccccc-0000-0000-0000-000000000001', 'Monterrico', 'Av. Primavera 2390, Santiago de Surco', true),
  ('cccccccc-0000-0000-0000-000000000002', 'San Miguel', 'Av. Alameda San Marcos, San Miguel', true);

insert into public.carreras (id, nombre, codigo, activa) values
  ('caaaaaaa-0000-0000-0000-000000000001', 'Ingenieria de Software', 'ISW', true),
  ('caaaaaaa-0000-0000-0000-000000000002', 'Ciencias de la Computacion', 'CC', true),
  ('caaaaaaa-0000-0000-0000-000000000003', 'Ingenieria de Sistemas', 'ISI', true),
  ('caaaaaaa-0000-0000-0000-000000000004', 'Diseno Grafico', 'DG', true),
  ('caaaaaaa-0000-0000-0000-000000000005', 'Comunicacion Audiovisual', 'CAV', true);

insert into public.products (id, name, category, description, featured, sort_order) values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'Camara Sony A7 III', 'Fotografia', 'Camara full frame sin espejo', true, 1),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'Tripode Manfrotto', 'Fotografia', 'Tripode de aluminio con cabezal de bola', false, 2),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'Laptop Dell XPS 15', 'Computo', 'Laptop de alto rendimiento', true, 3),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'Microfono Rode NTG4', 'Audio', 'Microfono de cañon direccional', false, 4);

-- Reparto pensado para las pruebas: el producto 1 tiene 3 unidades en Monterrico
-- (permite probar rotacion justa), el 2 tiene una sola (agotamiento), el 3 esta en
-- las dos sedes (filtro por sede) y el 4 tiene una unidad en mantenimiento
-- (que no debe ofrecerse nunca).
insert into public.inventory_units (id, product_id, campus_id, unit_code, asset_code, status) values
  ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'CAM-001', 'UPC-100001', 'active'),
  ('dddddddd-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'CAM-002', 'UPC-100002', 'active'),
  ('dddddddd-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001', 'CAM-003', 'UPC-100003', 'active'),
  ('dddddddd-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000002', 'cccccccc-0000-0000-0000-000000000001', 'TRI-001', 'UPC-100004', 'active'),
  ('dddddddd-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000001', 'LAP-001', 'UPC-100005', 'active'),
  ('dddddddd-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000003', 'cccccccc-0000-0000-0000-000000000002', 'LAP-002', 'UPC-100006', 'active'),
  ('dddddddd-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002', 'MIC-001', 'UPC-100007', 'active'),
  ('dddddddd-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000004', 'cccccccc-0000-0000-0000-000000000002', 'MIC-002', 'UPC-100008', 'maintenance');

insert into public.disabled_days (id, date, reason) values
  ('eeeeeeee-0000-0000-0000-000000000001', date '2026-12-25', 'Navidad');
```

- [ ] **Step 2: Aplicar**

Run: `npx supabase db reset`
Expected: termina sin errores e informa que aplicó el seed.

- [ ] **Step 3: Verificar los conteos**

Run: `npx supabase db reset; if ($?) { npx supabase test db }` — todavía no hay tests; verificar a mano
consultando la base con el `DB URL` que imprimió `supabase start`.

- [ ] **Step 4: Commit**

```
git add supabase/seed.sql
git commit -m 'Tanda 0.3: seed determinista para desarrollo y pruebas' -m 'UUID fijos escritos a mano. pgtap se crea aca y no en una migracion para que no llegue a produccion.'
```

---

### Task 4: Prueba de humo del esquema

**Files:**
- Create: `supabase/tests/00_smoke.sql`

**Interfaces:**
- Consumes: los UUID del seed de la Task 3.
- Produces: la confirmación de que el arnés pgTAP funciona de punta a punta. Todas las pruebas de las
  tandas siguientes copian esta estructura (`begin` / `plan(n)` / aserciones / `finish` / `rollback`).

- [ ] **Step 1: Escribir la prueba, que debe fallar primero**

Escribir con un `plan(9)` pero **una aserción de mentira** para comprobar que un fallo se ve como fallo:

```sql
begin;
select plan(9);

select has_table('public', 'alumnos', 'existe public.alumnos');
select has_table('public', 'inventory_reservations', 'existe public.inventory_reservations');
select has_table('public', 'reservation_status_log', 'existe public.reservation_status_log');

select has_type('public', 'reservation_status', 'existe el enum reservation_status');
select has_type('public', 'unit_status', 'existe el enum unit_status');

select has_extension('extensions', 'btree_gist', 'btree_gist instalada');

select is((select count(*)::int from public.campuses), 2, 'el seed cargo 2 sedes');
select is((select count(*)::int from public.inventory_units), 8, 'el seed cargo 8 unidades');
select is((select count(*)::int from public.products), 99, 'ASERCION DE MENTIRA, debe fallar');

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: FAIL en la novena aserción, con `have: 4` / `want: 99`. Si pasara, el arnés no está corriendo
de verdad y hay que averiguar por qué antes de seguir.

- [ ] **Step 3: Corregir la aserción de mentira**

Cambiar `99` por `4` y el mensaje por `'el seed cargo 4 productos'`.

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase test db`
Expected: `All tests successful.` con 9 aserciones.

- [ ] **Step 5: Commit**

```
git add supabase/tests/00_smoke.sql
git commit -m 'Tanda 0.4: prueba de humo del esquema con pgTAP' -m 'Verifica tablas, enums, extensiones y conteos del seed. Confirmada con una asercion falsa antes de corregirla.'
```

---

### Task 5: Resolver la pregunta abierta del diseño

La sección 4 de `FASE_1_DISENO.md` deja anotado: *si a un helper `SECURITY DEFINER` se le revoca
`EXECUTE` a `authenticated`, ¿sigue evaluándose dentro de una política RLS?* La tanda 1 escribe todas las
políticas apoyándose en helpers de ese tipo, así que la respuesta hay que tenerla **antes**, y medida, no
supuesta.

**Files:**
- Create: `supabase/tests/01_grants_definer.sql`
- Modify: `MIGRATION_DOCS/FASE_1_DISENO.md` (sección 4, registrar el resultado)

**Interfaces:**
- Produces: la regla confirmada sobre `GRANT EXECUTE` en helpers de política, que la tanda 1 aplica en
  todos sus helpers.

- [ ] **Step 1: Montar el experimento y observar el resultado**

Todo ocurre dentro de una transacción que se revierte, así que no deja rastro en el esquema:

```sql
begin;
select plan(2);

create schema probe;
create table probe.t (id int primary key);
alter table probe.t enable row level security;
insert into probe.t values (1);

create function probe.allowed() returns boolean
  language sql stable security definer set search_path = '' as $$ select true $$;

create policy p on probe.t for select to authenticated using ((select probe.allowed()));
grant usage on schema probe to authenticated;
grant select on probe.t to authenticated;

-- Caso A: EXECUTE concedido
grant execute on function probe.allowed() to authenticated;
set local role authenticated;
select is((select count(*)::int from probe.t), 1,
  'con EXECUTE concedido, la politica evalua y devuelve la fila');
reset role;

-- Caso B: EXECUTE revocado. PUBLIC lo recibe por defecto al crear la funcion,
-- asi que hay que revocarselo tambien.
revoke execute on function probe.allowed() from authenticated, public;
set local role authenticated;
select throws_ok(
  'select count(*) from probe.t',
  '42501',
  null,
  'con EXECUTE revocado, la politica falla con permission denied'
);
reset role;

select * from finish();
rollback;
```

- [ ] **Step 2: Correr y leer el resultado sin prejuzgar**

Run: `npx supabase test db`

Hay dos desenlaces posibles y **los dos son información útil**:

- **Ambas pasan** → la hipótesis del diseño era correcta: el `REVOKE` rompe la política. Regla para la
  tanda 1: **conceder `EXECUTE` a `authenticated`** sobre los helpers, y confiar el aislamiento al
  esquema `private`, que PostgREST no expone.
- **La segunda falla** → la política sigue evaluándose pese al `REVOKE`. Entonces el `REVOKE` sí endurece
  sin romper, y la tanda 1 lo aplica. Reescribir esa aserción para que afirme lo observado.

- [ ] **Step 3: Ajustar la prueba a lo observado**

La prueba que queda en el repositorio debe afirmar el comportamiento **real**, no la hipótesis. Si el
caso B se comportó al revés, cambiar `throws_ok` por `is(...)` con el valor observado y corregir el
mensaje.

- [ ] **Step 4: Confirmar que pasa**

Run: `npx supabase test db`
Expected: `All tests successful.` en los dos archivos de prueba.

- [ ] **Step 5: Registrar el hallazgo en el diseño**

Reemplazar el bloque «Punto a verificar antes de escribir políticas» de la sección 4 de
`FASE_1_DISENO.md` por el resultado medido, citando el archivo de prueba que lo respalda. Añadir una
línea a la bitácora de `ESTADO_Y_PLAN.md`.

- [ ] **Step 6: Commit**

```
git add supabase/tests/01_grants_definer.sql MIGRATION_DOCS/FASE_1_DISENO.md MIGRATION_DOCS/ESTADO_Y_PLAN.md
git commit -m 'Tanda 0.5: resuelve el punto abierto sobre GRANT EXECUTE en helpers de politica' -m 'Experimento reproducible en supabase/tests/01_grants_definer.sql. El resultado queda registrado en el diseno.'
```

---

### Task 6: CI de base de datos

**Files:**
- Create: `.github/workflows/db.yml`

**Interfaces:**
- Consumes: `supabase/config.toml`, las migraciones, el seed y los dos archivos de prueba.
- Produces: un check bloqueante en cada PR hacia `develop`.

- [ ] **Step 1: Escribir el workflow**

```yaml
name: Base de datos

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop]

concurrency:
  group: db-${{ github.ref }}
  cancel-in-progress: true

jobs:
  pgtap:
    name: Migraciones y pruebas pgTAP
    runs-on: ubuntu-latest

    steps:
      - name: Clonar el repositorio
        uses: actions/checkout@v7

      # Fijada a la misma version que se usa en local, para que un cambio de
      # comportamiento del CLI no aparezca solo en CI.
      - name: Instalar la CLI de Supabase
        uses: supabase/setup-cli@v1
        with:
          version: 2.111.0

      # Se excluyen los servicios que las pruebas no usan. Solo hacen falta
      # Postgres y las migraciones; levantar Studio, Realtime o Storage
      # alargaria el arranque varios minutos sin aportar nada.
      - name: Levantar Postgres y aplicar migraciones y seed
        run: supabase start -x studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,pgbouncer,mailpit,supavisor

      - name: Pruebas pgTAP
        run: supabase test db

      - name: Detectar deriva entre migraciones y esquema
        run: supabase db diff --local --schema public
```

**A diferencia de `ci.yml`, este workflow es bloqueante.** El lint de Node no lo es por D-7, porque
corrige código que la Fase 2 elimina. Acá es al revés: es exactamente el trabajo que se está entregando.

- [ ] **Step 2: Verificar la sintaxis en local**

Run: `npx supabase start -x studio,imgproxy,realtime,storage-api,edge-runtime,logflare,vector,pgbouncer,mailpit,supavisor`
Expected: arranca solo Postgres y sus dependencias. Si algún nombre de servicio no existe en la CLI
2.111.0, el comando lo dice; quitar el que sobre de la lista **y del workflow**.

- [ ] **Step 3: Confirmar que las pruebas siguen pasando con el stack recortado**

Run: `npx supabase test db`
Expected: `All tests successful.`

- [ ] **Step 4: Commit**

```
git add .github/workflows/db.yml
git commit -m 'Tanda 0.6: workflow de CI para migraciones y pruebas pgTAP' -m 'Separado de ci.yml porque verifica la base, que sobrevive a la Fase 2, y es bloqueante a diferencia del lint.'
```

---

### Task 7: Cierre documental y entrega

**Files:**
- Modify: `MIGRATION_DOCS/ESTADO_Y_PLAN.md` (tarea 1.0, Q-8, bitácora)
- Modify: `MIGRATION_DOCS/FASE_1_DISENO.md` (sección 4, marcar la tanda 0 como cerrada)

- [ ] **Step 1: Marcar 1.0 como hecha y cerrar Q-8**
- [ ] **Step 2: Añadir la entrada de bitácora con lo que costó y lo que se aprendió**
- [ ] **Step 3: Commit de documentación**
- [ ] **Step 4: Entregar a Alejandro los comandos de `push` y `gh pr create`**
- [ ] **Step 5: Verificar el CI con `gh run list` y `gh run view --log-failed` si falla**

---

## Autorrevisión

**Cobertura del diseño (§4).** `supabase init` → Task 1. `btree_gist` → Task 2. `pgtap` → Task 3.
`seed.sql` determinista con UUID fijos → Task 3. CI corriendo `supabase test db` → Task 6. Punto a
verificar sobre `REVOKE EXECUTE` → Task 5. **Sin huecos.**

**Sin marcadores.** Ningún «TBD» ni «etcétera»: el seed va completo, las pruebas van completas y el
workflow va completo.

**Consistencia de nombres.** Los UUID del seed (Task 3) son los que consultan las pruebas (Task 4). El
nombre del esquema del experimento es `probe` en todos los pasos de la Task 5. La versión de la CLI es
2.111.0 tanto en local como en el workflow.

**Riesgo asumido.** La lista de servicios de `-x` puede no coincidir con la de la CLI 2.111.0. Por eso el
paso 2 de la Task 6 la verifica en local antes de que el workflow llegue al remoto.
