# Tanda 5 — Plan de ejecución

> **Para quien ejecute:** las tareas se hacen **en orden** y cada una termina en **un commit**. Los pasos
> llevan casilla (`- [ ]`) para ir marcándolos. **Este plan no se reescribe tras ejecutar:** lo que la
> ejecución desmienta va en la cabecera de correcciones de abajo, para no borrar lo aprendido.

**Objetivo:** cerrar **Q-18** y **M-12**, los dos únicos pendientes del proyecto que exigen tocar la base.

**Enfoque:** dos migraciones independientes —la **25** recorta una política de lectura, la **26** añade una
regla de cancelación— y el código de aplicación que cada una arrastra. Nada más entra en esta tanda.

**Stack:** Postgres 15 sobre Supabase · pgTAP · Next.js 16 (App Router) · TypeScript estricto · Vitest ·
Playwright.

**Diseño:** [`../TANDA_5_DISENO.md`](../TANDA_5_DISENO.md) — se lee junto con este plan, no en su lugar.

---

## Correcciones al diseño

*(Se anotan al ejecutar. Las tres primeras son de la propia escritura del plan.)*

1. **Los tests pgTAP nuevos son archivos nuevos, no ampliaciones.** El diseño dice tocar
   `16_traceability.sql` y `31_cancel_before_start.sql`. **Mejor no:** los tests van hoy de `00` a `32`, y
   el patrón del proyecto es que cada migración traiga su archivo propio —la 23 trajo el `31`, la 24 trajo
   el `32`—. Los nuevos son **`33_unit_notes_staff_only.sql`** y **`34_min_cancel_notice.sql`**, y los dos
   viejos **quedan intactos como control de regresión**.
2. **`31_cancel_before_start.sql:74` afirma el texto del mensaje de error**, con
   `throws_ilike(..., '%ya empezo%')`. **Reescribir ese mensaje rompería un test que hoy pasa.** Por eso la
   migración 26 usa **dos ramas y dos mensajes** en vez de una sola comparación ampliada: D-38 conserva su
   texto exacto y M-12 estrena el suyo.
3. **Los dos lectores de `app_settings` nombran sus campos en idiomas distintos, y eso es correcto.**
   `AjustesAdmin` —`lib/admin/configuracion.ts`— está en español: `ventanaDias`, `slotMinutos`,
   `duracionMinima`, `limiteDiario`. `AjustesReserva` —`lib/reservas/consultas.ts`— está en inglés:
   `bookingWindowDays`, `slotMinutes`, `minDurationMinutes`. **Ninguno de los dos se toca para
   uniformarlos**, y el campo nuevo sigue a cada uno: `margenCancelacion` en el de admin y
   `minCancelMinutes` en el del alumno. Parece una incoherencia y es la convención vigente de cada archivo;
   unificarla sería un cambio ajeno a esta tanda.
4. **La política se renombra a `unit_notes_select_staff`.** El diseño conservaba
   `unit_notes_select_auth`, y ese nombre pasaría a afirmar algo falso: `_auth` significa «cualquiera con
   sesión», que es justo lo que deja de ser cierto. Mismo criterio que **D-65**, donde un comentario se
   corrigió para decir lo que la cosa hace. Ningún código del árbol nombra la política, sólo comentarios.
5. **Los comentarios que explican Q-18 son CUATRO, no cinco.** El Step 6 de la Task 2 manda actualizar
   «los comentarios de los **cinco** archivos que hoy explican Q-18 como un pendiente abierto», y medido
   con `grep` antes de tocar nada sólo lo mencionan cuatro: `dialogo-nota.tsx`, `dialogo-falta.tsx`,
   `dialogo-estado-unidad.tsx` y `dialogo-agregar-unidad.tsx`. En `dialogo-estado-reserva.tsx` el aviso
   vive **suelto dentro de la cadena `ayuda`**, sin ningún comentario al lado que explique de dónde sale.
   Ahí el comentario se **crea**, y es el único de los cinco que gana líneas en vez de reescribirlas.
6. **El comentario de `dialogo-estado-unidad.tsx` no mentía: citaba fielmente una decisión revocada.**
   Decía que Q-18 estaba «aparcado a la T4 por D-41», y **D-41 dice exactamente eso** —verificado en
   `ESTADO_Y_PLAN.md:320`—. Lo que pasó es que **D-55 la revocó el 2026-08-13** —`ESTADO_Y_PLAN.md:334`:
   «Q-18 NO entra… pasa a una tanda propia»— y el comentario se quedó atrás. **El género importa y es
   nuevo:** no es una atribución inventada —el defecto que este proyecto persigue en los subagentes— sino
   una cita exacta a una decisión que dejó de valer. **No hay nada mal escrito que un revisor pudiera
   cazar leyendo el archivo**; sólo se ve cruzando el comentario con la tabla de decisiones.
7. **Error de quien dicta, y van 21.** El encargo del subagente predijo «cinco coincidencias» para
   `grep "leen el personal del mostrador"`, y dio **cuatro**: en `dialogo-nota.tsx` la frase quedó
   **partida en dos líneas de JSX** —«…La leen el / personal del mostrador…»— por el propio bloque que el
   encargo dictaba, así que un `grep` de línea única no podía verla. El texto estaba entero en el disco.
   **Lo cazó el subagente, no quien dictaba.** Es la misma lección que esta tanda ya tenía anotada —medir
   el archivo antes de describirlo en un encargo— cometida esta vez sobre un archivo **recién escrito por
   quien la escribió**.
8. **La salida del `build` trae TRES números y sólo uno es el de rutas.** Un filtro por el símbolo `ƒ`
   da **25**, porque se lleva por delante `ƒ Proxy (Middleware)` y la línea de leyenda
   `ƒ (Dynamic) server-rendered on demand`. El «Generating static pages» dice **(22/22)**. La tabla real
   tiene **23**. Es el mismo género que el `(20/20)` de la T3B, con un agravante: **esta vez el que contó
   de más fue un `node` escrito a propósito para no fiarse del `grep`**. Cambiar de herramienta no
   arregla un ancla mal elegida: hay que anclar a la tabla, no al símbolo.
9. **Los cinco textos nuevos usan dos pronombres distintos, y el quinto es el más flojo.** «La» donde el
   antecedente es «la nota» —`dialogo-nota`, `dialogo-falta`, `dialogo-agregar-unidad`— y «Lo» donde es
   «el motivo» —`dialogo-estado-unidad`—. En `dialogo-estado-reserva` el «lo» **no tiene antecedente
   explícito**: se apoya en la etiqueta del campo, «¿Qué pasó con el equipo?». Es el texto que el plan
   dicta literal, es internamente consistente —«Queda» tiene el mismo sujeto tácito— y se deja como está,
   pero queda anotado por si la revisión visual quiere afinarlo.
10. **La migración 26 comprueba `if not found` al leer `app_settings`, y el plan no lo pedía.** El Step 3
    escribía `select s.min_cancel_minutes into v_margen from public.app_settings s where s.id;` y seguía
    de largo. **Sin la comprobación, una fila de configuración ausente dejaría `v_margen` en `NULL`, la
    comparación daría `NULL`, y un `NULL` dentro de un `if` NO DISPARA:** la regla de M-12 se apagaría
    **en silencio** justo cuando la base está mal. Es el mismo género que «falta de política deja el
    `UPDATE` en cero filas sin error», que este proyecto ya persigue desde la Fase 1. **Lo decidió el
    patrón vecino, no el gusto:** las otras dos funciones que leen esa misma tabla —`create_reservation`
    y la de `duration_slot_multiple`— ya hacen exactamente esto, con este mismo mensaje, así que la
    migración se alinea con ellas y de paso pierde el `where s.id`, que ninguna de las dos usa.
11. **La Task 4 necesita una QUINTA RAMA en `mensajeDeRechazoAjustes()` y el plan no la pide.** Su Step 3
    sólo manda ampliar la firma y el `.update()` de `guardarAjustes()`. Sin la rama, el `check` nuevo
    —`app_settings_min_cancel_minutes_check`— cae al **mensaje CRUDO de Postgres**, y el admin lee en
    pantalla `new row for relation "app_settings" violates check constraint …`. El criterio que el propio
    archivo deja escrito es «texto propio SOLO para lo alcanzable», y **este rechazo ES alcanzable**: el
    botón que abre el diálogo es `type="button"`, así que la validación HTML5 del `min`/`max` **no se
    dispara** y el valor llega a la base. `limiteDiario` ya tenía texto propio con `min`/`max` en su input
    por el mismo motivo. **Verificado en el navegador, no deducido:** con 2000 en el campo, la pantalla
    muestra el texto traducido y no el del motor.
