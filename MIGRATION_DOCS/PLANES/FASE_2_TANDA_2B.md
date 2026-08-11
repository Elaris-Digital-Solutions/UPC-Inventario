# Fase 2 · Tanda 2B — Reserva y panel · Plan de implementación

> Escrito el 2026-08-10, **antes de ejecutar nada**, justo al cerrar la 2A. Sale de `FASE_2_DISENO.md` §9,
> §10 y §11, del alcance que dejó fijado `PLANES/FASE_2_TANDA_2A.md`, y de **consultar el proyecto real**.
> Al terminar, la cabecera de correcciones va **arriba de este párrafo**, fechada. Los planes de este
> proyecto NO se reescriben tras ejecutar.

**Goal:** que un alumno pueda **reservar**. Al final de la tanda existen el calendario, la reserva contra
`create_reservation`, el bloqueo por sanción, `/mi-panel`, la cancelación con motivo y la encuesta.

**Architecture:** tres capas, y el orden no es negociable. **Abajo**, la rejilla como *lógica pura* —sin
React, sin base de datos, testeable con Vitest—. **En medio**, las pantallas que leen: calendario y panel.
**Arriba**, las que escriben: reserva, cancelación y encuesta. Cada capa se ve funcionar sin la siguiente.

**La propiedad que define esta tanda, y es la contraria de la 2A: aquí sí se escribe.** Tres RPC y un
`insert` directo. Una pantalla mal hecha ya puede corromper un dato, así que todo lo que escribe se prueba
**contra el stack local**, nunca contra producción.

**Tech Stack:** Next.js 16.3.0 (App Router) · React 19.2.8 · TypeScript estricto · Tailwind 4 · shadcn 4
sobre Radix · `@supabase/ssr` 0.12.4 · `@supabase/supabase-js` 2.112.2 · **Vitest 4.1.10** *(estrena
cobertura en esta tanda)* · PostgreSQL 17 · pgTAP

---

## Global Constraints

- **La autorización no se replica.** El proxy redirige, el layout es comodidad, el componente oculta, y
  **quien decide es RLS**. Ninguna comprobación del cliente decide nada.
- **Ninguna migración.** La base quedó cerrada en **22 migraciones y 142 aserciones**. Si aparece una
  necesidad de SQL, se registra como desvío **antes** de escribirlo, con el costo por delante, igual que
  D-32. **La interfaz se alinea con el motor, nunca al revés.**
- **La aplicación nunca usa `service_role`.** Si un flujo la pide, falta una política, no una clave.
- **Todo lo que escribe se prueba en local.** La 2A pudo probarse contra producción porque solo hacía
  `select`; esta tanda **no puede**, y ahí se acaba esa licencia.
- **`db reset` deja el login funcionando** desde el 2026-08-10 *(corrección 34 de la 2A)*. Ya no hace falta
  ningún `update` manual sobre `auth.users`.
- **Se prueba siempre por `http://127.0.0.1:3000`**, nunca por `localhost:3000` *(D-33)*, con `.env.local`
  presente. Y **cada pantalla se abre en un navegador de verdad** antes de darla por hecha.
- **Borrar `.next/`** al mover, renombrar o borrar algo dentro de `app/` — y no juzgar códigos de error en
  la primera carga después de borrarlo *(corrección 37 de la 2A)*.
- Mensajes de commit **sin acentos**. **Claude no toca el remoto.**

---

## Correcciones al diseño, antes de empezar

**Ocho.** Las tres primeras venían anotadas en el alcance de la 2A. **Las cinco siguientes salieron de
consultar el proyecto real el 2026-08-10**, y una de ellas cambia una tarea entera.

### 1. Una rejilla vacía es ambigua

`available_slots` devuelve **cero filas** tanto en un día inhabilitado como en un día donde no queda nada
libre: el `not exists` sobre `disabled_days` está dentro del `where`
(`20260806171930_available_slots.sql`). La interfaz **no puede distinguir «ese día no hay atención» de «ese
día está lleno»** a partir de esa respuesta.

