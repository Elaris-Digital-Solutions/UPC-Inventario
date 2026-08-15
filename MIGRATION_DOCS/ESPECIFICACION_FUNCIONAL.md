# Especificación funcional — Sistema de préstamo de equipos UPC

> Levantada por ingeniería inversa del proyecto React/Vite el **2026-08-04**, para reconstruir en Next.js.
> Fuente: código en `src/`, SQL en `supabase/`, y esquema del proyecto Supabase canónico `zqfkzgdyeqxzgzpxgadi`.
> **Este documento describe lo que el sistema hace hoy, no lo que debería hacer.** Las mejoras van en la sección 9.

---

## 1. Propósito

Plataforma de reserva y préstamo de equipamiento tecnológico para alumnos de la UPC. El alumno reserva un
equipo por franja horaria en una sede; el personal administrativo entrega, recibe y penaliza incumplimientos.

## 2. Actores

| Actor | Identificación | Alcance |
|---|---|---|
| **Alumno** | Correo `@upc.edu.pe` + fila en `alumnos` | Catálogo, reservar, cancelar, ver su panel, responder encuesta |
| **Administrador** | Correo único `admin@upc.edu.pe` | Todo lo del alumno + inventario, verificación, reservas, días inhabilitados, estadísticas |
| **Anónimo** | — | Landing, FAQ, login, registro |

> Hoy no existe un rol intermedio (operador de laboratorio). Todo el personal comparte una sola cuenta.

## 3. Mapa de pantallas

| Ruta | Pantalla | Acceso | Archivo origen |
|---|---|---|---|
| `/` | Landing | Público | `pages/Index.tsx` |
| `/login` | Ingreso (magic link / Microsoft) | Público | `pages/Login.tsx` |
| `/register` | Registro de alumno | Público | `pages/Register.tsx` |
| `/faq` | Preguntas frecuentes | Público | `pages/FAQ.tsx` |
| `/catalogo` | Catálogo con filtros | Autenticado | `pages/Catalog.tsx` |
| `/catalogo/:id` | Detalle de producto | Autenticado | `pages/ItemDetail.tsx` |
| `/catalogo/:id/reservar` | Flujo de reserva | Autenticado | `pages/ReservationOnboarding.tsx` |
| `/mi-panel` | Panel del alumno | Autenticado | `pages/UserDashboard.tsx` |
| `/admin` | Panel admin (6 pestañas) | Admin | `pages/Admin.tsx` |
| `/admin/unidades` | Gestión rápida de unidades | Admin | `pages/AdminUnits.tsx` |
| `*` | 404 | Público | `pages/NotFound.tsx` |

**Nota de seguridad:** `/admin` y `/admin/unidades` no están protegidas por el router. El control es un
`if (!isAuthenticated || !isAdmin)` dentro del componente (`Admin.tsx:914`) que renderiza el formulario de
login en lugar del panel. La protección real debe estar en el servidor y en RLS.

## 4. Modelo de dominio

Entidades del esquema canónico (`zqfkzgdyeqxzgzpxgadi`):

| Tabla | Rol | Notas |
|---|---|---|
| `carreras` | Catálogo de carreras (60 cargadas) | |
| `alumnos` | Perfil del alumno | FK a `auth.users` vía `auth_user_id`; `banned_until` para sanciones |
| `campuses` | Sedes (2: Monterrico, San Miguel) | **Existe pero el código usa strings hardcodeados** |
| `products` | Tipo de equipo (34 cargados) | |
| `product_images` | Imágenes en Cloudinary | `is_main`, `sort_order` |
| `inventory_units` | Unidad física (92 cargadas) | `unit_code`, `asset_code`, enum `unit_status` |
| `inventory_unit_notes` | Bitácora por unidad (58 cargadas) | |
| `inventory_reservations` | Reserva | enum `reservation_status` |
| `reservation_status_log` | Auditoría de cambios de estado | **Existe pero nadie la escribe** |
| `disabled_days` | Feriados / días sin atención | |
| `final_satisfaction_surveys` | Encuesta única por alumno | |

**Enums vigentes:**
- `unit_status`: `active`, `maintenance`, `retired`
- `reservation_status`: `reserved`, `active`, `cancelled`, `completed`, `not_picked_up`, `not_returned`

---

## 5. Módulos funcionales

### F1 · Autenticación y registro

**Registro** (`pages/Register.tsx`)
- Formulario: correo, nombre, apellido, carrera (desplegable desde `carreras`).
- Valida formato `@upc.edu.pe`.
- Llama a la RPC `register_alumno`; si falla, hace `INSERT` directo en `alumnos` (`Register.tsx:105-114`).
- Al terminar, precarga el correo en `localStorage` y redirige al login.

