# Fase 2 · Tanda 4 — El endurecimiento · Plan de implementación

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

> Esta sección nace vacía y se llena **durante** la ejecución, no al final. Lo que la ejecución desmienta
> se anota acá con su fecha; el plan de abajo **no se reescribe**. Van 145 correcciones en la T3B, 127 en
> la T3A y 57 en la T2B, y ninguna se perdió por haber corregido el original en silencio.

### Estado de la ejecución *(al 2026-08-13)*

| Task | Estado |
|---|---|
| **0 · La deuda documental** | ✅ **Cerrada el 2026-08-13.** Los seis Steps. `.gitignore` verificado **por su efecto y con contraejemplo** —`.env.local.apagado` pasa a ignorado, `.env.example` sigue versionable—. **Las doce mejoras verificadas una por una abriendo el código**, no por `grep`: **diez hechas**. `ESPECIFICACION_FUNCIONAL.md` con la columna «Estado» nueva y el enunciado original intacto, `PLANES/README.md` de dos filas a siete, y **una cifra caducada de `CLAUDE.md`** que el plan no preveía. **Nueve correcciones**, y **el error 22 de quien dicta** |
| **1 · Migración 24: Q-19** | ✅ **Cerrada el 2026-08-13.** Los siete Steps. **PV-1 y PV-2 resueltos midiendo**: la expresión es inmutable, y producción abre a las 08:00 con bloques de 30, así que la migración no fallará en el `db push`. La base pasa de 23 migraciones y 147 aserciones en 24 archivos a **24 migraciones y 150 aserciones en 25 archivos**, exacto contra la predicción escrita. **Once correcciones**, el **error 23 de quien dicta** y el **décimo instrumento que miente** |
| **2 · Las cabeceras de seguridad** | ✅ **Cerrada el 2026-08-13, los siete Steps.** CSP con nonce por petición, más `X-Frame-Options`, `X-Content-Type-Options` y HSTS solo en producción. **El `build` pasa de 3 estáticas a 0**, con las 23 rutas intactas. **Los cinco puntos de verificación resueltos midiendo**, PV-5 incluido —y su predicción escrita era incorrecta—. **Cero violaciones de CSP en DIEZ pantallas y los tres perfiles, en modo producción, con control positivo validado.** Vitest de 138 a **152 en 11 archivos**. **D-59** por un defecto que el plan no preveía. **Veintitrés correcciones** y el **error 24 de quien dicta** |
| **3 · Playwright y el flujo de entrada** | ⬜ pendiente |
| **4 · Los cuatro flujos restantes** | ⬜ pendiente |
| **5 · La auditoría bloqueante (Q-10)** | ⬜ pendiente |
| **6 · Q-13, con el código que ya consulta** | ⬜ pendiente |
| **7 · Los pendientes menores** | ⬜ pendiente |
| **8 · Verificación de punta a punta** | ⬜ pendiente |
| **9 · Cierre y documentación** | ⬜ pendiente |

### Task 0 · La deuda documental *(2026-08-13)*

1. **M-5 se sospechó a medias y está entera.** `in_stock` aparecía en `lib/database.types.ts` y parecía
   una columna superviviente de `products`, que es justo lo que M-5 mandaba quitar. **Vive en la vista
   `product_availability`**, y en la tabla ya no existe ninguna de las dos columnas viejas. **Leer un
   nombre en el archivo de tipos no dice en qué objeto vive:** hay que mirar si cae bajo `Tables` o bajo
   `Views`. La sospecha se escribió antes de mirar y se deshizo mirando; **si se hubiera dictado, habría
   metido un defecto inexistente en la especificación**.
2. **M-6 tiene un residuo que el plan no preveía, y es benigno.** La landing lista las dos sedes a mano, y
   no por descuido: **empareja cada una con una imagen de `public/` que la base no guarda**, así que leer
   `campuses` no le daría la foto. Medido contra producción: los nombres coinciden exactos —Monterrico y
   San Miguel— y los dos archivos existen. **La landing no miente.** Y encima ese archivo lo tocó el
   compañero de la fase visual en sus dos commits, así que además es terreno ajeno: se anota y no se toca.
3. **El mecanismo del `.gitignore` no era el que se deduce leyendo el archivo.** Quien protegía
   `.env.local` era **`*.local`**, no `.env` ni `.env.*.local`, y por eso `.env.local.apagado` —que ya no
   termina en `.local`— se quedó fuera. **Lo dijo `git check-ignore -v`, que nombra la regla que decide;**
   deducirlo leyendo los patrones daba la respuesta equivocada. Misma lección que Q-15 en su día: dos
   herramientas pueden contestar bien a la pregunta equivocada.
4. **Y se verificó con contraejemplo, que es lo que hace válida la medición.** Que `.env.local.apagado`
   pase a ignorado no prueba nada por sí solo —una regla `*` lo haría igual—; lo que lo prueba es que
   **`.env.example` sigue NO ignorado** y la excepción funciona.
5. **ERROR 22 DE QUIEN DICTA: el PR de la T2A no es el #24, es el #25.** El **#24 fue el PR del plan** de
   la T2A, y la tanda entró por el #25. Se destapó **listando los PR reales del repositorio** antes de
   escribir la fila, no releyendo la memoria. El mismo par existe en las otras tandas —#26 plan y #27
   tanda, #28 plan y #29 tanda—, así que era un error con tres formas de haberse repetido.
6. **Una cifra que NO se escribió, por no estar declarada en ninguna parte: las correcciones de la T3A.**
   `CLAUDE.md` declara las de la T1, la T2A, la T2B y la T3B, y **de la T3A ninguna**; contarlas con un
   `grep` de líneas numeradas dio 14 y esa sonda no es fiable, porque captura cualquier lista. **La fila se
   escribió sin número.** Un hueco declarado es mejor que una cifra plausible — y el primer borrador
   llevaba «127», que es la de la T3B.
7. **UNA CIFRA CADUCADA EN `CLAUDE.md`, y el plan no la preveía.** Dice **«127 correcciones al plan»** de
   la T3B y ese plan llega a **145**: la frase se escribió en la Task 11 y la Task 12 añadió dieciocho más.
   **Importa más que otras porque `CLAUDE.md` se carga solo al abrir cada sesión**, así que una cifra falsa
   ahí se propaga a todas. Se corrige en esta tarea aunque no estuviera en su lista, por el criterio que la
   define: se arregla lo que afirma algo falso **sobre hoy**. **Tercera vez en la fase que un pendiente
   documental resulta más grande que su enunciado.**
8. **UN SUBAGENTE VIOLÓ LA PROHIBICIÓN DE DAR CIFRAS: uno de los cinco de la sesión.** El encargo la
   prohibía con todas las letras y aun así informó de un rango de líneas y de tres recuentos. **No se
   comprobó si eran ciertos: se descartaron**, que cuesta menos y es la salvaguarda que de verdad funciona.
   **Y el dato afina lo que ya sabía el proyecto:** con la prohibición explícita van **cuatro de cinco
   cumpliendo** en esta sesión, contra dos de tres en la T3B. Sigue valiendo la conclusión de entonces
   —prohibirlo ayuda y no garantiza—, y sigue sin poder ser la salvaguarda.
   *Escrito primero como «van tres de cinco», que era falso: cumplieron cuatro. **Sobre-afirmación de
   alcance de quien registra**, cazada contando los subagentes en vez de estimarlos.*
9. **La aritmética del diff cuadró exacto, y esta vez medida por archivo y no inferida del total.**
   `ESPECIFICACION_FUNCIONAL.md` **36 insertadas y 16 borradas** —las 12 filas, la cabecera de la tabla y
   el párrafo final—; `PLANES/README.md` **6 y 1**. **El README suma 7 y no 9 porque la fila de la T0 se
   reescribió idéntica y git no la cuenta**, que es justo el tipo de descuadre que hay que saber explicar
   antes de darlo por bueno. El desglose se había deducido restando del total; `--numstat` lo confirmó, y
   **restar del total es una inferencia, no una medición**.

### Task 1 · Migración 24, la apertura cae en un bloque *(2026-08-13)*

1. **PV-1 y PV-2 resueltos, los dos midiendo y ninguno deduciendo.** La expresión
   `extract(epoch from opening_time)::int % (slot_minutes * 60) = 0` **es inmutable**: no se dedujo de la
   documentación, se le preguntó a Postgres montando el `CHECK` dentro de una transacción y revirtiéndola.
   Y **producción pasa**: abre a las 08:00 con bloques de 30, igual que local, así que la migración 24 no
   fallará en el `db push`. Las dos comprobaciones costaron un comando cada una.
2. **LA DIVISIÓN POR CERO ERA IMPOSIBLE DESDE EL PRINCIPIO, y no por suerte.** El plan no lo consideraba, y
   un `%` con un divisor que valga 0 aborta la sentencia. No puede pasar: `app_settings_slot_minutes_check`
   **ya acota `slot_minutes` entre 5 y 60**. El riesgo se descartó leyendo las restricciones que ya
   existían, no suponiendo que no lo había.
