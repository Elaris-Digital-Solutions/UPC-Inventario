# Fase 2 Â· Tanda 3B â€” La administraciÃ³n Â· Plan de implementaciÃ³n

---

## âš  Correcciones tras ejecutar â€” se aÃ±aden sobre la marcha

### Estado de la ejecuciÃ³n *(al 2026-08-12)*

| Task | Estado |
|---|---|
| **0 Â· La deuda documental** | âœ… **Cerrada.** Las cuatro correcciones aplicadas y verificadas: `ESTADO_Y_PLAN.md` 35 y 751, `CLAUDE.md` 168 y 173. Dos filas nuevas de bitÃ¡cora â€”el push de la migraciÃ³n 23 y la escritura de este planâ€”. Ninguna reescrita sin marca |
| **1 Â· Andamio de `/admin` y listado de inventario** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**70 en 6 archivos**, de 65 en 5) y `build` (**15 rutas**, 3 estÃ¡ticas) en verde, corridos **dos veces** â€”antes y despuÃ©s del arreglo de textoâ€”. **Punto a verificar 1 resuelto: SÃ embebe.** Verificado en pantalla con sesiÃ³n de admin y de operador de verdad |
| **2 Â· Alta de producto con sus unidades** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**75 en 7 archivos**, de 70 en 6) y `build` (**16 rutas**, 3 estÃ¡ticas) en verde, corridos **dos veces**. Las cuatro escrituras medidas por PostgREST antes de escribir. **Q-14 primera mitad verificada en pantalla:** el desplegable ofrece 17 buffers y **no ofrece 45** |
| **3 Â· Estado de unidad y sus notas** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**75 en 7 archivos**, sin cambios) y `build` (**17 rutas**, 3 estÃ¡ticas) en verde, corridos **dos veces**. La baja como `retired` verificada **por su efecto en la pantalla del alumno**, con la lÃ­nea base tomada antes |
| **4 Â· `/api/cloudinary/firma`, cierra P0-4** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**83 en 8 archivos**, de 75 en 7) y `build` (**18 rutas**) en verde, corridos **dos veces**. **P0-4 verificado por el efecto**: cero coincidencias del secreto en los 39 archivos servidos al navegador, con control positivo que valida la sonda. Alumno con sesiÃ³n â†’ **403** |
| **5 Â· Subida y gestiÃ³n de imÃ¡genes** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**83 en 8 archivos**, sin cambios) y `build` (**18 rutas**, sin cambios) en verde, corridos **dos veces**. **Cloudinary ACEPTÃ“ la firma**: dos subidas reales de punta a punta, con `cloudinary_public_id` guardado. Las cuatro acciones verificadas en pantalla y en la base |
| **6 Â· `/admin/reservas`** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**107 en 9 archivos**, de 83 en 8) y `build` (**19 rutas**, 3 estÃ¡ticas) en verde, corridos **dos veces**. Las cinco escrituras medidas por PostgREST antes de escribir, con contraejemplo. Los cuatro filtros verificados en pantalla contra una predicciÃ³n escrita antes: **9 / 3 / 4 / 5** exactos. Base intacta: **24 archivos, 147 aserciones, PASS**. **D-44 y D-45**, las dos anotadas en `ESPECIFICACION_FUNCIONAL.md` bajo F6 |
| **7 Â· `/admin/dias`, con D-40** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**111 en 9 archivos**, de 107 en 9) y `build` (**20 rutas**, 3 estÃ¡ticas) en verde, corridos **dos veces**. Diez escrituras medidas por PostgREST **antes** de escribir cÃ³digo, con contraejemplo de operador. Los cinco nÃºmeros verificados en pantalla contra una predicciÃ³n escrita antes: **3 / 1 / 1 / 0** y las 3 canceladas. **D-46 y D-47.** Base intacta: 23 migraciones, 147 aserciones |
| **8 Â· `/admin/estadisticas`** | âœ… **Cerrada.** `typecheck`, `lint`, `test` (**123 en 10 archivos**, de 111 en 9) y `build` (**21 rutas**, 3 estÃ¡ticas) en verde, corridos **dos veces**. Ocho indicadores verificados en pantalla contra una predicciÃ³n escrita antes: **registradas 13, reservadas 1, entregadas 1, devueltas 5, canceladas 4, no-retiradas 1, no-devueltas 1, semana 4**. Los siete conteos por dÃ­a verificados: **L-1, M-1, X-0, J-2, V-2, S-0, D-1**. Base intacta: 23 migraciones, 147 aserciones. **D-48, D-49, D-50, D-51** |
| **9 Â· `/admin/personal`** | â¬œ Sin empezar |
| **10 Â· `/admin/ajustes`, cierra Q-14** | â¬œ Sin empezar |
| **11 Â· VerificaciÃ³n de punta a punta** | â¬œ Sin empezar |
| **12 Â· Cierre y documentaciÃ³n** | â¬œ Sin empezar |

### Task 0 Â· La deuda documental *(2026-08-12)*

1. **El Step 1 predijo Â«cuatro coincidenciasÂ» y salieron NUEVE.** El plan escribiÃ³ que
   `Select-String -Pattern 'sin empuj'` darÃ­a las cuatro lÃ­neas a corregir, mÃ¡s dos legÃ­timas que no se
   tocan. **Lo medido:** seis en `ESTADO_Y_PLAN.md` y tres en `CLAUDE.md`. Las cinco que sobran son
   **entradas histÃ³ricas de bitÃ¡cora** sobre las tandas 2A y 2B â€”`ESTADO_Y_PLAN.md` 741, 750, 751 y 752, y
   `CLAUDE.md:159`â€”, correctas como hechos fechados. **El defecto del plan no es el nÃºmero, es el criterio
   que se deduce de Ã©l:** Â«cuatro coincidenciasÂ» invita a corregir todo lo que salga, y **la mayorÃ­a de lo
   que sale no hay que tocarlo**. El criterio bueno es el que ya estaba en la tabla de la tarea: se corrige
   lo que afirma algo falso **sobre hoy**, y se deja lo que solo describe una fecha pasada. Verificado
   despuÃ©s con un `grep -v "~~"`, que deja ver de un vistazo quÃ© quedÃ³ sin tachar y por quÃ©.
2. **Los cuatro nÃºmeros de lÃ­nea del briefing eran exactos**, comprobados antes de editar y no usados a
   ciegas: 35 y 751 en `ESTADO_Y_PLAN.md`, 168 y 173 en `CLAUDE.md`.
3. **Un aviso de Â«el archivo cambiÃ³ en discoÂ» que era falso, y conviene no confundirlo con un conflicto.**
   SaltÃ³ al editar `ESTADO_Y_PLAN.md` y `CLAUDE.md`. `git diff` mostrÃ³ que **el Ãºnico cambio era el propio**:
   el aviso se dispara porque el archivo se habÃ­a leÃ­do con `offset`/`limit` y no entero, no porque nadie
   mÃ¡s lo tocara. **Se comprobÃ³ midiendo en vez de suponiendo**, que es lo barato acÃ¡.

### Task 1 Â· Andamio de `/admin` y listado de inventario *(2026-08-12)*

4. **Punto a verificar 1 resuelto por el lado bueno: PostgREST SÃ embebe `inventory_units` y
   `product_images` desde `products`.** Medido con un JWT de admin firmado a mano contra el stack local:
   HTTP 200 con las dos colecciones pobladas. **AsÃ­ que `listarInventario()` es UNA sola consulta**, no dos
   con agrupaciÃ³n en TypeScript. **HacÃ­a falta medirlo y no se podÃ­a deducir:** la T2A ya se topÃ³ con que
   `product_availability` **no** se embebe desde `products` en ninguna de las dos direcciones (`PGRST200`),
   y eso no predecÃ­a nada sobre estas dos â€” son otras FK, y encima en la direcciÃ³n contraria (uno a muchos,
   asÃ­ que llegan como **array**, no como objeto).

5. **El `test` NO siguiÃ³ en 65 como predecÃ­a el plan: subiÃ³ a 70 en 6 archivos**, y la causa es la
   correcciÃ³n siguiente. El plan decÃ­a Â«esta tarea no aÃ±ade lÃ³gica puraÂ», y era cierto **hasta que mirar la
   pantalla obligÃ³ a aÃ±adirla**.

6. **Un defecto de texto que solo encontrÃ³ mirar la pantalla: Â«1 activasÂ».** La tabla escribÃ­a
   `{n} activas` sin concordancia, y el seed tiene un producto con **una sola** unidad activa. **Los cuatro
   comandos estaban en verde con el defecto dentro**, porque ninguna herramienta sabe castellano. Es el
   mismo gÃ©nero que Â«se entregoÂ» y Â«11:41 p. m..Â» de la T2B y que Â«quedarÃ¡ bloqueadoÂ» de la T3A. Se arreglÃ³
   con `lib/admin/plural.ts` y sus **5 pruebas**, extraÃ­do **con cuatro recuentos reales delante en esa
   misma tabla** â€”dos de plural variable y dos invariablesâ€”, no adivinando un segundo caso: es justo la
   condiciÃ³n que `dialogo-cancelar.tsx` (T2B) e `insertarNota()` (T3A) dejaron escrita para no
   sobre-generalizar.

7. **El comentario que la T3A dejÃ³ en `components/cabecera-personal.tsx` decÃ­a Â«esas cinco pantallasÂ» y a
   continuaciÃ³n enumeraba SEIS** â€”inventario, reservas, dias, estadisticas, personal y ajustesâ€”. **El nÃºmero
   estaba mal y la lista bien:** son seis, porque `/admin/ajustes` existe desde D-39 aunque el diseÃ±o no lo
   tenga *(correcciÃ³n 1 de las del diseÃ±o)*. **Es una contradicciÃ³n numÃ©rica dentro de un texto, el mismo
   gÃ©nero que aportÃ³ tres de los cinco errores de quien dictaba en la T3A**, y esta vez estaba en un
   comentario de cÃ³digo y no en un encargo. Corregido al activar el enlace.

8. **La insignia Â«sin cÃ³digoÂ» NO se puede ver con el seed, y verla obligÃ³ a fabricar el caso.** Las 8
   unidades del seed tienen todas `asset_code`, asÃ­ que ese `Badge` no se renderiza nunca en local â€”ni en
   producciÃ³n, donde son 38 de 92 pero el listado no se abre contra producciÃ³nâ€”. Se puso a `NULL` el
   `asset_code` de `CAM-002` y a `retired` el estado de `CAM-003`, se comprobÃ³ que las **dos** insignias
   aparecen â€”Â«2 activas Â· 1 retirada Â· 1 sin cÃ³digoÂ»â€”, y se restaurÃ³ el seed. **Es la lecciÃ³n de la Task 9
   de la T3A aplicada por delante:** una predicciÃ³n puede ser cierta y a la vez inobservable donde se dijo
   que se verÃ­a, asÃ­ que verificarla incluye comprobar que ese sitio es capaz de mostrarla.

9. **El 404 de `/admin/inventario` estÃ¡ cerrado, verificado por el efecto.** Con sesiÃ³n de admin de verdad,
   el canje del magic link cayÃ³ en `/admin/inventario` **y pintÃ³ la tabla**. Y el control por el otro lado:
   con sesiÃ³n de operador, `destino()` lo llevÃ³ a `/mostrador`, escribir `/admin/inventario` a mano lo
   **rebotÃ³ a `/mostrador`**, y su cabecera **no ofrece** el enlace. Consola con **0 errores y 0
   advertencias**.

### Task 2 Â· Alta de producto con sus unidades *(2026-08-12)*

10. **REACT RESETEA EL FORMULARIO CUANDO LA ACCIÃ“N DEVUELVE UN ERROR, y eso obligÃ³ a rehacer una decisiÃ³n
    de diseÃ±o de esta misma tarea.** La primera versiÃ³n guardaba los valores de las filas de unidad **en el
    DOM** y los recogÃ­a con `getAll()`, con el argumento â€”escrito en el propio archivoâ€” de no mantener dos
    copias del mismo dato. **Medido en pantalla:** se enviÃ³ un alta con dos cÃ³digos repetidos, la acciÃ³n
    contestÃ³ con su rechazo, y **el campo Â«NombreÂ» y todas las filas quedaron vacÃ­os**. Un `<form action>`
    de React se resetea al terminar la acciÃ³n, **tambiÃ©n cuando la acciÃ³n falla**. Con diez unidades
    escritas, eso es perder el trabajo entero por un cÃ³digo repetido. **Arreglado pasando todos los campos
    a controlados**, y el contraste se midiÃ³ por delante y por detrÃ¡s: antes, seis campos en blanco tras el
    rechazo; despuÃ©s, los seis intactos. **Los cuatro comandos estaban en verde con el defecto dentro** â€”es
    comportamiento de React en el navegador, no una propiedad del texto del programaâ€”.

11. **`PGRST102` TIENE MÃS DE UNA CAUSA, y la segunda apareciÃ³ acÃ¡.** En la T3A ese cÃ³digo fue el sÃ­ntoma
    del **BOM** en el cuerpo JSON (`Set-Content -Encoding utf8`). Midiendo el `INSERT` mÃºltiple de unidades
    saliÃ³ otra vez, con otra causa completamente distinta: **`"All object keys must match"`**, HTTP 400.
    PostgREST **rechaza un INSERT mÃºltiple cuyos objetos no coincidan en el juego de claves**, y el caso lo
    produce el formulario sin esfuerzo â€”una unidad con `asset_code` y otra sin Ã©lâ€”. **Se arregla mandando
    `asset_code` siempre presente, con `null` explÃ­cito, en vez de omitir la clave.** Es la lecciÃ³n del
    instrumento otra vez, en su forma incÃ³moda: **reconocer el sÃ­ntoma no valida la explicaciÃ³n de la vez
    anterior.**

12. **El `INSERT` con array es ATÃ“MICO, medido y no supuesto.** Se mandaron tres unidades con dos cÃ³digos
    repetidos: `23505`, **HTTP 409 â€”no 400â€”**, y **cero unidades** quedaron en la tabla, no una. Eso
    confirma la decisiÃ³n del plan de usar una sentencia y no un bucle: un bucle habrÃ­a dejado Â«las dos
    primeras sÃ­ y la tercera noÂ».

13. **La unicidad por producto, medida con su contraejemplo.** El mismo `unit_code` en **otro** producto se
    aceptÃ³ con HTTP 201. Sin ese contraejemplo, Â«es Ãºnico por productoÂ» no se distingue de Â«es Ãºnico y
    nadie repitiÃ³ todavÃ­aÂ» â€” la misma forma que la T2B usÃ³ con la reserva ajena en `/mi-panel`.

14. **El cÃ³digo repetido se comprueba TAMBIÃ‰N en la acciÃ³n, y no es duplicaciÃ³n ociosa:** el `23505` del
    motor **no dice cuÃ¡l** cÃ³digo se repitiÃ³, y el mensaje de pantalla sÃ­ lo nombra. La barrera real sigue
    siendo la base â€”borrar esa comprobaciÃ³n no permitirÃ­a crear duplicadosâ€”.

15. **`guardarAjustes()` NO puede vivir en `lib/admin/ajustes.ts`, contra lo que decÃ­a el plan.** Ese
    archivo lo carga un test, y una Server Action necesita importar el cliente de servidor por el alias
    `@/`, que Vitest no resuelve. **La regla general que sale, y vale para el resto de la tanda: un mÃ³dulo
    que un test carga no puede contener una Server Action.** `guardarAjustes()` va en `lib/admin/acciones.ts`
    en la Task 10; `ajustes.ts` se queda con lo puro.

16. **El `test` volviÃ³ a subir por encima de lo previsto: 75 en 7 archivos.** El plan predecÃ­a Â«65 â†’ 70Â»
    para esta tarea, pero la Task 1 ya habÃ­a llevado el contador a 70 por `plural.ts`. Los 5 de acÃ¡ son los
    de `multiplosDeSlot()`, que sÃ­ estaban previstos.

17. **`shadcn add select`: el `--dry-run` acertÃ³ exacto y D-30 no se repitiÃ³.** Predijo Â«1 file, +1 newÂ» y
    eso fue: `components/ui/select.tsx` creado, cero modificaciones. **Y se sabe por el hash, no porque el
    build siguiera verde:** `globals.css` y `package.json` con SHA-256 idÃ©ntico antes y despuÃ©s. Sin
    dependencia nueva, porque el proyecto usa el paquete unificado `radix-ui`.

### Task 3 Â· Estado de unidad, notas y la baja como `retired` *(2026-08-12)*

18. **El plan pidiÃ³ dos Server Actions SIN ASIGNARLES PANTALLA.** Su lista de archivos enumera
    `panel-unidades.tsx` y `dialogo-estado-unidad.tsx`, y manda aÃ±adir `agregarUnidad()` y
    `editarProducto()` a `acciones.ts` â€” **pero ningÃºn componente las llama**. Una Server Action sin
    pantalla no la puede usar nadie. Nacen `components/admin/dialogo-agregar-unidad.tsx` y
    `components/admin/formulario-editar-producto.tsx`. **Es el mismo gÃ©nero de hueco que la Task 1 de la
    T3A ya registrÃ³** sobre `mostrador/page.tsx`: la estructura de archivos de un plan **no es
    exhaustiva**, y conviene leerla como un mÃ­nimo y no como un contrato.

19. **`anotar()` gana un parÃ¡metro de ruta en vez de duplicarse.** El diÃ¡logo de nota de la T3A revalida
    `/mostrador`, y desde `/admin/inventario/[id]` eso refresca una pantalla que el admin no estÃ¡ mirando
    mientras deja rancia la que sÃ­. **Se parametrizÃ³ la ruta** â€”con valor por defecto, asÃ­ que ningÃºn
    llamador de la T3A cambiaâ€” en lugar de escribir un `anotarUnidad()` en `lib/admin/acciones.ts`: el
    `INSERT` es idÃ©ntico â€”misma tabla, mismas dos columnas, mismo `trim()`, misma polÃ­ticaâ€” y duplicarlo
    habrÃ­a copiado tambiÃ©n `insertarNota()` con su comentario sobre `created_by`, para que las dos copias
    se separaran con el tiempo.

20. **`formulario-editar-producto.tsx` NO usa `useActionState`, y es consecuencia directa de la correcciÃ³n
    10.** React resetea un `<form action>` al terminar la acciÃ³n; en el alta eso obligÃ³ a controlar todos
    los campos. AcÃ¡ los campos ya nacen controlados â€”arrancan con los valores del productoâ€”, asÃ­ que se
    dispara con `useTransition` sobre un `onClick` y **el reset no llega a existir**. Evitar el problema de
    raÃ­z sale mÃ¡s barato que compensarlo.

21. **El desplegable de buffer de la ediciÃ³n admite un valor QUE Ã‰L MISMO NO OFRECERÃA, y no es una
    contradicciÃ³n:** es la segunda mitad de Q-14 vista desde esta pantalla. Si alguien cambia
    `slot_minutes` en `/admin/ajustes`, un producto puede quedar con un buffer que ya no es mÃºltiplo. Sin
    aÃ±adirle su propio valor, el `<Select>` aparecerÃ­a **vacÃ­o** y guardar cambiarÃ­a el buffer **sin que
    nadie lo pidiera**. Se muestra, se marca Â«(no encaja en los bloques)Â» y se avisa debajo.

22. **La baja como `retired` verificada POR SU EFECTO, con la lÃ­nea base tomada antes de tocar nada.** Se
    eligiÃ³ el TrÃ­pode porque tiene **una sola** unidad, que es lo que hace observable el efecto. **Antes:**
    `active_units = 1`, `in_stock = true`. **DespuÃ©s de retirarla desde la pantalla:** `0` y `false`. **Y en
    la pantalla del alumno de verdad**, no solo por la API: el TrÃ­pode **desapareciÃ³** de `/catalogo` y el
    contador pasÃ³ a Â«2 equipos en MonterricoÂ», contra los 3 que midiÃ³ la T2A. Los 2 errores de consola son
    los 404 de las imÃ¡genes ficticias del seed, conocidos desde la T2A.

23. **El aviso de que la baja no borra aparece SOLO al elegir Â«RetiradaÂ»**, verificado en pantalla: con el
    estado en Â«DisponibleÂ» no estÃ¡, y al cambiar a Â«RetiradaÂ» sale entero. La pregunta que responde solo se
    hace en ese momento.

24. **El motivo obligatorio, medido con los dos casos:** con **seis espacios** el botÃ³n sigue
    deshabilitado â€”`trim()` del clienteâ€”, y con texto se habilita. La misma regla la repite
    `cambiarEstadoUnidad()` del lado del servidor.

### Task 4 Â· `/api/cloudinary/firma`, cierra P0-4 *(2026-08-12)*

25. **La rama 401 es INALCANZABLE desde fuera, y no se arregla.** El plan predecÃ­a Â«sin sesiÃ³n â†’ 401Â».
    **Medido: sin sesiÃ³n llega un 307 a `/login`**, con y sin cabecera `Origin`. `proxy.ts` usa **lista
    blanca** â€”se declara lo pÃºblico y todo lo demÃ¡s pide sesiÃ³n, T1â€” y esta ruta no estÃ¡ declarada, asÃ­ que
    el proxy corta **antes de que el handler exista**. **No se mete `/api` en la lista blanca:** la Ãºnica
    alternativa serÃ­a que el proxy deje pasar lo no declarado, que es justo la propiedad que la T1 comprÃ³,
    y la T2A ya aceptÃ³ exactamente este costo con su 404 propio. La rama se deja escrita como defensa en
    profundidad, con su motivo en el archivo.

