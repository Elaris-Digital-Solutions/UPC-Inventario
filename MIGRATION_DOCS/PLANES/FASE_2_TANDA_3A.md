# Fase 2 · Tanda 3A — El mostrador · Plan de implementación

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

### Estado de la ejecución *(al 2026-08-12)*

| Task | Estado |
|---|---|
| **1 · El andamio del personal** | ✅ **Cerrada.** Commit `2444685`. `typecheck`, `lint`, `test` (43) y `build` (**14 rutas**) en verde |
| **2 · Migración 23, cierra Q-17** | ✅ **Cerrada.** Commit `8ddcc01`. Migración `20260812053243_cancel_before_start.sql` y `supabase/tests/31_cancel_before_start.sql`. `db reset` aplicó **23 migraciones**; `test db`: `Files=24, Tests=147`, `Result: PASS`. `typecheck`, `lint` y `build` (14 rutas) verdes; `test` sigue en 43, sin cambios |
| **3 · El botón imposible** | ✅ **Cerrada.** Commit `80956b6`. `typecheck`, `lint`, `test` (**48**, de 43) y `build` (14 rutas, 3 estáticas) en verde |
| **4 · Las tres columnas** | ✅ **Cerrada.** Commit `1c1278f`. Step 0 medido por PostgREST con JWT de operador. `lib/mostrador/` con `columnas.ts`, `columnas.test.ts` y `consultas.ts`. `typecheck`, `lint` y `test` (**56 en 4 archivos**, de 48 en 3) en verde |
| **5 · Entregar y recibir** | ✅ **Cerrada.** `acciones.ts`, `tarjeta-mostrador.tsx` y la pantalla con las tres columnas. Los dos `UPDATE` medidos por PostgREST antes de escribir. **Cierra el pendiente del `SQLSTATE`** y el punto a verificar 1. Los cuatro comandos verdes; `build` en 14 rutas con `/mostrador` dinámica |
| **6 a 10** | Sin empezar |

**Por qué se paró, y no es del código:** Windows reservó para Hyper-V/WSL2 el rango de puertos TCP
**54245–54344**, que se traga los cuatro de Supabase local —54321 API, 54322 base, 54323 Studio, 54324
Mailpit—. `npx supabase start` falla con `bind: An attempt was made to access a socket in a way forbidden
by its access permissions`. Verificado con `netsh interface ipv4 show excludedportrange protocol=tcp`, que
además muestra un segundo rango contiguo, 54145–54244. **Se resuelve con `wsl --shutdown` o reiniciando el
servicio `winnat` como administrador**, no tocando el repositorio.

**El bloqueo se resolvió reiniciando, y queda confirmado que el rango desapareció.**
`netsh interface ipv4 show excludedportrange protocol=tcp` ya **no** muestra 54245–54344; los rangos que
quedan (49682–49992, 50000–50579, 60004–60103) no tocan los puertos de Supabase. **Y esta vez la
comprobación de que el stack estaba arriba se hizo por el puerto del host, no con `docker exec`**:
`docker ps` mostró `0.0.0.0:54322->5432/tcp`, y un socket TCP abierto desde el host con
`System.Net.Sockets.TcpClient` conectó. La trampa de la sesión anterior —la sonda más privilegiada que la
herramienta real— no se repitió.

**Y una trampa nueva del entorno, que conviene no volver a pisar:** el stack **parecía** arrancado.
`npx supabase start` había salido con código 0 y el contenedor figuraba como `healthy`, pero **sin puerto
publicado en el host** —`docker inspect` mostraba `"5432/tcp":[]`—. Las consultas hechas con
`docker exec ... psql` funcionaban, porque van por dentro del contenedor y no pasan por el puerto. **La
sonda que funcionaba era más privilegiada que la herramienta real**, que se conecta por `127.0.0.1:54322`.
Es la misma forma de la trampa de D-33 y de la sonda sin sesión de la T2B: **la herramienta con la que
compruebas no es la que va a usar el trabajo de verdad.** Para saber si el stack está arriba, lo que hay
que probar es una conexión **por el puerto del host**, no un `docker exec`.

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

### Task 2 · Migración 23 (2026-08-12)

