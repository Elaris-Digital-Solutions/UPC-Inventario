# UPC-Inventario — Estado del proyecto y plan de implementación

> **Documento vivo.** Es la referencia de dónde estamos y qué falta. Se actualiza al cerrar cada fase.
> Complementos: [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md) describe *qué hace* el sistema
> actual, y [`FASE_1_DISENO.md`](./FASE_1_DISENO.md) describe *cómo se construye* la base de datos nueva.
> Este documento describe *en qué estado está* y *cómo se reconstruye*.
> [`PLANES/`](./PLANES/) guarda el desglose paso a paso de cada tanda, con las correcciones que trajo
> ejecutarlo.
>
> Última actualización: **2026-08-05**

---

## 1. Resumen ejecutivo

Sistema de reserva y préstamo de equipamiento tecnológico para alumnos UPC. Construido con IA en una etapa
temprana, **nunca lanzado a producción**. Se reconstruye en Next.js conservando el lenguaje visual y las
reglas de negocio, y descartando el código.

**Decisión de orden: la base de datos primero, Next.js después.** La BD es el único componente que la
migración no reemplaza; todo lo que se corrija ahí se capitaliza una sola vez. Además, el arreglo correcto
del agujero de autorización es RLS en Postgres, no un backend — poner la autorización en Next.js dejando RLS
permisivo solo movería el problema, porque PostgREST sigue expuesto.

**Estado general:** ⚠️ No apto para producción. **Un** defecto crítico abierto: **P0-3** (tokens de sesión
propios firmados con la cadena literal `'signature'`), que se cierra en la Fase 2 al pasar a Supabase Auth.
P0-1 y P0-4 se cerraron en la Fase 0; **P0-2 y P0-5 en la tanda 1 de la Fase 1**. Ninguno llegó a
explotarse porque no hay usuarios ni datos personales.

---

## 2. Inventario del estado actual

### 2.1 Aplicación

| | |
|---|---|
| Stack | React 18.3 · Vite 7.3 · TypeScript 5.8 · Tailwind 3.4 · shadcn/ui · TanStack Query 5.83 · react-router 6.30 · supabase-js 2.97 |
| Despliegue | Netlify (SPA, sin cabeceras de seguridad) |
| Tamaño | 13.402 líneas TS/TSX — 3.954 de shadcn generado, 9.448 propias |
| Build | ✅ Funciona (16 s). Bundle único de 755 kB (223 kB gzip), sin code-splitting |
| Typecheck | ⚠️ `tsc --noEmit` pasa, pero con `strict`, `noImplicitAny` y `strictNullChecks` en `false` |
| Tests | ❌ Uno solo, trivial (`expect(true).toBe(true)`) |
| CI/CD | ❌ Inexistente. No hay `.github/` |
| Git | 50 commits. `main` y `develop` publicadas; trabajo en `feature/*`. Tag `legacy/vite-final` → `f39d2e9`. Rama remota `refactor` huérfana *(Q-7)* |

### 2.2 Base de datos

Proyecto canónico: **`zqfkzgdyeqxzgzpxgadi`** ("Inventario UPC", us-west-1, PostgreSQL 17.6). Hiberna por
inactividad; cualquier consulta lo despierta.

> El `.env` todavía apunta a `jgqebhvbovtpsjoujgdw`, un proyecto **deprecado** al que ya no hay acceso.
> Corregirlo es la tarea 0.1.

| Con datos | Vacías |
|---|---|
| `carreras` 60 · `campuses` 2 · `products` 34 · `product_images` 34 · `inventory_units` 92 · `inventory_unit_notes` 58 · `disabled_days` 2 | `auth.users` · `alumnos` · `inventory_reservations` · `reservation_status_log` · `final_satisfaction_surveys` |

**Catálogo cargado, cero datos transaccionales y cero datos personales.** Esto da libertad total para
rediseñar el esquema sin migrar datos y sin riesgo sobre información de alumnos.

Faltante en la BD:
- ❌ Todas las RPCs que el código invoca. La única función es `fn_update_updated_at`.
- ❌ Todas las políticas de escritura. Las 13 políticas existentes son de lectura, salvo `alumnos_update_own` y las de encuestas.
- ❌ Cualquier noción de rol administrativo.
- ✅ ~~Historial de migraciones~~ — resuelto en 0.6: línea base `20260805030123` registrada en local y
  remoto. Antes el esquema se había aplicado pegando SQL a mano.

Avisos del linter de Supabase:

| Nivel | Aviso |
|---|---|
| 🔴 ERROR | Vista `product_availability` con `SECURITY DEFINER` — saltea el RLS de quien consulta |
| 🟡 WARN | `fn_update_updated_at` sin `search_path` fijo |
| 🔵 INFO | `reservation_status_log` con RLS activo y cero políticas |

### 2.3 Deuda documental

23 archivos `.sql` sueltos en `supabase/` con numeración colisionada (**dos `003_`, dos `004_`**) y 11 sin
numerar. Contienen **cinco versiones sucesivas** de la misma RPC de reserva y **tres modelos incompatibles**
de lista negra. No son reconstruibles en orden; sirven solo como referencia arqueológica.

---

## 3. Defectos abiertos

Detalle y evidencia en la auditoría; acá el registro de seguimiento.

### 🔴 Críticos

