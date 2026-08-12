# Fase 2 · Tanda 3A — El mostrador · Plan de implementación

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

### Task 1 · El andamio del personal *(2026-08-11)*

1. **Ninguna tarea creaba `app/(personal)/mostrador/page.tsx`.** La «Estructura de archivos» la lista como
   nueva y la Task 5 dice «Modify», pero **nadie la crea**. Sin ella el grupo `(personal)` no aporta ni una
   ruta al `build`, y el andamio no se puede abrir en un navegador — que es lo único que ha encontrado los
   fallos de esta fase. **La crea la Task 1**, mínima y diciendo que las columnas llegan después: una
   pantalla que finge estar hecha es peor que una que dice que no lo está.
2. **Los enlaces a `/admin/*` NO entran todavía**, aunque el Step 2 los pedía bajo `role === "admin"`. Esas
   cinco pantallas son de la T3B, así que hoy serían **enlaces a un 404**. El hueco queda marcado en
   `components/cabecera-personal.tsx` con la condición escrita. **Y un efecto preexistente que esto no
   arregla y conviene no confundir con un fallo nuevo:** `lib/auth/destino.ts` manda al admin a
   `/admin/inventario` nada más entrar, y esa ruta seguirá dando 404 hasta la T3B.
3. **El `--dry-run` acertó exactamente, y `globals.css` no se tocó.** Predijo «Files (5) +4 new, =1 skip»
   —`table`, `textarea`, `label`, `dialog` nuevos y `button` idéntico— y eso fue lo que pasó: cuatro
   archivos, cero modificaciones, `package.json` y `package-lock.json` intactos. **D-30 no se repitió**, y
   la razón por la que se sabe no es que el build siguiera verde —en la T0 también lo estaba con el defecto
   dentro— sino que se miró el diff.
4. **Se retiró un truco para callar al linter.** La primera versión de la cabecera llevaba
   `{role === "admin" && null}`, escrito para que ESLint no marcara `role` como prop sin usar. Es código que
   no renderiza nada y existe solo para satisfacer una herramienta. **La regla tenía razón —el prop no se
   usaba—, y la respuesta correcta no era esquivarla**: la cabecera ahora muestra con qué rol se está
   operando. Eso es **visibilidad y no estética**: la misma persona puede ser admin y estar atendiendo el
   mostrador, y lo que marque como «no se retiró» sanciona a un alumno de verdad.
5. **Punto a verificar 3, resuelto: catorce rutas**, contra las trece de la T2B, y **las mismas tres
   estáticas** —`/_not-found`, `/faq`, `/login`—. La predicción del plan se cumplió sin desviación.
6. **`npm run test` sigue en 43**, sin cambios: esta tarea no añade lógica pura que probar. El verde de
   `test` aquí **no afirma nada** sobre lo que se escribió, y conviene decirlo en vez de contarlo como
   evidencia.

---

## Por qué la T3 se parte en dos

**D-37, tomada el 2026-08-11 por Alejandro al aprobar este plan.** La T3 son las tareas 2.7, 2.8 y 2.9 del
plan maestro — el personal. Su desglose dio **22 tareas**, muy por encima del umbral de quince que fija el
diseño. El corte no es por tamaño, sino por la naturaleza del riesgo: el mismo criterio que ya acertó una
vez, cuando D-34 partió la T2 en 2A (solo lectura, probable contra producción sin riesgo) y 2B (reglas de
negocio, solo en local).

- **T3A · El mostrador** (tarea 2.7). Diez tareas, este documento. Es la primera tanda del proyecto que
  **puede sancionar a un alumno**: el trigger `apply_penalties` salta cuando el personal marca
  `not_picked_up` o `not_returned`. Superficie pequeña, consecuencia grave e irreversible para una persona.
- **T3B · La administración** (tareas 2.8 y 2.9). Doce tareas. Inventario, imágenes con firma de
  Cloudinary, reservas, días inhabilitados, estadísticas, personal y ajustes. No sanciona a nadie, pero
  toca el catálogo real de 34 productos y 92 unidades e introduce el primer secreto de servidor del
  proyecto. Su plan se escribe cuando le toque, en `FASE_2_TANDA_3B.md`; aquí solo va su índice de tareas
  al final de este documento, para que se vea que el corte reparte trabajo real y no aparca lo difícil.

Un PR por tanda, así que son dos PR.

---

## Decisiones tomadas el 2026-08-11, al aprobar este plan

**D-38 · Se cierra Q-17: no se cancela una reserva ya empezada.** El enunciado de Q-17 era que un alumno
que no aparece a recoger el equipo puede cancelar a las 14:00 una reserva de las 10:00, y esa cancelación
**blanquea la falta** — `cancelled` es un estado terminal y le impide al personal marcar luego
`not_picked_up`. La regla elegida: la cancelación se cierra en cuanto llega la hora de inicio; a partir de
ahí solo el mostrador mueve la reserva. **Es SQL: la migración 23 del proyecto.** Dos alternativas quedaron
descartadas, y conviene dejarlas escritas porque el enunciado equivocado sigue circulando: que cancelar
tarde contara como falta (más justo con quien avisa, pero toca el trigger de sanciones) y que el mostrador
pudiera marcar sobre una reserva ya cancelada (rompe que los estados terminales sean terminales, una
propiedad que la Fase 1 construyó a propósito).

**D-39 · El buffer de 120 minutos se midió, no se estimó, y se queda.** Se preguntó explícitamente antes
de darle interfaz al admin, porque no era una pregunta técnica: con `buffer_minutes = 120`, media hora
reservada deja nueve franjas ocupadas de veintiocho y quema 4h30 de una jornada de 14h — medido en la
Task 15 de la T2B. La respuesta es que alguien cronometró cuánto tarda un equipo en volver a estar
prestable: revisar, cargar batería, limpiar. **El número se queda.** Consecuencia directa: **Q-14 se puede
cerrar sin tocar SQL**, con la tercera de las tres salidas que el propio diseño escribió en su §15 —«que
la interfaz de admin solo ofrezca múltiplos»— y no con las otras dos, que eran un trigger sobre `products`
o redondear `blocked_range`, esta última tocando una migración probada. Construir esa pantalla es trabajo
de la T3B: aquí solo se deja anotado que la salida ya está elegida.