26. **P0-4 verificado POR EL EFECTO, y con el control positivo que hace vÃ¡lida la mediciÃ³n.** Cero
    coincidencias del secreto en los **39** archivos servidos al navegador, cero de la API key, y ninguna
    variable `NEXT_PUBLIC_*SECRET`. **Pero cero es tambiÃ©n lo que devuelve una sonda rota**, asÃ­ que se
    buscÃ³ algo que **sÃ­** tiene que estar: la clave publicable de Supabase, **1 coincidencia**. Sin ese
    control, Â«ceroÂ» no distinguirÃ­a Â«el secreto no estÃ¡Â» de Â«la bÃºsqueda no funcionaÂ» â€” la misma forma que
    el contraejemplo del `PATCH` de admin en la Task 1.

27. **Un matiz de `NEXT_PUBLIC_` que contradice cÃ³mo suele contarse: el prefijo no inlinea, la REFERENCIA
    inlinea.** `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` da **0 coincidencias** en el bundle pese a llevar el
    prefijo, porque en esta tarea **ningÃºn componente de cliente lo usa todavÃ­a**. Importa para no leer mal
    la comprobaciÃ³n de P0-4 en el futuro: que una variable pÃºblica no aparezca hoy **no prueba** que no vaya
    a aparecer cuando alguien la referencie.

28. **Los tres caminos, medidos con la herramienta que manda lo que manda un navegador.** Sin sesiÃ³n â†’
    **307**; alumno con sesiÃ³n â†’ **403**; admin â†’ **200**. Los dos con sesiÃ³n se dispararon con `fetch()`
    **desde la pÃ¡gina**, que manda cookies **y** cabecera `Origin` â€” `curl` no manda `Origin`, y esa
    diferencia costÃ³ ocho tareas en la T1. **El 403 con sesiÃ³n de alumno legÃ­tima es el que cierra P0-4**;
    los otros dos son control.

29. **La respuesta trae cinco claves y ninguna se llama nada parecido a Â«secretÂ»**, comprobado por forma y
    no por vista: firma SHA-1 de 40 hex, `timestamp` en **segundos** â€”no milisegundosâ€” con **0 segundos** de
    desfase con el reloj.

30. **El linter marcÃ³ `request` sin usar y TENÃA RAZÃ“N.** Se quitÃ³ el parÃ¡metro en vez de esquivar la regla
    â€”la T3A ya retirÃ³ un `{role === "admin" && null}` escrito solo para callar a ESLintâ€”. **Y al quitarlo
    quedÃ³ a la vista una propiedad de seguridad que conviene tener escrita: este handler no lee NADA del
    cliente.** El `timestamp` sale del reloj del servidor y el `folder` del entorno, asÃ­ que el navegador no
    puede pedir una firma para otra carpeta ni para un `public_id` elegido por Ã©l.

31. **El vector fijo de la firma se CALCULÃ“, no se citÃ³.** El borrador del plan traÃ­a un comentario que lo
    presentaba como Â«el ejemplo de la documentaciÃ³n de CloudinaryÂ». Los parÃ¡metros salen de ahÃ­, pero el
    secreto â€”y por tanto el hashâ€” son de esta mediciÃ³n: presentarlo como ajeno habrÃ­a sido **una fuente
    inventada sobre un hecho cierto**, que es el gÃ©nero que la T2B y la T3A persiguen. La prueba fija
    ademÃ¡s que el secreto va **pegado sin separador**, cosa que un `/^[0-9a-f]{40}$/` no dirÃ­a.

32. **Lo que esta tarea NO prueba, dicho por delante:** que la firma sea **aceptada por Cloudinary**.
    Verificarlo exige una subida real contra la cuenta de la universidad, y eso es la Task 5. AcÃ¡ estÃ¡
    medido que el cÃ¡lculo es correcto contra un vector fijo y que el endpoint autoriza bien; **una firma
    bien formada y equivocada se verÃ­a igual desde acÃ¡**.

### Task 5 Â· Subida y gestiÃ³n de imÃ¡genes *(2026-08-12)*

33. **CLOUDINARY ACEPTÃ“ LA FIRMA, y eso cierra lo que la Task 4 dejÃ³ abierto por escrito.** Dos subidas
    reales desde el navegador contra la cuenta de la universidad, de punta a punta. Las filas quedaron con
    `cloudinary_public_id` **no nulo** â€”`products/z6hce2eqoyd3cvwlfnip` y `products/cubpwrrmuztxh6k9yeko`â€”,
    `format`, `width`, `height` y `bytes` poblados, y la carpeta `products/` aplicada. **La correcciÃ³n 32
    predijo exactamente el hueco que esta tarea cierra:** una firma bien formada y equivocada se habrÃ­a
    visto igual desde la Task 4.

34. **La base acepta DOS imÃ¡genes principales a la vez, medido y no solo leÃ­do.** Se insertaron dos con
    `is_main: true` del mismo producto: **HTTP 201 y las dos dentro**. Confirma que Â«una sola principalÂ» es
    **lÃ³gica de la aplicaciÃ³n** y que la base no la va a defender. Por eso `fijarPrincipal()` apaga primero
    y enciende despuÃ©s: si falla la segunda escritura queda **sin principal** â€”visible y recuperableâ€” y no
    con dos, que es incoherente y silencioso. Verificado en pantalla y en la base: tras fijar la segunda,
    **exactamente una**.

35. **La subida va EN SERIE y no en paralelo, por una carrera real que el plan no menciona.**
    `registrarImagen()` cuenta las imÃ¡genes existentes para decidir `is_main` y `sort_order`; con varias
    subidas resolviÃ©ndose a la vez, todas leerÃ­an el **mismo** conteo, saldrÃ­an con el mismo `sort_order` y
    â€”sobre un producto vacÃ­oâ€” **todas se marcarÃ­an principales**. En serie la carrera no existe.

36. **Borrar la fila NO borra el archivo, verificado con control positivo Y negativo.** Tras quitar una
    imagen, su URL de Cloudinary sigue respondiendo **HTTP 200** con los mismos 5666 bytes que la columna
    `bytes` habÃ­a guardado; y un `public_id` inventado da **404**. Sin ese 404, el 200 no distinguirÃ­a
    Â«sigue ahÃ­Â» de Â«Cloudinary responde 200 a cualquier cosaÂ». Es lo que manda F7.

37. **CUARTA VEZ QUE EL SEED CONTRADICE A PRODUCCIÃ“N, y esta vez al revÃ©s de lo que uno esperarÃ­a.** Las 2
    imÃ¡genes del seed **SÃ** tienen `cloudinary_public_id` â€”`seed/cam-001`, `seed/lap-001`â€”, mientras las
    **34 de producciÃ³n lo tienen en `NULL`**. AsÃ­ que la insignia Â«Sin identificador de CloudinaryÂ» **no se
    renderiza nunca en local** y en producciÃ³n va a estar en **todas**. Se fabricÃ³ el caso â€”poniendo el
    `public_id` de una imagen del seed a `NULL`â€” y se comprobÃ³ que sale junto a Â«PrincipalÂ». **Misma
    lecciÃ³n que la insignia Â«sin cÃ³digoÂ» de la Task 1**, y el mismo remedio.

38. **El linter volviÃ³ a tener razÃ³n, y van dos en la tanda.** MarcÃ³ un `Button` importado y no usado en
    `subida-imagenes.tsx` â€”el componente usa un `<input type="file">` directoâ€”. Se quitÃ³ el import en vez
    de inventarle un uso.

39. **El manejo del error de la firma NO asume que la respuesta sea JSON**, y es consecuencia directa de la
    correcciÃ³n 25: sin sesiÃ³n el proxy contesta **307 hacia una pantalla HTML**, asÃ­ que un
    `await respuesta.json()` a secas reventarÃ­a con un error de parseo que no explicarÃ­a nada. Se intenta
    leer el JSON y se cae a un texto propio â€”Â«tu sesiÃ³n caducÃ³Â»â€”.

40. **Reordenar se hace con dos botones y no arrastrando.** F7 dice Â«reordenar (arrastrar)Â»; arrastrar es
    **estÃ©tica** â€”subir y bajar hace exactamente lo mismoâ€” y ademÃ¡s los botones funcionan con teclado sin
    trabajo extra. La fase visual decidirÃ¡ si el arrastre vale la pena.

41. **`reordenarImagenes()` recibe el orden COMPLETO y no Â«sube esta una posiciÃ³nÂ».** AsÃ­ la pantalla manda
    el estado final que el admin estÃ¡ viendo, en vez de una instrucciÃ³n que podrÃ­a aplicarse sobre un orden
    distinto â€” el mismo riesgo que la correcciÃ³n 15 de la T2B midiÃ³ con el `router.push()` a la misma ruta.

42. **Quedan DOS IMÃGENES DE PRUEBA en la cuenta real de Cloudinary**, y la aplicaciÃ³n **no puede
    borrarlas** porque a propÃ³sito no borra nada allÃ­ (F7). Son `products/z6hce2eqoyd3cvwlfnip` y
    `products/cubpwrrmuztxh6k9yeko`, dos PNG de 320Ã—200 generados en el navegador. **Sus filas ya no estÃ¡n
    en la base**, asÃ­ que no aparecen en ninguna pantalla. Borrarlas del panel de Cloudinary es una tarea
    manual de Alejandro; se deja anotado en vez de silenciado.

### Task 6 Â· `/admin/reservas` *(2026-08-12)*

43. **EL FILTRO DE FECHA ES RANGO CERRADO CON VENTANA MÃ“VIL, y eso contradice a las DOS referencias que
    habÃ­a, cada una por un lado distinto.** DecisiÃ³n de Alejandro tomada antes de escribir una lÃ­nea,
    porque el plan no la cerraba. **Es D-44**, y queda anotada fechada en `ESPECIFICACION_FUNCIONAL.md`
    bajo F6, porque precisa un comportamiento observable que la especificaciÃ³n dejaba abierto. El panel de Vite â€”`git show legacy/vite-final:src/components/admin/ReservationsPanel.tsx`â€”
    usaba rango cerrado pero con **Â«esta semanaÂ» de calendario, lunes a domingo**; y `pasaFiltroFecha()` del
    mostrador *(T3A, Task 8)* usa ventana mÃ³vil pero **sin suelo**. **Ninguna de las dos sirve tal cual
    acÃ¡, y el motivo del suelo es el que importa:** el techo sin suelo del mostrador existe para no
    esconder las candidatas a Â«No se retirÃ³Â», y ahÃ­ la consulta trae **solo reservas vivas**. Esta pantalla
    trae la tabla **histÃ³rica con los seis estados**, asÃ­ que sin suelo Â«HoyÂ» arrastrarÃ­a todo el pasado y
    el filtro no filtrarÃ­a casi nada. **La misma forma de filtrar da resultados opuestos segÃºn el conjunto
    sobre el que se aplique**, y por eso `pasaFiltroFechaReservas()` es una funciÃ³n nueva y no una
    reutilizaciÃ³n de la del mostrador.

44. **`mensajeDeRechazoCancelacion()` NO SE PUEDE REUTILIZAR, contra lo que el Step 1 del plan da por
    hecho.** Ese Step dice Â«ya existe `mensajeDeRechazoCancelacion()` en `lib/reservas/acciones.ts`
    traduciendo sus rechazosÂ», y el briefing de arranque lo repite como resuelto. **Dos cosas lo
    impiden, y la segunda es la que decide:** es **privada** de ese archivo â€”sin `export`â€”, y ese archivo
    lleva `'use server'`, asÃ­ que exportarla convertirÃ­a una funciÃ³n de texto en una Server Action
    invocable desde el navegador; y **sus textos estÃ¡n escritos para el ALUMNO**. El del caso 4 termina en
    Â«contacta con el personalÂ», y acÃ¡ **el personal es justamente quien lo estÃ¡ leyendo**. Reutilizarlo
    habrÃ­a puesto en pantalla un mensaje que le dice al admin que hable consigo mismo. Nace
    `mensajeDeRechazoCancelacionAdmin()`, con **un solo caso** â€”el Ãºnico alcanzableâ€” y un texto que ademÃ¡s
    dice quÃ© SÃ se puede hacer, porque el admin tiene las otras dos salidas en la misma fila.

45. **EL DESPLEGABLE PIDE NOTA PARA Â«No se devolviÃ³Â», y F6 no lo pedÃ­a.** DecisiÃ³n de Alejandro. **Es
    D-45**, anotada fechada en `ESPECIFICACION_FUNCIONAL.md` como **ampliaciÃ³n** de F6 â€”no como correcciÃ³n:
    F6 no decÃ­a nada contrario, decÃ­a de menosâ€”. F6 solo
    exige diÃ¡logo para cancelar, pero esa transiciÃ³n **bloquea al alumno de forma permanente**
    â€”`banned_until = 'infinity'`, sin condiciÃ³nâ€” y F5 ya obliga a una anotaciÃ³n para marcarla en el
    mostrador. Aplicarla desde un desplegable sin nota dejarÃ­a a esa persona **sancionada sin ningÃºn rastro
    escrito**, que es exactamente el peor caso que `marcarNoDevuelta()` ya tenÃ­a documentado y evitado.
    **Se resolviÃ³ parametrizando `ruta` en `marcarNoDevuelta()`**, con valor por defecto, igual que la Task
    3 hizo con `anotar()` y por el mismo motivo: la nota obligatoria, el orden entre las dos escrituras y
    la traducciÃ³n del rechazo son idÃ©nticos, y una copia en `lib/admin/acciones.ts` habrÃ­a duplicado
    tambiÃ©n `insertarNota()`.

46. **`dialogo-cancelar-admin.tsx` se llama `dialogo-estado-reserva.tsx`.** Con la correcciÃ³n 45 son **dos**
    los cambios de estado que exigen escribir algo antes, no uno, y un archivo llamado Â«cancelarÂ» que
    ademÃ¡s marca faltas mentirÃ­a sobre lo que hace. Es un componente parametrizado por `modo`, mismo
    criterio que `DialogoFalta` en la T3A: **dos casos reales desde el primer dÃ­a**, no un segundo caso
    adivinado.

47. **QUE EL PERSONAL CANCELE UNA `reserved` YA EMPEZADA ESTÃ MEDIDO, y el contraejemplo es lo que hace
    vÃ¡lida la mediciÃ³n.** El plan lo daba por cierto **leyendo el SQL**. Medido por PostgREST contra el
    stack local, sobre **la misma reserva** â€”de Ana, en `reserved`, con el inicio ya pasadoâ€”:

    | QuiÃ©n | Resultado |
    |---|---|
    | JWT de la **alumna dueÃ±a** | **HTTP 400**, `23514`, Â«No puedes cancelar una reserva que ya empezoÂ» |
    | JWT de **admin** | **HTTP 204**, cancelada |

    Sin el primero, el 204 del admin **no distinguirÃ­a** Â«la regla existe y exime al personalÂ» de Â«la regla
    no estÃ¡Â». Es la misma forma que el `PATCH` de la Task 1 y que el control positivo de P0-4.

48. **`active -> cancelled` NO EXISTE, y ahora estÃ¡ medido por las DOS puertas** â€”antes solo por unaâ€”. Por
    la RPC contesta HTTP 400 / Â«Solo se cancela una reserva en estado reserved (esta en active)Â»; por
    `UPDATE` directo con las dos columnas juntas contesta HTTP 400 / Â«Transicion no permitida: active ->
    cancelledÂ». **Nadie cancela una reserva entregada**, ni el admin. Es la limitaciÃ³n exacta que D-40
    asume para el dÃ­a inhabilitado, y por eso el desplegable solo ofrece cancelar sobre `reserved`.

49. **DOS DEFECTOS QUE SOLO ENCONTRÃ“ MIRAR LA PANTALLA, con los cuatro comandos en verde y la ruta
    funcionando.**
    - **La cabecera no ofrecÃ­a Â«ReservasÂ».** `/admin/reservas` existÃ­a, cargaba y no habÃ­a **ninguna forma
      de llegar** que no fuera teclear la URL. **Ninguna herramienta comprueba que una pantalla nueva estÃ©
      enlazada desde algÃºn sitio**, y el `build` la lista igual entre sus 19 rutas. Es el mismo hueco que
      la Task 1 tapÃ³ para `/admin/inventario`, reaparecido en la tarea siguiente.
    - **Â«12 ago. 2026, 23:00 Â· hasta 01:00Â»**, o sea una franja que **termina antes de empezar**. El dato
      era correcto â€”la reserva acaba el dÃ­a 13â€”; lo que mentÃ­a era el texto. Arreglado escribiendo la fecha
      entera solo cuando el fin cae en otro dÃ­a civil de Lima, y el contraste se ve en la propia pantalla:
      ocho filas con la hora sola y una con la fecha completa. Mismo gÃ©nero que Â«1 activasÂ» de la Task 1 y
      Â«11:41 p. m..Â» de la T2B.

50. **UN CUARTO INSTRUMENTO MINTIENDO, y esta vez era el servidor de desarrollo.** La consola reportÃ³
    `ReferenceError: plural is not defined` en `components/admin/tabla-inventario.tsx` â€”un archivo de la
    Task 1 que esta tarea no tocaâ€”. **Se dirimiÃ³ midiendo, no suponiendo:** el `import` estaba en su lÃ­nea
    13, `git status` daba el archivo **sin cambios** respecto al commit, y `typecheck` y `build` estaban en
    verde. Reiniciado el proceso, `/admin/inventario` pintÃ³ sus cuatro filas con Â«3 activasÂ». Era el
    proceso viejo degradÃ¡ndose por el HMR tras varios archivos nuevos â€”el mismo gÃ©nero que la T2B ya
    registrÃ³ con `Jest worker encountered ... exceeding retry limit`â€”. **Van cuatro instrumentos:**
    `PGRST303` (epoch local), `PGRST102` (BOM), `$?` con stderr nativo, y este.

51. **El `test` subiÃ³ a 107 en 9 archivos y el plan predecÃ­a Â«~90 en 8Â».** La diferencia no es de la tarea:
    el plan escribiÃ³ su predicciÃ³n sobre un contador de 75, y las Tasks 3 y 4 ya lo habÃ­an llevado a 83.
    Los **24** de acÃ¡ son los de `filtros.ts`, y sÃ­ estaban previstos.

52. **LOS CUATRO FILTROS DE FECHA VERIFICADOS EN PANTALLA CONTRA UNA PREDICCIÃ“N ESCRITA ANTES DE MIRAR, y
    los cuatro nÃºmeros exactos: 9 / 3 / 4 / 5.** Con un escenario de **nueve** reservas montado en local
    â€”los seis estados, dos alumnos y fechas repartidasâ€”, porque producciÃ³n sigue con **cero**. TambiÃ©n
    Â«brunoÂ» â†’ **4** y Â«micrÃ³fonoÂ» â†’ **2**, los dos predichos. La cancelaciÃ³n y la falta verificadas
    **por su efecto en la base**: `banned_until = infinity` solo en la alumna afectada, la nota en el
    historial de la unidad, `cancellation_reason` guardado y `reservation_status_log` con **una** fila por
    cambio y el `changed_by` del admin.

53. **LA BÃšSQUEDA CON TILDE, PROBADA EN LOS DOS SENTIDOS, Y EL SEGUNDO HUBO QUE FABRICARLO.** El seed no
    tiene ningÃºn producto con tilde â€”se llama Â«Microfono Rode NTG4Â»â€”, asÃ­ que buscar Â«micrÃ³fonoÂ» y
    encontrarlo prueba **solo un lado**: el de normalizar la consulta. **Normalizar Ãºnicamente la consulta
    habrÃ­a pasado esa prueba igual.** Se renombrÃ³ el producto a Â«MicrÃ³fonoÂ» en la base, se buscÃ³
    Â«microfonoÂ» sin tilde, salieron las mismas dos filas, y se restaurÃ³ el seed. Es la lecciÃ³n de las
    insignias Â«sin cÃ³digoÂ» y Â«sin identificador de CloudinaryÂ» aplicada a un filtro.

54. **D-41, D-42 y D-43 NUNCA LLEGARON A LA TABLA DE DECISIONES, y llevaban ahÃ­ un dÃ­a entero.** Se
    encontrÃ³ **revisando la redacciÃ³n al cerrar la Task 6**, no ejecutÃ¡ndola: la tabla de `ESTADO_Y_PLAN.md`
    terminaba en **D-40**, y las tres decisiones de esta tanda vivÃ­an solo en este plan y narradas dentro de
    una celda de bitÃ¡cora. **Narrar una decisiÃ³n no es registrarla:** la tabla es donde se busca Â«quÃ© se
    decidiÃ³ y cuÃ¡ndoÂ», y quien la leyera habrÃ­a concluido que la T3B no tomÃ³ ninguna. AÃ±adidas las tres con
    su fecha original y una nota de cuÃ¡ndo se anotaron, mÃ¡s D-44 y D-45 de esta tarea. **El aviso que vale
    para las seis tareas que quedan:** cerrar una tarea incluye comprobar que lo escrito llegÃ³ **al
    documento donde se busca**, no solo a alguno.