| ID | Defecto | Ubicación | Estado |
|---|---|---|---|
| P0-1 | Contraseña de administrador `123456789` literal en el código | `src/context/AuthContext.tsx:21` | ✅ Corregido *(0.3)* |
| P0-2 | Autorización de admin únicamente en React; ~40 escrituras privilegiadas salen del navegador con la clave anónima | `Admin.tsx`, `VerificationPanel.tsx`, `ReservationsPanel.tsx`, `AdminDisabledDays.tsx`, `AdminUnits.tsx`, `ProductContext.tsx` | ✅ Corregido en la base *(tanda 1)*. La autorización vive en `staff_members` + RLS. Queda quitar el `if (isAdmin)` del cliente en la Fase 2 |
| P0-3 | Tokens de sesión firmados con la cadena literal `'signature'`, verificación sin validar firma | `src/services/AuthService.ts:224-258` | Abierto → Fase 2 |
| P0-4 | `VITE_CLOUDINARY_API_SECRET` con prefijo `VITE_` en `.env` | `.env` | ✅ Corregido *(0.2)* |
| P0-5 | Registro con `INSERT` directo en `alumnos` como anónimo si falla la RPC | `src/pages/Register.tsx:105-114` | ✅ Corregido *(tanda 1)* |

> **Corrección del diagnóstico de P0-2 (2026-08-05).** La auditoría lo describe como «~40 escrituras
> privilegiadas salen del navegador con la clave anónima». Verificado contra la línea base: las once tablas
> tienen RLS activo y **solo políticas de `SELECT`**. Un `INSERT` o `UPDATE` de admin se deniega por falta de
> política. Es decir, **el panel de administración no funciona contra el proyecto canónico**; no hay una vía
> de escritura abierta. El riesgo real es lo que entraría si las políticas de escritura de la tarea 1.2 se
> escribieran permisivas. No rebaja la prioridad: la sube, porque la Fase 1 es el momento en que se abre esa
> superficie.
>
> **El agujero que sí está vivo es P1-10, y está mal calibrado como «alto».** `alumnos_update_own` es
> `FOR UPDATE USING (auth_user_id = auth.uid())` **sin `WITH CHECK`**, y `authenticated` tiene `GRANT ALL`
> sobre la tabla. Un alumno puede ponerse `banned_until = NULL` y **levantarse su propia sanción**, o
> reescribir `email`, `activo` y `auth_user_id`. Mismo defecto en `surveys_update_own`. En la práctica anula
> el modelo de penalizaciones completo. Se cierra en la tanda 1.

> **Corrección del diagnóstico de P0-4 (2026-08-04).** La auditoría lo clasificó como crítico por exposición
> del secreto. La verificación posterior lo desmiente en dos puntos: **(a)** ningún archivo de `src/`
> referencia `VITE_CLOUDINARY_API_SECRET`, y Vite solo sustituye las `import.meta.env.VITE_*` citadas
> literalmente — `grep` sobre `dist/` confirma que el secreto **nunca estuvo en el bundle desplegado**;
> **(b)** `.env` nunca se versionó. Los dos commits del historial que tocan `env` son sobre `.env.example`,
> que solo contenía nombres de variable sin valores. **El secreto no se filtró en ningún momento.** Era una
> trampa armada, no detonada: bastaba con que alguien escribiera una referencia para que entrara al bundle.
> Rotar la credencial queda como higiene recomendable, no como respuesta a un incidente.

### 🟠 Altos

| ID | Defecto |
|---|---|
| P1-6 | ✅ **Corregido en la tanda 2.** Doble reserva posible: se consultaba y luego se insertaba, sin constraint que lo impidiera. Ahora lo impide `inventory_reservations_no_overlap`, un `EXCLUDE USING gist` parcial sobre `blocked_range` |
| P1-7 | ✅ **Corregido en la tanda 2.** Filtro de conflictos invertido: bloqueaba con `completed` e ignoraba `active`. Corregido de raíz: el estado ya no puede ir de cualquier sitio a cualquier otro |
| P1-8 | **El flujo de reserva está roto:** `Number()` sobre un `alumno_id` UUID produce `NaN` (`ReservationOnboarding.tsx:313`). Vive en código que la Fase 2 borra |
| P1-9 | ✅ **Corregido en la tanda 2.** Reglas de negocio en el cliente, saltables llamando a la API. Ahora viven en `create_reservation`, y nadie tiene `INSERT` sobre `inventory_reservations`: no hay otra puerta |
| P1-10 | ✅ **Corregido en la tanda 1.** Políticas para el rol `public` en vez de `TO authenticated`; `UPDATE` sin `WITH CHECK`. Era el único defecto explotable de verdad: permitía a un alumno levantarse su propia sanción |

### 🟡 Deuda

Sin migraciones versionadas · TypeScript no estricto · sin tests · sin CI · sin cabeceras de seguridad ·
código muerto (`server/`, `src/api/supabaseRPC.ts`, `AuthContextNew.tsx`, dependencia `pg`) · Excels de
inventario versionados en la raíz.

---

## 4. Qué se conserva y qué se descarta

| Se conserva | Se descarta |
|---|---|
| **Lenguaje visual** — `src/index.css` + `tailwind.config.ts` (~230 líneas: paleta UPC, Montserrat/Playfair, sombras, gradientes, modo oscuro). Copia directa. | Todo el código de aplicación (~9.400 líneas) |
| **Componentes shadcn** — se regeneran nativos para App Router, no se portan | La capa de datos y autenticación completa |
| **Reglas de negocio** — 20 reglas documentadas en la especificación funcional | Los 23 SQL sueltos (quedan como referencia) |
| **Datos de catálogo** — 34 productos, 92 unidades, 60 carreras, 2 sedes | Las columnas denormalizadas `stock`, `in_stock`, `current_note` |

---

## 5. Decisiones firmes