12. **Los comentarios que dicen «seis» son SIETE, y el plan manda corregir UNO.** Su Step 2 sólo señala
    «las seis columnas EDITABLES» de `lib/admin/configuracion.ts`. Medidos con `grep` antes de tocar nada,
    los otros seis son: `acciones.ts` «los seis ajustes globales» y «SOLO SEIS COLUMNAS EN EL BODY»; y
    `formulario-ajustes.tsx` «las seis columnas» de su cabecera, «los seis campos YA muestran», «Un solo
    punto para las seis» y «los seis campos nacen con los valores YA GUARDADOS». **Es el mismo género que
    la corrección 5** —un conteo del encargo que no aguanta el `grep`—, y esta vez el que contó corto no
    fue el plan sino el briefing de la sesión, que dijo «DOS comentarios dicen seis». **Van 22 errores de
    quien dicta.**
13. **Y hay DOS cifras más dentro del comentario del traductor, que ningún encargo mencionaba.** Dice
    «LOS CINCO SON `23514`» y «SOLO CUATRO llevan texto propio, y NO CINCO»: la rama nueva las vuelve
    **SEIS** y **CINCO**. Pero al ir a corregirlas apareció algo mejor: **ese comentario ya contaba corto
    ANTES de esta tanda.** `pg_constraint` devuelve **nueve** `check` sobre `app_settings` y el comentario
    enumeraba cinco; la migración 24 —D-55, Q-19— añadió `app_settings_apertura_alineada` en la T4 y nadie
    la anotó ahí. **No es un defecto de comportamiento** —`aperturaDesalineada()` la intercepta en el
    servidor antes de llegar a la base, exactamente el mismo criterio por el que `slot_divisor` tampoco
    lleva texto—, pero el comentario afirmaba una completitud que había dejado de tener. Se le añadieron
    las tres que faltaban con el motivo de cada una. **El género es el de la corrección 6:** nada mal
    escrito que un revisor cace leyendo el archivo, sólo se ve cruzándolo con lo que la base tiene hoy.
14. **La línea nueva de esa tabla de mediciones se MIDIÓ, no se dedujo.** El comentario afirma «MEDIDO POR
    PostgREST … con un JWT de ADMIN firmado a mano», así que añadirle una fila sin medirla habría sido
    justo la atribución inventada que este proyecto persigue en los subagentes. Se firmó el JWT contra el
    stack local y se hizo el PATCH: `1441` y `-1` dieron **HTTP 400 / 23514 /
    `app_settings_min_cancel_minutes_check`**. **Y con control positivo primero**, que es lo que hace que
    el 400 signifique algo: `90` dio **HTTP 200** con la fila de vuelta. Sin ese 200, un 400 no distingue
    «la restricción rechazó» de «el JWT no servía y nunca llegué a la tabla». **De paso probó el `grant
    update` de la columna nueva**, que es el modo de fallo que el Step 7 predice para el navegador.
    Además la fecha se separó: los cinco primeros rechazos son del 2026-08-13 y el sexto del 2026-08-15,
    porque meterlo bajo el encabezado viejo habría fechado mal una medición propia.
15. **El Step 7 se hizo con Playwright y no a ojo, y encontró más de lo que pedía.** El plan dice entrar,
    cambiar el margen, guardar y recargar. Se escribió un spec temporal —fuera del árbol al terminar— que
    hace eso y además comprueba que **el resumen del diálogo enumera el campo nuevo** y que **un valor
    fuera de rango da el texto traducido y no el del motor**. Las dos pruebas en verde. **Y con control
    negativo**, que es lo que las hace valer: un spec gemelo que afirmaba `46` donde se había guardado
    `45` **falló**, con `Expected "46" / Received "45"`. Un instrumento que no se ve reprobar no prueba
    nada cuando aprueba.
16. **El plan de la Task 5 se contradice consigo mismo, y el código que dicta tiene razón.** Su tabla de
    archivos dice que `seOfreceCancelar()` «gana el **cuarto término**» y el Step 3 manda «ampliar el
    comentario de cabecera que hoy explica los tres términos: el cuarto es M-12». **Pero el TypeScript que
    el propio Step 3 escribe no agrega ningún término: PARAMETRIZA el tercero.** `new Date(inicio) >
    limite` con `margenMinutos` en 0 **es** `new Date(inicio) > ahora`, o sea D-38 exacto, así que el
    término de M-12 subsume al de D-38 para todo margen `>= 0` y escribirlos separados evaluaría dos veces
    la misma comparación. Se siguió el código y no la prosa, y el comentario quedó diciendo lo que la
    función hace: **tres condiciones y cuatro decisiones**, porque la tercera carga con dos.
17. **Y la asimetría con el SQL es correcta, no una incoherencia entre capas.** La migración 26 **sí**
    tiene las dos comprobaciones separadas, y hace falta que las tenga: cada rama devuelve un **mensaje
    distinto**, y `31_cancel_before_start.sql:74` afirma el texto del primero con `throws_ilike`. La
    pantalla no devuelve ningún mensaje —sólo decide pintar o no pintar—, así que un solo término le
    alcanza. **El motivo por el que las capas difieren está medido y escrito en las dos**, para que nadie
    «unifique» ninguna de las dos en el futuro creyendo que arregla algo.
18. **Las cinco pruebas heredadas reciben `0` como quinto argumento, y no `60`.** El plan no dice cuál
    pasarles, sólo que «pasan un quinto argumento nuevo». **`0` es la única opción que conserva lo que
    cada una probaba:** con el margen en cero el límite es `ahora`, así que las cinco siguen afirmando lo
    mismo que antes de que la función tuviera margen. **Con `60` la prueba del borde —«inicio exactamente
    igual a ahora: no se ofrece»— seguiría en verde pero por M-12 en vez de por D-38**, y dejaría de
    probar lo que su propio nombre dice. Es el mismo género que ya persigue este proyecto: una prueba que
    pasa por el motivo equivocado no protege nada.
19. **Una TERCERA prueba nueva, que el plan no pide: el borde exacto del margen.** El plan pide dos y
    predice **154**; con esta son **155**. Hace falta por el mismo motivo por el que ya existe la del
    borde de D-38: la comparación es **estricta** y el motor rechaza con `v_start_at <= now() +
    make_interval(mins => v_margen)`, o sea que **también rechaza la igualdad**. Sin ella, cambiar el `>`
    por un `>=` dejaría la pantalla ofreciendo un botón en el único instante en que el motor lo rechaza,
    **con las otras siete pruebas en verde**.
20. **El Step 2 salió exactamente como se predijo por escrito, y eso es lo que lo hace valer: DOS fallos
    de 155, no tres.** Fallaron «inicio dentro del margen» y «borde del margen», las dos que pasan `60`;
    **la de margen `0` pasó incluso con la función vieja**, que es la demostración empírica de la
    corrección 18. Un test que falla *bien* no es lo mismo que un test que falla: si hubiera caído alguna
    de las cinco heredadas, o alguna de los otros diez archivos, no probaría la implementación. **Vitest
    no hace typecheck**, y por eso el quinto argumento se ignoró en silencio y las pruebas *corrieron* en
    vez de reventar por tipos —si hubieran reventado, las 155 habrían caído juntas y no se sabría cuáles
    dependían del margen.
21. **Un HECHO CADUCADO en `tarjeta-reserva.tsx`, del género de la corrección 6, y el plan no lo
    mencionaba.** Su comentario decía «**M-12 SIGUE PENDIENTE en su OTRA mitad**: cancelar un minuto ANTES
    de que empiece sigue sin ninguna restricción — M-12 pide una antelación mínima, y eso todavía no está
    resuelto». **Era cierto al escribirse y esta misma tarea lo vuelve falso.** El Step 7 sólo mandaba
    añadir un prop. Se corrigió dejando el rastro de lo que decía, no borrándolo. Y de paso su enumeración
    «bajo TRES condiciones» necesitaba la condición 3 reescrita entera.
22. **Y una afirmación de `consultas.ts` que NO se puede estirar, que es lo contrario de un conteo que se
    actualiza.** Su cabecera dice que local y producción «comparten los cinco valores de `app_settings`
    —7, 08:00, 22:00, 30, 30, **comprobados en los dos**—». Sumar ahí el sexto habría sido **falso**: la
    migración 26 está aplicada **sólo en local**, así que en producción la columna todavía no existe. Se
    añadió como **salvedad fechada** en vez de ampliar el número, y esa salvedad documenta justo el riesgo
    que la tanda deja vivo hasta que la rama se empuje. **Es el reverso exacto de la corrección 12:** allá
    había siete conteos que había que subir, acá hay uno que había que dejar quieto.