**Ingreso** (`context/AuthContext.tsx`)
- Dos vías: **magic link** (`signInWithOtp`) y **Microsoft/Azure** (`signInWithOAuth`).
- Pre-chequeo: el correo debe existir en `alumnos` con `activo = true`; si no, error `NOT_REGISTERED` y
  redirección a registro.
- Al establecer sesión se revalida: correo no-UPC y no-admin ⇒ `signOut` inmediato.
- Consume tokens desde el hash (`access_token`/`refresh_token`) o el query param `code` (PKCE), y limpia la URL.
- Redirección configurable por `VITE_AUTH_REDIRECT_URL`, con fallback a producción si la configurada es localhost.

**Admin**
- Correo fijo `admin@upc.edu.pe`. La contraseña la valida Supabase Auth vía `signInWithPassword`; la
  comparación en el cliente se eliminó en la Fase 0 (2026-08-04, tarea 0.3). El mensaje de error en español
  se conserva mapeando `invalid login credentials`.
- `isAdmin` se deriva de comparar el correo de la sesión. No hay rol en base de datos.

### F2 · Catálogo (`pages/Catalog.tsx`)

- Selector de sede (Monterrico / San Miguel) que condiciona todo el listado.
- Cuenta unidades por producto y sede para calcular stock disponible.
- Filtros: búsqueda por nombre/descripción, chips de categoría (derivadas de los productos existentes), sede.
- **Solo muestra productos con al menos una unidad en la sede seleccionada.**
- La sede viaja como query param a las pantallas siguientes.

### F3 · Reserva (`pages/ReservationOnboarding.tsx`)

Flujo en una pantalla:

1. **Bloqueo previo:** si `alumnos.banned_until` es futuro, se muestra pantalla de sanción con la fecha de
   habilitación y no se permite continuar.
2. **Duración:** desplegable de 1 a 4 horas (por defecto 2).
3. **Fecha:** calendario con tres restricciones combinadas:
   - No fechas pasadas.
   - **Ventana semanal:** de lunes a sábado solo se puede reservar hasta el domingo de la semana en curso;
     el domingo se habilita hasta el domingo siguiente (`ReservationOnboarding.tsx:495`).
   - Días en `disabled_days` aparecen tachados y deshabilitados.
4. **Horario:** franjas de 30 minutos entre las **08:00 y las 22:00**, descartando las pasadas. Para cada
   franja se cuenta cuántas unidades quedan libres aplicando un **buffer de 2 horas** a ambos lados de cada
   reserva existente. Solo se ofrecen franjas con al menos una unidad libre, mostrando el conteo.
5. **Motivo:** desplegable de 6 opciones fijas (práctica de laboratorio, proyecto de curso, trabajo de
   investigación, tesis, actividad extracurricular, otro).
6. **Confirmación:** resuelve el `alumno_id` por correo, elige una unidad libre y llama a la RPC
   `create_inventory_reservation`. Al terminar redirige a `/faq`.

### F4 · Panel del alumno (`pages/UserDashboard.tsx`)

- Tarjeta de perfil: nombre, correo, carrera.
- Métrica «préstamos esta semana» (semana de lunes a domingo).
- Métrica «tu favorito»: producto con más reservas del alumno.
- **Reservas activas:** listado con imagen, fecha y franja, y botón de cancelar.
- **Historial reciente:** últimas 5 reservas no vigentes.
- **Cancelación:** diálogo con razón obligatoria; se guarda en `cancellation_reason`.
- **Encuesta de satisfacción:** modal automático.

### F5 · Verificación operativa (`components/admin/VerificationPanel.tsx`)

El núcleo del ciclo de préstamo. Tres columnas que se recalculan con un reloj que refresca cada 60 s:

| Columna | Criterio | Acciones |
|---|---|---|
| **Por entregar** | `status = reserved` | «Producto entregado» → `active` · «No se retiró» → `not_picked_up` |
| **Activas** | `status = active` y fin ≥ ahora | «Producto devuelto» → `completed` |
| **Por devolver** | `status = active` y fin < ahora | «Producto devuelto» → `completed` · «No se devolvió» → `not_returned` |

- Filtro de fecha sobre «Por entregar»: hoy / próximos 3 días / esta semana / todas.
- Toda acción admite adjuntar una **anotación a la unidad**, que se guarda en el historial.
- «No se devolvió» fuerza una anotación de alerta roja.
- Todas las horas se muestran en `America/Lima`.

