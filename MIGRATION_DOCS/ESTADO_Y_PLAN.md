# UPC-Inventario — Estado del proyecto y plan de implementación

> **Documento vivo.** Es la referencia de dónde estamos y qué falta. Se actualiza al cerrar cada fase.
> Complementos: [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md) describe *qué hace* el sistema
> actual, [`FASE_1_DISENO.md`](./FASE_1_DISENO.md) describe *cómo se construye* la base de datos nueva, y
> [`FASE_2_DISENO.md`](./FASE_2_DISENO.md), *cómo se construye* la aplicación Next.js.
> Este documento describe *en qué estado está* y *cómo se reconstruye*.
> [`PLANES/`](./PLANES/) guarda el desglose paso a paso de cada tanda, con las correcciones que trajo
> ejecutarlo.
>
> Última actualización: **2026-08-06**

---

## 1. Resumen ejecutivo

Sistema de reserva y préstamo de equipamiento tecnológico para alumnos UPC. Construido con IA en una etapa
temprana, **nunca lanzado a producción**. Se reconstruye en Next.js conservando el lenguaje visual y las
reglas de negocio, y descartando el código.

**Decisión de orden: la base de datos primero, Next.js después.** La BD es el único componente que la
migración no reemplaza; todo lo que se corrija ahí se capitaliza una sola vez. Además, el arreglo correcto
del agujero de autorización es RLS en Postgres, no un backend — poner la autorización en Next.js dejando RLS
permisivo solo movería el problema, porque PostgREST sigue expuesto.

**Estado general:** ⚠️ No apto para producción, pero **la base de datos ya lo es**. La Fase 1 cerró el
2026-08-05 con 19 migraciones y 124 aserciones pgTAP, contando el arreglo posterior de las funciones de
trigger. **Un** defecto crítico abierto: **P0-3** (tokens de sesión propios firmados con la cadena literal
`'signature'`), que se cierra en la Fase 2 al pasar a Supabase Auth. P0-1 y P0-4 se cerraron en la Fase 0; **P0-2 y P0-5 en la tanda 1**; **P1-6, P1-7 y P1-9 en
la tanda 2**; P1-10 en la tanda 1. Ninguno llegó a explotarse porque no hay usuarios ni datos personales.

**Lo que cambió de fondo:** las reglas de negocio dejaron de ser una convención del cliente y pasaron a ser
una propiedad del motor. No porque estén bien programadas, sino porque **nadie tiene `INSERT` sobre
`inventory_reservations`**: la única vía es `create_reservation`. Un cliente que llame a PostgREST
directamente con la clave anónima no tiene por dónde entrar.

**Empujado al remoto el 2026-08-05** *(D-17)*. `migration list` muestra las **19 migraciones** con `Local`
y `Remote` idénticos. El catálogo real sobrevivió —34 productos, 92 unidades— y `app_settings` llegó con su
fila: el riesgo de añadir columnas con `default` sobre tablas pobladas no se materializó. Los advisors
quedan en **5 avisos de seguridad, todos intencionales**.

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

Lo que faltaba en la BD, y que **ya está en el remoto** desde el `db push` del 2026-08-05:
- ✅ ~~Todas las RPCs que el código invoca~~ — `create_reservation`, `cancel_reservation`,
  `available_units`, `admin_set_ban` y `admin_set_alumno_activo`, más 5 helpers en `private` *(tandas 1 a 3)*.
- ✅ ~~Todas las políticas de escritura~~ — RLS completa con `USING` y `WITH CHECK`, y privilegios por
  columna *(tanda 1)*.
- ✅ ~~Cualquier noción de rol administrativo~~ — `staff_members` con `admin` y `operator` *(tanda 1)*.
- ✅ ~~Historial de migraciones~~ — resuelto en 0.6: línea base `20260805030123` registrada en local y
  remoto. Antes el esquema se había aplicado pegando SQL a mano.

Avisos del linter de Supabase:

| Nivel | Aviso | Estado |
|---|---|---|
| 🔴 ERROR | Vista `product_availability` con `SECURITY DEFINER` — saltea el RLS de quien consulta | ✅ **Cerrado en la tanda 3.** `security_invoker = on`, y `SELECT` revocado a `anon` *(D-18)*. No era teórico: medido antes de arreglarlo, un anónimo consultaba la vista sin error y veía el conteo de unidades |
| 🟡 WARN | `fn_update_updated_at` sin `search_path` fijo | ✅ **Cerrado en la tanda 3.** Recreada con el mismo cuerpo y la misma firma, así que los cinco triggers que la usan no se tocaron. Vigilado por `19_function_hardening.sql` |
| 🔵 INFO | `reservation_status_log` con RLS activo y cero políticas | ✅ **Cerrado en la tanda 1**, no en la 3: `log_select_own` ya le dio lectura al personal y al alumno sobre sus propias reservas, sin ningún `GRANT` de escritura |