| ID | Decisión | Fecha |
|---|---|---|
| D-0 | Base de datos primero, Next.js después | 2026-08-03 |
| D-1 | Duración máxima configurable por producto (`products.max_duration_hours`), no constante global | 2026-08-04 |
| D-2 | Dos roles (admin / operador) con cuentas individuales y trazabilidad completa de quién entregó y recibió cada equipo | 2026-08-04 |
| D-3 | Ventana de reserva móvil de 7 días configurable, reemplaza la ventana semanal con corte dominical | 2026-08-04 |
| D-4 | Reconstrucción desde cero en Next.js; el proyecto actual queda congelado como referencia | 2026-08-04 |
| D-5 | **Se mantiene el repositorio `UPC-Inventario`.** Next.js reemplaza al Vite en la raíz; no se abre repo nuevo. Evita duplicar CI, protecciones y secretos, y conserva la continuidad del historial de decisiones | 2026-08-04 |
| D-6 | **El código Vite se congela con el tag anotado `legacy/vite-final`** y se borra del árbol en el primer commit de la Fase 2. **Sin carpeta `legacy/`:** el historial ya es el archivo, y una carpeta muerta obliga a excluirla de lint, typecheck y CI, y vuelve ambiguo qué código está vivo. Recuperación: `git show legacy/vite-final:<ruta>` | 2026-08-04 |
| D-7 | El lint **no bloquea** el CI hasta cerrar la Fase 2. Los 59 errores viven en código que la migración elimina; corregirlos sería trabajo tirado | 2026-08-04 |
| D-8 | **Los cuatro Excel de inventario se versionan** (`Monterrico`, `San Miguel`, `Inventario_Unificado`, `Inventario_2026_CC_ISW_V1 1`). Revierte la parte de 0.7 que los sacaba del repositorio: son el origen de los datos de catálogo, pesan 182 kB en total, y tenerlos en `main` pero no en `develop` hacía que git los borrara del disco al saltar entre ramas | 2026-08-04 |
| D-9 | **Autenticación primero, perfil después.** Desaparece el registro previo: un trigger sobre `auth.users` crea la fila en `alumnos` ya vinculada cuando el correo termina en `@upc.edu.pe`, y el alumno completa nombre, apellido y carrera en su primer ingreso. Cierra P0-5 **por ausencia de política**, no por validación: `anon` nunca necesita `INSERT`. Deja sin efecto BR-02 — el dominio pasa a ser la única puerta | 2026-08-05 |
| D-10 | **Buffer por producto** (`products.buffer_minutes`, 120 por defecto), en espejo de D-1. El buffer es tiempo de retorno —revisar, cargar batería, limpiar— y eso varía por equipo. *Cierra Q-1* | 2026-08-05 |
| D-11 | **El operador es estrictamente operativo.** Lee las reservas que va a entregar o recibir, con nombre y correo del alumno porque lo necesita en el mostrador, y escribe anotaciones de unidad. Sin estadísticas, sin inventario, sin acceso a `alumnos` fuera de sus reservas vigentes. *Cierra Q-3* | 2026-08-05 |
| D-12 | **Un único modelo de sanción:** `alumnos.banned_until`, poblado por un solo trigger. Se descartan las tres variantes de `inventory_blacklist`. El disparador de los 15 días son **2 `not_picked_up` acumuladas en los últimos 90 días**, no dos de por vida: si no, el alumno queda a un fallo del bloqueo para siempre. `not_returned` sigue siendo permanente. *Resuelve C-2 y C-3* | 2026-08-05 |
| D-13 | **Privilegios por columna además de RLS.** Se revocan los `GRANT ALL` de la línea base y se otorga por operación y por columna. RLS no sabe de columnas: `WITH CHECK` ve la fila nueva y nunca la vieja, así que no puede impedir que un valor concreto cambie. El `GRANT` sí | 2026-08-05 |
| D-14 | **Las pruebas se escriben en pgTAP**, no en Vitest. Un arnés en JavaScript se apoya en el toolchain de Vite, que la Fase 2 borra; las pruebas en SQL sobreviven a la migración y viven junto a las migraciones que verifican | 2026-08-05 |
| D-15 | **Los 23 `.sql` sueltos se borran en la tanda 3** de la Fase 1, no antes: son referencia útil justo mientras se reescribe esa misma lógica. *Cierra Q-9* | 2026-08-05 |
| D-16 | **Mueve el estado de una reserva todo el personal, admin y operador.** Quien está en el mostrador es quien sabe si el equipo se entregó, si volvió o si nadie lo recogió. La máquina de estados ya impide los saltos absurdos, así que partir la política entre los dos roles añadiría complejidad sin cerrar ningún agujero. Una sola política, `reservations_update_staff` | 2026-08-05 |
| D-17 | **Las migraciones se empujan al remoto al cerrar la Fase 1, después de la tanda 3.** No por tanda. Una migración empujada es inmutable en la práctica, y dentro de la fase todavía hay que rehacer archivos —pasó con `20260806004020`, corregida después de aplicarse—. Además nadie consume el remoto hoy, y los advisors, que corren contra él, solo dan señal limpia una vez que la tanda 3 haya cerrado sus tres avisos conocidos | 2026-08-05 |

---

## 6. Plan de implementación

### Fase 0 · Fundaciones

*Objetivo: dejar el repositorio y el entorno en condiciones de trabajar. No toca el esquema.*