→ Se consulta `disabled_days` **aparte**, y el alumno puede: `disabled_days_select_auth` existe —
verificado en producción.

### 2. «Hoy» se calcula en `America/Lima`

`available_slots` recibe un `p_date date`. El servidor de producción corre en UTC y el navegador en la zona
del alumno: a las 20:00 de Lima, los tres pueden estar en días distintos. Es **M-7** reapareciendo en el
cliente, y el diseño no lo menciona al describir el calendario.

→ El día se deriva en `America/Lima` en un solo sitio, y ese sitio es la lógica pura de la Task 8.

### 3. `cancel_reservation` solo acepta `reserved`

**Verificado en el SQL**, no recordado: `if v_status <> 'reserved' then raise`
(`20260806012057_cancel_reservation_rpc.sql:44`). El panel del Vite ofrecía cancelar «reservas activas»,
que en el esquema nuevo son las **ya entregadas**.

→ El botón **desaparece** cuando la reserva está en `active`, no falla al pulsarlo.

→ **Y el orden de sus validaciones importa para los mensajes:** el motivo vacío se rechaza **antes** de
comprobar que la reserva exista. Cancelar una reserva inexistente sin motivo contesta «La cancelacion exige
un motivo», no «Reserva inexistente». Es correcto —la más fundamental primero, lección de la tanda 2— pero
la interfaz no debe traducir ese mensaje como «no existe».

### 4. ⚠ La encuesta es **una por alumno**, no una por reserva

**Medido contra el proyecto real, y contradice la lectura natural de «Encuesta (BR-18)».**
`final_satisfaction_surveys` tiene **`UNIQUE (alumno_id)`** y **no tiene ninguna columna
`reservation_id`**. Sus columnas son cinco valoraciones de 1 a 5 —`platform_rating`, `service_rating`,
`reservation_process_rating`, `support_clarity_rating`, `equipment_condition_rating`—, un
`would_recommend` booleano y tres textos libres. Y existe **`surveys_update_own`**, así que el alumno puede
**editarla**.

→ **No es una encuesta de fin de préstamo: es la encuesta final de satisfacción con el servicio, una sola
vez y modificable.** Un segundo `insert` daría `23505` (`unique_violation`).

→ **Consecuencia de alcance:** la Task 14 no cuelga la encuesta del final de una reserva. Es una pantalla
propia, a la que se invita desde `/mi-panel`, que se rellena una vez y luego se edita.

> **Es el mismo género que `featured` en la 2A**, y por eso vale la pena decirlo así: el diseño nombró la
> encuesta sin decir a qué se ata, y quien rellenara ese hueco de memoria la habría atado a la reserva. **El
> esquema ya tenía la respuesta escrita; nadie la había mirado.** Leer el nombre de una tabla dice que
> existe; solo mirar sus restricciones dice qué permite.

### 5. ⚠ Los dos `disabled_days` de producción **están en el pasado**

El plan de la 2A anotó «`disabled_days`: 2 filas — para la 2B: hay con qué probar el día inhabilitado sin
inventarlo». **Hoy eso es falso.** Las dos filas son **2026-03-20 y 2026-03-21**, y hoy es **2026-08-10**:
con una ventana móvil de 7 días, el calendario **nunca** las va a alcanzar.

→ **El día inhabilitado no se puede probar contra producción.** Se prueba en local, donde el seed siembra
`2026-12-25`, que **también está fuera de la ventana**: hay que insertar un día dentro de los próximos 7
como parte del escenario de prueba.

→ **Y las dos filas reales tienen `reason` en `NULL`**, así que la pantalla que muestre el motivo tiene que
defenderse del nulo. Es el caso mayoritario en producción, no el borde.

### 6. ⚠ Producción no tiene con qué probar el panel, la cancelación ni la sanción

Medido: **cero reservas**, **un solo alumno** —con perfil completo y sin sanción—, cero encuestas.

→ `/mi-panel` vacío es el **estado real** de producción, no un caso borde: la pantalla de «no tienes
reservas» es lo primero que alguien va a ver, y merece diseñarse, no improvisarse.