23. **Errores de quien dicta: van 24, y los dos nuevos los cazaron los subagentes, no quien dictaba.** El
    **23**: un control negativo pedía `grep "ahora))\|ahora)\.toBe"` sobre `agrupar.test.ts` afirmando que
    «tiene que dar CERO líneas», y el patrón **también matchea las nueve llamadas a `grupoDeReserva()`**
    del mismo archivo, que legítimamente tienen tres parámetros — ese comando no podía dar cero. El
    **24**: el bloque VIEJO de la sección 4.2 capturaba sólo la línea del `Promise.all` y **no el
    comentario de dos líneas encima**, que decía «las **dos** consultas son independientes»; aplicar la
    especificación tal cual dejaba dos comentarios contradictorios pegados uno al otro. **Los dos salieron
    de la misma pregunta de siempre**, y el segundo es el mismo género que la corrección 12: describir un
    archivo sin medir su vecindad. **Y uno más que no cuenta porque se cazó antes de mandarlo:** la
    especificación anunciaba «13 ediciones» cuando sus secciones sumaban **17 aplicaciones de Edit**.
24. **La verificación de punta a punta de M-12 se montó AL REVÉS, y por una restricción real.** Para ver
    el botón desaparecer haría falta una reserva que empiece dentro del margen, y **ninguna pantalla deja
    crearla** —ni el arnés escribe directo en la base, *D-62*—. Así que en vez de acercar la reserva se
    **agrandó el margen a 1440 desde `/admin/ajustes`**, con lo que la reserva de mañana cae dentro y el
    botón se va. **Eso ejercita la Task 4 y la Task 5 juntas**, que es el flujo real de M-12: el admin
    configura y el alumno lo sufre. **Y se comprobó en las DOS direcciones** —devolver el margen a 60 hace
    volver el botón—, que es lo único que descarta que hubiera desaparecido por otro motivo: una sesión
    perdida, la reserva movida de sección. Sin esa vuelta, la ausencia no probaría nada.

25. **Los Steps 4 y 5 no podían correr como estaban escritos, y por el mismo motivo los dos: el `seed.sql`
    no siembra ni notas ni reservas.** El Step 4 manda comparar dos llamadas —el alumno debe recibir `[]` y
    el operador **filas**— y tras un `db reset` la tabla está vacía, así que **las dos habrían dado `[]`**:
    justo el empate que el propio Step advierte que no prueba nada. Y el Step 5 manda mirar el historial en
    `/mostrador`, pero el diálogo que lo muestra **se abre desde una tarjeta de reserva** y la pantalla
    arranca vacía. Hubo que **sembrar primero**: una nota con el token del operador y una reserva con
    `create_reservation`. **Es la lección de la T2A otra vez** —el seed es una fixture de valores
    convenientes, no representativos— pero cometida sobre lo que el seed **no** trae, en vez de sobre lo
    que trae con otro valor.

26. **Sembrar por PostgREST con un token real NO es «escribir directo en la base», y esa distinción es la
    que salva el Step 4.** *D-62* dice que el arnés no escribe en la base, y de ahí salió el rodeo de la
    corrección 24. Pero la nota se creó con el `access_token` del operador contra `/rest/v1/`, que es **la
    superficie pública, con RLS decidiendo**: el mismo camino por el que el `INSERT` del alumno fue
    **rechazado con `42501`**. Un `psql` o una `service_role` sí habrían saltado la política; esto la
    ejercita. **Donde el arnés no llega, un token real sí, y sin perder el control.**

27. **Q-18 medido en la superficie real deja ver los DOS modos de fallo lado a lado, en la misma tabla.**
    La regla 3 del proyecto está escrita sobre el `UPDATE`; acá se ve en el `SELECT`. El alumno con sesión
    recibe `[]` y **HTTP 200** —le falta la *política*, y eso no lanza nada—; el anónimo recibe **`42501`
    `permission denied`** —le falta el *privilegio*, el `grant` que la migración 25 deliberadamente no
    tocó—. Mismo efecto práctico, distinto mecanismo. **Y el control que de verdad cierra el Step no es el
    del operador sino el del alumno leyendo `products`**: sin él, un token caducado daría el mismo `[]` que
    una política que funciona.

28. **UNA VIOLACIÓN DE CSP EN LOS DIÁLOGOS, y no la trae esta tanda sino el cruce de la T4 con todo lo
    anterior.** Radix inyecta una hoja `<style>` para bloquear el scroll del fondo al abrir un modal, y
    `style-src 'self' 'nonce-...'` *(D-56)* la rechaza. **Medido: tres diálogos, dos pantallas
    —`/mostrador` y `/admin/inventario/[id]`—, dos perfiles, y UN SOLO hash**,
    `sha256-kAApudxpTi9mfjlC9lC8ZaS9xFHU9/NLLbB173MU7SU=`, contado con `node` y no con `grep`. El efecto es
    que **el fondo scrollea con el modal abierto**; el `pointer-events: none` sí se aplica, porque es un
    atributo y no una hoja. **Las páginas cargan limpias** —el otro error de consola de la ficha es el 404
    de una imagen del seed—, y **ahí está el porqué de que la T4 no lo viera: midió pantallas, no
    interacciones.** Ningún comando lo delata: los cuatro pasan y el E2E da 6/6 **abriendo diálogos**.
    Queda como **Q-20** y no se toca *(decidido con Alejandro el 2026-08-15)*: la tanda es de SQL, y las
    dos curas conocidas son peores que la enfermedad —el hash casa hasta que Radix cambie un byte, y
    entonces el bloqueo vuelve **en silencio**; `'unsafe-inline'` desarma lo que D-56 construyó—.

29. **`.playwright-mcp/` está en `.gitignore` y NO en los ignorados de ESLint**, que es el género exacto de
    *D-68*. Hoy no hace daño porque sólo guarda `.yml`, `.log` y un `.stackdump`, y ESLint no los mira.
    **Queda dicho porque la próxima carpeta que Playwright invente puede traer `.js`**, y sería el
    2026-08-15 otra vez con sus 3031 problemas. **Se comprobó corriendo el `lint` DESPUÉS de crearla**, no
    razonando sobre las extensiones.

30. **Una trampa de instrumento nueva: parar la tarea no mata el proceso hijo.** El E2E falló con
    `http://127.0.0.1:3000 is already used` **después** de detener el servidor de producción, porque
    `next start` sobrevivió a la parada de la tarea que lo había lanzado. Con `reuseExistingServer: false`
    eso es un rojo instantáneo que **no dice absolutamente nada del código**. La cura medida: matar por
    puerto —`Get-NetTCPConnection -LocalPort 3000`— y **comprobar que responde `000` antes de relanzar**.
    Es de la familia de `cmd | tail`: el instrumento contesta sobre otra cosa que la que se le preguntó.

31. **Las cifras finales, medidas al cerrar la Task 6 y no citadas:** **26 migraciones**, **159 aserciones
    pgTAP en 27 archivos** tras un `db reset`, **155 pruebas Vitest en 11 archivos**, **23 rutas y 0
    estáticas** en el `build` —contadas en la tabla, porque el ancla `ƒ` **volvió a dar 25**— y **6 pruebas
    E2E en 4 specs**. `typecheck` y `lint` en cero, el `lint` **en dos pasadas**, antes y después del E2E.

---

## Restricciones globales

Valen para **todas** las tareas y no se repiten en cada una.

- **Claude no toca el remoto.** Nada de `git push`, PR, merges ni `supabase db push`. Los comandos de git
  se **entregan** para PowerShell 5.1: sin `&&`, sin `||`, sin here-strings, uno por bloque.
- **Mensajes de commit sin tildes.** Los **documentos** sí las llevan.
- **La interfaz tutea; los comentarios y los documentos vosean.**
- **Nada de estética.** Sí funcionalidad, visibilidad y textos.
- **`lib/database.types.ts` se regenera, nunca se edita a mano.**
- **`lib/admin/ajustes.ts` no puede importar nada** — lo carga un test y rompería. Su cabecera lo explica.
- **Cero `service_role` en la aplicación.** Si un flujo la necesitara, falta una política, no una clave.
- **La autorización vive en la base.** El proxy redirige, el layout es comodidad, el componente oculta.
- Los cuatro comandos de control son `npm run typecheck`, `npm run lint`, `npm test` y `npm run build`.
- **El código de salida se captura por redirección a archivo, nunca por tubería.** `cmd | tail` devuelve el
  código de `tail`. Los conteos con símbolos no ASCII se hacen con `node`, no con `grep`.

**Cifras de partida, medidas el 2026-08-15:** 24 migraciones · 150 aserciones pgTAP en 25 archivos ·
152 pruebas de Vitest en 11 archivos · `build` en 23 rutas y 0 estáticas · 6 pruebas E2E en 4 specs.

---