3. **EL TERCER CASO DE PRUEBA DEL PLAN NO SE PUEDE MONTAR DESDE LA FILA REAL, y el motivo es otra
   restricción vieja.** `app_settings_slot_divisor` obliga a que el bloque divida a 60, así que los únicos
   valores posibles son **5, 6, 10, 12, 15, 20, 30 y 60** — y **los ocho dividen a 3600**. Desde la apertura
   por defecto de las 08:00, o desde cualquier hora en punto, **ningún `slot_minutes` válido la desalinea**.
   La aserción 3 tuvo que mover antes la apertura a 08:30. Escrita como la dictaba el plan, habría pasado en
   verde **sin probar nada**.
4. **LA BARRERA DE LA APLICACIÓN Y LA RESTRICCIÓN DE LA BASE RECHAZAN EL MISMO CONJUNTO, y son equivalentes
   por una TERCERA restricción.** `aperturaDesalineada()` comprueba `minutos % slotMinutos !== 0 ||
   segundos !== 0`, que **ignora las horas**; el `CHECK` cuenta los segundos desde medianoche, que **no las
   ignora**. Coinciden únicamente porque `slot_divisor` garantiza que `60 · h` sea siempre múltiplo del
   bloque. **Si algún día se relajara esa restricción, las dos barreras divergirían en silencio**: con
   bloque de 45, la apertura de las 10:00 la aceptaría la aplicación y la rechazaría la base.
5. **`mensajeDeRechazoAjustes()` NO TRADUCE LA RESTRICCIÓN NUEVA, y su caso por defecto devuelve el mensaje
   crudo del motor.** Traduce cuatro —ventana, horario, duración mínima y límite diario— y el resto cae en
   `return mensajeDelMotor`, así que el admin leería `violates check constraint
   "app_settings_apertura_alineada"` en pantalla. **Hoy es inalcanzable**, porque la barrera de servidor de
   `guardarAjustes()` corta antes con su mensaje en castellano. **No se toca** —el Step 5 manda no tocarlo—,
   pero se anota: el día que alguien cambie `aperturaDesalineada()` o `slot_divisor`, la jerga aparece.
6. **DÉCIMO INSTRUMENTO MINTIENDO, y es una herramienta de lectura.** La salida de `Grep` con contexto
   mostró `\` donde el archivo tiene `/`: tres líneas de comentario aparecían empezando por `\ ` en vez de
   `// `, y un `crearProducto()/editarProducto()` salía con barra invertida. **Habría sido TypeScript
   inválido**, y por un momento pareció un archivo roto que el CI había dejado pasar. **Lo dirimió leer el
   mismo rango con `Read`**, que es otra herramienta. La causa no se determinó y no se finge. Van diez:
   `PGRST303`, `PGRST102`, `$?` con stderr nativo, el servidor de desarrollo degradado, `$_.To.Address` de
   Mailpit, la máquina entera con su UTC−5, la sonda de texto sobre HTML de React,
   `browser_console_messages`, `npm audit` con el mismo lockfile, y este.
7. **ERROR 23 DE QUIEN DICTA, y es del género más incómodo: contradice un hallazgo propio de veinte minutos
   antes.** Al escribir el control positivo predije que la apertura de las 09:00 con bloque de 20 daría
   **400**, y da **200**: 32400 % 1200 = 0. Es exactamente el hecho de la corrección 3 —desde una hora en
   punto ningún bloque válido desalinea—, medido por mí y olvidado al escribir la sonda siguiente. **La
   propiedad quedó probada igual**, porque la aserción 3 del test la cubre y pasó en verde, y porque el caso
   correcto —apertura 08:30 y bloque a 20— dio el 400 esperado al medirlo bien. **Medir algo no vacuna
   contra contradecirlo después.**
8. **UN DEFECTO DE PROSA DEL SUBAGENTE, DEL GÉNERO DE LA RELACIÓN INVERTIDA.** El comentario del test decía
   «08:30 no divide a 3600», cuando lo cierto es lo contrario: **3600 no divide a 30600**. El fondo era
   correcto y la frase que lo justificaba estaba del revés. **Ninguna herramienta del proyecto puede verlo**
   —vive dentro de un `--` y el test pasa igual—, así que lo encontró leer. Corregido antes de comitear.
9. **LOS CINCO SERVICIOS PARADOS DEL STACK LOCAL NO SON UN FALLO.** `supabase status` los lista como
   «Stopped» y `supabase start` no los levanta, lo cual parecía chocar con la regla de CLAUDE.md de que
   `db reset` exige el stack completo. **Están deshabilitados a propósito en `config.toml`** —`[storage]`,
   `[analytics]` y `[db.pooler]` con `enabled = false`—, que es distinto de arrancar con `-x`. **El
   `db reset` funcionó con ellos parados**, así que la preocupación se disolvió midiendo.
10. **LA PREDICCIÓN DEL STEP 4 SE CUMPLIÓ EXACTA:** 24 migraciones aplicadas y `Files=25, Tests=150, PASS`,
    desde 23 y 147 en 24. Y de paso resolvió la única duda que el subagente declaró no haber verificado
    —que `throws_ok` acepte `null` como tercer parámetro en esta instalación de pgTAP—: **sí lo acepta**,
    confirmado por el efecto y no por el precedente de `20_settings.sql` del que lo copió.
11. **EL PLAN SE CONTRADICE A SÍ MISMO SOBRE LOS SUBAGENTES, en dos sitios separados por su propia
    ejecución.** Su cierre dice «de cuatro subagentes con la prohibición explícita, uno la cumplió y tres
    no»; la corrección 8 de la Task 0, en el mismo archivo, dice **«cuatro de cinco cumpliendo»**. La
    primera cifra se escribió al planificar y la segunda al ejecutar la Task 0. **Se deja el enunciado
    original y se corrige acá fechado**, como todo lo demás. Es el mismo defecto que la T3B encontró en
    `ESTADO_Y_PLAN.md`: **un documento largo se contradice a sí mismo antes de quedarse obsoleto.**

### Task 2 · Las cabeceras de seguridad *(2026-08-13)*

1. **PV-4 RESUELTO, Y LA SONDA QUE LO PRUEBA NO ES LA OBVIA.** Que la cabecera lleve un nonce no dice nada
   por sí solo: lo que decide es si Next se lo pone a los scripts. Se midió pidiendo **una sola petición** y
   comparando su cabecera con su cuerpo — el nonce de las dos es **el mismo**, y de las etiquetas `<script>`
   del HTML **no queda ni una sin nonce**, ni en la FAQ ni en la landing. Con la cabecera puesta y los
   scripts sin nonce, la aplicación se habría roto entera con los cuatro comandos en verde, que es
   exactamente lo que el plan avisaba.
2. **PV-3 RESUELTO, Y EL PLAN SE EQUIVOCABA SOBRE EL TERRENO.** Daba por hecho que `/_not-found` «la genera
   Next» y por eso dejaba abierto si se podía forzar. **`app/not-found.tsx` existe y es del proyecto**
   —hay otro más en `(alumno)`—, así que basta con volverlo `async` con `await connection()`. **Las
   estáticas quedan en 0, no en 1**, y no hubo que decidir nada de lo que el punto de verificación temía.
3. **EL STEP 4 MANDABA EDITAR UN ARCHIVO QUE NO PUEDE HACER LO QUE SE LE PIDE.** Decía `await connection()`
   en `app/(auth)/login/page.tsx`, y esa página es **`'use client'`**: un componente de cliente no puede
   llamar a `connection()`, que es una API de servidor, y las configuraciones de segmento tampoco se le
   aplican. Se resolvió en **`app/(auth)/layout.tsx`**, que sí es Server Component: **un layout dinámico
   arrastra a toda su rama**, incluida una página de cliente que por sí sola no tiene forma de declararse
   dinámica. **La ruta del plan era correcta y el archivo era el equivocado**, que es un grado más fino que
   el error 21 —allí la ruta no existía; acá existe y no sirve—.
4. **LA DOCUMENTACIÓN DE NEXT 16 CONTRADICE AL PLAN EN DOS DIRECTIVAS, Y LAS DOS ROMPEN EL DESARROLLO.**
   `script-src` necesita **`'unsafe-eval'` en desarrollo** —React usa `eval` ahí para reconstruir los stacks
   de error del servidor— y `style-src` necesita **`'unsafe-inline'` en desarrollo en vez del nonce**. El
   plan no mencionaba ninguna de las dos. **Leerla es obligación de `AGENTS.md` y esta vez se cobró sola:**
   sin esas dos excepciones, el entorno local queda sin estilos y sin depuración, y eso en esta tanda es
   funcionalidad, no estética.
5. **D-59, Y EL DEFECTO QUE LA OBLIGA: `next/image` GENERA ATRIBUTOS `style` Y AL NONCE NO LE LLEGAN.**
   Medido sobre el HTML de producción: **ocho en la landing**, tres en `/login`, dos en la FAQ. Siete son
   `color:transparent` y **uno no es cosmético** —`position:absolute;height:100%;width:100%;…`, que es lo
   que Next emite para una imagen con `fill` y lo que hace que ocupe su contenedor—. Un atributo `style` lo
   gobierna **`style-src-attr`**, que hereda de `style-src` si no se declara, y **el nonce solo vale para
   elementos `<style>` y `<script>`**. Decisión de Alejandro: `style-src-attr 'unsafe-inline'`, en los dos
   modos y sin condicional, para que desarrollo y producción no difieran. Los elementos `<style>` siguen
   exigiendo nonce.