→ Todos los escenarios con datos —panel con reservas, cancelación, sanción vigente— **se montan en local**.

### 7. La sanción no la puede provocar esta tanda

`apply_penalties` **no es un trabajo programado**: es un **trigger** `after update of status on
inventory_reservations` (`20260806013146_penalties.sql:54`). Se dispara cuando **el personal** marca
`not_picked_up` o `not_returned` — y esa pantalla es la **T3**. `pg_cron` no está instalado; verificado.

→ La 2B solo puede **mostrar** el bloqueo y **prevenirlo** en la interfaz. Para montar el escenario hay dos
vías, y se elige la segunda: `admin_set_ban` (exige ser admin) o un `update` directo al alumno desde `psql`
en local. **La segunda es más honesta**, porque no requiere inventar una sesión de admin que esta tanda no
construye.

→ **La comprobación que sí es de esta tanda:** que `create_reservation` rechace con sanción vigente ya está
en el motor (paso 2). La interfaz no la replica: la **anticipa**, para no ofrecer un botón que va a fallar.

### 8. El alumno tiene `UPDATE` sobre `status` y **no le sirve de nada**

Medido: `authenticated` tiene privilegio de columna `UPDATE (status, cancellation_reason)` sobre
`inventory_reservations`, pero la **única** política de `UPDATE` es `reservations_update_staff`.

→ Un alumno que intente cancelar con un `update` directo afecta **cero filas y no recibe error**. Es el
modo de fallo silencioso que persiguió media Fase 1, vivo en el esquema de hoy.

→ **Consecuencia práctica:** cancelar es **siempre** por `cancel_reservation`. Y si algún día alguien
«optimiza» eso a un `update`, la cancelación dejará de funcionar **sin dar error**. El comentario va en el
archivo.

---

## Lo que ya está verificado contra el esquema

Leído en las migraciones y confirmado contra el proyecto real. Sirve para no volver a mirarlo a mitad de
una tarea.

| Pregunta | Respuesta, y dónde está escrita |
|---|---|
| ¿Quién puede crear una reserva? | **Solo `create_reservation`.** Nadie tiene `INSERT` sobre `inventory_reservations` — verificado: no existe política de `INSERT` para `authenticated` |
| ¿Y cancelarla? | **Solo `cancel_reservation`** para el alumno. Ver la corrección 8 |
| ¿El alumno ve sus reservas? | Sí, `reservations_select_own`: `alumno_id = private.current_alumno_id()` |
| ¿Puede leer el horario y la ventana? | Sí, `app_settings_select_auth` |
| ¿Y los días inhabilitados? | Sí, `disabled_days_select_auth` |
| ¿Y la rejilla? | `available_slots(uuid, uuid, date, int)`, `execute` a `authenticated`, `security definer` |
| ¿La encuesta? | `surveys_insert_own`, `surveys_select_own` y `surveys_update_own`, las tres sobre `alumno_id = private.current_alumno_id()`. **Una por alumno** |
| ¿Qué valida `create_reservation`, y en qué orden? | Ocho pasos: identidad y perfil → sanción → duración contra el producto → ventana móvil → día inhabilitado y horario → alineación al bloque → límite diario → rotación justa. **El orden es la respuesta al usuario** |

---

## La forma real de los datos

**Consultado el 2026-08-10 contra `zqfkzgdyeqxzgzpxgadi`.** Estas cifras son el **criterio de aceptación**
de varias tareas.