### F6 · Gestión de reservas (`components/admin/ReservationsPanel.tsx`)

- Tabla completa de reservas con join a producto, unidad y alumno.
- Filtros: texto libre (solicitante, correo, producto, categoría, código de unidad, activo fijo), rango de
  fecha, estado, y tres órdenes.
  - ⚠ **Precisado el 2026-08-12, al construirlo (Task 6 de la T3B):** el **rango de fecha** compara el
    **inicio** de la reserva y es un **rango cerrado con ventana móvil** *(D-44)* — «Hoy» son solo las de
    hoy, «Próximos 3 días» son hoy y los dos siguientes, «Esta semana» son hoy y los seis siguientes. **Con
    suelo**, al revés que el filtro del mostrador (F5), porque aquí la tabla es histórica y sin suelo «Hoy»
    arrastraría todo el pasado. Los **tres órdenes** son inicio descendente, inicio ascendente y registro
    descendente. El **filtro de estado ofrece los seis** del enum; el panel de Vite ofrecía cinco y le
    faltaba `not_picked_up`, que hoy el mostrador escribe de verdad. La búsqueda **normaliza tildes en los
    dos lados**.
- Cambio de estado directo desde un desplegable en cada fila.
  - ⚠ **Precisado el 2026-08-12:** el desplegable ofrece **solo las transiciones que la base admite desde
    el estado de esa fila** — `reserved → active | not_picked_up | cancelled` y
    `active → completed | not_returned` —, no los seis estados. Los otros cuatro son **terminales** y su
    fila lo dice en texto. No es un control: `enforce_reservation_transition()` rechaza igual cualquier
    otra, medido por PostgREST. En particular **nadie cancela una reserva ya entregada**, ni el admin:
    `active → cancelled` no existe, medido por las dos puertas —la RPC y el `UPDATE` directo—.
- Al pasar a `cancelled` se **exige una razón** por diálogo.
  - ⚠ **Ampliado el 2026-08-12** → **D-45**: pasar a **`not_returned`** exige también, por diálogo, la
    **anotación** que F5 ya obliga a escribir en el mostrador. F6 no lo pedía, pero esa transición bloquea
    al alumno de forma **permanente** (`banned_until = 'infinity'`), y aplicarla desde un desplegable sin
    nota lo dejaría sancionado sin ningún rastro escrito del motivo.
- Fila expandible con fecha de registro, estado de la unidad, duración en minutos, propósito y razón de cancelación.

### F7 · Inventario (`pages/Admin.tsx`, `pages/AdminUnits.tsx`)

**Alta de producto con unidades** — en un solo formulario:
- Nombre, ~~categoría (14 predefinidas + las ya existentes)~~, descripción, cantidad.
  - ⚠ **Corregido el 2026-08-13** → **D-42**: **las categorías se leen de la base, no de una lista fija.**
    En producción hay **diez**, así que las catorce metían cuatro opciones sin un solo producto detrás. El
    desplegable se llena consultando las que ya existen, más un campo para escribir una nueva: **no hay
    lista que se quede vieja.** Es la corrección directa de un error que el `seed.sql` provocó tres veces
    en esta fase, y la regla que sale de ahí es la que importa: **el código no debe afirmar sobre los datos
    lo que solo los datos pueden decir.**
- Una fila por unidad: código, sede, anotación inicial. Valida que no haya códigos repetidos.
- Carga múltiple de imágenes a **Cloudinary** ~~(preset sin firmar)~~, con selección de imagen principal.
  - ⚠ **Corregido el 2026-08-13, al cerrar P0-4 en la tanda 3B: la subida va FIRMADA desde el servidor.**
    El preset sin firmar deja subir a cualquiera que conozca el nombre del preset. Hoy el navegador pide
    una firma a `/api/cloudinary/firma`, un route handler que **no lee nada del cliente**, comprueba que
    quien llama es administrador y devuelve la firma sin el secreto. **Es la única puerta del proyecto que
    no habla con Postgres**, así que es también la única donde la comprobación del servidor no la respalda
    ninguna política de RLS: quitarla abriría un agujero de verdad, al revés que en los layouts. Medido:
    alumna **403**, operador **403** —ser personal no basta—, administrador **200 con firma**.
  - ⚠ **Ampliado el 2026-08-13:** las subidas van **en serie y no en paralelo**. La acción cuenta las filas
    que ya hay para decidir cuál es la principal y en qué orden va cada una; en paralelo todas leerían el
    mismo conteo y sobre un producto vacío **todas se marcarían principales**.