### Task 7 Â· /admin/dias, con D-40 *(2026-08-12)*

55. **La cancelaciÃ³n en masa no va por rango de fechas**, contra lo que pedÃ­a el Step 1. Un rango obliga a convertir el dÃ­a civil `YYYY-MM-DD` en dos instantes UTC, o sea a escribir a mano que Lima es UTCâˆ’5 â€” y `lib/reservas/rejilla.ts:21-24` tiene escrita la regla contraria: Â«se usa Intl y no aritmÃ©tica de horas porque Intl SÃ conoce el calendario de la zona; hoy PerÃº no cambia de hora, pero una resta de cinco horas escrita a mano serÃ­a una suposiciÃ³n sin nadie que la vigileÂ». Se resolviÃ³ con `fechaEnLima()` y `.in('id', ids)`. **Sigue siendo UNA sentencia atÃ³mica**, que es lo que el Step 1 exigÃ­a de verdad; lo que cambia es de dÃ³nde sale la lista. **Y la lista la calcula el servidor**, releyendo, no la que la pantalla usÃ³ para enseÃ±ar el nÃºmero.

56. **La Â«Estructura de archivosÂ» del plan dice Â«`dias.ts` â€” Server Actions de `/admin/dias`Â», y no puede ser asÃ­.** Con `'use server'` **todo export del mÃ³dulo se vuelve invocable desde el navegador**, asÃ­ que las dos lecturas serÃ­an endpoints pÃºblicos. Quedan las lecturas en `lib/admin/dias.ts` â€”sin `'use server'`, imitando a `lib/admin/reservas.ts`â€” y las dos Server Actions en `lib/admin/acciones.ts`, con las otras once. Es el mismo gÃ©nero que la correcciÃ³n 15 resolviÃ³ para `guardarAjustes()`, por otro motivo.

57. **Diez escrituras medidas por PostgREST ANTES de escribir una lÃ­nea de cÃ³digo**, con contraejemplo de operador en las dos que lo admitÃ­an:

| QuÃ© se midiÃ³ | Resultado | QuÃ© decidiÃ³ |
|---|---|---|
| Alta del dÃ­a, JWT de **admin** | **201**, y `created_by` poblado por el `DEFAULT auth.uid()` | Que el `INSERT` mande **solo** `(date, reason)` |
| La misma alta, JWT de **operador** | **403** Â· `42501` Â· Â«new row violates row-level security policy for table "disabled_days"Â» | El contraejemplo que hace vÃ¡lida la mediciÃ³n de arriba |
| Un dÃ­a **ya inhabilitado** | **409** Â· `23505` Â· Â«duplicate key value violates unique constraint "disabled_days_date_key"Â» | El texto propio Â«Ese dÃ­a ya estÃ¡ inhabilitadoÂ» |
| Alta mandando **`created_by`** | **403** Â· `42501` Â· Â«permission denied for table disabled_daysÂ» | Que esa columna no se manda nunca |
| PATCH en masa **sin** `status=eq.reserved`, sobre 3 `reserved` y 1 `active` | **400** Â· `23514` Â· Â«Transicion no permitida: active -> cancelledÂ», y **las cuatro filas sin cambio** | Que el filtro de estado es obligatorio y no un adorno |
| El mismo PATCH **con** el filtro | **200** y **3 filas**, la de las **21:00 de Lima** incluida | Que la frontera de medianoche queda cubierta |
| PATCH por `id=in.(â€¦)` con el id de una **`active` dentro de la lista** | **200** y **2 filas**, y **la sentencia no falla** | El diseÃ±o final: lista de ids mÃ¡s seguro de estado |
| `reservation_status_log` tras el PATCH | **una fila por cambio y ni una mÃ¡s** | Que no hay efectos de mÃ¡s |
| Borrado del dÃ­a, JWT de **operador** | **200 con `[]` y ningÃºn error** | Que `habilitarDia()` pida la fila con `.select()` y trate el vacÃ­o como error |
| Borrado del dÃ­a, JWT de **admin** | **200** con la fila dentro | El control positivo de la anterior |

58. **Los dos `42501` de `disabled_days` no son el mismo error, y el mensaje es lo Ãºnico que los separa.** Ser operador da Â«new row violates row-level security policyÂ» â€”falta de **polÃ­tica**â€”; mandar `created_by` da Â«permission denied for table disabled_daysÂ» â€”falta de **privilegio de columna**, porque `20260805195549_traceability.sql:31-32` acota el GRANT a `(date, reason)`â€”. Es la misma lecciÃ³n que `PGRST102` en las Tasks 2 y de la T3A: **reconocer el cÃ³digo no identifica la causa**.

59. **El `INSERT` y el `DELETE` fallan de forma OPUESTA para quien no tiene polÃ­tica, en la misma tabla y en la misma tarea.** El `INSERT` da **403 con error**; el `DELETE` da **200 con `[]` y ningÃºn error**. Por eso `habilitarDia()` pide la fila de vuelta con `.select()` y trata el vacÃ­o como error: sin eso, alguien pulsarÃ­a Â«Volver a habilitarÂ», la pantalla no se quejarÃ­a, y el dÃ­a seguirÃ­a inhabilitado.

60. **La trampa de zona horaria de una columna `date` es la INVERSA de la que el proyecto tenÃ­a escrita.** Los `timestamptz` se formatean en `America/Lima` â€” eso hacen `tabla-reservas.tsx`, `tarjeta-mostrador.tsx` e `historial-notas.tsx`. Pero `disabled_days.date` es una **fecha civil sin hora**: `new Date('2026-09-15')` la interpreta como **medianoche UTC**, asÃ­ que leerla de vuelta en Lima **retrocede un dÃ­a**. Medido con `node -e`: Â«15 set. 2026Â» en UTC contra Â«14 set. 2026Â» en `America/Lima`, misma entrada. **Copiar el patrÃ³n del proyecto sin pensar habrÃ­a pintado un dÃ­a menos en toda la pantalla**, en silencio y con los cuatro comandos en verde.

61. **`new Date("")` lanza `RangeError: Invalid time value`, y el JSX de un diÃ¡logo cerrado SÃ se evalÃºa.** Los hijos de `DialogContent` son elementos React normales que la funciÃ³n padre construye antes de que Radix decida montarlos, asÃ­ que formatear el campo de fecha â€”que arranca vacÃ­oâ€” habrÃ­a reventado la pantalla **en el primer render, siempre**. Lo destapÃ³ el subagente al construir el diÃ¡logo, no una herramienta.

62. **La plantilla de texto del Step 3 reproduce el defecto exacto que `plural.ts` existe para evitar.** Dice Â«las **{n} reservas** que todavÃ­a no se han retiradoÂ», que con `n = 1` da Â«la 1 reservaâ€¦ se han retiradoÂ». Se resolviÃ³ presentando los conteos como pares etiqueta-valor â€”Â«Reservas que se cancelan (aÃºn no retiradas): 1 reservaÂ»â€” en vez de como sujeto de un verbo conjugado. **Es Â«1 activasÂ» otra vez, y esta vez venÃ­a escrito en el propio plan.**

63. **El Step 3 es anterior a D-47 y su texto lo contradice.** Da el motivo de cancelaciÃ³n como Â«Cancelado por la administraciÃ³n (DÃ­a inhabilitado)Â» sin el motivo del dÃ­a dentro, porque se escribiÃ³ antes de que D-47 existiera. Se siguiÃ³ D-47.

64. **La etiqueta de `/mi-panel` se doblaba con el texto de F8, y solo lo encontrÃ³ mirar la pantalla.** `components/reservas/tarjeta-reserva.tsx` decÃ­a Â«Cancelada por: â€¦Â», y hasta hoy los motivos los escribÃ­a una persona a mano. El texto que fija F8 empieza por Â«Cancelado por la administraciÃ³nÂ», asÃ­ que el alumno leÃ­a **Â«Cancelada por: Cancelado por la administraciÃ³n (â€¦)Â»**. Ahora dice Â«Motivo de la cancelaciÃ³n:Â». **Y el cambio caducÃ³ una cita literal en otro archivo**: `lib/reservas/acciones.ts:446` citaba la etiqueta vieja dentro de un comentario cuyo razonamiento seguÃ­a siendo correcto. Es el gÃ©nero que la T2B ya registrÃ³ â€” **cambiar un texto caduca sus citas literales en archivos que el encargo no nombra** â€”, y se encontrÃ³ con un `grep` de la etiqueta vieja por todo el Ã¡rbol **despuÃ©s** de aplicar el cambio.

65. **DIECINUEVE y VEINTE hechos falsos de subagente, los dos en esta tarea.** El **19** es de **atribuciÃ³n**: un comentario escribiÃ³ Â«producciÃ³n tiene DOS filas en `disabled_days` y CERO reservas â€” medido el 2026-08-10Â», y esa fecha pertenece **solo al primer hecho**; Â«cero reservasÂ» aparece en otros tres archivos del proyecto y ninguno le pone fecha. El **20** es **falsedad sobre la propia salvaguarda**, el mismo gÃ©nero que el 16: el comentario afirmaba que el formato de `<input type="date">` estaba Â«comprobado y no supuestoÂ», y el informe del propio subagente decÃ­a Â«es un hecho del estÃ¡ndar HTML, no algo que haya comprobadoÂ». **El dato era cierto en los dos casos; lo falso era de dÃ³nde salÃ­a y si se habÃ­a comprobado.**

66. **DÃ‰CIMO error de quien dictaba, y lo destapÃ³ la pregunta de siempre.** El encargo de arreglar la etiqueta dijo Â«UN SOLO CAMBIO, en UN SOLO archivoÂ», y con eso **prohibiÃ³ el barrido que habrÃ­a encontrado la cita caducada de la correcciÃ³n 64 en el acto**. El subagente lo dejÃ³ anotado en su Â«quÃ© no verifiquÃ©Â» â€”Â«no busquÃ© si existe algÃºn otro lugar que repita la etiquetaÂ»â€” y por ahÃ­ se encontrÃ³. Se corrigiÃ³ con un segundo encargo que **sÃ­** pedÃ­a el barrido explÃ­citamente.

67. **La convenciÃ³n Â«los comentarios van sin acentos ni eÃ±eÂ» NO describe el cÃ³digo real, y conviene saberlo para no gastar rondas de correcciÃ³n.** Comprobado con un `grep` de vocales acentuadas en lÃ­neas de comentario: hay tildes en `lib/cloudinary/firma.ts`, `lib/admin/consultas.ts`, `lib/admin/filtros.ts`, `lib/reservas/motivos.ts`, `lib/reservas/consultas.ts` y `components/admin/formulario-editar-producto.tsx`, entre otros. Es una **tendencia**, no una regla aplicada, y una cita literal de un texto de interfaz puede llevarlas.

68. **La pantalla verificada contra una predicciÃ³n escrita ANTES de mirar, y los cinco nÃºmeros exactos.** Con sesiÃ³n de administrador de verdad: el enlace Â«DÃ­asÂ» en la cabecera; la lista con **una** fila, Â«25 dic. 2026Â» â€”no Â«24Â», que es lo que darÃ­a la zona de Limaâ€”; el dÃ­a 15 con **3 reservas** y **1 prÃ©stamo**; el dÃ­a 16 con **1 reserva** y **0 prÃ©stamos**; y tras confirmar, **las 3 `reserved` en `cancelled`** con el motivo exacto â€”la de las 21:00 incluidaâ€”, **la `active` intacta**, **la del dÃ­a 16 sin tocar** y `reservation_status_log` con **3** filas y ninguna mÃ¡s. **Y tres verificaciones que el briefing no pedÃ­a:** revertir borrÃ³ el dÃ­a y **las tres reservas siguieron canceladas**, que es el aviso de la pantalla comprobado por su efecto; el **operador** no ve el enlace, es rebotado de `/admin/dias` a `/mostrador`, y por la API recibe 403 y cero filas; y **D-47 de punta a punta**, con el alumno leyendo en `/mi-panel` el mismo texto que el admin vio antes de confirmar, mÃ¡s el calendario bloqueÃ¡ndole el dÃ­a inhabilitado con su motivo. **Cero errores y cero advertencias de consola**, medido contra `npm run dev`, que es donde React sÃ­ avisa.

69. **El `git add` del Step 6 deja fuera la mitad de lo que la tarea tocÃ³, y reaparece el defecto que la Task 6 existÃ­a para evitar.** El comando `git add app/(personal)/admin lib/admin components/admin` omite `components/cabecera-personal.tsx` â€”el enlace a Â«DÃ­asÂ»â€”, `components/reservas/tarjeta-reserva.tsx`, `lib/reservas/acciones.ts` y los tres documentos de `MIGRATION_DOCS/`. De los omitidos, el primero es lo grave: comitear con ese `add` habrÃ­a dejado la ruta `/admin/dias` **nueva en el Ã¡rbol** pero **sin su enlace en el cÃ³digo**. El enlace Â«DÃ­asÂ» **sÃ­ se escribiÃ³** en esta tarea, dentro de `components/cabecera-personal.tsx`, pero ese archivo quedÃ³ fuera del commit por el `add` incompleto. El resultado serÃ­a un commit que contiene la ruta nueva y no contiene su enlace â€”quien mirase esa revisiÃ³n encontrarÃ­a una pantalla **sin ninguna forma de llegar** desde la navegaciÃ³n, con los cuatro comandos en verde. Es **el mismo defecto que la correcciÃ³n 49 registrÃ³ en la Task 6**, pero por una puerta distinta: allÃ­ el enlace **no se habÃ­a escrito** aÃºn; aquÃ­ sÃ­, y lo perderÃ­a el comando de commit. **AdemÃ¡s, un detalle de sintaxis de PowerShell:** `app/(personal)` lleva **parÃ©ntesis**, que son operadores de subexpresiÃ³n, asÃ­ que el comando necesita comillas alrededor de ese argumento.

70. **UndÃ©cimo error de quien dictaba, y de un gÃ©nero que no habÃ­a salido: la instrucciÃ³n de forma pegada al dato en la misma frase.** El encargo pedÃ­a Â«Ponlas en una tabla de tres columnas â€”quÃ© se midiÃ³, resultado, y quÃ© decidiÃ³â€”Â» y a continuaciÃ³n, tras los dos puntos, los diez datos sin separaciÃ³n. El subagente **copiÃ³ la instrucciÃ³n dentro del documento** en vez de ejecutarla: la correcciÃ³n 57 naciÃ³ con un pÃ¡rrafo de orden dirigida al redactor dentro del texto publicado. **La lecciÃ³n para prÃ³ximos encargos: la instrucciÃ³n de forma va en una frase propia**, nunca delante de dos puntos seguida de los datos, porque asÃ­ la frase entera se lee como una sola unidad y se pega todo junto. Se arreglÃ³ en una segunda pasada tras encontrarlo, y un barrido de la secciÃ³n buscando imperativos dirigidos al redactor no encontrÃ³ mÃ¡s restos.

### Task 8 Â· /admin/estadisticas, con D-48, D-49, D-50 y D-51 *(2026-08-13)*

71. **SEXTO INSTRUMENTO MINTIENDO, y este es el entorno entero y no una herramienta suelta.** La mÃ¡quina de desarrollo corre en UTCâˆ’5 (`America/Bogota` reportado por Node), que es la misma diferencia horaria que Lima. Medido con el instante `2026-08-17T02:00:00Z` â€”domingo 21:00 en Limaâ€”: `getDay()` crudo da 0 = domingo (correcto), y `getUTCDay()` da 1 = lunes. Medido otra vez con `TZ=UTC` â€”la zona del CI y del servidorâ€”: los dos dan 1 = lunes, y solo el camino por `fechaEnLima()` sigue dando 0 = domingo. **La consecuencia de mÃ©todo es lo que importa:** una prueba de zona horaria pasa en verde en local aunque el cÃ³digo estÃ© mal escrito, porque local miente sobre su propia hora. **Quien lo destapa es el CI**, donde `TZ=UTC` es lo de verdad. Los cinco instrumentos anteriores eran herramientas â€”`PGRST303`, `PGRST102`, `$?` con stderr nativo, el servidor de desarrollo degradado y `$_.To.Address` de Mailpitâ€”; este es la mÃ¡quina entera.

72. **HECHO FALSO 21 del subagente, de un gÃ©nero que no habÃ­a salido: leyÃ³ el contador equivocado de una herramienta.** ReportÃ³ Â«20 rutasÂ» del `build` y son 21. El nÃºmero que leyÃ³ es el `(20/20)` de Â«Generating static pagesÂ», que cuenta pÃ¡ginas generadas y **no rutas**. `/api/cloudinary/firma` es un route handler y no genera pÃ¡gina, de ahÃ­ el desfase de exactamente uno. **Contar la salida de una herramienta no es contar lo que la herramienta hizo**, que es la misma forma que el Â«cuatro coincidenciasÂ» del Step 1 de la Task 0 de la T3B.

73. **DUODÃ‰CIMO error de quien dictaba, y lo destapÃ³ el propio subagente.** El encargo afirmaba que `filaAReservaAdmin()` traduce Â«catorce campos por filaÂ». Son diecisÃ©is, contados sobre el tipo `ReservaAdmin`. El subagente lo copiÃ³ al comentario tal cual â€” es lo que hace un subagente fiel â€” y lo encontrÃ³ al releer sus propios cuantificadores, que es la Ãºltima pregunta del encargo. **Ni revisar el cÃ³digo ni los cuatro comandos lo habrÃ­an visto**, porque la frase estaba en un comentario que el subagente escribiÃ³ a partir de instrucciones que dicen algo falso.

74. **CINCO DECISIONES NUEVAS, las cinco de Alejandro, tomadas el 2026-08-13 antes de escribir una lÃ­nea.** D-48, D-49, D-50 y D-51 fijan quÃ© cuentan los ocho indicadores y sobre quÃ© conjunto. **D-48 CORRIGE la fÃ³rmula de Vite**, que contaba `reserved` con el instante dentro de la franja â€” y en el esquema de hoy una `reserved` con el inicio pasado es la candidata a Â«No se retirÃ³Â» que el mostrador vigila, no un prÃ©stamo en curso. **D-49, D-50 y D-51 AMPLÃAN F9**, que no decÃ­a nada contrario, decÃ­a de menos. D-49 define la ventana Â«PrÃ©stamos esta semanaÂ» como mÃ³vil hacia atrÃ¡s con suelo â€” hoy y seis dÃ­as antes, en dÃ­as civiles de Lima â€” y solo sobre lo que se llegÃ³ a retirar. D-50 explica que el desglose por dÃ­a va sobre todo el histÃ³rico, no sobre la semana del D-49, porque responde Â«quÃ© dÃ­a se pide mÃ¡sÂ». D-51 especifica que el panel muestra ocho indicadores â€”los seis estados, total de registradas, y prÃ©stamos de la semanaâ€”, y los seis estados suman el total, que es una propiedad verificable en la pantalla.

75. **VERIFICACIÃ“N EN PANTALLA, con predicciÃ³n escrita antes de mirar y los QUINCE nÃºmeros exactos.** Escenario de trece reservas montado en local. Los ocho indicadores predichos y medidos: registradas **13**, reservadas **1**, entregadas **1**, devueltas **5**, canceladas **4**, no-retiradas **1**, no-devueltas **1**, semana **4**. Los seis estados suman 13 = propiedad de D-51 comprobada. Desglose por dÃ­a predicho y medido: **lunes 1, martes 1, miÃ©rcoles 0, jueves 2, viernes 2, sÃ¡bado 0, domingo 1** â€” el domingo prueba la frontera de zona: con `getUTCDay()` habrÃ­a salido lunes 2 y domingo 0. Las tres ramas verificadas: tabla vacÃ­a dice Â«TodavÃ­a no hay ninguna reserva registradaÂ»; con seis reservas y ninguna retirada pinta ocho tarjetas mÃ¡s Â«TodavÃ­a no se retirÃ³ ningunaÂ»; con trece pinta todo. Enlace Â«EstadÃ­sticasÂ» en la cabecera; operador rebotado a `/mostrador` al teclear la URL. Consola con cero errores y cero advertencias.

---

## QuÃ© construye esta tanda, y por quÃ© es distinta de todas las anteriores

La T3A dejÃ³ al personal atendiendo el mostrador. La T3B le da al **administrador** las siete pantallas que
le faltan: inventario, alta de producto, unidades, imÃ¡genes, reservas, dÃ­as inhabilitados, estadÃ­sticas,
personal y ajustes. Cierra **P0-4** â€”el Ãºltimo defecto de la auditorÃ­a que sigue abiertoâ€” y **Q-14**.

**Tres cosas la separan de las seis tandas anteriores, y cada una cambia cÃ³mo hay que verificarla.**

**1 Â· Es la primera tanda con un secreto de servidor.** `CLOUDINARY_API_SECRET` no lleva prefijo
`NEXT_PUBLIC_` y no puede llevarlo: en Next.js ese prefijo **inlinea la variable en el bundle del
navegador** *(D-28)*, que es exactamente el defecto P0-4 por el que empezÃ³ esta migraciÃ³n, con otro
prefijo. La firma se calcula en un route handler y el secreto no sale de ahÃ­.