| Dato | Valor real | Para qué importa |
|---|---|---|
| `app_settings` | 7 días · 08:00–22:00 · bloques de **30** · mínimo **30** · **1** por producto y día | **D-19 confirmada.** Con duración de 30 min, un día son **28 franjas** |
| `buffer_minutes` | **120 en los 34** | Una reserva de 30 min bloquea **2h30** de esa unidad. La rejilla lo refleja porque `available_slots` delega en `available_units` |
| `max_duration_hours` | **4 en los 34** | El desplegable de duración es `30, 60, …, 240`: **ocho** opciones |
| Unidades | **92, todas `active`** | Ninguna en mantenimiento hoy |
| Máx. unidades por producto y sede | **4** | `free` va de 0 a 4. La rejilla nunca muestra más |
| Reservas | **0** | Corrección 6. El panel vacío es el estado real |
| Alumnos | **1**, con perfil completo, sin sanción | Corrección 6 |
| `disabled_days` | **2 filas, las dos en el pasado**, `reason` **nulo** en ambas | Corrección 5 |
| Carreras activas | **60** *(el seed local tiene 5)* | Si alguna pantalla lista carreras, 60 no caben en un desplegable sin buscador |
| Encuestas | **0**, y `UNIQUE (alumno_id)` | Corrección 4 |

> **Y lo que el seed local hace distinto, que por una vez juega a favor:** tiene `max_duration_hours = 8` en
> el Laptop y **buffers distintos por producto** —30 min en el trípode—, mientras producción es uniforme en
> las dos columnas. **El seed ejercita D-1 y D-10; producción no.** Si alguien escribiera «4 horas» o
> «2 horas de buffer» a mano, producción no lo delataría jamás.

---

## Puntos a verificar

Seis, y los seis se resuelven **midiendo**. Los dos desenlaces van escritos, para que medir no se convierta
en elegir el resultado que conviene.

1. **¿`available_slots` devuelve lo que la rejilla necesita, con los datos reales?** Delega en
   `available_units`, y con `buffer_minutes = 120` una sola reserva bloquea cinco bloques por delante.
   → **Predicción:** con 1 unidad y una reserva de 10:00 a 10:30, las franjas de 10:00 a 12:30 salen con
   `free = 0`, y la de 13:00 vuelve a estar libre. **Se mide contra el stack local antes de pintar nada.**
   → Si no coincide, el que está mal es el entendimiento del buffer, no la función: se anota y se recalcula
   la rejilla contra lo medido.

2. **¿Un día inhabilitado y un día lleno se distinguen desde el cliente?** *(corrección 1)*
   → **Predicción: no**, los dos dan cero filas, y por eso hace falta la consulta aparte a `disabled_days`.
   → Si `available_slots` resultara distinguirlos, sobra una consulta y se anota.

3. **¿Qué mensaje recibe el alumno en cada rechazo de `create_reservation`?** Ocho pasos, ocho mensajes, y
   la interfaz tiene que mostrarlos sin traducirlos mal. **Se dispara cada rechazo a propósito** y se anota
   el texto y el `SQLSTATE` reales.
   → Especial cuidado con el paso 7 —límite diario— y el 8 —«No hay unidades disponibles en esa franja»—,
   que son los dos que un alumno va a ver de verdad.

4. **¿La rejilla ofrece algo que la RPC rechace?** Es **la** pregunta de esta tanda: si `available_slots`
   ofrece una franja y `create_reservation` la rechaza, el calendario miente.
   → **Se prueba pidiendo la primera y la última franja del día**, que son los bordes donde el diseño dice
   que las dos fórmulas se rozan (`closing_time - duración`, y `>` contra `<` en el pasado).
   → **La regla que gobierna el desenlace: la rejilla puede ser más estricta que la RPC, nunca más laxa.**

5. **¿`create_reservation` es alcanzable desde el cliente del navegador con la clave publicable?** Tiene
   `grant execute to authenticated`, así que debería.
   → Si diera `42501`, falta un `grant`, y eso sería SQL: se registra como desvío antes de escribir nada.

6. **¿Cuántas rutas deja el `build`, y cuáles siguen estáticas?** La 2A cerró en **diez**, tres estáticas
   (`/_not-found`, `/faq`, `/login`).
   → **Predicción:** las rutas nuevas son todas dinámicas —leen sesión y datos—, así que quedan **catorce
   o quince**, con las mismas tres estáticas. Si alguna de esas tres deja de serlo, algo empezó a leer
   cookies donde no debía.

---

## Estructura de archivos