1. **El rojo no fue de cinco aserciones sino de dos, y el archivo abortó antes de llegar a las otras
   tres.** El Step 2 predecía ver fallar las cinco. Lo que dio `pg_prove`: la aserción 1
   (`throws_ilike`) con «no exception thrown»; la aserción 2 con «have: cancelled / want: reserved»; y
   después un `ERROR: Transicion no permitida: cancelled -> not_picked_up` que tumbó la transacción
   entera —`Parse errors: Bad plan. You planned 5 tests but ran 2`—. **No es un defecto del arnés**: la
   aserción 3 hace un `update` suelto, fuera de `throws_ok`/`lives_ok`, y con la fila ya en `cancelled`
   —porque la RPC vieja la dejó cancelar— el trigger de la máquina de estados dispara la excepción y
   tumba todo lo que venía después. **Y el aborto mismo es la prueba**: es Q-17 reproducido en la base,
   con la reserva llegando a `cancelled` y el personal perdiendo la posibilidad de marcarla
   `not_picked_up` desde un estado terminal. Es el daño que D-38 cierra, visto ejecutándose delante.
2. **El decimoquinto hecho falso de un subagente, y es de un género nuevo: sobre-afirmación de
   ALCANCE.** El comentario de cabecera de la migración decía que el personal ya puede cancelar
   «cualquier» reserva por `UPDATE` directo. **Es falso**: solo puede cancelar las que están en
   `reserved`. Una `active` no la cancela nadie, porque `active -> cancelled` no está entre las
   transiciones válidas de `enforce_reservation_transition()` —
   `supabase/migrations/20260806005731_reservation_state_machine.sql:38-39`—. El código funciona,
   porque la comprobación nueva va después del filtro por `reserved` y ahí la reserva siempre está en
   ese estado; el comentario mentía sobre hasta dónde llegaba la afirmación. **No es un dato inventado
   ni una fuente inventada** —los catorce anteriores eran de esos dos géneros—, es un hecho cierto en el
   caso que importaba, estirado a un caso más amplio donde es falso. **Las dos comprobaciones
   habituales lo habrían dado por bueno**: el personal sí tiene la política `reservations_update_staff`,
   y esa política sí existe. Lo que falla es el cuantificador, no el dato ni la fuente. Ya está
   corregido en el propio archivo de la migración, con la cita de líneas.
3. **La atribución que sí se verificó, y salió correcta.** El subagente citó
   `20260806171347_duration_slot_multiple.sql`, líneas 23-27, como fuente de que `create or replace`
   conserva los privilegios de una función. Abierto el archivo, está exactamente ahí. Es la primera
   atribución de un subagente que se comprueba y resulta correcta desde que se empezó a vigilar este
   género de error.
4. **Punto a verificar 2, resuelto: sí.** `19_function_hardening.sql` (4 aserciones) sigue en verde tras
   el `create or replace` de la migración 23, sin tocar ese archivo. La predicción del plan se cumplió,
   confirmada corriendo `npx supabase test db` y no razonándola.
5. **Punto a verificar 1, resuelto a medias.** Lo medido: el texto del rechazo nuevo es «No puedes
   cancelar una reserva que ya empezo», fijo y sin interpolación `%` —a diferencia del rechazo #4, que
   interpola el estado y por eso `mensajeDeRechazoCancelacion()` lo empareja por prefijo—.
   **Consecuencia para la Task 3:** este quinto caso se puede emparejar por igualdad exacta, no hace
   falta prefijo. Lo NO medido: el `SQLSTATE` tal como llega por PostgREST, que es la herramienta real
   de `lib/reservas/acciones.ts`. `check_violation` es `23514` por definición en Postgres, pero no se ha
   visto llegar así por PostgREST —no hay `psql` en el host, y montar ese escenario es justo la Task 9—.
   Queda anotado como pendiente de medir ahí, no como medido. La predicción de que el rechazo nuevo no
   compite con los otros cuatro se sostiene por la ubicación del `if`, pero disparar cada uno de los
   cinco a propósito también es Task 9.