6. **«CERO `style={{...}}` EN TODO EL ÁRBOL» ES CIERTO Y ENGAÑOSO, y es el punto de método de esta tarea.**
   Esa medición del plan es correcta sobre los archivos `.tsx` y **no predice el HTML**: las librerías
   generan los suyos. **La pregunta no era qué escribe el proyecto, era qué sale por el cable.** Se midió
   contando `<script>`, `<style>` y atributos `style` en la respuesta servida, y solo ahí apareció.
7. **PV-5 NO SE PUEDE RESOLVER CON `curl`, Y ESTUVO A PUNTO DE DARSE POR RESUELTO.** El servidor de
   producción contesta **200** con `upgrade-insecure-requests` puesta, y eso invita a concluir que no rompe.
   **No prueba nada: `curl` no aplica CSP.** Es D-33 por la otra puerta —allí la herramienta era más
   *privilegiada* que el navegador, acá es más *permisiva*—. **PV-5 queda abierto y solo lo cierra un
   navegador.** La directiva se condicionó a producción igualmente, que era la decisión correcta con o sin
   la medición.
8. **PV-6 Y PV-7 RESUELTOS LEYENDO LA RESPUESTA.** `connect-src` llega con **`http://127.0.0.1:54321`**, la
   URL local leída del entorno y no escrita a mano, que es lo que evita romper el desarrollo en silencio. Y
   `Strict-Transport-Security` **está en la respuesta de producción y ausente en la de desarrollo**, que es
   todo lo que se puede afirmar sin despliegue: **se verificó leyéndola, no por su efecto**, y así se dice.
9. **HSTS SOLO EN PRODUCCIÓN: desvío del plan, con motivo y asimétrico.** El plan no lo pedía. El navegador
   ignora HSTS sobre `http`, así que mandarla en local no haría daño **hoy**; pero un HSTS con
   `includeSubDomains` que un navegador llegue a recordar para `127.0.0.1` deja la máquina sin poder abrir
   nada local por http, y se arregla a mano. **No mandarla en desarrollo no cuesta nada.**
10. **ERROR 24 DE QUIEN DICTA, y lo destapó leer el comentario que yo mismo había encargado.** Mandé copiar
    la CSP al `redirect` **por analogía con el `Cache-Control`**, y la analogía no se sostiene: el
    `Cache-Control` importa de verdad en un 307 —un CDN puede cachearlo con la cookie dentro— y **la CSP
    no protege el destino**, porque un 307 no lleva documento y el navegador hace una petición **nueva** a
    `/login` que recibe su propia política. El código es inocuo y se queda; **lo falso era el porqué**, y
    lo escribió el subagente porque yo se lo dicté.
11. **DOS DE CINCO SUBAGENTES INCUMPLIERON LA PROHIBICIÓN DE DAR CIFRAS**, con la prohibición escrita y
    motivada en los cinco encargos. Sus números **se descartaron sin comprobarlos** y se remidió, que
    cuesta menos. Sumado a la Task 0, la sesión va **siete de diez cumpliendo**. Sigue valiendo lo de
    siempre: **prohibirlo ayuda, no garantiza, y no puede ser la salvaguarda.**
12. **UN SUBAGENTE CAZÓ UN COMENTARIO CADUCADO QUE EL ENCARGO NO LE PEDÍA MIRAR.** La cabecera de
    `faq/page.tsx` decía «**ESTÁTICA a propósito … Server Component normal, sin async, para que se sirva
    desde el prerender**», y acababa de volverse falsa por su propio cambio. **Lo encontró porque el
    encargo le mandaba conservar los comentarios existentes**, y al conservarlos los leyó. Tercer caso de
    la fase en que un subagente encuentra algo antes de que haga daño.
13. **LOS STEPS 5 Y 6 NO SE CERRARON, y se dice en vez de disimularlo.** Esta sesión **no tiene ninguna
    herramienta de navegador disponible**, así que ni el recorrido con la consola abierta ni la subida real
    a Cloudinary se hicieron. Lo que sí se hizo es **todo lo que el navegador habría comprobado y se puede
    comprobar por HTTP** —las cuatro cabeceras, el nonce por petición, el reparto de nonces en el HTML—, y
    lo que queda es exactamente lo que solo se ve en pantalla: violaciones en consola y una subida de punta
    a punta. **Quedan como entrega a Alejandro, con su control positivo escrito.**
14. **EL MODO PRODUCCIÓN LOCAL NO HABLA CON LA BASE REAL, comprobado y no supuesto.** `next start` carga
    `.env.local` igual que `next dev`, y la CSP servida lo demuestra sola: su `connect-src` lleva
    `127.0.0.1:54321`. **La cabecera sirvió de sonda del entorno**, que no era para lo que se escribió.
15. **PV-5 RESUELTO EN NAVEGADOR, Y LA PREDICCIÓN ESCRITA DEL PLAN ERA INCORRECTA.** El plan predecía que
    `upgrade-insecure-requests` **rompe** el desarrollo local y por eso mandaba condicionarla a producción.
    **No rompe:** con la directiva puesta, la landing cargó por `http://127.0.0.1:3000` y **las veinticuatro
    peticiones salieron por `http`, ninguna intentó `https`**. El motivo es que los navegadores tratan
    `127.0.0.1` como origen confiable y lo excluyen del ascenso. **La decisión de condicionarla a producción
    se mantiene igual**, porque su motivo verdadero era otro —no dejar que un navegador recuerde un HSTS
    para `127.0.0.1`—, pero **la razón que el plan le daba era falsa** y conviene no heredarla.
16. **EL PRIMER CONTROL POSITIVO ESTABA MAL DISEÑADO, Y NINGUNA HERRAMIENTA LO DIJO.** Se inyectó un
    `<script>` externo desde el depurador esperando una violación de `script-src`, **y no hubo ninguna**:
    el bloqueo que apareció era de **CORB**, no de CSP. La causa es que **el código que ejecuta el depurador
    corre en un contexto privilegiado que no está sujeto a la CSP de la página**. Un cero de violaciones ahí
    no significaba «la política funciona», significaba «la sonda no puede violarla». **Lo delató que el
    mensaje citara CORB y no CSP**, y que la petición llegara a hacerse.
17. **Y LA DISTINCIÓN QUE LO ARREGLA ESTÁ MEDIDA, NO SUPUESTA: no todas las directivas se comportan igual
    frente al depurador.** Un `<script>` inyectado desde él **no** dispara `script-src`, pero **una imagen
    con `src` externo sí dispara `img-src`, y un `fetch` a un host no permitido sí dispara `connect-src`** —
    las dos capturadas con el evento `securitypolicyviolation`, que es la sonda oficial y no la consola.
    **La regla práctica: el control positivo hay que hacerlo con una directiva de recurso, no con
    `script-src`.**
18. **CERO VIOLACIONES EN OCHO PANTALLAS, y esta vez el cero vale.** Landing, `/login`, `/admin/inventario`,
    `/admin/reservas`, `/admin/ajustes`, `/admin/estadisticas`, `/mostrador` y `/completar-perfil`, todas en
    **modo producción**, que es donde `style-src` va con nonce y donde el modo desarrollo no prueba nada.
    En las ocho: **ningún script sin nonce** y **la hoja de estilos con sus 145 reglas accesibles**, o sea
    que el CSS no está bloqueado. El flujo de entrada completo funcionó con la CSP puesta —magic link
    pedido, correo leído de Mailpit **por el cuerpo y no por el listado**, enlace `pkce_` canjeado en el
    mismo navegador que lo pidió, y reparto a `/admin/inventario`—.
19. **EL STEP 6 SE CERRÓ SIN SUBIR NINGUNA IMAGEN, y con control positivo en la misma medición.** Lo que la
    CSP gobierna en esa pantalla es una sola cosa: si el navegador puede hablar con `api.cloudinary.com`.
    Medido con las dos puntas: **`example.com` queda bloqueado por `connect-src`** —el control, sin el cual
    lo otro no prueba nada— y **`api.cloudinary.com` pasa, con HTTP 400 devuelto por el propio Cloudinary**,
    que es lo que demuestra que la petición salió. Que la firma sea válida **ya se probó en la T3B con dos
    subidas reales** y la CSP no toca esa lógica, así que subir una tercera solo habría añadido otra imagen
    huérfana a la cuenta real.
20. **DOS `404` EN LA LANDING QUE NO SON DE LA CSP, y distinguirlo importa.** Son las imágenes del seed, que
    apuntan a `res.cloudinary.com/demo/...` —una cuenta de demostración que no las tiene—, y la aplicación
    cae en su `placeholder.svg`. **Si la CSP las bloqueara no habría petición ni respuesta**, y lo que hay es
    un 404 del servidor: son dos fallos con la misma apariencia en la consola y causas distintas. **Quinta
    vez en la fase que el `seed.sql` contradice a producción**, ahora por el lado de las URL de imagen.
21. **EL DOM TIENE MÁS ATRIBUTOS `style` QUE EL HTML SERVIDO.** Contados sobre el HTML de la landing salían
    **ocho**; contados en el DOM ya hidratado salen **nueve**. La diferencia la añade el propio cliente
    después de hidratar. No cambia ninguna decisión —`style-src-attr` los cubre a todos—, pero **afina el
    punto de la corrección 6**: ni el código fuente ni el HTML servido son la última palabra sobre lo que
    la CSP acaba evaluando.