**2 Â· Y por eso trae la Ãºnica excepciÃ³n del proyecto a Â«quien autoriza es RLSÂ».** Todas las pantallas
escritas hasta hoy hablan con Postgres, asÃ­ que la autorizaciÃ³n real la aplica una polÃ­tica y el cliente
solo es comodidad. **`/api/cloudinary/firma` no habla con Postgres: habla con Cloudinary.** No hay ninguna
polÃ­tica que lo detenga. Ese route handler **tiene que autorizar por su cuenta**, y si no lo hace,
cualquiera con sesiÃ³n â€”un alumnoâ€” consigue firmas para subir a la cuenta de Cloudinary de la universidad.
No es una violaciÃ³n del principio: es el Ãºnico sitio donde el principio no llega, y por eso hay que
escribirlo a mano. Ver la Task 4.

**3 Â· Toca el catÃ¡logo real.** 34 productos y 92 unidades de verdad, a diferencia de la T3A, que no podÃ­a
romper nada porque producciÃ³n tiene cero reservas. Un `UPDATE` mal apuntado aquÃ­ borra el trabajo de
alguien.

---

## Decisiones tomadas el 2026-08-12, al escribir este plan

**D-41 Â· Q-18 se aparca a la T4, y no entra en esta tanda.** Las notas de unidad las lee cualquier alumno
con sesiÃ³n â€”`unit_notes_select_auth` es `using (true)`,
`supabase/migrations/20260805195549_traceability.sql:37-38`â€”, medido en la T3A con un JWT de alumno que
recibiÃ³ HTTP 200 con la nota que describÃ­a la falta de otro. **No es un fallo nuevo: es D-2**, la
trazabilidad legible. Se aparca por dos motivos, y el segundo es el que decide: esta tanda ya carga un
riesgo nuevo â€”el primer secreto de servidorâ€” y sumarle una migraciÃ³n de RLS le pondrÃ­a un segundo riesgo de
naturaleza distinta en el mismo PR; y **recortar la lectura de notas obliga a reverificar la T3A entera**,
porque el historial del mostrador que la Task 7 acaba de construir lee esa misma tabla. Hoy estÃ¡ mitigado
por texto en los dos diÃ¡logos que escriben notas. **Consecuencia: la T3B no toca SQL.** La base se queda en
**23 migraciones y 147 aserciones en 24 archivos**, y si hiciera falta mÃ¡s SQL se registra como desvÃ­o
antes de escribirlo, igual que hizo la T3A con D-38.

**D-42 Â· Las categorÃ­as del formulario de alta se leen de la base, no de una lista fija.** F7 manda Â«14
predefinidas + las ya existentesÂ». En producciÃ³n hay **10 categorÃ­as reales** â€”consultadas hoyâ€”, asÃ­ que
una lista fija de catorce meterÃ­a cuatro opciones sin un solo producto detrÃ¡s y habrÃ­a que recuperarla del
tag `legacy/vite-final`. El desplegable se llena consultando `select distinct category from products`, mÃ¡s
un campo para escribir una nueva. **No hay lista que se quede vieja:** si maÃ±ana hay doce, salen doce. Es
la correcciÃ³n directa del error que el seed ya provocÃ³ tres veces en esta fase â€”`featured` en la 2A, las
imÃ¡genes en la 2B, los buffers en la 3Aâ€”: **el cÃ³digo no debe afirmar sobre los datos lo que solo los datos
pueden decir.**

**D-43 Â· `/admin/inventario` se abre en tres URL, no en una pantalla con pestaÃ±as.** El diseÃ±o Â§5 dice que
Â«`/admin/unidades` se absorbe en `/admin/inventario`Â», y eso se respeta: no hay una ruta de unidades de
primer nivel. Pero las cuatro tareas de inventario â€”listado, alta, unidades y notas, imÃ¡genesâ€” no caben en
una sola pantalla sin volver a inventar las pestaÃ±as que el propio diseÃ±o acaba de eliminar, con su propio
argumento: **Â«una pestaÃ±a que no es una URL no se puede enlazar, ni marcar, ni proteger por separadoÂ»**
*(Â§5)*. Quedan `/admin/inventario` (listado), `/admin/inventario/nuevo` (alta) y `/admin/inventario/[id]`
(unidades, notas e imÃ¡genes de un producto). Son subrutas de inventario, no una ruta hermana: la absorciÃ³n
que pide el diseÃ±o se cumple.

---

## Correcciones al diseÃ±o y al Ã­ndice, encontradas leyendo

Las cinco salieron de leer el diseÃ±o, la especificaciÃ³n y el esquema **antes** de escribir una lÃ­nea. Se
registran acÃ¡ para que nadie las descubra a mitad de ejecuciÃ³n.

**1 Â· `/admin/ajustes` no existe en el diseÃ±o: es una sexta ruta de admin.** La tabla de rutas de
`FASE_2_DISENO.md:404-408` lista **cinco** â€”inventario, reservas, dias, estadisticas, personalâ€” y el Ã¡rbol
de archivos de Â§5 (lÃ­neas 144-150) lista las mismas cinco. **Ninguna de las dos menciona `ajustes`.** La
ruta aparece por primera vez en el Ã­ndice de la T3B, al final del plan de la T3A, y su motivo es D-39: sin
una pantalla que edite `app_settings`, Q-14 no se puede cerrar por la salida elegida. **No es un defecto
del diseÃ±o**, es una consecuencia de una decisiÃ³n tomada cinco dÃ­as despuÃ©s de escribirlo; se anota fechada
en el diseÃ±o al cerrar la tanda, no se reescribe.

**2 Â· Q-14 no se cierra en la Task 10 sola, y el Ã­ndice de la T3A lo atribuye mal.** Ese Ã­ndice dice Â«10.
`/admin/ajustes`, que cierra Q-14Â». **Es incompleto, y conviene verlo antes de construir la Task 2.** Q-14
es sobre **`products.buffer_minutes`** â€”`FASE_2_DISENO.md:709-711`: Â«`products.buffer_minutes` solo tiene
`check (between 0 and 480)`. Un buffer de 45 minutos vuelve a dejar la cola del bloqueo a mitad de
bloqueÂ»â€”, y esa columna **no vive en `app_settings`: vive en el formulario de producto**, que es la Task 2.
Cerrar Q-14 son dos mitades:

- **Task 2 y Task 3** â€” el formulario de producto solo ofrece buffers mÃºltiplos de `slot_minutes`. Es la
  mitad que el enunciado de Q-14 describe.
- **Task 10** â€” al cambiar `slot_minutes` en `/admin/ajustes`, los buffers **ya guardados** pueden dejar de
  ser mÃºltiplos **retroactivamente**, sin tocar un solo producto. Esta mitad no estÃ¡ en el enunciado de
  Q-14 y es la que solo se ve teniendo las dos pantallas delante. *(Medido: con los datos de hoy esta mitad
  es **inalcanzable**, porque los ocho valores legales de `slot_minutes` dividen a 120. Sigue haciendo falta
  en cuanto exista un producto con otro buffer, que es lo que la Task 2 permite crear. El detalle, en el
  Step 2 de la Task 10.)*

**Q-14 no se puede declarar cerrado hasta que las dos mitades estÃ©n.** Lo verifica la Task 11.

**3 Â· F7 manda borrar una unidad en cascada manual, y no se puede.** Ya escrito en el plan de la T3A
â€”Â«Tres choquesÂ», punto 1â€”: `inventory_reservations` no tiene `GRANT` de `DELETE` para nadie ni polÃ­tica de
`DELETE`, y la FK `inventory_reservations_unit_id_fkey` no cascadea
(`supabase/migrations/20260805030123_baseline.sql:455`). **La baja de una unidad es ponerla en `retired`**,
que es justo para lo que existe ese estado. No se reabre: se ejecuta asÃ­ en la Task 3.

**4 Â· `/admin/personal` solo da de alta a quien ya iniciÃ³ sesiÃ³n alguna vez.** Ya escrito en Â«Tres
choquesÂ», punto 3: `staff_members.user_id` referencia `auth.users`, y la aplicaciÃ³n expone solo
`public` y `graphql_public` (`supabase/config.toml`). El Ãºnico sitio donde la aplicaciÃ³n ve un `user_id`
es `alumnos.auth_user_id`. **El alta se hace buscando por correo entre quienes ya entraron.** Se ejecuta
asÃ­ en la Task 9.

**5 Â· La Â«alerta rojaÂ» de F5 y F7 no tiene columna.** `inventory_unit_notes` no tiene severidad: son
`unit_id`, `note`, `created_by`, `created_at`. La alerta es **texto dentro de `note`**. Ya medido en la
T3A; se repite acÃ¡ porque la Task 3 vuelve a tocar notas y el nombre invita a buscar una columna que no
existe.

---

## Lo que ya estÃ¡ verificado contra el esquema

LeÃ­do en las migraciones y medido contra el proyecto real **el 2026-08-12**, antes de escribir este plan.
Sirve para no volver a mirarlo a mitad de una tarea.

| Pregunta | Respuesta, y dÃ³nde estÃ¡ escrita |
|---|---|
| Â¿El admin puede crear, editar y borrar productos, unidades e imÃ¡genes? | **SÃ­, las cuatro operaciones.** `grant insert, update, delete on products, product_images, inventory_units, disabled_days, campuses, carreras to authenticated` y una polÃ­tica `*_admin_all` `for all` con `private.is_admin()` en `using` y `with check` â€” `supabase/migrations/20260805195304_catalog_policies.sql:28-70` |
| Â¿Por quÃ© el `GRANT` es a `authenticated` y no a un rol de admin? | Porque el privilegio es condiciÃ³n **necesaria y no suficiente**: sin Ã©l la sentencia ni se planifica; con Ã©l, RLS sigue exigiendo `private.is_admin()`. EstÃ¡ escrito en la cabecera de ese mismo archivo, lÃ­neas 9-11 |
| Â¿Se puede borrar una unidad con historial de reservas? | **No.** Sin `GRANT` de `DELETE` sobre `inventory_reservations` y sin `ON DELETE CASCADE` en la FK â€” `20260805030123_baseline.sql:455`. La baja es `retired` |
| Â¿El cÃ³digo de unidad es Ãºnico globalmente? | **No: por producto.** `inventory_units_product_id_unit_code_key = UNIQUE (product_id, unit_code)`, medido en producciÃ³n. La validaciÃ³n del formulario compara contra el producto, no contra el inventario entero |
| Â¿Hay restricciÃ³n de Â«una sola imagen principalÂ»? | **No.** `product_images` solo tiene `PRIMARY KEY (id)` y `UNIQUE (cloudinary_public_id)`, medido. Que `is_main` sea uno por producto es **lÃ³gica de la aplicaciÃ³n**, y la base no la va a defender |
| Â¿`cloudinary_public_id` puede repetirse en `NULL`? | SÃ­: en Postgres los `NULL` no chocan en un `UNIQUE`. Por eso las 34 imÃ¡genes actuales conviven con esa restricciÃ³n teniÃ©ndolo todas en `NULL` |
| Â¿QuiÃ©n puede editar `app_settings`? | Solo el admin, y **solo seis columnas**: `grant update (booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes, daily_limit_per_product)`, mÃ¡s `app_settings_update_admin` â€” `20260806002459_reservation_settings.sql:66-78`. **Sin `INSERT` ni `DELETE` para nadie:** la fila Ãºnica no se borra ni se duplica por API |
| Â¿QuÃ© restricciones tiene `app_settings`? | `booking_window_days` 1-60 Â· `slot_minutes` 5-60 **y `60 % slot_minutes = 0`** Â· `min_duration_minutes` 5-480 Â· `daily_limit_per_product` 1-10 Â· `closing_time > opening_time` â€” mismo archivo, lÃ­neas 34-50. El divisor deja **ocho** valores posibles de `slot_minutes`: 5, 6, 10, 12, 15, 20, 30 y 60 |
| Â¿QuÃ© restricciones tiene `products`? | `max_duration_hours` 1-8 y `buffer_minutes` 0-480, las dos `not null` con default â€” mismo archivo, lÃ­neas 27-31 |
| Â¿El admin puede dar de alta y de baja personal? | SÃ­: `grant insert, update, delete on staff_members to authenticated` y `staff_admin_all` `for all` con `private.is_admin()` â€” `20260805194015_staff_policies.sql:13-24`. El operador solo se ve a sÃ­ mismo, `staff_select_self` |
| Â¿`cancel_reservation` le sirve al personal sobre una reserva ajena? | **SÃ­.** La comprobaciÃ³n de propiedad estÃ¡ guardada por `not private.is_staff()` â€” `20260812053243_cancel_before_start.sql:46-49` â€”, y la de D-38 tambiÃ©n, lÃ­neas 59-61. **El personal cancela cualquier reserva `reserved`, empezada o no**; lo que no puede nadie es cancelar una `active` |
| Â¿Por quÃ© el personal no puede cancelar una `active`? | Porque `active -> cancelled` no estÃ¡ entre las transiciones vÃ¡lidas de `enforce_reservation_transition()` â€” `20260806005731_reservation_state_machine.sql:38-39`. **Es la limitaciÃ³n exacta que D-40 asume** para el dÃ­a inhabilitado |
| Â¿Cancelar exige motivo tambiÃ©n para el personal? | **SÃ­**, y por dos puertas distintas: la RPC lo valida (`20260806012057_cancel_reservation_rpc.sql:27`) y el trigger de la mÃ¡quina de estados tambiÃ©n, cuando `new.status = 'cancelled'` (`20260806005731_...:47`). Los dos textos son parecidos y **no se contradicen**: son de sitios distintos |
| Â¿El personal puede escribir `cancellation_reason` por `UPDATE` directo? | SÃ­: `grant update (status, cancellation_reason) ... to authenticated` y `reservations_update_staff` â€” `20260806005731_reservation_state_machine.sql:62-68`. **Las dos columnas en un solo `PATCH` van en una sola sentencia**, asÃ­ que el trigger las ve juntas |
| Â¿QuÃ© se concede sobre `disabled_days`? | `select` a `authenticated`; `insert` **solo de `(date, reason)`** â€”revocado y reconcedido por columna en `20260805195549_traceability.sql:31-32`â€”; `update` y `delete` completos desde `catalog_policies.sql:28-31`. PolÃ­tica `disabled_days_admin_all` |
| Â¿QuiÃ©n corrige una sanciÃ³n puesta por error? | Solo `admin_set_ban(uuid, timestamptz)`, `security definer`, con `raise` propio si no es admin â€” `20260806013146_penalties.sql:67-82`. Existe tambiÃ©n `admin_set_alumno_activo(uuid, boolean)` |
| Â¿La aplicaciÃ³n necesita `service_role` para algo de esta tanda? | **No.** Todo lo de arriba lo hace el admin con su propia sesiÃ³n. Si un flujo la pidiera, no falta una clave: falta una polÃ­tica |
| Â¿QuÃ© componentes de `shadcn` existen ya? | `badge`, `button`, `card`, `dialog`, `input`, `label`, `separator`, `skeleton`, `table`, `textarea` â€” `components/ui/`. **`select` se borrÃ³ en la T2A** por no tener pantalla que lo usara; esta tanda lo necesita y hay que volver a aÃ±adirlo |
| Â¿`Button` reenvÃ­a su `ref`? | No usa `React.forwardRef` â€” `components/ui/button.tsx`. Medido en la T3A: la cadena `asChild` sobre un `<Button>` que monta `DialogContent` **no deja ninguna advertencia** en `npm run dev`, asÃ­ que ya no hay motivo para evitarla |
| Â¿DÃ³nde estÃ¡ el hueco de los enlaces de admin? | `components/cabecera-personal.tsx`, con la condiciÃ³n ya escrita y marcada: la T3A los dejÃ³ fuera porque serÃ­an enlaces a un 404. **Los activa la Task 1** |
| Â¿QuÃ© ruta da 404 hoy nada mÃ¡s entrar un admin? | `/admin/inventario`. `lib/auth/destino.ts` manda ahÃ­, y esa ruta no existe desde la T1 â€” verificado en pantalla el 2026-08-12 con sesiÃ³n de admin. **La Task 1 la crea** |

---

## La forma real de los datos

**Consultado el 2026-08-12 contra `zqfkzgdyeqxzgzpxgadi`, el proyecto real.** El seed local **no** es una
muestra de esto, y ya engaÃ±Ã³ tres veces en esta fase: leer el esquema dice quÃ© columnas existen, solo
consultar dice quÃ© hay dentro.

| Dato | Valor real |
|---|---|
| Productos | **34**, en **10** categorÃ­as |
| CategorÃ­as | Tablets 8 Â· Cables 8 Â· Celulares 4 Â· VR 4 Â· CÃ¡maras 3 Â· PerifÃ©ricos 2 Â· Audio 2 Â· Proyectores 1 Â· Otros 1 Â· Monitores/TV 1 |
| `featured = true` | **0 de 34** |
| `max_duration_hours` | **4 en los 34**, sin excepciÃ³n |
| `buffer_minutes` | **120 en los 34**. Ninguno desalineado hoy: `120 % 30 = 0` |
| Productos sin descripciÃ³n | 0 |
| Unidades | **92**, **todas `active`**. Ninguna en `maintenance` ni `retired` |
| Unidades por sede | San Miguel **46**, Monterrico **46** |
| **CÃ³digos de unidad: dos poblaciones** | **54** con cÃ³digo real numÃ©rico (`00192164`, `00192165`â€¦) **y las 38 restantes con prefijo `AUTO-`** (`AUTO-mo-uh40-4k-60hz-hdmi-8-01`), generado desde el nombre del producto |
| Unidades sin `asset_code` | **38**, y la correlaciÃ³n con las anteriores es **perfecta**: las 38 `AUTO-` son exactamente las 38 sin `asset_code`, y **no hay ninguna** `AUTO-` con `asset_code` ni ninguna no-`AUTO-` sin Ã©l |
| CÃ³digos de unidad duplicados | 0 |
| ImÃ¡genes | **34**, una por producto. **0 productos sin imagen** |
| Host de las imÃ¡genes | **`res.cloudinary.com` las 34**, asÃ­ que `next/image` las sirve con el `remotePatterns` que ya existe |
| `cloudinary_public_id` | **`NULL` en las 34** |
| `is_main = true` | 34 â€” una por producto, coherente |
| Notas de unidad | **58** |
| Sedes | 2 Â· Carreras | **60** |
| Reservas | **0** |
| Personal | **1**, rol `admin`, activo |
| Cuentas de alumno | 1 |
| DÃ­as inhabilitados | **2, los dos en el pasado.** Ninguno futuro |
| `app_settings` | `slot_minutes` **30** Â· `min_duration_minutes` **30** *(D-19 aplicado)* Â· ventana **7** dÃ­as Â· **08:00-22:00** Â· lÃ­mite diario **1** |

**Tres cosas que esta tabla dice y hay que leer despacio:**

1. **Las 38 unidades `AUTO-` son marcadores, no inventario descrito.** El sistema viejo las generÃ³ desde el
   nombre del producto cuando no tenÃ­a cÃ³digo fÃ­sico. **El listado de la Task 1 tiene que hacerlas
   visibles**, porque son el 41 % del inventario y nadie puede identificarlas en un estante. Eso es
   visibilidad, no estÃ©tica.
2. **Ninguna imagen tiene `cloudinary_public_id`, y las 34 estÃ¡n en Cloudinary igual.** Se ven bien y **no
   se pueden identificar en la cuenta**. La Task 5 no puede ofrecer Â«borrar de CloudinaryÂ» sobre ellas â€”y
   F7 dice que el borrado no toca Cloudinary de todas formasâ€”, pero sÃ­ reordenarlas, fijar la principal y
   borrar la fila, que van todas por `id`.
3. **Los dos dÃ­as inhabilitados estÃ¡n en el pasado, asÃ­ que D-40 no tiene nada que cancelar hoy.** La Task 7
   se verifica montando un escenario en local, nunca contra producciÃ³n.

---

## Estructura de archivos

```
app/(personal)/admin/
  layout.tsx                        role = 'admin'; si es operador, al mostrador
  inventario/page.tsx               Task 1  Â· listado
  inventario/nuevo/page.tsx         Task 2  Â· alta con unidades
  inventario/[id]/page.tsx          Task 3 y 5 Â· unidades, notas e imÃ¡genes
  reservas/page.tsx                 Task 6
  dias/page.tsx                     Task 7
  estadisticas/page.tsx             Task 8
  personal/page.tsx                 Task 9
  ajustes/page.tsx                  Task 10

app/api/cloudinary/firma/route.ts   Task 4  Â· POST, cierra P0-4

lib/admin/
  consultas.ts                      lecturas del inventario
  acciones.ts                       Server Actions de producto y unidad
  reservas.ts                       lectura de /admin/reservas
  filtros.ts                        filtrado puro            â†’ Vitest
  dias.ts                           Server Actions de /admin/dias
  estadisticas.ts                   agregados puros          â†’ Vitest
  personal.ts                       Server Actions de /admin/personal
  ajustes.ts                        Server Actions + mÃºltiplos â†’ Vitest (Q-14)
lib/cloudinary/
  firma.ts                          cÃ¡lculo puro de la firma â†’ Vitest

components/admin/
  tabla-inventario.tsx      formulario-producto.tsx    filas-unidad.tsx
  panel-unidades.tsx        dialogo-estado-unidad.tsx  subida-imagenes.tsx
  galeria-admin.tsx         tabla-reservas.tsx         filtros-reservas.tsx
  dialogo-cancelar-admin.tsx  panel-dias.tsx           panel-estadisticas.tsx
  tabla-personal.tsx        formulario-ajustes.tsx
components/ui/select.tsx              se vuelve a aÃ±adir con `shadcn add`
```