6. **Los números finales.** `npx supabase db reset` aplicó **23 migraciones**. `npx supabase test db`:
   `Files=24, Tests=147`, `Result: PASS`. De **22 a 23 migraciones**, de **142 a 147 aserciones**, en
   **24 archivos** (antes 23) —las 5 nuevas son las de `31_cancel_before_start.sql`—. `typecheck` y
   `lint` verdes. `npm run test`: **43 pruebas en 3 archivos**, sin cambios —esta tarea es SQL y no
   añade lógica pura, así que ese verde no afirma nada sobre lo escrito, igual que en la Task 1. `npm
   run build`: **catorce rutas**, tres estáticas (`/_not-found`, `/faq`, `/login`).

### Task 3 · El alumno deja de ver un botón imposible *(2026-08-12)*

1. **El Step 4 no se podía cumplir sin extraer la condición del JSX, y eso no es una preferencia de
   estilo.** El plan pide «una prueba de Vitest para la regla de visibilidad del botón», pero el proyecto
   **no tiene `@testing-library/react` ni `jsdom`** —comprobado en `package.json`—, así que Vitest solo
   puede probar funciones puras: las tres suites que existen lo son. La alternativa habría sido añadir
   dependencias, y eso es un desvío que el plan no autoriza. La regla vive ahora en
   `seOfreceCancelar(estado, grupo, inicio, ahora)`, en `lib/reservas/agrupar.ts`, al lado de
   `grupoDeReserva()` y probada en el mismo archivo que ya lo cubría. **El plan describía el cambio como
   una edición en tres archivos y en realidad son cinco**, con la función pura y su prueba.
2. **La condición nueva SUBSUME a la vieja, y las dos se conservan igual.** Para una reserva `reserved`,
   `grupo === 'proxima'` equivale a `fin > ahora`; y como `inicio < fin` siempre, `inicio > ahora` ya
   implica `fin > ahora`. En lógica estricta el término de D-35 sobra. Se conservan los dos porque son
   **dos decisiones con dos fuentes distintas** que solo coinciden en la misma línea, y porque quitar el
   de D-35 haría que el botón dependiera de un invariante que esta función no puede revalidar —no lee
   `fin` en ningún momento—. **Y ese «siempre» no es una suposición de dominio:** lo hace cumplir
   `CONSTRAINT chk_reservation_dates CHECK (end_at > start_at)`,
   `supabase/migrations/20260805030123_baseline.sql:180`. El subagente lo había escrito como inferencia
   razonable **y avisó de que no lo había verificado**; se verificó al revisarlo y resultó cierto.
3. **Ninguno de los tres géneros de hecho falso apareció esta vez. Siguen siendo QUINCE.** El subagente
   abrió las seis citas de archivo:línea que escribió, y las verificadas por segunda vez al revisar
   —el texto del mensaje en la migración 23, el guardado por `not private.is_staff()`, el orden de los
   cinco rechazos, y que `TarjetaReserva` solo se usa en `/mi-panel`— salieron todas correctas. **Es la
   segunda tarea seguida sin un hecho falso**, tras la Task 2.
4. **Y una imprecisión que el subagente destapó él mismo, en su propia lista de «lo que no verifiqué».**
   El comentario de `tarjeta-reserva.tsx` decía, desde la T2B, que `not_picked_up` «es la marca que
   dispara la sanción». **Es sobre-afirmación de alcance, y es preexistente:** una sola `not_picked_up`
   no sanciona a nadie. `apply_penalties()` exige `v_count >= 2` en los últimos 90 días —
   `supabase/migrations/20260806013146_penalties.sql:44`—, así que la primera falta no hace nada visible.
   El subagente la conservó por no estar en su alcance y la reportó; se corrigió al revisar, porque el
   comentario que la contenía se estaba reescribiendo de todas formas. **No cuenta como decimosexto hecho
   falso: reportar una imprecisión ajena es lo contrario de escribir una propia.**
5. **Un género nuevo de comentario caducado, y este sí se le pasó: por EFECTO COLATERAL en otro archivo.**
   `components/reservas/dialogo-cancelar.tsx` explicaba por qué el diálogo se cierra solo, y para hacerlo
   **citaba literalmente** la condición de `tarjeta-reserva.tsx`. Al extraer esa condición a
   `seOfreceCancelar()`, la cita quedó describiendo código que ya no existe —con el razonamiento todavía
   correcto—. `typecheck`, `lint`, `test` y `build` no pueden ver esto: es prosa. **La lección es de
   método: cambiar una condición caduca las citas LITERALES de esa condición en otros archivos**, y el
   encargo solo nombraba los archivos a modificar, no los que la mencionan. Se corrigió al revisar.