```
lib/reservas/rejilla.ts              NUEVO — logica pura: dia en America/Lima, duraciones, franjas
lib/reservas/rejilla.test.ts         NUEVO — Vitest, el primero del proyecto
lib/reservas/consultas.ts            NUEVO — available_slots, disabled_days, mis reservas
lib/reservas/acciones.ts             NUEVO — Server Actions: reservar, cancelar, encuesta

components/reservas/
  calendario.tsx                     NUEVO — dias y franjas (Client Component)
  selector-duracion.tsx              NUEVO — 30..max_duration_hours*60
  tarjeta-reserva.tsx                NUEVO — una reserva en el panel
  dialogo-cancelar.tsx               NUEVO — motivo obligatorio (BR-17)

app/(alumno)/
  catalogo/[id]/reservar/page.tsx    NUEVO — el calendario
  mi-panel/page.tsx                  NUEVO — las reservas del alumno
  encuesta/page.tsx                  NUEVO — una por alumno, editable

app/(alumno)/catalogo/[id]/page.tsx  MODIFICADO — el boton deja de estar deshabilitado
components/catalogo/filtros.tsx      MODIFICADO — el href arrastra la sede (correccion 36 de la 2A)
components/cabecera.tsx              MODIFICADO — enlace a /mi-panel con sesion
proxy.ts                             SIN CAMBIOS — la lista blanca ya cierra todo lo nuevo
```

> **`proxy.ts` no se toca, y eso es la propiedad que la tanda 1 compró.** Las tres rutas nuevas nacen
> protegidas sin que nadie se acuerde de añadirlas. Si alguna necesitara ser pública, sería una edición
> deliberada y visible en el diff.

---

## Task 8 · La rejilla como lógica pura

**Files:** Create `lib/reservas/rejilla.ts`, `lib/reservas/rejilla.test.ts`

Va primera porque **no necesita base de datos ni React**, y porque es lo único de esta tanda que se puede
probar sin montar un escenario.

- [ ] **Step 1:** `hoyEnLima()` y `fechaLocal(instante)`, en un solo sitio *(corrección 2)*. **Nada más del
      proyecto vuelve a calcular una fecha**: si aparece un segundo `new Date()` con zona, es un defecto.
- [ ] **Step 2:** `duracionesPosibles(maxDurationHours, slotMinutes, minDurationMinutes)` → `30, 60, …`.
      Sale de `app_settings` y del producto *(D-1, D-19)*, **no de una constante**. Con los datos reales da
      ocho opciones; con el Laptop del seed local, dieciséis.
- [ ] **Step 3:** `diasDeLaVentana(hoy, bookingWindowDays)` → los 7 días que el calendario ofrece.
- [ ] **Step 4:** Las pruebas con Vitest, y **primero las que tienen que fallar**. Es la disciplina de la
      Fase 1: una aserción que nunca se vio fallar no prueba que el arnés esté corriendo. Casos: una
      duración que no es múltiplo del bloque **no** aparece en la lista; el día 8 **no** está en la ventana;
      y **la frontera de medianoche en Lima** —un instante UTC del día siguiente que en Lima es todavía hoy—.
- [ ] **Step 5:** `npm run test` deja de estar vacío. **Anotar cuántas pruebas son**, que es la primera
      cobertura real del cliente en el proyecto *(corrección 41 de la 2A)*.
- [ ] **Step 6:** `typecheck`, `lint`, `test` y commit `Tanda 2B.8: la rejilla como logica pura`.

## Task 9 · `/catalogo/[id]/reservar` — el calendario

**Files:** Create `lib/reservas/consultas.ts`, `components/reservas/calendario.tsx`,
`components/reservas/selector-duracion.tsx`, `app/(alumno)/catalogo/[id]/reservar/page.tsx`

- [ ] **Step 0:** Resolver los puntos a verificar **1 y 2** antes de pintar nada. Montar en local una
      reserva de 10:00 a 10:30 sobre un producto de una unidad y **medir** qué devuelve `available_slots`
      alrededor del buffer de 120 minutos.