> ### âš  El alias `@/` no funciona bajo Vitest, y el modo de fallo es el peligroso
>
> No hay `vitest.config.ts`, asÃ­ que Vitest no conoce el alias que declara `tsconfig.json`.
> **`typecheck` y `build` pasan en verde con el alias; solo `vitest run` se rompe.** Los cuatro mÃ³dulos de
> arriba marcados Â«â†’ VitestÂ» â€”`filtros.ts`, `estadisticas.ts`, `ajustes.ts`, `firma.ts`â€” y cualquier
> mÃ³dulo que un test cargue **usan imports relativos**, no `@/`. Se descubriÃ³ en la Task 8 de la T3A, con
> `filtro.ts` como primer mÃ³dulo probado que importaba un **valor** y no solo un `import type`.

---

## Global Â· Lo que vale para las trece tareas

- **PowerShell 5.1.** Sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Nada de here-strings.
- **Los documentos llevan tildes.** La regla de Â«sin acentos ni eÃ±eÂ» es de los **comentarios de cÃ³digo y
  los mensajes de commit**, no de estos documentos. El encargo de cierre de la T3A la citÃ³ mal y costÃ³ una
  correcciÃ³n.
- **La interfaz tutea.** El voseo es de los comentarios y los documentos.
- **Nada de estÃ©tica.** Un compaÃ±ero hace la fase visual. SÃ­ funcionalidad, **visibilidad** â€”que algo
  aparezca cuando debe y desaparezca cuando no debeâ€” y textos.
- **Se prueba por `http://127.0.0.1:3000`**, nunca por `localhost:3000` *(D-33)*.
- **Para `npm run build` hay que parar `npm run dev`:** comparten `.next/` y eso produce falsos en tres
  direcciones.
- **El Ã¡rbitro de si una pantalla funciona es `npm run build`**, no el navegador ni el servidor de
  desarrollo. Pero **abrir la pantalla sigue siendo obligatorio**: es lo Ãºnico que ha encontrado los fallos
  de esta fase.
- **Los cuatro comandos al cerrar cada tarea:** `npm run typecheck`, `npm run lint`, `npm run test`,
  `npm run build`.

---

# Task 0 Â· Saldar la deuda documental

**Va primera y no Ãºltima, a propÃ³sito.** Cuatro sitios afirman hoy algo falso â€”que la migraciÃ³n 23 no estÃ¡
en el remotoâ€”, y lo estÃ¡n afirmando **desde el 2026-08-12**, cuando se empujÃ³ despuÃ©s de escribir los
documentos de cierre. Dejarlo para la Task 12 los mantiene falsos durante toda la tanda, justo en los dos
archivos que se consultan para saber el estado. Y hay un motivo operativo: **las ediciones de documentaciÃ³n
se cierran antes de pasar comandos de git**, nunca despuÃ©s, o quedan cambios sin versionar que bloquean el
siguiente `checkout`.

**Files:**
- Modify: `MIGRATION_DOCS/ESTADO_Y_PLAN.md` (lÃ­nea 35 y lÃ­nea 751)
- Modify: `CLAUDE.md` (lÃ­nea 168 y lÃ­nea 173)

**Los cuatro sitios, verificados el 2026-08-12.** Los nÃºmeros de lÃ­nea son de hoy: **comprobarlos antes de
editar**, no usarlos a ciegas.

| Archivo:lÃ­nea | Texto falso hoy | CÃ³mo se corrige |
|---|---|---|
| `ESTADO_Y_PLAN.md:35` | Â«estÃ¡ **comiteada en `8ddcc01`** desde la Task 2. Sigue **sin empujar al remoto**.Â» | Es el **resumen ejecutivo**: se consulta para saber el estado de HOY. CorrecciÃ³n fechada **encima**, con el mismo formato `âš  **Corregido el â€¦**` que ya usan las lÃ­neas 29 y 32 |
| `ESTADO_Y_PLAN.md:751` | Â«**Sigue sin empujarse al remoto.**Â» | Es la **bitÃ¡cora**, y es un **hecho fechado**: era cierto el 2026-08-12 al cerrar la tanda. La correcciÃ³n va **al lado, dentro de la misma celda**, no encima: un dato que envejece en la bitÃ¡cora solo miente sobre su fecha |
| `CLAUDE.md:168` | Â«sin empujar todavÃ­aÂ» | CorrecciÃ³n fechada, tachando lo anterior |
| `CLAUDE.md:173` | Â«medido con `npx supabase test db`, sin empujar al remotoÂ» | CorrecciÃ³n fechada, tachando lo anterior |

- [ ] **Step 1: Verificar que las cuatro lÃ­neas siguen donde dice la tabla**

Run: `Select-String -Path MIGRATION_DOCS\ESTADO_Y_PLAN.md,CLAUDE.md -Pattern 'sin empuj'`

Expected: cuatro coincidencias en `ESTADO_Y_PLAN.md:35`, `ESTADO_Y_PLAN.md:751`, `CLAUDE.md:168` y
`CLAUDE.md:173`. **Si los nÃºmeros no coinciden, se usan los que salgan**, no los de la tabla. *(Hay una
quinta coincidencia legÃ­tima en `CLAUDE.md:159` â€”Â«sin empujarÂ» referido a la T2Bâ€” y una sexta en
`PLANES/TANDA_3.md:38`: esas **no** se tocan.)*

- [ ] **Step 2: Corregir el resumen ejecutivo de `ESTADO_Y_PLAN.md`**

El texto que sustituye a la lÃ­nea 35, conservando lo anterior tachado:

```markdown
~~**TodavÃ­a no estÃ¡ en el remoto**: existe en el Ã¡rbol de trabajo, sin comitear.~~ âš  **Corregido el
2026-08-12:** estÃ¡ **comiteada en `8ddcc01`** desde la Task 2. ~~Sigue **sin empujar al remoto**.~~
âš  **Corregido otra vez el 2026-08-12, mÃ¡s tarde el mismo dÃ­a:** la migraciÃ³n 23 **ya estÃ¡ en el remoto**.
Se empujÃ³ al cerrar la sesiÃ³n, *despuÃ©s* de escribir los documentos de cierre, que por eso decÃ­an lo
contrario. `migration list` muestra las **23 con `local` y `remote` idÃ©nticos**, y se verificÃ³ **por el
efecto y no por el registro** â€”que una migraciÃ³n figure aplicada no dice que la regla existaâ€”:
`pg_proc.prosrc` de `public.cancel_reservation` en el proyecto real contiene el texto del rechazo de D-38
y la comparaciÃ³n `v_start_at <= now()`, sigue `security definer`, `authenticated` la ejecuta y **`anon`
no**. **Q-17 queda cerrado tambiÃ©n en producciÃ³n.**
```

- [ ] **Step 3: Corregir la entrada de bitÃ¡cora de `ESTADO_Y_PLAN.md`**

Dentro de la celda de la fila `2026-08-12` del **CIERRE DE LA TANDA 3A**, la frase Â«**Sigue sin empujarse
al remoto.**Â» se sustituye por:

```markdown
~~Sigue sin empujarse al remoto.~~ *(Cierto al escribir esta entrada; la migraciÃ³n 23 se empujÃ³ unas horas
despuÃ©s, el mismo 2026-08-12 â€” ver la entrada siguiente.)*
```

**Y se aÃ±ade una fila nueva al final de la bitÃ¡cora**, que es donde va el hecho nuevo:

```markdown
| 2026-08-12 | **La migraciÃ³n 23 empujada a producciÃ³n, y Q-17 cerrado tambiÃ©n en el proyecto real.** `migration list` muestra las **23 con `local` y `remote` idÃ©nticos**. **Verificado por el EFECTO y no por el registro** â€”que una migraciÃ³n figure aplicada no dice que la regla existaâ€”: `pg_proc.prosrc` de `public.cancel_reservation` contiene el texto del rechazo de D-38 y la comparaciÃ³n `v_start_at <= now()`; sigue `security definer`; `authenticated` la ejecuta y **`anon` no**, lo que confirma otra vez que **`create or replace` conserva el `revoke`**. **El CLI de Supabase estaba SIN AUTENTICAR y por eso fallaba con `401 Unauthorized`**: no faltaba el vÃ­nculo â€”`supabase/.temp/project-ref` tenÃ­a el proyecto correctoâ€” sino el token, que no existÃ­a ni en `~/.supabase/access-token` ni en `SUPABASE_ACCESS_TOKEN`. Se arregla con `npx supabase login`, que es interactivo. **El MCP de Supabase tiene credenciales propias y funcionÃ³ aunque el CLI no**, asÃ­ que son dos caminos independientes y sirven para contrastarse: el push se comprobÃ³ con los dos. **Un aviso de advisor que no estaba en la lista de intencionales: `auth_leaked_password_protection` desactivada.** Los otros seis siguen siendo los de siempre â€”las dos `admin_set_*`, `available_slots`, `available_units`, `create_reservation` y `cancel_reservation`â€”. No es urgente, porque se entra por magic link y no por contraseÃ±a, pero es **material de la T4** |
```

- [ ] **Step 4: Corregir los dos sitios de `CLAUDE.md`**

En la lÃ­nea 168, `sin empujar todavÃ­a` pasa a:

```markdown
~~sin empujar todavÃ­a~~ âš  **empujado el 2026-08-12: PR #29, merge en `6b5dca2`, cuatro corridas de CI y
las cuatro verdes**
```

En la lÃ­nea 173, `sin empujar al remoto` pasa a:

```markdown
~~sin empujar al remoto~~ âš  **Corregido el 2026-08-12: la migraciÃ³n 23 YA ESTÃ en producciÃ³n**, con las 23
en `local` y `remote` idÃ©nticas, y verificada por el efecto en `pg_proc.prosrc`
```

- [ ] **Step 5: Commit**

```powershell
git add MIGRATION_DOCS/ESTADO_Y_PLAN.md CLAUDE.md
```

```powershell
git commit -m "Tanda 3B.0: saldar la deuda documental de la migracion 23" -m "Cuatro sitios decian que la migracion 23 seguia sin empujarse. Se empujo el 2026-08-12, despues de escribir los documentos de cierre de la T3A. Se corrige con marca fechada, sin reescribir: en el resumen ejecutivo la correccion va encima, y en la bitacora al lado, porque alli es un hecho fechado que solo miente sobre su fecha."
```

**Criterio de cierre:** las cuatro lÃ­neas corregidas, ninguna reescrita sin marca, y `git status` limpio.

---

# Task 1 Â· Andamio de `/admin` y listado de inventario

**Cierra el 404 que arrastra el proyecto desde la T1.** `lib/auth/destino.ts` manda al admin a
`/admin/inventario` nada mÃ¡s entrar, y esa ruta no existe: verificado en pantalla el 2026-08-12 con sesiÃ³n
de admin. No es un fallo nuevo, es el hueco que esta tanda tapa. **Y activa los enlaces de admin en la
cabecera**, que la T3A dejÃ³ fuera a propÃ³sito porque habrÃ­an sido enlaces a un 404.

**Files:**
- Create: `app/(personal)/admin/layout.tsx`
- Create: `app/(personal)/admin/inventario/page.tsx`
- Create: `lib/admin/consultas.ts`
- Create: `components/admin/tabla-inventario.tsx`
- Modify: `components/cabecera-personal.tsx`

**Interfaces â€” lo que esta tarea produce y las demÃ¡s consumen:**

```ts
// lib/admin/consultas.ts
export type FilaInventario = {
  id: string;
  nombre: string;
  categoria: string | null;
  maxDuracionHoras: number;
  bufferMinutos: number;
  unidadesActive: number;
  unidadesMaintenance: number;
  unidadesRetired: number;
  unidadesSinCodigo: number;   // asset_code is null
  imagenes: number;
};
export async function listarInventario(): Promise<FilaInventario[]>;
```

- [ ] **Step 0: Medir antes de escribir**

Con el stack local arrancado y un JWT de **admin** firmado a mano (receta en Â«El entornoÂ», abajo), pedir
por PostgREST el producto con sus unidades e imÃ¡genes embebidas:

```
GET /rest/v1/products?select=id,name,category,max_duration_hours,buffer_minutes,inventory_units(status,asset_code),product_images(id)
```

**QuÃ© se estÃ¡ midiendo, y por quÃ© no se puede deducir:** la T2A ya se topÃ³ con que PostgREST **no** embebe
`product_availability` desde `products` en ninguna de las dos direcciones (`PGRST200`). Que `inventory_units`
sÃ­ se embeba **no se sigue de eso**: es otra FK. Los dos desenlaces:

- **Embebe** â†’ `listarInventario()` es **una** consulta y cuenta en memoria.
- **No embebe** (`PGRST200`) â†’ dos consultas y agrupaciÃ³n en TypeScript. Se anota como correcciÃ³n al plan.

**Repetir la misma consulta con un JWT de alumno** y confirmar que `inventory_units` responde â€”`units_select_auth`
es `using (true)`â€” pero que un `PATCH` sobre `products` no toca ninguna fila. Es el control que separa
Â«funcionaÂ» de Â«funciona solo para quien debeÂ».

- [ ] **Step 1: `app/(personal)/admin/layout.tsx`**

Copia la forma de `app/(personal)/layout.tsx`, con su mismo comentario de fondo: **este layout no autoriza
nada.** Quien autoriza es `private.is_admin()` dentro de la base. Si un operador escribe `/admin/inventario`
a mano, lo que le niega los datos es RLS; redirigirlo acÃ¡ es comodidad.

```tsx
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Este layout NO autoriza nada, igual que app/(personal)/layout.tsx: quien
// autoriza es private.is_admin() dentro de la base. Un operador que escriba
// /admin/inventario a mano no ve datos porque las politicas *_admin_all de
// supabase/migrations/20260805195304_catalog_policies.sql se los niegan, no
// porque este archivo lo redirija. Si borrarlo abriera un agujero, el agujero
// estaba en la base.
//
// Al mostrador y no a /auth/error: un operador que llega aca no se equivoco de
// credenciales, se equivoco de pantalla, y su sitio SI existe.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  if (!sub) {
    redirect("/login");
  }

  const { data: staff } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", sub)
    .eq("activo", true)
    .maybeSingle();

  if (staff?.role !== "admin") {
    redirect("/mostrador");
  }

  return <>{children}</>;
}
```

**Sin `CabeceraPersonal` ni `Pie` acÃ¡:** el layout de `(personal)` ya los monta, y este vive dentro. Ponerlos
otra vez duplica la cabecera â€” el mismo defecto que la T2A midiÃ³ con el 404 dentro de un grupo.

- [ ] **Step 2: `lib/admin/consultas.ts`**

Con el desenlace del Step 0. Los conteos se calculan en TypeScript sobre el embed, no con `count` de
PostgREST, porque hacen falta **cuatro** conteos distintos sobre la misma colecciÃ³n.

- [ ] **Step 3: `components/admin/tabla-inventario.tsx`**

Tabla con `components/ui/table.tsx`, ya instalado. Una fila por producto: nombre, categorÃ­a, duraciÃ³n
mÃ¡xima, buffer, unidades por estado, imÃ¡genes.

**La columna que no es obvia y hay que poner: Â«sin cÃ³digoÂ».** 38 de las 92 unidades no tienen `asset_code`
y llevan un `unit_code` `AUTO-â€¦` generado desde el nombre del producto. Son el 41 % del inventario y **nadie
las puede identificar en un estante**. Que se vean es visibilidad, no estÃ©tica.

- [ ] **Step 4: `app/(personal)/admin/inventario/page.tsx`**

Server Component: llama a `listarInventario()` y monta la tabla. Enlace a `/admin/inventario/nuevo` y cada
fila enlaza a `/admin/inventario/[id]` â€” las dos rutas llegan en las Tasks 2 y 3, asÃ­ que **hasta entonces
son enlaces a un 404**. Es el mismo caso que la T3A resolviÃ³ no poniÃ©ndolos: **acÃ¡ sÃ­ se ponen**, porque las
dos rutas entran en esta misma tanda y en los dos commits siguientes. Se deja escrito en un comentario.

- [ ] **Step 5: Activar los enlaces de admin en `components/cabecera-personal.tsx`**

La condiciÃ³n ya estÃ¡ escrita y marcada desde la T3A. Se activan **solo** los enlaces cuyas rutas existan
al cerrar esta tarea: `/admin/inventario`. Los demÃ¡s se van aÃ±adiendo en su tarea. **Un enlace a un 404 en
la cabecera lo ve el admin en todas las pantallas**, que es peor que dentro de una tabla.

- [ ] **Step 6: Los cuatro comandos**

Run: `npm run typecheck; npm run lint; npm run test; npm run build`
Expected: los cuatro en verde. **`build` de 14 rutas a 15**, con las mismas tres estÃ¡ticas
â€”`/_not-found`, `/faq`, `/login`â€”. `/admin/inventario` es **dinÃ¡mica**: lee sesiÃ³n.
`npm run test` sigue en **65**, sin cambios: esta tarea no aÃ±ade lÃ³gica pura.

- [ ] **Step 7: Verificar en pantalla, con sesiÃ³n de admin de verdad**

Entrar por magic link recogido de Mailpit. **La predicciÃ³n a comprobar, escrita antes de mirar:** el reparto
de `destino()` cae en `/admin/inventario` **y ya no da 404**. Con el seed local se ven **4 productos**, no
34: el seed no es una muestra de producciÃ³n, y confundirlos es el error que ya costÃ³ tres veces.

**Y el control que separa Â«funcionaÂ» de Â«funciona solo para quien debeÂ»:** entrar con `operador@upc.edu.pe`
y escribir `/admin/inventario` a mano. Tiene que caer en `/mostrador`.

- [ ] **Step 8: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin components/cabecera-personal.tsx
```

```powershell
git commit -m "Tanda 3B.1: andamio de /admin y listado de inventario" -m "Cierra el 404 de /admin/inventario que arrastraba desde la T1. El layout de admin no autoriza: redirige por comodidad, y quien niega los datos es private.is_admin(). Se activan los enlaces de admin de la cabecera, que la T3A dejo fuera. La columna sin codigo hace visibles las 38 unidades AUTO- sin asset_code."
```

---

# Task 2 Â· Alta de producto con sus unidades

**F7, primera mitad.** Un solo formulario: nombre, categorÃ­a, descripciÃ³n, duraciÃ³n mÃ¡xima, buffer, y una
fila por unidad con cÃ³digo, sede y anotaciÃ³n inicial. **Y la primera mitad de Q-14.**

**Files:**
- Create: `app/(personal)/admin/inventario/nuevo/page.tsx`
- Create: `components/admin/formulario-producto.tsx`
- Create: `components/admin/filas-unidad.tsx`
- Create: `lib/admin/acciones.ts`
- Create: `lib/admin/ajustes.ts` *(solo `multiplosDeSlot()`; el resto lo aÃ±ade la Task 10)*
- Create: `lib/admin/ajustes.test.ts`
- Modify: `lib/admin/consultas.ts` *(aÃ±ade `listarCategorias()` y `listarSedes()`)*

**Interfaces:**

```ts
// lib/admin/ajustes.ts  â€” IMPORTS RELATIVOS: un test lo carga
export function multiplosDeSlot(slotMinutes: number, maximo: number): number[];

// lib/admin/consultas.ts
export async function listarCategorias(): Promise<string[]>;
export async function listarSedes(): Promise<{ id: string; nombre: string }[]>;

// lib/admin/acciones.ts
export type ResultadoAdmin = { error: string } | null;
export type UnidadNueva = { unitCode: string; assetCode: string; campusId: string; nota: string };
export async function crearProducto(datos: {
  nombre: string; categoria: string; descripcion: string;
  maxDuracionHoras: number; bufferMinutos: number; unidades: UnidadNueva[];
}): Promise<ResultadoAdmin | { productoId: string }>;
```

- [ ] **Step 1: `multiplosDeSlot()` y su prueba, primero la prueba**

**Esta es la mitad de Q-14 que el Ã­ndice de la T3A no atribuye a esta tarea.** `products.buffer_minutes`
solo tiene `check (between 0 and 480)`; que sea mÃºltiplo de `slot_minutes` **no lo defiende la base**, y
por eso lo tiene que ofrecer la interfaz. Es la tercera de las tres salidas que el diseÃ±o escribiÃ³ en su
Â§15, elegida por D-39.

```ts
import { describe, expect, it } from 'vitest';

import { multiplosDeSlot } from './ajustes';