6. **Los números.** `typecheck` y `lint` verdes. `npm run test`: **48 pruebas en 3 archivos**, de 43 —las
   5 nuevas son las de `seOfreceCancelar`—, y a diferencia de las Tasks 1 y 2 **este verde sí afirma algo
   sobre lo que se escribió**. `npm run build`: **catorce rutas**, tres estáticas —`/_not-found`, `/faq`,
   `/login`—, sin cambios respecto de la Task 1, porque esta tarea no añade ninguna ruta.
7. **El `SQLSTATE` por PostgREST sigue SIN MEDIR**, y quedó escrito así en el propio código. El
   emparejamiento va por texto y no lo necesita, pero el pendiente es de la Task 9 y no se contó como
   resuelto.

### Task 4 · Step 0, la medición del embed *(2026-08-12)*

**Punto a verificar 5, RESUELTO: el embed llega `null` y la fila NO se descarta.** Medido por HTTP contra
PostgREST —`127.0.0.1:54321`, la herramienta real de `lib/mostrador/consultas.ts`, y no por `docker exec`,
que no pasa por PostgREST y por tanto no puede decir nada de cómo arma el JSON—. Con un JWT de operador
firmado a mano: el stack local usa **HS256** con el secret que muestra `npx supabase status`, así que se
puede emitir una sesión de cualquier usuario sin pasar por el magic link. *(El proyecto remoto firma con
ES256; esta receta sirve solo en local.)* Escenario: Ana con reserva `reserved` —visible— y Bruno con una
`not_picked_up` que lo deja sin ninguna reserva viva —bloqueado por `alumnos_select_staff`—.

La reserva de Bruno llegó como `{"id":"...","status":"not_picked_up","alumnos":null}`. **La fila viene
entera y solo el embed se vacía.** Control con admin: los dos embeds poblados. Y una tercera sonda,
leyendo `alumnos` directamente con el operador, confirma que el bloqueo es real y no un fallo del embed
por otra causa: Bruno no aparece. *(Efecto lateral que conviene saber: el operador **sí** se ve a sí
mismo en `alumnos`, con `nombre` nulo. Tiene fila propia porque `handle_new_auth_user` se la creó, y
`alumnos_select_own` se la deja ver. No es un alumno de verdad, y cualquier listado de alumnos que se
escriba después va a incluirlo.)*

**Y una corrección al punto a verificar 4, que el plan y la memoria predecían mal.** Los dos dicen que al
marcar `not_picked_up` «la reserva se sigue viendo; el nombre vuelve nulo». **Falso para esta pantalla.**
Medido con el filtro real del mostrador, `status in ('reserved','active')`: la reserva de Bruno
**desaparece de la lista entera**, no aparece con el nombre en blanco. El filtro la excluye antes de que
RLS tenga que decidir nada sobre el alumno.

**La razón es estructural y vale la pena dejarla escrita: el filtro del mostrador y la condición de la
política son LA MISMA CONDICIÓN.** `private.tiene_reserva_viva()` cuenta exactamente `reserved` y
`active` —`20260805194848_alumno_policies.sql:58`—, que son las dos que el mostrador pide. Así que en esta
consulta concreta **un `alumnos: null` es imposible**: si la reserva está viva, su alumno tiene una
reserva viva por definición. Confirmado moviendo la reserva de Bruno a `active` y viendo su embed poblarse
solo, sin tocar ninguna política.

**Consecuencia de diseño, y no la que el plan anticipaba.** El tipo **sigue admitiendo `null`** —PostgREST
lo devuelve así y cualquier cambio del filtro lo haría aparecer de verdad—, pero la pantalla **no** tiene
que tratar «alumno sin nombre» como un caso corriente que se vea a menudo: con el filtro de hoy no ocurre
nunca. Lo que sí pasa, y es lo que la Task 9 debe mirar, es que **la tarjeta desaparezca** al marcar la
falta. Que es un efecto distinto y bastante más visible que un nombre en blanco.