- [ ] **Step 1:** Las consultas: `available_slots` para la rejilla, `disabled_days` **aparte**
      *(corrección 1)*, y `app_settings` para el horario. Tres, y el comentario dice por qué no son dos.
- [ ] **Step 2:** La sede llega por query param, **arrastrada desde el catálogo** *(cierra la corrección 36
      de la 2A)*. Es el salto que justificó aplazarlo: aquí la sede deja de ser cosmética, porque una
      reserva es contra una unidad de **una** sede.
- [ ] **Step 3:** El selector de duración, con lo que dio la Task 8. Cambiar la duración **vuelve a pedir la
      rejilla**: las franjas dependen de ella, porque la última es `closing_time - duración`.
- [ ] **Step 4:** El calendario: los 7 días de la ventana, y las franjas del día elegido con su `free`. Las
      de `free = 0` **no se ofrecen**.
- [ ] **Step 5:** **Un día inhabilitado dice que no hay atención; un día lleno dice que está lleno.** Son
      dos mensajes distintos y esa es la mitad del valor de la corrección 1. Y **`reason` puede ser nulo**
      —lo es en las dos filas reales—, así que el mensaje no lo da por hecho *(corrección 5)*.
- [ ] **Step 6:** Verificar en el navegador, con un día inhabilitado **insertado dentro de la ventana**
      *(corrección 5: los del seed y los de producción están fuera)*.
- [ ] **Step 7:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 2B.9: el calendario`.

## Task 10 · La reserva contra `create_reservation`

**Files:** Create `lib/reservas/acciones.ts` · Modify `app/(alumno)/catalogo/[id]/page.tsx`

- [ ] **Step 0:** Resolver el punto a verificar **5**: que la RPC sea alcanzable desde el cliente.
- [ ] **Step 1:** La Server Action que llama a `create_reservation`. **Cinco argumentos**, y el alumno **no**
      es uno de ellos: la RPC lo deduce con `auth.uid()`. Pasarlo sería la primera vez que el cliente
      afirma una identidad, y es exactamente lo que el diseño prohíbe.
- [ ] **Step 2:** Resolver el punto a verificar **3**: disparar **cada uno** de los ocho rechazos y anotar
      su mensaje y su `SQLSTATE` reales. **La interfaz muestra el mensaje del motor**, no uno inventado que
      pueda desincronizarse de él.
- [ ] **Step 3:** Resolver el punto a verificar **4**, que es el más importante de la tanda: **pedir la
      primera y la última franja que la rejilla ofrece** y comprobar que la RPC las acepta. Si rechaza
      alguna, el calendario miente y se para.
- [ ] **Step 4:** El botón «Reservar» del detalle deja de estar deshabilitado y enlaza a `/reservar`
      *(cierra el Step 5 de la Task 6 de la 2A)*. **Si al terminar sigue diciendo «muy pronto», la tarea no
      está hecha.**
- [ ] **Step 5:** Tras reservar, a `/mi-panel`. Existe desde la Task 12, así que **hasta entonces esto da
      404** — y eso es correcto y está dicho por delante, igual que la tanda 1 hizo con `/login`.
- [ ] **Step 6:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 2B.10: la reserva`.

## Task 11 · El bloqueo por sanción

**Files:** Modify `lib/reservas/consultas.ts`, `app/(alumno)/catalogo/[id]/reservar/page.tsx`

- [ ] **Step 1:** Leer `alumnos.banned_until` **una vez**, donde ya se resuelve el perfil. **No es un
      control:** `create_reservation` ya rechaza con sanción vigente (paso 2). Esto **anticipa** el rechazo
      para no ofrecer un botón que va a fallar. El comentario lo dice, porque el archivo invita a lo
      contrario.
- [ ] **Step 2:** El mensaje distingue los dos casos que el motor distingue: **15 días** por dos
      `not_picked_up` en 90 días, y **permanente** —`banned_until = 'infinity'`— por `not_returned`
      *(D-12)*. Una fecha de `infinity` **no se formatea como fecha**.