- Persiste producto → `product_images` → `inventory_units` → `inventory_unit_notes`.

**Gestión de unidades:**
- Alta individual (código, sede, anotación); rechaza códigos duplicados dentro del producto.
- Cambio de estado: `active` / `maintenance` / `retired`.
- Anotaciones: alta y baja, con historial por unidad.
- ~~**Borrado forzado en cascada manual:** notas → reservas → unidad. Si era la última unidad, **también elimina
  el producto**.~~
  - ⚠ **Corregido el 2026-08-13, al construir la pantalla en la tanda 3B: eso NO se replica, y la baja es
    `retired`.** Verificado sobre el código de administración: **no existe ni un solo borrado de
    `products`, `inventory_units` ni `inventory_unit_notes`** — lo único que la aplicación borra son filas
    de `product_images` y días inhabilitados. **El motivo es de dominio y no de comodidad:** borrar una
    unidad se lleva por delante las reservas que la usaron, y con ellas el historial de quién tuvo ese
    equipo y qué pasó con él, que es **D-2**, la trazabilidad completa. Una unidad que se rompe o se da de
    baja pasa a `retired`, desaparece del catálogo del alumno y **deja su rastro intacto**. Comprobado por
    el efecto: al retirar la última unidad de un producto, ese producto desapareció del catálogo del
    alumno sin que se borrara ninguna fila.

**Gestión de imágenes:** ~~reordenar (arrastrar)~~ reordenar con dos botones, fijar principal, eliminar (borra la fila; no borra de Cloudinary).

- ⚠ **Corregido el 2026-08-13:** el arrastre no se replicó. Dos botones hacen lo mismo, y elegir entre uno
  y otro es estética; **el orden resultante es idéntico**.
- ⚠ **Ampliado el 2026-08-13:** «una sola imagen principal» **no lo defiende la base** — medido, acepta dos
  a la vez con HTTP 201—, es lógica de la aplicación y son dos escrituras sin transacción. Entre los dos
  órdenes posibles se eligió aquel **cuyo fallo se ve**: apagar todas y luego encender deja «sin
  principal», que se nota, en vez de «dos principales», que no.
- ⚠ **Y lo de «no borra de Cloudinary» sigue siendo cierto, ahora con su consecuencia medida:** la
  aplicación **no puede** borrar allí, ni siquiera queriendo, porque la firma que emite es solo de subida.
  Las imágenes de prueba que la tanda 3B dejó en la cuenta real hay que borrarlas a mano desde el panel de
  Cloudinary.

### F8 · Días inhabilitados (`components/admin/AdminDisabledDays.tsx`)

- Calendario para marcar feriados o días sin atención (solo fechas futuras o de hoy).
- Al inhabilitar un día, ~~**cancela automáticamente** todas las reservas `reserved` y `active` de esa
  fecha, con la razón «Cancelado por la administración (Día inhabilitado)».~~ ⚠ **Corregido el
  2026-08-12** → **D-40**: el motor solo permite la mitad — `active → cancelled` no está entre las
  transiciones válidas de `enforce_reservation_transition()`. Se cancelan solas las reservas todavía **no
  retiradas** (`reserved`), con esa misma razón; los préstamos ya **`active`** siguen vivos, para que el
  alumno los devuelva normal. No toca SQL: es exactamente lo que el motor permite hoy. La ejecuta la
  **T3B**, que construye `/admin/dias`; la T3A no la implementa.
  - ⚠ **Ampliado el 2026-08-12** → **D-46**: inhabilitar un día exige un motivo escrito. Las dos filas que existen hoy tienen el motivo en `NULL` y se siguen leyendo; lo obligatorio es lo nuevo.
  - ⚠ **Ampliado el 2026-08-12** → **D-47**: la razón que se guarda en las reservas canceladas incluye el motivo del día — «Cancelado por la administración (Día inhabilitado: {motivo})» —, para que el alumno lea por qué y no solo que fue la administración.
- Lista de días inhabilitados; los futuros se pueden revertir, los pasados quedan en gris.

### F9 · Estadísticas (`components/admin/ReservationStatsPanel.tsx`)

Cinco indicadores: reservas registradas, préstamos esta semana, reservas activas ahora, completadas,
canceladas. Más desgloses por día de la semana.