### Task 4 · Las tres columnas *(2026-08-12)*

1. **La frontera se escribe con `>` y no con `≥`, contra la letra del plan.** El plan define las columnas
   como «`activas` (`active` y fin ≥ ahora), `por_devolver` (`active` y fin < ahora)». Se usa `>`
   estricto: `fin > ahora` → `activas`, `fin <= ahora` → `por_devolver`. **El motivo es coherencia
   interna:** `grupoDeReserva()` ya parte esa misma frontera con `finFecha > ahora` y explica por qué
   —en el instante exacto en que `fin` alcanza a `ahora` no queda ningún segundo dentro de la franja—.
   Que dos funciones del mismo proyecto cortaran el mismo instante en direcciones opuestas es el género
   de inconsistencia que esta fase persigue. Sin consecuencia práctica —es un instante—, y queda
   documentado en el código y probado en el borde.
2. **`columnaDeReserva()` devuelve `Columna | null` y no un cuarto valor.** La función tiene que ser
   total —su entrada es `EstadoReserva` entero, seis valores—, pero un cuarto miembro de `Columna`
   obligaría a cada consumidor a manejar una columna que no se pinta nunca: el mostrador no tiene
   sección «otros». La consulta ya excluye los cuatro terminales, así que esa rama no se alcanza hoy.
3. **Desviación de alcance, aceptada: `ReservaMostrador` trae `unidadId`, que la Task 4 no pedía.** Es la
   FK cruda `unit_id`, y la añadió el subagente anticipando que `anotar(unitId, nota)` de la Task 7 la va
   a necesitar. Roza la regla de «no generalizar antes de tener el caso» que el propio plan invoca en su
   Task 7, pero se conserva: es **un dato crudo de la fila**, no una abstracción especulativa, y la Task 7
   lo necesita con certeza. **Se anota porque el subagente lo declaró como decisión propia y ofreció
   quitarlo**, no porque se descubriera después.
4. **El decimosexto hecho falso de un subagente, y estrena un género que es el más incómodo hasta ahora:
   falsedad sobre la PROPIA SALVAGUARDA.** El comentario de `consultas.ts` afirmaba, en indicativo y sin
   matiz, que «que columnas exactas de `alumnos` se pidan no cambia esto». En su lista de «lo que no
   verifiqué» el subagente **avisó correctamente de que era inferencia y no medición** —eso funcionó—,
   pero añadió que «lo dejé escrito como inferencia, no como medición, en el comentario». **Eso último es
   falso: el comentario no lo marcaba de ninguna forma.** Los quince anteriores fueron afirmaciones
   falsas sobre el sistema; esta es una afirmación falsa **sobre el propio texto que se acababa de
   escribir**, y aparece dentro del mecanismo que existe para cazar a los otros. **La lección: el reporte
   de autoverificación no sustituye a abrir el archivo.** Si se hubiera confiado en el reporte, habría
   quedado una afirmación categórica sin medir.
5. **Y el dato de fondo resultó CIERTO, medido al revisarlo.** Tres sets de columnas sobre la misma fila
   bloqueada —`alumnos(email)`, `alumnos(nombre,apellido,email)` y uno de siete columnas que incluye
   `banned_until`, que **no tiene `GRANT` para nadie**— devolvieron los tres `"alumnos":null`. **Cuando
   RLS bloquea la fila relacionada, el embed se vacía entero sin llegar a mirar columnas.** El comentario
   ya cita esa medición en vez de la inferencia.
6. **Dos errores que el subagente se corrigió a sí mismo antes de entregar, y conviene registrarlos
   porque son de los géneros vigilados.** Uno de atribución: había citado **D-16** como fuente de que
   `reservations_select_staff` deja ver todo al personal; abrió `ESTADO_Y_PLAN.md` y vio que D-16 trata de
   **quién mueve el estado**, no de la política de `SELECT`, y la sustituyó por
   `20260805195852_reservation_policies.sql:27-29`. Otro de cita textual: había entrecomillado como
   literal una frase del comentario de `ajustesReserva()` que en realidad había parafraseado, y la
   reescribió sin comillas diciendo que es el mismo argumento adaptado. **Las tres citas SQL que quedaron
   se reverificaron al revisar y las tres son correctas.**