describe('multiplosDeSlot', () => {
  it('con slot de 30 y tope 480 ofrece 0, 30, 60 ... 480', () => {
    const r = multiplosDeSlot(30, 480);
    expect(r[0]).toBe(0);
    expect(r[1]).toBe(30);
    expect(r.at(-1)).toBe(480);
    expect(r).toHaveLength(17);
  });

  it('incluye el 0: un buffer de cero es valido y el check lo permite', () => {
    expect(multiplosDeSlot(30, 480)).toContain(0);
  });

  it('con slot de 20 el 120 real de produccion sigue siendo multiplo', () => {
    expect(multiplosDeSlot(20, 480)).toContain(120);
  });

  it('con slot de 20 el 30 deja de serlo, que es justo lo que Q-14 describe', () => {
    expect(multiplosDeSlot(20, 480)).not.toContain(30);
  });

  it('nunca pasa del tope: 480 es el check de buffer_minutes', () => {
    expect(Math.max(...multiplosDeSlot(60, 480))).toBe(480);
  });
});
```

- [ ] **Step 2: Verla fallar**

Run: `npm run test`
Expected: **FAIL** con `Failed to resolve import "./ajustes"` â€” el mÃ³dulo aÃºn no existe.

- [ ] **Step 3: `multiplosDeSlot()`**

```ts
// Q-14, primera mitad. `products.buffer_minutes` solo tiene
// `check (buffer_minutes between 0 and 480)` -- ver
// supabase/migrations/20260806002459_reservation_settings.sql:30-31 --, asi
// que la base NO defiende que sea multiplo de `slot_minutes`. La defensa es
// esta funcion, que es la tercera de las tres salidas que FASE_2_DISENO.md
// escribio en su seccion 15, elegida por D-39.
//
// La segunda mitad de Q-14 esta en la Task 10: cambiar `slot_minutes` en
// /admin/ajustes puede desalinear RETROACTIVAMENTE buffers ya guardados, y
// esta funcion no puede verlo porque solo mira hacia adelante.
export function multiplosDeSlot(slotMinutes: number, maximo: number): number[] {
  const salida: number[] = [];
  for (let v = 0; v <= maximo; v += slotMinutes) {
    salida.push(v);
  }
  return salida;
}
```

- [ ] **Step 4: Verla pasar**

Run: `npm run test`
Expected: **PASS**, `65 â†’ 70` pruebas, de 5 archivos a **6**.

- [ ] **Step 5: `lib/admin/acciones.ts` â€” `crearProducto()`**

**El orden importa y no hay transacciÃ³n.** La API REST no da una transacciÃ³n entre dos llamadas del cliente
â€”la misma lecciÃ³n que `marcarNoDevuelta()` dejÃ³ escrita en la T3Aâ€”, asÃ­ que hay que elegir el orden por su
peor caso:

- **Producto primero, unidades despuÃ©s** *(el elegido, y ademÃ¡s el Ãºnico posible: la FK `unit.product_id`
  exige que el producto exista)*. Si el `INSERT` de unidades falla, queda **un producto sin unidades**. Es
  visible en el listado de la Task 1 â€”la columna de unidades en ceroâ€” y se arregla aÃ±adiÃ©ndolas desde la
  Task 3. **Recuperable.**
- Al revÃ©s es imposible por la FK, asÃ­ que no hay disyuntiva real. **Lo que sÃ­ hay que hacer es dejar el
  producto huÃ©rfano visible**, no silencioso.

Las unidades van en **un solo `INSERT` con un array**, no en un bucle: una sentencia es atÃ³mica, asÃ­ que
o entran las diez o no entra ninguna. Un bucle deja Â«las tres primeras sÃ­ y la cuarta noÂ».

**ValidaciÃ³n de cÃ³digos repetidos:** `UNIQUE (product_id, unit_code)`, medido en producciÃ³n. La
comprobaciÃ³n en la interfaz es **dentro del formulario** â€”dos filas con el mismo cÃ³digoâ€”, y la de la base
es la red de seguridad. `23505` traducido a texto propio; lo demÃ¡s, crudo.

- [ ] **Step 6: El formulario**

`components/admin/formulario-producto.tsx` con `components/admin/filas-unidad.tsx` para las filas. AÃ±adir
`select` con `npx shadcn@latest add select` â€”**se borrÃ³ en la T2A** por no tener pantalla que lo usara, y
esta la tieneâ€”. **Correr primero `--dry-run`** y mirar el diff de `globals.css`: D-30 dice que `shadcn`
puede pisar los tokens por cascada, y en la T3A no se repitiÃ³ **porque se mirÃ³ el diff**, no porque el build
siguiera verde.

- **CategorÃ­a:** desplegable con las que devuelve `listarCategorias()` *(D-42)*, mÃ¡s un campo para escribir
  una nueva. **No una lista fija de 14.**
- **Buffer:** desplegable con `multiplosDeSlot(slotMinutes, 480)`, leyendo `slot_minutes` de `app_settings`.
- **DuraciÃ³n mÃ¡xima:** 1 a 8, el `check` de la columna.
- **Sede de cada unidad:** desplegable con `listarSedes()` â€” son 2.
- **AnotaciÃ³n inicial por unidad:** opcional. Si viene, se inserta en `inventory_unit_notes` despuÃ©s de la
  unidad, con el mismo orden y el mismo motivo que `marcarNoDevuelta()`.

- [ ] **Step 7: Los cuatro comandos**

Expected: verde. `build` de 15 rutas a **16**. `test` en **70** en 6 archivos.

- [ ] **Step 8: Verificar en pantalla**

Crear un producto con 3 unidades. Comprobar **en la base**: una fila en `products`, tres en
`inventory_units` con el `campus_id` correcto, y las notas iniciales en `inventory_unit_notes`. Provocar el
duplicado â€”dos filas con el mismo cÃ³digoâ€” y ver el rechazo. **Y comprobar que el desplegable de buffer no
ofrece 45** con `slot_minutes = 30`, que es Q-14 hecho pantalla.

- [ ] **Step 9: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin components/ui/select.tsx
```

```powershell
git commit -m "Tanda 3B.2: alta de producto con sus unidades" -m "F7 primera mitad. Las categorias se leen de la base y no de una lista fija de 14 (D-42): en produccion hay 10, y una lista fija meterÃ­a cuatro vacias. multiplosDeSlot() es la primera mitad de Q-14, la que el indice de la T3A no atribuye a esta tarea: buffer_minutes vive en el formulario de producto, no en app_settings. Las unidades entran en un solo INSERT con array: una sentencia es atomica y un bucle deja tres si y la cuarta no."
```

---

# Task 3 Â· Estado de unidad y sus notas, con la baja como `retired`

**F7, segunda mitad.** El detalle de un producto: sus unidades, el cambio de estado, el historial de notas
y el alta de unidades sueltas. **La baja de una unidad es `retired`, no un `DELETE`.**

**Files:**
- Create: `app/(personal)/admin/inventario/[id]/page.tsx`
- Create: `components/admin/panel-unidades.tsx`
- Create: `components/admin/dialogo-estado-unidad.tsx`
- Modify: `lib/admin/acciones.ts` *(aÃ±ade `cambiarEstadoUnidad()`, `agregarUnidad()`, `editarProducto()`)*
- Modify: `lib/admin/consultas.ts` *(aÃ±ade `leerProducto()`)*
- Reutiliza: `components/mostrador/historial-notas.tsx` y `components/mostrador/dialogo-nota.tsx`

**Interfaces:**

```ts
export async function cambiarEstadoUnidad(
  unitId: string,
  estado: 'active' | 'maintenance' | 'retired',
  nota: string,          // obligatoria: el porque de la baja
): Promise<ResultadoAdmin>;
export async function agregarUnidad(productoId: string, unidad: UnidadNueva): Promise<ResultadoAdmin>;
export async function editarProducto(
  productoId: string,
  datos: { nombre: string; categoria: string; descripcion: string;
           maxDuracionHoras: number; bufferMinutos: number },
): Promise<ResultadoAdmin>;
```

- [ ] **Step 1: El texto que hay que escribir bien, y por quÃ© va primero**

**F7 manda un borrado en cascada que no se puede hacer, y el admin va a buscar ese botÃ³n.** No basta con
que no exista: **la pantalla tiene que decir por quÃ©**. Un botÃ³n ausente sin explicaciÃ³n se lee como un
defecto, y alguien acabarÃ¡ pidiÃ©ndolo o â€”peorâ€” borrando filas por SQL.

El texto, junto a la acciÃ³n de baja *(tutea, como toda la interfaz)*:

> **Dar de baja no borra la unidad.** La pasa a Â«retiradaÂ»: deja de estar disponible para reservar y
> conserva su historial de prÃ©stamos y anotaciones. Una unidad con reservas registradas no se puede borrar,
> y es a propÃ³sito â€” borrarla dejarÃ­a reservas apuntando a un equipo que ya no existe.

- [ ] **Step 2: `cambiarEstadoUnidad()` con la nota obligatoria**

**La nota es obligatoria y la decide este plan, no el esquema.** F7 no la exige para el cambio de estado
â€”solo F5 la fuerza para Â«No se devolviÃ³Â»â€”, pero **una unidad que desaparece del catÃ¡logo sin explicaciÃ³n es
exactamente el caso que la trazabilidad existe para cubrir** *(D-2)*. El mismo criterio que la T3A aplicÃ³ a
`marcarNoDevuelta()`.

**El orden, otra vez, y por el mismo motivo:** **primero la nota, despuÃ©s el estado.** Si el `INSERT` falla,
la unidad no cambia y el admin reintenta. Al revÃ©s quedarÃ­a una unidad retirada sin rastro de por quÃ©. La
T3A **midiÃ³** esa carrera y dejÃ³ constancia de su costo real: una nota huÃ©rfana si el `UPDATE` falla
despuÃ©s. Una nota de mÃ¡s es recuperable; un equipo retirado a ciegas, no.

- [ ] **Step 3: El aviso de privacidad en el diÃ¡logo de nota**

`dialogo-nota.tsx` ya avisa desde la Task 7 de la T3A de que la nota **la lee cualquiera con sesiÃ³n**
â€”Q-18, `unit_notes_select_auth` es `using (true)`â€”. **Se reutiliza tal cual, con su aviso.** Si esta tarea
monta un diÃ¡logo propio en vez de reutilizarlo, **tiene que llevar el mismo aviso**: la asimetrÃ­a entre dos
diÃ¡logos que escriben en la misma tabla ya fue un defecto real en la T3A, y el que faltaba era justo el mÃ¡s
expuesto.

- [ ] **Step 4: `agregarUnidad()` y `editarProducto()`**

`agregarUnidad()` valida el cÃ³digo contra **las unidades de ese producto**, no contra el inventario entero:
la restricciÃ³n es `UNIQUE (product_id, unit_code)`.

`editarProducto()` vuelve a ofrecer el buffer por `multiplosDeSlot()`. **Es la misma mitad de Q-14 que la
Task 2:** editar un producto es otra puerta a `buffer_minutes`, y dejarla sin filtro reabrirÃ­a por detrÃ¡s
lo que la Task 2 cierra por delante.

- [ ] **Step 5: Los cuatro comandos**

Expected: verde. `build` de 16 rutas a **17**. `test` sigue en **70**: esta tarea no aÃ±ade lÃ³gica pura.

- [ ] **Step 6: Verificar en pantalla**

Pasar una unidad a `maintenance` y otra a `retired`, las dos con nota. Comprobar **en la base** el estado y
la nota. **Y el efecto que importa de verdad:** una unidad `retired` **desaparece de `/catalogo`** para el
alumno, porque `product_availability` cuenta solo las `active`. **Verificarlo con sesiÃ³n de alumno**, no
deducirlo: es el Ãºnico sitio donde se ve que la baja hace lo que promete.

Comprobar tambiÃ©n que el diÃ¡logo **no deja guardar con la nota vacÃ­a ni con solo espacios** â€”`trim()`, seis
espaciosâ€”, igual que la T3A.

- [ ] **Step 7: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.3: estado de unidad, notas y baja como retired" -m "F7 segunda mitad. La baja es retired y no DELETE: inventory_reservations no tiene GRANT de DELETE ni politica, y la FK no cascadea. La pantalla lo DICE, porque un boton ausente sin explicacion se lee como un defecto. La nota del cambio de estado es obligatoria por decision de este plan y no por el esquema: una unidad que sale del catalogo sin explicacion es lo que D-2 existe para cubrir. Nota primero, estado despues, mismo orden y mismo motivo que marcarNoDevuelta()."
```

---

# Task 4 Â· `/api/cloudinary/firma` â€” cierra P0-4

**El Ãºltimo defecto crÃ­tico de la auditorÃ­a.** En el sistema Vite el secreto de Cloudinary viajaba al
navegador con prefijo `VITE_`. AcÃ¡ se firma en el servidor y el secreto no sale de ahÃ­.

**Files:**
- Create: `lib/cloudinary/firma.ts` *(cÃ¡lculo puro â€” imports relativos)*
- Create: `lib/cloudinary/firma.test.ts`
- Create: `app/api/cloudinary/firma/route.ts`
- Modify: `.env.example` *(ya tiene las cinco variables; comprobar que no falta ninguna)*

**Interfaces:**

```ts
// lib/cloudinary/firma.ts â€” IMPORTS RELATIVOS
export function cadenaAFirmar(params: Record<string, string | number>): string;
export function firmar(params: Record<string, string | number>, apiSecret: string): Promise<string>;
```

> ## âš  Este route handler es la Ãºnica excepciÃ³n del proyecto a Â«quien autoriza es RLSÂ»
>
> Todo lo escrito hasta hoy habla con Postgres, asÃ­ que **la autorizaciÃ³n real la aplica una polÃ­tica** y
> el cliente solo es comodidad. EstÃ¡ escrito en el layout de `(personal)`, en el de admin y en media docena
> de comentarios: *si quitar una comprobaciÃ³n del cliente abre un agujero, estaba en el sitio equivocado.*
>
> **AcÃ¡ no se cumple, y no por descuido: este handler no habla con Postgres, habla con Cloudinary.** No hay
> ninguna polÃ­tica que lo detenga. Si no comprueba nada, **cualquiera con sesiÃ³n â€”un alumnoâ€” obtiene firmas
> vÃ¡lidas para subir lo que quiera a la cuenta de Cloudinary de la universidad.** No hay RLS detrÃ¡s que lo
> salve.
>
> **La comprobaciÃ³n se escribe a mano, y se apoya en RLS para el dato:** leer la propia fila de
> `staff_members` con la sesiÃ³n de quien llama â€”`staff_select_self` deja ver solo la propiaâ€” y exigir
> `role === 'admin'`. El dato viene protegido por una polÃ­tica; la **decisiÃ³n** la toma este archivo.
>
> **Y el corolario que hay que escribir en el propio archivo:** aquÃ­ sÃ­, quitar la comprobaciÃ³n abre un
> agujero. Es la seÃ±al de que este es el Ãºnico sitio del proyecto donde el cliente decide, y por eso lleva
> el aviso encima.

- [ ] **Step 1: La prueba de la firma, primero**

Cloudinary firma con **SHA-1 de los parÃ¡metros ordenados alfabÃ©ticamente**, unidos por `&` como
`clave=valor`, con el `api_secret` **pegado al final sin separador**. Los parÃ¡metros `file`, `api_key` y
`resource_type` **no entran** en la firma.

```ts
import { describe, expect, it } from 'vitest';

import { cadenaAFirmar, firmar } from './firma';

describe('cadenaAFirmar', () => {
  it('ordena alfabeticamente y une con &', () => {
    expect(cadenaAFirmar({ timestamp: 1, folder: 'upc', eager: 'x' }))
      .toBe('eager=x&folder=upc&timestamp=1');
  });

  it('excluye file, api_key y resource_type, que Cloudinary no firma', () => {
    expect(cadenaAFirmar({ timestamp: 1, file: 'a', api_key: 'b', resource_type: 'image' }))
      .toBe('timestamp=1');
  });

  it('descarta los vacios: un parametro sin valor no se manda ni se firma', () => {
    expect(cadenaAFirmar({ timestamp: 1, folder: '' })).toBe('timestamp=1');
  });
});