- ⚠ **Corregido el 2026-08-13** → **D-48**: «Reservas activas ahora» cuenta el estado `active` y no mira el reloj, lo que incluye los préstamos cuyo fin ya venció y siguen sin devolver, porque ese equipo también está fuera. Corrige la fórmula del panel de Vite, que contaba `reserved` con el instante dentro de la franja.
- ⚠ **Ampliado el 2026-08-13** → **D-49**: «Préstamos esta semana» es una ventana móvil hacia atrás: hoy y los seis días anteriores, en días civiles de Lima. Cuenta solo lo que se llegó a retirar — `active`, `completed` y `not_returned` — y deja fuera `cancelled` y `not_picked_up`, que nunca fueron un préstamo. La dirección es hacia atrás porque es una estadística y describe lo que ya pasó.
- ⚠ **Ampliado el 2026-08-13** → **D-50**: el desglose por día de la semana va sobre todo el histórico y no sobre la semana del indicador anterior, porque responde «qué día se pide más equipo». Cuenta el mismo conjunto de estados que D-49, y por eso la pantalla lo titula «Préstamos por día de la semana»: la etiqueta dice qué conjunto es.
- ⚠ **Ampliado el 2026-08-13** → **D-51**: el panel muestra ocho indicadores y no los cinco de este párrafo original — los seis estados, más el total de registradas, más los préstamos de la semana. Los seis estados suman exactamente el total, y eso se comprueba de un vistazo en la propia pantalla.

### F10 · Encuesta de satisfacción (`final_satisfaction_surveys`)

- Se dispara automáticamente si el alumno tiene alguna reserva creada después del **2026-03-20** y aún no la respondió.
- Cinco valoraciones 1–5: plataforma, servicio, facilidad del proceso, claridad de la información, estado del equipo.
- ¿Recomendarías? (sí/no) + tres campos de texto libre: lo mejor, qué mejorar, comentarios.
- Una respuesta por alumno (`upsert` con `onConflict: alumno_id`). No es anónima.

### F11 · Penalizaciones

| Falta | Sanción |
|---|---|
| No retirar el equipo 2 veces | Bloqueo de **15 días** |
| Retirar y no devolver | **Bloqueo permanente** |

El bloqueo impide crear nuevas reservas y se muestra al alumno con la fecha de habilitación.

### F12 · Ajustes de reserva

**Es una pantalla NUEVA que el sistema original no tenía**, así que no lleva referencia a ningún archivo del código viejo entre paréntesis, al revés que F1 a F11. Nace de **D-39**, y el diseño de la Fase 2 tampoco la tenía: su tabla de rutas lista cinco pantallas de administración y esta es la sexta.

Pantalla de administración que edita seis valores de `app_settings`: ventana de reserva en días, hora de apertura, hora de cierre, tamaño del bloque, duración mínima y límite diario por producto. Solo el administrador.

**El tamaño del bloque se elige de una lista de ocho valores** — 5, 6, 10, 12, 15, 20, 30 y 60 minutos — porque son los únicos que dividen exacto una hora.

**Al cambiar el bloque, la pantalla avisa si algún producto queda con un tiempo de retorno que ya no encaja**, lo nombra, y **deja guardar igual**: la base lo permite. Es la segunda mitad de **Q-14**.

**La hora de apertura tiene que caer en un bloque, y si no, la pantalla no deja guardar** *(D-54)*. Es la única de las seis con esa restricción.

⚠ **Ampliado el 2026-08-15 por la T4: ahora la base tampoco la deja guardar.** La **migración 24**
*(D-55, cierra Q-19)* añade a `app_settings` un `CHECK` que ata las dos columnas. Hasta entonces la regla
vivía **solo en la aplicación**, así que por SQL directo el agujero seguía abierto; desde ahora la pantalla
**adelanta** un rechazo que el motor ya daría por su cuenta. **Lo que estaba en juego está medido, no
supuesto:** una hora de apertura desalineada deja el calendario entero irreservable —35 franjas ofrecidas y
las 35 rechazadas una por una— y **no se ve desde ninguna pantalla**; el alumno solo vería un calendario
que no le deja reservar.

---

## 6. Reglas de negocio consolidadas