7. **Un tipo que parecía mal y estaba bien.** `AlumnoMostrador` declara `nombre` y `apellido` como
   `string | null` y `email` como `string`, mientras el baseline los crea los tres `NOT NULL`
   —`20260805030123_baseline.sql:90-92`—. No es un error: `20260805194424_alumno_provisioning.sql:22-23`
   les quita el `NOT NULL` a `nombre` y `apellido` después, porque el trigger crea la fila al **pedir** el
   magic link, cuando todavía no se sabe cómo se llama nadie. `lib/database.types.ts` lo confirma.
   **Leer solo el baseline habría dado un falso positivo:** el esquema de hoy son veintitrés migraciones,
   no la primera.
8. **Los números.** `typecheck` y `lint` verdes. `npm run test`: **56 pruebas en 4 archivos**, de 48 en 3
   —las 8 nuevas son las de `columnas.test.ts`—. Sin `build`: esta tarea no añade ninguna ruta y el plan
   no lo pide; `typecheck` ya cubre la compilación de los tres archivos.

### Task 5 · Entregar y recibir *(2026-08-12)*

1. **Tercera vez que el plan lista un archivo que ninguna tarea crea.** El Step 4 pide los botones «en
   `tarjeta-mostrador.tsx`», la «Estructura de archivos» lo lista como nuevo, y ninguna tarea lo crea.
   Lo crea la Task 5. Es exactamente el hueco que la Task 1 encontró con `mostrador/page.tsx`. **El patrón
   ya es reconocible: cuando un Step dice «los botones en X» y X no está en los `Files` de esa tarea,
   nadie lo va a crear.**
2. **Se midió por PostgREST ANTES de escribir, y esa es la razón de que no hubiera sorpresas.** pgTAP ya
   probaba el `UPDATE` del operador, pero con `set local role` en SQL directo, que no atraviesa el JWT ni
   el rol real ni el conjunto de columnas que manda el cliente. Medido con JWT de operador firmado a mano:
   `reserved → active` y `active → completed` dan **HTTP 200**. **Y el alumno falla en silencio: HTTP 200
   con `[]`**, cero filas y ningún error —lo que el comentario de `cancelar()` describía desde la T2B,
   ahora medido por la herramienta real—.
3. **PENDIENTE CERRADO, el que la Task 2 dejó abierto: el `SQLSTATE` SÍ llega por PostgREST**, en
   `error.code`, con el código de Postgres tal cual. Medido: `23514` para las violaciones de `CHECK` y
   `42501` para privilegio denegado, con `hint` incluido en este último.
4. **Punto a verificar 1, RESUELTO, adelantado de la Task 9** porque el instrumento ya estaba montado.
   Los cinco rechazos de `cancel_reservation`, disparados a propósito:

   | # | Mensaje literal | `code` | HTTP |
   |---|---|---|---|
   | 1 | `La cancelacion exige un motivo` | 23514 | 400 |
   | 2 | `Reserva inexistente` | P0002 | **500** |
   | 3 | `No puedes cancelar una reserva ajena` | 42501 | 403 |
   | 4 | `Solo se cancela una reserva en estado reserved (esta en active)` | 23514 | 400 |
   | 5 | `No puedes cancelar una reserva que ya empezo` | 23514 | 400 |

   **La predicción del plan se cumple y el mapeo de la Task 3 queda validado entero:** el quinto mensaje
   es literal y fijo —la igualdad exacta era la decisión correcta—, `23514` lo comparten **tres**, y el
   orden #1 antes de #2 se confirma pidiendo una reserva inexistente **sin** motivo: contesta por el
   motivo. Los dos casos que deben funcionar dieron **204**, el del personal cancelando una reserva ya
   empezada incluido —la guarda `not private.is_staff()` hace lo que dice—. **Dato nuevo: el rechazo #2
   llega con HTTP 500**, no 400; PostgREST trata `no_data_found` como error de servidor. No cambia nada
   —se empareja por texto— pero conviene saberlo antes de verlo en un log.