- [x] **0.0** Congelar el código Vite con el tag anotado `legacy/vite-final` → `f39d2e9` *(D-6)*
- [x] **0.1** Apuntar `.env` al proyecto canónico `zqfkzgdyeqxzgzpxgadi`
- [x] **0.2** Quitarle el prefijo `VITE_` al secreto de Cloudinary — *rotación pendiente, ver Q-6*
- [x] **0.3** Eliminar `ADMIN_PASSWORD` del código (`AuthContext.tsx:21`)
- [~] **0.4** Rama `develop` creada, publicada y con la Fase 0 integrada. **Protecciones aplazadas** — ver Q-5
- [x] **0.5** Workflow de CI en `.github/workflows/ci.yml` *(lint y auditoría no bloqueantes, D-7)*
- [x] **0.6** Línea base `supabase/migrations/20260805030123_baseline.sql` (899 líneas), presente en
      local y en el historial remoto. Contenido verificado contra la base: 11 tablas, 2 enums,
      13 políticas, 5 triggers `updated_at`, 7 índices, 1 vista
- [x] **0.7** Añadir `*.stackdump`, `supabase/.temp` y `supabase/.branches` al `.gitignore`.
      Los `*.xlsx` se ignoran por defecto **con excepción nominal de los cuatro inventarios** *(D-8)*

**Terminado cuando:** un PR a `develop` corre CI en verde y `supabase migration list` muestra la línea base.
→ ✅ **CUMPLIDO el 2026-08-05.**

**Corridas reales de GitHub Actions** (verificadas con `gh run list`):

| Corrida | Rama | Disparador | Resultado |
|---|---|---|---|
| PR #1 · Fase 0 fundaciones | `feature/fase-0-fundaciones` | `pull_request` | ✅ success · 39 s |
| merge #1 | `develop` | `push` | ✅ success · 42 s |
| PR #2 · Fase 0 baseline | `feature/fase-0-baseline` | `pull_request` | ✅ success · 34 s |
| merge #2 | `develop` | `push` | ✅ success · 48 s |

**D-7 confirmado en la práctica:** el paso de lint aparece en las anotaciones como
`Process completed with exit code 1`, y aun así el job cierra en verde. El `continue-on-error`
hace lo que debía — reporta sin frenar.

**Estado de los pasos** (verificado en local, 2026-08-04):

| Paso | Resultado |
|---|---|
| `typecheck` | ✅ exit 0 — pero con `strict`, `noImplicitAny` y `strictNullChecks` en `false` |
| `lint` | ❌ exit 1 — 59 errores, 14 warnings. No bloqueante por D-7 |
| `test` | ✅ 1 test, trivial |
| `build` | ✅ 18,3 s · bundle único de 755 kB |

### Fase 1 · Base de datos

*Objetivo: un esquema correcto, seguro y probado, del que Next.js sea el primer consumidor.*

> **Diseño aprobado el 2026-08-05: [`FASE_1_DISENO.md`](./FASE_1_DISENO.md).** Contiene el SQL concreto de
> cada tarea, las pruebas y los riesgos. Se implementa en **cuatro tandas, un PR por tanda**, cada una con
> sus pruebas — los tests no se dejan para el final.

**Tanda 0 · Entorno local** *(cierra Q-8; no toca el esquema)*

- [x] **1.0** `supabase init`, `config.toml` versionado, extensiones `btree_gist` y `pgtap`, `seed.sql`
      determinista con UUID fijos, y el CI corriendo `supabase test db` — **cerrada el 2026-08-05**,
      11 aserciones pgTAP en verde

**Tanda 1 · Identidad y autorización**

- [x] **1.1** Esquema `private` con helpers `SECURITY DEFINER` + tabla `staff_members` *(D-2, D-11)*
- [x] **1.2** Revocar los `GRANT ALL` de la línea base; privilegios por operación y por columna, y políticas
      RLS completas `TO authenticated` con `USING` y `WITH CHECK` *(D-13, cierra P1-10 y P0-2)*
- [x] **1.3** Trazabilidad: `created_by` por `DEFAULT auth.uid()` con `GRANT` acotado, y trigger de
      `reservation_status_log` sobre una tabla solo-anexar *(D-2)*
- [x] **1.3-bis** Trigger de alta de alumno sobre `auth.users` *(D-9, cierra P0-5)*

> **Tanda 1 cerrada el 2026-08-05.** 8 migraciones, 62 aserciones pgTAP. Las 12 tablas de `public` con RLS
> activo y al menos una política, vigilado por `supabase/tests/18_rls_coverage.sql`.

**Tanda 2 · Reglas de reserva**

- [x] **1.4** `products.max_duration_hours`, `products.buffer_minutes` y tabla `app_settings` *(D-1, D-3, D-10)*
- [x] **1.5** RPC única de reserva: perfil completo, sanción, ventana móvil, feriados, horario en
      `America/Lima`, duración por producto, límite diario y rotación justa *(corrige P1-9, C-4, C-7, M-8)*
- [x] **1.6** Columna `blocked_range` por trigger + `EXCLUDE USING gist` parcial *(corrige P1-6)*
- [x] **1.7** Máquina de estados con transiciones válidas *(corrige P1-7)*
- [x] **1.8** Sanciones en un único trigger *(D-12, resuelve C-2 y C-3)*
- [x] **1.8-bis** `cancel_reservation` con motivo obligatorio *(BR-17)*, y `admin_set_ban` /
      `admin_set_alumno_activo`, que cierran la deuda que la tanda 1 dejó anotada: `banned_until` y
      `activo` no tienen `GRANT` para nadie, así que sin RPC nadie podía levantar una sanción a mano

> **Tanda 2 cerrada el 2026-08-05.** 6 migraciones, 46 aserciones pgTAP nuevas (108 en total). Las reglas
> de negocio dejan de ser saltables: `create_reservation` es la única puerta de entrada, y nadie tiene
> `INSERT` sobre `inventory_reservations`. Detalle y correcciones en
> [`PLANES/TANDA_2.md`](./PLANES/TANDA_2.md).

**Tanda 3 · Derivados, linter y limpieza**