22. **EL RECORRIDO ACABÓ EN DIEZ PANTALLAS Y LOS TRES PERFILES, no en ocho.** La corrección 18 se escribió
    con ocho y **era cierta al escribirla**; caducó en la misma tarea, al continuar con el perfil que
    faltaba. El Step 5 pide «los tres perfiles» y con las ocho primeras solo estaban cubiertos **dos**:
    faltaba el alumno, que es justo quien usa **el catálogo con imágenes remotas y el calendario de
    reserva**, la pantalla con más JavaScript del proyecto. Se entró como alumna por su propio magic link,
    y `/catalogo` y `/catalogo/[id]/reservar` dieron lo mismo que las otras ocho: **cero violaciones, ningún
    script sin nonce, las 145 reglas de CSS accesibles** y las **21 franjas** del calendario pintadas. **Diez
    pantallas, cero violaciones, con el control positivo validado antes y después.**
23. **`/auth/signout` DEVUELVE 405 A UN `GET` Y ESTUVO A PUNTO DE PARECER UN DEFECTO DE LA CSP.** Navegar
    ahí con el navegador dio una página de error de Chrome, justo en mitad de la verificación de una tanda
    que toca cabeceras. **No es un defecto y no es de esta tanda:** el handler declara `export async
    function POST()` y nada más, así que el `GET` da **405** y el `POST` da **303**, medido por las dos
    puntas. **Es el diseño correcto** —un cierre de sesión por `GET` lo dispararía cualquier prefetch o
    cualquier `<img>`—. Lo dirimió medir el endpoint y abrir el archivo **antes** de escribir que algo
    fallaba, que es la misma regla de siempre: verificar la propia sonda antes de acusar a la pantalla.

---

## Lo que ya está medido, antes de escribir una línea

Todo lo de esta sección se midió el **2026-08-13**, al escribir el plan. Son hechos con fecha, no
suposiciones heredadas del diseño.

**1 · `develop` no está donde decía el encargo.** Está en **`42b26af`**, no en `be39683`. Después de
mergear la T3B entraron **dos PR del compañero que hace la fase visual** —#31 y #32—, con 38 archivos,
**+1182 / −274**, seis componentes nuevos y `public/upc-logo.png`. **No movieron ninguna cifra:** el
`build` sigue en **23 rutas y 3 estáticas** y Vitest en **138 pruebas en 10 archivos**, medidos después de
los merges. El CI de `develop` está verde sobre `42b26af`.

**2 · D-23 sobrevivió al trabajo visual, y había motivo para dudarlo.** El compañero tocó
`app/globals.css` (+56) y `app/layout.tsx`, que son exactamente los dos archivos donde viviría un
`@import` de Google Fonts. **No lo reintrodujo:** las fuentes siguen entrando por `next/font/google`, que
las descarga en el build y las sirve desde el propio dominio. **Esto es lo que hace barata la CSP de esta
tanda**, y por eso se comprobó antes de diseñarla en vez de darlo por hecho.

**3 · Las dos ramas de la T3A y la T3B ya no están en el remoto.** `git ls-remote --heads origin` devuelve
`main`, `develop` y `feature/estilos-sistema-visual`. **D-29 está cumplido** y ese pendiente del encargo
ya no existe. La tercera rama es del compañero y no es deuda de este flujo.

**4 · La auditoría de dependencias da resultados distintos con el mismo lockfile.**
`npm audit --audit-level=high` **sale con código 1 acá y ahora** —un aviso alto sobre `nanoid`—, y el paso
equivalente del CI, corrido nueve horas antes sobre el mismo commit, escribió `found 0 vulnerabilities` en
su log. **No es que los árboles difieran:** `package-lock.json` y `node_modules/nanoid/package.json` dicen
los dos **`3.3.17`**, y el lockfile no está modificado desde el 2026-08-06. **Lo que cambió está fuera del
repositorio.** `npm audit` no lee una base local: consulta el servicio de avisos, y ese servicio cambia sin
que nadie toque el código.

> **Y esto reformula Q-10.** La pregunta no era «¿hay vulnerabilidades hoy?» sino **«¿aceptamos que un
> aviso publicado por un tercero ponga el CI en rojo sin que nadie haya tocado el código?»**. La respuesta
> es **D-57**, y se toma con el precio dicho por delante.
>
> **La causa exacta no está determinada y no se finge que lo esté.** Se comprobó que `nanoid@3.3.18` se
> publicó el **2026-08-07**, seis días antes de las dos ejecuciones, así que la fecha del **parche** no
> explica la diferencia; la del **aviso** sí podría, y no se midió. **Lo que decide el diseño de la Task 5
> es el hecho, no la causa:** dos ejecuciones iguales dieron resultados distintos. La comprobación que lo
> dirimiría —relanzar el paso en el CI— la ejecuta Alejandro, y es el Step 1 de esa tarea.

**5 · La aplicación no tiene despliegue, ni carpeta `e2e/`, ni Playwright.** No hay `netlify.toml`, ni
`vercel.json`, ni `Dockerfile`. `package.json` no declara `@playwright/test`. **Playwright existe en el
entorno de trabajo desde el 2026-08-11, pero eso es la herramienta de conducir un navegador, no una
dependencia del proyecto**, y confundir las dos cosas haría creer que la tarea 2.11 está medio hecha.

**6 · Los terceros reales del sistema son tres hosts, y ninguno sirve scripts.**
`res.cloudinary.com` (las 34 imágenes del catálogo, declarado ya en `next.config.ts`),
`api.cloudinary.com` (la subida desde el navegador, en `components/admin/subida-imagenes.tsx`) y
`zqfkzgdyeqxzgzpxgadi.supabase.co` (la API y la sesión). **Cero `<Script>`, cero
`dangerouslySetInnerHTML`, cero `style={{...}}` en todo el árbol `.tsx`** — medido. Los únicos elementos
inline que hay que autorizar son los que genera Next.js, que es justo lo que el nonce cubre.

**7 · `.env.local` NO EXISTE: está renombrado a `.env.local.apagado`.** Con lo cual el `.env` manda, y el
`.env` apunta a **`https://zqfkzgdyeqxzgzpxgadi.supabase.co`**, que es **producción**. Hoy `npm run dev`
habla con la base real. **Es el segundo de los cinco fallos de la T1, otra vez presente**, y esta vez con
una consecuencia nueva: **un E2E que entrega, recibe y sanciona, corrido con el entorno así, escribiría
sobre datos reales.** Ver la restricción global sobre esto: no es un aviso, es una condición de arranque.

**8 · La tabla de «Mejoras propuestas» de la especificación describe un sistema que ya no existe.** El
encargo señalaba M-11; al comprobarlo se vio que el problema es mayor. Medido contra
`supabase/migrations/`: **M-1** (`exclude using gist`, en `blocked_range.sql`), **M-2**
(`reservation_status_log` y su trigger), **M-3** (`apply_penalties`), **M-4** (`disabled_days` dentro de
`create_reservation`), **M-5** (`product_availability`), **M-6** (`campus_id`), **M-7** (`America/Lima`),
**M-8** y **M-9** (`'operator'`) **están todas implementadas**. **M-8 es el caso más claro y el que obliga
a mirar el código en vez de la tabla:** su fila dice «Corregir el `SKIP LOCKED`: hoy aborta con "no hay
unidades disponibles" aunque queden libres», y la RPC vigente recorre las unidades de menos usada a más
usada con un `continue` en la ocupada — **y el propio SQL cita el identificador**:
`-- 8 · rotacion justa (M-8, BR-12)`. **La tabla lleva meses contradiciendo al código que la cita.**

**9 · Un secreto fuera del `.gitignore`, y es de arreglo trivial.** `.env.local` está renombrado a
`.env.local.apagado` *(punto 7)*, y ese nombre **ya no casa con ninguna regla del `.gitignore`**: medido
con `git check-ignore`, de los cinco archivos de entorno probados es **el único** desprotegido — `.env`,
`.env.local` y `.env.production.local` sí lo están, y `.env.example` queda fuera a propósito por la regla
`!.env.example`. El archivo contiene `CLOUDINARY_API_SECRET`. **Un `git add .` lo publicaría.**
**Lo que NO ha pasado, comprobado y no supuesto:** el archivo no está en el historial, y **el propio
secreto tampoco** — `git log --all -S` sobre su valor literal no devuelve ningún commit. **El riesgo es
prospectivo, no consumado**, y es la misma propiedad que la Fase 0 verificó para P0-4 por la otra puerta:
allí, que el secreto no llegara al navegador; acá, que no llegue al repositorio. **Lección que se lleva
esta tanda: renombrar un archivo puede sacarlo de una protección que nadie recordaba que dependía del
nombre.**

**10 · Una ruta de este mismo plan estaba mal escrita, y se corrigió antes de dictarla.** La estructura de
archivos decía `app/login/page.tsx`; la ruta real es **`app/(auth)/login/page.tsx`**, y aparecía mal en
**dos** sitios. Se destapó comprobando una por una las ocho rutas citadas —siete existían—, no releyendo
el plan. **Es el error 21 de quien dicta**, y del género más caro de los conocidos: una coordenada falsa
que un subagente fiel habría intentado editar, creando el archivo en el sitio equivocado o parándose sin
saber por qué. **La comprobación costó un comando.**