## Estructura de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `supabase/migrations/<ts>_unit_notes_staff_only.sql` | **Crear.** La política de lectura recortada | 1 |
| `supabase/tests/33_unit_notes_staff_only.sql` | **Crear.** Cuatro aserciones, con control positivo | 1 |
| Los cinco diálogos de §4.2 del diseño | **Modificar.** El aviso que deja de ser cierto | 2 |
| `supabase/migrations/<ts>_min_cancel_notice.sql` | **Crear.** Columna, `grant` y RPC | 3 |
| `supabase/tests/34_min_cancel_notice.sql` | **Crear.** Cinco aserciones | 3 |
| `lib/database.types.ts` | **Regenerar.** `app_settings` gana una columna | 3 |
| `lib/admin/configuracion.ts` | **Modificar.** El tipo, la fila cruda, la traducción y el `select` | 4 |
| `lib/admin/acciones.ts` | **Modificar.** `guardarAjustes()` manda la columna nueva | 4 |
| `components/admin/formulario-ajustes.tsx` | **Modificar.** Un campo numérico más | 4 |
| `lib/reservas/consultas.ts` | **Modificar.** `ajustesReserva()` trae el margen | 5 |
| `lib/reservas/agrupar.ts` | **Modificar.** `seOfreceCancelar()` gana el cuarto término | 5 |
| `lib/reservas/agrupar.test.ts` | **Modificar.** Dos pruebas más | 5 |
| `components/reservas/tarjeta-reserva.tsx` | **Modificar.** Pasa el margen | 5 |
| `app/(alumno)/mi-panel/page.tsx` | **Modificar.** Lee el ajuste y lo baja | 5 |

---

## Task 0 · El plan entra al repositorio

**Archivos:** `MIGRATION_DOCS/TANDA_5_DISENO.md` *(ya escrito)* · `MIGRATION_DOCS/PLANES/TANDA_5.md`

- [ ] **Step 1:** Crear la rama de la tanda desde `develop`.

```powershell
git checkout -b feature/tanda-5-sql develop
```

- [ ] **Step 2:** Comitear el diseño y el plan. **`pantallas.md` queda fuera a propósito**: no es de
      ninguna tanda. Nada de `git add .`.

```powershell
git add MIGRATION_DOCS/TANDA_5_DISENO.md MIGRATION_DOCS/PLANES/TANDA_5.md
```

```powershell
git commit -m "Tanda 5.0: diseno y plan" -m "Cierra Q-18 y M-12, los dos pendientes de SQL. Decisiones D-69 a D-72."
```

- [ ] **Step 3:** Confirmar que el árbol queda con **una sola** línea sin versionar, `?? pantallas.md`.

```powershell
git status --short
```

---

## Task 1 · Migración 25 — Q-18

**Archivos:**
- Crear: `supabase/migrations/<AAAAMMDDHHMMSS>_unit_notes_staff_only.sql`
- Crear: `supabase/tests/33_unit_notes_staff_only.sql`
- **No tocar:** `supabase/tests/16_traceability.sql` — queda como control de que escribir notas sigue
  funcionando.

**Interfaces:**
- Consume: `private.is_staff()`, de `20260805193357_private_helpers.sql:78`. Tiene `EXECUTE` concedido a
  `authenticated` en la línea 92 del mismo archivo, así que **se puede llamar desde una política**.
- Produce: la política `unit_notes_select_staff`. La Task 2 depende de que exista para que sus textos
  nuevos sean ciertos.

- [ ] **Step 1: Escribir el test primero, y verlo fallar.** Crear
      `supabase/tests/33_unit_notes_staff_only.sql`:

```sql
-- Q-18 / D-69: las notas de unidad las lee SOLO el personal.
--
-- Hasta la migracion 25 la politica era `for select to authenticated using
-- (true)`, sin recorte por rol ni por unidad. Medido el 2026-08-12 contra el
-- proyecto real: un JWT de alumno recibia HTTP 200 con la nota que describia la
-- falta de OTRO alumno.
--
-- LAS DOS PUNTAS EN LA MISMA CORRIDA, y no es ceremonia: el modo de fallo de
-- esta migracion es que la politica no deje leer a NADIE, y eso daria el mismo
-- cero que la politica correcta. Las aserciones 1 y 2 son el control positivo.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);


-- Fixture: una nota escrita por el operador sobre una unidad de la camara.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

insert into public.inventory_unit_notes (unit_id, note)
  values ('dddddddd-0000-0000-0000-000000000001',
          'Q-18: esta nota solo la lee el personal');

-- 1) El OPERADOR que la escribio la lee. CONTROL POSITIVO.
select is(
  (select count(*) from public.inventory_unit_notes
    where note = 'Q-18: esta nota solo la lee el personal'),
  1::bigint,
  'el operador SI lee la nota (control positivo)');

reset role;


-- 2) El ADMIN tambien: is_staff() cubre los dos roles, no solo al operador.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.inventory_unit_notes
    where note = 'Q-18: esta nota solo la lee el personal'),
  1::bigint,
  'el admin SI lee la nota (control positivo del otro rol de personal)');

reset role;


-- 3) El ALUMNO no la ve. CERO FILAS Y SIN ERROR: falta de politica no lanza
-- excepcion, deja el SELECT en cero. Por eso se comprueba el efecto con is() y
-- no con throws_ok().
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.inventory_unit_notes
    where note = 'Q-18: esta nota solo la lee el personal'),
  0::bigint,
  'el alumno NO lee la nota del mostrador (Q-18 cerrado)');

-- 4) Y no ve NINGUNA nota de la tabla, no solo la de la fixture. Sin esta, una
-- politica que filtrara por el texto de la nota pasaria la 3 sin cerrar Q-18.
select is(
  (select count(*) from public.inventory_unit_notes),
  0::bigint,
  'el alumno no ve ninguna nota de la tabla, no solo la de la fixture');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr el test y verlo FALLAR.** Sin la migración, las aserciones 3 y 4 fallan: hoy el
      alumno ve las notas. **Un test que pasa antes de escribir la migración no está probando la
      migración.**

```powershell
npx supabase test db
```

Esperado: **falla**, con las aserciones 3 y 4 en rojo y las 1 y 2 en verde.

- [ ] **Step 3: Escribir la migración.** Crear el archivo con la CLI para que el sello de tiempo sea
      correcto:

```powershell
npx supabase migration new unit_notes_staff_only
```

Y escribir dentro:

```sql
-- Q-18 / D-69: las notas de unidad las lee solo el personal.
--
-- La politica anterior era `for select to authenticated using (true)`
-- -20260805195549_traceability.sql:37-38-, sin recorte por rol ni por unidad.
--
-- ESTO ACOTA D-2, NO LO REVOCA. La trazabilidad sigue siendo legible; lo que
-- cambia es QUIEN la lee. Y el argumento que decide no es el costo: la lectura
-- amplia NO SOSTIENE NINGUNA PANTALLA. La unica consulta del arbol es
-- notasPorUnidad() -lib/mostrador/notas.ts:36-, y sus dos consumidores
-- -app/(personal)/mostrador/page.tsx:88 y
-- app/(personal)/admin/inventario/[id]/page.tsx:41- viven los dos bajo el
-- layout de personal.
--
-- EL NOMBRE CAMBIA A PROPOSITO. `unit_notes_select_auth` significaba
-- "cualquiera con sesion", y eso es justo lo que deja de ser cierto: un nombre
-- que afirma algo falso es peor que uno feo. Mismo criterio que D-65.
--
-- EL GRANT NO SE TOCA. `grant select on public.inventory_unit_notes to
-- authenticated` sigue igual: el privilegio decide que COLUMNAS y la politica
-- decide que FILAS. El personal tambien es `authenticated`, asi que revocar el
-- grant romperia justo a quien si debe leer.
--
-- Las otras dos politicas de la tabla -unit_notes_insert_staff y
-- unit_notes_delete_admin- ya estaban acotadas desde la Fase 1 y no se tocan.

drop policy if exists unit_notes_select_auth  on public.inventory_unit_notes;
drop policy if exists unit_notes_select_staff on public.inventory_unit_notes;

create policy unit_notes_select_staff on public.inventory_unit_notes
  for select to authenticated
  using ((select private.is_staff()));