- [ ] **Step 3:** Montar el escenario en local con un `update` directo sobre `alumnos` *(corrección 7: esta
      tanda no puede provocar una sanción, porque el trigger lo dispara el personal en la T3)*.
- [ ] **Step 4:** **Comprobar los dos sentidos.** Con sanción, no se ofrece reservar; **y la RPC sigue
      rechazando aunque se la llame directamente**, que es lo que prueba que el control no se movió al
      cliente. Quitar la comprobación de la interfaz **no** debe abrir nada.
- [ ] **Step 5:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 2B.11: el bloqueo por sancion`.

## Task 12 · `/mi-panel`

**Files:** Create `components/reservas/tarjeta-reserva.tsx`, `app/(alumno)/mi-panel/page.tsx` · Modify
`components/cabecera.tsx`

- [ ] **Step 1:** Las reservas del alumno, con su producto y su sede. **Sin filtrar por `alumno_id` en el
      cliente:** `reservations_select_own` ya lo hace, y filtrar otra vez sugeriría que hace falta.
- [ ] **Step 2:** Agrupar por lo que le importa al alumno —próximas, en curso, pasadas—, **derivado del
      `status` real** y no de un campo inventado. Los estados son `reserved`, `active`, `completed`,
      `cancelled`, `expired`, `not_picked_up`, `not_returned`.
- [ ] **Step 3:** **La pantalla vacía, y se diseña en serio:** cero reservas es el estado de producción hoy
      *(corrección 6)*, así que es lo primero que alguien va a ver. Con un enlace al catálogo.
- [ ] **Step 4:** `/mi-panel` entra en la cabecera con sesión.
- [ ] **Step 5:** Verificar en el navegador con reservas montadas en local **y** con cero.
- [ ] **Step 6:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 2B.12: mi-panel`.

## Task 13 · Cancelación con motivo

**Files:** Create `components/reservas/dialogo-cancelar.tsx` · Modify `lib/reservas/acciones.ts`

- [ ] **Step 1:** El botón **solo existe en `reserved`** *(corrección 3)*. En `active` **desaparece**, no se
      deshabilita: una reserva ya entregada no se cancela, se devuelve.
- [ ] **Step 2:** El diálogo con el motivo. **Obligatorio en el motor** (BR-17), y el cliente lo pide antes
      solo para no gastar un viaje. **La validación de verdad está en la RPC**, y el comentario lo dice.
- [ ] **Step 3:** La Server Action llama a `cancel_reservation`. **Nunca un `update` directo**
      *(corrección 8: el alumno tiene el privilegio de columna pero no la política, así que su `update`
      afectaría cero filas **sin error**)*. Ese comentario es de los que evitan un fallo silencioso dentro
      de seis meses.
- [ ] **Step 4:** Probar los tres rechazos: motivo vacío, reserva ajena y estado distinto de `reserved`.
      **La ajena es la que importa**, porque prueba que la comprobación vive en la RPC y no en la pantalla.
- [ ] **Step 5:** Comprobar que **cancelar libera la franja**: la rejilla vuelve a ofrecerla. Es la
      propiedad que une esta tarea con la Task 9, y la Fase 1 ya tuvo una prueba que pasaba por casualidad
      sobre esto — **se monta con un producto de UNA unidad**, para que no haya otra que enmascare el
      resultado.