**D-40 · Inhabilitar un día cancela lo no retirado y respeta lo ya entregado.** La especificación funcional
(F8) manda cancelar las reservas `reserved` **y** `active` del día. El motor de la Fase 1 solo permite la
mitad: `active → cancelled` no está en la lista de transiciones válidas de
`enforce_reservation_transition()`. La regla elegida es la que el motor ya permite hoy: se cancelan solas
las reservas todavía no retiradas, con el motivo de la administración, y los préstamos ya en curso siguen
vivos para que el alumno los devuelva normal. **No toca SQL.** Es una corrección explícita a F8, no una
omisión. La ejecuta la T3B, que construye `/admin/dias`; se registra aquí porque la decisión se tomó al
escribir este plan.

---

## Tres choques entre la especificación funcional y el motor

Dos son de la T3B y se dejan escritos ahora, antes de que alguien los descubra a mitad de ejecución.

1. **F7 manda borrar una unidad en cascada manual — notas, luego reservas, luego la unidad —, y borrar el
   producto si era la última. No se puede, y es a propósito.** `inventory_reservations` no tiene ningún
   `GRANT` de `DELETE` para nadie ni ninguna política de `DELETE`, y la clave foránea
   `inventory_reservations_unit_id_fkey` no cascada — verificado en
   `supabase/migrations/20260805030123_baseline.sql:455`, sin `ON DELETE CASCADE`. Intentar borrar una
   unidad con historial de reservas falla. La baja de una unidad es ponerla en `retired`, que es justo para
   lo que existe ese estado. **T3B.**
2. **F8 y la máquina de estados.** Ya resuelto por D-40, arriba. **T3B.**
3. **`/admin/personal` solo puede dar de alta a quien ya inició sesión alguna vez.** Insertar en
   `staff_members` exige un `user_id` que referencia `auth.users`, y la aplicación no puede leer ese
   esquema: `supabase/config.toml` expone `schemas = ["public", "graphql_public"]`. El único sitio donde la
   aplicación ve un `user_id` es `alumnos.auth_user_id`, y esa fila la crea el trigger
   `handle_new_auth_user` al **pedir** el magic link, no al abrirlo
   (`supabase/migrations/20260805194424_alumno_provisioning.sql`). Así que el alta se hace buscando por
   correo entre quienes ya entraron. La alternativa sería `service_role`, y el proyecto tiene escrito que
   la aplicación nunca la usa: si un flujo la necesita, no falta una clave, falta una política. **T3B.**

---

## Lo que ya está verificado contra el esquema

Leído en las migraciones y en el código de la T2B, y confirmado antes de escribir este plan. Sirve para no
volver a mirarlo a mitad de una tarea.

| Pregunta | Respuesta, y dónde está escrita |
|---|---|
| ¿Qué transiciones de estado existen? | `reserved → active, cancelled, not_picked_up` y `active → completed, not_returned`. Los otros cuatro estados son terminales — `enforce_reservation_transition()`, `supabase/migrations/20260806005731_reservation_state_machine.sql` |
| ¿Quién mueve el estado? | Todo el personal, admin y operador por igual (D-16). El mismo archivo concede `grant update (status, cancellation_reason) ... to authenticated` y crea la política `reservations_update_staff`, que exige `private.is_staff()` |
| ¿Cancelar exige motivo también cuando lo hace el personal? | Sí: la regla vive en el trigger y no en la RPC, para que la cumplan las dos puertas |
| ¿Qué dispara una sanción? | El trigger `apply_penalties`, `AFTER UPDATE OF status` — `supabase/migrations/20260806013146_penalties.sql` |
| ¿Cuánto castiga cada falta? | `not_returned` → `banned_until = 'infinity'`. El segundo `not_picked_up` en 90 días —contra `updated_at`— → 15 días, con `greatest(...)` para que una sanción nueva no acorte una que ya corría |
| ¿Por qué el trigger es `SECURITY DEFINER`? | `banned_until` no tiene `GRANT` para nadie, ni para el admin: un privilegio de columna se concede a un rol, y `authenticated` incluye a los alumnos |
| ¿Se puede corregir una sanción puesta por error? | Solo con `admin_set_ban`, de admin, mismo archivo. **Un operador no puede deshacer su propio error** |
| ¿Quién anota una unidad? | El personal, política `unit_notes_insert_staff` — `supabase/migrations/20260805195549_traceability.sql`. `created_by` lo pone un `DEFAULT auth.uid()`, y el `GRANT` de `INSERT` solo enumera `(unit_id, note)`: el cliente no puede mentir sobre quién anotó |
| ¿Se puede borrar una nota? | Solo el admin, `unit_notes_delete_admin` — mismo archivo. Fuera del alcance de esta tanda |
| ¿Quién escribe en `reservation_status_log`? | Nadie por `INSERT`/`UPDATE`/`DELETE` directo, ni el admin. La única escritura es el trigger `log_reservation_status`, `SECURITY DEFINER` |
| ¿Qué ve el personal en `alumnos`? | El admin, a todos. El operador, solo a quien tenga una reserva viva — política `alumnos_select_staff` y el helper `private.tiene_reserva_viva`, que cuenta `reserved` y `active` — `supabase/migrations/20260805194848_alumno_policies.sql` (D-11) |
| ¿Qué pasa si el operador marca `not_picked_up` y esa era la única reserva viva del alumno? | Pierde el acceso a la fila de `alumnos` en el acto: la reserva se sigue viendo —`reservations_select_staff` no depende de esto—, pero el nombre y el correo del alumno vuelven nulos al recargar |
| ¿`cancel_reservation` acepta cualquier estado hoy? | No, solo `reserved` — `if v_status <> 'reserved' then raise`, `supabase/migrations/20260806012057_cancel_reservation_rpc.sql:44` |
| ¿Cuál es el orden de sus cuatro rechazos hoy? | Motivo vacío → reserva inexistente → reserva ajena → estado distinto de `reserved`. El emparejamiento en pantalla va por el **texto** del mensaje y no por el `SQLSTATE`, porque `23514` lo comparten dos — `lib/reservas/acciones.ts`, función `mensajeDeRechazoCancelacion()` |
| ¿El botón de cancelar del alumno ya se oculta alguna vez? | Sí, cuando el **fin** de la reserva ya pasó (D-35), reutilizando el grupo `proxima` de `lib/reservas/agrupar.ts`. El propio comentario de `components/reservas/tarjeta-reserva.tsx` deja anotado que ocultarlo también cuando la franja ya **empezó** —y no solo cuando terminó— queda pendiente como **M-12** de `ESPECIFICACION_FUNCIONAL.md`, «cancelación con antelación mínima» |
| ¿`create or replace` sobre una RPC conserva sus privilegios? | Sí — medido en `MIGRATION_DOCS/PLANES/FASE_2_TANDA_0.md`, tabla «Los cuatro puntos a verificar, resueltos midiendo», punto 1, y dejado como comentario en `supabase/migrations/20260806171347_duration_slot_multiple.sql`. El contraejemplo, `drop` + `create`, sí devuelve la función a `anon = true` |
| ¿Ya existe una prueba que cubra «ninguna RPC de `public` es ejecutable por `anon`» en general? | Sí, la cuarta aserción de `supabase/tests/19_function_hardening.sql`, que barre **todas** las funciones de `public` sin enumerarlas por nombre. Una RPC nueva o recreada queda cubierta sin tocar ese archivo |
| ¿Puedo escribir las pruebas nuevas en `24_cancel_reservation.sql`? | **No**: ese archivo ya existe, con `plan(6)` sobre las cuatro reglas actuales de `cancel_reservation`. La numeración de `supabase/tests/` llega hoy hasta `30_signup_domain.sql`; el siguiente número libre es **31** |
| ¿Puede borrarse una unidad con reservas? | No: sin `GRANT` de `DELETE` y sin `ON DELETE CASCADE` en la FK — ver el punto 1 de «Tres choques», arriba |
| ¿Qué esquemas ve la aplicación? | `public` y `graphql_public` — `supabase/config.toml`. No hay forma de leer `auth.users` desde el cliente |
| ¿Qué componentes de `shadcn` existen ya? | `badge`, `button`, `card`, `input`, `separator`, `skeleton` — `components/ui/` |
| ¿Cómo reparte `destino()` al personal? | admin → `/admin/inventario`; operator → `/mostrador` — `lib/auth/destino.ts`. **Las dos rutas dan 404 hoy** |
| ¿`Button` reenvía su `ref`? | No usa `React.forwardRef` — `components/ui/button.tsx`. Es el motivo por el que `DialogoCancelar` (T2B) no envuelve `Dialog.Trigger`/`Dialog.Close` con `asChild`, y por el que su propio comentario dice que un **segundo** consumidor de diálogo es el momento de extraer `components/ui/dialog.tsx` — que es justo lo que hace esta tanda |
| ¿`CabeceraSesion` sirve para el personal? | No: está escrita a propósito para el grupo `(alumno)` — enlaza Catálogo, Mis reservas y FAQ — y su propio comentario explica por qué no vuelve a leer sesión. El personal necesita su propia cabecera |
| ¿El seed local siembra un operador? | Sí: `operador@upc.edu.pe` (`a0000000-…000b`, rol `operator`) y `admin@upc.edu.pe` (`…000a`, rol `admin`) ya están en `supabase/seed.sql`, junto con `alumno.a@upc.edu.pe`. `db reset` no borra estas filas: las vuelve a crear |
| ¿El seed local siembra alguna reserva? | No. `supabase/seed.sql` no inserta ninguna fila en `inventory_reservations`: tras `db reset`, local y producción arrancan igual, en cero |