```

- [ ] **Step 4: Aplicar y correr el test entero.**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

Esperado: **todo en verde**. La cuenta sube de 150 aserciones en 25 archivos a **154 en 26**.

- [ ] **Step 5: Verificar por el efecto y no por el registro**, que es lo que la T4 aprendió con Q-19. Que
      la migración figure aplicada no dice que la regla exista:

```powershell
npx supabase migration list
```

- [ ] **Step 6: Commit.**

```powershell
git add supabase/migrations supabase/tests/33_unit_notes_staff_only.sql
```

```powershell
git commit -m "Tanda 5.1: las notas de unidad las lee solo el personal" -m "Migracion 25. Cierra Q-18 (D-69). Acota D-2 sin revocarlo."
```

---

## Task 2 · Los cinco avisos que dejan de ser ciertos

**Archivos:** los cinco de §4.2 del diseño. **Ninguno es SQL y ninguno cambia comportamiento.**

**Interfaces:**
- Consume: la política `unit_notes_select_staff` de la Task 1. **Sin ella, estos textos nuevos serían
  falsos**, así que el orden importa.
- Produce: nada que otra tarea consuma.

> **El criterio, para las cinco:** se borra la frase que promete una lectura que ya no ocurre y se conserva
> la que sigue siendo cierta —que la nota queda en el historial del equipo, con fecha, y no se deshace—.
> Esa mitad es **trazabilidad**, no una advertencia de privacidad, y es la que hace que el operador piense
> antes de escribir.

- [ ] **Step 1:** `components/mostrador/dialogo-nota.tsx`. El texto actual es:

```
Queda en el historial del equipo, con la fecha. Cualquier persona con sesión puede leer
esta nota, así que no escribas datos personales de un alumno.
```

Pasa a:

```
Queda en el historial del equipo, con la fecha, y no se puede deshacer. La leen el personal
del mostrador y los administradores.
```

- [ ] **Step 2:** `components/admin/dialogo-estado-unidad.tsx`. El texto actual es:

```
El motivo queda en el historial del equipo, con la fecha. Cualquier persona con sesión
puede leerlo, así que no escribas datos personales de un alumno.
```

Pasa a:

```
El motivo queda en el historial del equipo, con la fecha, y no se puede deshacer. Lo leen el
personal del mostrador y los administradores.
```

- [ ] **Step 3:** `components/admin/dialogo-agregar-unidad.tsx`. El texto actual es:

```
Si la escribes, queda en el historial del equipo y cualquier persona con sesión puede
leerla.
```

Pasa a:

```
Si la escribes, queda en el historial del equipo y la leen el personal del mostrador y los
administradores.
```

- [ ] **Step 4:** `components/admin/dialogo-estado-reserva.tsx`. El texto actual es una cadena de
      TypeScript, no JSX:

```
"Obligatorio. Cualquier persona con sesión puede leer esta nota, así que no escribas datos personales del alumno."
```

Pasa a:

```
"Obligatorio. Queda en el historial del equipo y lo leen el personal del mostrador y los administradores."
```

- [ ] **Step 5:** `components/mostrador/dialogo-falta.tsx`. Es una plantilla con `${alumno}` dentro. El
      texto actual es:

```
`Esto bloquea a ${alumno} de forma permanente, y solo un administrador puede revertirlo. Describe abajo qué pasó con el equipo: la nota queda en el historial de la unidad, y cualquier persona con sesión puede leerla, así que no escribas datos personales de un alumno.`
```

Pasa a:

```
`Esto bloquea a ${alumno} de forma permanente, y solo un administrador puede revertirlo. Describe abajo qué pasó con el equipo: la nota queda en el historial de la unidad y la leen el personal del mostrador y los administradores.`
```

- [ ] **Step 6:** Actualizar los **comentarios** de los cinco archivos que hoy explican Q-18 como un
      pendiente abierto. **No se borran: se fechan.** Cada uno pasa a decir que Q-18 se cerró con la
      migración 25 *(D-69)* y por qué el aviso cambió. El de `dialogo-agregar-unidad.tsx` dice hoy «se
      guarda en la misma tabla que lee cualquiera con sesion (Q-18)», y esa frase **ya es falsa**.

- [ ] **Step 7:** Comprobar que no queda ninguna promesa vieja en pantalla. **Anclado a la forma que
      importa, no al texto**, y con el resultado a archivo para no perder el código de salida:

```powershell
Select-String -Path components\**\*.tsx -Pattern 'Cualquier persona con sesi|cualquier persona con sesi' | Select-Object Path, LineNumber, Line
```

Esperado: **cero coincidencias en texto de pantalla**. Si aparece alguna, mirar si es un comentario que
cita la frase vieja a propósito —eso es correcto y se deja—.

- [ ] **Step 8:** Los cuatro comandos de control.

```powershell
npm run typecheck
```

```powershell
npm run lint
```

```powershell
npm test
```

```powershell
npm run build
```

Esperado: los cuatro en verde, **152 pruebas en 11 archivos** y **23 rutas con 0 estáticas**. Ninguna
cifra se mueve: esta tarea sólo cambia textos.

- [ ] **Step 9: Commit.**

```powershell
git add components/mostrador/dialogo-nota.tsx components/mostrador/dialogo-falta.tsx components/admin/dialogo-estado-unidad.tsx components/admin/dialogo-estado-reserva.tsx components/admin/dialogo-agregar-unidad.tsx
```

```powershell
git commit -m "Tanda 5.2: los cinco avisos que Q-18 vuelve falsos" -m "El aviso de privacidad se va; la advertencia de trazabilidad se queda."
```

---

## Task 3 · Migración 26 — M-12

**Archivos:**
- Crear: `supabase/migrations/<AAAAMMDDHHMMSS>_min_cancel_notice.sql`
- Crear: `supabase/tests/34_min_cancel_notice.sql`
- Regenerar: `lib/database.types.ts`
- **No tocar:** `supabase/tests/31_cancel_before_start.sql` — **es el control de regresión de esta tarea.**

**Interfaces:**
- Consume: `public.cancel_reservation(uuid, text)`, tal como la dejó
  `20260812053243_cancel_before_start.sql`. Y `private.is_staff()`.
- Produce: la columna `app_settings.min_cancel_minutes` (`smallint not null default 60`). Las Tasks 4 y 5
  la leen; **la Task 4 depende además del `grant update` sobre ella**.

> **La razón de las dos ramas, y es lo que hace que esta tarea no rompa nada.**
> `31_cancel_before_start.sql:74` afirma el mensaje de D-38 con `throws_ilike(..., '%ya empezo%')`.
> Ampliar la comparación existente cambiaría ese texto y rompería un test que hoy pasa. Con dos ramas,
> **D-38 conserva su mensaje exacto** y M-12 estrena el suyo. Y hay un segundo motivo, de producto:
> «ya empezó» y «faltan menos de X minutos» son cosas distintas para quien las lee. **Cuando varias reglas
> rechazan la misma entrada, contesta la más fundamental.**

- [ ] **Step 1: Escribir el test primero.** Crear `supabase/tests/34_min_cancel_notice.sql`:

```sql
-- M-12 / D-70, D-71: margen minimo para cancelar ANTES de que empiece.
--
-- D-38 (migracion 23) cerro la mitad de M-12: no se cancela una reserva que YA
-- EMPEZO. Esta es la otra mitad.
--
-- Las reservas se insertan DIRECTAS, como postgres y antes de cualquier
-- "set local role", por el mismo motivo que 31_cancel_before_start.sql:
-- create_reservation tiene sus propias reglas de horario y de cupo, y aca lo
-- que se prueba es la RPC de CANCELAR.
--
-- TRES UNIDADES DISTINTAS de la camara -hay tres en el seed- para que el
-- EXCLUDE anti-solape sea indiferente a que las tres reservas se pisen en el
-- tiempo. El cupo diario por producto no interviene: lo aplica
-- create_reservation, no un CHECK de la tabla.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(5);

update public.app_settings set min_cancel_minutes = 60 where id;

create temporary table fx as
select a.id            as alumno_a,
       now() + interval '30 minutes' as t_dentro,
       now() + interval '3 hours'    as t_fuera
  from public.alumnos a
 where a.auth_user_id = 'a0000000-0000-0000-0000-000000000001';


-- R1: empieza en 30 min, o sea DENTRO del margen de 60. Aserciones 1, 2 y 5.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '34343434-0000-0000-0000-000000000001',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000001',
       alumno_a, 'dentro del margen, la cancelacion se rechaza', t_dentro, t_dentro + interval '2 hours'
  from fx;

-- R2: empieza en 3 h, o sea FUERA del margen. Asercion 3, el control positivo.
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '34343434-0000-0000-0000-000000000002',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000002',
       alumno_a, 'fuera del margen, se cancela normal', t_fuera, t_fuera + interval '2 hours'
  from fx;

-- R3: dentro del margen, para que la cancele el PERSONAL. Asercion 4 (D-71).
insert into public.inventory_reservations
  (id, product_id, unit_id, alumno_id, purpose, start_at, end_at)
select '34343434-0000-0000-0000-000000000003',
       'bbbbbbbb-0000-0000-0000-000000000001',
       'dddddddd-0000-0000-0000-000000000003',
       alumno_a, 'dentro del margen, la cancela el personal', t_dentro, t_dentro + interval '2 hours'
  from fx;