5. **La única deducción del subagente, medida y CORRECTA.** Declaró honestamente que «dos operadores
   pulsando el mismo botón no da error» lo había leído del trigger y no medido. Medido: la segunda
   pulsación con el mismo valor da **HTTP 200 sin error**, y `reservation_status_log` queda con **una
   sola fila** —el trigger de log no registra un cambio que no ocurrió—. El contraste también:
   `active → not_picked_up` da 400 con `Transicion no permitida`.
6. **Y ese mismo experimento destapó algo que la Task 6 tiene que saber: `updated_at` SÍ se mueve aunque
   el estado no cambie.** La segunda pulsación lo actualizó sin dejar rastro en el log. **Importa porque
   `apply_penalties` cuenta los `not_picked_up` de los últimos 90 días contra `updated_at`**, así que un
   `UPDATE` con el mismo valor **rejuvenece** esa fecha y puede meter en la ventana una falta que ya había
   salido de ella. **No es un defecto nuevo:** el propio comentario de
   `20260806013146_penalties.sql:19-21` ya lo anticipa y ofrece `reservation_status_log.changed_at` como
   alternativa si se endurece. **Y hoy está cerrado por el filtro:** `reservasMostrador()` solo trae
   reservas vivas, así que el mostrador nunca ofrece un botón sobre una fila ya terminal.
7. **Una lección de método que costó una sonda: mi propia medición mintió primero.** El primer intento de
   capturar los rechazos dio `PGRST102 Empty or invalid json` en los **tres** casos, con tres cuerpos JSON
   válidos y distintos. Eso es imposible como comportamiento del sistema: era el quoting de PowerShell 5.1
   al pasar `-d '{"...":"..."}'` a `curl.exe`. Se corrigió mandando el cuerpo desde un archivo con
   `--data-binary "@ruta"`. **La señal general: cuando varios casos que deberían diferir dan
   EXACTAMENTE el mismo error, el sospechoso es el instrumento, no lo medido.** De haberlo anotado, el
   plan diría hoy que PostgREST rechaza los `UPDATE` del mostrador — falso, y con el código correcto
   delante.
8. **Y un error mío de menor tamaño, también delatado por la medición:** consulté `from_status` y
   `to_status` en `reservation_status_log`. Las columnas reales son **`old_status` y `new_status`**, más
   `reason`, `changed_by` y `changed_at`. Anotado para la Task 6, que tiene que comprobar ese log.
9. **`useTransition` y no `useActionState`, con la cita abierta.** Los dos botones no tienen ningún campo
   de formulario, solo un id que la tarjeta ya conoce. La tabla «Next steps» de
   `node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md` reparte exactamente así los dos
   casos. **Es la primera vez en la tanda que un subagente cita los docs de Next 16 en vez de la memoria**,
   que es lo que `AGENTS.md` manda.
10. **Ningún hecho falso nuevo: siguen DIECISÉIS.** Las cuatro citas al SQL de la máquina de estados
    —líneas 33, 41, 45 y 62-68— se reverificaron y las cuatro son exactas, la desambiguación entre el
    cuerpo y la corrección 8 de `FASE_2_TANDA_2B.md` también. **Y respondió al control nuevo**: se le pidió
    releer sus propios comentarios antes de afirmar que había dejado algo marcado como pendiente, y reportó
    haber hecho `grep` para confirmarlo.
11. **Los números.** `typecheck`, `lint` y `build` verdes. `npm run test`: **56 en 4 archivos, SIN
    CAMBIOS** —esta tarea no añade lógica pura, así que ese verde **no afirma nada** sobre lo escrito,
    igual que en las Tasks 1 y 2—. `npm run build`: **catorce rutas, tres estáticas**, y **`/mostrador`
    sigue dinámica** — la señal de alarma que el encargo pedía vigilar no se disparó.

### Briefing de arranque para la Task 6 *(escrito el 2026-08-12, antes de ejecutarla)*

**Se corta la sesión aquí a propósito.** La Task 6 es la tarea delicada de la tanda —la primera que puede
sancionar a una persona, con bloqueo permanente en un caso— y merece una sesión con contexto entero, no
uno comprimido. Esto es lo que la sesión siguiente **no** tiene que volver a deducir.