---

## La forma real de los datos

**Consultado el 2026-08-11 contra `zqfkzgdyeqxzgzpxgadi`.**

| Dato | Valor real |
|---|---|
| Reservas | **0** |
| Filas en `reservation_status_log` | **0** |
| Unidades | 92, todas en estado `active`: 0 en `maintenance`, 0 en `retired` |
| Notas de unidad | 58, repartidas en 50 unidades |
| Unidades sin `asset_code` | 38 de 92 |
| Productos | 34, en 10 categorías, todos con `max_duration_hours = 4` y `buffer_minutes = 120`, y ninguno con `featured = true` |
| Imágenes | 34, una por producto, todas `is_main` y todas con `cloudinary_public_id` nulo |
| Sedes | 2, con 46 unidades cada una |
| Filas en `auth.users` | 1, confirmada |
| Alumnos | 1, con el perfil completo |
| Personal | 1, rol `admin`, activo, correo `u20241b820@upc.edu.pe` |
| Días inhabilitados | 2, ambos en el pasado (2026-03-20 y 2026-03-21), sin motivo y con `created_by` nulo |
| `app_settings` | ventana 7 días · 08:00–22:00 · bloque 30 min · duración mínima 30 min · límite diario 1 |

**El proyecto real no tiene ni una sola reserva**, así que el mostrador no se puede probar contra
producción como se probó la T2A. El escenario de prueba se monta en el stack local. Y ese mismo hecho quita
casi todo el riesgo de la única acción irreversible de la tanda: hoy no hay ningún alumno real a quien
sancionar por error.

El corolario de método que este proyecto ya pagó dos veces —con `featured` en la T2A y con las imágenes de
Cloudinary en la T2B— vuelve a valer aquí: **leer el esquema dice qué columnas existen; solo consultar dice
qué hay dentro.** El seed local es una fixture de valores convenientes, no representativos.

---

## Puntos a verificar

Cinco, y se resuelven midiendo, no razonando desde la memoria.

1. **¿El quinto rechazo de `cancel_reservation` respeta «la más fundamental primero»?** Se dispara cada uno
   de los cinco rechazos a propósito, igual que se hizo con los cuatro en la T2B, y se anota el texto y el
   `SQLSTATE` reales del nuevo. → **Predicción:** no compite con el rechazo por estado —una reserva que no
   está en `reserved` ya se rechaza por esa vía antes de llegar a mirar la hora—, así que el orden entre
   los dos no debería cambiar ningún mensaje que hoy se vea distinto.
2. **¿Sigue en verde `19_function_hardening.sql` (4 aserciones) tras el `create or replace` de la migración
   23?** → **Predicción: sí, sin tocar ese archivo** — ver la fila correspondiente de «Lo que ya está
   verificado contra el esquema». Se confirma corriendo `npx supabase test db` después de la migración, no
   se da por hecho.
3. **¿Cuántas rutas deja el `build`?** La T2B cerró en **trece**, tres estáticas (`/_not-found`, `/faq`,
   `/login`). → **Predicción:** al menos una ruta nueva y dinámica —`/mostrador`—, así que **catorce**, con
   las mismas tres estáticas. Si alguna de esas tres deja de serlo, algo empezó a leer sesión o cookies
   donde no debía.
4. **¿El operador de verdad pierde el acceso a la fila del alumno tras marcar `not_picked_up`, como predice
   `alumnos_select_staff`?** Es el corazón de la Task 9, y **hay que verlo con una sesión de operador
   real, no de admin** — con el admin no ocurre, porque `alumnos_select_staff` le deja ver a todos.