-- 1) El alumno NO cancela dentro del margen.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select throws_ilike(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000001', 'me arrepenti')$$,
  '%60 minutos antes%',
  'el alumno no cancela una reserva que empieza dentro del margen (M-12)');

-- 2) Y la fila NO se movio. El rechazo tiene que dejarla en reserved: falta de
-- politica deja un UPDATE en cero filas SIN error, asi que se comprueba el
-- efecto y no solo la excepcion.
select is(
  (select status::text from public.inventory_reservations
    where id = '34343434-0000-0000-0000-000000000001'),
  'reserved',
  'la reserva rechazada por el margen sigue en reserved');

-- 3) CONTROL POSITIVO: fuera del margen se cancela igual que siempre. Sin
-- esta, una regla rota que rechazara TODA cancelacion pasaria la 1 y la 2.
select lives_ok(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000002', 'ya no lo necesito')$$,
  'fuera del margen el alumno cancela normal (control positivo)');

reset role;


-- 4) El PERSONAL si cancela dentro del margen: D-71, misma exencion que D-38.
set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000003', 'aviso por telefono')$$,
  'el personal si cancela dentro del margen (D-71)');

reset role;


-- 5) Con el margen en CERO la regla se apaga, y R1 vuelve a ser cancelable.
-- Es lo que compra el `check (... between 0 and 1440)`: desactivar la regla sin
-- otra migracion. R1 empieza en 30 min, o sea todavia NO ha empezado, asi que
-- D-38 tampoco la bloquea.
update public.app_settings set min_cancel_minutes = 0 where id;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

select lives_ok(
  $$select public.cancel_reservation('34343434-0000-0000-0000-000000000001', 'con el margen apagado si')$$,
  'con min_cancel_minutes en 0 la regla se apaga y la reserva se cancela');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y verlo FALLAR.**

```powershell
npx supabase test db
```

Esperado: **falla en el `update` de la primera línea** —la columna no existe todavía—, que es la forma
correcta de fallar antes de escribir la migración.

- [ ] **Step 3: Escribir la migración.**

```powershell
npx supabase migration new min_cancel_notice
```

Y escribir dentro:

```sql
-- M-12 / D-70, D-71: margen minimo para cancelar antes de empezar.
--
-- D-38 -migracion 23, 20260812053243_cancel_before_start.sql- cerro la mitad de
-- M-12: no se cancela una reserva que YA EMPEZO. Esta es la otra mitad.
--
-- POR QUE UNA COLUMNA Y NO UNA CONSTANTE -D-70-: el numero correcto se elige
-- viendo como cancela la gente de verdad, y con una constante cambiarlo exige
-- otra migracion. Se descarto tambien "por producto", como buffer_minutes: no
-- hay ninguna señal de que el margen deba variar por equipo, y D-39 ya resolvio
-- un caso igual eligiendo no tocar SQL.
--
-- EL CERO ES DELIBERADO y no un descuido del rango: deja APAGAR la regla sin
-- otra migracion. Con el margen en 0 la segunda comprobacion de abajo se vuelve
-- `v_start_at <= now()`, que es exactamente D-38, asi que nunca dispara por su
-- cuenta.

alter table public.app_settings
  add column min_cancel_minutes smallint not null default 60
    check (min_cancel_minutes between 0 and 1440);

-- EL GRANT ENUMERA LAS COLUMNAS POR NOMBRE -ver 20260806002459_reservation_settings.sql:67-,
-- asi que una columna nueva NO queda cubierta sola. Sin esta linea,
-- guardarAjustes() -lib/admin/acciones.ts- responde HTTP 403 con 42501 al
-- mandarla, y NINGUNA herramienta local lo ve antes: typecheck, lint y build
-- pasan, porque un privilegio no esta en el tipo.
grant update (min_cancel_minutes) on public.app_settings to authenticated;

-- La politica app_settings_update_admin NO se toca: no enumera columnas y su
-- USING ya exige admin.

-- CREATE OR REPLACE conserva los privilegios de la funcion: sin drop delante,
-- como ya midio 20260806171347_duration_slot_multiple.sql. El revoke a public y
-- anon sigue en pie y no se repite aqui.

create or replace function public.cancel_reservation(
  p_reservation_id uuid,
  p_reason         text
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_owner     uuid;
  v_status    public.reservation_status;
  v_start_at  timestamptz;
  v_alumno_id uuid;
  v_margen    integer;
begin
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'La cancelacion exige un motivo' using errcode = 'check_violation';
  end if;

  select r.alumno_id, r.status, r.start_at into v_owner, v_status, v_start_at
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

  -- Q-17 / D-38: solo para el alumno. El personal cancela una reserva ya
  -- empezada por esta misma RPC o por UPDATE directo; las dos puertas quedan
  -- iguales de permisivas para el.
  --
  -- VA PRIMERO Y CON SU MENSAJE ORIGINAL, y las dos cosas importan. Cuando
  -- varias reglas rechazan la misma entrada, contesta la mas fundamental: "ya
  -- empezo" es mas fundamental que "faltan menos de X minutos", y ademas son
  -- dos cosas distintas para quien las lee. Y el texto exacto lo AFIRMA
  -- 31_cancel_before_start.sql:74 con throws_ilike '%ya empezo%'.
  if not private.is_staff() and v_start_at <= now() then
    raise exception 'No puedes cancelar una reserva que ya empezo' using errcode = 'check_violation';
  end if;

  -- M-12 / D-70, D-71: y si todavia no empezo, tiene que faltar al menos el
  -- margen configurado. Misma exencion para el personal, por el mismo motivo
  -- que la comprobacion de arriba.
  select s.min_cancel_minutes into v_margen from public.app_settings s where s.id;

  if not private.is_staff()
     and v_start_at <= now() + make_interval(mins => v_margen) then
    raise exception 'Solo puedes cancelar hasta % minutos antes de que empiece la reserva', v_margen
      using errcode = 'check_violation';
  end if;

  update public.inventory_reservations
     set status = 'cancelled',
         cancellation_reason = p_reason
   where id = p_reservation_id;
end $$;
```

- [ ] **Step 4: Aplicar y correr los tests.**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

Esperado: **todo en verde**, incluido `31_cancel_before_start.sql` **sin haberlo tocado** — ese es el
control de regresión. La cuenta sube de 154 aserciones en 26 archivos a **159 en 27**.

- [ ] **Step 5: Regenerar los tipos.** Nunca a mano. El CI los compara con `diff -u`, así que un tipo
      editado a mano rompe `db.yml`.

```powershell
npx supabase gen types typescript --local > lib/database.types.ts
```

- [ ] **Step 6:** Comprobar que el tipo trae la columna nueva:

```powershell
Select-String -Path lib\database.types.ts -Pattern 'min_cancel_minutes' | Measure-Object -Line
```

Esperado: **más de cero**. `app_settings` aparece en `Row`, `Insert` y `Update`, así que se esperan varias.

- [ ] **Step 7:** `npm run typecheck`. Esperado: verde. La columna es nueva y nadie la usa todavía, así que
      añadirla al tipo no puede romper nada.

- [ ] **Step 8: Commit.**

```powershell
git add supabase/migrations supabase/tests/34_min_cancel_notice.sql lib/database.types.ts
```

```powershell
git commit -m "Tanda 5.3: margen minimo de cancelacion" -m "Migracion 26. Cierra la mitad que faltaba de M-12 (D-70, D-71)."
```

---

## Task 4 · El margen llega a `/admin/ajustes`

**Archivos:**
- Modificar: `lib/admin/configuracion.ts` — `AjustesAdmin`, `FilaAjustesCruda`, `filaAAjustes()`, `leerAjustes()`
- Modificar: `lib/admin/acciones.ts` — `guardarAjustes()`
- Modificar: `components/admin/formulario-ajustes.tsx`

**Interfaces:**
- Consume: `app_settings.min_cancel_minutes` y su `grant update`, de la Task 3.
- Produce: `AjustesAdmin.margenCancelacion: number`. **Nadie fuera de esta tarea lo consume** — el lado del
  alumno tiene su propio lector, `ajustesReserva()`, y es la Task 5.

- [ ] **Step 1:** En `lib/admin/configuracion.ts`, añadir el campo a los **tres** sitios que hoy enumeran
      las seis columnas, y a ninguno más:

```typescript
export type AjustesAdmin = {
  ventanaDias: number; // `booking_window_days`
  apertura: string; // `opening_time`, "HH:MM:SS" tal cual llega
  cierre: string; // `closing_time`, "HH:MM:SS" tal cual llega
  slotMinutos: number; // `slot_minutes`
  duracionMinima: number; // `min_duration_minutes`
  limiteDiario: number; // `daily_limit_per_product`
  margenCancelacion: number; // `min_cancel_minutes`, M-12
};
```