**11 · Y la deuda documental tiene una tercera cara, que es la omisión.** La tabla de la Fase 2 en
`MIGRATION_DOCS/PLANES/README.md` lista **dos planes** —T0 y T1— de los **siete** que existen en la
carpeta, y marca la T1 como **«sin ejecutar»** cuando cerró y se mergeó el 2026-08-07. **M-11 miente
diciendo algo falso; este índice miente dejando de decir algo verdadero**, y el segundo es más difícil de
ver porque no hay ninguna frase que contradecir: hay que comparar el índice con el `ls` de su propia
carpeta. **Se encontró buscando dónde había que anunciar el plan de esta tanda**, no auditando.

---

## Decisiones tomadas el 2026-08-13, al aprobar este plan

Las cuatro se tomaron **antes** de escribir el plan que las aplica, con el costo de cada una por delante.

| # | Decisión | Fecha |
|---|---|---|
| **D-55** | **La T4 toca SQL, pero solo Q-19: la migración 24.** Es un `CHECK` sobre `app_settings` que ata `opening_time` a `slot_minutes`. **Q-18 NO entra**, y el motivo que decide no es el costo de escribir la política: es que recortar la lectura de `inventory_unit_notes` **obliga a reverificar la T3A entera**, porque el historial del mostrador lee esa misma tabla. Separarlas paga el costo caro una sola vez y no mezclado con las cabeceras y el E2E. **Q-18 pasa a una tanda propia.** | 2026-08-13 |
| **D-56** | **La CSP se implementa con `nonce`, y las tres rutas estáticas pasan a dinámicas.** Es lo que recomienda la doc de Next 16 instalada, y el precio está medido: de 23 rutas ya hay 20 dinámicas, así que lo que se pierde son **dos páginas reales**, `/faq` y `/login`. La alternativa —`'unsafe-inline'` en `script-src`— conserva las estáticas y deja la CSP casi sin valor contra XSS, que es lo único para lo que existe. La tercera vía, SRI, la marca **experimental** su propia documentación, y endurecer sobre terreno que puede desaparecer no es endurecer. | 2026-08-13 |
| **D-57** | **`npm audit --audit-level=high` pasa a bloqueante**, y se asume el precio dicho arriba: algún día el CI se pondrá rojo sin que nadie toque el código, y se arreglará actualizando el paquete. **Falla cerrada, como el resto del proyecto.** Cierra Q-10. | 2026-08-13 |
| **D-58** | **El E2E cubre los cinco flujos críticos** —entrar, reservar, cancelar, entregar, recibir—, que es lo que pide §13 del diseño y lo que cierra la tarea 2.11 de verdad. Es aproximadamente la mitad del trabajo de la tanda, y por eso va en dos tareas y no en una. | 2026-08-13 |

---

## Puntos a verificar

Se resuelven **midiendo**, y cada uno lleva escritos sus dos desenlaces. Ninguno se da por sabido.

**PV-1 · ¿Es inmutable la expresión del `CHECK` de Q-19?** Un `CHECK` de tabla solo admite expresiones
inmutables. La candidata es `extract(epoch from opening_time)::int % (slot_minutes * 60) = 0`.
**Si lo es**, la migración 24 es una línea. **Si no**, hay que reescribirla en aritmética de hora y minuto,
y entonces hay que decidir qué se hace con los segundos —que `time` admite y la pantalla no ofrece—.

**PV-2 · ¿Pasa la fila que ya existe, en local y en producción?** Un `CHECK` nuevo se valida contra las
filas presentes, así que **si producción tiene una apertura desalineada, la migración 24 falla al
aplicarse allí** y el fallo aparece en el `db push`, no en local. Se mide por PostgREST **antes** de
escribir el SQL, no después. El valor por defecto —08:00 con bloques de 30— sí pasa: 28800 % 1800 = 0.

**PV-3 · ¿Sobrevive `/_not-found` a la CSP con nonce?** `/faq` y `/login` son páginas propias y se fuerzan
a dinámicas con `await connection()`. `/_not-found` la genera Next. **Si se puede forzar**, las estáticas
quedan en 0. **Si no**, queda una estática servida con scripts sin nonce, y hay que decidir entre
excluirla del matcher —con lo que esa página se queda sin CSP— o aceptar que se rompa el 404.

**PV-4 · ¿Dónde tiene que ir el nonce para que Next lo aplique?** La doc dice que Next lo extrae de la
cabecera `Content-Security-Policy` **del request**, no del response. `updateSession()` construye su
`NextResponse.next({ request })` por dentro, así que **hay que cambiarle la firma** para que reciba los
headers ya modificados. **Si se pone solo en el response**, las páginas se sirven con la cabecera correcta
y los scripts sin nonce: la aplicación se rompe entera con el `build` en verde.

**PV-5 · ¿Rompe `upgrade-insecure-requests` el desarrollo local?** El entorno se prueba por
`http://127.0.0.1:3000` (D-33). Esa directiva convierte cada petición a https. **Predicción: rompe**, y por
eso la CSP se escribe con la directiva condicionada a producción. Se mide, no se supone.

**PV-6 · ¿Qué hosts hay que abrir, y con qué valor en local?** En producción la API es
`https://zqfkzgdyeqxzgzpxgadi.supabase.co`; en local es `http://127.0.0.1:54321`. **Una CSP con el host de
producción escrito a mano rompe el desarrollo en silencio**, así que `connect-src` se construye leyendo
`NEXT_PUBLIC_SUPABASE_URL`. Se verifica que la consola del navegador no reporte ni una violación, **con
control positivo**: una directiva deliberadamente estrecha tiene que producir la violación, o la sonda no
sirve.

**PV-7 · ¿Tiene HSTS algún sitio donde verificarse?** No hay despliegue, y en `http://` el navegador
**ignora** la cabecera. **Si se confirma que la ignora**, la cabecera se escribe y se verifica leyendo la
respuesta, no por su efecto — y se dice así en el cierre, en vez de dejar creer que se probó. **Nunca se
prueba HSTS apuntando a `127.0.0.1` con `includeSubDomains`:** el navegador lo recuerda y deja la máquina
sin poder abrir nada local por http.

**PV-8 · ¿El magic link de Playwright se canja donde se pidió?** Está medido que el enlace pedido **por la
aplicación** llega con token `pkce_` y **solo se canjea en el mismo navegador que lo pidió**, mientras que
el de un `POST` directo a `/auth/v1/otp` se canjea desde cualquier cliente. **Si Playwright pide el enlace
desde su propio navegador y lo abre en ese mismo contexto**, funciona. **Si lo pide por API y lo abre en
Playwright**, no. Es la diferencia entre un E2E que existe y uno que no arranca.

**PV-9 · ¿Añade Playwright vulnerabilidades al árbol?** Hoy son **708 paquetes**. **Si añade alguna alta**,
la Task 5 no puede cerrarse hasta resolverla, y por eso Playwright se instala **antes** de hacer bloqueante
la auditoría. Al revés, el CI se rompería en la tarea siguiente por culpa de la anterior.

**PV-10 · ¿Sigue Q-13 siendo prematuro?** Su enunciado dice «revisar con tráfico real», y **tráfico real
sigue sin haber**: el sistema no está desplegado y no tiene usuarios. **Si al medir los advisors los 22
avisos siguen siendo los mismos**, lo honesto es cerrarlo como decisión consciente —«sigue prematuro,
se reevalúa tras el despliegue»— y no fingir una optimización. **Si alguno cambió de naturaleza**, se
trata ese.

---

## Global Constraints

- **La autorización no se replica.** El proxy redirige, el layout es comodidad, el componente oculta, y
  **quien decide es RLS**. Esta tanda añade cabeceras, que son defensa en profundidad del navegador: no
  autorizan nada y no pueden sustituir a una política.
- **La única excepción sigue siendo `/api/cloudinary/firma`**, que habla con Cloudinary y no tiene ninguna
  política detrás. No se toca en esta tanda.
- **Una migración esta tanda, y solo una: la 24** *(D-55)*. Si aparece una segunda necesidad de SQL se
  registra como desvío **antes** de escribirlo, con el costo por delante. Q-18 **no** entra.
- **ANTES DE CORRER UN E2E, VERIFICAR A QUÉ BASE APUNTA EL ENTORNO.** Hoy `.env.local` no existe —está en
  `.env.local.apagado`— y el `.env` apunta a producción. Un flujo de entrega y sanción corrido así escribe
  sobre datos reales. **El arnés debe negarse a arrancar si la URL no es la local**, y esa negativa es
  código de la tarea, no una nota en un documento: una advertencia escrita no ha frenado nunca a nadie.
- **La aplicación nunca usa `service_role`.** Si un flujo la pide, falta una política, no una clave.
- **El árbitro de si una pantalla funciona es `npm run build`**, no el navegador ni `npm run dev`.
- **Abrir la pantalla en un navegador de verdad sigue siendo obligatorio.** Es lo único que ha encontrado
  los fallos de esta fase. Y a partir de esta tanda hay un segundo instrumento —Playwright— que **no lo
  sustituye**: un E2E afirma lo que se le escribió, no lo que se ve.
- **Se prueba siempre por `http://127.0.0.1:3000`**, nunca por `localhost:3000` *(D-33)*.
- **Borrar `.next/`** al mover, renombrar o borrar algo dentro de `app/`. Y recordar que `.next/` miente en
  tres direcciones: `typecheck` en verde falso, `typecheck` en rojo falso, y **504 en el navegador donde en
  caliente hay 404**.