5. **¿El embed de `alumnos` en la consulta del mostrador llega `null` cuando RLS lo bloquea, o PostgREST
   descarta la fila entera?** `lib/reservas/consultas.ts` dedujo —sin medirlo— que un embed bloqueado por
   FK ausente llega `null` y no falta la fila; aquí el bloqueo es por **RLS**, no por FK ausente, así que es
   un caso distinto y no se puede asumir el mismo comportamiento. Se mide en la Task 4, antes de diseñar el
   tipo de la consulta.

---

## Estructura de archivos

```
app/(personal)/layout.tsx                         NUEVO — exige fila activa en staff_members
app/(personal)/mostrador/page.tsx                  NUEVO — las tres columnas

lib/mostrador/consultas.ts                         NUEVO — la lectura del mostrador
lib/mostrador/columnas.ts                          NUEVO — logica pura: en que columna cae cada reserva
lib/mostrador/columnas.test.ts                     NUEVO — Vitest
lib/mostrador/acciones.ts                          NUEVO — Server Actions: entregar, recibir, las dos faltas, anotar

components/cabecera-personal.tsx                   NUEVO — propia del grupo (personal), consciente del rol
components/mostrador/tarjeta-mostrador.tsx          NUEVO — una reserva del mostrador con sus acciones
components/mostrador/dialogo-falta.tsx             NUEVO — confirmacion de not_picked_up / not_returned
components/mostrador/dialogo-nota.tsx              NUEVO — anotar una unidad
components/mostrador/historial-notas.tsx           NUEVO — notas de una unidad
components/mostrador/filtro-fecha.tsx              NUEVO — hoy / 3 dias / semana / todas, sobre "Por entregar"

supabase/migrations/<ts>_cancel_before_start.sql   NUEVO — migracion 23, cierra Q-17 (D-38)
supabase/tests/31_cancel_before_start.sql          NUEVO — 24_cancel_reservation.sql NO se toca

lib/reservas/acciones.ts                           MODIFICADO — mensajeDeRechazoCancelacion(), quinto caso
components/reservas/tarjeta-reserva.tsx            MODIFICADO — el boton de cancelar exige tambien "no empezada"
app/(alumno)/mi-panel/page.tsx                      MODIFICADO — pasa `ahora` a TarjetaReserva, una sola lectura

components/ui/table.tsx                            NUEVO — via shadcn add
components/ui/dialog.tsx                           NUEVO — via shadcn add
components/ui/textarea.tsx                         NUEVO — via shadcn add
components/ui/label.tsx                            NUEVO — via shadcn add

proxy.ts                                           SIN CAMBIOS — la lista blanca ya cierra todo lo nuevo
```

> **`proxy.ts` no se toca**, y es la misma propiedad que compraron la tanda 1 y la T2B: `/mostrador` nace
> protegida sin que nadie tenga que acordarse de añadirla a la lista blanca.

---

## Global Constraints

- **La autorización no se replica.** El proxy redirige, el layout es comodidad, el componente oculta, y
  **quien decide es RLS**. Ninguna comprobación del cliente decide nada, y quitarla nunca debe abrir un
  agujero.
- **Una migración esta tanda, y solo una: la 23.** Si aparece una segunda necesidad de SQL, se registra
  como desvío **antes** de escribirlo, con el costo por delante.
- **La aplicación nunca usa `service_role`.** Si un flujo la pide, falta una política, no una clave.
- **Todo lo que escribe se prueba en local.** Producción tiene cero reservas: no hay licencia para probar
  contra ella, a diferencia de la T2A.
- **Es la primera tanda que puede sancionar a una persona de verdad**, aunque hoy el riesgo real sea nulo
  porque no hay ningún alumno con una reserva en el proyecto real.
- **El árbitro de si una pantalla funciona es `npm run build`, no el navegador ni `npm run dev`.** Medido
  en la Task 15 de la T2B: un servidor de desarrollo viejo se degrada y da `500` con
  `Jest worker encountered ... exceeding retry limit`, y uno recién arrancado puede no registrar una ruta y
  dar `404` sin llegar a escribir `Compiling`, con el código sano en los dos casos.
- **Abrir la pantalla en un navegador de verdad sigue siendo obligatorio.** Es lo único que ha encontrado
  los fallos de esta fase.
- **Se prueba siempre por `http://127.0.0.1:3000`**, nunca por `localhost:3000` (D-33), con `.env.local`
  presente.
- **Borrar `.next/`** al mover, renombrar o borrar algo dentro de `app/`.
- **En PowerShell, `if (comando)` evalúa la salida, no el código de salida.** Para comandos que no imprimen
  nada, mirar `$LASTEXITCODE`.
- Mensajes de commit **sin acentos**. **Claude no toca el remoto.**

---

## Task 1 — El andamio del personal

**Files:** Create `app/(personal)/layout.tsx`, `components/cabecera-personal.tsx` · shadcn add `table`,
`dialog`, `textarea`, `label`

- [ ] **Step 1:** `app/(personal)/layout.tsx`, sobre el mismo patrón que `app/(alumno)/layout.tsx`: lee
      `getClaims()`, y si no hay sesión redirige a `/login`. Después consulta `staff_members` por
      `user_id = sub` y `activo = true`; si no hay fila, redirige a `/auth/error` — el mismo destino que
      `lib/auth/destino.ts` usa para "sin ninguna fila reconocible". El tipo del layout se escribe a mano,
      no con `LayoutProps<...>`: los layouts de un grupo entre paréntesis no aparecen en el `LayoutRoutes`
      que genera Next, la misma razón que ya dejaron anotada `app/(alumno)/layout.tsx` y
      `app/(perfil)/layout.tsx`.
- [ ] **Step 2:** `components/cabecera-personal.tsx`, nueva y no una reutilización de `CabeceraSesion`.
      `CabeceraSesion` está escrita para el grupo `(alumno)` —enlaza Catálogo, Mis reservas, FAQ— y su
      propio comentario explica por qué no repite la lectura de sesión; el personal necesita otros
      enlaces. Recibe el `role` que el layout ya leyó en el Step 1 y **no vuelve a consultarlo**: enlaza
      siempre a `/mostrador` —D-16, todo el personal lo usa—, y a `/admin/*` **solo si `role === "admin"`**.
      Es la nota de visibilidad de esta tarea: si el layout ofreciera `/admin/inventario` a un operador,
      `is_admin()` se lo negaría en la base y vería una pantalla vacía sin entender por qué.