> **Verificado contra el remoto el 2026-08-05, después del `db push`:** los tres han desaparecido del
> informe de advisors.

**Avisos nuevos, con el esquema completo ya en el remoto.** Ahora que los conocidos están cerrados, lo que
reportan es señal:

| Nivel | Aviso | Lectura |
|---|---|---|
| 🟡 WARN ×6 | `apply_penalties`, `handle_new_auth_user` y `log_reservation_status` son ejecutables como RPC por `anon` y `authenticated` | ✅ **Cerrado el 2026-08-05** con [`FIX_FUNCIONES_TRIGGER.md`](./PLANES/FIX_FUNCIONES_TRIGGER.md). Era la lección de la tanda 0 aplicada a medias: `PUBLIC` recibe `EXECUTE` por defecto y solo se le revocó a las cinco RPC de verdad. Se revocó a **las seis** funciones de trigger, no solo a las tres que marcaba el linter. Vigilado por `19_function_hardening.sql` |
| 🟡 WARN ×5 | `create_reservation`, `cancel_reservation`, `available_units`, `admin_set_ban` y `admin_set_alumno_activo` son ejecutables por `authenticated` | **Intencional: es el diseño entero.** Cada una comprueba la autorización por dentro. El linter las marca para que se confirme la intención. Pasarlas a `SECURITY INVOKER` rompería la Fase 1. **Se queda así** |

> **Lo que se aprendió al arreglarlo, y era la pregunta abierta:** **un trigger no necesita `EXECUTE` sobre
> su función.** Medido — tras revocarlo, las 124 aserciones pasan, incluidas `21`, `22` y `25`, que caerían
> en el acto si los triggers dejaran de dispararse.
>
> **Es lo contrario que con las políticas RLS**, donde la tanda 0 midió que revocar `EXECUTE` al helper
> **rompe** la política. La asimetría: a un trigger lo invoca el **motor**, mientras que la expresión de una
> política se evalúa como el usuario que consulta, así que necesita poder ejecutar lo que invoca.
>
> Eso explica por qué el esquema `private` fue la decisión correcta en la tanda 1 y no un capricho: con los
> helpers no se podía revocar sin romperlos, así que el aislamiento tuvo que venir del esquema. Con las
> funciones de trigger sí se puede. **Dos herramientas para el mismo fin, y cuál sirve depende de quién
> invoca la función.**

### 2.3 Deuda documental

✅ **Resuelta en la tanda 3 (tarea 1.12).** Eran archivos `.sql` sueltos en `supabase/` con numeración
colisionada (**dos `003_`, dos `004_`**) y 11 sin numerar, con **cinco versiones sucesivas** de la misma RPC
de reserva y **tres modelos incompatibles** de lista negra. Borrados el 2026-08-05 en `dea78ec`: 2.707
líneas. El historial de git es el archivo — `git show dea78ec^:supabase/<archivo>.sql` los recupera.

> **Corrección del conteo (2026-08-05).** La auditoría, D-15 y Q-9 hablan de «23 sueltos». Al borrarlos se
> vio que son **22**: el archivo número 23 era `supabase/seed.sql`, que no es deuda sino el seed
> determinista de las pruebas, y se queda. Los registros fechados no se reescriben; el número correcto es
> este.