- **Nada de estética.** Sí funcionalidad, visibilidad y textos. La CSP puede romper estilos, y eso **no es
  estética: es funcionalidad**, porque una hoja bloqueada por una directiva es un defecto de esta tanda.
- **En PowerShell, `if (comando)` evalúa la salida, no el código de salida.** Para comandos que no imprimen
  nada, mirar `$LASTEXITCODE`. Y `$?` **miente con el stderr de un ejecutable nativo**.
- Mensajes de commit **sin acentos**; los documentos **con** tildes. **Claude no toca el remoto.**

---

## Estructura de archivos

Es un **mínimo, no un contrato**. La T3B dejó escrito que un plan puede pedir una función y olvidarse de
la pantalla que la llama; lo que falte se añade y se anota como corrección.

```
supabase/migrations/<ts>_opening_time_aligned.sql   nuevo   (Task 1, migración 24)
supabase/tests/32_opening_time_aligned.sql          nuevo   (Task 1)
proxy.ts                                            modif.  (Task 2, el nonce)
lib/supabase/proxy.ts                               modif.  (Task 2, firma de updateSession)
lib/seguridad/csp.ts                                nuevo   (Task 2, la política en un solo sitio)
lib/seguridad/csp.test.ts                           nuevo   (Task 2, lógica pura)
next.config.ts                                      modif.  (Task 2, HSTS y las dos X-)
app/(publico)/faq/page.tsx                          modif.  (Task 2, connection())
app/(auth)/login/page.tsx                           modif.  (Task 2, connection())
playwright.config.ts                                nuevo   (Task 3)
e2e/apoyo/entorno.ts                                nuevo   (Task 3, el cortafuegos de producción)
e2e/apoyo/sesion.ts                                 nuevo   (Task 3, magic link por Mailpit)
e2e/entrar.spec.ts                                  nuevo   (Task 3)
e2e/reservar.spec.ts                                nuevo   (Task 4)
e2e/cancelar.spec.ts                                nuevo   (Task 4)
e2e/mostrador.spec.ts                               nuevo   (Task 4, entregar y recibir)
.github/workflows/ci.yml                            modif.  (Task 5, y el E2E)
.github/workflows/db.yml                            modif.  (Task 7, setup-cli)
```

---

## Task 0 — La deuda documental

**Va primera y no última**, como la Task 0 de la T3B: **los documentos son falsos hoy**, y las ediciones de
documentación se cierran antes de pasar comandos de git.

**Files:** Modificar `MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md`

- [ ] **Step 0: `.env.local.apagado` al `.gitignore`, antes que ninguna otra cosa de la tanda.** Es una
      línea y cierra el hallazgo 9. Va primero **porque la tanda entera va a hacer `git add`**, y una
      protección que llega después del commit no protege de nada. La regla se escribe para cubrir **el caso
      general** —un archivo de entorno apagado, y cualquier otro renombre del mismo género—, no solo ese
      nombre exacto. Y se comprueba **el efecto con `git check-ignore`**, que es quien decide: leer el
      `.gitignore` y dar por hecho que se entendió el patrón es exactamente lo que falló acá.
- [ ] **Step 1: verificar fila por fila antes de tocar ninguna.** Están medidas M-1 a M-9 y M-11 como
      cumplidas *(ver «Lo que ya está medido», punto 8)*, pero **esa medición se hizo con `grep` sobre las
      migraciones y eso prueba que el identificador aparece, no que la mejora esté hecha**. Para cada fila,
      abrir el código y comprobar el **efecto**. El contraejemplo de por qué hace falta: M-8 tenía el
      `skip locked` desde el principio y aun así **estaba mal** hasta que se añadió el bucle. Encontrar el
      texto no es encontrar la propiedad.
- [ ] **Step 2:** corregir las filas que afirman algo falso **sobre hoy**, con la marca fechada de siempre
      y **sin borrar el enunciado original**: es el registro de dónde se partía. El criterio es el de la
      Task 0 de la T3B: se corrige lo que miente sobre el presente, se deja lo que solo describe el pasado.
- [ ] **Step 3:** M-10 y M-12 **no se tocan como cumplidas**. M-10 sigue propuesta y es **Q-4**. M-12 tiene
      **la mitad cerrada por D-38** —no se cancela una reserva que ya empezó— y **la otra mitad abierta**:
      falta el margen mínimo *antes* de empezar. Esa media fila se escribe explícita, porque «medio hecho»
      registrado como «hecho» es peor que no registrarlo.
- [ ] **Step 4:** revisar la frase que cierra la tabla —«Las mejoras M-1 a M-8 corrigen defectos. M-9 a
      M-12 son decisiones de producto que requieren tu criterio»—. **Describe un reparto que ya se
      resolvió**, y una frase de cierre envejece igual que una celda.
- [ ] **Step 5: el índice de planes también miente, y por omisión.** La tabla de la Fase 2 en
      `MIGRATION_DOCS/PLANES/README.md` tiene **dos filas** —T0 y T1—, y la de la T1 dice **«sin
      ejecutar»** cuando esa tanda cerró y se mergeó el 2026-08-07. **Faltan cinco filas:** T2A, T2B, T3A,
      T3B y esta misma. Se añaden con el estado real de cada una. **Un índice que no lista lo que existe
      está afirmando que no existe**, y eso es exactamente el mismo defecto que M-11 por otra puerta: no
      dice algo falso, deja de decir algo verdadero.
- [ ] **Step 6:** commit `Tanda 4.0: la deuda documental de las mejoras propuestas`.

> **Punto de método, y es el que da valor a esta tarea:** el encargo señalaba **una** fila y el problema
> resultó ser **la tabla**. La Task 0 de la T3B enseñó lo mismo por el otro lado: fue a corregir cuatro
> líneas y el documento se contradecía en cuatro sitios más que nadie había pedido. **Un pendiente
> documental es casi siempre más grande que su enunciado**, y el enunciado no es el alcance.

---

## Task 1 — Migración 24: la apertura cae en un bloque *(cierra Q-19)*

**Files:** Create `supabase/migrations/<ts>_opening_time_aligned.sql`,
`supabase/tests/32_opening_time_aligned.sql`

- [ ] **Step 0: medir antes de escribir, y en los dos entornos.** Leer `opening_time` y `slot_minutes` de
      `app_settings` **en local y en el proyecto real**, por PostgREST. Resuelve **PV-2**. Si producción
      tiene una apertura desalineada, la migración falla al aplicarse **allí y no acá**, y conviene saberlo
      antes de escribir el SQL y no durante el `db push`.
- [ ] **Step 1: las aserciones que fallan, primero.** Archivo nuevo `32_opening_time_aligned.sql`, no un
      añadido a los que ya existen. Casos: una apertura desalineada se **rechaza**; una alineada se
      **acepta** —el contraejemplo, sin el cual el rechazo no prueba nada—; y **cambiar solo
      `slot_minutes`** a un valor que desalinea la apertura guardada **también se rechaza**, que es la
      puerta de atrás que la pantalla no vigila.
- [ ] **Step 2:** la migración. `alter table public.app_settings add constraint
      app_settings_apertura_alineada check (...)`. Resuelve **PV-1**: si la expresión con `extract(epoch
      from ...)` no es inmutable, reescribirla y **anotar el desvío**, no forzarla.
- [ ] **Step 3:** el comentario de la migración dice **qué medición la motivó**, no solo qué hace: apertura
      09:10 con bloque 20 → la base acepta, `available_slots` ofrece **35 franjas con 3 unidades libres** y
      `create_reservation` rechaza las 35. **Y dice también el contraejemplo que acota la regla a esta sola
      columna:** con la apertura alineada y el **cierre** desalineado, la última franja se reservó con HTTP
      200, porque `generate_series` arranca en la apertura y el cierre solo recorta. Sin esa segunda frase,
      el próximo lector ampliará la restricción al cierre sin motivo.
- [ ] **Step 4:** `npx supabase db reset` y `npx supabase test db`. **Predicción escrita: 24 migraciones y
      150 aserciones en 25 archivos**, desde 23 y 147 en 24. Si el número de aserciones no cuadra, se mira
      qué pasó **antes** de seguir.
- [ ] **Step 5:** `D-54` ya mitiga esto por la aplicación. **La migración no lo sustituye, lo respalda**, y
      el código de `guardarAjustes()` **no se toca**: el aviso de pantalla sigue siendo mejor experiencia
      que un error de Postgres. Comprobar que la pantalla de ajustes sigue comportándose igual.
- [ ] **Step 6:** commit `Tanda 4.1: migracion 24, la apertura cae en un bloque`.

> **Esto contradice por CUARTA VEZ la frase «desde aquí ninguna tanda vuelve a tocar SQL» de la T0.** Se
> corrige fechada en el cierre, **no se borra**. Las tres anteriores fueron D-32 (migración 22), D-38
> (migración 23) y la propia constatación de la T3B. **Lo que la promesa enseñó ya está escrito en el
> diseño y sigue valiendo:** una intención escrita en presente se lee después como un hecho, y lo que hay
> que fechar son los documentos, no evitar las intenciones.

---

## Task 2 — Las cabeceras de seguridad *(tarea 2.10)*