- [ ] **Step 3:** `npx shadcn add table dialog textarea label` — sin `@latest`, para resolver la versión
      que ya fija `package.json` (`^4.16.2`), igual que hizo la T2A con la corrección 1 de su Task 1.
      **Antes, con `--dry-run`:** la misma corrección de la T2A dejó escrito que `--dry-run` **predice**
      lo que el generador va a tocar —allí dijo «Files (4) +4 new», sin una sola modificación— y que es
      mejor instrumento que medir los hashes después. Los hashes no se retiran, pero pasan a **confirmar**
      en vez de a descubrir, y ese es el orden correcto.
- [ ] **Step 4:** **Verificar qué escribió el generador antes de comitear.** En la T0, `shadcn init`
      inyectó su paleta en `oklch` al final de `globals.css` y ganó por cascada: `--primary` pasó de rojo
      UPC a gris casi negro con el build en verde (D-30). Revisar el diff de `globals.css` y de cualquier
      archivo de configuración que `shadcn add` toque, no solo los componentes nuevos.
      **`components/ui/dialog.tsx` es el primer consumidor propio de un envoltorio de diálogo del
      proyecto** — `components/reservas/dialogo-cancelar.tsx` (T2B) construye el suyo directo sobre
      `radix-ui` a propósito, con un comentario que dice que un segundo consumidor es el momento de
      extraer el envoltorio común. Ese momento es este: `dialogo-falta.tsx` y `dialogo-nota.tsx` (Task 6 y
      Task 7) usan `components/ui/dialog.tsx`, no el patrón ad hoc de `dialogo-cancelar.tsx`.
- [ ] **Step 5:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 3A.1: el andamio del personal`.

## Task 2 — Migración 23: no se cancela una reserva ya empezada (cierra Q-17)

**Files:** Create `supabase/migrations/<ts>_cancel_before_start.sql`,
`supabase/tests/31_cancel_before_start.sql`

- [ ] **Step 1: Las aserciones que fallan, primero.** `supabase/tests/31_cancel_before_start.sql` —
      **archivo nuevo**, no `24_cancel_reservation.sql`: ese ya existe, con `plan(6)` sobre las cuatro
      reglas actuales, y no se toca. Casos: cancelar una reserva `reserved` cuyo `start_at` ya pasó se
      rechaza; cancelar una `reserved` cuyo `start_at` sigue en el futuro sigue funcionando igual que
      hoy — es la prueba de que la regla nueva no rompe la vieja.
- [ ] **Step 2:** `npx supabase test db` y verlas fallar por «no existe la función nueva» — el arnés
      corriendo es lo único que confirma que las pruebas prueban algo.
- [ ] **Step 3: La migración**, con `npx supabase migration new cancel_before_start`. `create or replace
      function public.cancel_reservation`, **sin `drop` delante** — un `drop` reabriría la función al rol
      anónimo, ver la fila correspondiente de «Lo que ya está verificado contra el esquema». La consulta
      que ya trae `v_owner` y `v_status` pasa a traer también `start_at`. La comprobación nueva va **justo
      después** de la de `v_status <> 'reserved'` y antes del `UPDATE` final: no compite con ninguna de las
      otras cuatro por el mismo motivo que anota el punto 1 de «Puntos a verificar» — una reserva que no
      está en `reserved` ya se rechazó antes de llegar a mirar la hora, así que el orden entre las dos no
      cambia ningún mensaje existente. El mensaje y el `SQLSTATE` exactos se deciden al escribir el
      archivo, en el mismo estilo que los otros cuatro —texto llano, sin tildes, `errcode` de
      `check_violation`— y se fijan con el `throws_ok` del Step 1.
- [ ] **Step 4: No hace falta repetir el `revoke`/`grant`.** `create or replace` conserva los privilegios
      de la función — medido, no supuesto: ver la fila de la tabla de arriba y el comentario de
      `supabase/migrations/20260806171347_duration_slot_multiple.sql`. Escribir el `revoke`/`grant` de
      todas formas no sería incorrecto, pero arrastraría una precaución sin motivo donde el propio proyecto
      ya dejó escrito por qué no hace falta.
- [ ] **Step 5:** `npx supabase db reset` y `npx supabase test db`. Confirmar dos cosas: que
      `31_cancel_before_start.sql` pasa entero, y que **`19_function_hardening.sql` sigue en `plan(4)`
      verde** — su cuarta aserción ya cubre «ninguna función de `public` es ejecutable por `anon`» sin
      enumerar `cancel_reservation` por nombre, así que no hace falta tocar ese archivo, solo comprobar que
      sigue pasando.
- [ ] **Step 6:** Contar migraciones y aserciones: de **22 a 23**, y las aserciones pgTAP suben con las de
      `31_cancel_before_start.sql`. Anotar el número exacto.
- [ ] **Step 7:** `typecheck`, `lint`, `test`, `build` y commit
      `Tanda 3A.2: cierra Q-17, no se cancela una reserva ya empezada (D-38, migracion 23)`.

> **Esto contradice otra vez la frase «ninguna tanda vuelve a tocar SQL» de la T0** — que ya la contradijo
> D-32 en la T1. La frase se corrige fechada, no se borra: es tarea de la Task 10.

## Task 3 — El alumno deja de ver un botón imposible

**Files:** Modify `lib/reservas/acciones.ts`, `components/reservas/tarjeta-reserva.tsx`,
`app/(alumno)/mi-panel/page.tsx`

- [ ] **Step 1: `mensajeDeRechazoCancelacion()`.** Hoy tiene texto propio solo para el rechazo #4 y deja
      los otros tres en crudo. Añadir un quinto caso, emparejado **por el texto** del mensaje que fije la
      Task 2 y no por el `SQLSTATE` — el comentario de la función ya explica por qué: `23514` lo comparten
      dos rechazos, y con el quinto puede que tres.
- [ ] **Step 2: El botón deja de ofrecerse cuando la reserva ya empezó.** Hoy la condición de
      `components/reservas/tarjeta-reserva.tsx` es
      `reserva.estado === "reserved" && grupo === "proxima"`, y `grupo === "proxima"` solo mira si el
      **fin** de la reserva ya pasó (D-35, `lib/reservas/agrupar.ts`). Una reserva de 10:00 a 10:30 vista a
      las 10:15 sigue en `proxima` porque el fin —10:30— todavía no llegó, así que hoy el botón se seguiría
      ofreciendo justo en el caso que D-38 cierra. **No se recalcula el reloj dentro de
      `TarjetaReserva`** — sería repetir la lectura que el comentario de `TarjetaReservaProps` ya señala
      como el fallo M-7 a evitar. En vez de eso, `app/(alumno)/mi-panel/page.tsx` pasa el mismo `ahora`
      que ya calcula una sola vez (línea 38 hoy) como prop nueva a `TarjetaReserva`, y la condición del
      botón se extiende a
      `reserva.estado === "reserved" && grupo === "proxima" && new Date(reserva.inicio) > ahora`. Esto
      **extiende el criterio de D-35**, no lo sustituye: D-35 sigue ocultando el botón cuando el fin ya
      pasó; esto lo oculta también cuando el **inicio** ya pasó, aunque el fin siga en el futuro.
- [ ] **Step 3: Esto no cierra M-12.** El comentario que hoy vive en `tarjeta-reserva.tsx` señala esta
      misma línea de código como el lugar pendiente de M-12 —«cancelación con antelación mínima» de
      `ESPECIFICACION_FUNCIONAL.md`—, y M-12 pide algo más amplio: que tampoco se pueda cancelar en el
      último minuto **antes** de empezar. D-38 solo cierra la mitad —después de empezar—, así que el
      comentario se corrige para decir eso y M-12 se deja igual de pendiente.
- [ ] **Step 4:** Prueba de Vitest para la regla de visibilidad del botón, en el mismo archivo o al lado de
      las pruebas que ya cubren `grupoDeReserva()`.
- [ ] **Step 5:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 3A.3: el alumno ya no ve un boton imposible`.