**Estado al cortar.** Tasks 1 a 5 cerradas y comiteadas: `2444685`, `8ddcc01`, `80956b6`, `1c1278f`,
`71c42d9`. Árbol limpio, rama `feature/fase-2-tanda-3a`, nada empujado. Base local **limpia, 0 reservas**
—todos los escenarios de medición se borraron—. **23 migraciones y 147 aserciones pgTAP en 24 archivos;
56 pruebas de Vitest en 4 archivos; `build` de 14 rutas, 3 estáticas.**

**Lo que ya existe y la Task 6 usa.** `lib/mostrador/acciones.ts` con `entregar()`, `recibir()`, el helper
privado `moverEstado()` y `mensajeDeRechazoMostrador()` —las dos faltas se **añaden a ese mismo archivo**—.
`components/mostrador/tarjeta-mostrador.tsx` ya tiene **el hueco de los dos botones marcado con un
comentario**, al final de su fila de botones. Y `components/ui/` ya tiene `dialog.tsx`, `textarea.tsx` y
`label.tsx`, instalados por la Task 1: **no hace falta `shadcn add`.**

**El escenario que hay que montar, y por qué no sale del seed.** El seed no siembra ninguna reserva, y
`create_reservation` rechaza el pasado a propósito, así que se insertan a mano como `postgres` —el stack
local corre; si no, `npx supabase start`—. Alumnos sembrados: Ana `a0000000-…0001`, Bruno `…0002`;
operador `…000b`, admin `…000a`. Unidades **distintas** por reserva, o el `EXCLUDE` anti-solape las choca.
Para las dos faltas hacen falta: una `reserved` para `not_picked_up`, una `active` para `not_returned`, y
—para ver la sanción de 15 días— **dos** `not_picked_up` del mismo alumno dentro de los 90 días.

**Los tres contrastes de `banned_until`, que son el Step 5 y no se pueden razonar, hay que verlos:**

| Momento | `banned_until` esperado |
|---|---|
| Tras la **primera** `not_picked_up` | sigue **`NULL`** — `apply_penalties` exige `v_count >= 2` |
| Tras la **segunda** en 90 días | `now() + 15 days`, con `greatest(...)` para no acortar una que ya corría |
| Tras una `not_returned` | **`infinity`** |

**Ya está medido que la primera no sanciona** —se vio de paso en el Step 0 de la Task 4: Bruno quedó con
`banned_until` vacío tras una `not_picked_up`—. Faltan la segunda y la `not_returned`.

**Cinco cosas medidas en las Tasks 4 y 5 que la Task 6 hereda:**

1. **El `SQLSTATE` llega por PostgREST en `error.code`**, tal cual. `23514` para `CHECK`, `42501` para
   privilegio.
2. **Las columnas reales del log son `old_status` y `new_status`** —más `reason`, `changed_by`,
   `changed_at`—. No existen `from_status` ni `to_status`; consultarlas falla y ya costó un intento.
3. **Un `UPDATE` con el mismo valor no da error, no deja fila en el log, pero SÍ mueve `updated_at`**, que
   es contra lo que `apply_penalties` cuenta los 90 días. Hoy lo cierra el filtro de reservas vivas.
4. **Al marcar `not_picked_up`, la reserva DESAPARECE de la pantalla entera** —no se queda con el nombre
   en blanco, como predecía el punto a verificar 4—: el filtro `status in ('reserved','active')` la
   excluye. Es lo que hay que mirar en la Task 9, y conviene que la Task 6 no se sorprenda.
5. **La receta del JWT de operador** para medir por PostgREST está en la corrección del Step 0 de la
   Task 4 y en la memoria del proyecto. Es la única forma de medir RLS por la herramienta real.

**Y una decisión que el plan ya tomó y no hay que reabrir:** en `marcarNoDevuelta()` va **primero el
`INSERT` de la nota y después el `UPDATE` del estado**. Las dos escrituras no son atómicas —la API no da
transacción entre dos llamadas del cliente—, y con ese orden, si la nota falla, la sanción nunca se
dispara. Al revés quedaría un alumno bloqueado sin ningún rastro escrito de por qué.

**Lo que la Task 6 NO hace:** no construye nada para levantar una sanción puesta por error. Solo
`admin_set_ban` puede, es de admin, y su pantalla es de la T3B. Un operador no puede deshacer su propio
error desde el mostrador, y eso se deja escrito en vez de compensarlo.

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