La tarea central de la tanda, y la que puede romper la aplicación entera de un modo silencioso.

**Files:** Create `lib/seguridad/csp.ts`, `lib/seguridad/csp.test.ts` · Modificar `proxy.ts`,
`lib/supabase/proxy.ts`, `next.config.ts`, `app/(publico)/faq/page.tsx`, `app/(auth)/login/page.tsx`

- [ ] **Step 1: la política en un módulo puro y con pruebas.** `lib/seguridad/csp.ts` construye la cadena a
      partir del nonce, del modo —desarrollo o producción— y de `NEXT_PUBLIC_SUPABASE_URL`. **Es lógica
      pura, así que se prueba con Vitest**, y ahí está el valor: se puede afirmar que en desarrollo **no**
      aparece `upgrade-insecure-requests` *(PV-5)* y que `connect-src` lleva el host que toca *(PV-6)* sin
      levantar un navegador. **El módulo no puede contener una Server Action ni importar
      `@/lib/supabase/server`**: Vitest no resuelve el alias `@/` y el test se rompería con `typecheck` y
      `build` en verde.
- [ ] **Step 2: el nonce, y por los DOS lados.** Resuelve **PV-4**. `proxy.ts` genera el nonce y
      `updateSession()` cambia de firma para recibir los headers del request ya modificados, porque
      construye su `NextResponse.next({ request })` por dentro. **La regla de oro de ese archivo no se
      toca:** entre crear el cliente de Supabase y llamar a `getClaims()` **no se ejecuta nada**. El nonce
      se prepara **antes** de crear el cliente, no en medio.
- [ ] **Step 3: las otras tres cabeceras**, en `next.config.ts` con `headers()`, que es donde deben ir
      porque no dependen de la petición: `Strict-Transport-Security`, `X-Frame-Options: DENY` y
      `X-Content-Type-Options: nosniff`. Resuelve **PV-7**. **HSTS sin `preload`** mientras no haya
      despliegue: `preload` es una lista de la que se sale con meses de espera, y comprometerse antes de
      tener dominio es firmar por otro.
- [ ] **Step 4: las tres estáticas a dinámicas** *(D-56)*. `await connection()` en `/faq` y `/login`.
      Resuelve **PV-3** con `/_not-found`. **Predicción escrita: el `build` sigue en 23 rutas y las
      estáticas pasan de 3 a 0.** Si sale 1, es `/_not-found` y hay que decidir; si sale otra cosa, se mira
      qué pasó antes de seguir.
- [ ] **Step 5: verificar en el navegador con control positivo** *(PV-6)*. Recorrer las pantallas de los
      tres perfiles con la consola abierta y **cero violaciones de CSP**. Y después **estrechar una
      directiva a propósito** para ver la violación aparecer: **un cero no vale sin control positivo**, y
      «cero violaciones» es también lo que devuelve una sonda que no está mirando. Recordar que
      `browser_console_messages` **se contradice dentro de la misma respuesta** —encabeza «Errors: 0» y
      lista 22 líneas `[ERROR]` de la sesión anterior—: se dirime leyendo los logs por navegación y
      separando por marca de tiempo.
- [ ] **Step 6: la pantalla que más puede romperse es la subida de imágenes**, porque es la única que habla
      con un tercero desde el navegador (`api.cloudinary.com`) y la única que maneja `blob:`. Se prueba
      **con una subida real de punta a punta**, no abriendo el formulario.