**Deuda residual, no cerrada:** cinco documentos en la raíz —`DELIVERABLES.md`, `MIGRATION_GUIDE.md`,
`README_REFACTORING.md`, `SUPABASE_RPC_CHEATSHEET.md`, `SUPABASE_RPC_GUIDE.md`— y
`scripts/generate_inventory_seed.py` siguen apuntando a esos archivos. Ninguno es código ni CI, así que
nada se rompe, pero describen una arquitectura que ya no existe. Ver **Q-12**.

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
| **Reglas de negocio** — 20 reglas documentadas en la especificación funcional | ~~Los 23 SQL sueltos (quedan como referencia)~~ — borrados en la tanda 3, y eran 22 |
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
| D-18 | **Sin sesión, sin stock.** Al poner `security_invoker` en `product_availability`, un anónimo dejaría de ver `inventory_units` y la vista le devolvería ceros: diría «sin stock» de todo, que es peor que no decir nada. Se le revoca el `SELECT` sobre la vista. La landing muestra el catálogo; la disponibilidad se ve con sesión. Coherente con lo que la tanda 1 decidió sobre el inventario físico. **Si la Fase 2 necesita disponibilidad pública**, el arreglo no es quitar `security_invoker` sino dar a `anon` una política de lectura sobre `inventory_units` con el `GRANT` acotado a `(id, product_id, campus_id, status)` | 2026-08-05 |
| D-19 | **La duración de una reserva tiene que ser múltiplo de `slot_minutes`**, con mínimo un bloque. `min_duration_minutes` pasa de 15 a 30 y `create_reservation` gana una validación después de la de rango. El enunciado original de Q-11 era incompleto por dos lados: subir el mínimo a 30 **no** alinea nada (45 sigue sin ser múltiplo), y lo que desalinea la rejilla es `duración + buffer`, no la duración sola — con `buffer_minutes = 120`, una reserva de 10:00 a 10:15 bloquea hasta las **12:15**. *Cierra Q-11* | 2026-08-06 |
| D-20 | **`available_slots(...)`: la rejilla del día en una sola llamada**, en vez de 28 a `available_units`. No es solo velocidad: 28 llamadas son 28 fotos distintas de la base. Delega en `available_units` en vez de repetir la fórmula del rango, y filtra el pasado, los feriados y la ventana móvil, para que **todo lo que la rejilla ofrece lo acepte la RPC** | 2026-08-06 |
| D-21 | **La landing muestra catálogo, no disponibilidad.** `/` es una vitrina pública —`products` y `product_images` son legibles por `anon`— y `/catalogo`, con sus filtros por sede y BR-14, exige sesión. Un catálogo que filtra por un stock que no puede leer no es incompleto: **miente**. Cierra lo que D-18 dejó abierto, sin tocar la base | 2026-08-06 |
| D-22 | **App Router con grupos de rutas por perfil**, y el layout del grupo como comodidad, no como cerco: un layout no se vuelve a ejecutar al navegar entre rutas hermanas. El archivo de proxy se llama **`proxy.ts`, no `middleware.ts`** — Next.js 16 renombró Middleware a Proxy | 2026-08-06 |
| D-23 | **Los tokens de diseño se copian tal cual a `app/globals.css`; las fuentes pasan a `next/font`.** Se cae el `@import` de Google Fonts: es una petición bloqueante a un tercero y obligaría a abrirle la CSP de la tanda 4. Tailwind va a la 4, con el `theme.extend` traducido a `@theme` una vez | 2026-08-06 |
| D-24 | **Tres clientes de `@supabase/ssr` —navegador, servidor y proxy—, y ninguno compartido entre peticiones.** `lib/supabase/server.ts` exporta una **función**, nunca una constante de módulo: un singleton lleva dentro las cookies de una petición y termina sirviéndole a un alumno la sesión de otro | 2026-08-06 |
| D-25 | **`getClaims()` para proteger; `getSession()` nunca para decidir.** Medido el 2026-08-06 contra el JWKS del proyecto: firma con **ES256**, así que `getClaims()` verifica la firma en local con WebCrypto y no cuesta una llamada de red por petición. Con HS256 sí la costaría. `getSession()` lee la cookie sin revalidar: es **P0-3 otra vez**, con otro nombre | 2026-08-06 |
| D-26 | **Los tipos salen de `supabase gen types`, y un paso del CI comprueba que no estén desactualizados.** Un tipo viejo no rompe la compilación: da un `any` silencioso o un campo que el editor autocompleta y la base no tiene. Mismo modo de fallo silencioso que persiguió la Fase 1 | 2026-08-06 |
| D-27 | **La Fase 2 se implementa en cinco tandas, una por perfil**, un PR cada una. En la Fase 1 cada tanda dejaba una propiedad verificable del motor; aquí, un perfil que puede hacer su trabajo entero, que es lo que un E2E puede afirmar | 2026-08-06 |
| D-28 | **Clave publicable `sb_publishable_…`, no la `anon` heredada en formato JWT.** Rotación independiente. Y en Next.js **cualquier variable `NEXT_PUBLIC_` viaja al navegador**: es la trampa de P0-4 con otro prefijo | 2026-08-06 |
| D-30 | **Los tokens de diseño se escriben en formato de color completo** —`hsl(356 95% 45%)`—, no en el HSL crudo del Vite —`356 95% 45%`—, y el `@theme` los referencia con `var(--x)` en vez de envolverlos con `hsl(var(--x))`. **Los valores no cambian: uno a uno son los mismos, y el aspecto tampoco.** El motivo salió al ejecutar: `shadcn init` escribe sus tokens en formato completo y los inyecta **al final** de `globals.css`, así que gana por cascada — `--primary` pasó de rojo UPC a `oklch(0.205 0 0)` sin un solo error ni warning, con el build en verde. Los dos formatos no conviven en un mismo `@theme`, y conservar el viejo obligaría a limpiar esa inyección en cada `shadcn add` de las tandas 2 y 3 | 2026-08-06 |
| D-29 | **Solo quedan `main` y `develop`.** Se borran las 10 ramas ya integradas —sus commits siguen alcanzables desde `develop`, así que no se pierde nada— y **`refactor` se congela primero en el tag anotado `legacy/refactor-marzo`**, porque era la única referencia que sostenía `c3f5c1f` y borrarla lo habría dejado inalcanzable. Mismo patrón que D-6 con el Vite. Se hace **antes de la tanda 0** y no después: a partir de ese commit cada rama vieja difiere en ~13.000 líneas, y este repositorio ya perdió los cuatro Excel del disco una vez por saltar entre ramas que versionaban distinto. *Cierra Q-7* | 2026-08-06 |

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