## Task 4 — Las tres columnas del mostrador

**Files:** Create `lib/mostrador/consultas.ts`, `lib/mostrador/columnas.ts`, `lib/mostrador/columnas.test.ts`

Solo lectura.

- [ ] **Step 0:** Resolver el punto a verificar 5 antes de diseñar el tipo: contra el stack local, con una
      sesión de **operador**, medir si el embed de `alumnos` en una consulta a `inventory_reservations`
      llega `null` cuando `alumnos_select_staff` lo bloquea, o si PostgREST descarta la fila entera. El
      tipo de la consulta se escribe según lo que se mida, no según lo que parezca razonable.
- [ ] **Step 1:** `lib/mostrador/consultas.ts` trae, en una sola consulta, las reservas con
      `status in ('reserved', 'active')`, con el join a producto, unidad, sede y alumno que ya usa
      `misReservas()` en `lib/reservas/consultas.ts` como referencia de forma. **Sin filtrar por rol en el
      cliente**: `reservations_select_staff` ya deja ver todo al personal, y `alumnos_select_staff` ya
      recorta lo que se ve del alumno según sea admin u operador — filtrar otra vez sugeriría que el
      aislamiento hace falta aquí.
- [ ] **Step 2:** `lib/mostrador/columnas.ts`, lógica pura como `lib/reservas/agrupar.ts`: una función que,
      dado el `status`, el `fin` y un `ahora` **recibido y no calculado dentro**, devuelve a qué columna
      pertenece la reserva —`por_entregar` (`reserved`), `activas` (`active` y fin ≥ ahora), `por_devolver`
      (`active` y fin < ahora)—, siguiendo F5 de `ESPECIFICACION_FUNCIONAL.md`. El tipo del alumno admite
      `null` desde el principio, por lo que midió el Step 0: la pantalla tiene que leerse bien sin él, no
      como una excepción rara.
- [ ] **Step 3:** `lib/mostrador/columnas.test.ts`, con Vitest, siguiendo el mismo estilo que
      `lib/reservas/agrupar.test.ts`: casos con `ahora` en la frontera exacta entre `activas` y
      `por_devolver`.
- [ ] **Step 4:** `typecheck`, `lint`, `test` y commit `Tanda 3A.4: las tres columnas del mostrador, lectura pura`.

## Task 5 — Entregar y recibir

**Files:** Create `lib/mostrador/acciones.ts` (primeras dos acciones) · Modify `app/(personal)/mostrador/page.tsx`

- [ ] **Step 1:** Dos Server Actions: `entregar(reservationId)` hace `reserved → active`, `recibir(reservationId)`
      hace `active → completed`. Las dos son un `UPDATE` directo sobre `status`, **no una RPC**: el
      personal sí tiene la política `reservations_update_staff` y ninguna de las dos transiciones exige
      motivo —solo `cancelled` lo exige, en el trigger de la máquina de estados—.
- [ ] **Step 2: Por qué esto no contradice que cancelar sea siempre RPC.** El alumno cancela por RPC porque
      **no tiene** política de `UPDATE` sobre `inventory_reservations` —su `UPDATE` directo afectaría cero
      filas sin error—. **La fuente es la sección «8. El alumno tiene `UPDATE` sobre `status` y no le sirve
      de nada» del cuerpo de `FASE_2_TANDA_2B.md`, no su corrección 8**, que trata de otra cosa —la sede que
      se perdía entre catálogo, detalle y reserva—. Corregido al verificar este plan: el hecho era cierto y
      la fuente estaba mal, que es el género de error que este proyecto lleva catorce veces persiguiendo.
      El personal sí tiene esa política, así que
      un `UPDATE` directo desde el personal **sí** llega a la fila; la RPC de cancelar existe para el
      alumno porque es su única vía, no porque `UPDATE` sea inseguro en general.
- [ ] **Step 3:** Cada acción llama a `revalidatePath('/mostrador')` al terminar, siguiendo el patrón de
      `lib/reservas/acciones.ts`.
- [ ] **Step 4:** Los botones «Producto entregado» y «Producto devuelto» en `tarjeta-mostrador.tsx`
      (Task 6 los completa con las dos faltas).