| ID | Regla | Dónde vive hoy |
|---|---|---|
| BR-01 | Solo correos `@upc.edu.pe` | Cliente + RPC |
| BR-02 | Solo alumnos registrados y activos pueden iniciar sesión | Cliente |
| BR-03 | Admin = `admin@upc.edu.pe` | Cliente (hardcodeado) |
| BR-04 | Sedes válidas: Monterrico, San Miguel | Cliente + RPC (hardcodeado) |
| BR-05 | Atención de 08:00 a 22:00, franjas de 30 min | Cliente |
| BR-06 | Duración de 1 a 4 horas | Cliente + RPC |
| BR-07 | Duración mínima 15 minutos | RPC |
| BR-08 | Buffer de 2 horas entre reservas de la misma unidad | Cliente + RPC |
| BR-09 | Una reserva por producto por alumno por día (`America/Lima`) | RPC |
| BR-10 | Ventana semanal: hasta el domingo; los domingos abre la semana siguiente | Cliente |
| BR-11 | Días inhabilitados bloquean el calendario y cancelan reservas existentes | Cliente |
| BR-12 | Asignación automática de unidad por rotación justa (la menos usada primero) | RPC |
| BR-13 | No se ofrecen franjas ya pasadas | Cliente |
| BR-14 | Solo se listan productos con stock en la sede elegida | Cliente |
| BR-15 | 2 no-recogidas ⇒ 15 días de bloqueo | Cliente + trigger |
| BR-16 | No devolución ⇒ bloqueo permanente | Trigger |
| BR-17 | Cancelar exige razón (alumno y admin) | Cliente |
| BR-18 | Encuesta tras la primera reserva posterior al 2026-03-20 | Cliente |
| BR-19 | Al borrar la última unidad se borra el producto | Cliente |
| BR-20 | Stock = unidades activas | Cliente (columna denormalizada) |

---

## 7. Contradicciones a resolver antes de construir

Estas requieren una decisión explícita; el sistema actual tiene varias respuestas simultáneas.

| # | Conflicto | Versiones en competencia |
|---|---|---|
| C-1 | **Duración máxima** | 2 h (`ReservationService.ts:75`, RPC v1) · 4 h (RPC final, UI) |
| C-2 | **Modelo de sanciones** | `inventory_blacklist.requester_code` · `inventory_blacklist.user_id` · `alumnos.banned_until` |
| C-3 | **Disparador de la sanción por no recoger** | Trigger: 2 reservas `cancelled` · Cliente: 2 `not_picked_up` consecutivas |
| C-4 | **Firma de `create_inventory_reservation`** | Por sede (con rotación justa, blacklist y límite diario) · Por `unit_id` + `user_id` (sin ninguna de esas reglas) — el cliente llama a la segunda |
| C-5 | **Tipo de `alumno_id`** | `uuid` en el esquema canónico · `INTEGER` en la RPC · `Number()` en el cliente |
| C-6 | **Conjunto de estados** | 4 · 5 · 6 valores según el archivo |
| C-7 | **Días inhabilitados** | Solo se validan en el calendario del cliente; ninguna RPC los verifica |

**C-5 rompe el flujo hoy:** `ReservationOnboarding.tsx:313` hace `Number(alumnoIdRaw)` sobre un UUID, lo que
produce `NaN`, y la validación siguiente aborta con «Tu correo no está registrado». Con el esquema canónico,
**ninguna reserva puede crearse**.

---

## 8. Qué NO replicar

- Contraseña de administrador en el código del cliente.
- Autorización de admin basada en comparar un correo en React.
- Tokens de sesión propios firmados con la cadena literal `'signature'` (`services/AuthService.ts:239`).
- Magic tokens propios en texto plano generados con `Math.random()` — Supabase Auth ya lo resuelve.
- Columnas denormalizadas `products.stock`, `products.in_stock`, `inventory_units.current_note`.
- `alert()`, `confirm()` y `prompt()` del navegador como interfaz de confirmación.
- Los reintentos defensivos ante columnas inexistentes (`isMissingCancellationReasonColumn` y similares).
- El backend Express muerto (`server/`) y los ejemplos de `src/api/supabaseRPC.ts`.

---

## 8-bis. Decisiones tomadas (2026-08-04)

Estas resuelven parte de la sección 7 y son vinculantes para el nuevo esquema.

### D-1 · Duración máxima configurable por producto *(resuelve C-1)*

- Nueva columna `products.max_duration_hours smallint NOT NULL DEFAULT 4`, con `CHECK` entre 1 y 8.
- La RPC valida contra el valor del producto, no contra una constante.
- El desplegable de duración en la interfaz se construye desde ese valor.
- Se mantiene el mínimo global de 15 minutos (BR-07).

### D-2 · Dos roles con trazabilidad *(resuelve BR-03)*

Motivo explícito: poder auditar un equipo perdido.

- Nueva tabla `staff_members`: `user_id` (FK a `auth.users`), `role` (enum `admin` | `operator`), `activo`.
  Cada persona entra con su propia cuenta UPC; se elimina la cuenta compartida.