- [x] **1.9** Avisos del linter: `security_invoker` en la vista y `search_path` en la función. Las
      políticas de `reservation_status_log` ya las había puesto la tanda 1, así que eran dos y no tres
- [x] **1.10** Disponibilidad por franja — **como función `available_units(...)`, no como columna de la
      vista:** depende de la franja que se pregunte y una vista no recibe parámetros
- [x] **1.11** Batería pgTAP *(D-14)*. No hubo que escribirla: las tandas 1 y 2 ya la habían dejado casi
      entera, así que se taparon los tres huecos que quedaban y se añadió `19_function_hardening.sql`
- [x] **1.12** Borrar los `.sql` sueltos de `supabase/` *(D-15, cierra Q-9)* — **22, no 23**

> **Tanda 3 cerrada el 2026-08-05.** 2 migraciones, 123 aserciones pgTAP, y 2.707 líneas de SQL muerto
> fuera. Detalle en [`PLANES/TANDA_3.md`](./PLANES/TANDA_3.md).

> **Corrección a la tarea 1.10 (2026-08-05).** El plan original decía «eliminar `stock`, `in_stock`,
> `current_note`». **Esas columnas no existen en el esquema canónico** — eran del proyecto deprecado
> `jgqebhvbovtpsjoujgdw`. La vista `product_availability` ya deriva el stock. 1.10 se reduce a afinarla.

**Terminado cuando:** los advisors de seguridad no reportan nada, los tests de RLS pasan, y toda la lógica de
integridad es inviolable desde un cliente que llame a la API directamente.

→ ✅ **FASE 1 CERRADA el 2026-08-05, y cumplida entera**, advisors incluidos. Se cerró primero con la
salvedad de que estaban pendientes —corren contra el remoto y las migraciones no se habían empujado—; el
mismo día se empujaron, los advisors destaparon un frente real, se arregló, y se volvieron a correr.

| | |
|---|---|
| Migraciones | 19, `Local` y `Remote` idénticos |
| Aserciones pgTAP | 124, en 20 archivos, verdes en el CI |
| Defectos cerrados | P0-2, P0-5, P1-6, P1-7, P1-9, P1-10 |
| Avisos de seguridad | 5, **todos intencionales**: las RPC de `authenticated`, que comprueban la autorización por dentro |
| Avisos de rendimiento | 22, todos prematuros *(Q-13)* |

**Verificado contra el remoto el 2026-08-05, después del arreglo:** los advisors bajaron de 11 avisos a 5,
y los 5 son exactamente los que se decidió dejar. Ninguna función de trigger aparece ya.

Toda la lógica de integridad es inviolable desde un cliente que llame a la API directamente: la única vía
de creación de reservas es `create_reservation`, porque **nadie tiene `INSERT` sobre
`inventory_reservations`**.

### Fase 2 · Aplicación Next.js

*Objetivo: reconstruir la interfaz sobre una BD ya correcta.*

> **Diseño escrito el 2026-08-06: [`FASE_2_DISENO.md`](./FASE_2_DISENO.md).** Contiene la estructura del
> App Router, dónde viven los tokens, cómo se conecta `@supabase/ssr`, el flujo de autenticación, el
> inventario de rutas por perfil y los riesgos. Se implementa en **cinco tandas, una por perfil, un PR
> cada una** *(D-27)*.