describe('firmar', () => {
  // Vector fijo: el ejemplo de la documentacion de Cloudinary.
  // public_id=sample&timestamp=1315060510 + secret "abcd" -> SHA-1 conocido.
  it('da un sha1 de 40 hex', async () => {
    const f = await firmar({ public_id: 'sample', timestamp: 1315060510 }, 'abcd');
    expect(f).toMatch(/^[0-9a-f]{40}$/);
  });

  it('cambia si cambia el secreto', async () => {
    const a = await firmar({ timestamp: 1 }, 'uno');
    const b = await firmar({ timestamp: 1 }, 'dos');
    expect(a).not.toBe(b);
  });
});
```

- [ ] **Step 2: Verla fallar**

Run: `npm run test`
Expected: **FAIL**, `Failed to resolve import "./firma"`.

- [ ] **Step 3: `lib/cloudinary/firma.ts`**

SHA-1 con `node:crypto`. **No se aÃ±ade la dependencia `cloudinary`**: la firma son diez lÃ­neas y el paquete
entero traerÃ­a el SDK de subida, que no se usa â€”la subida la hace el navegador contra Cloudinaryâ€”.

- [ ] **Step 4: El route handler**

```ts
// EL UNICO SITIO DEL PROYECTO DONDE EL CLIENTE DECIDE, y hay que saberlo.
//
// Todas las demas escrituras hablan con Postgres, asi que autoriza RLS y el
// codigo de cliente es comodidad. ACA NO: este handler habla con Cloudinary, y
// no hay ninguna politica detras. Sin la comprobacion de abajo, cualquiera con
// sesion -- un alumno -- obtiene firmas validas para subir a la cuenta de la
// universidad.
//
// QUITAR ESTA COMPROBACION ABRE UN AGUJERO DE VERDAD. Es lo contrario de lo
// que dicen los layouts, y es correcto en los dos sitios: alli hay RLS debajo,
// aca no hay nada.
//
// El DATO si viene protegido por una politica: la fila de staff_members se lee
// con la sesion de quien llama, y staff_select_self
// (supabase/migrations/20260805194015_staff_policies.sql:17-19) deja ver solo
// la propia. La DECISION la toma este archivo.
```

Devuelve `401` sin sesiÃ³n, `403` sin rol admin, y `{ timestamp, signature, apiKey, cloudName, folder }` si
pasa. **`CLOUDINARY_API_SECRET` no se devuelve nunca.**

- [ ] **Step 5: Los cuatro comandos**

Expected: verde. `test` de 70 a **75** en 7 archivos. `build` de 17 rutas a **18** â€” un route handler
aparece en la salida del `build`.

- [ ] **Step 6: Verificar los tres caminos, y el que de verdad importa**

Con `curl` y con el navegador â€”**los dos**, porque `curl` no manda cabecera `Origin` y en la T1 eso hizo que
quince sondas en verde no significaran nadaâ€”:

1. Sin sesiÃ³n â†’ **401**.
2. **Con sesiÃ³n de alumno â†’ 403.** Este es el que cierra P0-4; los otros dos son control.
3. Con sesiÃ³n de admin â†’ **200** con la firma.

- [ ] **Step 7: Comprobar que el secreto NO estÃ¡ en el bundle**

**El paso que de verdad cierra P0-4**, y no se puede deducir del cÃ³digo:

Run: `npm run build; Select-String -Path .next\static\**\*.js -Pattern $env:CLOUDINARY_API_SECRET`

Expected: **cero coincidencias**. Si aparece una, el secreto viajÃ³ al navegador y P0-4 sigue abierto con
otro prefijo. *(Comprobar ademÃ¡s que la variable no estÃ¡ definida con prefijo `NEXT_PUBLIC_` en ningÃºn
`.env*`.)*

- [ ] **Step 8: Commit**

```powershell
git add lib/cloudinary app/api
```

```powershell
git commit -m "Tanda 3B.4: firma de Cloudinary en el servidor, cierra P0-4" -m "El secreto se queda en el route handler y no lleva prefijo NEXT_PUBLIC_, que en Next.js inlinea la variable en el bundle. Verificado por el efecto: cero coincidencias del secreto en .next/static. ESTE HANDLER ES LA UNICA EXCEPCION DEL PROYECTO A quien autoriza es RLS, porque habla con Cloudinary y no con Postgres: no hay ninguna politica detras, asi que autoriza a mano. Quitar esa comprobacion SI abre un agujero, al reves que en los layouts."
```

---

# Task 5 Â· Subida y gestiÃ³n de imÃ¡genes

**F7, tercera parte.** Subida mÃºltiple a Cloudinary con la firma de la Task 4, selecciÃ³n de principal,
reordenar y eliminar.

**Files:**
- Create: `components/admin/subida-imagenes.tsx`
- Create: `components/admin/galeria-admin.tsx`
- Modify: `lib/admin/acciones.ts` *(aÃ±ade `registrarImagen()`, `fijarPrincipal()`, `reordenarImagenes()`, `borrarImagen()`)*
- Modify: `app/(personal)/admin/inventario/[id]/page.tsx`

- [ ] **Step 1: El flujo, escrito antes de codificarlo**

1. El navegador pide la firma a `/api/cloudinary/firma`.
2. El navegador sube **directo a Cloudinary** con esa firma. El archivo no pasa por el servidor de Next.
3. Cloudinary devuelve `public_id`, `secure_url`, `format`, `width`, `height`, `bytes`.
4. Una Server Action escribe la fila en `product_images` **con esos seis campos**.

**El paso 4 es el que importa y el que hoy falta en producciÃ³n:** las 34 imÃ¡genes existentes tienen
`secure_url` y **`cloudinary_public_id` en `NULL`**, asÃ­ que estÃ¡n en Cloudinary y nadie puede
identificarlas. Las que suba esta pantalla **sÃ­** lo guardan.

- [ ] **Step 2: Â«Una sola principalÂ» es lÃ³gica de la aplicaciÃ³n, y la base no la defiende**

Medido: `product_images` tiene **solo** `PRIMARY KEY (id)` y `UNIQUE (cloudinary_public_id)`. **No hay
ninguna restricciÃ³n de una sola `is_main` por producto.** AsÃ­ que `fijarPrincipal()` son **dos** escrituras
â€”apagar las demÃ¡s, encender la elegidaâ€” y **no hay transacciÃ³n entre ellas**.

**El orden por su peor caso:** primero apagar todas las del producto, despuÃ©s encender la elegida. Si la
segunda falla, el producto queda **sin principal** â€”el catÃ¡logo cae en la primera por `sort_order`, que es
degradaciÃ³n visible y recuperableâ€”. Al revÃ©s quedarÃ­an **dos principales**, que es un dato incoherente que
nadie nota hasta que el catÃ¡logo elige mal.

- [ ] **Step 3: Reordenar y eliminar**

`reordenarImagenes()` escribe `sort_order` de todas las filas del producto en **un solo `upsert`**, no en un
bucle. `borrarImagen()` borra la fila y **no toca Cloudinary** â€” lo dice F7 y ademÃ¡s es imposible para las
34 antiguas, que no tienen `public_id`.

**Nada de arrastrar.** F7 dice Â«reordenar (arrastrar)Â», y eso es estÃ©tica: subir y bajar con dos botones
hace lo mismo, es funcionalidad, y el compaÃ±ero que hace la fase visual decidirÃ¡ si vale la pena.

- [ ] **Step 4: Los cuatro comandos**

Expected: verde. `test` sigue en **75**. `build` sigue en **18 rutas**: esta tarea no aÃ±ade ninguna.

- [ ] **Step 5: Verificar en pantalla, con la cuenta de Cloudinary de verdad**

Subir dos imÃ¡genes a un producto. Comprobar **en la base** que las filas nuevas traen
`cloudinary_public_id` **no nulo** â€”a diferencia de las 34 viejasâ€”, `secure_url` en `res.cloudinary.com`,
y `format`, `width`, `height` y `bytes` poblados. Fijar principal y comprobar que **queda exactamente una**.
Reordenar y comprobar `sort_order`. Borrar una fila y comprobar que **sigue en Cloudinary**.

**Y el efecto de punta a punta:** la imagen nueva se ve en `/catalogo` con sesiÃ³n de alumno. Si no se viera,
el host no estarÃ­a en `images.remotePatterns` de `next.config.ts` â€”hoy solo `res.cloudinary.com`, que es el
que Cloudinary devuelveâ€”.

- [ ] **Step 6: Commit**

```powershell
git add components/admin lib/admin app/(personal)/admin
```

```powershell
git commit -m "Tanda 3B.5: subida y gestion de imagenes" -m "El archivo sube directo del navegador a Cloudinary con la firma de la Task 4 y no pasa por el servidor de Next. Las filas nuevas SI guardan cloudinary_public_id, que las 34 de produccion tienen en NULL. Una sola principal por producto es logica de la aplicacion: medido que product_images solo tiene PK y UNIQUE(cloudinary_public_id), sin ninguna restriccion que lo defienda. Apagar primero y encender despues: si falla el segundo paso queda sin principal, que es visible, y no con dos, que es incoherente y silencioso."
```

---

# Task 6 Â· `/admin/reservas`

**F6.** Tabla completa con filtros, cambio de estado desde la fila, y cancelaciÃ³n con motivo por diÃ¡logo.

**Files:**
- Create: `app/(personal)/admin/reservas/page.tsx`
- Create: `lib/admin/reservas.ts`
- Create: `lib/admin/filtros.ts` *(puro â€” imports relativos)*
- Create: `lib/admin/filtros.test.ts`
- Create: `components/admin/tabla-reservas.tsx`
- Create: `components/admin/filtros-reservas.tsx`
- Create: `components/admin/dialogo-cancelar-admin.tsx`

- [ ] **Step 1: QuÃ© puerta usa el admin para cancelar, decidido y no reabierto**

**La RPC `cancel_reservation`, no un `UPDATE` directo.** Verificado hoy: la comprobaciÃ³n de propiedad estÃ¡
guardada por `not private.is_staff()` â€”`20260812053243_cancel_before_start.sql:46-49`â€” y la de D-38 tambiÃ©n,
lÃ­neas 59-61. **El personal cancela cualquier reserva `reserved`, empezada o no.**

**Por quÃ© la RPC y no el `UPDATE`, teniendo las dos abiertas:** la RPC escribe `status` y
`cancellation_reason` **dentro de una sola funciÃ³n**, o sea una transacciÃ³n, y **valida el motivo antes**.
Un `PATCH` con las dos columnas tambiÃ©n es una sentencia, asÃ­ que la diferencia no es la atomicidad: es que
la RPC ya tiene escrita la validaciÃ³n y los mensajes, y `lib/reservas/acciones.ts` ya tiene
`mensajeDeRechazoCancelacion()` traduciÃ©ndolos. **Reutilizar es mÃ¡s barato que reescribir la misma regla en
otro sitio y que las dos se separen.**

- [ ] **Step 2: El cambio de estado, y las transiciones que NO existen**

F6 dice Â«cambio de estado directo desde un desplegable en cada filaÂ». **El desplegable no puede ofrecer los
seis estados**: `enforce_reservation_transition()` solo admite
`reserved â†’ active, cancelled, not_picked_up` y `active â†’ completed, not_returned`. Los otros cuatro estados
son terminales.

**El desplegable ofrece solo las transiciones vÃ¡lidas desde el estado actual de esa fila.** Ofrecer las seis
y dejar que el motor rechace serÃ­a mostrarle al admin opciones que no existen: eso es visibilidad, no
estÃ©tica. **Y no es un control:** si alguien fuerza el valor, el trigger lo rechaza igual, que es donde
tiene que estar la regla.

- [ ] **Step 3: `filtros.ts`, la lÃ³gica pura, con su prueba primero**

F6 pide texto libre â€”solicitante, correo, producto, categorÃ­a, cÃ³digo de unidad, activo fijoâ€”, rango de
fecha, estado y tres Ã³rdenes. **Todo eso es una funciÃ³n pura sobre un array**, asÃ­ que se prueba con Vitest,
igual que `filtro.ts` del mostrador.

**El caso que hay que probar y se olvida:** la bÃºsqueda con tilde. La T2A midiÃ³ que buscar Â«micrÃ³fonoÂ»
tiene que encontrar Â«Microfono Rode NTG4Â». **Normalizar los dos lados** con
`normalize('NFD').replace(/\p{Diacritic}/gu, '')`, no solo la consulta.

- [ ] **Step 4: Verla fallar, escribirla, verla pasar**

Run: `npm run test`
Expected: FAIL primero, luego **PASS** con `75 â†’ ~90` en 8 archivos.

- [ ] **Step 5: La consulta**

`lib/admin/reservas.ts` con el embed anidado a producto, unidad y alumno. **El admin ve a todos los
alumnos** â€”`alumnos_select_staff`â€”, al contrario del operador, que solo ve a quien tenga una reserva viva.
Medido en la T3A: el mismo `select` devolviÃ³ cuatro filas al admin y dos al operador.

**Y el efecto de RLS que hay que tolerar igual:** si un embed se bloqueara, **llega `null` entero, sin
mirar columnas** â€”medido en la T3A con tres sets sobre la misma filaâ€”. El tipo tiene que admitir `null`.

- [ ] **Step 6: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 18 rutas a **19**.

**ProducciÃ³n tiene cero reservas**, asÃ­ que esta pantalla se verifica **con un escenario montado en local**,
como hizo la Task 9 de la T3A. Predecir los conteos **antes** de mirar y comprobar los nÃºmeros exactos.

**Y el orden que la T3A descubriÃ³ y el plan no decÃ­a:** con un escenario montado, `npx supabase test db` da
**FAIL** â€”las fixtures de pgTAP comparten alumnos y unidades con el escenarioâ€”. **Hace falta un `db reset`
entre montar el escenario y correr pgTAP.**

- [ ] **Step 7: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.6: /admin/reservas" -m "Cancela por cancel_reservation y no por UPDATE directo: la comprobacion de propiedad esta guardada por not private.is_staff(), asi que la RPC le sirve al personal sobre cualquier reserva reserved, y ya trae la validacion del motivo y los mensajes que mensajeDeRechazoCancelacion() traduce. El desplegable de estado ofrece SOLO las transiciones validas desde el estado de esa fila: enforce_reservation_transition() no admite las seis, y ofrecer las que el motor rechaza es mostrar opciones que no existen. La busqueda normaliza tildes en los DOS lados."
```

---

# Task 7 Â· `/admin/dias`, con D-40

**F8, ya corregida por D-40 y anotada fechada en `ESPECIFICACION_FUNCIONAL.md:174-180`.** Inhabilitar un dÃ­a
**cancela solas las reservas `reserved`** de esa fecha y **respeta las `active`**, porque
`active â†’ cancelled` no existe en la mÃ¡quina de estados.

**Files:**
- Create: `app/(personal)/admin/dias/page.tsx`
- Create: `lib/admin/dias.ts`
- Create: `components/admin/panel-dias.tsx`

- [ ] **Step 1: La cancelaciÃ³n en masa, y por quÃ© NO es un bucle de RPC**

Un solo `UPDATE` con las dos columnas juntas:

```ts
// UNA sentencia y no N llamadas a cancel_reservation, a proposito. El GRANT es
// `update (status, cancellation_reason)` y la politica reservations_update_staff
// (20260806005731_reservation_state_machine.sql:62-68) le aplica al admin, asi
// que las dos columnas viajan en un solo PATCH y el trigger las ve JUNTAS -- que
// es lo que exige que cancelar lleve motivo.
//
// Un bucle de RPC dejaria "las tres primeras canceladas y la cuarta no" si algo
// falla a mitad. Una sentencia es atomica: o se cancelan todas las reserved del
// dia o ninguna.
//
// SOLO `reserved`, y no es una omision: `active -> cancelled` NO esta entre las
// transiciones validas de enforce_reservation_transition() (mismo archivo,
// lineas 38-39). Incluir las active haria fallar la sentencia ENTERA por el
// trigger, y con ella la cancelacion de las reserved que si eran posibles.
// Es D-40, corregido fechado en ESPECIFICACION_FUNCIONAL.md:174-180.
```

- [ ] **Step 2: El orden entre el dÃ­a y las cancelaciones**

Dos escrituras sin transacciÃ³n, otra vez. **Primero el dÃ­a, despuÃ©s las cancelaciones.**

- **DÃ­a primero** *(el elegido)*: si las cancelaciones fallan, queda el dÃ­a inhabilitado con reservas vivas
  dentro. **El daÃ±o estÃ¡ acotado**: el dÃ­a ya no admite reservas nuevas â€”`create_reservation` lo rechazaâ€” y
  las que quedan se ven en `/admin/reservas` para cancelarlas a mano.
- **Cancelaciones primero**: si el `INSERT` del dÃ­a falla, quedan **reservas canceladas de un dÃ­a que sigue
  habilitado**. Alumnos sin su reserva y sin motivo real. **Irreversible sin tocar la base a mano.**

- [ ] **Step 3: El texto que el admin tiene que leer ANTES de confirmar**

D-40 es una correcciÃ³n a la especificaciÃ³n, asÃ­ que **la pantalla tiene que decir lo que va a pasar**, no
solo hacerlo:

> Al inhabilitar el **{fecha}** se cancelarÃ¡n automÃ¡ticamente las **{n} reservas** que todavÃ­a no se han
> retirado, con el motivo Â«Cancelado por la administraciÃ³n (DÃ­a inhabilitado)Â». Los **{m} prÃ©stamos ya
> entregados** siguen vigentes: el equipo estÃ¡ en manos del alumno y tiene que devolverlo con normalidad.

**Los dos nÃºmeros se consultan antes de mostrar el diÃ¡logo**, no se estiman.

- [ ] **Step 4: Solo fechas de hoy en adelante**

F8 lo pide. **No es un control**: nada en la base impide insertar un dÃ­a pasado. Es visibilidad â€”inhabilitar
ayer no hace nada Ãºtilâ€” y se anota como tal. Los dos dÃ­as que hay en producciÃ³n estÃ¡n los dos en el pasado.

- [ ] **Step 5: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 19 rutas a **20**.

**Escenario en local:** un dÃ­a futuro con **dos** reservas `reserved` y **una** `active`. Inhabilitarlo.
Comprobar **en la base**: las dos `reserved` en `cancelled` con el motivo exacto, **la `active` intacta**, y
`reservation_status_log` con **dos** filas nuevas, no tres.

**El contraejemplo es la prueba**, igual que en la T3A: sin la `active` que sobrevive, Â«se cancelan las
`reserved`Â» no se distingue de Â«se cancela todoÂ».

- [ ] **Step 6: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.7: /admin/dias, con D-40" -m "Cancela en UNA sentencia y no en un bucle de RPC: el GRANT de columna y reservations_update_staff dejan mandar status y cancellation_reason juntos, y una sentencia es atomica. Solo las reserved: active -> cancelled no esta en la maquina de estados, e incluirlas haria fallar la sentencia entera. Dia primero y cancelaciones despues: al reves quedarian alumnos sin reserva en un dia que sigue habilitado. La pantalla dice los dos numeros antes de confirmar, consultados y no estimados."
```

---

# Task 8 Â· `/admin/estadisticas`

**F9.** Cinco indicadores â€”registradas, prÃ©stamos esta semana, activas ahora, completadas, canceladasâ€” mÃ¡s
el desglose por dÃ­a de la semana.

**Files:**
- Create: `app/(personal)/admin/estadisticas/page.tsx`
- Create: `lib/admin/estadisticas.ts` *(agregados puros â€” imports relativos)*
- Create: `lib/admin/estadisticas.test.ts`
- Create: `components/admin/panel-estadisticas.tsx`

- [ ] **Step 1: Los agregados se calculan en TypeScript, no en SQL**

**Con cero reservas hoy y una escala de decenas, traer las filas y contar en memoria es correcto y
probable.** Un agregado en SQL exigirÃ­a una vista o una RPC nueva, o sea **SQL**, que D-41 deja fuera de
esta tanda. Se anota el lÃ­mite por delante: **si algÃºn dÃ­a hay decenas de miles de reservas, esto se
convierte en una vista**. No es deuda oculta si estÃ¡ escrita.

- [ ] **Step 2: La prueba, primero, y el caso que se olvida**

**El desglose por dÃ­a de la semana con `America/Lima`.** Una reserva del **domingo 21:00 en Lima** es
**lunes 02:00 en UTC**. Contar sobre el instante crudo la pone en el dÃ­a equivocado. La T2B ya pagÃ³ este
gÃ©nero con Â«11:41 p. m..Â» y con el calendario en 24 horas contra la otra pantalla en 12.

```ts
it('agrupa por dia en America/Lima y no en UTC', () => {
  // Domingo 21:00 en Lima = lunes 02:00 UTC. Tiene que contar DOMINGO.
  const r = desglosePorDiaDeSemana([{ startAt: '2026-08-17T02:00:00Z' }]);
  expect(r.domingo).toBe(1);
  expect(r.lunes).toBe(0);
});
```

- [ ] **Step 3: Verla fallar, escribirla, verla pasar**

Expected: `~90 â†’ ~100` pruebas en 9 archivos.

- [ ] **Step 4: La pantalla vacÃ­a**

**ProducciÃ³n tiene cero reservas, asÃ­ que los cinco indicadores salen en cero.** La pantalla tiene que
decir Â«todavÃ­a no hay reservas registradasÂ», no cinco ceros sin contexto: un cero sin explicaciÃ³n se lee
como un fallo de carga. Es visibilidad.

- [ ] **Step 5: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 20 rutas a **21**. Verificar los cinco nÃºmeros contra un escenario local con una
predicciÃ³n escrita **antes** de mirar, y **tambiÃ©n** con la base vacÃ­a, que es el estado real de producciÃ³n.

- [ ] **Step 6: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.8: /admin/estadisticas" -m "Los agregados se cuentan en TypeScript y no en SQL: un agregado en el motor exigiria una vista o una RPC, o sea SQL, que D-41 deja fuera de esta tanda. Limite escrito por delante: con decenas de miles de reservas esto se convierte en una vista. El desglose por dia de semana agrupa en America/Lima: una reserva del domingo 21:00 en Lima es lunes 02:00 en UTC y contarla cruda la pone en el dia equivocado. La pantalla vacia lo DICE, porque cinco ceros sin contexto se leen como un fallo de carga."
```

---

# Task 9 Â· `/admin/personal`

**Alta y baja de personal, con la restricciÃ³n del punto 3 de Â«Tres choquesÂ».**

**Files:**
- Create: `app/(personal)/admin/personal/page.tsx`
- Create: `lib/admin/personal.ts`
- Create: `components/admin/tabla-personal.tsx`

- [ ] **Step 1: El alta solo alcanza a quien ya entrÃ³ alguna vez, y la pantalla lo dice**

`staff_members.user_id` referencia `auth.users`, y la aplicaciÃ³n expone solo `public` y `graphql_public`
(`supabase/config.toml`). **El Ãºnico sitio donde la aplicaciÃ³n ve un `user_id` es `alumnos.auth_user_id`**,
y esa fila la crea el trigger `handle_new_auth_user` al **pedir** el magic link, no al abrirlo.

**La alternativa serÃ­a `service_role`, y el proyecto tiene escrito que la aplicaciÃ³n nunca la usa: si un
flujo la necesita, no falta una clave, falta una polÃ­tica.**

El texto de la pantalla:

> Para dar de alta a alguien, esa persona tiene que haber entrado al sistema al menos una vez con su correo
> `@upc.edu.pe`. Pedile que abra la pÃ¡gina de ingreso y solicite su enlace de acceso; despuÃ©s aparecerÃ¡ acÃ¡
> para buscarla por correo.

*(Ojo: la interfaz tutea, asÃ­ que la redacciÃ³n final va en tuteo â€” Â«PÃ­dele que abraâ€¦Â». El voseo de este
documento no baja a la pantalla.)*

- [ ] **Step 2: La baja es `activo = false`, no un `DELETE`**

`activo` no es decorativo: `private.is_staff()` y `private.current_staff_role()` â€”los helpers de las
polÃ­ticasâ€” **tambiÃ©n lo exigen**, asÃ­ que desactivar corta el acceso de verdad. Y conserva la trazabilidad:
`reservation_status_log.changed_by` y `inventory_unit_notes.created_by` apuntan a esa persona, y borrarla
deja el historial sin dueÃ±o legible.

**El `DELETE` existe** â€”`grant insert, update, delete on staff_members`â€” y **esta pantalla no lo ofrece**.
Se escribe en un comentario para que nadie lo lea como un olvido.

- [ ] **Step 3: El admin no se puede desactivar a sÃ­ mismo**

**Hay un solo admin en producciÃ³n.** Si se desactiva, **nadie puede volver a activarlo desde la aplicaciÃ³n**:
`staff_admin_all` exige `private.is_admin()`, y ya no habrÃ­a ninguno. Se arreglarÃ­a solo tocando la base a
mano.

**No es un control** â€”RLS deja hacerloâ€”: es visibilidad, y el botÃ³n se oculta sobre la propia fila con un
texto que lo explica. Se anota que el agujero sigue abierto por SQL directo, que es lo correcto: el control
del cliente no es un control.

- [ ] **Step 4: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 21 rutas a **22**. `test` sin cambios: esta tarea no aÃ±ade lÃ³gica pura.

Verificar con el seed local, que trae `admin@upc.edu.pe` y `operador@upc.edu.pe`: buscar por correo, dar de
alta a un tercero como `operator`, comprobar **en la base** la fila con su rol. Desactivarlo y comprobar que
**deja de entrar a `/mostrador`** â€” el layout de `(personal)` exige `activo = true`.

