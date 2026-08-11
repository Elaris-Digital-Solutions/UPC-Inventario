# Fase 2 · Tanda 2B — Reserva y panel · Plan de implementación

---

## 📍 Dónde se paró — actualizado el 2026-08-11, 23:40

> **Bloque temporal.** Se borra al cerrar la tanda; lo reutilizable se convierte en receta.

**OCHO de nueve tareas cerradas.** Rama `feature/fase-2-tanda-2b`, **NADA empujado**, árbol limpio.
`develop` está en `e115e17` (PR #26, el plan de esta tanda). Quedan **nueve commits locales** por delante
de `develop`.

| Commit | Tarea |
|---|---|
| `16bd440` | 2B.8 · la rejilla como lógica pura — **19 pruebas de Vitest, las primeras del proyecto** |
| `d1a48a0` | 2B.9 · el calendario de reserva — **once rutas en el `build`** |
| `452e2a8` | 2B.10 · la reserva — **el alumno ya reserva de punta a punta**, correcciones 12 a 18 |
| `f76378f` | 2B.11 · el bloqueo por sanción — **29 pruebas**, correcciones 19 a 24 |
| `c43e17b` | 2B.12 · `/mi-panel` — **43 pruebas, doce rutas**, correcciones 25 a 31 |
| `461dd49` | 2B.13 · la cancelación con motivo — correcciones 32 a 40 |
| `7dc8815` | 2B.14 · la encuesta de satisfacción — **trece rutas**, correcciones 41 a 51 |

**Task 15, la verificación de punta a punta, quedó cerrada** —correcciones 52 a 57—. **Siguiente: la
Task 16**, de cierre y documentación.

**El aviso de orden de la Task 15 y el escenario de las seis reservas ya no aplican: el `db reset` se hizo
y el escenario viejo se fue.** El de hoy es el que dejó la Task 15: una sola reserva de Ana —Laptop Dell
XPS 15, `LAP-001`, Monterrico, vie 14 ago 10:00–10:30, motivo Tesis, estado `cancelled` con motivo «Se me
cruzó con un examen»— y una encuesta de Ana con valoraciones 5, 4, 5, 4, 5, `would_recommend` en `true`,
`best_feature` puesto y los otros dos textos en `null`. **Ana quedó sin sanción.**
→ **La Task 16 no necesita este escenario**: es cierre y documentación.

### Lo medido de la cancelación, que sigue valiendo

> Vivía como «Lo que la Task 13 ya NO tiene que medir»; con la tarea cerrada, las dos tablas de abajo
> quedan como **referencia para la Task 15**.

**Todo medido el 2026-08-11 contra el stack local, dentro de transacciones con `rollback`: el escenario
quedó intacto** —comprobado después: 3 `reserved`, 1 `active`, 1 `cancelled`, 1 `completed`—.

**Step 4 · Los rechazos de `cancel_reservation` son CUATRO, no tres como dice el plan:**

| # | Caso | SQLSTATE | Mensaje del motor (literal, sin tildes) |
|---|---|---|---|
| 1 | Motivo vacío o solo espacios | `23514` | `La cancelacion exige un motivo` |
| 2 | Reserva inexistente | `P0002` | `Reserva inexistente` |
| 3 | Reserva **ajena** | `42501` | `No puedes cancelar una reserva ajena` |
| 4 | Estado distinto de `reserved` | `23514` | `Solo se cancela una reserva en estado reserved (esta en active)` |

**El orden confirma la corrección 3 del plan:** pedir la cancelación de una reserva **inexistente y sin
motivo** contesta *«La cancelacion exige un motivo»*, no *«Reserva inexistente»*. Es correcto —la más
fundamental primero— pero **la interfaz no debe traducir ese mensaje como «no existe»**.

**Y el rechazo por reserva ajena tiene DOS caminos que contestan distinto, medido sin querer:**

- Si el cliente **busca el id por consulta**, RLS se lo tapa y nunca llega a intentarlo: la RPC recibe
  `NULL` y contesta *«Reserva inexistente»*.
- Si el cliente **ya tiene el id** por otro medio, la RPC contesta *«No puedes cancelar una reserva ajena»*.

→ **Las dos capas protegen, y por eso la primera medición fue un falso positivo:** la sonda pasaba el id
con un subquery que se evalúa **fuera** de la función, con las claims de Ana, así que RLS lo convertía en
`NULL` antes de llegar. **Otra vez lo mismo de esta tanda: el primer sospechoso de una medición rara es la
medición.** La sonda buena pasa el UUID literal, que es justo lo que haría un cliente que lo consiguió por
otro lado — el caso que hay que probar.

→ **Actualizado al cerrar la Task 13, y con una precisión que hubo que corregir:** desde la interfaz se
volvieron a ver **dos** de los cuatro, no tres. El **#4** con su texto propio, provocando la carrera de
verdad, y el **#3** con su mensaje **crudo**, forzando el campo oculto. El **#2** no se disparó.
→ **Y del #1 se verificó justo lo contrario de verse: que NO se puede alcanzar.** El botón de confirmar
sigue deshabilitado con el motivo en blanco y también con solo espacios, así que el mensaje del #1 no llega
nunca a pantalla desde este camino. Es el desenlace que su reparto de mensajes predice —cae al crudo
precisamente porque es inalcanzable— y **confirmar que una barrera aguanta no es lo mismo que ver el
rechazo que hay detrás.** La primera redacción de esta nota decía «los cuatro salvo el #2» y las dos frases
se contradecían entre sí; lo señaló el subagente que la escribió, comparando lo que se le dictó contra el
párrafo de verificación de la misma tarea. **Van tres veces que pedir a un subagente lo que NO verificó
rinde, y esta es la primera en que lo que encuentra es un error de quien le dio las instrucciones.**

**Step 5 · Cancelar SÍ libera la franja, y libera también el buffer.** Sobre el Laptop en Monterrico, que
tiene **una sola unidad**, el día `2026-08-14` con franjas de 30 minutos:

| Momento | Libres | Ocupadas |
|---|---|---|
| Antes de cancelar | **19** | **9** |
| Después de cancelar | **28** | **0** |

→ Las **nueve** que libera son exactamente las que el buffer de 120 minutos bloqueaba alrededor de una
reserva de media hora *(corrección 4)*. La franja no vuelve sola: vuelve **con todo su buffer**.
→ Y la fila quedó en `cancelled` con su `cancellation_reason` puesto.
→ **La Task 13 midió el mismo número por el camino del alumno**, no por SQL: ver el párrafo de
verificación de la Task 13.

### El escenario montado en el stack local, al día de hoy

⚠ **CADUCADO el 2026-08-11 por el Step 1 de la Task 15.** El `db reset` se llevó las seis reservas y la
encuesta, tal y como este mismo bloque avisaba más abajo. **La tabla se conserva porque enseña qué hace
falta para cubrir los tres grupos del panel y la prueba de RLS** —y esa receta sigue valiendo—, pero
**ninguna de estas filas existe hoy**. Lo que hay en la base ahora está al principio de este bloque.

| Alumno | Reserva | Estado | Para qué sirve |
|---|---|---|---|
| Ana | 05/08 10:00 | `completed` | «Anteriores» |
| Ana | 06/08 14:00 | `cancelled` **con motivo** | «Anteriores», y el motivo a la vista |
| Ana | 09/08 10:00 | `reserved` **vencida** | El caso de la corrección 27 |
| Ana | 11/08 10:00 | `active` | «En curso» |
| Ana | 14/08 10:00 | `reserved` | «Próximas» · **la creó el navegador en la Task 10** |
| **Bruno** | 15/08 10:00 | `reserved` | **Que Ana no la vea**: la prueba de RLS |

**Ana quedó sin sanción** —`banned_until` en `NULL`—. Para volver a montar cualquiera de los tres estados,
un `update` sobre `alumnos` **por `auth_user_id`, nunca por `id`**. Las reservas del pasado se insertan
**directamente como `postgres`**, porque `create_reservation` rechaza el pasado a propósito.

⚠ **Añadido al cerrar la Task 14: el escenario incluye ahora la encuesta de Ana**, creada y editada **desde
la pantalla**, no por SQL. Una sola fila, con las cinco valoraciones puestas, `would_recommend` en `true`,
un texto en `best_feature` y los otros dos en `null`. **Para volver a ver la pantalla de «primera vez» hay
que borrarla como `postgres`** —el alumno no tiene política de DELETE, corrección 43—:
`delete from public.final_satisfaction_surveys;`

**Y `db reset` se lleva el escenario entero**, reservas y encuesta. Rehacerlo es el primer paso de
cualquier verificación en navegador que venga después.

**Y sobrevivió también a la Task 13**, con las seis filas verificadas al final: la del 14/08 sigue en
`reserved`, sin cambiar.

### ✅ Lo que la Task 10 ya NO tuvo que medir

**Step 0 · punto a verificar 5 — resuelto.** `create_reservation` tiene `grant execute to authenticated` y
es alcanzable. No hace falta tocar SQL.

**Step 2 · punto a verificar 3 — resuelto. Los rechazos, disparados uno a uno contra el stack local.**
⚠ **Eran once el 2026-08-10 y resultaron ser DOCE** *(corrección 13)*: faltaba el 3-bis, que las dos sondas
de duración de aquel día no podían alcanzar.

| # | Caso | SQLSTATE | Mensaje del motor (literal, sin tildes) |
|---|---|---|---|
| 1a | Sin alumno activo para la sesión | `42501` | `No hay un alumno activo para esta sesion` |
| 1b | Perfil incompleto | `23514` | `Completa tu perfil antes de reservar` |
| 2 | Sanción vigente | `23514` | `Tienes una sancion vigente hasta 2026-08-21 01:06:08.212931+00`, y con sanción permanente `... hasta infinity` |
| 3 | Duración fuera de rango *(probado con 15 y con 600)* | `P0001` | `Duracion fuera del rango permitido para este producto` |
| 3-bis | Duración no múltiplo del bloque *(añadido el 2026-08-11, ver corrección 13)* | `23514` | `La duracion tiene que ser multiplo de 30 minutos` |
| 4a | En el pasado | `P0001` | `No se puede reservar en el pasado` |
| 4b | Fuera de la ventana | `P0001` | `Fuera de la ventana de reserva` |
| 5a | Día inhabilitado | `P0001` | `Ese dia no hay atencion` |
| 5b | Fuera del horario | `P0001` | `Fuera del horario de atencion` |
| 6 | La hora no cae en un bloque | `23514` | `La hora de inicio no cae en un bloque de 30 minutos` |
| 7 | Límite diario por producto | `P0001` | `Ya tienes una reserva de este producto para ese dia` |
| 8 | Sin unidades libres en la franja | `P0001` | `No hay unidades disponibles en esa franja` |

**Y una sanción CADUCADA no bloquea:** la RPC acepta. Medido.

**Step 3 · punto a verificar 4 — resuelto POR EL LADO BUENO, y es la propiedad central de la tanda.**
Ocho sondas sobre `2026-08-13`, pidiendo la primera y la última franja que ofrece la rejilla:

| Duración | Franjas libres | Primera | Última | Termina |
|---|---|---|---|---|
| 30 min | 28 | 08:00 ✅ | 21:30 ✅ | 22:00 |
| 1 h | 27 | 08:00 ✅ | 21:00 ✅ | 22:00 |
| 4 h | 21 | 08:00 ✅ | 18:00 ✅ | 22:00 |
| 8 h | 13 | 08:00 ✅ | 14:00 ✅ | 22:00 |

**Las ocho aceptadas. La rejilla no ofrece nada que `create_reservation` rechace**, y la última franja de
cada duración termina clavada en `closing_time`, la igualdad que el paso 5 de la RPC acepta a propósito.

### ✅ La decisión de los mensajes — aprobada el 2026-08-10, **ejecutada el 2026-08-11**

> Vive en `mensajeDeRechazo()`, dentro de `lib/reservas/acciones.ts`. Los dos caminos se probaron en el
> navegador: el texto propio con el límite diario, y el crudo forzando el campo oculto a las 07:00.

**Los mensajes del motor NO se pueden mostrar crudos**, y por dos motivos medidos: están **sin tildes**
—el SQL del proyecto se escribe así, y la interfaz sí las lleva— y **dos son inservibles para un alumno**:
`infinity` es jerga de Postgres y el otro es un timestamp UTC con microsegundos.

**Criterio propuesto y NO ejecutado** *(se paró la sesión antes de escribir el código)*:

- **Texto propio** para los cuatro que un alumno puede provocar navegando: **1b, 2, 7 y 8**.
- **Mensaje crudo del motor** para los siete restantes —**1a, 3, 4a, 4b, 5a, 5b, 6**—, que son
  **inalcanzables desde la interfaz mientras el calendario funcione**: la rejilla ya no ofrece franjas
  pasadas, ni fuera de ventana, ni fuera de horario, ni desalineadas, ni de días inhabilitados. **Si alguno
  aparece, es un defecto, y el mensaje crudo dice qué se rompió mejor que uno bonito.**
- El emparejamiento va por el **texto**, no solo por el SQLSTATE: `23514` lo comparten 1b, 2 y 6.
- Lo no reconocido cae al **crudo**, nunca a un genérico: el mapa puede quedarse viejo si alguien cambia el
  SQL, y ese fallo tiene que verse.

### El escenario montado en el stack local, y que `db reset` se lleva

⚠ **CADUCADO el 2026-08-11 por el Step 1 de la Task 15**, igual que la tabla de las seis reservas: el
`db reset` se llevó los tres. **Se conserva como receta de cómo montarlos**, no como descripción de lo que
hay hoy.

- Una **reserva de Ana**: Laptop en Monterrico, `2026-08-11` de 10:00 a 10:30 *(la que midió el buffer)*.
- Un **día inhabilitado** el `2026-08-12`, con `reason` en **NULL** —puesto así a propósito, porque es como
  están las dos filas reales de producción—.
- La unidad del Laptop en Monterrico se puso en `maintenance` para medir el día lleno **y se devolvió a
  `active`**. Comprobado.

**`db reset` borra los tres.** Hay que rehacerlos para volver a ver esas pantallas — y **el login ya NO se
rompe**, porque el seed se arregló de raíz en la tanda 2A *(corrección 34)*.

### Trampas de esta tanda, ya pagadas

- **`alumnos.id` NO es `auth_user_id`.** Son columnas distintas y ninguna sonda avisa: un
  `update ... where id = <uuid de auth.users>` afecta **cero filas sin error**. Costó un falso positivo que
  parecía un agujero de seguridad —«la RPC acepta a un alumno sancionado»— y era la sonda.
  → **Lo que lo delató:** el resultado era demasiado grave para ser cierto. Cuando una medición acusa al
  componente más probado del sistema, el primer sospechoso es la medición.
- **El buffer se aplica también a la franja CANDIDATA** *(corrección 4)*. Una reserva de 30 minutos deja
  **nueve** franjas ocupadas, no cinco.
- **Cero filas de `available_slots` nunca significa «lleno»** *(corrección 5)*.
- **Sin `vitest.config.ts`, el alias `@/` no existe en las pruebas.** Import relativo.

### Pendientes anotados que no bloquean

- **`buffer_minutes = 120` en los 34 productos** hace que una reserva de media hora queme **4h30** de una
  jornada de 14h. Es un dato, no código, y el admin tiene interfaz en la T3. **Pero es el número con más
  impacto en la disponibilidad de todo el sistema**, y conviene saber si esas dos horas se midieron o se
  estimaron.
- **`supabase/setup-cli@v1` apunta a Node.js 20**, deprecado y forzado a Node 24 por GitHub. No rompe hoy;
  candidato a la **T4**.
- **A 390 px de ancho no está verificado** *(viene de la 2A)*. Chrome no baja de 485 en Windows con la
  herramienta usada; Playwright sí controla el viewport.

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

> **El plan de abajo no se reescribe.** Esto es lo que la ejecución desmintió, anotado al cerrar cada
> tarea y no al final, para no perderlo.

### Task 8 · La rejilla, y una decisión que el plan no había visto

1. **No hizo falta `vitest.config.ts`, y eso se midió antes de escribir la primera línea.** El proyecto no
   tiene configuración de Vitest, así que corre con los valores por defecto y **no conoce el alias `@/*`**
   del `tsconfig.json`. El archivo de pruebas importa con ruta relativa (`./rejilla`) y funciona; escribirlo
   con alias habría compilado —`tsc` sí lo resuelve— y **fallado solo al ejecutar**.
   → Se decidió **no añadir configuración**: un archivo de config es superficie que mantener, y una prueba
   que vive junto a su código no necesita alias para encontrarlo. Las 13 pruebas que pasaron a la primera
   son la evidencia de que el import resuelve.

2. **`diasDeLaVentana` devuelve `bookingWindowDays + 1`, y el plan no anticipaba que hubiera que decidirlo.**
   `create_reservation` compara **instantes** —`p_start_at > now() + booking_window_days`—, así que a las
   14:00 del día 10 acepta hasta las 14:00 del día 17: hay **ocho** días civiles con franjas reservables y
   el último está cortado por la mitad.
   → Se ofrecen los ocho. La alternativa —siete, para no enseñar nunca un día a medias— es más bonita y más
   pobre: escondería franjas que el motor acepta. La regla de §11.2 autoriza las dos, así que no decidía
   ella.
   → **Y la decisión tiene su propia prueba**, no un comentario: `ofrece OCHO dias con la ventana en 7` se
   pone roja si alguien la cambia. **Un comentario no falla cuando lo contradicen.**

3. **Las cuatro pruebas de esa función se vieron fallar antes de escribirla.** Es la disciplina de la
   Fase 1 aplicada al cliente: el rojo fue la primera evidencia de que Vitest ejecutaba el archivo de
   verdad. `npm run test` pasó de **0 a 19 pruebas**.

### Task 9 · Tres cosas que el plan daba por ciertas y no lo eran

4. **La predicción del buffer estaba MAL, y por eso el Step 0 existía.** El plan predijo que una reserva de
   10:00 a 10:30 dejaría `free = 0` «de 10:00 a 12:30». Lo medido: **de 08:00 a 12:00, nueve franjas de
   veintiocho**, y la primera libre es 12:30.
   → **La causa:** `available_units` aplica el buffer **también a la franja candidata**. Una franja que
   empieza a las 08:00 bloquearía hasta las 10:30, y eso choca con la reserva existente. El primer inicio
   compatible sería las 07:30, y el local abre a las 08:00.
   → **Consecuencia de producto, no de código:** con `buffer_minutes = 120` en los 34 productos reales, una
   reserva de media hora inutiliza **cuatro horas y media** de una jornada de catorce. Un producto de una
   sola unidad se queda casi sin día con tres reservas. **Se anota y no se toca** —es un dato, y el admin
   recién tiene interfaz en la T3—, pero es el número con más impacto en la disponibilidad de todo el
   sistema.
   → De ahí sale el aviso que el calendario muestra cuando hay franjas ocupadas: sin él, nueve franjas
   grises por una sola reserva parecen un error de la pantalla.

5. **La corrección 1 del plan —heredada del alcance de la 2A— está mal planteada, y el punto a verificar 2
   con ella.** Decía que un día inhabilitado y un día lleno son indistinguibles porque los dos dan cero
   filas. **Falso, medido con cinco sondas:**

   | Caso | Filas |
   |---|---|
   | Día inhabilitado | **0** |
   | Día fuera de la ventana | **0** |
   | **Hoy, agotado para esa duración** | **0** |
   | Día parcialmente ocupado | **28**, nueve con `free = 0` |
   | Día **lleno del todo** *(única unidad en `maintenance`)* | **28**, las 28 con `free = 0` |

   → **«Cero filas» NUNCA significa «lleno».** La RPC devuelve también las franjas ocupadas, con su conteo
   en cero. La ambigüedad real tiene otras tres causas.
   → **La consulta aparte a `disabled_days` sigue siendo necesaria**, pero por un motivo distinto del que
   decía el plan: no para separar «inhabilitado» de «lleno», sino de «hoy se acabó».

6. **El tercer caso de cero filas no lo había previsto nadie, y es el más probable de los tres.** Medido a
   las 19:31 de Lima: pedir 30 minutos para hoy dio **4 filas** (20:00 a 21:30) y pedir **240 dio CERO**,
   porque la última franja de cuatro horas habría empezado a las 18:00. **Y ese día no estaba inhabilitado.**
   → En la pantalla eso significa que **el alumno cambia la duración a 4 horas y el día de hoy se vacía**.
   Sin un mensaje propio, parece una avería. Por eso son **cuatro** mensajes distintos y no uno.

7. **`?sede=` no se validaba, y el fallo era del tipo silencioso.** Una sede inventada hacía que
   `available_slots` fallara con `22P02`, que `franjasDelDia` se traga con `console.error` devolviendo un
   array vacío: la pantalla decía «no hay franjas para esta duración» cuando lo que estaba mal era la URL.
   → Arreglado comprobando la sede contra `sedesActivas()` antes de llamar a la RPC. Ahora da el **404
   propio**. Es el mismo par de casos que la tarea 2A.6 separó en el detalle, y aquí el silencioso era peor:
   no se veía como error sino como una respuesta legítima.

8. **Cerrada la corrección 32 de la tanda 2A: la sede ya no se pierde.** La cadena catálogo → detalle →
   reservar la conserva entera. La 2A la aplazó a propósito, y el motivo de cerrarla justo aquí es el que
   se dijo entonces: mientras la sede solo decidía qué se *muestra*, perderla era cosmético; desde esta
   tanda **una reserva es contra la unidad de UNA sede**.

9. **Cuarto y quinto hecho falso de un subagente en la Fase 2, y el cuarto es LITERALMENTE el mismo de la
   corrección 24 de la 2A.** (a) Escribió que las sondas se midieron «contra el proyecto real» cuando se
   midieron **contra el stack local** —producción no tiene ni una reserva, así que el escenario no se puede
   montar allí—. (b) Escribió como **medido** que un día lleno devuelve sus 28 filas en cero, cuando en ese
   momento era una **deducción**: lo medido era un día *parcialmente* ocupado.
   → Las dos corregidas a mano. **Y la segunda tuvo un desenlace que vale anotar:** se montó el escenario
   que faltaba —la única unidad en `maintenance`— y la deducción resultó **cierta**, así que el comentario
   volvió a decir «medido», ahora con derecho. **Corregir una sobre-atribución no es decidir que el hecho
   es falso: es decidir que todavía no se sabía.**
   → El código funcionaba en los dos casos. **Lo que hay que revisar de un subagente no es si su código
   compila, sino si lo que AFIRMA es cierto**, y son dos comprobaciones distintas.

10. **Un comentario que era cierto dejó de serlo en la misma tanda.** El botón del detalle explicaba que
    estaba deshabilitado porque «`/catalogo/[id]/reservar` llevaría a un 404, esa ruta no existe todavía».
    Desde esta tarea **esa ruta existe**. El botón sigue deshabilitado —la Server Action es la Task 10— pero
    por otro motivo, así que el comentario se reescribió con el viejo tachado dentro.
    → **Un comentario caducado compila igual que uno cierto y enseña lo contrario de lo que pasa.**

11. **El botón «Confirmar reserva» de la pantalla nueva nace deshabilitado**, igual que hizo la 2A.6. La
    pantalla es útil por sí sola —el alumno ya ve la disponibilidad real—, pero no se llega a ella desde la
    interfaz hasta la Task 10, que es la que habilita el botón del detalle. Se probó navegando a la URL
    directamente.

**Verificado al cerrar la tarea, en un navegador de verdad y con sesión real de alumno:** las tarjetas del
catálogo arrastran `?sede=`; el calendario del Laptop en Monterrico trae **28 franjas con 9 ocupadas, de
08:00 a 12:00, y la primera libre a las 12:30** —idéntico a lo que devuelve la RPC por SQL—; las
**dieciséis** duraciones del Laptop (8 horas en el seed local) se pintan bien; y los **cuatro** mensajes
salen cada uno en su caso: día inhabilitado **con** motivo, día inhabilitado **sin** motivo —el caso real de
producción, y sin imprimir `null`—, hoy agotado para 8 horas, y día lleno del todo. Una `?sede=` inventada
da el **404 propio con 1 cabecera y 1 pie**. La consola queda con **un solo error**, el 404 de esa prueba, y
**ni uno de React ni de hidratación**. `typecheck`, `lint`, `test` (19) y `build` en verde, con **once
rutas**: la nueva es `ƒ /catalogo/[id]/reservar` y las tres estáticas siguen siendo `/_not-found`, `/faq` y
`/login`.

### Task 10 · La reserva, y un argumento que el plan nombró sin definir

12. ⚠ **El plan decía «cinco argumentos» y nunca dijo de dónde sale el quinto.** `create_reservation` pide
    `p_purpose`, y ninguna pantalla de esta tanda lo recogía. No es un detalle de implementación: es un
    campo que el alumno tiene que rellenar, y decidirlo a mitad de la escritura habría sido inventarlo.
    → **La respuesta ya estaba escrita en la especificación funcional**, §F3 paso 5: el sistema Vite pedía
    un **motivo con seis opciones fijas** —práctica de laboratorio, proyecto de curso, trabajo de
    investigación, tesis, actividad extracurricular, otro— y §F6 dice que **el panel del personal lo
    muestra**. La columna es `text` **nullable y sin `CHECK`**: la base acepta cualquier cosa, así que la
    lista es una regla de la aplicación y no del motor.
    → **Decidido con Alejandro el 2026-08-11:** las seis opciones fijas, obligatorio antes de confirmar.
    Viven en `lib/reservas/motivos.ts` y no en `acciones.ts` por una restricción real de Next: en un
    archivo con `"use server"` **todo lo exportado tiene que ser una función async**, así que una constante
    compartida entre la acción y el componente necesita archivo propio.
    → **Es el mismo género que `featured` en la 2A y que la encuesta en la corrección 4**: el plan nombró
    algo sin decir a qué se ata, y el hueco solo se ve leyendo el esquema y la especificación, no el plan.

13. ⚠ **Los rechazos de `create_reservation` son DOCE, no once.** La tabla del bloque de pausa —medida el
    2026-08-10— tiene once, y le falta el **paso 3-bis**: `La duracion tiene que ser multiplo de 30
    minutos`, `23514`. Lo añadió la migración `20260806171347_duration_slot_multiple.sql`, que redefine la
    RPC entera *(D-19)*, y **la sesión de medición no lo alcanzó por una razón concreta**: probó 15 y 600
    minutos, y los dos mueren antes, en el paso 3, porque están fuera del rango.
    → **Se descubrió leyendo el SQL el 2026-08-11 y se midió ese mismo día:** 45 minutos sobre el Laptop
    —que tiene `max_duration_hours = 8`, así que pasa el paso 3— contesta el mensaje del 3-bis, y **el mismo
    instante con 60 minutos sí crea la reserva**. El `SQLSTATE` está leído del `using errcode` de la
    migración, no medido aparte, y así está escrito en el código.
    → **La lección de método:** medir once casos y encontrarlos todos no prueba que sean once. La lista de
    lo que hay que medir se saca del **código vigente**, y la versión vigente de una función no es el
    archivo que la creó sino el último que la redefine.

14. **La Task 10 tocó el doble de archivos de los que su plan listaba, y no es desviación de alcance.** El
    plan decía «Create `lib/reservas/acciones.ts` · Modify `catalogo/[id]/page.tsx`». Hicieron falta además
    `lib/reservas/motivos.ts`, `components/reservas/formulario-reserva.tsx`, y modificar `calendario.tsx` y
    `reservar/page.tsx`.
    → **El motivo es que la Task 9 dejó las franjas como `<li>` inertes a propósito** —su corrección 11 lo
    dice: no había acción a la que llevar—. **Sin poder tocar una franja no hay reserva posible**, así que
    volverlas seleccionables es parte de esta tarea aunque el plan no lo escribiera.

15. **El estado de cliente sobrevive a un cambio de día, y eso era un fallo de verdad esperando.** Cambiar
    de día o de duración es un `router.push()` a la **misma ruta**, así que React reconcilia el árbol en vez
    de montarlo de nuevo y `franjaElegida` no se limpia sola. Sin defensa, el alumno elegía las 10:00 del
    jueves, cambiaba al viernes, y el campo oculto **seguía llevando el jueves**: se habría reservado una
    franja que nadie eligió, sin nada en pantalla que lo delatara.
    → Resuelto con `key={día-duración}` en el formulario, que fuerza a React a desmontar y montar limpio.
    → **Verificado en el navegador, no deducido:** con la franja elegida, el campo oculto valía
    `2026-08-13T15:00:00+00:00`; tras pulsar otro día, valía cadena vacía y el botón volvió a deshabilitarse.

16. **Sexto hecho falso de un subagente en la Fase 2, y otra vez con el código funcionando.** Un comentario
    justificaba el type guard citando **D-26** como «un tipo impuesto no se verifica». **D-26 no dice eso:**
    es la decisión de que los tipos salen de `supabase gen types` y el CI comprueba que no estén viejos.
    El razonamiento del comentario era correcto; la cita, inventada.
    → Y hubo un séptimo del mismo género, más sutil: escribió que el caso 3-bis «NO está medido», cuando se
    había medido **veinte minutos antes** de que él escribiera esa línea. **Una afirmación de este proyecto
    caduca igual que un comentario**, y la verificación tiene que ser contra el estado de hoy.
    → **Lo que no falló:** la afirmación de que `disponibilidadPorSede()` filtra por `in_stock` se comprobó
    y era **cierta**. Verificar no es asumir que todo lo del subagente está mal.

17. **El mensaje de sanción mostraba solo el día, y eso mandaba al alumno a chocarse otra vez.** La RPC
    compara `banned_until > now()`, un **instante**, no una fecha civil: la sanción medida vence a las
    **20:06 de Lima**. Quien leyera «hasta el 20 de agosto» volvería esa mañana y se llevaría el mismo
    rechazo con el mismo texto, sin forma de entender por qué. Corregido para que diga también la hora.
    → El otro caso, `infinity`, **nunca se formatea como fecha**: es el bloqueo permanente de D-12.

18. **La cabecera del 404 dice «Entrar» aunque la sesión esté viva — y esto NO es un hallazgo nuevo.** Se
    ve al reservar bien, porque el redirect a `/mi-panel` cae en el 404 previsto por el Step 5. La sesión
    **no se pierde** —comprobado volviendo al calendario, que siguió mostrando «Salir»—.
    → **La tanda 2A ya lo había anotado y ya había decidido no arreglarlo**, con el motivo escrito en la
    bitácora del 2026-08-10: saberlo exige leer cookies, y eso sacaría `/_not-found` del prerender
    estático. La decisión sigue en pie y esta tarea no la reabre.
    → **Lo único nuevo es dónde aparece:** hasta ahora se llegaba a ese 404 por una URL mal escrita; desde
    esta tarea se llega **justo después de reservar**, que es la única acción irreversible de la pantalla.
    Deja de ser una rareza de una ruta muerta y pasa a ser lo primero que ve alguien que acaba de reservar
    bien. **La Task 12 lo cierra por el otro lado**, haciendo que `/mi-panel` exista.
    → Vale como recordatorio de método: **un hallazgo repetido no es un hallazgo**, y comprobarlo contra la
    bitácora antes de anotarlo cuesta menos que corregirlo después.

**Verificado al cerrar la Task 10, en un navegador de verdad y con sesión real de Ana:** el botón del
detalle **ya no dice «muy pronto»** y arrastra la sede; el calendario del día 14 ofrece sus 28 franjas;
elegir hora y motivo habilita el botón; y **confirmar creó la reserva**: `LAP-001` en Monterrico, **14 de
agosto de 10:00 a 10:30 hora de Lima** —la franja exacta que se eligió, sin desplazarse ni una hora—,
motivo `Tesis`, estado `reserved`, con la unidad elegida por el motor por rotación justa. Después, el mismo
producto el mismo día contesta el **texto propio** del límite diario, con tildes y sin salir de la página; y
forzando a mano el campo oculto a las 07:00 —una hora que la rejilla **nunca** ofrece— contesta el **mensaje
crudo** `Fuera del horario de atencion` y **no crea nada**: siguen siendo dos reservas. Esa última es la
prueba de los dos sentidos que importa: **manipular el formulario no abre nada, porque quien decide es el
motor.** Consola **sin un solo error ni advertencia**. `typecheck`, `lint`, `test` (19) y `build` en verde,
con **once rutas** y las mismas tres estáticas: una Server Action no añade ruta.

### Task 11 · El bloqueo por sanción, y un dato que se lee distinto según por dónde entre

19. ⚠ **`banned_until` llega en DOS formatos distintos según por dónde se lea, y eso obliga a dos códigos
    que parecen incoherentes.** Medido el 2026-08-11 con `to_jsonb`, que es la serialización que PostgREST
    devuelve al cliente:

    | De dónde | Cómo llega |
    |---|---|
    | La **columna**, leída por la API | `"2026-08-26T04:41:49.669513+00:00"` — ISO 8601 completo |
    | El **mensaje de error** de la RPC | `2026-08-21 01:06:08.212931+00` — espacio y desfase de 2 dígitos |

    → `lib/reservas/acciones.ts` **normaliza** antes de `new Date()` porque lo necesita;
    `lib/reservas/sancion.ts` **no normaliza nada** porque su entrada ya es ISO válido. Copiar la
    normalización allí por analogía habría sido código muerto que sugiere un problema inexistente, así que
    **los dos archivos llevan escrito el porqué de la diferencia**, cada uno apuntando al otro.
    → **Y los decimales varían:** Postgres recorta los ceros finales, así que la misma columna dio **seis**
    (`.212931`) y **cinco** (`.73449`). El comentario de la Task 10 afirmaba «6 dígitos» y se corrigió. El
    parseo aguanta cero, uno, cinco y seis, probado en Node.

20. **Un defecto que ninguna prueba habría encontrado, porque solo se ve en pantalla: «11:41 p. m..», con
    dos puntos.** En `es-PE` el formato de 12 horas termina en `p. m.` —con punto— y la frase cerraba con
    otro.
    → **Y al mirarlo apareció el problema de fondo, que era mayor:** el calendario pinta las franjas en
    **24 horas** (`hour12: false` en `formatearHora()`) y esta pantalla las pintaba en 12. **Dos pantallas
    contiguas escribiendo la hora de dos maneras se leen como dos sistemas distintos.** `hour12: false`
    arregla las dos cosas de una.
    → **Se fijó con dos pruebas de regresión** —que el texto no contenga `..` y que no contenga `a. m.` ni
    `p. m.`—, y **la primera fija el síntoma y no la causa**, para que siga sirviendo si el texto se
    reescribe. Total: **29 pruebas de Vitest**, desde las 19 de la Task 8.
    → **Lo que enseña:** `typecheck`, `lint`, `test` y `build` estaban en verde con el defecto dentro. Lo
    encontró abrir la pantalla y leerla.

21. **La sanción permanente llega como el string literal `"infinity"`**, no como `null` ni como una fecha
    lejana — medido. Y `'infinity'::timestamptz > now()` es `true`, así que el paso 2 de la RPC bloquea sin
    ningún caso especial. **En pantalla la palabra `infinity` no aparece nunca** y no se formatea como
    fecha: verificado en el navegador, el mensaje permanente no la menciona ni inventa un 1970.

22. **Octavo hecho falso de un subagente, y de un género nuevo: afirmar «medido» sobre algo que no se puede
    medir.** El comentario decía que la RPC acepta «en el instante EXACTO en que vence, medido». Ese
    instante **no se puede disparar a propósito**, porque `now()` avanza mientras se prepara la sonda. La
    afirmación correcta es que el `>` estricto está **leído del SQL**; lo que sí está medido es el caso de
    al lado, la sanción ya vencida.
    → **Y un noveno, que él mismo señaló en su informe:** atribuyó a la Task 9 el botón deshabilitado por
    falta de sedes con stock, que es de la **Task 10**. **Un subagente que enumera lo que no verificó vale
    más que uno que afirma con seguridad**, y esta vez el aviso vino de él.

23. **Ante un `banned_until` ilegible, se trata al alumno como sancionado.** Es la opción restrictiva, y se
    eligió con el argumento escrito: el motor va a rechazar igual —su columna sigue siendo lo que sea que no
    se pudo leer—, así que ofrecer un botón que fallará seguro es peor que no ofrecerlo. **Y equivocarse
    aquí no abre nada**, que es lo que permite elegir la opción prudente sin coste.
    → Por el mismo motivo, `sancionDelAlumno()` **propaga** el error en vez de seguir el `console.error` +
    vacío de `franjasDelDia()`: allí un vacío es una pantalla sin datos, aquí sería un permiso.

24. **Una sonda mía dio un falso negativo, y la causa fue CSS.** Contando los botones de día por su texto
    salieron **cero**: el `textContent` real es `lun, 10 ago.` en minúscula, y la mayúscula que se ve la
    pone `capitalize`, que **no cambia el texto del DOM**.
    → Es la misma lección de la tanda, otra vez y desde el otro lado: **cuando una medición dice algo raro,
    el primer sospechoso es la medición.** Aquí el resultado era demasiado absurdo para ser cierto —un
    calendario sin días pero con botón de confirmar—, y eso fue lo que lo delató.

**Verificado al cerrar la Task 11, en el navegador y con sesión real de Ana**, los tres estados montados uno
a uno con un `update` sobre `alumnos` *(corrección 7: esta tanda no puede provocar una sanción)*: con
sanción **temporal**, sale el mensaje con fecha y hora y **no hay calendario, ni duraciones, ni botón**; con
sanción **permanente**, el mensaje sin fecha y **sin la palabra `infinity`**; y con sanción **caducada**,
**el calendario vuelve entero** —dieciséis duraciones, ocho días y botón de confirmar—, alineado con la RPC,
que acepta. **Y el otro sentido, que es el que prueba dónde vive el control:** con la sanción puesta, llamar
a `create_reservation` **directamente por SQL** contesta `Tienes una sancion vigente hasta
2026-08-26 04:41:49.73449+00`. **Quitar la comprobación de la interfaz no abriría nada.** `typecheck`,
`lint`, `test` (**29**) y `build` en verde, **once rutas**.


### Task 12 · `/mi-panel`, y un estado que el plan inventó

25. ⚠ **El plan lista un estado `expired` que NO EXISTE.** El Step 2 enumera «`reserved`, `active`,
    `completed`, `cancelled`, `expired`, `not_picked_up`, `not_returned`» — siete. El enum
    `reservation_status`, leído del catálogo de Postgres, tiene **seis**: no hay `expired`.
    → **Y el hueco que ese estado fantasma tapaba es real**, que es lo interesante: una reserva puede
    quedarse en `reserved` con su franja ya pasada, porque cerrarla es trabajo del personal y esa pantalla
    llega en la T3. El plan resolvió eso nombrando un estado que la base no tiene. **La base no lo tiene y
    la pantalla no lo inventa** — ver la corrección 27.
    → El tipo sale de `Database['public']['Enums']['reservation_status']` y no de una unión escrita a mano,
    para que una lista paralela no se separe del esquema sin que nada avise.

26. **El enlace va en `components/cabecera-sesion.tsx`, no en `components/cabecera.tsx`** como dice el
    plan. `cabecera.tsx` es la de las pantallas **sin** sesión —landing y FAQ— y `/mi-panel` no significa
    nada sin sesión: allí sería un enlace que rebota a `/login`.

27. **La agrupación, decidida al escribir la tarea porque el plan solo pedía «próximas, en curso,
    pasadas»:** `active` → en curso; `reserved` con el fin en el futuro → próxima; **`reserved` con el fin
    ya pasado → pasada**; y los cuatro estados finales → pasada sin mirar la fecha.
    → El tercero es el que decide algo: enseñar entre las próximas una reserva que ya no se puede recoger
    sería prometer algo que no va a pasar. **La pantalla elige dónde pintar una fila; no toca el estado ni
    escribe nada.**
    → **Y como el badge sigue diciendo «Reservada» —porque eso es lo que hay en la base—, dentro de
    «Anteriores» se leía como una contradicción.** Se resolvió **explicando y no renombrando**: una línea
    que dice que la reserva venció sin que se recogiera el equipo. El dato no se toca; lo que cambia es el
    texto.

28. **Medido antes de escribir una línea, porque la 2A ya se topó con un embed que PostgREST rechazaba:**
    el embed anidado `products(name),inventory_units(unit_code,campuses(name))` **funciona** y devuelve
    HTTP 200, con los embeds a-uno como **objeto y no como array**.
    → **Y RLS se probó con datos, no leyendo la política:** se creó una reserva de **Bruno** y, con tres
    reservas en la tabla, la consulta de Ana devolvió **exactamente sus dos**. Sin esa reserva ajena, «el
    alumno solo ve las suyas» no se distingue de «ve todas y todas son suyas». Por eso **no se filtra por
    `alumno_id` en el cliente**.

29. **Un defecto de diseño encontrado revisando, y del género que este proyecto persigue: dos lecturas del
    reloj para la misma decisión.** La página agrupaba con un `new Date()` y **la tarjeta volvía a llamar a
    `grupoDeReserva()` con otro** para elegir el color del badge. Una reserva que venciera entre las dos
    habría salido bajo «Próximas» pintada como pasada — **y contradecía el comentario de `agrupar.ts`, que
    dice que el grupo se decide en un solo sitio**.
    → Corregido pasando el grupo como prop. Es M-7 otra vez, en el cliente y en pequeño.

30. **`cancellation_reason` no estaba en el alcance de la tarea y hacía falta.** Una reserva cancelada
    aparecía sin decir por qué. No es hipotético por dos lados: la cancelación del alumno **exige** un
    motivo *(BR-17, la Task 13)*, y el personal también cancela reservas *(BR-11, al inhabilitar un día que
    ya tenía reservas)* — y en ese caso es la **única** explicación que el alumno va a recibir. Sin esto, el
    motivo obligatorio de la Task 13 se guardaría para que nadie lo lea.
    → Va con etiqueta propia y no bajo la palabra «Motivo», que ya significa el propósito de uso: son dos
    columnas distintas y juntarlas haría creer que la reserva se canceló por lo que el alumno iba a hacer.

31. **La garantía del `switch` exhaustivo se MIDIÓ en vez de suponerla.** El comentario afirmaba que añadir
    un séptimo estado rompería el `typecheck`; el subagente lo marcó honestamente como inferencia sin
    comprobar. Se añadió `expired` al enum de `lib/database.types.ts`, se corrió el `typecheck` —falló con
    `TS2366: Function lacks ending return statement` en `agrupar.ts`— y **se revirtió el cambio**.
    → **Con un matiz que ahora está escrito en el código:** el error apunta a **la función**, no al valor
    que falta, así que quien se lo encuentre tiene que comparar el `switch` contra el enum. Una garantía
    medida vale más que una prometida, y saber cómo falla vale casi tanto como saber que falla.

**Verificado al cerrar la Task 12, en el navegador y con sesión real de Ana**, con cinco reservas montadas
para cubrir las tres secciones: **«En curso»** la `active`; **«Próximas»** la `reserved` futura; y
**«Anteriores»** las tres —completada, cancelada **con su motivo a la vista**, y la **`reserved` vencida con
su línea de explicación**—. Las horas en **24 h** y el día en `America/Lima`. La reserva de Bruno **no
aparece**. La **pantalla vacía** se comprobó moviendo temporalmente las reservas a otro alumno: título,
explicación y botón al catálogo. **`/mi-panel` exige sesión**, verificado abriéndola en un contexto de
navegador **sin cookies** —redirigió a `/login`— y **sin tocar `proxy.ts`**, que es la propiedad que compró
la tanda 1. Consola **sin un solo error ni advertencia**. `typecheck`, `lint`, `test` (**43**) y `build` en
verde, con **doce rutas**: la nueva es `ƒ /mi-panel` y las tres estáticas siguen siendo `/_not-found`,
`/faq` y `/login`.

### Task 13 · La cancelación, y una decisión de producto que el plan no había visto

32. ⚠ **`cancel_reservation` acepta cancelar una reserva cuya franja YA TERMINÓ, y eso obligó a una
    decisión que el plan no contemplaba.** El Step 1 del plan solo decía «el botón solo existe en
    `reserved`». Medido contra el stack local dentro de una transacción con `rollback`: la reserva vencida
    de Ana del 09/08, todavía en `reserved`, se canceló sin queja. La RPC solo comprueba el estado, **nunca
    la fecha**.
    → **Lo que hace que esto importe no es la RPC sino lo que hay al lado.** LEIDO DEL SQL
    (`supabase/migrations/20260806005731_reservation_state_machine.sql`): `cancelled` es un estado
    **terminal**. Y LEIDO DEL SQL (`20260806013146_penalties.sql`): la sanción de 15 días la dispara el
    trigger cuando el personal marca `not_picked_up`. Si el alumno cancela una reserva ya vencida, el
    personal **ya no puede** marcarla, así que **cancelar tarde borra la falta**.
    → **DECISION de Alejandro, tomada el 2026-08-11:** el botón aparece solo mientras el **fin** de la
    reserva esté en el futuro, o sea `estado === "reserved" && grupo === "proxima"`. Reutiliza el grupo que
    ya calcula `agrupar.ts`, así que no añade una segunda lectura del reloj —el defecto de la corrección
    29—.
    → **Y se dijo por delante lo que la decisión NO hace: esconder el botón no cierra ese camino.** Quien
    llame a la RPC por su cuenta cancela igual. Cerrarlo de verdad sería SQL, y esta tanda no toca SQL.
    Queda como **Q-17**.
    → **Esto ya estaba a medias registrado y comprobarlo costó menos que corregirlo después** *(la lección
    de la corrección 18)*: **M-12** de `ESPECIFICACION_FUNCIONAL.md` dice «Cancelación con antelación
    mínima — hoy se puede cancelar un minuto antes sin consecuencia», y ese mismo documento avisa de que
    M-9 a M-12 piden el criterio de Alejandro. **Lo nuevo no es el tema sino su alcance:** no es solo «sin
    consecuencia», es que **evita la sanción**, y eso M-12 no lo dice.

33. **El motivo de cancelación es TEXTO LIBRE, y no se eligió: estaba escrito.** LEIDO de
    `ESPECIFICACION_FUNCIONAL.md` línea 127 —«Cancelación: diálogo con razón obligatoria; se guarda en
    `cancellation_reason`»—, que pide diálogo y **no da ninguna lista de opciones**, al contrario del
    motivo de USO al reservar, que sí es una lista fija de seis *(corrección 12)*. Son dos columnas
    distintas y dos formatos distintos. **Es la corrección 12 otra vez pero al revés:** allí el plan nombró
    algo sin decir a qué se ataba y la respuesta estaba en la especificación; aquí también estaba, y esta
    vez se miró antes de inventar.

34. ⚠ **Décimo y undécimo hechos falsos de un subagente, los dos de un GENERO NUEVO: la fuente inventada
    sobre un hecho cierto.** (a) Un comentario afirmaba que `cancellation_reason` es `text` sin `CHECK`
    «leído en `MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md`». **El hecho es cierto** —medido:
    `information_schema.columns` dice `text` sin longitud máxima, y el único `CHECK` de
    `inventory_reservations` es `chk_reservation_dates`, `end_at > start_at`—, pero esa especificación
    **no dice el tipo de ninguna columna**. (b) Otro comentario decía que el reparto de mensajes estaba
    «aprobado por Alejandro **para este caso concreto**». Alejandro aprobó el **criterio** en la Task 10,
    sobre los doce rechazos de `create_reservation`; aplicarlo a estos cuatro se decidió al escribir la
    Task 13, caso por caso.
    → Las dos corregidas, y **cada una deja escrito en el archivo cuál era la fuente de verdad**, no solo
    el dato.
    → **Lo que enseña, y es distinto de los nueve anteriores:** hasta ahora los hechos falsos eran hechos
    falsos. Estos dos son **hechos ciertos con la procedencia inventada**, y son más difíciles de ver,
    porque comprobar el dato los confirma. **Hay que verificar el hecho Y la fuente, y son dos
    comprobaciones distintas.** Es la corrección 16 —la cita inventada a D-26— pero sin que el dato
    estuviera mal.

35. **Un defecto que solo se vio abriendo el diálogo: «El equipo ya se entrego», sin tilde.** Es texto que
    lee el alumno. `typecheck`, `lint`, `test` (43) y `build` estaban **en verde** con eso dentro,
    exactamente como el «11:41 p. m..» de la corrección 20.
    → **Y lo interesante es dónde vive:** a dos líneas de ese texto está el prefijo `'Solo se cancela una
    reserva en estado reserved (esta en '`, que va **sin tildes a propósito** porque es el mensaje que
    manda el motor y todo el SQL del proyecto se escribe así. **En la misma función conviven el criterio de
    "sin tildes" y el de "con tildes", y cada uno es correcto en su línea.** Por eso el archivo ahora lo
    dice: el que se compara va sin tildes, el que se muestra va con ellas.

36. **El diálogo se cierra solo tras cancelar, sin ningún `useEffect`, y eso pasó de afirmación estructural
    a medición.** El subagente lo escribió como una propiedad del árbol —al pasar a `cancelled`, la reserva
    deja el grupo `proxima`, la condición que pinta el diálogo deja de cumplirse, el componente se
    desmonta y su estado se va con él— y marcó honestamente que no lo había ejecutado. **Verificado en el
    navegador:** la sección «Próximas» desapareció entera, la tarjeta reapareció bajo «Anteriores» con el
    badge «Cancelada», y el diálogo se cerró sin intervención.

37. **`revalidatePath` se usa por primera vez en el proyecto.** `reservar()` resolvía lo mismo con un
    `redirect()`, pero aquí el alumno **ya está** en `/mi-panel`, así que no hay a dónde llevarlo: lo que
    hace falta es volver a leer la lista. El patrón —dentro de la propia Server Function, después de
    mutar— sale de los docs de la 16 instalada
    (`node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`), como manda `AGENTS.md`.
    **Verificado en el navegador: la lista se rehízo sin recargar la página a mano.**

38. ⚠ **Forzar el campo oculto NO aguanta un re-render, y eso estuvo a punto de dar un falso positivo que
    confirmaba justo lo que se buscaba.** Para probar el rechazo por reserva ajena se cambió por consola el
    `reservationId` del formulario al de una reserva de Bruno. Después se escribió el motivo… y **React
    restauró el valor original**, porque el campo es controlado y cualquier cambio de estado lo vuelve a
    pintar. Comprobado leyendo el campo: volvió al id de Ana.
    → **Si se hubiera enviado sin mirar, la pantalla habría contestado «cancelada» y la conclusión habría
    sido «la RPC rechaza la ajena» cuando en realidad se canceló la propia.** Una prueba de seguridad que
    pasa por el motivo equivocado es peor que ninguna.
    → Con el orden correcto —motivo primero, id después, enviar sin tocar nada más— la RPC contestó el
    mensaje **crudo** `No puedes cancelar una reserva ajena`, y **no tocó ni la reserva de Bruno ni la de
    Ana**: las seis filas del escenario quedaron idénticas. Es la prueba de los dos sentidos de la Task 10,
    otra vez: **manipular el formulario no abre nada, porque quien decide es el motor.**
    → **Y la defensa de React es ACCIDENTAL, no diseñada:** no se debe confiar en ella. Lo que protege es
    la RPC.

39. **Cinco veces en esta sesión el primer sospechoso correcto fue la medición, y la última de un género
    nuevo.** Las cuatro conocidas eran sondas mal escritas. La quinta fue **temporal**:
    `press_key("Escape")` devolvió un árbol donde el diálogo seguía abierto, y el diálogo **ya estaba
    cerrado** —consultado el DOM: no había `[role="dialog"]` y el foco había vuelto al botón que lo abrió,
    que es justo lo que Radix debe hacer—. El árbol venía capturado antes de que React procesara el cierre.
    **Una sonda puede estar bien escrita y llegar tarde**, y eso se ve igual que un defecto.

40. **Ni un componente de `components/ui/` nuevo, y ninguna dependencia.** El diálogo usa `Dialog` de
    `radix-ui` 1.6.7, que ya era dependencia y que el proyecto ya importa en `button.tsx` y `badge.tsx`.
    **No se corrió `shadcn add`** —la trampa 1 de la T0 sigue en pie— y no se creó `components/ui/dialog.tsx`
    ni `textarea.tsx`: hay un único consumidor, y se dejó escrito que si la T3 necesita un segundo diálogo
    *(BR-11, inhabilitar un día con reservas)* se extrae **entonces**.
    → **Tres sospechas propias que resultaron infundadas, y las tres las cerró medir, no razonar:**
    `font-heading` existe de verdad (`globals.css`, y ya lo usa `card.tsx`); que `Button` no use
    `forwardRef` es cierto; y las clases de animación `data-open:`/`data-closed:` **funcionan**, porque
    `node_modules/shadcn/dist/tailwind.css` define esas `@custom-variant` y compilan a
    `:where([data-state=open])` —verificado en el CSS del `build`—, que es exactamente el atributo que pone
    Radix.

**Verificado al cerrar la Task 13, en un navegador de verdad y con sesión real de Ana** (entrada por magic
link real vía Mailpit): **un solo botón «Cancelar reserva»** en toda la pantalla, y en la tarjeta correcta,
la `reserved` del 14/08 — **no aparece** en la `active` del 11/08 *(corrección 3)*, ni en la **`reserved`
vencida** del 09/08 *(corrección 32)*, ni en la completada ni en la cancelada. El diálogo abre con
**título y descripción** —los dos obligatorios para que Radix no avise en consola—, el foco entra en el
campo del motivo, y el botón de confirmar nace **deshabilitado**; **con cinco espacios en blanco sigue
deshabilitado**, que es lo que mantiene inalcanzable el rechazo #1. **El rechazo #4 se provocó de verdad**,
montando la carrera: con el diálogo abierto y el motivo escrito, se pasó la reserva a `active` por SQL —el
personal entregando el equipo— y se confirmó; salió el **texto propio**, con `role="alert"`, sin salir del
diálogo, y **no canceló nada** —la fila siguió en `active` sin motivo—. Ese fue el paso que destapó la
tilde de la corrección 35. **La cancelación buena:** el motivo se escribió **con espacios alrededor a
propósito** y se guardó **sin ellos** —36 caracteres de los 42 tecleados—, la sección «Próximas»
desapareció, la tarjeta pasó a «Anteriores» como «Cancelada por: …» y el diálogo se cerró solo. **Cancelar
liberó la franja con todo su buffer, medido desde la pantalla y no por SQL:** el 14/08 pasó de **19 libres
y 9 ocupadas** a **28 y 0** — el mismo número que el Step 5 ya había medido, ahora por el camino del
alumno. **`Escape` cierra el diálogo** y devuelve el foco al botón que lo abrió. **El escenario quedó
intacto**: las seis reservas con el mismo estado del principio, y los **cinco triggers de
`inventory_reservations` habilitados** —se comprobó, porque restaurar la reserva a `reserved` exigió
deshabilitar `trg_enforce_reservation_transition` y olvidarse de rehabilitarlo dejaría la máquina de
estados abierta—. Consola **sin un solo error ni advertencia** (solo los `[Fast Refresh]` del servidor de
desarrollo). `typecheck`, `lint`, `test` (**43**, las mismas: esta tarea no añade lógica pura) y `build` en
verde, con **doce rutas** y las tres estáticas de siempre —`/_not-found`, `/faq`, `/login`—: **una Server
Action no añade ruta**, igual que en la Task 10.

**Y el pendiente de los 390 px de la 2A deja de ser una sospecha y pasa a ser un número, medido por dos
caminos.** Se pidió un ancho de 390 y Chrome dio **500** redimensionando la ventana y **477** emulando un
dispositivo móvil con `deviceScaleFactor: 3` —el factor sí se aplicó, el ancho no—. **No es la herramienta:
es el ancho mínimo de una ventana de Chrome en Windows**, que gobierna sobre el viewport emulado. A esos 477
px el diálogo **cabe entero** —384 px, los `max-w-sm`, con la página sin desborde horizontal— y sus dos
botones quedan visibles. **A 390 px no está medido, y por deducción cabría**: `w-[calc(100%-2rem)]` daría
358 px, por debajo del `max-w-sm`, con 16 px de margen a cada lado. Para medirlo de verdad hace falta
**Playwright, que desde el 2026-08-11 ya está instalado en el entorno** y arranca su propio navegador con el
viewport exacto. Queda como lo que era, un pendiente de la 2A, pero ya con la causa identificada y la
herramienta disponible.

### Task 14 · La encuesta, y la primera escritura de la fase que no pasa por una RPC

41. **El plan listaba tres archivos y fueron cinco, igual que en la Task 10** *(corrección 14)*. Decía
    «Create `app/(alumno)/encuesta/page.tsx` · Modify `lib/reservas/acciones.ts`,
    `app/(alumno)/mi-panel/page.tsx`». Hicieron falta además `components/reservas/formulario-encuesta.tsx` y
    modificar `lib/reservas/consultas.ts`.
    → **El patrón ya se repitió tres veces en esta tanda**, así que deja de ser una desviación y pasa a ser
    una forma de leer el plan: nombra las Server Actions y las páginas, pero **no los componentes de cliente
    que recogen los datos ni las consultas que los leen**. Una pantalla que escribe necesita las cuatro
    capas.

42. ⚠ **`alumno_id` es `NOT NULL` y SIN default, así que hay que mandarlo — y el plan decía lo contrario.**
    Su Step 2 pedía que «`alumno_id` **no** se manda desde el cliente si se puede evitar». **No se puede
    evitar.** Pero la solución no es que lo mande el navegador: lo resuelve la **Server Action** leyendo la
    sesión, en dos pasos —`getClaims()` para el `sub`, y después `alumnos.id where auth_user_id = sub`,
    porque son dos uuid distintos *(la confusión que ya costó un falso positivo en esta tanda)*—. **El
    navegador nunca manda una identidad**, que es la regla de toda la fase.
    → **Y si este código se equivocara, la política lo atrapa:** un `insert` con el `alumno_id` de otro
    alumno, usando las claims de Ana, contesta `new row violates row-level security policy for table
    "final_satisfaction_surveys"`. **Afirmar quién eres no sirve de nada**, que es justo lo que se quería
    poder decir de la única escritura de la tanda sin RPC de por medio.

43. **La encuesta no tiene política de DELETE**: `surveys_insert_own`, `surveys_select_own` y
    `surveys_update_own`, y ninguna más. El alumno crea y edita, **nunca borra**.
    → Consecuencia práctica para lo que queda: **para volver a ver la pantalla de «primera vez» hay que
    borrar la fila como `postgres`**, igual que las reservas del pasado se insertan así.

44. **`upsert` con `onConflict: 'alumno_id'`, y la especificación ya lo decía.** LEIDO en
    `ESPECIFICACION_FUNCIONAL.md` línea 188: «Una respuesta por alumno (`upsert` con `onConflict:
    alumno_id`)». Medido que funciona bajo RLS. El plan pedía «carga la existente y hace `update`», que son
    dos viajes.
    → **Y el upsert cierra una carrera que el plan no nombraba:** con un `select` y luego un `insert`, dos
    pestañas del mismo alumno guardando casi a la vez podrían leer «no existe» las dos, y la segunda
    chocaría con el `UNIQUE (alumno_id)` —medido: `duplicate key value violates unique constraint
    "final_satisfaction_surveys_alumno_id_key"`—.

45. **Esta pantalla no traduce NINGÚN mensaje del motor, y es una decisión.** Los tres rechazos que la tabla
    puede dar están medidos —el `23505` del `UNIQUE`, la violación de RLS y los cinco `CHECK` de `1..5`— y
    **los tres son inalcanzables** desde aquí: los radios solo ofrecen 1 a 5, el `upsert` absorbe el choque
    del `UNIQUE`, y el `alumno_id` lo pone el servidor.
    → Es **lo contrario** de las dos pantallas anteriores: `reservar()` tiene cuatro rechazos alcanzables y
    `cancelar()` uno. Así que el código deja escrito **por qué la lista de traducciones está vacía**, caso
    por caso. **Una lista vacía sin explicación se lee como un olvido**, y el siguiente que la vea añadiría
    mensajes que nadie va a ver nunca.

46. **BR-18 se cumple solo, y eso se midió antes de escribir la condición.** La especificación dice que la
    encuesta se ofrece a quien tenga «alguna reserva **creada** después del 2026-03-20». Medido: las seis
    reservas del escenario se crearon el **2026-08-11**, y como la base de este proyecto se reconstruyó en
    agosto de 2026 —Fase 1, cerrada el 2026-08-05—, **ninguna reserva del sistema nuevo puede ser anterior a
    ese corte**.
    → Por eso la invitación se decide con **«tiene al menos una reserva»**, sin comparar fechas y **sin una
    consulta nueva**: `/mi-panel` ya carga sus reservas para pintar las tres secciones. El comentario lo
    dice, para que nadie crea que el corte se olvidó.
    → El corte **sí importaba** en el sistema Vite, donde convivían reservas anteriores. Es el resto de una
    migración de datos que ya no existe.

47. ⚠ **Duodécimo y decimotercer hecho falso de un subagente, y otra vez los dos de ATRIBUCION.** (a) Un
    comentario decía «medido el 2026-08-11 contra el stack local **y contra producción**: las dos en cero
    encuestas». Local sí se midió ese día; **producción se midió el 2026-08-10**, en otra sesión, y está
    anotada en la tabla «La forma real de los datos» de este mismo plan. El dato es cierto en las dos, la
    fecha no. (b) Otro atribuyó a la sonda del `upsert` la observación de que el trigger de `updated_at`
    dispara en la rama `do update` — y **esa sonda no podía verlo**: dentro de una sola transacción `now()`
    es constante, así que `updated_at` y `created_at` salen **iguales** y un `>` estricto devuelve `false`.
    Se midió aparte, en dos transacciones, y ahí sí avanza.
    → **Tres tareas seguidas con hechos falsos de atribución y ninguno de dato.** El género se desplazó: ya
    no inventan el hecho, inventan de dónde sale. **El remedio cuesta lo mismo: comprobar la fuente además
    del dato.**

48. **El acuse de recibo tuvo que congelar un estado, y el motivo es sutil.** Tras
    `revalidatePath('/encuesta')`, el prop con la encuesta existente **deja de ser `null` en los dos casos**
    —crear y editar—, porque la fila ya existe en los dos. Leerlo después de enviar no distingue «acabo de
    crearla» de «estaba editándola», que es justo lo que el mensaje tiene que distinguir. Resuelto con un
    `useState` perezoso leído **una sola vez al montar**. El subagente lo marcó honestamente como no
    verificado, y **se verificó en el navegador: los dos textos salen, cada uno en su caso.**
    → **Y eso mide algo que no se buscaba:** el formulario **no se remonta** tras el `revalidatePath`. Si se
    remontara, se perderían tanto el estado congelado como el `useActionState`, y el acuse no se vería en
    absoluto. Es lo contrario del diálogo de cancelar *(corrección 36)*, que sí se desmonta a propósito —
    **el mismo `revalidatePath` desmonta un componente y conserva el otro, según si la condición que lo
    pinta sigue cumpliéndose.**

49. **Séptima y octava sonda sospechosa de la tanda, las dos mías y las dos de un género nuevo.**
    (a) `fill_form` no llegó a marcar el radio de «¿lo recomendarías?»: **acabó abriendo el widget flotante
    de Next.js Dev Tools**, que ocupa esa zona de la pantalla. El botón siguió deshabilitado y el primer
    impulso fue sospechar del formulario. **Es una trampa de la herramienta de desarrollo y no existe en
    producción.** (b) Construir un `FormData` con `document.querySelector('form[action]')` devolvió **todos
    los campos en `null`**, porque esa página tiene **dos** formularios y el primero es el de «Salir» de la
    cabecera; se arregla con `.closest('form')` desde un campo propio.
    → **Y la primera dio gratis una verificación que valía la pena:** con las cinco valoraciones marcadas y
    **sin** la recomendación, el botón **sigue deshabilitado**. O sea que el «¿lo recomendarías?» es
    obligatorio de verdad y no solo de intención.

50. **Los tres textos libres se guardan recortados, y vacíos se guardan como `null` y no como cadena
    vacía.** Medido desde la pantalla: se escribió un texto con espacios alrededor y se guardaron **42
    caracteres de los 48 tecleados**; y en el primer envío, con los tres campos vacíos, las tres columnas
    quedaron en `null`. «No escribió nada» y «escribió solo espacios» son el mismo hecho, y la columna ya
    tiene una forma de decirlo — inventar una tercera categoría con `''` obligaría a toda pantalla futura a
    distinguir dos cosas que significan lo mismo.

51. **Una redundancia de texto que se deja a propósito, y queda anotada.** Tras el primer envío conviven en
    pantalla «Ya respondiste esta encuesta…» —del Server Component, que tras revalidar ya ve la fila— y
    «Gracias por completar la encuesta…» —del cliente, que recuerda que no existía al abrir—. **Los dos son
    ciertos y ninguno engaña**, pero juntos se leen redundantes.
    → **No se retoca, y el motivo es una instrucción nueva de Alejandro del 2026-08-11: la fase estética y
    visual la lleva un compañero suyo**, así que ajustar cómo queda algo es trabajo que se va a rehacer. Lo
    que sí se sigue persiguiendo es que la interfaz **funcione**, que los elementos aparezcan y desaparezcan
    cuando deben, y que **los textos sean correctos** — el género «se entrego» sin tilde de la corrección
    35.

**Verificado al cerrar la Task 14, en un navegador de verdad y con la sesión de Ana ya abierta:**
`/mi-panel` mostraba la **invitación** —Ana tiene reservas y no tenía encuesta— y se llegó a `/encuesta`
**pulsando su botón**, no escribiendo la URL. La pantalla nace con el botón **deshabilitado**, las cinco
valoraciones de la especificación con su escala explicada, el «¿Recomendarías el servicio?» con **dos
opciones y ninguna preseleccionada**, los tres textos marcados como opcionales y el aviso de que **no es
anónima**. **Primer envío con los tres textos VACIOS a propósito:** el acuse dijo **«Gracias por completar
la encuesta»** —el texto de primera vez— y en la base quedó **una** fila con los cinco valores exactos
(5, 4, 5, 3, 4), `would_recommend` en `true` y **los tres textos en `null`**. **Al recargar, la pantalla
vuelve para editar:** los seis radios llegan marcados con lo guardado, dice «Ya respondiste», el acuse
anterior desapareció y el botón nace habilitado. **Segundo envío, editando:** se cambió una valoración a 5 y
se escribió un texto con espacios alrededor; el acuse cambió a **«Tu encuesta se actualizó»** y en la base
sigue habiendo **una sola fila** —el `upsert` no duplicó—, con el cambio aplicado, el texto **recortado** y
**`updated_at` ya por delante de `created_at`**. **Y `/mi-panel` cerró el círculo:** la invitación
**desapareció** *(Step 4 del plan)*, quedó el enlace para editarla, las tres secciones siguen en su sitio y
**el botón de cancelar de la Task 13 sigue ahí** — esta tarea no rompió la anterior. Consola **sin un solo
mensaje**. `typecheck`, `lint`, `test` (**43**, las mismas: no hay lógica pura nueva) y `build` en verde, con
**TRECE rutas** —la nueva es `ƒ /encuesta`, dinámica— y las tres estáticas de siempre: `/_not-found`,
`/faq` y `/login`.

### Task 15 · La verificación de punta a punta, y un servidor de desarrollo que mintió de dos formas

52. **El servidor de desarrollo mintió en dos direcciones distintas, y ninguna era el código.** Primero: con
    `npm run dev` corriendo desde hacía CINCO HORAS (arrancado a las 13:11, medido con `Get-CimInstance
    Win32_Process`), las rutas `/catalogo/[id]` y `/catalogo/[id]/reservar` daban **500**. El overlay decía
    `Jest worker encountered 2 child process exceptions, exceeding retry limit`. Las otras tres rutas del
    alumno —`/catalogo`, `/mi-panel`, `/encuesta`— daban 200. El cuerpo de ese 500 era la página de error
    del **Pages Router** (`page: "/_error"` en el `__NEXT_DATA__`) dentro de un proyecto que es App Router
    puro: el segmento no llegó a compilar.
    → **Segundo:** tras parar el servidor, borrar `.next/` y arrancarlo limpio, el detalle funcionó pero
    `/catalogo/[id]/reservar` daba **404**. El log del servidor NUNCA escribió `Compiling
    /catalogo/[id]/reservar`: Turbopack no intentó compilarla. Todas las variantes daban 404 —sin sede,
    Monterrico, San Miguel, sede inventada, otro producto—, lo que descarta la lógica de sede y de producto
    de esa página.
    → **Tercero:** un segundo reinicio del servidor y todo funcionó.
    → Lo que separó las causas fue `npm run build` limpio: compiló **las trece rutas**, `/catalogo/[id]` y
    `/catalogo/[id]/reservar` incluidas, con `typecheck`, `lint` y las 43 pruebas en verde. **El código
    estuvo sano todo el tiempo.**
    → **La lección:** la nota del proyecto sobre que `.next/` produce falsos se queda corta. El servidor de
    desarrollo también los produce **sin `.next/` de por medio**, y de dos formas distintas: un proceso
    viejo que se degrada, y un arranque en frío que no registra una ruta. **El árbitro no es la pantalla ni
    el dev server: es el `build`.**
    → **Detalle de método que se pagó:** arrancar el dev server con **la salida redirigida a un archivo**
    fue lo que dio el log donde se veía qué rutas compilaba. Sin esa salida no había forma de ver el
    `Compiling` que faltaba.

53. **Dos sondas mías fallaron, las dos del mismo género, y una tiene parentesco con D-33.**
    (a) `Invoke-WebRequest` a la ruta del detalle devolvió **200 con 31 KB** y parecía que el servidor
    estaba sano. Era la página de **login**: sin cookies el proxy contesta **307** hacia `/login`, y
    `Invoke-WebRequest` sigue las redirecciones. La sonda medía otra página. Se destapó repitiendo con
    `-MaximumRedirection 0`.
    (b) Leer el overlay de error con `shadowRoot.textContent` devolvió el **CSS de Bootstrap Reboot** que
    Next inyecta en su portal, no el mensaje.
    → **El primer sospechoso de una medición rara es la medición**, otra vez.
    → El parentesco con D-33 es por el reverso: allí `curl` era MÁS privilegiado que el navegador porque no
    manda cabecera `Origin`; acá `Invoke-WebRequest` era MENOS capaz —no lleva sesión— y su resultado se
    leía como éxito. **Una sonda sin sesión no prueba nada sobre una ruta que exige sesión.**

54. **El barrido de la rejilla se amplió a los dos bordes móviles, que es donde de verdad se rozan.** El
    plan pedía barrer "el día entero pidiendo la primera y la última franja de varias duraciones". Eso se
    hizo sobre `2026-08-13` y las ocho salieron aceptadas, con los mismos números que ya tenía medidos la
    Task 9. Pero ese día está en mitad de la ventana, donde nada se roza.
    → Se añadieron los dos bordes que sí se rozan. Medido a las **17:56 de Lima**:

    | Borde | Qué ofrece la rejilla | La ofrecida, contra la RPC | La de al lado, que NO ofrece |
    |---|---|---|---|
    | **Hoy** (2026-08-11) | 8 franjas, 18:00 → 21:30 | 18:00 **aceptada** | 17:30 → `No se puede reservar en el pasado` |
    | **Día 8** (2026-08-18) | 20 franjas, 08:00 → **17:30** | 17:30 **aceptada** | 18:00 → `Fuera de la ventana de reserva` |
    | **Día 9** (2026-08-19) | **0 franjas** | — | — |

    → El día 8 es el que importa: **la rejilla lo corta a las 17:30 y no ofrece el día entero.** Eso cierra
    por medición el fallo de diseño que el propio plan detectó al escribirse —`available_slots` filtrando
    por fechas donde `create_reservation` compara instantes—, que es exactamente el fallo que esa función
    existe para evitar.
    → Y la regla que gobierna sigue en pie y ahora tiene número: **la rejilla se corta exactamente donde la
    RPC empieza a rechazar**, en los dos bordes que se mueven con el reloj.

55. **La rejilla avanza con el reloj, y se vio sin buscarlo.** A las 17:56 la rejilla ofrecía **8** franjas
    para hoy, desde las 18:00. A las ~18:20, en el navegador, ofrecía **7**, desde las 18:30. Las 18:00
    habían pasado.
    → Es el mismo hecho que el borde A de la corrección 54, visto por el camino del alumno y media hora más
    tarde.

56. **Las dos imágenes de Cloudinary del seed local dan 404, y es dato del seed, no código.** Medido con
    una petición HEAD: `res.cloudinary.com/demo/image/upload/seed/lap-001.jpg` y `.../cam-001.jpg`
    contestan **404**. El log del dev server lo dice también: `upstream image response failed ... 404`.
    → No rompe ninguna página y **no afecta a producción**, cuyas imágenes son otras. Es el mismo género
    que `featured` en la 2A: **el seed local es una fixture de valores convenientes, no representativos.**

57. **El 404 posterior a reservar quedó cerrado por el otro lado, y se comprobó.** La corrección 18 anotó
    que tras reservar bien el redirect caía en un 404 porque `/mi-panel` no existía todavía. En este
    recorrido **el redirect cayó en `/mi-panel` y la reserva estaba ahí**. La Task 12 lo cerró como estaba
    previsto.

**Verificado al cerrar la Task 15, en un navegador de verdad y con sesión real de Ana**, entrando por magic
link vía Mailpit —el enlace apuntaba a `http://127.0.0.1:3000/auth/confirm`, con **el host conservado**— y
con el reparto por perfil llevando a `/catalogo`. El calendario del Laptop ofrece **ocho días** —del martes
11 al martes 18— y **dieciséis duraciones**; el día 14, sus **28 franjas** de 08:00 a 21:30, todas con «1
equipo libre». El campo oculto `slotStart` valía `2026-08-14T15:00:00+00:00`, que son las **10:00 de Lima**:
la franja exacta, **sin desplazarse una hora**. **La reserva se creó** —`LAP-001` en Monterrico, viernes 14
de 10:00 a 10:30, motivo `Tesis`, estado `reserved`— y el redirect cayó en `/mi-panel` *(corrección 57)*. Al
cancelar, el día 14 pasó de **19 libres y 9 ocupadas** a **28 y 0**, y las 28 se volvieron a ver **en la
pantalla**, no solo por SQL. En el diálogo: nace deshabilitado, **con cinco espacios sigue deshabilitado**
—lo que mantiene inalcanzable el rechazo #1— y el motivo se tecleó con espacios alrededor, **29 caracteres,
guardados 25**, con la tilde intacta. Después, «Próximas» desapareció, la tarjeta pasó a «Anteriores» como
«Cancelada por: …» y el diálogo **se cerró solo**. **La encuesta** nace con el botón deshabilitado; se
guardaron 5, 4, 5, 4, 5 con la recomendación en `true`, un texto de **37 caracteres tecleados y 33
guardados**, y los otros dos vacíos quedaron en **`null`**; el acuse fue el de **primera vez**, con la línea
«Ya respondiste» del Server Component encima —la redundancia de la corrección 51, vista otra vez y **no
retocada**—. `/mi-panel` perdió la invitación y quedó «Editar mi encuesta de satisfacción». **Al salir**, la
cabecera vuelve a «Entrar» y `/mi-panel` y `/catalogo` redirigen. **Y el recorrido del sancionado, que es el
que prueba dónde vive el control:** el `update` sobre `alumnos` **por `auth_user_id`** afectó **1 fila**; la
pantalla dijo «Tienes una sanción vigente hasta el 26 de agosto de 2026, 18:28.» **sin calendario, sin
duraciones, sin franjas y sin botón**, y sin la palabra `infinity`; y forzando la RPC con las claims de Ana
sobre una franja **libre** —28 libres ese día, así que no era falta de sitio— contestó `Tienes una sancion
vigente hasta 2026-08-26 23:28:49.322761+00` y **no creó nada**. Los dos formatos de `banned_until`
volvieron a verse juntos *(corrección 19)*. Consola **sin un solo error ni advertencia**, solo
`[Fast Refresh]` y `[HMR] connected`. `typecheck`, `lint`, `test` (**43** en 3 archivos) y `build` en verde,
con **trece rutas** y las tres estáticas de siempre: `/_not-found`, `/faq` y `/login`.

---


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