**Principio rector, y es lo único que hay que no estropear:** la autorización ya vive en la base. Ningún
control del cliente es un control. El proxy redirige, el layout es comodidad, el componente oculta, y
**quien decide es RLS**. La prueba mental: *un `curl` con la clave publicable y una cookie válida, ¿qué
consigue?* La respuesta tiene que ser la misma con la interfaz y sin ella. Corolario verificado: **la
aplicación nunca usa `service_role`** — si un flujo la necesitara, no falta una clave, falta una política.

| Tanda | Contenido | Tareas | Estado |
|---|---|---|---|
| **T0** · Cimientos | Borrar Vite y los documentos muertos, Next.js 16 + App Router + Tailwind con los tokens + shadcn, tipos generados, CI adaptado, y **las dos últimas migraciones: D-19 y D-20** | 2.1, 2.2, 2.3 · D-6 · Q-12 | ✅ **cerrada** |
| **T1** · Sesión | `@supabase/ssr`, `proxy.ts`, magic link y Microsoft, `/completar-perfil`, primer admin | 2.4, 2.4-bis | pendiente |
| **T2** · Alumno | Landing, FAQ, catálogo, detalle, **el calendario**, reserva, panel, cancelación, encuesta | 2.5, 2.6 | pendiente |
| **T3** · Personal | Mostrador, inventario, imágenes con firma, reservas, días, estadísticas, personal | 2.7, 2.8, 2.9 | pendiente |
| **T4** · Endurecimiento | Cabeceras, E2E, lint y auditoría bloqueantes, Q-10, Q-13 | 2.10, 2.11 | pendiente |

> **La migración de D-19 y D-20 va en T0, no en T2 donde se usa**, para que ninguna otra tanda toque SQL.
> Es la última migración del proyecto, y así los tipos que genera T0 salen ya del esquema definitivo.
>
> **Riesgo anotado: T2 es la tanda grande.** Si al escribir su plan pasa de unas quince tareas, se parte en
> dos —«catálogo y detalle» y «reserva y panel»— y son seis PR. Se decide escribiendo el plan, no a mitad
> de ejecutarlo.

- [ ] **2.1** Proyecto Next.js (App Router) + `@supabase/ssr` + shadcn inicializado
- [ ] **2.2** Copiar tokens de diseño; migrar las fuentes a `next/font` *(D-23)*
- [ ] **2.3** Tipos generados con `supabase gen types` (nunca escritos a mano) *(D-26)*
- [ ] **2.3-bis** **La última migración:** duración múltiplo del bloque *(D-19)* y `available_slots` *(D-20)*
- [ ] **2.4** Autenticación: magic link + Microsoft, con `proxy.ts` de sesión *(D-22, D-25)*
- [ ] **2.4-bis** **Sembrar el primer miembro del personal en el remoto.** Va justo después de 2.4 y no
      antes: `auth.users` está vacío porque hasta ese momento nada usa Supabase Auth, así que el `insert`
      no encontraría a nadie e insertaría **cero filas sin dar error**. Una sentencia puntual con
      `service_role`, después de que esa persona haya entrado con su cuenta UPC:
      `insert into public.staff_members (user_id, role) select id, 'admin' from auth.users where email = '<correo>@upc.edu.pe';`