- [ ] **Step 5: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.9: /admin/personal" -m "El alta solo alcanza a quien ya inicio sesion alguna vez: staff_members.user_id referencia auth.users y la aplicacion no ve ese esquema, asi que se busca por correo entre quienes ya entraron. La alternativa seria service_role, y la aplicacion nunca la usa. La baja es activo = false y no DELETE: los helpers de las politicas exigen activo, asi que corta el acceso de verdad, y borrar dejaria sin dueÃ±o legible el historial de log y notas. El admin no puede desactivarse a si mismo: hay uno solo, y sin ninguno nadie puede reactivarlo desde la aplicacion."
```

---

# Task 10 Â· `/admin/ajustes` â€” la segunda mitad de Q-14

**La ruta que el diseÃ±o no tiene** *(correcciÃ³n 1)*. Edita las seis columnas de `app_settings` que el
`GRANT` concede. **Y cierra Q-14 aportando la mitad que la Task 2 no puede ver.**

**Files:**
- Create: `app/(personal)/admin/ajustes/page.tsx`
- Create: `components/admin/formulario-ajustes.tsx`
- Modify: `lib/admin/ajustes.ts` *(aÃ±ade `guardarAjustes()` y `productosDesalineados()`)*
- Modify: `lib/admin/ajustes.test.ts`

- [ ] **Step 1: Las seis columnas y sus restricciones, ya medidas**

| Campo | RestricciÃ³n real |
|---|---|
| `booking_window_days` | 1 a 60 |
| `opening_time` Â· `closing_time` | `closing_time > opening_time` |
| `slot_minutes` | 5 a 60 **y `60 % slot_minutes = 0`** â†’ solo **5, 6, 10, 12, 15, 20, 30, 60** |
| `min_duration_minutes` | 5 a 480 |
| `daily_limit_per_product` | 1 a 10 |

`id` y `updated_at` **no se conceden a nadie**: mandarlos da `42501`.

**El desplegable de `slot_minutes` ofrece los ocho valores**, no un campo libre de 5 a 60: 45 pasarÃ­a el
rango y morirÃ­a en el `check` del divisor con un mensaje del motor.

- [ ] **Step 2: La segunda mitad de Q-14, y es la que no estÃ¡ en su enunciado**

**Cambiar `slot_minutes` puede desalinear buffers ya guardados, retroactivamente.** La Task 2 no puede
verlo: solo mira hacia adelante, producto a producto. **Esta pantalla mira hacia atrÃ¡s, sobre los 34 que ya
existen.**

> **Medido el 2026-08-12, y sale un resultado que hay que escribir porque es contraintuitivo: con los datos
> de hoy, esta mitad de Q-14 es INALCANZABLE.** El `check` `60 % slot_minutes = 0` deja **ocho** valores
> posibles â€”5, 6, 10, 12, 15, 20, 30, 60â€” y **los ocho dividen a 120**, que es el `buffer_minutes` de los
> **34** productos. AsÃ­ que **ningÃºn cambio legal de `slot_minutes` puede desalinear el catÃ¡logo actual.**
>
> **Esto no vuelve inÃºtil la comprobaciÃ³n, y conviene entender por quÃ©.** El riesgo nace en cuanto exista un
> producto con otro buffer, que es justo lo que la Task 2 permite crear: con `slot_minutes = 30`, un buffer
> de **30** es perfectamente vÃ¡lido, y **12, 20 y 60 lo rompen** â€”`30 % 20 = 10`â€”. Es el ejemplo exacto de
> `FASE_2_DISENO.md:711`.
>
> **Y una consecuencia de mÃ©todo: el aviso no se puede probar con los datos reales.** Hay que fabricar el
> caso â€”crear un producto con buffer 30 e intentar `slot_minutes = 20`â€”, y asÃ­ estÃ¡ escrito en el Step 4. Un
> escenario que no distingue lo que cree estar probando ya costÃ³ una correcciÃ³n en la Task 9 de la T3A.

```ts
// Q-14, segunda mitad. Devuelve los productos cuyo buffer dejaria de ser
// multiplo si `slot_minutes` pasara al valor nuevo. NO impide guardar -- la
// base lo permite y bloquearlo seria inventar una regla que el motor no tiene
// --, pero el admin tiene que verlo ANTES de confirmar.
export function productosDesalineados(
  productos: { id: string; nombre: string; bufferMinutos: number }[],
  slotNuevo: number,
): { id: string; nombre: string; bufferMinutos: number }[];
```

Sus pruebas, escritas antes:

```ts
// Los OCHO valores que el check `60 % slot_minutes = 0` permite, con el rango
// 5..60. Medido contra el esquema el 2026-08-12.
const SLOTS_LEGALES = [5, 6, 10, 12, 15, 20, 30, 60];

it('el buffer 120 de los 34 productos reales resiste los OCHO slots legales', () => {
  // Contraintuitivo y medido: 120 es divisible por los ocho, asi que con los
  // datos de HOY ningun cambio legal de slot_minutes desalinea el catalogo.
  const p = [{ id: 'a', nombre: 'Laptop', bufferMinutos: 120 }];
  for (const s of SLOTS_LEGALES) {
    expect(productosDesalineados(p, s)).toHaveLength(0);
  }
});

it('un buffer de 30 SI se rompe, y con tres de los ocho: 12, 20 y 60', () => {
  // El caso que la Task 2 permite crear -- con slot 30, un buffer de 30 es
  // valido -- y que hace falta la comprobacion. Es el ejemplo de
  // MIGRATION_DOCS/FASE_2_DISENO.md:711.
  const p = [{ id: 'a', nombre: 'Tripode', bufferMinutos: 30 }];
  const rompen = SLOTS_LEGALES.filter((s) => productosDesalineados(p, s).length === 1);
  expect(rompen).toEqual([12, 20, 60]);
});

it('un buffer de 0 nunca desalinea', () => {
  const p = [{ id: 'a', nombre: 'Cable', bufferMinutos: 0 }];
  expect(productosDesalineados(p, 20)).toHaveLength(0);
});
```

- [ ] **Step 3: El aviso antes de confirmar**

Si `productosDesalineados()` devuelve algo, el diÃ¡logo lo dice **con los nombres**:

> Cambiar el bloque a **{n} minutos** dejarÃ¡ **{m} productos** con un tiempo de retorno que ya no encaja en
> los bloques: {lista}. Sus reservas seguirÃ¡n funcionando, pero el bloqueo posterior terminarÃ¡ a mitad de
> bloque. PodÃ©s corregir su tiempo de retorno desde el inventario.

**No lo impide.** La base lo permite, y bloquearlo serÃ­a inventar una regla que el motor no tiene â€” el mismo
criterio por el que la aplicaciÃ³n nunca decide lo que RLS no decide.

- [ ] **Step 4: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 22 rutas a **23**, con las mismas tres estÃ¡ticas. `test` de ~100 a **~108**.

Verificar: cambiar la ventana de 7 a 10 dÃ­as y comprobar **en `/catalogo/[id]/reservar`** que el calendario
ofrece diez dÃ­as. **Ese es el efecto real**, y no se ve en la pantalla de ajustes.

Y provocar el aviso: poner un producto en buffer 30, intentar `slot_minutes = 20`, ver el aviso con su
nombre, confirmar, y comprobar que **se guardÃ³ igual**.

- [ ] **Step 5: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.10: /admin/ajustes, cierra Q-14" -m "Ruta que el diseÃ±o no tenia: su tabla y su arbol listan cinco pantallas de admin, y esta es la sexta. Aparece por D-39, cinco dias despues de escribir el diseÃ±o. Segunda mitad de Q-14, la que no esta en su enunciado: cambiar slot_minutes desalinea buffers YA GUARDADOS, y la Task 2 no puede verlo porque solo mira hacia adelante. El aviso enumera los productos afectados y NO impide guardar: la base lo permite, y bloquearlo seria inventar una regla que el motor no tiene. slot_minutes es un desplegable de ocho valores porque el check exige 60 % slot = 0."
```

---

# Task 11 Â· VerificaciÃ³n de punta a punta

**Files:** ninguno. Solo mide.

- [ ] **Step 1: La base, intacta**

Run: `npx supabase db reset; npx supabase test db`
Expected: **23 migraciones** y `Files=24, Tests=147, Result: PASS`. **El nÃºmero exacto importa:** si sube,
alguna tarea colÃ³ SQL contra D-41, y eso se registra como desvÃ­o.

- [ ] **Step 2: El recorrido del admin, entero, en un navegador de verdad**

Entrar por magic link de Mailpit. Recorrer las nueve pantallas. Crear un producto con unidades, subir una
imagen, retirar una unidad, cancelar una reserva, inhabilitar un dÃ­a, mirar las estadÃ­sticas, dar de alta a
un operador y cambiar un ajuste. **Consola sin un solo error ni advertencia del cÃ³digo.**

**Contra `npm run dev` y no contra `next start`:** React silencia en producciÃ³n casi todas las advertencias
de desarrollo, asÃ­ que el criterio de Â«ni una sola advertenciaÂ» solo se puede medir con el servidor de
desarrollo. Medido en la T3A.

- [ ] **Step 3: El recorrido del OPERADOR, que es el control**

Con sesiÃ³n de `operador@upc.edu.pe`, escribir a mano las nueve URL de `/admin/*`. **Las nueve tienen que
mandarlo a `/mostrador`.** Y el mostrador tiene que seguir funcionando igual que al cerrar la T3A: las tres
columnas, las dos faltas, las notas y el filtro.

- [ ] **Step 4: El control que de verdad prueba que RLS manda**

Con un JWT de **operador** firmado a mano, por PostgREST y no por la pantalla:

- `PATCH /rest/v1/products?id=eq.â€¦` â†’ **cero filas sin error**. Tiene el `GRANT` de columna
  â€”`authenticated` lo incluyeâ€” y **no tiene polÃ­tica**: es el modo de fallo silencioso que el proyecto
  persigue desde la Fase 1.
- `POST /rest/v1/staff_members` â†’ rechazo.
- `PATCH /rest/v1/app_settings` â†’ cero filas.

**Con un JWT de alumno, contra `/api/cloudinary/firma` â†’ 403.** Es el que cierra P0-4, y ya se midiÃ³ en la
Task 4: se repite acÃ¡ porque entre medias se tocaron ocho pantallas.

- [ ] **Step 5: Q-14, declarado cerrado solo si las dos mitades estÃ¡n**

1. El formulario de producto **no ofrece** un buffer no mÃºltiplo *(Task 2)*.
2. El formulario de ediciÃ³n **tampoco** *(Task 3)* â€” la puerta de atrÃ¡s.
3. `/admin/ajustes` **avisa** al desalinear productos existentes *(Task 10)*.

**Si falta cualquiera de las tres, Q-14 sigue abierto** y asÃ­ se registra.

- [ ] **Step 6: Los cuatro comandos, dos veces**

Expected: `typecheck`, `lint`, `test` (**~108 en 9 archivos**) y `build` (**23 rutas**, 3 estÃ¡ticas) en
verde, corridos **dos veces** â€” antes y despuÃ©s de cualquier correcciÃ³n de texto, como en la T3A.

- [ ] **Step 7: Commit**

```powershell
git commit -m "Tanda 3B.11: verificacion de punta a punta" -m "23 migraciones y 147 aserciones sin cambios: D-41 respetado, la tanda no toco SQL. Nueve pantallas recorridas con admin y las nueve URL rebotadas con operador. RLS medido por PostgREST y no por la pantalla: el operador recibe cero filas SIN ERROR sobre products, que es el modo de fallo silencioso. Q-14 declarado cerrado solo tras comprobar sus TRES puertas: alta, edicion y ajustes."
```

---

# Task 12 Â· Cierre y documentaciÃ³n

**Files:**
- Modify: `MIGRATION_DOCS/ESTADO_Y_PLAN.md` Â· `MIGRATION_DOCS/FASE_2_DISENO.md` Â·
  `MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md` Â· `CLAUDE.md` Â· este plan

- [ ] **Step 1: `ESTADO_Y_PLAN.md`**

BitÃ¡cora con el cierre; tabla de tandas con la T3B cerrada; **P0-4 cerrado** â€”el Ãºltimo crÃ­tico de la
auditorÃ­aâ€”; **Q-14 cerrado** *(si las tres puertas pasaron)*; **D-41, D-42 y D-43** registradas; **Q-18
sigue abierto y ahora con destino escrito: la T4** *(D-41)*.

- [ ] **Step 2: `FASE_2_DISENO.md`, con las dos correcciones fechadas**

- La tabla de rutas *(lÃ­neas 404-408)* y el Ã¡rbol *(Â§5, lÃ­neas 144-150)* ganan `/admin/ajustes`, **anotado
  fechado**, no reescrito: las cinco eran correctas el 2026-08-06 y la sexta nace de D-39, del 2026-08-11.
- Â§15 gana la correcciÃ³n de **que Q-14 tenÃ­a dos mitades y su enunciado solo describÃ­a una**.

- [ ] **Step 3: `ESPECIFICACION_FUNCIONAL.md`**

F7 gana la correcciÃ³n fechada del borrado en cascada **y** la de las categorÃ­as *(D-42)*. F8 ya estÃ¡
corregida por D-40 desde la T3A: **comprobar que sigue ahÃ­ y no repetirla.**

- [ ] **Step 4: `CLAUDE.md`**

Estado de la T3B cerrada, y **la T4 como siguiente** con lo que hereda: Q-18, el advisor
`auth_leaked_password_protection`, `supabase/setup-cli@v1` en Node 20 y M-12.

- [ ] **Step 5: La cabecera de correcciones de este plan**

Todo lo que la ejecuciÃ³n desmintiÃ³, numerado y fechado. **Y el conteo de hechos falsos de subagente**, que
va en 18 al cerrar la T3A, con su gÃ©nero. **Y los errores de quien dictaba**, que van en cinco.

- [ ] **Step 6: Commit y entrega**

```powershell
git add MIGRATION_DOCS CLAUDE.md
```

```powershell
git commit -m "Tanda 3B.12: cierre y documentacion"
```

**Los comandos de empujar y abrir el PR los ejecuta Alejandro.** Claude no toca el remoto.

---

## Puntos a verificar â€” se resuelven midiendo, no suponiendo

| # | Pregunta | Los dos desenlaces |
|---|---|---|
| **1** | Â¿PostgREST embebe `inventory_units` y `product_images` desde `products`? | **SÃ­** â†’ `listarInventario()` es una consulta. **`PGRST200`** â†’ dos consultas y agrupaciÃ³n en TypeScript. La T2A ya midiÃ³ que `product_availability` **no** se embebe, y eso **no** predice esta |
| **2** | Â¿`shadcn add select` vuelve a pisar `globals.css`? *(D-30)* | Correr `--dry-run` **y mirar el diff**. En la T3A no se repitiÃ³, y se supo por el diff, no porque el build siguiera verde |
| **3** | Â¿CuÃ¡ntas rutas deja el `build`? | PredicciÃ³n: **14 â†’ 23**, con las mismas tres estÃ¡ticas. Si sale otro nÃºmero, algo se creÃ³ o se perdiÃ³ sin querer |
| **4** | Â¿El secreto de Cloudinary aparece en `.next/static`? | **Cero coincidencias** o P0-4 sigue abierto. Es el paso que de verdad lo cierra |
| **5** | Â¿`is_main` admite dos principales a la vez? | Medido que **la base no lo impide**. Comprobar que la aplicaciÃ³n sÃ­, y quÃ© queda si la segunda escritura falla |
| **6** | Â¿Un `UPDATE` masivo que incluya una reserva `active` falla entero o parcialmente? | Postgres aborta la **sentencia entera**. Confirmarlo, porque decide si el filtro `status = 'reserved'` es una optimizaciÃ³n o un requisito |

---

## Lo que esta tanda NO hace, para que no se cuele

- **No toca SQL** *(D-41)*. La base se queda en **23 migraciones y 147 aserciones en 24 archivos**. Si hace
  falta mÃ¡s SQL, se registra como desvÃ­o **antes** de escribirlo.
- **No cierra Q-18.** Las notas de unidad las sigue leyendo cualquier alumno con sesiÃ³n. Mitigado por texto;
  arreglarlo es RLS y es de la T4.
- **No borra unidades ni productos.** La baja es `retired` *(punto 1 de Â«Tres choquesÂ»)*.
- **No permite dar de alta a quien nunca entrÃ³** *(punto 3)*.
- **No cancela reservas `active` al inhabilitar un dÃ­a** *(D-40)*.
- **No toca la sanciÃ³n de un alumno.** `admin_set_ban` existe y **esta tanda no le da pantalla**: no estÃ¡ en
  el Ã­ndice de las doce tareas ni en la tabla de rutas del diseÃ±o. Se anota como pendiente.
- **No arrastra imÃ¡genes para reordenar.** Es estÃ©tica; dos botones hacen lo mismo.
- **No se prueba contra producciÃ³n.** La tanda escribe, y escribe sobre 34 productos y 92 unidades reales.
  **Todo en local**, como la T2B y la T3A.

---

## El entorno â€” y cada punto costÃ³ un fallo

1. **Docker Desktop puede estar apagado.** Arrancarlo. **No** usar `docker info 2>$null | Out-Null; if ($?)`
   para esperarlo: PowerShell 5.1 envuelve el stderr de un ejecutable nativo en un `NativeCommandError` y
   deja `$?` en `False` con Docker vivo. Mirar `$LASTEXITCODE`, o no redirigir el stderr.
2. `netsh interface ipv4 show excludedportrange protocol=tcp` â€” el rango **54245â€“54344** no debe estar. Al
   2026-08-12 no estaba.
3. **Comprobar el stack por el PUERTO DEL HOST**, nunca con `docker exec`: `docker ps` tiene que mostrar
   `0.0.0.0:54322->5432/tcp` y un `TcpClient` desde el host tiene que conectar.
4. **El stack completo son NUEVE contenedores**: `db`, `kong`, `auth`, `rest`, `realtime`, `studio`,
   `pg_meta`, `inbucket` y `edge_runtime`. `storage`, `analytics` y `db.pooler` estÃ¡n en `enabled = false`,
   asÃ­ que **no arrancan nunca**. Si falta alguno de los nueve, `stop` y `start`.
5. **`db reset` regenera los UUID de `alumnos.id`.** Consultar por correo, nunca copiar un identificador de
   una sesiÃ³n anterior. Los `a0000000-â€¦000X` del seed son **`auth_user_id`**, no `alumnos.id`.
6. **Un escenario manual y las fixtures de pgTAP se estorban:** comparten los alumnos y las unidades del
   seed. Hace falta **`db reset` entre montar el escenario y correr pgTAP**.
7. **No hay `psql` en el host.** `docker exec` sirve para **montar**; para **medir** el comportamiento de la
   aplicaciÃ³n, PostgREST por `127.0.0.1:54321`.
8. **Al firmar un JWT a mano:** `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()`, **no** `Get-Date -UFormat %s`
   (da hora local, el token nace caducado, `PGRST303`). Y el cuerpo JSON con
   `[IO.File]::WriteAllText(ruta, json, (New-Object System.Text.UTF8Encoding $false))` â€”
   `Set-Content -Encoding utf8` mete BOM, `PGRST102`.
9. **Para leer el cuerpo de un error HTTP:** `$_.ErrorDetails.Message`.
   `$_.Exception.Response.GetResponseStream()` **ya viene consumido** y devuelve vacÃ­o.
10. **Para sacar el magic link de Mailpit** (`http://127.0.0.1:54324/api/v1/messages`), **no** usar
    `$_.To.Address`: devuelve un `PSMethod`, porque `$_.To` es `System.Object[]` y `System.Array` tiene un
    mÃ©todo nativo `Address(int)` que PowerShell resuelve antes de enumerar. **Falla en silencio**, con cero
    coincidencias. Usar `$_.To | Select-Object -ExpandProperty Address`. Y darle unos segundos.
11. **La sesiÃ³n del navegador caduca a la hora** y cae en `/auth/error`. Se renueva con otro magic link.
12. **Se prueba por `http://127.0.0.1:3000`**, nunca por `localhost:3000` *(D-33)*.
13. **Para `npm run build` hay que parar `npm run dev`.**

---

## CÃ³mo verificar lo que escriba un subagente

**Van 18 hechos falsos**, de cuatro gÃ©neros, y cada uno necesita una comprobaciÃ³n distinta:

| GÃ©nero | QuÃ© se inventa | CÃ³mo se caza |
|---|---|---|
| **Dato** | El hecho | Comprobar el hecho |
| **AtribuciÃ³n** | La fuente *(el hecho es cierto)* | **Abrir el archivo que se cita como fuente**, no el que se cita como hecho |
| **Sobre-afirmaciÃ³n de alcance** | El cuantificador *(cierto en el caso que importa)* | Leer **hasta dÃ³nde llega** la afirmaciÃ³n |
| **Falsedad sobre la propia salvaguarda** | Dice haber marcado algo en un comentario, y el comentario no lo marca | **Releer el comentario** que dice haber escrito |

**Y van cinco errores de quien dictaba.** El cierre de la T3A aportÃ³ tres de golpe **sin un solo hecho falso
de subagente**: dos contradicciones numÃ©ricas dentro del propio encargo, que el subagente **copiÃ³ al pie de
la letra sin notar el choque**, y una regla mal citada. **Un subagente fiel amplifica un encargo incoherente
en vez de corregirlo**, asÃ­ que revisar el encargo antes de mandarlo vale tanto como revisar lo que vuelve.

**Pedirle siempre que enumere lo que no verificÃ³ y quÃ© le pareciÃ³ contradictorio.** Los cinco errores de
quien dictaba salieron de esa pregunta, y es lo mÃ¡s barato que hay.

---

## Pendientes que esta tanda hereda y no cierra

- **Q-18** Â· las notas de unidad las lee cualquier alumno con sesiÃ³n. **Destino escrito: la T4** *(D-41)*.
- **M-12** Â· cancelaciÃ³n con antelaciÃ³n mÃ­nima. D-38 cerrÃ³ la mitad; cancelar un minuto antes de empezar
  sigue sin restricciÃ³n.
- **`auth_leaked_password_protection` desactivada** â€” sÃ©ptimo advisor de seguridad, el Ãºnico que no es
  intencional. No urgente: se entra por magic link, no por contraseÃ±a. **Material de la T4.**
- **`supabase/setup-cli@v1` apunta a Node.js 20**, deprecado. Anotado desde la T2B. Candidato a la T4.
- **`admin_set_ban` sigue sin pantalla.** El admin puede corregir una sanciÃ³n por SQL, no por interfaz.