- [ ] **1.9** Avisos del linter: `security_invoker` en la vista, `search_path` en la función, políticas de
      lectura para `reservation_status_log`
- [ ] **1.10** Disponibilidad por franja sobre `product_availability` — **ver corrección abajo**
- [ ] **1.11** Batería pgTAP completa: RLS, constraint, RPC, máquina de estados y sanciones *(D-14)*
- [ ] **1.12** Borrar los 23 `.sql` sueltos de `supabase/` *(D-15, cierra Q-9)*

> **Corrección a la tarea 1.10 (2026-08-05).** El plan original decía «eliminar `stock`, `in_stock`,
> `current_note`». **Esas columnas no existen en el esquema canónico** — eran del proyecto deprecado
> `jgqebhvbovtpsjoujgdw`. La vista `product_availability` ya deriva el stock. 1.10 se reduce a afinarla.

**Terminado cuando:** los advisors de seguridad no reportan nada, los tests de RLS pasan, y toda la lógica de
integridad es inviolable desde un cliente que llame a la API directamente.

### Fase 2 · Aplicación Next.js

*Objetivo: reconstruir la interfaz sobre una BD ya correcta.*

- [ ] **2.1** Proyecto Next.js (App Router) + `@supabase/ssr` + shadcn inicializado
- [ ] **2.2** Copiar tokens de diseño; migrar las fuentes a `next/font`
- [ ] **2.3** Tipos generados con `supabase gen types` (nunca escritos a mano)
- [ ] **2.4** Autenticación: magic link + Microsoft, con middleware de sesión
- [ ] **2.5** Flujo público: landing, FAQ, login, registro
- [ ] **2.6** Flujo del alumno: catálogo, detalle, reserva, panel, encuesta
- [ ] **2.7** Flujo del operador: verificación operativa (entregas y recepciones)
- [ ] **2.8** Flujo del admin: inventario, imágenes, reservas, días inhabilitados, estadísticas
- [ ] **2.9** Subida firmada a Cloudinary desde route handler *(cierra P0-4)*
- [ ] **2.10** Cabeceras de seguridad: CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`
- [ ] **2.11** E2E con Playwright sobre los flujos críticos

**Terminado cuando:** los flujos de la especificación funcional se reproducen, con E2E en verde y sin
lógica de autorización en el cliente.

---

## 7. Convenciones de trabajo

> Las reglas de esta sección están resumidas en [`CLAUDE.md`](../CLAUDE.md), en la raíz del repositorio,
> para que se carguen solas al abrir una sesión. Si una regla cambia, actualizar **los dos**.

### 7.0 Regla operativa: quién toca el remoto

**Claude no escribe en el remoto.** Nada de `git push`, PRs, merges, ramas remotas ni protecciones de rama.
Trabaja en local (editar, `git add`, commits locales cuando se le pida) y **entrega los comandos listos para
PowerShell** para que Alejandro los ejecute, con una línea explicando qué hace cada uno.

**Excepción de solo lectura, acordada el 2026-08-05:** Claude puede consultar el remoto para diagnosticar —
`gh run list`, `gh run view --log-failed`, `gh pr checks`, `gh pr view`, `gh api` sobre endpoints de lectura,
`git ls-remote`. Sirve para leer el estado del CI sin que Alejandro tenga que copiar y pegar salidas.
Cualquier comando que modifique el repositorio sigue siendo suyo.

> Recordatorio de sintaxis: el shell es **PowerShell 5.1**. No admite `&&` ni `||`. Encadenar con `;` o
> `if ($?) { ... }`.

Repositorio remoto: `https://github.com/Elaris-Digital-Solutions/UPC-Inventario.git`

### 7.1 Ramas y pipelines

**Ramas (Gitflow):** `main` (producción) · `develop` (integración) · `feature/*` `fix/*` `hotfix/*` `release/*`.
Sin push directo a `main` ni `develop`; todo entra por PR con checks en verde.

**Pipelines:**

| Disparador | Corre |
|---|---|
| PR → `develop` | install · typecheck · lint · tests unitarios · build · auditoría de dependencias |
| `develop` | lo anterior + tests de integración y RLS + advisors de Supabase como check bloqueante + preview |
| `main` | build · despliegue · smoke tests |

**Pirámide de tests, por orden de prioridad:**
1. **RLS** — un alumno no puede leer ni escribir datos de otro; un operador no puede borrar inventario.
2. **Unitarios** — solapamiento, duración, validación de correo, límite diario, ventana móvil.
3. **Integración** — contra `supabase start` local con seed determinista.
4. **E2E** — registro, ingreso, reserva, cancelación, ciclo de entrega y recepción.

**Migraciones:** toda modificación de esquema entra como migración versionada del CLI. Nada de SQL suelto.

---

## 8. Pendientes de decisión