- [ ] **2.5** Flujo público: landing como vitrina sin stock *(D-21)*, FAQ, login. **Sin registro** *(D-9)*
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
| Q-7 | La rama remota `refactor` sigue huérfana. ¿Se borra o guarda algo aprovechable? | ✅ **Cerrado el 2026-08-06** → D-29: congelada en el tag anotado `legacy/refactor-marzo` y borrada, igual que se hizo con el Vite en D-6 |
| Q-8 | **No hay `supabase/config.toml`.** `link` solo creó `.temp/`. Hace falta `supabase init` antes de poder levantar el stack local con `supabase start`, que es donde correrán los tests de RLS e integración de la Fase 1 | ✅ **Cerrado el 2026-08-05** con la tanda 0 (tarea 1.0) |
| Q-9 | **Los 23 `.sql` sueltos siguen en `supabase/`**, conviviendo con `migrations/`. Ya son redundantes: la línea base los reemplaza y las reglas están en la especificación funcional. Se borran en la Fase 1 o se dejan hasta la Fase 2 | ✅ **Cerrado el 2026-08-05** → D-15: en la tanda 3 (tarea 1.12) |
| Q-10 | **15 vulnerabilidades de dependencias** (1 crítica en `vitest`; altas en `vite`, `postcss`, `undici`, `ws`, `lodash`, `js-yaml`). Dependabot reporta 58 porque cuenta por ruta y no agrupa por paquete. Casi todas son `devDependencies` del stack Vite que la Fase 2 elimina, y el sistema no está desplegado. Revisar contra el árbol de Next.js en vez de parchear el actual | Abierto → Fase 2 |
| Q-11 | **`min_duration_minutes` = 15 contra `slot_minutes` = 30.** La RPC exige que la hora de inicio caiga en un bloque, pero no que la duración sea múltiplo de uno. Abierto el 2026-08-05 al implementar la tanda 2 | ✅ **Cerrado el 2026-08-06** → D-19: la duración tiene que ser múltiplo del bloque. **El enunciado estaba incompleto por dos lados:** subir el mínimo a 30 no alinea nada, y lo que desalinea es `duración + buffer` |
| Q-12 | **Cinco documentos de la raíz describen una arquitectura que ya no existe.** `DELIVERABLES.md`, `MIGRATION_GUIDE.md`, `README_REFACTORING.md`, `SUPABASE_RPC_CHEATSHEET.md` y `SUPABASE_RPC_GUIDE.md` son de la etapa generada con IA: documentan RPCs que nunca existieron en el proyecto canónico y un flujo de instalación obsoleto, y tras la tarea 1.12 sus enlaces a `supabase/*.sql` están rotos. Igual `scripts/generate_inventory_seed.py`. Abierto el 2026-08-05 al ejecutar la tanda 3 | ✅ **Cerrado el 2026-08-06** → se van con el código Vite en el primer commit de la tanda 0 *(D-6)*, junto a `API_EXAMPLES.md`, `BACKEND_SETUP.md` y `FRONTEND_INTEGRATION.md`, que la pregunta no contaba. Sin trabajo propio: una línea más del mismo `git rm` |
| Q-13 | **22 avisos de rendimiento del linter, todos prematuros.** 7 «índice sin usar» —la base nunca ha servido una consulta, así que «sin usar» significa «sin tráfico», incluido el `EXCLUDE` recién creado—; 6 claves foráneas sin índice, de las que solo dos valdrán la pena con datos (`reservation_status_log.reservation_id` y `inventory_reservations.product_id`, que consultan la política del log y la RPC); y 9 «políticas permisivas múltiples», que es estructural: cada tabla con «lo propio» + «admin_all» evalúa dos políticas en cada lectura. Unificarlas con un `OR` las vuelve ilegibles, y sin datos no hay forma de saber si compensa. Revisar con tráfico real | Abierto → Fase 2, tanda 4 |
| Q-14 | **El buffer desalinea la cola del bloqueo igual que la duración.** D-19 obliga a que la duración sea múltiplo del bloque, pero `products.buffer_minutes` solo tiene `check (between 0 and 480)`: un buffer de 45 minutos reabre el problema por la puerta de atrás. **No se decide ahora** porque un `CHECK` de tabla no puede leer `app_settings`, así que atarlo exige elegir entre un trigger sobre `products`, redondear `blocked_range` al bloque siguiente —que toca una migración probada y mueve el borde que afirma `21_no_overlap.sql`— o que la interfaz de admin solo ofrezca múltiplos. `buffer_minutes` no tiene interfaz hasta la tanda 3, y para entonces se sabrá si hacen falta buffers finos. **Riesgo mientras tanto: ninguno.** Los 34 productos tienen 120, que es múltiplo de 30. Abierto el 2026-08-06 al escribir `FASE_2_DISENO.md` | Abierto → Fase 2, tanda 3 |

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
| 2026-08-05 | **FASE 1 CERRADA.** Tanda 3: 2 migraciones y 123 aserciones pgTAP. Los tres avisos del linter cerrados —dos en esta tanda y uno que ya lo estaba desde la tanda 1—, disponibilidad por franja como función `available_units(...)`, tres huecos tapados en la batería y **2.707 líneas de SQL muerto fuera** (`dea78ec`). Decisión D-18; abierto Q-12. Queda el `db push` de D-17, que es lo único que separa al proyecto remoto de lo que ya está probado en local |
| 2026-08-05 | **Tres cosas del diseño de la tanda 3 que no eran ciertas, detectadas al escribir el plan y no al ejecutarlo.** (a) El 🔵 INFO del linter ya lo había cerrado la tanda 1, así que la tarea 1.9 eran dos arreglos y no tres. (b) La batería de §8 estaba casi entera hecha: seis de los siete archivos existían con otro nombre, así que 1.11 no era escribirla sino tapar tres huecos. (c) **La disponibilidad por franja no cabe en una vista**, porque depende de la franja que se pregunte y una vista no recibe parámetros: es una función. Escribir el plan antes de tocar nada es lo que hizo que las tres aparecieran en la lectura y no a mitad de la implementación |
| 2026-08-05 | **Dos hallazgos de la tanda 3 sobre lo que significa «arreglar un aviso de seguridad».** (a) `security_invoker` **no bloquea** al anónimo: lo hace mentir. La vista sigue siendo consultable y devuelve `active_units = 0` para todo, porque bajo el RLS del anónimo el `LEFT JOIN` no encuentra unidades. El arreglo del aviso, por sí solo, cambia una fuga de información por un dato falso; por eso hacen falta las dos líneas, la de la vista y el `REVOKE` (D-18). (b) **Saltarse el RLS es a veces lo correcto:** `available_units` es `SECURITY DEFINER` a propósito, porque un alumno no ve las reservas ajenas y contando con sus privilegios vería libre todo lo ocupado. Medido: con `DEFINER` el alumno B ve 2 unidades, sin él ve 3. Es seguro porque devuelve un conteo y no filas |
| 2026-08-05 | **Las 18 migraciones empujadas al remoto** *(D-17)*. `migration list` con `Local` y `Remote` idénticos. El catálogo real sobrevivió intacto —34 productos, 92 unidades— y `app_settings` llegó con su fila: el riesgo de añadir columnas con `default` sobre tablas pobladas no se materializó. **Los advisors, ya con señal limpia, confirmaron que los tres avisos originales desaparecieron** y destaparon otros dos frentes: seis funciones de trigger expuestas como RPC *(pendiente de arreglar; no explotable, medido)* y 22 avisos de rendimiento prematuros *(Q-13)*. **Corrección sobre la marcha:** sembrar el primer admin **no** era un paso pendiente de ahora sino de la Fase 2. `auth.users` está vacío porque nada usa Supabase Auth todavía, así que el `insert ... select` habría insertado cero filas **sin dar error** — el mismo modo de fallo silencioso contra el que se escribió media batería |
| 2026-08-05 | **Cerrado el frente de seguridad que abrieron los advisors.** Seis funciones de trigger estaban publicadas en `/rest/v1/rpc/` porque `PUBLIC` recibe `EXECUTE` por defecto y la tanda 1 solo se lo revocó a las cinco RPC de verdad. Se revocaron **las seis**, no solo las tres que marcaba el linter: arreglar la mitad habría obligado a que la prueba de cobertura llevara excepciones. **La pregunta abierta que resolvió el arreglo:** un trigger **no** necesita `EXECUTE` sobre su función —las 124 aserciones pasan tras revocarlo—, al revés que un helper de política RLS, donde revocarlo la rompe. A un trigger lo invoca el motor; una política se evalúa como el usuario que consulta. Esa asimetría es la que justifica el esquema `private` de la tanda 1: donde no se puede revocar, el aislamiento tiene que venir del esquema |
| 2026-08-05 | **FASE 1 CUMPLIDA ENTERA, advisors incluidos.** Empujado el arreglo al remoto y vueltos a correr: **de 11 avisos de seguridad a 5**, y los 5 son los que se decidió dejar —las RPC que `authenticated` debe poder ejecutar, cada una con su comprobación de autorización por dentro—. Ninguna función de trigger aparece ya. 19 migraciones con `Local` y `Remote` idénticos, 124 aserciones pgTAP. **La Fase 1 se cerró primero con la salvedad de que los advisors estaban pendientes; se cierra de verdad aquí.** La lección de haberlo hecho en ese orden: un cierre con salvedad es un cierre a medias, y el trabajo que destapó la salvedad —seis funciones expuestas— habría entrado en la Fase 2 como deuda si no se hubiera mirado el mismo día |
| 2026-08-06 | **Arranca la Fase 2.** Diseño completo de la aplicación en [`FASE_2_DISENO.md`](./FASE_2_DISENO.md). Decisiones D-19 a D-28; cerrados **Q-11** y **Q-12**; abierto **Q-14**. **Tres cosas verificadas antes de escribir, y las tres cambian el diseño:** (a) **Next.js 16 renombró `middleware.ts` a `proxy.ts`**, y su documentación dice explícitamente que el proxy *no* es una solución de sesión ni de autorización, solo chequeos optimistas — encaja exacto con que la autorización viva en RLS; (b) **Supabase ya no recomienda `getUser()` sino `getClaims()`** para proteger páginas; (c) **el proyecto firma con ES256**, medido contra su JWKS, así que `getClaims()` verifica la firma en local con WebCrypto y no cuesta una llamada de red por petición — con HS256 sí la costaría. **Corrección al enunciado de Q-11:** estaba incompleto por dos lados. Subir `min_duration_minutes` a 30 no alinea nada, porque 45 sigue sin ser múltiplo de 30; y lo que desalinea la rejilla es `duración + buffer`, no la duración sola — con `buffer_minutes = 120`, una reserva de 10:00 a 10:15 bloquea hasta las 12:15, así que el hueco perdido está al final del **bloqueo** y no al final de la reserva. Lo que Q-11 sí acertaba: había que decidirlo antes de construir el calendario |
| 2026-08-06 | **Hueco de cobertura destapado al diseñar, no al ejecutar.** `19_function_hardening.sql` solo vigila que ninguna función **de trigger** sea ejecutable por `anon`; **nadie afirma lo mismo de las cinco RPC de verdad**. D-19 recrea `create_reservation` con `create or replace`, que según la documentación conserva los privilegios de la función — pero si no lo hiciera, la RPC de reserva volvería a publicarse en `/rest/v1/rpc/` para el rol anónimo y nada lo detectaría. Queda como punto a verificar de la tanda 0, con la aserción que falta añadida en cualquiera de los dos desenlaces. Es la misma forma de hallazgo que la tanda 3: aparece **leyendo**, no ejecutando |
| 2026-08-06 | **Dos correcciones a `FASE_2_DISENO.md`, encontradas verificando el documento contra el repositorio después de mergearlo.** (a) Citaba `21_constraint_overlap.sql`, que **no existe**: ese es el nombre que el diseño de la Fase 1 le había planeado, y el archivo real es `21_no_overlap.sql`. Las citas históricas de `FASE_1_DISENO.md` y `TANDA_3.md` se dejan como están —son el nombre planeado y su mapeo—; las nuevas se corrigen. La aserción que se le atribuía sí existe, comprobada. (b) **`public/` estaba en la lista de borrado del primer commit, y no es andamiaje de Vite:** contiene las fotos de las dos sedes, el favicon y `robots.txt`, que son contenido, y Next.js usa esa misma carpeta para estáticos. Se queda tal cual. Lección: la lista de lo que se borra se comprueba archivo a archivo, no por la pinta del nombre |
| 2026-08-06 | **Limpieza de ramas antes de la tanda 0** *(D-29, cierra Q-7)*. El remoto pasa de 12 ramas a **2**: `main` y `develop`. Las 10 integradas se borran sin pérdida, porque sus commits siguen alcanzables desde `develop`. **`refactor` era el caso distinto y por eso se trató distinto:** no estaba mergeada en ningún sitio, así que la rama era la **única referencia** que sostenía `c3f5c1f` —29 archivos de JorgeGarciaCS del 2026-03-09, todo código Vite que la Fase 2 borra— y eliminarla lo habría dejado inalcanzable. Se congeló primero en el tag anotado `legacy/refactor-marzo`, el mismo patrón que D-6 usó con el Vite. Verificado después: el tag apunta a `c3f5c1f`, conserva la autoría original y `git show legacy/refactor-marzo` recupera los 29 archivos. **El motivo de hacerlo ahora y no después:** la tanda 0 borra el árbol Vite entero, y a partir de ahí cada rama vieja difiere de `develop` en ~13.000 líneas. Es el incidente del 2026-08-04 esperando a repetirse, con todo el árbol en vez de con cuatro Excel |
| 2026-08-06 | **Plan de la tanda 0 de la Fase 2 escrito:** [`PLANES/FASE_2_TANDA_0.md`](./PLANES/FASE_2_TANDA_0.md). Ocho tareas, cuatro puntos a verificar con sus dos desenlaces cada uno, y **cuatro correcciones al diseño detectadas leyendo, no ejecutando**. La primera es un **fallo real y no un matiz**: `available_slots` filtraba la ventana móvil comparando **fechas**, mientras `create_reservation` compara **instantes**. A las 10:00 de hoy, la rejilla habría ofrecido el séptimo día entero cuando la RPC solo acepta hasta las 10:00 de ese día — **las franjas de 10:30 a 20:00 del día 7 se ofrecían y luego se rechazaban**, que es exactamente el fallo que esa función existe para evitar. Corregido en el diseño con su nota fechada. **La regla que salió de ahí:** la rejilla puede ser más **estricta** que la RPC, nunca más laxa; por eso el filtro del pasado usa `>` donde la RPC usa `<`. Las otras tres: «la última migración» son **dos**; **el lint puede volverse bloqueante en la tanda 0 y no en la 4**, porque el motivo de D-7 —«los 59 errores viven en código que la migración elimina»— muere en el commit que borra ese código; y **`create-next-app` no puede andamiar sobre la raíz**, porque choca con `public/`, `README.md` y `.gitignore`, que se quedan |