```typescript
type FilaAjustesCruda = {
  booking_window_days: number;
  opening_time: string;
  closing_time: string;
  slot_minutes: number;
  min_duration_minutes: number;
  daily_limit_per_product: number;
  min_cancel_minutes: number;
};
```

```typescript
function filaAAjustes(fila: FilaAjustesCruda): AjustesAdmin {
  return {
    ventanaDias: fila.booking_window_days,
    apertura: fila.opening_time,
    cierre: fila.closing_time,
    slotMinutos: fila.slot_minutes,
    duracionMinima: fila.min_duration_minutes,
    limiteDiario: fila.daily_limit_per_product,
    margenCancelacion: fila.min_cancel_minutes,
  };
}
```

- [ ] **Step 2:** En la misma función `leerAjustes()`, añadir la columna al `select`. **Es una cadena, no
      un tipo: TypeScript no avisa si falta**, y la fila llegaría sin el campo.

```typescript
    .select(
      'booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes, daily_limit_per_product, min_cancel_minutes',
    )
```

Y corregir el comentario de arriba, que dice «las seis columnas EDITABLES»: ahora son **siete**.

- [ ] **Step 3:** En `lib/admin/acciones.ts`, `guardarAjustes()` acepta y manda el campo nuevo:

```typescript
export async function guardarAjustes(ajustes: {
  ventanaDias: number;
  apertura: string;
  cierre: string;
  slotMinutos: number;
  duracionMinima: number;
  limiteDiario: number;
  margenCancelacion: number;
}): Promise<ResultadoAdmin> {
```

y dentro del `.update({...})`:

```typescript
      min_cancel_minutes: ajustes.margenCancelacion,
```

- [ ] **Step 4:** En `components/admin/formulario-ajustes.tsx`, un estado más junto a los otros seis:

```typescript
  const [margenCancelacion, setMargenCancelacion] = useState(String(ajustes.margenCancelacion));
```

un `useId()` más para la etiqueta, el campo mandado en la llamada a `guardarAjustes()`:

```typescript
        margenCancelacion: Number(margenCancelacion),
```

y el campo, con el **mismo patrón exacto** que «Límite diario por producto», que está justo al lado:

```tsx
          <div>
            <Label htmlFor={idMargen}>Antelación mínima para cancelar (minutos)</Label>
            <Input
              id={idMargen}
              type="number"
              min={0}
              max={1440}
              required
              value={margenCancelacion}
              onChange={(e) => editar(setMargenCancelacion, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Cuánto antes de empezar deja de poder cancelarse una reserva. Entre 0 y 1440 minutos; con 0
              se puede cancelar hasta el momento de empezar.
            </p>
          </div>
```

- [ ] **Step 5:** Si el formulario tiene un bloque de confirmación que resume los valores —lo tiene, con
      «Duración mínima: …» y «Límite diario por producto: …»—, **añadir ahí la línea del margen**. Un
      resumen que omite un campo que sí se guarda es peor que no tener resumen.

- [ ] **Step 6:** Los cuatro comandos de control.

```powershell
npm run typecheck
```

```powershell
npm run lint
```

```powershell
npm test
```

```powershell
npm run build
```

Esperado: verde los cuatro, **152 pruebas en 11 archivos**, **23 rutas y 0 estáticas**.

- [ ] **Step 7: Probarlo en el navegador, que es lo único que ha encontrado los fallos de esta fase.**
      Entrar como admin, abrir `/admin/ajustes`, cambiar el margen y **guardarlo**. Volver a cargar la
      página y comprobar que el valor persistió.

> **Si falla con «No se pudo guardar. Puede que no tengas permiso para hacerlo.», el `grant update` de la
> Task 3 no entró.** Es el modo de fallo que la migración predice en su comentario, y llega como cero filas
> sin excepción.

- [ ] **Step 8: Commit.**

```powershell
git add lib/admin/configuracion.ts lib/admin/acciones.ts components/admin/formulario-ajustes.tsx
```

```powershell
git commit -m "Tanda 5.4: el margen de cancelacion se configura desde admin" -m "Septima columna editable de app_settings."
```

---

## Task 5 · El margen llega a la pantalla del alumno

**Archivos:**
- Modificar: `lib/reservas/consultas.ts` — `AjustesReserva` y `ajustesReserva()`
- Modificar: `lib/reservas/agrupar.ts` — `seOfreceCancelar()`
- Modificar: `lib/reservas/agrupar.test.ts`
- Modificar: `components/reservas/tarjeta-reserva.tsx`
- Modificar: `app/(alumno)/mi-panel/page.tsx`

**Interfaces:**
- Consume: `app_settings.min_cancel_minutes` de la Task 3.
- Produce: `seOfreceCancelar(estado, grupo, inicio, ahora, margenMinutos)` — **cinco** parámetros. El
  quinto es nuevo y obligatorio.

> **Por qué esta tarea no es opcional.** La base ya rechaza la cancelación tardía después de la Task 3. Sin
> esta tarea el alumno **ve el botón, lo pulsa y recibe un error** — un botón que no funciona. La regla del
> proyecto dice que el componente oculta por comodidad y quien decide es la base; comodidad no significa
> prescindible.

- [ ] **Step 1: Escribir las pruebas primero.** En `lib/reservas/agrupar.test.ts`, dentro del `describe`
      de `seOfreceCancelar` que ya existe, **dos** pruebas más. Las cinco que ya están **pasan un quinto
      argumento nuevo**, así que hay que actualizarlas también.

```typescript
  it('reserved, proxima, inicio dentro del margen: no se ofrece (M-12)', () => {
    const ahora = new Date('2026-08-15T12:00:00Z');
    const inicioDentroDelMargen = new Date('2026-08-15T12:30:00Z').toISOString();
    expect(seOfreceCancelar('reserved', 'proxima', inicioDentroDelMargen, ahora, 60)).toBe(false);
  });

  it('reserved, proxima, margen en cero: se ofrece hasta el momento de empezar', () => {
    const ahora = new Date('2026-08-15T12:00:00Z');
    const inicioEnUnMinuto = new Date('2026-08-15T12:01:00Z').toISOString();
    expect(seOfreceCancelar('reserved', 'proxima', inicioEnUnMinuto, ahora, 0)).toBe(true);
  });
```

- [ ] **Step 2: Correrlas y verlas FALLAR.**

```powershell
npm test
```

Esperado: **falla**, porque `seOfreceCancelar()` todavía toma cuatro parámetros. `typecheck` también lo
dirá.

- [ ] **Step 3: Implementar.** En `lib/reservas/agrupar.ts`:

```typescript
export function seOfreceCancelar(
  estado: EstadoReserva,
  grupo: Grupo,
  inicio: string,
  ahora: Date,
  margenMinutos: number,
): boolean {
  const limite = new Date(ahora.getTime() + margenMinutos * 60_000);
  return estado === 'reserved' && grupo === 'proxima' && new Date(inicio) > limite;
}
```

Y ampliar el comentario de cabecera que hoy explica los tres términos: el cuarto es **M-12**, y el margen
**llega por parámetro y no se lee de una constante** — el número vive en `app_settings` y su única fuente
es la base, igual que del lado del SQL. Dos fuentes para el mismo número serían dos reglas.

- [ ] **Step 4:** `npm test`. Esperado: verde, y **154 pruebas en 11 archivos** —las 152 más las dos
      nuevas—.

- [ ] **Step 5:** En `lib/reservas/consultas.ts`, los **tres** sitios. Nombre en inglés, que es la
      convención de este archivo *(corrección 3)*:

```typescript
export type AjustesReserva = {
  bookingWindowDays: number;
  openingTime: string;
  closingTime: string;
  slotMinutes: number;
  minDurationMinutes: number;
  minCancelMinutes: number;
};
```

El `select` de `ajustesReserva()`:

```typescript
    .select('booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes, min_cancel_minutes')
```

y la traducción del `return`:

```typescript
    minCancelMinutes: data.min_cancel_minutes,
```

**El `select` es una cadena y TypeScript no avisa si falta la columna**: la fila llegaría sin el campo y
el margen sería `undefined`, que en la aritmética de la Task 3 da `NaN` y haría que el botón no se
ofreciera nunca. Es el mismo riesgo que la Task 4, y por eso se comprueba en pantalla y no sólo con
`typecheck`.

- [ ] **Step 6:** En `app/(alumno)/mi-panel/page.tsx`, leer los ajustes junto a las reservas y bajar el
      margen a cada `<TarjetaReserva>`:

```tsx
  const ajustes = await ajustesReserva();
```