| # | Tema | Estado |
|---|---|---|
| Q-1 | ¿El buffer de 2 h entre reservas debería ser por producto, como la duración? | ✅ **Cerrado el 2026-08-05** → D-10: sí, `products.buffer_minutes` |
| Q-2 | ¿El corte dominical existía a propósito para que el personal cerrara la semana planificada? Si sí, se revierte D-3 | Abierto |
| Q-3 | ¿Qué permisos exactos tiene el operador sobre estadísticas? (¿solo lectura, o nada?) | ✅ **Cerrado el 2026-08-05** → D-11: ninguno. Estrictamente operativo |
| Q-4 | ¿Se necesitan notificaciones por correo al alumno? (confirmación, recordatorio, vencimiento) | Propuesto como M-10, sin decidir |
| Q-5 | **Protección de `main` y `develop`** — aplazada el 2026-08-04. `enforce_admins: true` junto a `required_approving_review_count: 1` bloquea los merges propios cuando no hay un segundo revisor, y hace falta confirmar quién tiene rol de admin en la organización. Sin protección el CI corre igual en cada PR; solo deja de ser bloqueante | Aplazado |
| Q-6 | ¿Rotar la credencial de Cloudinary? Ya no es urgente: se verificó que el secreto nunca llegó al bundle ni al historial de git (ver nota bajo P0-4). Queda como higiene | Abierto |
| Q-7 | La rama remota `refactor` sigue huérfana. ¿Se borra o guarda algo aprovechable? | Abierto |
| Q-8 | **No hay `supabase/config.toml`.** `link` solo creó `.temp/`. Hace falta `supabase init` antes de poder levantar el stack local con `supabase start`, que es donde correrán los tests de RLS e integración de la Fase 1 | ✅ **Cerrado el 2026-08-05** con la tanda 0 (tarea 1.0) |
| Q-9 | **Los 23 `.sql` sueltos siguen en `supabase/`**, conviviendo con `migrations/`. Ya son redundantes: la línea base los reemplaza y las reglas están en la especificación funcional. Se borran en la Fase 1 o se dejan hasta la Fase 2 | ✅ **Cerrado el 2026-08-05** → D-15: en la tanda 3 (tarea 1.12) |
| Q-10 | **15 vulnerabilidades de dependencias** (1 crítica en `vitest`; altas en `vite`, `postcss`, `undici`, `ws`, `lodash`, `js-yaml`). Dependabot reporta 58 porque cuenta por ruta y no agrupa por paquete. Casi todas son `devDependencies` del stack Vite que la Fase 2 elimina, y el sistema no está desplegado. Revisar contra el árbol de Next.js en vez de parchear el actual | Abierto → Fase 2 |
| Q-11 | **`min_duration_minutes` = 15 contra `slot_minutes` = 30.** La RPC exige que la hora de inicio caiga en un bloque, pero no que la duración sea múltiplo de uno: una reserva de 15 minutos empieza alineada y **termina** a mitad de bloque, dejando un hueco que nadie puede pedir. O la duración mínima sube a 30, o se acepta el hueco a propósito. Abierto el 2026-08-05 al implementar la tanda 2 | Abierto |

---

## 9. Anexo A · Runbook de comandos (PowerShell)

> **Los ejecuta Alejandro, no Claude** (ver 7.0). Shell: PowerShell 5.1 — sin `&&`, sin `||`.
> Repositorio: `Elaris-Digital-Solutions/UPC-Inventario`

**Restricciones del entorno, verificadas el 2026-08-04:**