- **Operador:** entregar, recibir, marcar no-retirado y no-devuelto, y añadir anotaciones de unidad.
- **Admin:** todo lo anterior más inventario, imágenes, días inhabilitados, estadísticas y gestión de personal.
- **Trazabilidad**, aprovechando columnas que ya existen y hoy están vacías:
  - Trigger que puebla `reservation_status_log` con `changed_by = auth.uid()` en cada cambio de estado.
    Queda registrado quién entregó y quién recibió cada equipo, con fecha y hora.
  - `inventory_unit_notes.created_by = auth.uid()` en vez del `null` actual.
  - `disabled_days.created_by = auth.uid()`.
- Las políticas RLS verifican pertenencia y rol; ninguna autorización queda en el cliente.
- ⚠ **Ampliado el 2026-08-13** → **D-52**: **la pantalla de personal SÍ deja cambiar el rol** de alguien que ya es personal, entre operador y administrador. Es un `UPDATE` de la columna `role` con el mismo privilegio y la misma política que la baja, y está medido que funciona. Sin esa opción, un operador sería operador para siempre. Nadie puede cambiarse el rol a sí mismo, porque hay un solo administrador y degradarse sería irreversible desde la aplicación.
- ⚠ **Ampliado el 2026-08-13** → **D-53**: **el alta de personal se hace escribiendo el correo completo**, no con un buscador ni trayendo todos los alumnos a la pantalla. Así ninguna lectura de la tabla `alumnos` queda expuesta como endpoint invocable desde el navegador. La lista de alumnos crece con cada acceso, y la pantalla explica las dos causas posibles cuando el correo no aparece —nunca pidió enlace, o correo no es `@upc.edu.pe`— porque la aplicación no puede distinguirlas.
- ⚠ **Anotado el 2026-08-13**: dar de alta solo alcanza a quien ya pidió su enlace de acceso al menos una vez. La aplicación solo ve el identificador de cuenta a través de la ficha de alumno, y esa ficha nace al pedir el enlace y solo para correos `@upc.edu.pe`. **La baja es desactivar y nunca borrar:** desactivar corta el acceso de verdad, y borrar perdería la constancia de que esa persona fue personal y con qué rol.

### D-3 · Ventana de reserva móvil *(reemplaza BR-10)*

- Ventana móvil configurable, **7 días por defecto** desde la fecha actual.
- Reemplaza la ventana semanal con corte dominical, cuyo horizonte se encogía de 7 días a 1 a lo largo
  de la semana y concentraba toda la demanda el domingo a las 00:00.
- El control contra acaparamiento sigue siendo BR-09 (una reserva por producto por alumno por día).
- **Se valida en la base de datos**, no solo en el calendario del cliente.

---

## 9. Mejoras propuestas

> ⚠ **Corregido el 2026-08-13, en la Task 0 de la tanda 4: DIEZ de las doce ya están hechas, y esta tabla
> llevaba meses diciendo lo contrario.** La columna «Por qué» conserva el enunciado original **en presente**
> —«hoy borrar una unidad destruye su historial», «hoy aborta aunque queden libres»—, y eso describía el
> sistema de la auditoría, no el de ahora. **No se reescribe: se le añade la columna «Estado»**, porque el
> enunciado es el registro de dónde se partía y borrarlo perdería la mitad del valor de la tabla.
>
> **El caso que obliga a verificar por el efecto y no por el nombre es M-8.** Su «Por qué» dice que el
> sistema aborta aunque queden unidades libres, y la RPC vigente recorre las unidades de menos usada a más
> usada con un `continue` en la ocupada — **y el propio SQL cita el identificador**:
> `-- 8 · rotacion justa (M-8, BR-12)`. Lo mismo con M-7, citada como `(C-7, M-7)`. **La tabla llevaba meses
> contradiciendo a un código que la nombra.**
>
> **Cómo se verificó cada fila:** abriendo la migración o el archivo y comprobando la propiedad, no
> buscando el identificador. Encontrar el texto no es encontrar la propiedad: M-8 tenía el `SKIP LOCKED`
> desde el principio y aun así estaba mal hasta que se añadió el bucle.