- [ ] **Step 5:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 3A.5: entregar y recibir`.

## Task 6 — Las dos faltas (la tarea delicada de la tanda)

**Files:** Modify `lib/mostrador/acciones.ts` · Create `components/mostrador/dialogo-falta.tsx`

**Es la primera vez que el proyecto sanciona a una persona.** La sanción la aplica un trigger que el
cliente no ve y no puede deshacer: `not_returned` es bloqueo permanente, y el segundo `not_picked_up` en
90 días son 15 días.

- [ ] **Step 1:** `marcarNoRecogida(reservationId)` hace `reserved → not_picked_up`, `UPDATE` directo igual
      que Task 5.
- [ ] **Step 2:** `marcarNoDevuelta(reservationId, nota)` hace `active → not_returned` **y** escribe la
      anotación obligatoria en `inventory_unit_notes` que pide F5 —«No se devolvió fuerza una anotación de
      alerta roja»—. **Orden decidido aquí y no en el encargo:** primero el `INSERT` de la nota, después
      el `UPDATE` de `status`. La API de Supabase no da una transacción entre dos llamadas del cliente, así
      que las dos escrituras no son atómicas; si se hiciera al revés y el `INSERT` de la nota fallara
      después de aplicar la sanción, quedaría un alumno sancionado sin ningún rastro escrito de por qué.
      Con el orden elegido, si la nota falla, la sanción nunca se dispara.
- [ ] **Step 3:** `components/mostrador/dialogo-falta.tsx`, sobre `components/ui/dialog.tsx` (Task 1).
      **Confirmación explícita antes de ejecutar, con el texto diciendo la consecuencia real** —no un
      genérico «¿estás seguro?»—: para `not_picked_up`, algo como «si esta es la segunda vez que
      [alumno] no recoge en 90 días, quedará bloqueado 15 días»; para `not_returned`, «esto bloquea a
      [alumno] de forma permanente, y solo un administrador puede revertirlo». El texto no afirma con
      certeza si es la primera o la segunda falta —eso lo decide el trigger al momento, y precalcularlo
      sería otra lectura del mismo dato que podría desincronizarse—, así que avisa del peor caso posible sin
      prometer un resultado exacto.
- [ ] **Step 4:** Para `not_returned`, el campo de nota es obligatorio en el diálogo antes de habilitar
      confirmar, con `.trim()` — el mismo patrón que `dialogo-cancelar.tsx` usa para el motivo.
- [ ] **Step 5:** Verificar el efecto **en la base**, no solo que el botón no dé error: tras marcar
      `not_picked_up` una vez, `banned_until` sigue en `NULL`; tras la segunda vez en 90 días, se pone a
      15 días desde `now()`; tras `not_returned`, se pone a `infinity`. Y que `reservation_status_log`
      recibió su fila en cada caso.
- [ ] **Step 6: Levantar una sanción por error no es tarea de esta pantalla.** Solo `admin_set_ban` puede,
      y es de admin — un operador no puede corregir su propio error desde el mostrador. Se deja escrito y
      no se construye nada para compensarlo: esa pantalla es de la T3B.
- [ ] **Step 7:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 3A.6: las dos faltas, con confirmacion y sancion real`.

## Task 7 — Anotaciones de unidad

**Files:** Create `components/mostrador/dialogo-nota.tsx`, `components/mostrador/historial-notas.tsx` ·
Modify `lib/mostrador/acciones.ts`

- [ ] **Step 1:** `anotar(unitId, nota)` en `lib/mostrador/acciones.ts`, `INSERT` en `inventory_unit_notes`
      con las columnas `(unit_id, note)` únicamente — `created_by` no se manda: lo pone el `DEFAULT`, y el
      `GRANT` de `INSERT` no incluye esa columna, así que mandarla no haría nada salvo confundir a quien lea
      el código.
- [ ] **Step 2:** `historial-notas.tsx` lista las notas de una unidad, más recientes primero. Es una lectura
      nueva, separada de `lib/mostrador/consultas.ts` porque no depende de una reserva sino de una unidad.
- [ ] **Step 3:** `dialogo-nota.tsx` es el punto de entrada general —anotar cualquier unidad desde el
      mostrador, no solo al marcar una falta—. La escritura que Task 6 hace dentro de
      `marcarNoDevuelta()` es un caso particular de la misma tabla, no una tabla distinta; si conviene
      compartir código entre las dos, se extrae aquí, no antes — la misma regla que ya aplicó
      `dialogo-cancelar.tsx` sobre generalizar con un único caso real.
- [ ] **Step 4:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 3A.7: anotaciones de unidad`.

## Task 8 — El filtro de fecha y el reloj

**Files:** Create `components/mostrador/filtro-fecha.tsx` · Modify `app/(personal)/mostrador/page.tsx`

- [ ] **Step 1:** El filtro sobre «Por entregar» que pide F5: hoy / próximos 3 días / esta semana / todas.
      Se aplica sobre los datos ya traídos por `lib/mostrador/consultas.ts`, sin una consulta nueva por
      cada opción.
- [ ] **Step 2: La decisión del reloj, razonada y no copiada del sistema viejo.** F5 describe un reloj que
      refresca cada 60 s en el sistema anterior (Vite). La frontera entre «Activas» y «Por devolver»
      depende de la hora actual, así que una pantalla que nunca se refresca puede mentir con el paso del
      tiempo: una reserva que ya debería estar en «Por devolver» sigue en «Activas» hasta la próxima
      recarga.

      **Las dos salidas:**
      - **(A) Replicar el `setInterval` de 60 s**, con un componente cliente que dispare `router.refresh()`
        o vuelva a pedir los datos del servidor cada minuto. Mantiene la pantalla exacta en todo momento,
        pero tiene un costo real: peticiones a Supabase cada 60 s por cada mostrador abierto,
        indefinidamente, incluso con la pestaña olvidada abierta en un mostrador que es, por naturaleza,
        una pantalla de recepción que puede quedarse encendida un turno entero.
      - **(B) Sin temporizador de cliente.** Cada Server Action de esta tanda (Task 5, Task 6) ya llama a
        `revalidatePath('/mostrador')` al terminar, así que la pantalla se refresca sola cada vez que el
        personal hace algo — que en un mostrador activo es frecuente. Lo único que puede quedar desfasado
        es el borde entre «Activas» y «Por devolver» **cuando nadie actúa por un rato**, y ese desfase no
        es un error de datos: la reserva sigue viéndose, con su hora de fin real a la vista, solo que bajo
        el encabezado que tenía hace unos minutos.

      **Decisión: (B).** El costo de un `setInterval` indefinido en una pantalla que puede quedar abierta
      un turno entero no se paga por una frontera que, en la práctica, se corrige sola con el próximo clic.
      Si en la Task 9 se observa que el desfase molesta de verdad, un botón manual de «Actualizar» es un
      término medio más barato que el temporizador automático — y queda anotado aquí como la alternativa
      inmediata si (B) no alcanza, en vez de saltar directo a (A).
- [ ] **Step 3:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 3A.8: filtro de fecha, sin temporizador de cliente`.

## Task 9 — Verificación de punta a punta