y en las **tres** llamadas —líneas 125, 136 y 147, una por grupo—:

```tsx
<TarjetaReserva key={reserva.id} reserva={reserva} grupo="proxima" ahora={ahora} margenCancelacion={ajustes.minCancelMinutes} />
```

**Las tres, no sólo la de `proxima`.** Hoy el botón sólo aparece en ese grupo, pero el prop es obligatorio
y `typecheck` rechazaría las otras dos; y hacerlo opcional escondería justo el error que protege.

La página ya calcula `ahora` **una sola vez** —línea 46— por el fallo M-7 que su propio comentario explica.
**El margen sigue el mismo criterio: se lee una vez y se pasa**, nunca dentro de la tarjeta.

- [ ] **Step 7:** En `components/reservas/tarjeta-reserva.tsx`, un prop más en `TarjetaReservaProps`:

```typescript
  // El margen minimo de cancelacion (M-12), en minutos. Llega YA LEIDO desde
  // la pagina, igual que `grupo` y `ahora` y por el mismo motivo: una sola
  // fuente por decision. Su valor real vive en app_settings.min_cancel_minutes
  // y quien DECIDE es cancel_reservation; esta tarjeta solo oculta el boton
  // para no ofrecer algo que la base va a rechazar.
  margenCancelacion: number;
```

y pasarlo en la llamada de la línea 188.

- [ ] **Step 8:** Los cuatro comandos de control.

```powershell
npm run typecheck
```

```powershell
npm run lint
```

```powershell
npm test
```

```powershell
npm run build
```

Esperado: verde los cuatro, **154 pruebas en 11 archivos**, **23 rutas y 0 estáticas**.

- [ ] **Step 9: Commit.**

```powershell
git add lib/reservas/consultas.ts lib/reservas/agrupar.ts lib/reservas/agrupar.test.ts components/reservas/tarjeta-reserva.tsx "app/(alumno)/mi-panel/page.tsx"
```

```powershell
git commit -m "Tanda 5.5: la pantalla del alumno respeta el margen" -m "seOfreceCancelar gana el cuarto termino. M-12 cerrado en las dos puertas."
```

---

## Task 6 · Verificación de punta a punta

**Archivos:** ninguno, salvo que aparezca un defecto. **Si aparece, el arreglo va con número de decisión**,
como D-67 y D-68 en la T4.

> **Una tarea de verificación que no encuentra nada es sospechosa.** Los dos defectos de la Task 8 de la T4
> aparecieron por **correr** las cosas, no por leerlas, en una tarea cuyo plan decía que no escribía código.

- [ ] **Step 1: Base limpia y suite entera.**

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

Esperado: **159 aserciones en 27 archivos**, todas en verde.

- [ ] **Step 2: Los cuatro comandos, DOS veces —antes y después del E2E.** No es burocracia: en la T4 el
      `lint` salió limpio antes del E2E y con 3031 problemas después, porque el propio E2E generaba la
      carpeta que ESLint no ignoraba. **La diferencia entre las dos pasadas es la tarea misma.**

- [ ] **Step 3: El E2E.** Capturando el código de salida **por archivo**, nunca por tubería:

```powershell
npm run test:e2e > e2e-salida.txt 2>&1; Write-Output "EXIT = $LASTEXITCODE"
```

Esperado: **6 de 6 en verde, sin tocar ningún spec.** `e2e/cancelar.spec.ts:12` usa `reservarParaManana()`,
así que su reserva está muy por encima de cualquier margen de 60 minutos. **Si alguna se cae, el margen se
está aplicando donde no debe** — no se ajusta el test, se investiga la regla.

- [ ] **Step 4: Q-18 medido por PostgREST, no por la pantalla.** El agujero se midió el 2026-08-12 con un
      JWT de alumno contra la API, así que se cierra midiendo **lo mismo**. La suite pgTAP de la Task 1 ya
      lo prueba dentro del motor; esto es la otra superficie, la que un alumno puede alcanzar de verdad.

Los dos tokens salen de una sesión real: entrar en el navegador con cada perfil y copiar el
`access_token` de la cookie de sesión. Después, **las dos puntas**:

```powershell
$anon = ((npx supabase status -o env | Select-String '^ANON_KEY=').ToString() -split '=',2)[1].Trim('"')
```

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:54321/rest/v1/inventory_unit_notes?select=id,note&limit=5' -Headers @{ apikey = $anon; Authorization = "Bearer $tokenAlumno" }
```

Esperado: **arreglo vacío**, sin error. Falta de política deja el `SELECT` en cero filas y no lanza nada.

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:54321/rest/v1/inventory_unit_notes?select=id,note&limit=5' -Headers @{ apikey = $anon; Authorization = "Bearer $tokenOperador" }
```

Esperado: **filas**. **Sin esta segunda llamada el cero de arriba no prueba nada** — una política rota que
no dejara leer a nadie daría exactamente el mismo arreglo vacío.

- [ ] **Step 5: Las dos pantallas que leen notas, en un navegador de verdad.**
      `/mostrador` y `/admin/inventario/<id>` **siguen mostrando el historial**. Esto es lo que D-55 llamaba
      «reverificar la T3A» y en realidad cubre la T3A **y la T3B**.

- [ ] **Step 6: M-12 en pantalla, con las dos puntas.** Con el margen en 60: una reserva que empieza dentro
      de la hora **no ofrece** el botón de cancelar; una que empieza después **sí**. La segunda mitad no es
      opcional: sin ella, un botón que nunca aparece daría el mismo resultado.

- [ ] **Step 7:** Anotar en la cabecera de correcciones de este archivo **todo** lo que la ejecución haya
      desmentido, y las cifras finales medidas —no citadas—.

- [ ] **Step 8: Commit** de lo que haya salido, si salió algo.

---

## Task 7 · Cierre y documentación

**Archivos:** `MIGRATION_DOCS/ESTADO_Y_PLAN.md` · `MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md` ·
`CLAUDE.md` · este plan.

> **Antes de corregir una celda caducada, mirar qué describe la tabla entera.** En la T4, dos filas de
> advisors caducadas resultaron vivir en el cuadro de cierre de la Fase 1, junto a otras dos igual de
> caducadas. Corregir sólo dos lo habría dejado mitad histórico y mitad actual.

- [ ] **Step 1:** En `ESTADO_Y_PLAN.md`, añadir **D-69 a D-72** a la tabla de decisiones. **No leer la
      lista de este plan: leer la última fila de la tabla real.** El Step equivalente se midió corto
      **cuatro veces** en la T4.

- [ ] **Step 2:** Cerrar **Q-18** conservando entero su enunciado, con la fecha y la migración que lo
      cierra. **Y anotar la corrección a D-55:** decía «reverificar la T3A entera» y son T3A y T3B.

- [ ] **Step 3:** En `ESPECIFICACION_FUNCIONAL.md`, la fila de **M-12** pasa de «Hecha a medias» a hecha,
      citando **D-38** para la primera mitad y **D-70/D-71** para la segunda. Revisar además la frase de
      debajo de la tabla, que hoy dice que M-10 es «la única que sigue esperando criterio» — **eso sigue
      siendo cierto** y no se toca.

- [ ] **Step 4:** Las filas de F5 y F6 de la especificación, si describen quién lee las notas.

- [ ] **Step 5:** En `CLAUDE.md`, actualizar el recuento de migraciones y aserciones, y **corregir fechada,
      por quinta vez, la frase «desde aquí ninguna tanda vuelve a tocar SQL»**. No se borra: lo que registra
      es una intención, y los cinco desmentidos traían el costo dicho por delante.

- [ ] **Step 6:** Bitácora, con una fila por tarea.

- [ ] **Step 7:** **Cerrar las ediciones de documentación antes de pasar los comandos de git**, nunca
      después: si no, quedan cambios sin versionar que bloquean el siguiente `checkout`.

- [ ] **Step 8: Commit** y entrega de los comandos de push y PR **para que los corra Alejandro**.

---

## Lo que esta tanda NO hace

| Pendiente | Por qué queda fuera |
|---|---|
| El despliegue | No es SQL, y arrastra decisiones sin tomar. Es lo siguiente *(D-72)* |
| Las dos imágenes de prueba de Cloudinary | La aplicación no puede borrarlas: su firma es sólo de subida *(F7)* |
| Los datos de demostración de producción | 59 notas, 8 reservas y 5 alumnos, contados el 2026-08-15 |
| **Q-2** corte dominical · **Q-4** notificaciones (M-10) | Piden criterio de producto, no trabajo |
| **Q-5** protección de ramas · **Q-6** rotar la credencial de Cloudinary | Higiene, ninguno urgente |
| El `ANALYZE` de la condición de Q-13 | Su enunciado lo ata al despliegue, no a esta tanda |
