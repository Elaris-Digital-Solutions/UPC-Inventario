# Fase 2 · Tanda 2B — Reserva y panel · Plan de implementación

---

## 📍 Dónde se paró — actualizado el 2026-08-11, 23:40

> **Bloque temporal.** Se borra al cerrar la tanda; lo reutilizable se convierte en receta.

**TRES de nueve tareas cerradas.** Rama `feature/fase-2-tanda-2b`, **NADA empujado**, árbol limpio.
`develop` está en `e115e17` (PR #26, el plan de esta tanda).

| Commit | Tarea |
|---|---|
| `16bd440` | 2B.8 · la rejilla como lógica pura — **19 pruebas de Vitest, las primeras del proyecto** |
| `d1a48a0` | 2B.9 · el calendario de reserva — **once rutas en el `build`** |
| *(pendiente)* | 2B.10 · la reserva — **escrita y verificada en navegador**, ver las correcciones 12 a 18 |

**Siguiente: la Task 11, el bloqueo por sanción.** Su Step 3 pide montar el escenario con un `update`
directo sobre `alumnos` *(corrección 7)* — y ojo con la trampa de abajo: **`alumnos.id` no es
`auth_user_id`**. El mensaje de sanción ya existe y está escrito en `lib/reservas/acciones.ts`, con los dos
casos que el motor distingue *(corrección 17)*.

**El escenario del stack local sobrevivió a esta sesión** y tiene ya **dos** reservas de Ana: la del
`2026-08-11` que midió el buffer, y la del `2026-08-14` creada desde el navegador en la Task 10. Las dos
sirven para la Task 12, que es la que pinta `/mi-panel`.

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

**Verificado al cerrar la tarea, en un navegador de verdad y con sesión real de Ana:** el botón del detalle
**ya no dice «muy pronto»** y arrastra la sede; el calendario del día 14 ofrece sus 28 franjas; elegir hora
y motivo habilita el botón; y **confirmar creó la reserva**: `LAP-001` en Monterrico, **14 de agosto de
10:00 a 10:30 hora de Lima** —la franja exacta que se eligió, sin desplazarse ni una hora—, motivo `Tesis`,
estado `reserved`, con la unidad elegida por el motor por rotación justa. Después, el mismo producto el
mismo día contesta el **texto propio** del límite diario, con tildes y sin salir de la página; y forzando a
mano el campo oculto a las 07:00 —una hora que la rejilla **nunca** ofrece— contesta el **mensaje crudo**
`Fuera del horario de atencion` y **no crea nada**: siguen siendo dos reservas. Esa última es la prueba de
los dos sentidos que importa: **manipular el formulario no abre nada, porque quien decide es el motor.**
Consola **sin un solo error ni advertencia**. `typecheck`, `lint`, `test` (19) y `build` en verde, con
**once rutas** y las mismas tres estáticas: una Server Action no añade ruta.

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