- [ ] **Step 7:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 4.2: cabeceras de seguridad con CSP
      por nonce`.

> **Por qué esta tarea es peligrosa y conviene decirlo antes:** una CSP mal escrita no da error de
> compilación. Da una pantalla en blanco, o una hoja de estilos que no carga, o un formulario que no envía
> — **exactamente el género de los cinco fallos de la T1**, que son fallos de *a qué se conecta* el código
> y no de *qué dice*. Los cuatro comandos pueden estar en verde con la aplicación inutilizable, y ya pasó:
> **los chunks de `/_next/*` respondiendo 403 a un navegador y 200 a `curl`** *(D-33)* dejaron la
> aplicación rota durante ocho tareas en verde.

---

## Task 3 — Playwright y el flujo de entrada *(tarea 2.11, primera mitad)*

**Files:** Create `playwright.config.ts`, `e2e/apoyo/entorno.ts`, `e2e/apoyo/sesion.ts`,
`e2e/entrar.spec.ts` · Modificar `package.json`, `.gitignore`

- [ ] **Step 1: el cortafuegos, antes que la primera prueba.** `e2e/apoyo/entorno.ts` lee
      `NEXT_PUBLIC_SUPABASE_URL` y **aborta la corrida si no apunta a la base local**. No es una advertencia
      en un comentario: es una excepción que impide arrancar. **Motivo medido:** hoy `.env.local` no existe
      y el `.env` apunta a producción, así que el estado por defecto del repositorio es el peligroso. Un
      E2E que entrega y sanciona corrido así escribe sobre datos reales, y **la mitad de esas escrituras no
      se deshacen con un `update`**: una sanción tiene fecha de fin y un log tiene su fila.
- [ ] **Step 2:** instalar `@playwright/test` y los navegadores. **Antes, `npm audit` para tener la línea
      base**; después, otra vez. Resuelve **PV-9**. Anotar los dos números de paquetes —hoy **708**— porque
      la Task 5 los necesita.
- [ ] **Step 3:** `playwright.config.ts` apuntando a `http://127.0.0.1:3000` *(D-33, nunca `localhost`)*,
      con `webServer` para que levante la aplicación sola. **Contra el `build`, no contra `next dev`**: el
      servidor de desarrollo ya mintió dos veces —un proceso viejo degradado con `500`, y un arranque en
      frío que no registra una ruta y da `404` sin escribir `Compiling`—. Un E2E sobre un instrumento que
      miente produce fallos que nadie puede reproducir.
- [ ] **Step 4:** `e2e/apoyo/sesion.ts` — pedir el magic link **desde el propio navegador de Playwright**,
      leer el correo de Mailpit y abrir el enlace **en ese mismo contexto**. Resuelve **PV-8**, que es la
      diferencia entre un arnés que arranca y uno que no. **Y `$_.To.Address` de Mailpit ya mintió una
      vez**: se lee el cuerpo del mensaje, no se confía en el campo del listado.
- [ ] **Step 5:** `e2e/entrar.spec.ts` — entrar como alumna, comprobar que cae donde debe, y **el
      contraejemplo: una ruta privada sin sesión rebota a `/login`**. Sin esa segunda mitad, la prueba no
      distingue «la sesión funciona» de «no hay ninguna protección».
- [ ] **Step 6:** el script `test:e2e` en `package.json` —**separado de `test`**, que es Vitest y tiene que
      seguir corriendo en segundos—, y `test-results/` y `playwright-report/` al `.gitignore`.
- [ ] **Step 7:** `typecheck`, `lint`, `test`, `build` y commit `Tanda 4.3: playwright y el flujo de
      entrada`.

---

## Task 4 — Los cuatro flujos restantes *(tarea 2.11, segunda mitad)*

**Files:** Create `e2e/reservar.spec.ts`, `e2e/cancelar.spec.ts`, `e2e/mostrador.spec.ts`

- [ ] **Step 1:** reservar. El calendario, la franja, la duración, y **la comprobación en la base**, no
      solo en la pantalla: una prueba que solo lee la interfaz afirma que la interfaz dice algo, no que
      haya pasado.
- [ ] **Step 2:** cancelar. Y con ella **la regla de D-38**: una reserva que ya empezó **no** se cancela, y
      el botón no está. Es el contraejemplo de la prueba anterior.
- [ ] **Step 3:** entregar y recibir, con sesión de **operador**. Es el flujo que cierra el ciclo y el
      único donde el E2E toca la máquina de estados.
- [ ] **Step 4: los datos los pone la prueba y se los lleva la prueba.** El `seed.sql` es una fixture de
      valores **convenientes, no representativos** —`products.featured` vale `true` en 2 de sus 4 productos
      y `false` en los 34 de producción—, así que una prueba que dependa de lo que el seed traiga hoy se
      rompe cuando el seed cambie. Cada spec monta su escenario.
- [ ] **Step 5: no probar la autorización acá.** Que un operador no pueda escribir inventario **lo prueba
      pgTAP dentro del motor y ya está probado**. Un E2E que afirma «el botón de admin no se ve» es un test
      de maquetación disfrazado, y encima frágil: lo rompe el compañero que hace la fase visual.
- [ ] **Step 6:** `typecheck`, `lint`, `test`, `build`, la corrida completa de E2E, y commit `Tanda 4.4:
      los cuatro flujos criticos restantes`.

---

## Task 5 — La auditoría bloqueante *(cierra Q-10, D-57)*

**Va después de instalar Playwright, y el orden no es casual:** al revés, el CI se rompería en esta tarea
por culpa de la anterior *(PV-9)*.

**Files:** Modificar `.github/workflows/ci.yml`

- [ ] **Step 1: relanzar el paso de auditoría en el CI y mirar qué dice hoy.** Es la comprobación que
      dirime la contradicción medida al planificar —código 1 en local, `found 0` en el CI, mismo lockfile—.
      **Lo ejecuta Alejandro**, y del resultado depende si esta tarea empieza por arreglar un paquete o no.
- [ ] **Step 2:** quitar `continue-on-error: true` del paso «Auditoría de dependencias».
- [ ] **Step 3:** reemplazar el comentario largo que hoy explica **por qué no bloquea**. Ese comentario
      lleva razón desde el 2026-08-06 y a partir de acá afirmaría lo contrario de lo que hace el archivo.
      El nuevo dice **D-57 y su precio**: un aviso de un tercero puede poner el CI en rojo sin que nadie
      toque el código, y eso es aceptado, no un defecto que alguien deba «arreglar» revirtiendo esto.
- [ ] **Step 4:** el E2E entra en el CI. **Decidir si bloquea desde el primer día**, sabiendo que un E2E
      recién escrito es la fuente de intermitencias más común que hay. La opción conservadora —bloquear el
      `test` de Vitest y dejar el E2E informando la primera semana— **se escribe como decisión con su
      motivo**, no se cuela por omisión.
- [ ] **Step 5:** commit `Tanda 4.5: auditoria de dependencias bloqueante`.

---

## Task 6 — Q-13, ahora que hay código que consulta

- [ ] **Step 1:** correr los advisors de rendimiento y **comparar con los 22 avisos originales**: 7 índices
      sin usar, 6 claves foráneas sin índice y 9 políticas permisivas múltiples.
- [ ] **Step 2:** resolver **PV-10** y decir la verdad sobre el resultado. **«Tráfico real» sigue sin
      existir**: no hay despliegue ni usuarios, así que «índice sin usar» sigue significando «sin tráfico».
      Si el cuadro no cambió, **cerrar Q-13 como decisión consciente** —se reevalúa tras el despliegue— es
      un resultado legítimo y mejor que fabricar una optimización que nadie puede medir.
- [ ] **Step 3:** si algo **sí** cambió de naturaleza, tratar solo eso. Las dos claves foráneas que el
      propio enunciado señalaba como las únicas que valdrán la pena con datos son
      `reservation_status_log.reservation_id` e `inventory_reservations.product_id`. **Un índice nuevo es
      SQL**, así que sería un desvío de D-55 y se registra **antes** de escribirlo.
- [ ] **Step 4:** commit `Tanda 4.6: reevaluacion de Q-13`.

---

## Task 7 — Los pendientes menores

- [ ] **Step 1: `supabase/setup-cli@v1` apunta a Node.js 20, ya deprecado.** Comprobar qué versiones
      existen y actualizar `db.yml`. **Precedente escrito en el propio archivo:** `checkout` y
      `setup-node` se subieron a `v7` porque las `v4` declaraban `node20` y el runner las forzaba a Node 24
      con un aviso. Es el mismo caso, en la acción que faltaba.
- [ ] **Step 2: el advisor `auth_leaked_password_protection`, desactivado.** **Se activa en el panel de
      Supabase y es tarea manual de Alejandro**, no del código. No es urgente —al sistema se entra por
      magic link, no por contraseña—, y esa es la razón por la que lleva abierto desde el 2026-08-12. Se
      entrega el paso y se verifica el efecto en los advisors, no se da por hecho.
- [ ] **Step 3: M-12 no se implementa** *(D-55)*. Es SQL, y esta tanda tiene una sola migración. Lo que sí
      se hace es **dejar su media apertura escrita** donde se consulta, que es la Task 0. **D-38 cerró la
      mitad de que ya empezó; falta el margen mínimo antes de empezar.**
- [ ] **Step 4:** commit `Tanda 4.7: pendientes menores del endurecimiento`.

---

## Task 8 — Verificación de punta a punta

**No escribe código.** Si al terminar el árbol no está limpio, algo se coló.

- [ ] **Step 1: el recorrido en navegador primero, el `db reset` al final.** El orden importa y el plan de
      la T3B se equivocó justo acá: su Step 1 mandaba un `db reset` que borraba el escenario que su Step 2
      necesitaba. El reset va al final, donde hace de limpieza **además** de comprobación.
- [ ] **Step 2:** los cuatro comandos **dos veces**. **Predicción escrita: 23 rutas y 0 estáticas**; Vitest
      **sube desde 138** por las pruebas de `csp.ts`, y el número exacto se lee, no se predice a ciegas.
- [ ] **Step 3:** `npx supabase db reset` y `npx supabase test db`. **Predicción escrita: 24 migraciones,
      150 aserciones en 25 archivos.**
- [ ] **Step 4:** la corrida completa de E2E, en verde y **dos veces seguidas**. Una prueba de punta a
      punta que pasa una vez de cada dos no está en verde: está rota y disimulando.
- [ ] **Step 5: las cabeceras, medidas en la respuesta.** Las cuatro presentes, y la CSP con un nonce
      **distinto en dos peticiones seguidas** — si se repite, no es un nonce, es una constante y no protege
      de nada.
- [ ] **Step 6:** `/api/cloudinary/firma` revalidado por sus tres respuestas: alumna **403**, operador
      **403**, admin **200 con firma**. **Se mide con `fetch()` desde el navegador y no con un JWT**,
      porque lee la sesión de cookies con `getClaims()`.

---

## Task 9 — Cierre y documentación

- [ ] **Step 1:** `ESTADO_Y_PLAN.md` — casillas **2.10** y **2.11**, la fila de la **T4** en la tabla de
      tandas, **D-55 a D-58**, el cierre de **Q-10** y **Q-19**, y la fila de bitácora.
- [ ] **Step 2:** la corrección **fechada** de «ninguna tanda vuelve a tocar SQL», por cuarta vez, en los
      documentos donde aparece. **Tachada, no borrada.**
- [ ] **Step 3:** `FASE_2_DISENO.md` y `ESPECIFICACION_FUNCIONAL.md` con lo que la tanda cambió, y
      `CLAUDE.md` con el estado nuevo.
- [ ] **Step 4: comprobar qué pide el Step 1 que ya esté hecho.** Un plan escrito antes no sabe lo que las
      tareas anteriores hicieron, y en la T3B eso habría metido **tres duplicados con fechas distintas en
      las mismas filas**.
- [ ] **Step 5:** si esta tarea no escribe código, **los cuatro comandos no se vuelven a correr**: se
      registran las cifras de la Task 8 **diciendo de dónde salen**, en vez de dejar creer que se
      remidieron.
- [ ] **Step 6:** commit `Tanda 4.9: cierre y documentacion`.

---

## Lo que esta tanda NO hace, para que no se cuele

- **No arregla Q-18.** Las notas de unidad las sigue leyendo cualquier alumno con sesión, mitigado por
  texto en los dos diálogos que escriben notas. **Es la decisión D-55 y tiene motivo escrito:** arreglarlo
  obliga a reverificar la T3A entera. Va a una tanda propia.
- **No implementa M-12.** Es SQL y esta tanda tiene una sola migración.
- **No despliega nada.** No hay `netlify.toml` ni `vercel.json` ni dominio, y la T4 no los crea. **HSTS se
  escribe sin poder verificarse por su efecto**, y eso se dice en el cierre en vez de disimularlo.
- **No borra las dos imágenes de prueba de Cloudinary** —`products/z6hce2eqoyd3cvwlfnip` y
  `products/cubpwrrmuztxh6k9yeko`—. La aplicación **no puede**: la firma que emite es solo de subida
  *(F7)*. Es tarea manual.
- **No toca estética.** El compañero está trabajando en `feature/estilos-sistema-visual` en paralelo, y
  esta tanda mete mano en `proxy.ts`, `next.config.ts` y el CI: **superficie de conflicto casi nula, y
  conviene que siga así.**
- **No prueba la autorización con Playwright.** Eso es pgTAP y ya está probado.
- **No optimiza nada por Q-13 sin poder medirlo.**

---

## Pendientes que esta tanda hereda a la siguiente

| # | Qué queda | Por qué |
|---|---|---|
| **Q-18** | Las notas de unidad legibles por cualquier alumno con sesión | *(D-55)* Recortarlo obliga a reverificar la T3A entera. Tanda propia |
| **M-12** | Cancelación con antelación mínima | Es SQL, y D-55 deja una sola migración |
| **Q-2, Q-4, Q-5, Q-6** | Corte dominical, notificaciones, protección de ramas, rotar Cloudinary | Abiertos desde antes de la Fase 2; ninguno es de endurecimiento |
| **Q-13** | Los 22 avisos de rendimiento | Depende de lo que mida la Task 6. Si sigue sin tráfico, sigue sin poder decidirse |
| — | **El despliegue** | No es de esta fase, y sin él HSTS no puede verificarse por su efecto |

---

## Nota sobre el método, que es lo que las seis tandas anteriores han dejado

**Van treinta hechos falsos de subagente en esta fase, de ocho géneros**, y **veinte errores de quien
dictaba**. La salvaguarda que funciona **no es prohibir la invención** —de cuatro subagentes con la
prohibición explícita, uno la cumplió y tres no— sino **no depender del informe**: abrir el archivo, contar
la aritmética del diff, y pedir que **pegue** lo que escribió en vez de decir dónde lo puso.

**Y las dos preguntas del final de cada encargo se hacen igual acá:** qué **no** verificaste, y qué te
pareció contradictorio del encargo. **Tres subagentes las contestaron en la T3B y solo uno encontró algo**
— el costo es el mismo y el hallazgo es asimétrico, así que se pregunta siempre.