| # | Mejora | Por qué | Estado *(2026-08-13)* |
|---|---|---|---|
| M-1 | **Constraint de exclusión** `EXCLUDE USING gist` sobre `(unit_id, tstzrange(start_at, end_at))` | Elimina la doble reserva por diseño, no por chequeo previo | ✅ **Hecha** *(Fase 1)*. `exclude using gist (unit_id ... with =, blocked_range with &&) where (status in ('reserved','active'))`. Sobre una columna `blocked_range` poblada por trigger y no sobre la expresión directa: incluye el buffer, y esa expresión no es inmutable |
| M-2 | **Máquina de estados explícita** con transiciones válidas y trigger que puebla `reservation_status_log` | La tabla de auditoría ya existe y nadie la escribe; hoy el admin puede saltar de cualquier estado a cualquier otro | ✅ **Hecha** *(Fase 1)*. `enforce_reservation_transition()` con su trigger, y `log_reservation_status` poblando la auditoría |
| M-3 | **Toda la lógica de sanciones en un único trigger** | Hoy vive en el cliente y en un trigger, con criterios distintos | ✅ **Hecha** *(Fase 1)*. `apply_penalties`, con los dos escalones. `admin_set_ban` no es una segunda lógica: es la puerta del admin para levantar o poner una sanción a mano |
| M-4 | **Validar `disabled_days` en la RPC** | Hoy basta con llamar a la API directamente para reservar un feriado | ✅ **Hecha** *(Fase 1)*. `create_reservation` lanza «Ese dia no hay atencion», con la fecha convertida a `America/Lima` antes de comparar |
| M-5 | **Stock derivado** (vista o columna generada) en vez de `stock`/`in_stock` | Evita inventarios que no cuadran | ✅ **Hecha** *(Fase 1)*. `in_stock` y `active_units` viven en la **vista** `product_availability`; en la tabla `products` ya no existe ninguna de las dos columnas |
| M-6 | **Usar la tabla `campuses`** en vez de strings hardcodeados | Agregar una sede hoy exige tocar código y RPCs | ✅ **Hecha en la lógica** *(Fase 1)*: la RPC y el catálogo trabajan con `campus_id`. **Queda un residuo con motivo en la landing**, que lista las dos sedes a mano porque **empareja cada una con una imagen de `public/` que la base no guarda**. Verificado que **no miente**: los nombres coinciden con los de la tabla real —Monterrico y San Miguel— y las dos imágenes existen |
| M-7 | **Fijar `America/Lima`** en todo el cálculo de franjas | Hoy se usa la zona del navegador; un alumno de viaje ve horarios corridos | ✅ **Hecha** *(Fase 1)*. Citada en el propio SQL como `(C-7, M-7)` |
| M-8 | **Corregir el `SKIP LOCKED`**: si la unidad elegida está bloqueada, probar la siguiente | Hoy aborta con «no hay unidades disponibles» aunque queden libres | ✅ **Hecha** *(Fase 1)*. Recorre las unidades de menos usada a más usada con `continue` en la ocupada, y desempata por `unit_code` para que la elección sea determinista y por tanto comprobable. Citada en el propio SQL como `(M-8, BR-12)` |
| M-9 | **Rol de operador** además del admin único | Varias personas comparten una sola cuenta; no hay trazabilidad de quién entregó qué | ✅ **Hecha** *(Fase 1)*. `staff_members` con el enum `staff_role`: `admin` y `operator`. La pantalla que los gestiona es `/admin/personal`, de la T3B |
| M-10 | **Notificaciones por correo** (confirmación, recordatorio, vencimiento) | Hoy no existe ninguna; el alumno depende de recordar su franja | ⬜ **Sigue propuesta.** Es **Q-4**, sin decidir |
| M-11 | **Borrado lógico** en lugar del borrado en cascada manual de unidades | Hoy borrar una unidad destruye su historial de reservas | ✅ **Hecha por la T3B** *(2026-08-13)*. La baja es `retired`, y **no hay un solo `delete` sobre `products`, `inventory_units` ni `inventory_unit_notes`**. El motivo es de dominio: borrar una unidad se lleva por delante el historial de quién tuvo ese equipo, que es **D-2** |
| M-12 | **Cancelación con antelación mínima** | Hoy se puede cancelar un minuto antes sin consecuencia | ⚠ **Hecha a medias.** **D-38** cerró la mitad —no se cancela una reserva que **ya empezó**, migración 23— y **falta la otra**: un margen mínimo *antes* de empezar. La T4 no la construye *(D-55: una sola migración esta tanda)* |

~~Las mejoras M-1 a M-8 corrigen defectos. M-9 a M-12 son decisiones de producto que requieren tu
criterio.~~ ⚠ **Corregido el 2026-08-13:** ese reparto ya se resolvió. **Las ocho primeras se corrigieron
en la Fase 1**, y de las cuatro de producto **se decidieron tres** —M-9 en la Fase 1, M-11 en la T3B y
media M-12 con D-38—. **La única que sigue esperando criterio es M-10**, que es Q-4. Una frase de cierre
envejece igual que una celda, y esta llevaba caducada desde la Fase 1.