1. **`gh` 2.97.0 instalado el 2026-08-05** y autenticado como `Elkfle` (scopes `repo`, `workflow`,
   `read:org`, `gist`). Los bloques de este anexo que lo usan ya funcionan. Alternativa por web para
   abrir PRs, si se prefiere:
   `https://github.com/Elaris-Digital-Solutions/UPC-Inventario/compare/develop...<rama>?expand=1`
   > Si una sesión no reconoce `gh` recién instalado, refrescar el `PATH` sin cerrar la terminal:
   > `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
2. **Nada de here-strings `@'...'@`.** Al pegarlos en la consola interactiva, el prompt de continuación
   rompe el bloque. Los comandos van **en una sola línea**, y `git commit` usa varios `-m` en vez de un
   mensaje multilínea.
3. **Comillas simples** cuando el texto lleve `<`, `>` o `*`: PowerShell no expande nada dentro de ellas.

### A.1 · Crear y publicar `develop` *(tarea 0.4)*

```powershell
git checkout main
git pull origin main
git checkout -b develop
git push -u origin develop
```

### A.2 · Proteger `main` y `develop` *(tarea 0.4)*

Requiere `gh auth login` previo.

```powershell
$body = @'
{
  "required_status_checks": null,
  "enforce_admins": true,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
'@
$body | gh api --method PUT "repos/Elaris-Digital-Solutions/UPC-Inventario/branches/main/protection" -H "Accept: application/vnd.github+json" --input -
```

Repetir cambiando `/branches/main/` por `/branches/develop/`.

> **Si el repositorio es privado en plan gratuito**, la protección clásica no está disponible por API y el
> comando falla. Alternativa que sí funciona en el plan gratuito: *Settings → Rules → Rulesets* en la web.

### A.3 · Abrir una rama de trabajo

```powershell
git checkout develop
git pull origin develop
git checkout -b feature/fase-0-fundaciones
```

Convención de nombres: `feature/*` para funcionalidad, `fix/*` para correcciones, `hotfix/*` para urgencias
sobre `main`.

### A.4 · Publicar la rama y abrir el PR

```powershell
git push -u origin feature/fase-0-fundaciones
```

Sin `gh`, se abre por la web (comprobar que la base sea `develop`, no `main`):

```powershell
Start-Process 'https://github.com/Elaris-Digital-Solutions/UPC-Inventario/compare/develop...feature/fase-0-fundaciones?expand=1'
```

Con `gh` instalado, en una sola línea:

```powershell
gh pr create --base develop --head feature/fase-0-fundaciones --title 'Fase 0: fundaciones' --body 'Resumen de la fase. Tareas cerradas: 0.1, 0.3, 0.5, 0.7'
```

### A.5 · Verificar estado

```powershell
git status --short --branch
git log --oneline -10
gh pr list --state open
```

### A.6 · Supabase CLI *(tarea 0.6)*

Verificado contra la **CLI 2.111.0** el 2026-08-04. Un comando por línea:

```powershell
npx supabase login
```
```powershell
npx supabase link --project-ref zqfkzgdyeqxzgzpxgadi
```
```powershell
npx supabase db pull baseline --linked
```
```powershell
npx supabase migration list
```

> `db pull` pide la contraseña de Postgres del proyecto (dashboard → Settings → Database). Se puede pasar
> con `-p <password>`, pero conviene escribirla en el prompt para que no quede en el historial del shell.
>
> El proyecto **hiberna** por inactividad. Si un comando falla por ese motivo, volver a ejecutarlo: la
> primera llamada lo despierta.
>
> `supabase link` crea `supabase/.temp/` con estado local de la máquina. Está en `.gitignore`; no versionarlo.

---

## 10. Bitácora

| Fecha | Hito |
|---|---|
| 2026-08-03 | Auditoría integral. Se detectan los dos proyectos Supabase y se define el orden BD → Next.js |
| 2026-08-04 | Especificación funcional completa por ingeniería inversa. Decisiones D-1, D-2, D-3, D-4 |
| 2026-08-04 | **Fase 0.** Decisiones D-5, D-6, D-7. Tag `legacy/vite-final` publicado; `develop` creada. Cerradas 0.0–0.3, 0.5, 0.7. P0-1 corregido; **P0-4 reclasificado tras verificar que el secreto nunca se filtró**. Protecciones de rama aplazadas *(Q-5)*. Queda 0.6 |
| 2026-08-04 | `feature/fase-0-fundaciones` mergeada a `develop` (`5359770`). `main` intacta en `f39d2e9`: la migración no la toca hasta que haya algo desplegable |
| 2026-08-04 | **Incidente: los 4 Excel desaparecieron del disco.** El `git pull` que llevó `develop` de `f39d2e9` a `5359770` aplicó al working tree la eliminación que introdujo la tarea 0.7. No fue el `git rm --cached`, que nunca toca el disco. Recuperados intactos desde `legacy/vite-final` y versionados de nuevo *(D-8)*. Lección: mientras una rama versione un archivo y otra no, saltar entre ellas lo crea y lo borra |
| 2026-08-04 | Supabase CLI 2.111.0 instalada, `login` y `link --project-ref zqfkzgdyeqxzgzpxgadi` correctos. Flags de `db pull` verificados contra la versión real |
| 2026-08-05 | **Tarea 0.6 cerrada.** Línea base `20260805030123_baseline.sql` generada y registrada en el historial remoto. Dos obstáculos resueltos: Docker Desktop estaba instalado pero apagado, y un primer intento fallido dejó un archivo de migración de 0 bytes. **La CLI sugería `migration repair --status applied`, que habría sido un error**: el sobrante era local, no remoto — la tabla `supabase_migrations.schema_migrations` ni siquiera existía en el servidor. Se resolvió borrando el archivo huérfano |
| 2026-08-05 | **FASE 0 CERRADA.** PR #2 mergeado (`e7ff433`). Las 4 corridas de CI en verde. Ramas `feature/fase-0-*` borradas en local y remoto. `gh` 2.97.0 instalado y autenticado: Claude puede consultar el estado del CI en modo lectura; las escrituras siguen siendo de Alejandro. Nuevos pendientes Q-8 (falta `config.toml`), Q-9 (23 SQL sueltos), Q-10 (vulnerabilidades de dependencias) |
| 2026-08-05 | PR #3: actions del CI a v7, desaparece el aviso de deprecación de Node 20 |
| 2026-08-05 | PR #4: `CLAUDE.md` en la raíz con las reglas operativas, versionado para que viaje con el repositorio. CI en verde en `develop` (`31032952184`, 38 s) |
| 2026-08-05 | **Arranca la Fase 1.** Diseño completo del esquema en `FASE_1_DISENO.md`, aprobado. Decisiones D-9 a D-15; cerrados Q-1, Q-3 y Q-9. **Dos correcciones a la auditoría al leer la línea base:** (a) P0-2 no es una vía de escritura abierta sino una aplicación rota —RLS activo sin políticas de escritura deniega los `INSERT` de admin—, y (b) el defecto que sí está vivo es P1-10, catalogado como «alto» pero capaz de anular el modelo de penalizaciones entero: sin `WITH CHECK`, un alumno se levanta su propia sanción. **Corrección al plan:** la tarea 1.10 se reduce, porque `stock`, `in_stock` y `current_note` no existen en el esquema canónico |
| 2026-08-05 | **TANDA 1 CERRADA.** 8 migraciones y 62 aserciones pgTAP. Cierra **P0-2** en la base (la autorización vive en `staff_members` + RLS; queda quitar el `if (isAdmin)` del cliente en la Fase 2), **P0-5** (el alta de alumno la hace un trigger sobre `auth.users`, así que `anon` nunca necesita `INSERT`) y **P1-10** (el alumno ya no puede levantarse su propia sanción). Las 12 tablas con RLS activo y políticas, vigilado por `18_rls_coverage.sql` |
| 2026-08-05 | **La trampa que se descubrió antes de crear nada.** La línea base traía un `ALTER DEFAULT PRIVILEGES` que concedía **todos** los privilegios a `anon` y `authenticated` sobre cada tabla nueva de `public`. Medido creando una tabla vacía: salía con `anon=arwdDxtm`, o sea con `INSERT`, `UPDATE` y `DELETE`. `staff_members` —la tabla que decide quién es administrador— habría nacido escribible por el rol anónimo. Por eso la primera migración de la tanda no crea nada: revoca. Contados antes: 14 privilegios heredados por tabla nueva y 39 permisos de escritura para `anon` |
| 2026-08-05 | **Tres correcciones al diseño, descubiertas al implementar.** (a) La sanción **no puede vivir en un `GRANT`**: un privilegio de columna se concede a un rol, y `authenticated` incluye a los alumnos, así que dárselo al admin lo reabría todo. `activo` y `banned_until` no se conceden a nadie; los escribirá el trigger de la tanda 2, que hereda además la deuda de una RPC para levantar sanciones a mano. (b) **Una política que consulta otra tabla protegida hereda sus políticas**: `alumnos` ↔ `inventory_reservations` dio `infinite recursion detected in policy`, resuelto con el helper `private.tiene_reserva_viva()`. (c) **Falta de privilegio y falta de política fallan distinto**: la primera lanza `42501`, la segunda deja el `UPDATE` en cero filas sin error. Una prueba escrita con `throws_ok` donde tocaba comprobar el efecto da un falso negativo |
| 2026-08-05 | **Tanda 0 cerrada.** Stack local en marcha, `config.toml` versionado, `btree_gist` como migración, `seed.sql` determinista y workflow `db.yml` **bloqueante**. 11 aserciones pgTAP en verde. La prueba de humo se escribió primero con una aserción falsa a propósito (99 productos donde hay 4) y se confirmó que fallaba, antes de corregirla: sin ese paso no habría forma de saber si el arnés estaba corriendo de verdad |
| 2026-08-05 | **Dos desvíos de la tanda 0.** (a) `analytics` y `storage` **no se apagan con `supabase start -x`**; su interruptor es `config.toml`, y hasta descubrirlo el arranque moría con `LegacyHealthCheckTimeoutError`. Storage además no lo usa este proyecto, que guarda las imágenes en Cloudinary. (b) La lista de servicios excluibles de la CLI 2.111.0 **no incluye `pgbouncer`**, que el plan daba por válido; un nombre inexistente hace fallar el arranque entero, así que el workflow habría reventado en el primer PR. (c) **`supabase db reset` exige el stack completo**: al terminar reinicia los contenedores y con servicios excluidos muere en `failed to bootstrap the local database`. El CI no lo necesita, porque en un runner limpio `supabase start` ya crea la base, migra y siembra |
| 2026-08-05 | **Pregunta abierta del diseño, resuelta con evidencia.** Revocar `EXECUTE` a un helper `SECURITY DEFINER` **rompe** la política RLS que lo usa (`permission denied for function`, SQLSTATE `42501`), no la endurece: la expresión de una política se evalúa como el usuario que consulta. La tanda 1 **concede** `EXECUTE`; el aislamiento lo da el esquema `private`, fuera de `api.schemas`. Prueba permanente en `supabase/tests/01_grants_definer.sql`. Detalle que casi se escapa: al crear una función, `PUBLIC` recibe `EXECUTE` por defecto, así que revocárselo solo a `authenticated` no cambia nada |
| 2026-08-05 | **Hallazgo técnico del diseño:** el `EXCLUDE` de la tarea 1.6 no puede calcular el buffer en la expresión del índice, porque `timestamptz - interval` es `STABLE` y los índices exigen `IMMUTABLE`. Se resuelve con una columna `blocked_range` poblada por trigger, que además permite el buffer por producto de D-10. El buffer se suma **solo al final** del rango: sumarlo a ambos lados duplicaría la separación exigida |
| 2026-08-05 | **TANDA 2 CERRADA.** 6 migraciones y 46 aserciones pgTAP nuevas, 108 en total. Cierra **P1-6** (`EXCLUDE USING gist` parcial sobre `blocked_range`, con el buffer por producto), **P1-7** (máquina de estados: el estado deja de poder ir de cualquier sitio a cualquier otro) y **P1-9** (las reglas viven en `create_reservation`, y nadie tiene `INSERT` sobre `inventory_reservations`, así que no hay otra puerta). Se añaden `cancel_reservation` con motivo obligatorio —BR-17 en el motor y no en un diálogo del navegador— y las dos RPC de admin que cierran la deuda de la tanda 1. Decisiones D-16 y D-17; abierto Q-11 |
| 2026-08-05 | **Dos trampas de la tanda 2 que no eran de lógica sino de forma.** (a) **`SET LOCAL` en una migración no hace nada:** la CLI aplica cada archivo fuera de un bloque de transacción y responde `WARNING (25P01)`. El `EXCLUDE` se creaba gracias al `search_path` que Supabase deja puesto en la base, no gracias al archivo — habría funcionado hasta que esa configuración cambiara. Se cualificó el opclass como `extensions.gist_uuid_ops`. (b) **El orden de las validaciones importa tanto como las validaciones:** la comprobación de bloque horario quedó antes que la de fecha pasada, así que a quien pedía una hora de ayer se le contestaba por la rejilla. Cuando varias reglas rechazan la misma entrada, contesta la más fundamental. Lo detectó una prueba que afirma el **mensaje**; con `throws_ok` sobre el SQLSTATE habría pasado en verde con el mensaje equivocado |
| 2026-08-05 | **La lección de la tanda 1, por el lado contrario.** Conceder `UPDATE (status, cancellation_reason)` a `authenticated` —necesario para que la política del personal tenga sobre qué aplicarse— rompió una prueba de la tanda 1 que afirmaba `42501`. Al alumno ya no le falta privilegio, le falta **política**, y sin política el `UPDATE` afecta a cero filas **sin error**. Sigue igual de cerrado, pero cambió el mecanismo que lo cierra. **Y una prueba propia pasaba por casualidad:** «cancelar libera la franja» estaba escrita sobre un producto con tres unidades, así que la rotación justa le daba otra unidad al segundo alumno y la aserción se cumplía sin que ninguna cancelación hubiera ocurrido — en verde antes de que la función existiera. Verla fallar es lo único que la delató |