- [ ] **Step 1:** `npx supabase start`, `npx supabase db reset`. El alumno y el operador **ya existen**
      tras el reset —`alumno.a@upc.edu.pe` y `operador@upc.edu.pe`, sembrados en `supabase/seed.sql`—, así
      que no hace falta crearlos: lo que hay que montar a mano son las **reservas** en los estados que
      hacen falta, insertadas directamente como `postgres`, igual que hizo la T2B con el pasado —
      `create_reservation` rechaza el pasado a propósito—.
      Un escenario mínimo: una reserva `reserved` con `start_at` futuro (para probar que el botón de
      cancelar del alumno se sigue ofreciendo); una `reserved` con `start_at` ya pasado (para probar que
      deja de ofrecerse, D-38); una `active` con `end_at` futuro; una `active` con `end_at` pasado; y, para
      la sanción, dos `not_picked_up` del mismo alumno con `updated_at` dentro de los últimos 90 días —la
      segunda inserción es la que debe disparar el bloqueo de 15 días—.
- [ ] **Step 2: El recorrido con dos sesiones distintas.** Con **operador**: entrar en `/mostrador`, ver las
      tres columnas, entregar una reserva `reserved`, recibirla de vuelta, marcar una `not_picked_up` con
      confirmación, marcar una `not_returned` con su nota obligatoria, y **comprobar que al marcar la
      `not_picked_up` de la única reserva viva de un alumno, su nombre y correo desaparecen de la fila al
      recargar** — la Task 4 predijo esto leyendo `alumnos_select_staff`; aquí se ve. Con **admin**:
      repetir la entrada a `/mostrador` y confirmar que ahí el nombre del alumno **no** desaparece nunca,
      porque `is_admin()` lo ve siempre.
- [ ] **Step 3: El recorrido del alumno.** Con la sesión de `alumno.a@upc.edu.pe`, comprobar en
      `/mi-panel` que la reserva con `start_at` futuro sigue mostrando el botón «Cancelar reserva» y la
      que ya empezó no lo muestra.
- [ ] **Step 4: Verificar en la base, no solo en pantalla.** Que `reservation_status_log` recibió una fila
      por cada cambio de estado hecho en el Step 2; que `banned_until` se puso donde debía —tras la segunda
      `not_picked_up`, y tras la `not_returned`— **y que no se puso donde no debía** —tras la primera
      `not_picked_up`, sigue en `NULL`—.
- [ ] **Step 5:** `npx supabase test db` y confirmar el número de aserciones anotado en la Task 2.
- [ ] **Step 6:** `typecheck`, `lint`, `test`, `build`. Anotar cuántas rutas deja el build —predicción:
      catorce, contra las trece de la T2B— y cuántas pruebas de Vitest hay —predicción: más de 43, con
      las de `lib/mostrador/columnas.test.ts` y la de Task 3 sumadas—. Cualquier defecto que aparezca aquí
      se corrige y se comitea aparte, con un nuevo `build` después.

## Task 10 — Cierre y documentación

- [ ] **Step 1:** Actualizar `MIGRATION_DOCS/ESTADO_Y_PLAN.md`: la bitácora, las decisiones D-37 a D-40, Q-17
      cerrado, y Q-14 anotado como resuelto en su salida elegida —«que la interfaz de admin solo ofrezca
      múltiplos»— pero **pendiente de construirse en la T3B**. La tabla de tandas pasa de 22 migraciones y
      142 aserciones al número real que dejó la Task 2.
- [ ] **Step 2:** Actualizar `MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md`: F8 recibe una corrección fechada
      —no se reescribe— explicando que solo se cancelan las reservas `reserved` del día, no también las
      `active`, por lo que dice D-40. El texto original de F8 se conserva tachado o con la corrección al
      lado, no se borra.
- [ ] **Step 3:** Actualizar `CLAUDE.md` con el estado de la T3A cerrada y la T3B como siguiente.
- [ ] **Step 4:** Escribir la cabecera de correcciones de este mismo plan con lo que la ejecución haya
      desmentido, si algo lo hizo.
- [ ] **Step 5: Cerrar las ediciones de documentación antes de pasar los comandos de git.**
- [ ] **Step 6:** Entregar los comandos de PowerShell para crear la rama `feature/fase-2-tanda-3a` desde
      `develop`, los commits y el PR. Los ejecuta Alejandro.
- [ ] **Step 7:** Esperar a que el CI deje de moverse antes de escribir que está verde.

---

## Lo que esta tanda NO hace, para que no se cuele

- **No construye ninguna pantalla de `/admin/*`.** Eso es la T3B entera.
- **No permite corregir una sanción.** `admin_set_ban` es de admin, y su pantalla es de la T3B.
- **No toca `inventory_units` fuera de sus notas.** Cambiar el estado de una unidad —`active`,
  `maintenance`, `retired`— es la T3B.
- **No añade una segunda migración.** Si hace falta más SQL, se registra como desvío antes de escribirlo.
- **No inhabilita días ni gestiona el catálogo.** F8 y F7 son de la T3B, con las correcciones ya anotadas
  arriba.

---

## Índice de la T3B (solo la lista de tareas, sin desarrollar)

1. Andamio de `/admin` y listado de inventario · 2. Alta de producto con sus unidades · 3. Estado de unidad
y sus notas, con la baja como `retired` · 4. `/api/cloudinary/firma` (cierra P0-4) · 5. Subida y gestión de
imágenes · 6. `/admin/reservas` · 7. `/admin/dias`, con D-40 · 8. `/admin/estadisticas` · 9.
`/admin/personal`, con la restricción de «Tres choques», punto 3 · 10. `/admin/ajustes`, que cierra Q-14 ·
11. Verificación de punta a punta · 12. Cierre y documentación.

---

## Pendiente que esta tanda hereda

- **M-12 de `ESPECIFICACION_FUNCIONAL.md` — cancelación con antelación mínima.** D-38 cierra la mitad
  —no se cancela después de empezar—, pero no la otra: cancelar un minuto antes de empezar sigue sin
  restricción. Sigue abierto.
- **Q-14 · el buffer desalinea la cola del bloqueo.** Resuelto en su salida por D-39: la interfaz de admin
  solo ofrecerá múltiplos de `slot_minutes`. Falta construir esa interfaz, en la T3B.
- **`supabase/setup-cli@v1` apunta a Node.js 20**, deprecado y forzado a Node 24 por GitHub. Anotado al
  cerrar la T2B. No rompe hoy; candidato a la T4.