- [ ] **Step 6:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 2B.13: cancelacion con motivo`.

## Task 14 · La encuesta *(BR-18)* — **una por alumno**

**Files:** Create `app/(alumno)/encuesta/page.tsx` · Modify `lib/reservas/acciones.ts`,
`app/(alumno)/mi-panel/page.tsx`

> ⚠ **Esta tarea cambió de forma al escribir el plan** *(corrección 4)*. No cuelga de una reserva: es una
> encuesta de satisfacción con el servicio, **una por alumno y editable**.

- [ ] **Step 1:** La pantalla: cinco valoraciones de **1 a 5** —los `CHECK` lo imponen—, `would_recommend`
      booleano, y tres textos libres. **Todas las columnas son nulables salvo `alumno_id`**, así que se
      puede enviar parcial: la interfaz decide si lo permite, y **lo decide diciéndolo**.
- [ ] **Step 2:** Es la **única** escritura de esta tanda que no pasa por una RPC: `insert` directo, con
      `surveys_insert_own` decidiendo. `alumno_id` **no se manda desde el cliente** si se puede evitar; si
      hay que mandarlo, la política lo contrasta contra `private.current_alumno_id()` igual.
- [ ] **Step 3:** **Si ya existe, se edita.** El `UNIQUE (alumno_id)` convierte un segundo envío en
      `23505`, así que la pantalla carga la existente y hace `update`. **Se prueba enviando dos veces.**
- [ ] **Step 4:** La invitación vive en `/mi-panel`, y **no se repite si ya la contestó**.
- [ ] **Step 5:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 2B.14: encuesta de satisfaccion`.

## Task 15 · Verificación de punta a punta

- [ ] **Step 1:** `npx supabase db reset` y `npx supabase test db`: **142 aserciones en 23 archivos**. Esta
      tanda no toca SQL, así que otro número significa que algo se tocó sin querer.
- [ ] **Step 2:** El recorrido entero en un navegador de verdad, por `127.0.0.1:3000`: entrar → catálogo →
      detalle → reservar → elegir duración, día y franja → confirmar → `/mi-panel` → cancelar con motivo →
      comprobar que la franja **vuelve a ofrecerse** → encuesta → salir.
- [ ] **Step 3:** **El recorrido del alumno sancionado**, que es el otro camino: sanción montada, y la
      reserva rechazada **por la RPC** aunque se fuerce la llamada.
- [ ] **Step 4:** La prueba que resume la tanda: **¿ofrece la rejilla algo que la RPC rechace?** Barrer el
      día entero pidiendo la primera y la última franja de varias duraciones.
- [ ] **Step 5:** `typecheck`, `lint`, `test` y `build`. **Anotar cuántas rutas deja el build y cuántas
      pruebas de Vitest hay**, para comparar con las diez rutas y las cero pruebas de la 2A.

## Task 16 · Cierre y documentación

- [ ] **Step 1:** Actualizar `ESTADO_Y_PLAN.md` —tabla de tandas, tarea **2.6**, la bitácora—,
      `FASE_2_DISENO.md` con las correcciones fechadas que la ejecución haya destapado, y `CLAUDE.md`.
- [ ] **Step 2:** **Cerrar las ediciones de documentación ANTES de pasar los comandos de git.**
- [ ] **Step 3:** Entregar los comandos de PowerShell para la rama, el push y el PR. Los ejecuta Alejandro.
- [ ] **Step 4:** **Esperar a que el CI deje de moverse antes de escribir que está verde.** Son cuatro
      corridas: dos del PR y dos del merge en `develop`. Es la lección que la tanda 0 registró en tres
      versiones y que la 2A volvió a rozar.

---

## Lo que esta tanda NO hace, para que no se cuele

- **No mueve el estado de una reserva.** Entregar, recibir, marcar como no recogida — todo eso es la **T3**,
  y es lo que dispara las sanciones *(corrección 7)*.
- **No toca `inventory_units`** ni sus códigos de activo.
- **No construye pantalla de admin ni de operador.**
- **No añade migraciones.** Si hace falta SQL, se registra como desvío antes de escribirlo.

## Pendiente que esta tanda hereda

- **Q-14 · el buffer desalinea la cola del bloqueo**, igual que la duración. Hoy no muerde: los 34
  productos tienen `buffer_minutes = 120`, múltiplo de 30. **El seed local, con 30 minutos en el trípode,
  tampoco lo rompe.** Se decide en la T3, cuando el admin tenga interfaz para cambiarlo.
- **`supabase/setup-cli@v1` apunta a Node.js 20**, ya deprecado y forzado a Node 24 por GitHub. Anotado el
  2026-08-10 al leer la corrida del merge del PR #25. No rompe hoy; candidato a la **T4**.
