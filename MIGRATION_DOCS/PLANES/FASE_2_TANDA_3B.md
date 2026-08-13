# Fase 2 · Tanda 3B — La administración · Plan de implementación

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

### Estado de la ejecución *(al 2026-08-12)*

| Task | Estado |
|---|---|
| **0 · La deuda documental** | ✅ **Cerrada.** Las cuatro correcciones aplicadas y verificadas: `ESTADO_Y_PLAN.md` 35 y 751, `CLAUDE.md` 168 y 173. Dos filas nuevas de bitácora —el push de la migración 23 y la escritura de este plan—. Ninguna reescrita sin marca |
| **1 · Andamio de `/admin` y listado de inventario** | ✅ **Cerrada.** `typecheck`, `lint`, `test` (**70 en 6 archivos**, de 65 en 5) y `build` (**15 rutas**, 3 estáticas) en verde, corridos **dos veces** —antes y después del arreglo de texto—. **Punto a verificar 1 resuelto: SÍ embebe.** Verificado en pantalla con sesión de admin y de operador de verdad |
| **2 · Alta de producto con sus unidades** | ✅ **Cerrada.** `typecheck`, `lint`, `test` (**75 en 7 archivos**, de 70 en 6) y `build` (**16 rutas**, 3 estáticas) en verde, corridos **dos veces**. Las cuatro escrituras medidas por PostgREST antes de escribir. **Q-14 primera mitad verificada en pantalla:** el desplegable ofrece 17 buffers y **no ofrece 45** |
| **3 · Estado de unidad y sus notas** | ✅ **Cerrada.** `typecheck`, `lint`, `test` (**75 en 7 archivos**, sin cambios) y `build` (**17 rutas**, 3 estáticas) en verde, corridos **dos veces**. La baja como `retired` verificada **por su efecto en la pantalla del alumno**, con la línea base tomada antes |
| **4 · `/api/cloudinary/firma`, cierra P0-4** | ⬜ Sin empezar |
| **5 · Subida y gestión de imágenes** | ⬜ Sin empezar |
| **6 · `/admin/reservas`** | ⬜ Sin empezar |
| **7 · `/admin/dias`, con D-40** | ⬜ Sin empezar |
| **8 · `/admin/estadisticas`** | ⬜ Sin empezar |
| **9 · `/admin/personal`** | ⬜ Sin empezar |
| **10 · `/admin/ajustes`, cierra Q-14** | ⬜ Sin empezar |
| **11 · Verificación de punta a punta** | ⬜ Sin empezar |
| **12 · Cierre y documentación** | ⬜ Sin empezar |

### Task 0 · La deuda documental *(2026-08-12)*

1. **El Step 1 predijo «cuatro coincidencias» y salieron NUEVE.** El plan escribió que
   `Select-String -Pattern 'sin empuj'` daría las cuatro líneas a corregir, más dos legítimas que no se
   tocan. **Lo medido:** seis en `ESTADO_Y_PLAN.md` y tres en `CLAUDE.md`. Las cinco que sobran son
   **entradas históricas de bitácora** sobre las tandas 2A y 2B —`ESTADO_Y_PLAN.md` 741, 750, 751 y 752, y
   `CLAUDE.md:159`—, correctas como hechos fechados. **El defecto del plan no es el número, es el criterio
   que se deduce de él:** «cuatro coincidencias» invita a corregir todo lo que salga, y **la mayoría de lo
   que sale no hay que tocarlo**. El criterio bueno es el que ya estaba en la tabla de la tarea: se corrige
   lo que afirma algo falso **sobre hoy**, y se deja lo que solo describe una fecha pasada. Verificado
   después con un `grep -v "~~"`, que deja ver de un vistazo qué quedó sin tachar y por qué.
2. **Los cuatro números de línea del briefing eran exactos**, comprobados antes de editar y no usados a
   ciegas: 35 y 751 en `ESTADO_Y_PLAN.md`, 168 y 173 en `CLAUDE.md`.
3. **Un aviso de «el archivo cambió en disco» que era falso, y conviene no confundirlo con un conflicto.**
   Saltó al editar `ESTADO_Y_PLAN.md` y `CLAUDE.md`. `git diff` mostró que **el único cambio era el propio**:
   el aviso se dispara porque el archivo se había leído con `offset`/`limit` y no entero, no porque nadie
   más lo tocara. **Se comprobó midiendo en vez de suponiendo**, que es lo barato acá.

### Task 1 · Andamio de `/admin` y listado de inventario *(2026-08-12)*

4. **Punto a verificar 1 resuelto por el lado bueno: PostgREST SÍ embebe `inventory_units` y
   `product_images` desde `products`.** Medido con un JWT de admin firmado a mano contra el stack local:
   HTTP 200 con las dos colecciones pobladas. **Así que `listarInventario()` es UNA sola consulta**, no dos
   con agrupación en TypeScript. **Hacía falta medirlo y no se podía deducir:** la T2A ya se topó con que
   `product_availability` **no** se embebe desde `products` en ninguna de las dos direcciones (`PGRST200`),
   y eso no predecía nada sobre estas dos — son otras FK, y encima en la dirección contraria (uno a muchos,
   así que llegan como **array**, no como objeto).

5. **El `test` NO siguió en 65 como predecía el plan: subió a 70 en 6 archivos**, y la causa es la
   corrección siguiente. El plan decía «esta tarea no añade lógica pura», y era cierto **hasta que mirar la
   pantalla obligó a añadirla**.

6. **Un defecto de texto que solo encontró mirar la pantalla: «1 activas».** La tabla escribía
   `{n} activas` sin concordancia, y el seed tiene un producto con **una sola** unidad activa. **Los cuatro
   comandos estaban en verde con el defecto dentro**, porque ninguna herramienta sabe castellano. Es el
   mismo género que «se entrego» y «11:41 p. m..» de la T2B y que «quedará bloqueado» de la T3A. Se arregló
   con `lib/admin/plural.ts` y sus **5 pruebas**, extraído **con cuatro recuentos reales delante en esa
   misma tabla** —dos de plural variable y dos invariables—, no adivinando un segundo caso: es justo la
   condición que `dialogo-cancelar.tsx` (T2B) e `insertarNota()` (T3A) dejaron escrita para no
   sobre-generalizar.

7. **El comentario que la T3A dejó en `components/cabecera-personal.tsx` decía «esas cinco pantallas» y a
   continuación enumeraba SEIS** —inventario, reservas, dias, estadisticas, personal y ajustes—. **El número
   estaba mal y la lista bien:** son seis, porque `/admin/ajustes` existe desde D-39 aunque el diseño no lo
   tenga *(corrección 1 de las del diseño)*. **Es una contradicción numérica dentro de un texto, el mismo
   género que aportó tres de los cinco errores de quien dictaba en la T3A**, y esta vez estaba en un
   comentario de código y no en un encargo. Corregido al activar el enlace.

8. **La insignia «sin código» NO se puede ver con el seed, y verla obligó a fabricar el caso.** Las 8
   unidades del seed tienen todas `asset_code`, así que ese `Badge` no se renderiza nunca en local —ni en
   producción, donde son 38 de 92 pero el listado no se abre contra producción—. Se puso a `NULL` el
   `asset_code` de `CAM-002` y a `retired` el estado de `CAM-003`, se comprobó que las **dos** insignias
   aparecen —«2 activas · 1 retirada · 1 sin código»—, y se restauró el seed. **Es la lección de la Task 9
   de la T3A aplicada por delante:** una predicción puede ser cierta y a la vez inobservable donde se dijo
   que se vería, así que verificarla incluye comprobar que ese sitio es capaz de mostrarla.

9. **El 404 de `/admin/inventario` está cerrado, verificado por el efecto.** Con sesión de admin de verdad,
   el canje del magic link cayó en `/admin/inventario` **y pintó la tabla**. Y el control por el otro lado:
   con sesión de operador, `destino()` lo llevó a `/mostrador`, escribir `/admin/inventario` a mano lo
   **rebotó a `/mostrador`**, y su cabecera **no ofrece** el enlace. Consola con **0 errores y 0
   advertencias**.

### Task 2 · Alta de producto con sus unidades *(2026-08-12)*

10. **REACT RESETEA EL FORMULARIO CUANDO LA ACCIÓN DEVUELVE UN ERROR, y eso obligó a rehacer una decisión
    de diseño de esta misma tarea.** La primera versión guardaba los valores de las filas de unidad **en el
    DOM** y los recogía con `getAll()`, con el argumento —escrito en el propio archivo— de no mantener dos
    copias del mismo dato. **Medido en pantalla:** se envió un alta con dos códigos repetidos, la acción
    contestó con su rechazo, y **el campo «Nombre» y todas las filas quedaron vacíos**. Un `<form action>`
    de React se resetea al terminar la acción, **también cuando la acción falla**. Con diez unidades
    escritas, eso es perder el trabajo entero por un código repetido. **Arreglado pasando todos los campos
    a controlados**, y el contraste se midió por delante y por detrás: antes, seis campos en blanco tras el
    rechazo; después, los seis intactos. **Los cuatro comandos estaban en verde con el defecto dentro** —es
    comportamiento de React en el navegador, no una propiedad del texto del programa—.

11. **`PGRST102` TIENE MÁS DE UNA CAUSA, y la segunda apareció acá.** En la T3A ese código fue el síntoma
    del **BOM** en el cuerpo JSON (`Set-Content -Encoding utf8`). Midiendo el `INSERT` múltiple de unidades
    salió otra vez, con otra causa completamente distinta: **`"All object keys must match"`**, HTTP 400.
    PostgREST **rechaza un INSERT múltiple cuyos objetos no coincidan en el juego de claves**, y el caso lo
    produce el formulario sin esfuerzo —una unidad con `asset_code` y otra sin él—. **Se arregla mandando
    `asset_code` siempre presente, con `null` explícito, en vez de omitir la clave.** Es la lección del
    instrumento otra vez, en su forma incómoda: **reconocer el síntoma no valida la explicación de la vez
    anterior.**

12. **El `INSERT` con array es ATÓMICO, medido y no supuesto.** Se mandaron tres unidades con dos códigos
    repetidos: `23505`, **HTTP 409 —no 400—**, y **cero unidades** quedaron en la tabla, no una. Eso
    confirma la decisión del plan de usar una sentencia y no un bucle: un bucle habría dejado «las dos
    primeras sí y la tercera no».

13. **La unicidad por producto, medida con su contraejemplo.** El mismo `unit_code` en **otro** producto se
    aceptó con HTTP 201. Sin ese contraejemplo, «es único por producto» no se distingue de «es único y
    nadie repitió todavía» — la misma forma que la T2B usó con la reserva ajena en `/mi-panel`.

14. **El código repetido se comprueba TAMBIÉN en la acción, y no es duplicación ociosa:** el `23505` del
    motor **no dice cuál** código se repitió, y el mensaje de pantalla sí lo nombra. La barrera real sigue
    siendo la base —borrar esa comprobación no permitiría crear duplicados—.

15. **`guardarAjustes()` NO puede vivir en `lib/admin/ajustes.ts`, contra lo que decía el plan.** Ese
    archivo lo carga un test, y una Server Action necesita importar el cliente de servidor por el alias
    `@/`, que Vitest no resuelve. **La regla general que sale, y vale para el resto de la tanda: un módulo
    que un test carga no puede contener una Server Action.** `guardarAjustes()` va en `lib/admin/acciones.ts`
    en la Task 10; `ajustes.ts` se queda con lo puro.

16. **El `test` volvió a subir por encima de lo previsto: 75 en 7 archivos.** El plan predecía «65 → 70»
    para esta tarea, pero la Task 1 ya había llevado el contador a 70 por `plural.ts`. Los 5 de acá son los
    de `multiplosDeSlot()`, que sí estaban previstos.

17. **`shadcn add select`: el `--dry-run` acertó exacto y D-30 no se repitió.** Predijo «1 file, +1 new» y
    eso fue: `components/ui/select.tsx` creado, cero modificaciones. **Y se sabe por el hash, no porque el
    build siguiera verde:** `globals.css` y `package.json` con SHA-256 idéntico antes y después. Sin
    dependencia nueva, porque el proyecto usa el paquete unificado `radix-ui`.

### Task 3 · Estado de unidad, notas y la baja como `retired` *(2026-08-12)*

18. **El plan pidió dos Server Actions SIN ASIGNARLES PANTALLA.** Su lista de archivos enumera
    `panel-unidades.tsx` y `dialogo-estado-unidad.tsx`, y manda añadir `agregarUnidad()` y
    `editarProducto()` a `acciones.ts` — **pero ningún componente las llama**. Una Server Action sin
    pantalla no la puede usar nadie. Nacen `components/admin/dialogo-agregar-unidad.tsx` y
    `components/admin/formulario-editar-producto.tsx`. **Es el mismo género de hueco que la Task 1 de la
    T3A ya registró** sobre `mostrador/page.tsx`: la estructura de archivos de un plan **no es
    exhaustiva**, y conviene leerla como un mínimo y no como un contrato.

19. **`anotar()` gana un parámetro de ruta en vez de duplicarse.** El diálogo de nota de la T3A revalida
    `/mostrador`, y desde `/admin/inventario/[id]` eso refresca una pantalla que el admin no está mirando
    mientras deja rancia la que sí. **Se parametrizó la ruta** —con valor por defecto, así que ningún
    llamador de la T3A cambia— en lugar de escribir un `anotarUnidad()` en `lib/admin/acciones.ts`: el
    `INSERT` es idéntico —misma tabla, mismas dos columnas, mismo `trim()`, misma política— y duplicarlo
    habría copiado también `insertarNota()` con su comentario sobre `created_by`, para que las dos copias
    se separaran con el tiempo.

20. **`formulario-editar-producto.tsx` NO usa `useActionState`, y es consecuencia directa de la corrección
    10.** React resetea un `<form action>` al terminar la acción; en el alta eso obligó a controlar todos
    los campos. Acá los campos ya nacen controlados —arrancan con los valores del producto—, así que se
    dispara con `useTransition` sobre un `onClick` y **el reset no llega a existir**. Evitar el problema de
    raíz sale más barato que compensarlo.

21. **El desplegable de buffer de la edición admite un valor QUE ÉL MISMO NO OFRECERÍA, y no es una
    contradicción:** es la segunda mitad de Q-14 vista desde esta pantalla. Si alguien cambia
    `slot_minutes` en `/admin/ajustes`, un producto puede quedar con un buffer que ya no es múltiplo. Sin
    añadirle su propio valor, el `<Select>` aparecería **vacío** y guardar cambiaría el buffer **sin que
    nadie lo pidiera**. Se muestra, se marca «(no encaja en los bloques)» y se avisa debajo.

22. **La baja como `retired` verificada POR SU EFECTO, con la línea base tomada antes de tocar nada.** Se
    eligió el Trípode porque tiene **una sola** unidad, que es lo que hace observable el efecto. **Antes:**
    `active_units = 1`, `in_stock = true`. **Después de retirarla desde la pantalla:** `0` y `false`. **Y en
    la pantalla del alumno de verdad**, no solo por la API: el Trípode **desapareció** de `/catalogo` y el
    contador pasó a «2 equipos en Monterrico», contra los 3 que midió la T2A. Los 2 errores de consola son
    los 404 de las imágenes ficticias del seed, conocidos desde la T2A.

23. **El aviso de que la baja no borra aparece SOLO al elegir «Retirada»**, verificado en pantalla: con el
    estado en «Disponible» no está, y al cambiar a «Retirada» sale entero. La pregunta que responde solo se
    hace en ese momento.

24. **El motivo obligatorio, medido con los dos casos:** con **seis espacios** el botón sigue
    deshabilitado —`trim()` del cliente—, y con texto se habilita. La misma regla la repite
    `cambiarEstadoUnidad()` del lado del servidor.

---

## Qué construye esta tanda, y por qué es distinta de todas las anteriores

La T3A dejó al personal atendiendo el mostrador. La T3B le da al **administrador** las siete pantallas que
le faltan: inventario, alta de producto, unidades, imágenes, reservas, días inhabilitados, estadísticas,
personal y ajustes. Cierra **P0-4** —el último defecto de la auditoría que sigue abierto— y **Q-14**.

**Tres cosas la separan de las seis tandas anteriores, y cada una cambia cómo hay que verificarla.**

**1 · Es la primera tanda con un secreto de servidor.** `CLOUDINARY_API_SECRET` no lleva prefijo
`NEXT_PUBLIC_` y no puede llevarlo: en Next.js ese prefijo **inlinea la variable en el bundle del
navegador** *(D-28)*, que es exactamente el defecto P0-4 por el que empezó esta migración, con otro
prefijo. La firma se calcula en un route handler y el secreto no sale de ahí.

**2 · Y por eso trae la única excepción del proyecto a «quien autoriza es RLS».** Todas las pantallas
escritas hasta hoy hablan con Postgres, así que la autorización real la aplica una política y el cliente
solo es comodidad. **`/api/cloudinary/firma` no habla con Postgres: habla con Cloudinary.** No hay ninguna
política que lo detenga. Ese route handler **tiene que autorizar por su cuenta**, y si no lo hace,
cualquiera con sesión —un alumno— consigue firmas para subir a la cuenta de Cloudinary de la universidad.
No es una violación del principio: es el único sitio donde el principio no llega, y por eso hay que
escribirlo a mano. Ver la Task 4.

**3 · Toca el catálogo real.** 34 productos y 92 unidades de verdad, a diferencia de la T3A, que no podía
romper nada porque producción tiene cero reservas. Un `UPDATE` mal apuntado aquí borra el trabajo de
alguien.

---

## Decisiones tomadas el 2026-08-12, al escribir este plan

**D-41 · Q-18 se aparca a la T4, y no entra en esta tanda.** Las notas de unidad las lee cualquier alumno
con sesión —`unit_notes_select_auth` es `using (true)`,
`supabase/migrations/20260805195549_traceability.sql:37-38`—, medido en la T3A con un JWT de alumno que
recibió HTTP 200 con la nota que describía la falta de otro. **No es un fallo nuevo: es D-2**, la
trazabilidad legible. Se aparca por dos motivos, y el segundo es el que decide: esta tanda ya carga un
riesgo nuevo —el primer secreto de servidor— y sumarle una migración de RLS le pondría un segundo riesgo de
naturaleza distinta en el mismo PR; y **recortar la lectura de notas obliga a reverificar la T3A entera**,
porque el historial del mostrador que la Task 7 acaba de construir lee esa misma tabla. Hoy está mitigado
por texto en los dos diálogos que escriben notas. **Consecuencia: la T3B no toca SQL.** La base se queda en
**23 migraciones y 147 aserciones en 24 archivos**, y si hiciera falta más SQL se registra como desvío
antes de escribirlo, igual que hizo la T3A con D-38.

**D-42 · Las categorías del formulario de alta se leen de la base, no de una lista fija.** F7 manda «14
predefinidas + las ya existentes». En producción hay **10 categorías reales** —consultadas hoy—, así que
una lista fija de catorce metería cuatro opciones sin un solo producto detrás y habría que recuperarla del
tag `legacy/vite-final`. El desplegable se llena consultando `select distinct category from products`, más
un campo para escribir una nueva. **No hay lista que se quede vieja:** si mañana hay doce, salen doce. Es
la corrección directa del error que el seed ya provocó tres veces en esta fase —`featured` en la 2A, las
imágenes en la 2B, los buffers en la 3A—: **el código no debe afirmar sobre los datos lo que solo los datos
pueden decir.**

**D-43 · `/admin/inventario` se abre en tres URL, no en una pantalla con pestañas.** El diseño §5 dice que
«`/admin/unidades` se absorbe en `/admin/inventario`», y eso se respeta: no hay una ruta de unidades de
primer nivel. Pero las cuatro tareas de inventario —listado, alta, unidades y notas, imágenes— no caben en
una sola pantalla sin volver a inventar las pestañas que el propio diseño acaba de eliminar, con su propio
argumento: **«una pestaña que no es una URL no se puede enlazar, ni marcar, ni proteger por separado»**
*(§5)*. Quedan `/admin/inventario` (listado), `/admin/inventario/nuevo` (alta) y `/admin/inventario/[id]`
(unidades, notas e imágenes de un producto). Son subrutas de inventario, no una ruta hermana: la absorción
que pide el diseño se cumple.

---

## Correcciones al diseño y al índice, encontradas leyendo

Las cinco salieron de leer el diseño, la especificación y el esquema **antes** de escribir una línea. Se
registran acá para que nadie las descubra a mitad de ejecución.

**1 · `/admin/ajustes` no existe en el diseño: es una sexta ruta de admin.** La tabla de rutas de
`FASE_2_DISENO.md:404-408` lista **cinco** —inventario, reservas, dias, estadisticas, personal— y el árbol
de archivos de §5 (líneas 144-150) lista las mismas cinco. **Ninguna de las dos menciona `ajustes`.** La
ruta aparece por primera vez en el índice de la T3B, al final del plan de la T3A, y su motivo es D-39: sin
una pantalla que edite `app_settings`, Q-14 no se puede cerrar por la salida elegida. **No es un defecto
del diseño**, es una consecuencia de una decisión tomada cinco días después de escribirlo; se anota fechada
en el diseño al cerrar la tanda, no se reescribe.

**2 · Q-14 no se cierra en la Task 10 sola, y el índice de la T3A lo atribuye mal.** Ese índice dice «10.
`/admin/ajustes`, que cierra Q-14». **Es incompleto, y conviene verlo antes de construir la Task 2.** Q-14
es sobre **`products.buffer_minutes`** —`FASE_2_DISENO.md:709-711`: «`products.buffer_minutes` solo tiene
`check (between 0 and 480)`. Un buffer de 45 minutos vuelve a dejar la cola del bloqueo a mitad de
bloque»—, y esa columna **no vive en `app_settings`: vive en el formulario de producto**, que es la Task 2.
Cerrar Q-14 son dos mitades:

- **Task 2 y Task 3** — el formulario de producto solo ofrece buffers múltiplos de `slot_minutes`. Es la
  mitad que el enunciado de Q-14 describe.
- **Task 10** — al cambiar `slot_minutes` en `/admin/ajustes`, los buffers **ya guardados** pueden dejar de
  ser múltiplos **retroactivamente**, sin tocar un solo producto. Esta mitad no está en el enunciado de
  Q-14 y es la que solo se ve teniendo las dos pantallas delante. *(Medido: con los datos de hoy esta mitad
  es **inalcanzable**, porque los ocho valores legales de `slot_minutes` dividen a 120. Sigue haciendo falta
  en cuanto exista un producto con otro buffer, que es lo que la Task 2 permite crear. El detalle, en el
  Step 2 de la Task 10.)*

**Q-14 no se puede declarar cerrado hasta que las dos mitades estén.** Lo verifica la Task 11.

**3 · F7 manda borrar una unidad en cascada manual, y no se puede.** Ya escrito en el plan de la T3A
—«Tres choques», punto 1—: `inventory_reservations` no tiene `GRANT` de `DELETE` para nadie ni política de
`DELETE`, y la FK `inventory_reservations_unit_id_fkey` no cascadea
(`supabase/migrations/20260805030123_baseline.sql:455`). **La baja de una unidad es ponerla en `retired`**,
que es justo para lo que existe ese estado. No se reabre: se ejecuta así en la Task 3.

**4 · `/admin/personal` solo da de alta a quien ya inició sesión alguna vez.** Ya escrito en «Tres
choques», punto 3: `staff_members.user_id` referencia `auth.users`, y la aplicación expone solo
`public` y `graphql_public` (`supabase/config.toml`). El único sitio donde la aplicación ve un `user_id`
es `alumnos.auth_user_id`. **El alta se hace buscando por correo entre quienes ya entraron.** Se ejecuta
así en la Task 9.

**5 · La «alerta roja» de F5 y F7 no tiene columna.** `inventory_unit_notes` no tiene severidad: son
`unit_id`, `note`, `created_by`, `created_at`. La alerta es **texto dentro de `note`**. Ya medido en la
T3A; se repite acá porque la Task 3 vuelve a tocar notas y el nombre invita a buscar una columna que no
existe.

---

## Lo que ya está verificado contra el esquema

Leído en las migraciones y medido contra el proyecto real **el 2026-08-12**, antes de escribir este plan.
Sirve para no volver a mirarlo a mitad de una tarea.

| Pregunta | Respuesta, y dónde está escrita |
|---|---|
| ¿El admin puede crear, editar y borrar productos, unidades e imágenes? | **Sí, las cuatro operaciones.** `grant insert, update, delete on products, product_images, inventory_units, disabled_days, campuses, carreras to authenticated` y una política `*_admin_all` `for all` con `private.is_admin()` en `using` y `with check` — `supabase/migrations/20260805195304_catalog_policies.sql:28-70` |
| ¿Por qué el `GRANT` es a `authenticated` y no a un rol de admin? | Porque el privilegio es condición **necesaria y no suficiente**: sin él la sentencia ni se planifica; con él, RLS sigue exigiendo `private.is_admin()`. Está escrito en la cabecera de ese mismo archivo, líneas 9-11 |
| ¿Se puede borrar una unidad con historial de reservas? | **No.** Sin `GRANT` de `DELETE` sobre `inventory_reservations` y sin `ON DELETE CASCADE` en la FK — `20260805030123_baseline.sql:455`. La baja es `retired` |
| ¿El código de unidad es único globalmente? | **No: por producto.** `inventory_units_product_id_unit_code_key = UNIQUE (product_id, unit_code)`, medido en producción. La validación del formulario compara contra el producto, no contra el inventario entero |
| ¿Hay restricción de «una sola imagen principal»? | **No.** `product_images` solo tiene `PRIMARY KEY (id)` y `UNIQUE (cloudinary_public_id)`, medido. Que `is_main` sea uno por producto es **lógica de la aplicación**, y la base no la va a defender |
| ¿`cloudinary_public_id` puede repetirse en `NULL`? | Sí: en Postgres los `NULL` no chocan en un `UNIQUE`. Por eso las 34 imágenes actuales conviven con esa restricción teniéndolo todas en `NULL` |
| ¿Quién puede editar `app_settings`? | Solo el admin, y **solo seis columnas**: `grant update (booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes, daily_limit_per_product)`, más `app_settings_update_admin` — `20260806002459_reservation_settings.sql:66-78`. **Sin `INSERT` ni `DELETE` para nadie:** la fila única no se borra ni se duplica por API |
| ¿Qué restricciones tiene `app_settings`? | `booking_window_days` 1-60 · `slot_minutes` 5-60 **y `60 % slot_minutes = 0`** · `min_duration_minutes` 5-480 · `daily_limit_per_product` 1-10 · `closing_time > opening_time` — mismo archivo, líneas 34-50. El divisor deja **ocho** valores posibles de `slot_minutes`: 5, 6, 10, 12, 15, 20, 30 y 60 |
| ¿Qué restricciones tiene `products`? | `max_duration_hours` 1-8 y `buffer_minutes` 0-480, las dos `not null` con default — mismo archivo, líneas 27-31 |
| ¿El admin puede dar de alta y de baja personal? | Sí: `grant insert, update, delete on staff_members to authenticated` y `staff_admin_all` `for all` con `private.is_admin()` — `20260805194015_staff_policies.sql:13-24`. El operador solo se ve a sí mismo, `staff_select_self` |
| ¿`cancel_reservation` le sirve al personal sobre una reserva ajena? | **Sí.** La comprobación de propiedad está guardada por `not private.is_staff()` — `20260812053243_cancel_before_start.sql:46-49` —, y la de D-38 también, líneas 59-61. **El personal cancela cualquier reserva `reserved`, empezada o no**; lo que no puede nadie es cancelar una `active` |
| ¿Por qué el personal no puede cancelar una `active`? | Porque `active -> cancelled` no está entre las transiciones válidas de `enforce_reservation_transition()` — `20260806005731_reservation_state_machine.sql:38-39`. **Es la limitación exacta que D-40 asume** para el día inhabilitado |
| ¿Cancelar exige motivo también para el personal? | **Sí**, y por dos puertas distintas: la RPC lo valida (`20260806012057_cancel_reservation_rpc.sql:27`) y el trigger de la máquina de estados también, cuando `new.status = 'cancelled'` (`20260806005731_...:47`). Los dos textos son parecidos y **no se contradicen**: son de sitios distintos |
| ¿El personal puede escribir `cancellation_reason` por `UPDATE` directo? | Sí: `grant update (status, cancellation_reason) ... to authenticated` y `reservations_update_staff` — `20260806005731_reservation_state_machine.sql:62-68`. **Las dos columnas en un solo `PATCH` van en una sola sentencia**, así que el trigger las ve juntas |
| ¿Qué se concede sobre `disabled_days`? | `select` a `authenticated`; `insert` **solo de `(date, reason)`** —revocado y reconcedido por columna en `20260805195549_traceability.sql:31-32`—; `update` y `delete` completos desde `catalog_policies.sql:28-31`. Política `disabled_days_admin_all` |
| ¿Quién corrige una sanción puesta por error? | Solo `admin_set_ban(uuid, timestamptz)`, `security definer`, con `raise` propio si no es admin — `20260806013146_penalties.sql:67-82`. Existe también `admin_set_alumno_activo(uuid, boolean)` |
| ¿La aplicación necesita `service_role` para algo de esta tanda? | **No.** Todo lo de arriba lo hace el admin con su propia sesión. Si un flujo la pidiera, no falta una clave: falta una política |
| ¿Qué componentes de `shadcn` existen ya? | `badge`, `button`, `card`, `dialog`, `input`, `label`, `separator`, `skeleton`, `table`, `textarea` — `components/ui/`. **`select` se borró en la T2A** por no tener pantalla que lo usara; esta tanda lo necesita y hay que volver a añadirlo |
| ¿`Button` reenvía su `ref`? | No usa `React.forwardRef` — `components/ui/button.tsx`. Medido en la T3A: la cadena `asChild` sobre un `<Button>` que monta `DialogContent` **no deja ninguna advertencia** en `npm run dev`, así que ya no hay motivo para evitarla |
| ¿Dónde está el hueco de los enlaces de admin? | `components/cabecera-personal.tsx`, con la condición ya escrita y marcada: la T3A los dejó fuera porque serían enlaces a un 404. **Los activa la Task 1** |
| ¿Qué ruta da 404 hoy nada más entrar un admin? | `/admin/inventario`. `lib/auth/destino.ts` manda ahí, y esa ruta no existe desde la T1 — verificado en pantalla el 2026-08-12 con sesión de admin. **La Task 1 la crea** |

---

## La forma real de los datos

**Consultado el 2026-08-12 contra `zqfkzgdyeqxzgzpxgadi`, el proyecto real.** El seed local **no** es una
muestra de esto, y ya engañó tres veces en esta fase: leer el esquema dice qué columnas existen, solo
consultar dice qué hay dentro.

| Dato | Valor real |
|---|---|
| Productos | **34**, en **10** categorías |
| Categorías | Tablets 8 · Cables 8 · Celulares 4 · VR 4 · Cámaras 3 · Periféricos 2 · Audio 2 · Proyectores 1 · Otros 1 · Monitores/TV 1 |
| `featured = true` | **0 de 34** |
| `max_duration_hours` | **4 en los 34**, sin excepción |
| `buffer_minutes` | **120 en los 34**. Ninguno desalineado hoy: `120 % 30 = 0` |
| Productos sin descripción | 0 |
| Unidades | **92**, **todas `active`**. Ninguna en `maintenance` ni `retired` |
| Unidades por sede | San Miguel **46**, Monterrico **46** |
| **Códigos de unidad: dos poblaciones** | **54** con código real numérico (`00192164`, `00192165`…) **y las 38 restantes con prefijo `AUTO-`** (`AUTO-mo-uh40-4k-60hz-hdmi-8-01`), generado desde el nombre del producto |
| Unidades sin `asset_code` | **38**, y la correlación con las anteriores es **perfecta**: las 38 `AUTO-` son exactamente las 38 sin `asset_code`, y **no hay ninguna** `AUTO-` con `asset_code` ni ninguna no-`AUTO-` sin él |
| Códigos de unidad duplicados | 0 |
| Imágenes | **34**, una por producto. **0 productos sin imagen** |
| Host de las imágenes | **`res.cloudinary.com` las 34**, así que `next/image` las sirve con el `remotePatterns` que ya existe |
| `cloudinary_public_id` | **`NULL` en las 34** |
| `is_main = true` | 34 — una por producto, coherente |
| Notas de unidad | **58** |
| Sedes | 2 · Carreras | **60** |
| Reservas | **0** |
| Personal | **1**, rol `admin`, activo |
| Cuentas de alumno | 1 |
| Días inhabilitados | **2, los dos en el pasado.** Ninguno futuro |
| `app_settings` | `slot_minutes` **30** · `min_duration_minutes` **30** *(D-19 aplicado)* · ventana **7** días · **08:00-22:00** · límite diario **1** |

**Tres cosas que esta tabla dice y hay que leer despacio:**

1. **Las 38 unidades `AUTO-` son marcadores, no inventario descrito.** El sistema viejo las generó desde el
   nombre del producto cuando no tenía código físico. **El listado de la Task 1 tiene que hacerlas
   visibles**, porque son el 41 % del inventario y nadie puede identificarlas en un estante. Eso es
   visibilidad, no estética.
2. **Ninguna imagen tiene `cloudinary_public_id`, y las 34 están en Cloudinary igual.** Se ven bien y **no
   se pueden identificar en la cuenta**. La Task 5 no puede ofrecer «borrar de Cloudinary» sobre ellas —y
   F7 dice que el borrado no toca Cloudinary de todas formas—, pero sí reordenarlas, fijar la principal y
   borrar la fila, que van todas por `id`.
3. **Los dos días inhabilitados están en el pasado, así que D-40 no tiene nada que cancelar hoy.** La Task 7
   se verifica montando un escenario en local, nunca contra producción.

---

## Estructura de archivos

```
app/(personal)/admin/
  layout.tsx                        role = 'admin'; si es operador, al mostrador
  inventario/page.tsx               Task 1  · listado
  inventario/nuevo/page.tsx         Task 2  · alta con unidades
  inventario/[id]/page.tsx          Task 3 y 5 · unidades, notas e imágenes
  reservas/page.tsx                 Task 6
  dias/page.tsx                     Task 7
  estadisticas/page.tsx             Task 8
  personal/page.tsx                 Task 9
  ajustes/page.tsx                  Task 10

app/api/cloudinary/firma/route.ts   Task 4  · POST, cierra P0-4

lib/admin/
  consultas.ts                      lecturas del inventario
  acciones.ts                       Server Actions de producto y unidad
  reservas.ts                       lectura de /admin/reservas
  filtros.ts                        filtrado puro            → Vitest
  dias.ts                           Server Actions de /admin/dias
  estadisticas.ts                   agregados puros          → Vitest
  personal.ts                       Server Actions de /admin/personal
  ajustes.ts                        Server Actions + múltiplos → Vitest (Q-14)
lib/cloudinary/
  firma.ts                          cálculo puro de la firma → Vitest

components/admin/
  tabla-inventario.tsx      formulario-producto.tsx    filas-unidad.tsx
  panel-unidades.tsx        dialogo-estado-unidad.tsx  subida-imagenes.tsx
  galeria-admin.tsx         tabla-reservas.tsx         filtros-reservas.tsx
  dialogo-cancelar-admin.tsx  panel-dias.tsx           panel-estadisticas.tsx
  tabla-personal.tsx        formulario-ajustes.tsx
components/ui/select.tsx              se vuelve a añadir con `shadcn add`
```

> ### ⚠ El alias `@/` no funciona bajo Vitest, y el modo de fallo es el peligroso
>
> No hay `vitest.config.ts`, así que Vitest no conoce el alias que declara `tsconfig.json`.
> **`typecheck` y `build` pasan en verde con el alias; solo `vitest run` se rompe.** Los cuatro módulos de
> arriba marcados «→ Vitest» —`filtros.ts`, `estadisticas.ts`, `ajustes.ts`, `firma.ts`— y cualquier
> módulo que un test cargue **usan imports relativos**, no `@/`. Se descubrió en la Task 8 de la T3A, con
> `filtro.ts` como primer módulo probado que importaba un **valor** y no solo un `import type`.

---

## Global · Lo que vale para las trece tareas

- **PowerShell 5.1.** Sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Nada de here-strings.
- **Los documentos llevan tildes.** La regla de «sin acentos ni eñe» es de los **comentarios de código y
  los mensajes de commit**, no de estos documentos. El encargo de cierre de la T3A la citó mal y costó una
  corrección.
- **La interfaz tutea.** El voseo es de los comentarios y los documentos.
- **Nada de estética.** Un compañero hace la fase visual. Sí funcionalidad, **visibilidad** —que algo
  aparezca cuando debe y desaparezca cuando no debe— y textos.
- **Se prueba por `http://127.0.0.1:3000`**, nunca por `localhost:3000` *(D-33)*.
- **Para `npm run build` hay que parar `npm run dev`:** comparten `.next/` y eso produce falsos en tres
  direcciones.
- **El árbitro de si una pantalla funciona es `npm run build`**, no el navegador ni el servidor de
  desarrollo. Pero **abrir la pantalla sigue siendo obligatorio**: es lo único que ha encontrado los fallos
  de esta fase.
- **Los cuatro comandos al cerrar cada tarea:** `npm run typecheck`, `npm run lint`, `npm run test`,
  `npm run build`.

---

# Task 0 · Saldar la deuda documental

**Va primera y no última, a propósito.** Cuatro sitios afirman hoy algo falso —que la migración 23 no está
en el remoto—, y lo están afirmando **desde el 2026-08-12**, cuando se empujó después de escribir los
documentos de cierre. Dejarlo para la Task 12 los mantiene falsos durante toda la tanda, justo en los dos
archivos que se consultan para saber el estado. Y hay un motivo operativo: **las ediciones de documentación
se cierran antes de pasar comandos de git**, nunca después, o quedan cambios sin versionar que bloquean el
siguiente `checkout`.

**Files:**
- Modify: `MIGRATION_DOCS/ESTADO_Y_PLAN.md` (línea 35 y línea 751)
- Modify: `CLAUDE.md` (línea 168 y línea 173)

**Los cuatro sitios, verificados el 2026-08-12.** Los números de línea son de hoy: **comprobarlos antes de
editar**, no usarlos a ciegas.

| Archivo:línea | Texto falso hoy | Cómo se corrige |
|---|---|---|
| `ESTADO_Y_PLAN.md:35` | «está **comiteada en `8ddcc01`** desde la Task 2. Sigue **sin empujar al remoto**.» | Es el **resumen ejecutivo**: se consulta para saber el estado de HOY. Corrección fechada **encima**, con el mismo formato `⚠ **Corregido el …**` que ya usan las líneas 29 y 32 |
| `ESTADO_Y_PLAN.md:751` | «**Sigue sin empujarse al remoto.**» | Es la **bitácora**, y es un **hecho fechado**: era cierto el 2026-08-12 al cerrar la tanda. La corrección va **al lado, dentro de la misma celda**, no encima: un dato que envejece en la bitácora solo miente sobre su fecha |
| `CLAUDE.md:168` | «sin empujar todavía» | Corrección fechada, tachando lo anterior |
| `CLAUDE.md:173` | «medido con `npx supabase test db`, sin empujar al remoto» | Corrección fechada, tachando lo anterior |

- [ ] **Step 1: Verificar que las cuatro líneas siguen donde dice la tabla**

Run: `Select-String -Path MIGRATION_DOCS\ESTADO_Y_PLAN.md,CLAUDE.md -Pattern 'sin empuj'`

Expected: cuatro coincidencias en `ESTADO_Y_PLAN.md:35`, `ESTADO_Y_PLAN.md:751`, `CLAUDE.md:168` y
`CLAUDE.md:173`. **Si los números no coinciden, se usan los que salgan**, no los de la tabla. *(Hay una
quinta coincidencia legítima en `CLAUDE.md:159` —«sin empujar» referido a la T2B— y una sexta en
`PLANES/TANDA_3.md:38`: esas **no** se tocan.)*

- [ ] **Step 2: Corregir el resumen ejecutivo de `ESTADO_Y_PLAN.md`**

El texto que sustituye a la línea 35, conservando lo anterior tachado:

```markdown
~~**Todavía no está en el remoto**: existe en el árbol de trabajo, sin comitear.~~ ⚠ **Corregido el
2026-08-12:** está **comiteada en `8ddcc01`** desde la Task 2. ~~Sigue **sin empujar al remoto**.~~
⚠ **Corregido otra vez el 2026-08-12, más tarde el mismo día:** la migración 23 **ya está en el remoto**.
Se empujó al cerrar la sesión, *después* de escribir los documentos de cierre, que por eso decían lo
contrario. `migration list` muestra las **23 con `local` y `remote` idénticos**, y se verificó **por el
efecto y no por el registro** —que una migración figure aplicada no dice que la regla exista—:
`pg_proc.prosrc` de `public.cancel_reservation` en el proyecto real contiene el texto del rechazo de D-38
y la comparación `v_start_at <= now()`, sigue `security definer`, `authenticated` la ejecuta y **`anon`
no**. **Q-17 queda cerrado también en producción.**
```

- [ ] **Step 3: Corregir la entrada de bitácora de `ESTADO_Y_PLAN.md`**

Dentro de la celda de la fila `2026-08-12` del **CIERRE DE LA TANDA 3A**, la frase «**Sigue sin empujarse
al remoto.**» se sustituye por:

```markdown
~~Sigue sin empujarse al remoto.~~ *(Cierto al escribir esta entrada; la migración 23 se empujó unas horas
después, el mismo 2026-08-12 — ver la entrada siguiente.)*
```

**Y se añade una fila nueva al final de la bitácora**, que es donde va el hecho nuevo:

```markdown
| 2026-08-12 | **La migración 23 empujada a producción, y Q-17 cerrado también en el proyecto real.** `migration list` muestra las **23 con `local` y `remote` idénticos**. **Verificado por el EFECTO y no por el registro** —que una migración figure aplicada no dice que la regla exista—: `pg_proc.prosrc` de `public.cancel_reservation` contiene el texto del rechazo de D-38 y la comparación `v_start_at <= now()`; sigue `security definer`; `authenticated` la ejecuta y **`anon` no**, lo que confirma otra vez que **`create or replace` conserva el `revoke`**. **El CLI de Supabase estaba SIN AUTENTICAR y por eso fallaba con `401 Unauthorized`**: no faltaba el vínculo —`supabase/.temp/project-ref` tenía el proyecto correcto— sino el token, que no existía ni en `~/.supabase/access-token` ni en `SUPABASE_ACCESS_TOKEN`. Se arregla con `npx supabase login`, que es interactivo. **El MCP de Supabase tiene credenciales propias y funcionó aunque el CLI no**, así que son dos caminos independientes y sirven para contrastarse: el push se comprobó con los dos. **Un aviso de advisor que no estaba en la lista de intencionales: `auth_leaked_password_protection` desactivada.** Los otros seis siguen siendo los de siempre —las dos `admin_set_*`, `available_slots`, `available_units`, `create_reservation` y `cancel_reservation`—. No es urgente, porque se entra por magic link y no por contraseña, pero es **material de la T4** |
```

- [ ] **Step 4: Corregir los dos sitios de `CLAUDE.md`**

En la línea 168, `sin empujar todavía` pasa a:

```markdown
~~sin empujar todavía~~ ⚠ **empujado el 2026-08-12: PR #29, merge en `6b5dca2`, cuatro corridas de CI y
las cuatro verdes**
```

En la línea 173, `sin empujar al remoto` pasa a:

```markdown
~~sin empujar al remoto~~ ⚠ **Corregido el 2026-08-12: la migración 23 YA ESTÁ en producción**, con las 23
en `local` y `remote` idénticas, y verificada por el efecto en `pg_proc.prosrc`
```

- [ ] **Step 5: Commit**

```powershell
git add MIGRATION_DOCS/ESTADO_Y_PLAN.md CLAUDE.md
```

```powershell
git commit -m "Tanda 3B.0: saldar la deuda documental de la migracion 23" -m "Cuatro sitios decian que la migracion 23 seguia sin empujarse. Se empujo el 2026-08-12, despues de escribir los documentos de cierre de la T3A. Se corrige con marca fechada, sin reescribir: en el resumen ejecutivo la correccion va encima, y en la bitacora al lado, porque alli es un hecho fechado que solo miente sobre su fecha."
```

**Criterio de cierre:** las cuatro líneas corregidas, ninguna reescrita sin marca, y `git status` limpio.

---

# Task 1 · Andamio de `/admin` y listado de inventario

**Cierra el 404 que arrastra el proyecto desde la T1.** `lib/auth/destino.ts` manda al admin a
`/admin/inventario` nada más entrar, y esa ruta no existe: verificado en pantalla el 2026-08-12 con sesión
de admin. No es un fallo nuevo, es el hueco que esta tanda tapa. **Y activa los enlaces de admin en la
cabecera**, que la T3A dejó fuera a propósito porque habrían sido enlaces a un 404.

**Files:**
- Create: `app/(personal)/admin/layout.tsx`
- Create: `app/(personal)/admin/inventario/page.tsx`
- Create: `lib/admin/consultas.ts`
- Create: `components/admin/tabla-inventario.tsx`
- Modify: `components/cabecera-personal.tsx`

**Interfaces — lo que esta tarea produce y las demás consumen:**

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

Con el stack local arrancado y un JWT de **admin** firmado a mano (receta en «El entorno», abajo), pedir
por PostgREST el producto con sus unidades e imágenes embebidas:

```
GET /rest/v1/products?select=id,name,category,max_duration_hours,buffer_minutes,inventory_units(status,asset_code),product_images(id)
```

**Qué se está midiendo, y por qué no se puede deducir:** la T2A ya se topó con que PostgREST **no** embebe
`product_availability` desde `products` en ninguna de las dos direcciones (`PGRST200`). Que `inventory_units`
sí se embeba **no se sigue de eso**: es otra FK. Los dos desenlaces:

- **Embebe** → `listarInventario()` es **una** consulta y cuenta en memoria.
- **No embebe** (`PGRST200`) → dos consultas y agrupación en TypeScript. Se anota como corrección al plan.

**Repetir la misma consulta con un JWT de alumno** y confirmar que `inventory_units` responde —`units_select_auth`
es `using (true)`— pero que un `PATCH` sobre `products` no toca ninguna fila. Es el control que separa
«funciona» de «funciona solo para quien debe».

- [ ] **Step 1: `app/(personal)/admin/layout.tsx`**

Copia la forma de `app/(personal)/layout.tsx`, con su mismo comentario de fondo: **este layout no autoriza
nada.** Quien autoriza es `private.is_admin()` dentro de la base. Si un operador escribe `/admin/inventario`
a mano, lo que le niega los datos es RLS; redirigirlo acá es comodidad.

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

**Sin `CabeceraPersonal` ni `Pie` acá:** el layout de `(personal)` ya los monta, y este vive dentro. Ponerlos
otra vez duplica la cabecera — el mismo defecto que la T2A midió con el 404 dentro de un grupo.

- [ ] **Step 2: `lib/admin/consultas.ts`**

Con el desenlace del Step 0. Los conteos se calculan en TypeScript sobre el embed, no con `count` de
PostgREST, porque hacen falta **cuatro** conteos distintos sobre la misma colección.

- [ ] **Step 3: `components/admin/tabla-inventario.tsx`**

Tabla con `components/ui/table.tsx`, ya instalado. Una fila por producto: nombre, categoría, duración
máxima, buffer, unidades por estado, imágenes.

**La columna que no es obvia y hay que poner: «sin código».** 38 de las 92 unidades no tienen `asset_code`
y llevan un `unit_code` `AUTO-…` generado desde el nombre del producto. Son el 41 % del inventario y **nadie
las puede identificar en un estante**. Que se vean es visibilidad, no estética.

- [ ] **Step 4: `app/(personal)/admin/inventario/page.tsx`**

Server Component: llama a `listarInventario()` y monta la tabla. Enlace a `/admin/inventario/nuevo` y cada
fila enlaza a `/admin/inventario/[id]` — las dos rutas llegan en las Tasks 2 y 3, así que **hasta entonces
son enlaces a un 404**. Es el mismo caso que la T3A resolvió no poniéndolos: **acá sí se ponen**, porque las
dos rutas entran en esta misma tanda y en los dos commits siguientes. Se deja escrito en un comentario.

- [ ] **Step 5: Activar los enlaces de admin en `components/cabecera-personal.tsx`**

La condición ya está escrita y marcada desde la T3A. Se activan **solo** los enlaces cuyas rutas existan
al cerrar esta tarea: `/admin/inventario`. Los demás se van añadiendo en su tarea. **Un enlace a un 404 en
la cabecera lo ve el admin en todas las pantallas**, que es peor que dentro de una tabla.

- [ ] **Step 6: Los cuatro comandos**

Run: `npm run typecheck; npm run lint; npm run test; npm run build`
Expected: los cuatro en verde. **`build` de 14 rutas a 15**, con las mismas tres estáticas
—`/_not-found`, `/faq`, `/login`—. `/admin/inventario` es **dinámica**: lee sesión.
`npm run test` sigue en **65**, sin cambios: esta tarea no añade lógica pura.

- [ ] **Step 7: Verificar en pantalla, con sesión de admin de verdad**

Entrar por magic link recogido de Mailpit. **La predicción a comprobar, escrita antes de mirar:** el reparto
de `destino()` cae en `/admin/inventario` **y ya no da 404**. Con el seed local se ven **4 productos**, no
34: el seed no es una muestra de producción, y confundirlos es el error que ya costó tres veces.

**Y el control que separa «funciona» de «funciona solo para quien debe»:** entrar con `operador@upc.edu.pe`
y escribir `/admin/inventario` a mano. Tiene que caer en `/mostrador`.

- [ ] **Step 8: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin components/cabecera-personal.tsx
```

```powershell
git commit -m "Tanda 3B.1: andamio de /admin y listado de inventario" -m "Cierra el 404 de /admin/inventario que arrastraba desde la T1. El layout de admin no autoriza: redirige por comodidad, y quien niega los datos es private.is_admin(). Se activan los enlaces de admin de la cabecera, que la T3A dejo fuera. La columna sin codigo hace visibles las 38 unidades AUTO- sin asset_code."
```

---

# Task 2 · Alta de producto con sus unidades

**F7, primera mitad.** Un solo formulario: nombre, categoría, descripción, duración máxima, buffer, y una
fila por unidad con código, sede y anotación inicial. **Y la primera mitad de Q-14.**

**Files:**
- Create: `app/(personal)/admin/inventario/nuevo/page.tsx`
- Create: `components/admin/formulario-producto.tsx`
- Create: `components/admin/filas-unidad.tsx`
- Create: `lib/admin/acciones.ts`
- Create: `lib/admin/ajustes.ts` *(solo `multiplosDeSlot()`; el resto lo añade la Task 10)*
- Create: `lib/admin/ajustes.test.ts`
- Modify: `lib/admin/consultas.ts` *(añade `listarCategorias()` y `listarSedes()`)*

**Interfaces:**

```ts
// lib/admin/ajustes.ts  — IMPORTS RELATIVOS: un test lo carga
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

**Esta es la mitad de Q-14 que el índice de la T3A no atribuye a esta tarea.** `products.buffer_minutes`
solo tiene `check (between 0 and 480)`; que sea múltiplo de `slot_minutes` **no lo defiende la base**, y
por eso lo tiene que ofrecer la interfaz. Es la tercera de las tres salidas que el diseño escribió en su
§15, elegida por D-39.

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
Expected: **FAIL** con `Failed to resolve import "./ajustes"` — el módulo aún no existe.

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
Expected: **PASS**, `65 → 70` pruebas, de 5 archivos a **6**.

- [ ] **Step 5: `lib/admin/acciones.ts` — `crearProducto()`**

**El orden importa y no hay transacción.** La API REST no da una transacción entre dos llamadas del cliente
—la misma lección que `marcarNoDevuelta()` dejó escrita en la T3A—, así que hay que elegir el orden por su
peor caso:

- **Producto primero, unidades después** *(el elegido, y además el único posible: la FK `unit.product_id`
  exige que el producto exista)*. Si el `INSERT` de unidades falla, queda **un producto sin unidades**. Es
  visible en el listado de la Task 1 —la columna de unidades en cero— y se arregla añadiéndolas desde la
  Task 3. **Recuperable.**
- Al revés es imposible por la FK, así que no hay disyuntiva real. **Lo que sí hay que hacer es dejar el
  producto huérfano visible**, no silencioso.

Las unidades van en **un solo `INSERT` con un array**, no en un bucle: una sentencia es atómica, así que
o entran las diez o no entra ninguna. Un bucle deja «las tres primeras sí y la cuarta no».

**Validación de códigos repetidos:** `UNIQUE (product_id, unit_code)`, medido en producción. La
comprobación en la interfaz es **dentro del formulario** —dos filas con el mismo código—, y la de la base
es la red de seguridad. `23505` traducido a texto propio; lo demás, crudo.

- [ ] **Step 6: El formulario**

`components/admin/formulario-producto.tsx` con `components/admin/filas-unidad.tsx` para las filas. Añadir
`select` con `npx shadcn@latest add select` —**se borró en la T2A** por no tener pantalla que lo usara, y
esta la tiene—. **Correr primero `--dry-run`** y mirar el diff de `globals.css`: D-30 dice que `shadcn`
puede pisar los tokens por cascada, y en la T3A no se repitió **porque se miró el diff**, no porque el build
siguiera verde.

- **Categoría:** desplegable con las que devuelve `listarCategorias()` *(D-42)*, más un campo para escribir
  una nueva. **No una lista fija de 14.**
- **Buffer:** desplegable con `multiplosDeSlot(slotMinutes, 480)`, leyendo `slot_minutes` de `app_settings`.
- **Duración máxima:** 1 a 8, el `check` de la columna.
- **Sede de cada unidad:** desplegable con `listarSedes()` — son 2.
- **Anotación inicial por unidad:** opcional. Si viene, se inserta en `inventory_unit_notes` después de la
  unidad, con el mismo orden y el mismo motivo que `marcarNoDevuelta()`.

- [ ] **Step 7: Los cuatro comandos**

Expected: verde. `build` de 15 rutas a **16**. `test` en **70** en 6 archivos.

- [ ] **Step 8: Verificar en pantalla**

Crear un producto con 3 unidades. Comprobar **en la base**: una fila en `products`, tres en
`inventory_units` con el `campus_id` correcto, y las notas iniciales en `inventory_unit_notes`. Provocar el
duplicado —dos filas con el mismo código— y ver el rechazo. **Y comprobar que el desplegable de buffer no
ofrece 45** con `slot_minutes = 30`, que es Q-14 hecho pantalla.

- [ ] **Step 9: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin components/ui/select.tsx
```

```powershell
git commit -m "Tanda 3B.2: alta de producto con sus unidades" -m "F7 primera mitad. Las categorias se leen de la base y no de una lista fija de 14 (D-42): en produccion hay 10, y una lista fija metería cuatro vacias. multiplosDeSlot() es la primera mitad de Q-14, la que el indice de la T3A no atribuye a esta tarea: buffer_minutes vive en el formulario de producto, no en app_settings. Las unidades entran en un solo INSERT con array: una sentencia es atomica y un bucle deja tres si y la cuarta no."
```

---

# Task 3 · Estado de unidad y sus notas, con la baja como `retired`

**F7, segunda mitad.** El detalle de un producto: sus unidades, el cambio de estado, el historial de notas
y el alta de unidades sueltas. **La baja de una unidad es `retired`, no un `DELETE`.**

**Files:**
- Create: `app/(personal)/admin/inventario/[id]/page.tsx`
- Create: `components/admin/panel-unidades.tsx`
- Create: `components/admin/dialogo-estado-unidad.tsx`
- Modify: `lib/admin/acciones.ts` *(añade `cambiarEstadoUnidad()`, `agregarUnidad()`, `editarProducto()`)*
- Modify: `lib/admin/consultas.ts` *(añade `leerProducto()`)*
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

- [ ] **Step 1: El texto que hay que escribir bien, y por qué va primero**

**F7 manda un borrado en cascada que no se puede hacer, y el admin va a buscar ese botón.** No basta con
que no exista: **la pantalla tiene que decir por qué**. Un botón ausente sin explicación se lee como un
defecto, y alguien acabará pidiéndolo o —peor— borrando filas por SQL.

El texto, junto a la acción de baja *(tutea, como toda la interfaz)*:

> **Dar de baja no borra la unidad.** La pasa a «retirada»: deja de estar disponible para reservar y
> conserva su historial de préstamos y anotaciones. Una unidad con reservas registradas no se puede borrar,
> y es a propósito — borrarla dejaría reservas apuntando a un equipo que ya no existe.

- [ ] **Step 2: `cambiarEstadoUnidad()` con la nota obligatoria**

**La nota es obligatoria y la decide este plan, no el esquema.** F7 no la exige para el cambio de estado
—solo F5 la fuerza para «No se devolvió»—, pero **una unidad que desaparece del catálogo sin explicación es
exactamente el caso que la trazabilidad existe para cubrir** *(D-2)*. El mismo criterio que la T3A aplicó a
`marcarNoDevuelta()`.

**El orden, otra vez, y por el mismo motivo:** **primero la nota, después el estado.** Si el `INSERT` falla,
la unidad no cambia y el admin reintenta. Al revés quedaría una unidad retirada sin rastro de por qué. La
T3A **midió** esa carrera y dejó constancia de su costo real: una nota huérfana si el `UPDATE` falla
después. Una nota de más es recuperable; un equipo retirado a ciegas, no.

- [ ] **Step 3: El aviso de privacidad en el diálogo de nota**

`dialogo-nota.tsx` ya avisa desde la Task 7 de la T3A de que la nota **la lee cualquiera con sesión**
—Q-18, `unit_notes_select_auth` es `using (true)`—. **Se reutiliza tal cual, con su aviso.** Si esta tarea
monta un diálogo propio en vez de reutilizarlo, **tiene que llevar el mismo aviso**: la asimetría entre dos
diálogos que escriben en la misma tabla ya fue un defecto real en la T3A, y el que faltaba era justo el más
expuesto.

- [ ] **Step 4: `agregarUnidad()` y `editarProducto()`**

`agregarUnidad()` valida el código contra **las unidades de ese producto**, no contra el inventario entero:
la restricción es `UNIQUE (product_id, unit_code)`.

`editarProducto()` vuelve a ofrecer el buffer por `multiplosDeSlot()`. **Es la misma mitad de Q-14 que la
Task 2:** editar un producto es otra puerta a `buffer_minutes`, y dejarla sin filtro reabriría por detrás
lo que la Task 2 cierra por delante.

- [ ] **Step 5: Los cuatro comandos**

Expected: verde. `build` de 16 rutas a **17**. `test` sigue en **70**: esta tarea no añade lógica pura.

- [ ] **Step 6: Verificar en pantalla**

Pasar una unidad a `maintenance` y otra a `retired`, las dos con nota. Comprobar **en la base** el estado y
la nota. **Y el efecto que importa de verdad:** una unidad `retired` **desaparece de `/catalogo`** para el
alumno, porque `product_availability` cuenta solo las `active`. **Verificarlo con sesión de alumno**, no
deducirlo: es el único sitio donde se ve que la baja hace lo que promete.

Comprobar también que el diálogo **no deja guardar con la nota vacía ni con solo espacios** —`trim()`, seis
espacios—, igual que la T3A.

- [ ] **Step 7: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.3: estado de unidad, notas y baja como retired" -m "F7 segunda mitad. La baja es retired y no DELETE: inventory_reservations no tiene GRANT de DELETE ni politica, y la FK no cascadea. La pantalla lo DICE, porque un boton ausente sin explicacion se lee como un defecto. La nota del cambio de estado es obligatoria por decision de este plan y no por el esquema: una unidad que sale del catalogo sin explicacion es lo que D-2 existe para cubrir. Nota primero, estado despues, mismo orden y mismo motivo que marcarNoDevuelta()."
```

---

# Task 4 · `/api/cloudinary/firma` — cierra P0-4

**El último defecto crítico de la auditoría.** En el sistema Vite el secreto de Cloudinary viajaba al
navegador con prefijo `VITE_`. Acá se firma en el servidor y el secreto no sale de ahí.

**Files:**
- Create: `lib/cloudinary/firma.ts` *(cálculo puro — imports relativos)*
- Create: `lib/cloudinary/firma.test.ts`
- Create: `app/api/cloudinary/firma/route.ts`
- Modify: `.env.example` *(ya tiene las cinco variables; comprobar que no falta ninguna)*

**Interfaces:**

```ts
// lib/cloudinary/firma.ts — IMPORTS RELATIVOS
export function cadenaAFirmar(params: Record<string, string | number>): string;
export function firmar(params: Record<string, string | number>, apiSecret: string): Promise<string>;
```

> ## ⚠ Este route handler es la única excepción del proyecto a «quien autoriza es RLS»
>
> Todo lo escrito hasta hoy habla con Postgres, así que **la autorización real la aplica una política** y
> el cliente solo es comodidad. Está escrito en el layout de `(personal)`, en el de admin y en media docena
> de comentarios: *si quitar una comprobación del cliente abre un agujero, estaba en el sitio equivocado.*
>
> **Acá no se cumple, y no por descuido: este handler no habla con Postgres, habla con Cloudinary.** No hay
> ninguna política que lo detenga. Si no comprueba nada, **cualquiera con sesión —un alumno— obtiene firmas
> válidas para subir lo que quiera a la cuenta de Cloudinary de la universidad.** No hay RLS detrás que lo
> salve.
>
> **La comprobación se escribe a mano, y se apoya en RLS para el dato:** leer la propia fila de
> `staff_members` con la sesión de quien llama —`staff_select_self` deja ver solo la propia— y exigir
> `role === 'admin'`. El dato viene protegido por una política; la **decisión** la toma este archivo.
>
> **Y el corolario que hay que escribir en el propio archivo:** aquí sí, quitar la comprobación abre un
> agujero. Es la señal de que este es el único sitio del proyecto donde el cliente decide, y por eso lleva
> el aviso encima.

- [ ] **Step 1: La prueba de la firma, primero**

Cloudinary firma con **SHA-1 de los parámetros ordenados alfabéticamente**, unidos por `&` como
`clave=valor`, con el `api_secret` **pegado al final sin separador**. Los parámetros `file`, `api_key` y
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

SHA-1 con `node:crypto`. **No se añade la dependencia `cloudinary`**: la firma son diez líneas y el paquete
entero traería el SDK de subida, que no se usa —la subida la hace el navegador contra Cloudinary—.

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

Devuelve `401` sin sesión, `403` sin rol admin, y `{ timestamp, signature, apiKey, cloudName, folder }` si
pasa. **`CLOUDINARY_API_SECRET` no se devuelve nunca.**

- [ ] **Step 5: Los cuatro comandos**

Expected: verde. `test` de 70 a **75** en 7 archivos. `build` de 17 rutas a **18** — un route handler
aparece en la salida del `build`.

- [ ] **Step 6: Verificar los tres caminos, y el que de verdad importa**

Con `curl` y con el navegador —**los dos**, porque `curl` no manda cabecera `Origin` y en la T1 eso hizo que
quince sondas en verde no significaran nada—:

1. Sin sesión → **401**.
2. **Con sesión de alumno → 403.** Este es el que cierra P0-4; los otros dos son control.
3. Con sesión de admin → **200** con la firma.

- [ ] **Step 7: Comprobar que el secreto NO está en el bundle**

**El paso que de verdad cierra P0-4**, y no se puede deducir del código:

Run: `npm run build; Select-String -Path .next\static\**\*.js -Pattern $env:CLOUDINARY_API_SECRET`

Expected: **cero coincidencias**. Si aparece una, el secreto viajó al navegador y P0-4 sigue abierto con
otro prefijo. *(Comprobar además que la variable no está definida con prefijo `NEXT_PUBLIC_` en ningún
`.env*`.)*

- [ ] **Step 8: Commit**

```powershell
git add lib/cloudinary app/api
```

```powershell
git commit -m "Tanda 3B.4: firma de Cloudinary en el servidor, cierra P0-4" -m "El secreto se queda en el route handler y no lleva prefijo NEXT_PUBLIC_, que en Next.js inlinea la variable en el bundle. Verificado por el efecto: cero coincidencias del secreto en .next/static. ESTE HANDLER ES LA UNICA EXCEPCION DEL PROYECTO A quien autoriza es RLS, porque habla con Cloudinary y no con Postgres: no hay ninguna politica detras, asi que autoriza a mano. Quitar esa comprobacion SI abre un agujero, al reves que en los layouts."
```

---

# Task 5 · Subida y gestión de imágenes

**F7, tercera parte.** Subida múltiple a Cloudinary con la firma de la Task 4, selección de principal,
reordenar y eliminar.

**Files:**
- Create: `components/admin/subida-imagenes.tsx`
- Create: `components/admin/galeria-admin.tsx`
- Modify: `lib/admin/acciones.ts` *(añade `registrarImagen()`, `fijarPrincipal()`, `reordenarImagenes()`, `borrarImagen()`)*
- Modify: `app/(personal)/admin/inventario/[id]/page.tsx`

- [ ] **Step 1: El flujo, escrito antes de codificarlo**

1. El navegador pide la firma a `/api/cloudinary/firma`.
2. El navegador sube **directo a Cloudinary** con esa firma. El archivo no pasa por el servidor de Next.
3. Cloudinary devuelve `public_id`, `secure_url`, `format`, `width`, `height`, `bytes`.
4. Una Server Action escribe la fila en `product_images` **con esos seis campos**.

**El paso 4 es el que importa y el que hoy falta en producción:** las 34 imágenes existentes tienen
`secure_url` y **`cloudinary_public_id` en `NULL`**, así que están en Cloudinary y nadie puede
identificarlas. Las que suba esta pantalla **sí** lo guardan.

- [ ] **Step 2: «Una sola principal» es lógica de la aplicación, y la base no la defiende**

Medido: `product_images` tiene **solo** `PRIMARY KEY (id)` y `UNIQUE (cloudinary_public_id)`. **No hay
ninguna restricción de una sola `is_main` por producto.** Así que `fijarPrincipal()` son **dos** escrituras
—apagar las demás, encender la elegida— y **no hay transacción entre ellas**.

**El orden por su peor caso:** primero apagar todas las del producto, después encender la elegida. Si la
segunda falla, el producto queda **sin principal** —el catálogo cae en la primera por `sort_order`, que es
degradación visible y recuperable—. Al revés quedarían **dos principales**, que es un dato incoherente que
nadie nota hasta que el catálogo elige mal.

- [ ] **Step 3: Reordenar y eliminar**

`reordenarImagenes()` escribe `sort_order` de todas las filas del producto en **un solo `upsert`**, no en un
bucle. `borrarImagen()` borra la fila y **no toca Cloudinary** — lo dice F7 y además es imposible para las
34 antiguas, que no tienen `public_id`.

**Nada de arrastrar.** F7 dice «reordenar (arrastrar)», y eso es estética: subir y bajar con dos botones
hace lo mismo, es funcionalidad, y el compañero que hace la fase visual decidirá si vale la pena.

- [ ] **Step 4: Los cuatro comandos**

Expected: verde. `test` sigue en **75**. `build` sigue en **18 rutas**: esta tarea no añade ninguna.

- [ ] **Step 5: Verificar en pantalla, con la cuenta de Cloudinary de verdad**

Subir dos imágenes a un producto. Comprobar **en la base** que las filas nuevas traen
`cloudinary_public_id` **no nulo** —a diferencia de las 34 viejas—, `secure_url` en `res.cloudinary.com`,
y `format`, `width`, `height` y `bytes` poblados. Fijar principal y comprobar que **queda exactamente una**.
Reordenar y comprobar `sort_order`. Borrar una fila y comprobar que **sigue en Cloudinary**.

**Y el efecto de punta a punta:** la imagen nueva se ve en `/catalogo` con sesión de alumno. Si no se viera,
el host no estaría en `images.remotePatterns` de `next.config.ts` —hoy solo `res.cloudinary.com`, que es el
que Cloudinary devuelve—.

- [ ] **Step 6: Commit**

```powershell
git add components/admin lib/admin app/(personal)/admin
```

```powershell
git commit -m "Tanda 3B.5: subida y gestion de imagenes" -m "El archivo sube directo del navegador a Cloudinary con la firma de la Task 4 y no pasa por el servidor de Next. Las filas nuevas SI guardan cloudinary_public_id, que las 34 de produccion tienen en NULL. Una sola principal por producto es logica de la aplicacion: medido que product_images solo tiene PK y UNIQUE(cloudinary_public_id), sin ninguna restriccion que lo defienda. Apagar primero y encender despues: si falla el segundo paso queda sin principal, que es visible, y no con dos, que es incoherente y silencioso."
```

---

# Task 6 · `/admin/reservas`

**F6.** Tabla completa con filtros, cambio de estado desde la fila, y cancelación con motivo por diálogo.

**Files:**
- Create: `app/(personal)/admin/reservas/page.tsx`
- Create: `lib/admin/reservas.ts`
- Create: `lib/admin/filtros.ts` *(puro — imports relativos)*
- Create: `lib/admin/filtros.test.ts`
- Create: `components/admin/tabla-reservas.tsx`
- Create: `components/admin/filtros-reservas.tsx`
- Create: `components/admin/dialogo-cancelar-admin.tsx`

- [ ] **Step 1: Qué puerta usa el admin para cancelar, decidido y no reabierto**

**La RPC `cancel_reservation`, no un `UPDATE` directo.** Verificado hoy: la comprobación de propiedad está
guardada por `not private.is_staff()` —`20260812053243_cancel_before_start.sql:46-49`— y la de D-38 también,
líneas 59-61. **El personal cancela cualquier reserva `reserved`, empezada o no.**

**Por qué la RPC y no el `UPDATE`, teniendo las dos abiertas:** la RPC escribe `status` y
`cancellation_reason` **dentro de una sola función**, o sea una transacción, y **valida el motivo antes**.
Un `PATCH` con las dos columnas también es una sentencia, así que la diferencia no es la atomicidad: es que
la RPC ya tiene escrita la validación y los mensajes, y `lib/reservas/acciones.ts` ya tiene
`mensajeDeRechazoCancelacion()` traduciéndolos. **Reutilizar es más barato que reescribir la misma regla en
otro sitio y que las dos se separen.**

- [ ] **Step 2: El cambio de estado, y las transiciones que NO existen**

F6 dice «cambio de estado directo desde un desplegable en cada fila». **El desplegable no puede ofrecer los
seis estados**: `enforce_reservation_transition()` solo admite
`reserved → active, cancelled, not_picked_up` y `active → completed, not_returned`. Los otros cuatro estados
son terminales.

**El desplegable ofrece solo las transiciones válidas desde el estado actual de esa fila.** Ofrecer las seis
y dejar que el motor rechace sería mostrarle al admin opciones que no existen: eso es visibilidad, no
estética. **Y no es un control:** si alguien fuerza el valor, el trigger lo rechaza igual, que es donde
tiene que estar la regla.

- [ ] **Step 3: `filtros.ts`, la lógica pura, con su prueba primero**

F6 pide texto libre —solicitante, correo, producto, categoría, código de unidad, activo fijo—, rango de
fecha, estado y tres órdenes. **Todo eso es una función pura sobre un array**, así que se prueba con Vitest,
igual que `filtro.ts` del mostrador.

**El caso que hay que probar y se olvida:** la búsqueda con tilde. La T2A midió que buscar «micrófono»
tiene que encontrar «Microfono Rode NTG4». **Normalizar los dos lados** con
`normalize('NFD').replace(/\p{Diacritic}/gu, '')`, no solo la consulta.

- [ ] **Step 4: Verla fallar, escribirla, verla pasar**

Run: `npm run test`
Expected: FAIL primero, luego **PASS** con `75 → ~90` en 8 archivos.

- [ ] **Step 5: La consulta**

`lib/admin/reservas.ts` con el embed anidado a producto, unidad y alumno. **El admin ve a todos los
alumnos** —`alumnos_select_staff`—, al contrario del operador, que solo ve a quien tenga una reserva viva.
Medido en la T3A: el mismo `select` devolvió cuatro filas al admin y dos al operador.

**Y el efecto de RLS que hay que tolerar igual:** si un embed se bloqueara, **llega `null` entero, sin
mirar columnas** —medido en la T3A con tres sets sobre la misma fila—. El tipo tiene que admitir `null`.

- [ ] **Step 6: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 18 rutas a **19**.

**Producción tiene cero reservas**, así que esta pantalla se verifica **con un escenario montado en local**,
como hizo la Task 9 de la T3A. Predecir los conteos **antes** de mirar y comprobar los números exactos.

**Y el orden que la T3A descubrió y el plan no decía:** con un escenario montado, `npx supabase test db` da
**FAIL** —las fixtures de pgTAP comparten alumnos y unidades con el escenario—. **Hace falta un `db reset`
entre montar el escenario y correr pgTAP.**

- [ ] **Step 7: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.6: /admin/reservas" -m "Cancela por cancel_reservation y no por UPDATE directo: la comprobacion de propiedad esta guardada por not private.is_staff(), asi que la RPC le sirve al personal sobre cualquier reserva reserved, y ya trae la validacion del motivo y los mensajes que mensajeDeRechazoCancelacion() traduce. El desplegable de estado ofrece SOLO las transiciones validas desde el estado de esa fila: enforce_reservation_transition() no admite las seis, y ofrecer las que el motor rechaza es mostrar opciones que no existen. La busqueda normaliza tildes en los DOS lados."
```

---

# Task 7 · `/admin/dias`, con D-40

**F8, ya corregida por D-40 y anotada fechada en `ESPECIFICACION_FUNCIONAL.md:174-180`.** Inhabilitar un día
**cancela solas las reservas `reserved`** de esa fecha y **respeta las `active`**, porque
`active → cancelled` no existe en la máquina de estados.

**Files:**
- Create: `app/(personal)/admin/dias/page.tsx`
- Create: `lib/admin/dias.ts`
- Create: `components/admin/panel-dias.tsx`

- [ ] **Step 1: La cancelación en masa, y por qué NO es un bucle de RPC**

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

- [ ] **Step 2: El orden entre el día y las cancelaciones**

Dos escrituras sin transacción, otra vez. **Primero el día, después las cancelaciones.**

- **Día primero** *(el elegido)*: si las cancelaciones fallan, queda el día inhabilitado con reservas vivas
  dentro. **El daño está acotado**: el día ya no admite reservas nuevas —`create_reservation` lo rechaza— y
  las que quedan se ven en `/admin/reservas` para cancelarlas a mano.
- **Cancelaciones primero**: si el `INSERT` del día falla, quedan **reservas canceladas de un día que sigue
  habilitado**. Alumnos sin su reserva y sin motivo real. **Irreversible sin tocar la base a mano.**

- [ ] **Step 3: El texto que el admin tiene que leer ANTES de confirmar**

D-40 es una corrección a la especificación, así que **la pantalla tiene que decir lo que va a pasar**, no
solo hacerlo:

> Al inhabilitar el **{fecha}** se cancelarán automáticamente las **{n} reservas** que todavía no se han
> retirado, con el motivo «Cancelado por la administración (Día inhabilitado)». Los **{m} préstamos ya
> entregados** siguen vigentes: el equipo está en manos del alumno y tiene que devolverlo con normalidad.

**Los dos números se consultan antes de mostrar el diálogo**, no se estiman.

- [ ] **Step 4: Solo fechas de hoy en adelante**

F8 lo pide. **No es un control**: nada en la base impide insertar un día pasado. Es visibilidad —inhabilitar
ayer no hace nada útil— y se anota como tal. Los dos días que hay en producción están los dos en el pasado.

- [ ] **Step 5: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 19 rutas a **20**.

**Escenario en local:** un día futuro con **dos** reservas `reserved` y **una** `active`. Inhabilitarlo.
Comprobar **en la base**: las dos `reserved` en `cancelled` con el motivo exacto, **la `active` intacta**, y
`reservation_status_log` con **dos** filas nuevas, no tres.

**El contraejemplo es la prueba**, igual que en la T3A: sin la `active` que sobrevive, «se cancelan las
`reserved`» no se distingue de «se cancela todo».

- [ ] **Step 6: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.7: /admin/dias, con D-40" -m "Cancela en UNA sentencia y no en un bucle de RPC: el GRANT de columna y reservations_update_staff dejan mandar status y cancellation_reason juntos, y una sentencia es atomica. Solo las reserved: active -> cancelled no esta en la maquina de estados, e incluirlas haria fallar la sentencia entera. Dia primero y cancelaciones despues: al reves quedarian alumnos sin reserva en un dia que sigue habilitado. La pantalla dice los dos numeros antes de confirmar, consultados y no estimados."
```

---

# Task 8 · `/admin/estadisticas`

**F9.** Cinco indicadores —registradas, préstamos esta semana, activas ahora, completadas, canceladas— más
el desglose por día de la semana.

**Files:**
- Create: `app/(personal)/admin/estadisticas/page.tsx`
- Create: `lib/admin/estadisticas.ts` *(agregados puros — imports relativos)*
- Create: `lib/admin/estadisticas.test.ts`
- Create: `components/admin/panel-estadisticas.tsx`

- [ ] **Step 1: Los agregados se calculan en TypeScript, no en SQL**

**Con cero reservas hoy y una escala de decenas, traer las filas y contar en memoria es correcto y
probable.** Un agregado en SQL exigiría una vista o una RPC nueva, o sea **SQL**, que D-41 deja fuera de
esta tanda. Se anota el límite por delante: **si algún día hay decenas de miles de reservas, esto se
convierte en una vista**. No es deuda oculta si está escrita.

- [ ] **Step 2: La prueba, primero, y el caso que se olvida**

**El desglose por día de la semana con `America/Lima`.** Una reserva del **domingo 21:00 en Lima** es
**lunes 02:00 en UTC**. Contar sobre el instante crudo la pone en el día equivocado. La T2B ya pagó este
género con «11:41 p. m..» y con el calendario en 24 horas contra la otra pantalla en 12.

```ts
it('agrupa por dia en America/Lima y no en UTC', () => {
  // Domingo 21:00 en Lima = lunes 02:00 UTC. Tiene que contar DOMINGO.
  const r = desglosePorDiaDeSemana([{ startAt: '2026-08-17T02:00:00Z' }]);
  expect(r.domingo).toBe(1);
  expect(r.lunes).toBe(0);
});
```

- [ ] **Step 3: Verla fallar, escribirla, verla pasar**

Expected: `~90 → ~100` pruebas en 9 archivos.

- [ ] **Step 4: La pantalla vacía**

**Producción tiene cero reservas, así que los cinco indicadores salen en cero.** La pantalla tiene que
decir «todavía no hay reservas registradas», no cinco ceros sin contexto: un cero sin explicación se lee
como un fallo de carga. Es visibilidad.

- [ ] **Step 5: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 20 rutas a **21**. Verificar los cinco números contra un escenario local con una
predicción escrita **antes** de mirar, y **también** con la base vacía, que es el estado real de producción.

- [ ] **Step 6: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.8: /admin/estadisticas" -m "Los agregados se cuentan en TypeScript y no en SQL: un agregado en el motor exigiria una vista o una RPC, o sea SQL, que D-41 deja fuera de esta tanda. Limite escrito por delante: con decenas de miles de reservas esto se convierte en una vista. El desglose por dia de semana agrupa en America/Lima: una reserva del domingo 21:00 en Lima es lunes 02:00 en UTC y contarla cruda la pone en el dia equivocado. La pantalla vacia lo DICE, porque cinco ceros sin contexto se leen como un fallo de carga."
```

---

# Task 9 · `/admin/personal`

**Alta y baja de personal, con la restricción del punto 3 de «Tres choques».**

**Files:**
- Create: `app/(personal)/admin/personal/page.tsx`
- Create: `lib/admin/personal.ts`
- Create: `components/admin/tabla-personal.tsx`

- [ ] **Step 1: El alta solo alcanza a quien ya entró alguna vez, y la pantalla lo dice**

`staff_members.user_id` referencia `auth.users`, y la aplicación expone solo `public` y `graphql_public`
(`supabase/config.toml`). **El único sitio donde la aplicación ve un `user_id` es `alumnos.auth_user_id`**,
y esa fila la crea el trigger `handle_new_auth_user` al **pedir** el magic link, no al abrirlo.

**La alternativa sería `service_role`, y el proyecto tiene escrito que la aplicación nunca la usa: si un
flujo la necesita, no falta una clave, falta una política.**

El texto de la pantalla:

> Para dar de alta a alguien, esa persona tiene que haber entrado al sistema al menos una vez con su correo
> `@upc.edu.pe`. Pedile que abra la página de ingreso y solicite su enlace de acceso; después aparecerá acá
> para buscarla por correo.

*(Ojo: la interfaz tutea, así que la redacción final va en tuteo — «Pídele que abra…». El voseo de este
documento no baja a la pantalla.)*

- [ ] **Step 2: La baja es `activo = false`, no un `DELETE`**

`activo` no es decorativo: `private.is_staff()` y `private.current_staff_role()` —los helpers de las
políticas— **también lo exigen**, así que desactivar corta el acceso de verdad. Y conserva la trazabilidad:
`reservation_status_log.changed_by` y `inventory_unit_notes.created_by` apuntan a esa persona, y borrarla
deja el historial sin dueño legible.

**El `DELETE` existe** —`grant insert, update, delete on staff_members`— y **esta pantalla no lo ofrece**.
Se escribe en un comentario para que nadie lo lea como un olvido.

- [ ] **Step 3: El admin no se puede desactivar a sí mismo**

**Hay un solo admin en producción.** Si se desactiva, **nadie puede volver a activarlo desde la aplicación**:
`staff_admin_all` exige `private.is_admin()`, y ya no habría ninguno. Se arreglaría solo tocando la base a
mano.

**No es un control** —RLS deja hacerlo—: es visibilidad, y el botón se oculta sobre la propia fila con un
texto que lo explica. Se anota que el agujero sigue abierto por SQL directo, que es lo correcto: el control
del cliente no es un control.

- [ ] **Step 4: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 21 rutas a **22**. `test` sin cambios: esta tarea no añade lógica pura.

Verificar con el seed local, que trae `admin@upc.edu.pe` y `operador@upc.edu.pe`: buscar por correo, dar de
alta a un tercero como `operator`, comprobar **en la base** la fila con su rol. Desactivarlo y comprobar que
**deja de entrar a `/mostrador`** — el layout de `(personal)` exige `activo = true`.

- [ ] **Step 5: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.9: /admin/personal" -m "El alta solo alcanza a quien ya inicio sesion alguna vez: staff_members.user_id referencia auth.users y la aplicacion no ve ese esquema, asi que se busca por correo entre quienes ya entraron. La alternativa seria service_role, y la aplicacion nunca la usa. La baja es activo = false y no DELETE: los helpers de las politicas exigen activo, asi que corta el acceso de verdad, y borrar dejaria sin dueño legible el historial de log y notas. El admin no puede desactivarse a si mismo: hay uno solo, y sin ninguno nadie puede reactivarlo desde la aplicacion."
```

---

# Task 10 · `/admin/ajustes` — la segunda mitad de Q-14

**La ruta que el diseño no tiene** *(corrección 1)*. Edita las seis columnas de `app_settings` que el
`GRANT` concede. **Y cierra Q-14 aportando la mitad que la Task 2 no puede ver.**

**Files:**
- Create: `app/(personal)/admin/ajustes/page.tsx`
- Create: `components/admin/formulario-ajustes.tsx`
- Modify: `lib/admin/ajustes.ts` *(añade `guardarAjustes()` y `productosDesalineados()`)*
- Modify: `lib/admin/ajustes.test.ts`

- [ ] **Step 1: Las seis columnas y sus restricciones, ya medidas**

| Campo | Restricción real |
|---|---|
| `booking_window_days` | 1 a 60 |
| `opening_time` · `closing_time` | `closing_time > opening_time` |
| `slot_minutes` | 5 a 60 **y `60 % slot_minutes = 0`** → solo **5, 6, 10, 12, 15, 20, 30, 60** |
| `min_duration_minutes` | 5 a 480 |
| `daily_limit_per_product` | 1 a 10 |

`id` y `updated_at` **no se conceden a nadie**: mandarlos da `42501`.

**El desplegable de `slot_minutes` ofrece los ocho valores**, no un campo libre de 5 a 60: 45 pasaría el
rango y moriría en el `check` del divisor con un mensaje del motor.

- [ ] **Step 2: La segunda mitad de Q-14, y es la que no está en su enunciado**

**Cambiar `slot_minutes` puede desalinear buffers ya guardados, retroactivamente.** La Task 2 no puede
verlo: solo mira hacia adelante, producto a producto. **Esta pantalla mira hacia atrás, sobre los 34 que ya
existen.**

> **Medido el 2026-08-12, y sale un resultado que hay que escribir porque es contraintuitivo: con los datos
> de hoy, esta mitad de Q-14 es INALCANZABLE.** El `check` `60 % slot_minutes = 0` deja **ocho** valores
> posibles —5, 6, 10, 12, 15, 20, 30, 60— y **los ocho dividen a 120**, que es el `buffer_minutes` de los
> **34** productos. Así que **ningún cambio legal de `slot_minutes` puede desalinear el catálogo actual.**
>
> **Esto no vuelve inútil la comprobación, y conviene entender por qué.** El riesgo nace en cuanto exista un
> producto con otro buffer, que es justo lo que la Task 2 permite crear: con `slot_minutes = 30`, un buffer
> de **30** es perfectamente válido, y **12, 20 y 60 lo rompen** —`30 % 20 = 10`—. Es el ejemplo exacto de
> `FASE_2_DISENO.md:711`.
>
> **Y una consecuencia de método: el aviso no se puede probar con los datos reales.** Hay que fabricar el
> caso —crear un producto con buffer 30 e intentar `slot_minutes = 20`—, y así está escrito en el Step 4. Un
> escenario que no distingue lo que cree estar probando ya costó una corrección en la Task 9 de la T3A.

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

Si `productosDesalineados()` devuelve algo, el diálogo lo dice **con los nombres**:

> Cambiar el bloque a **{n} minutos** dejará **{m} productos** con un tiempo de retorno que ya no encaja en
> los bloques: {lista}. Sus reservas seguirán funcionando, pero el bloqueo posterior terminará a mitad de
> bloque. Podés corregir su tiempo de retorno desde el inventario.

**No lo impide.** La base lo permite, y bloquearlo sería inventar una regla que el motor no tiene — el mismo
criterio por el que la aplicación nunca decide lo que RLS no decide.

- [ ] **Step 4: Los cuatro comandos y la pantalla**

Expected: verde. `build` de 22 rutas a **23**, con las mismas tres estáticas. `test` de ~100 a **~108**.

Verificar: cambiar la ventana de 7 a 10 días y comprobar **en `/catalogo/[id]/reservar`** que el calendario
ofrece diez días. **Ese es el efecto real**, y no se ve en la pantalla de ajustes.

Y provocar el aviso: poner un producto en buffer 30, intentar `slot_minutes = 20`, ver el aviso con su
nombre, confirmar, y comprobar que **se guardó igual**.

- [ ] **Step 5: Commit**

```powershell
git add app/(personal)/admin lib/admin components/admin
```

```powershell
git commit -m "Tanda 3B.10: /admin/ajustes, cierra Q-14" -m "Ruta que el diseño no tenia: su tabla y su arbol listan cinco pantallas de admin, y esta es la sexta. Aparece por D-39, cinco dias despues de escribir el diseño. Segunda mitad de Q-14, la que no esta en su enunciado: cambiar slot_minutes desalinea buffers YA GUARDADOS, y la Task 2 no puede verlo porque solo mira hacia adelante. El aviso enumera los productos afectados y NO impide guardar: la base lo permite, y bloquearlo seria inventar una regla que el motor no tiene. slot_minutes es un desplegable de ocho valores porque el check exige 60 % slot = 0."
```

---

# Task 11 · Verificación de punta a punta

**Files:** ninguno. Solo mide.

- [ ] **Step 1: La base, intacta**

Run: `npx supabase db reset; npx supabase test db`
Expected: **23 migraciones** y `Files=24, Tests=147, Result: PASS`. **El número exacto importa:** si sube,
alguna tarea coló SQL contra D-41, y eso se registra como desvío.

- [ ] **Step 2: El recorrido del admin, entero, en un navegador de verdad**

Entrar por magic link de Mailpit. Recorrer las nueve pantallas. Crear un producto con unidades, subir una
imagen, retirar una unidad, cancelar una reserva, inhabilitar un día, mirar las estadísticas, dar de alta a
un operador y cambiar un ajuste. **Consola sin un solo error ni advertencia del código.**

**Contra `npm run dev` y no contra `next start`:** React silencia en producción casi todas las advertencias
de desarrollo, así que el criterio de «ni una sola advertencia» solo se puede medir con el servidor de
desarrollo. Medido en la T3A.

- [ ] **Step 3: El recorrido del OPERADOR, que es el control**

Con sesión de `operador@upc.edu.pe`, escribir a mano las nueve URL de `/admin/*`. **Las nueve tienen que
mandarlo a `/mostrador`.** Y el mostrador tiene que seguir funcionando igual que al cerrar la T3A: las tres
columnas, las dos faltas, las notas y el filtro.

- [ ] **Step 4: El control que de verdad prueba que RLS manda**

Con un JWT de **operador** firmado a mano, por PostgREST y no por la pantalla:

- `PATCH /rest/v1/products?id=eq.…` → **cero filas sin error**. Tiene el `GRANT` de columna
  —`authenticated` lo incluye— y **no tiene política**: es el modo de fallo silencioso que el proyecto
  persigue desde la Fase 1.
- `POST /rest/v1/staff_members` → rechazo.
- `PATCH /rest/v1/app_settings` → cero filas.

**Con un JWT de alumno, contra `/api/cloudinary/firma` → 403.** Es el que cierra P0-4, y ya se midió en la
Task 4: se repite acá porque entre medias se tocaron ocho pantallas.

- [ ] **Step 5: Q-14, declarado cerrado solo si las dos mitades están**

1. El formulario de producto **no ofrece** un buffer no múltiplo *(Task 2)*.
2. El formulario de edición **tampoco** *(Task 3)* — la puerta de atrás.
3. `/admin/ajustes` **avisa** al desalinear productos existentes *(Task 10)*.

**Si falta cualquiera de las tres, Q-14 sigue abierto** y así se registra.

- [ ] **Step 6: Los cuatro comandos, dos veces**

Expected: `typecheck`, `lint`, `test` (**~108 en 9 archivos**) y `build` (**23 rutas**, 3 estáticas) en
verde, corridos **dos veces** — antes y después de cualquier corrección de texto, como en la T3A.

- [ ] **Step 7: Commit**

```powershell
git commit -m "Tanda 3B.11: verificacion de punta a punta" -m "23 migraciones y 147 aserciones sin cambios: D-41 respetado, la tanda no toco SQL. Nueve pantallas recorridas con admin y las nueve URL rebotadas con operador. RLS medido por PostgREST y no por la pantalla: el operador recibe cero filas SIN ERROR sobre products, que es el modo de fallo silencioso. Q-14 declarado cerrado solo tras comprobar sus TRES puertas: alta, edicion y ajustes."
```

---

# Task 12 · Cierre y documentación

**Files:**
- Modify: `MIGRATION_DOCS/ESTADO_Y_PLAN.md` · `MIGRATION_DOCS/FASE_2_DISENO.md` ·
  `MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md` · `CLAUDE.md` · este plan

- [ ] **Step 1: `ESTADO_Y_PLAN.md`**

Bitácora con el cierre; tabla de tandas con la T3B cerrada; **P0-4 cerrado** —el último crítico de la
auditoría—; **Q-14 cerrado** *(si las tres puertas pasaron)*; **D-41, D-42 y D-43** registradas; **Q-18
sigue abierto y ahora con destino escrito: la T4** *(D-41)*.

- [ ] **Step 2: `FASE_2_DISENO.md`, con las dos correcciones fechadas**

- La tabla de rutas *(líneas 404-408)* y el árbol *(§5, líneas 144-150)* ganan `/admin/ajustes`, **anotado
  fechado**, no reescrito: las cinco eran correctas el 2026-08-06 y la sexta nace de D-39, del 2026-08-11.
- §15 gana la corrección de **que Q-14 tenía dos mitades y su enunciado solo describía una**.

- [ ] **Step 3: `ESPECIFICACION_FUNCIONAL.md`**

F7 gana la corrección fechada del borrado en cascada **y** la de las categorías *(D-42)*. F8 ya está
corregida por D-40 desde la T3A: **comprobar que sigue ahí y no repetirla.**

- [ ] **Step 4: `CLAUDE.md`**

Estado de la T3B cerrada, y **la T4 como siguiente** con lo que hereda: Q-18, el advisor
`auth_leaked_password_protection`, `supabase/setup-cli@v1` en Node 20 y M-12.

- [ ] **Step 5: La cabecera de correcciones de este plan**

Todo lo que la ejecución desmintió, numerado y fechado. **Y el conteo de hechos falsos de subagente**, que
va en 18 al cerrar la T3A, con su género. **Y los errores de quien dictaba**, que van en cinco.

- [ ] **Step 6: Commit y entrega**

```powershell
git add MIGRATION_DOCS CLAUDE.md
```

```powershell
git commit -m "Tanda 3B.12: cierre y documentacion"
```

**Los comandos de empujar y abrir el PR los ejecuta Alejandro.** Claude no toca el remoto.

---

## Puntos a verificar — se resuelven midiendo, no suponiendo

| # | Pregunta | Los dos desenlaces |
|---|---|---|
| **1** | ¿PostgREST embebe `inventory_units` y `product_images` desde `products`? | **Sí** → `listarInventario()` es una consulta. **`PGRST200`** → dos consultas y agrupación en TypeScript. La T2A ya midió que `product_availability` **no** se embebe, y eso **no** predice esta |
| **2** | ¿`shadcn add select` vuelve a pisar `globals.css`? *(D-30)* | Correr `--dry-run` **y mirar el diff**. En la T3A no se repitió, y se supo por el diff, no porque el build siguiera verde |
| **3** | ¿Cuántas rutas deja el `build`? | Predicción: **14 → 23**, con las mismas tres estáticas. Si sale otro número, algo se creó o se perdió sin querer |
| **4** | ¿El secreto de Cloudinary aparece en `.next/static`? | **Cero coincidencias** o P0-4 sigue abierto. Es el paso que de verdad lo cierra |
| **5** | ¿`is_main` admite dos principales a la vez? | Medido que **la base no lo impide**. Comprobar que la aplicación sí, y qué queda si la segunda escritura falla |
| **6** | ¿Un `UPDATE` masivo que incluya una reserva `active` falla entero o parcialmente? | Postgres aborta la **sentencia entera**. Confirmarlo, porque decide si el filtro `status = 'reserved'` es una optimización o un requisito |

---

## Lo que esta tanda NO hace, para que no se cuele

- **No toca SQL** *(D-41)*. La base se queda en **23 migraciones y 147 aserciones en 24 archivos**. Si hace
  falta más SQL, se registra como desvío **antes** de escribirlo.
- **No cierra Q-18.** Las notas de unidad las sigue leyendo cualquier alumno con sesión. Mitigado por texto;
  arreglarlo es RLS y es de la T4.
- **No borra unidades ni productos.** La baja es `retired` *(punto 1 de «Tres choques»)*.
- **No permite dar de alta a quien nunca entró** *(punto 3)*.
- **No cancela reservas `active` al inhabilitar un día** *(D-40)*.
- **No toca la sanción de un alumno.** `admin_set_ban` existe y **esta tanda no le da pantalla**: no está en
  el índice de las doce tareas ni en la tabla de rutas del diseño. Se anota como pendiente.
- **No arrastra imágenes para reordenar.** Es estética; dos botones hacen lo mismo.
- **No se prueba contra producción.** La tanda escribe, y escribe sobre 34 productos y 92 unidades reales.
  **Todo en local**, como la T2B y la T3A.

---

## El entorno — y cada punto costó un fallo

1. **Docker Desktop puede estar apagado.** Arrancarlo. **No** usar `docker info 2>$null | Out-Null; if ($?)`
   para esperarlo: PowerShell 5.1 envuelve el stderr de un ejecutable nativo en un `NativeCommandError` y
   deja `$?` en `False` con Docker vivo. Mirar `$LASTEXITCODE`, o no redirigir el stderr.
2. `netsh interface ipv4 show excludedportrange protocol=tcp` — el rango **54245–54344** no debe estar. Al
   2026-08-12 no estaba.
3. **Comprobar el stack por el PUERTO DEL HOST**, nunca con `docker exec`: `docker ps` tiene que mostrar
   `0.0.0.0:54322->5432/tcp` y un `TcpClient` desde el host tiene que conectar.
4. **El stack completo son NUEVE contenedores**: `db`, `kong`, `auth`, `rest`, `realtime`, `studio`,
   `pg_meta`, `inbucket` y `edge_runtime`. `storage`, `analytics` y `db.pooler` están en `enabled = false`,
   así que **no arrancan nunca**. Si falta alguno de los nueve, `stop` y `start`.
5. **`db reset` regenera los UUID de `alumnos.id`.** Consultar por correo, nunca copiar un identificador de
   una sesión anterior. Los `a0000000-…000X` del seed son **`auth_user_id`**, no `alumnos.id`.
6. **Un escenario manual y las fixtures de pgTAP se estorban:** comparten los alumnos y las unidades del
   seed. Hace falta **`db reset` entre montar el escenario y correr pgTAP**.
7. **No hay `psql` en el host.** `docker exec` sirve para **montar**; para **medir** el comportamiento de la
   aplicación, PostgREST por `127.0.0.1:54321`.
8. **Al firmar un JWT a mano:** `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()`, **no** `Get-Date -UFormat %s`
   (da hora local, el token nace caducado, `PGRST303`). Y el cuerpo JSON con
   `[IO.File]::WriteAllText(ruta, json, (New-Object System.Text.UTF8Encoding $false))` —
   `Set-Content -Encoding utf8` mete BOM, `PGRST102`.
9. **Para leer el cuerpo de un error HTTP:** `$_.ErrorDetails.Message`.
   `$_.Exception.Response.GetResponseStream()` **ya viene consumido** y devuelve vacío.
10. **Para sacar el magic link de Mailpit** (`http://127.0.0.1:54324/api/v1/messages`), **no** usar
    `$_.To.Address`: devuelve un `PSMethod`, porque `$_.To` es `System.Object[]` y `System.Array` tiene un
    método nativo `Address(int)` que PowerShell resuelve antes de enumerar. **Falla en silencio**, con cero
    coincidencias. Usar `$_.To | Select-Object -ExpandProperty Address`. Y darle unos segundos.
11. **La sesión del navegador caduca a la hora** y cae en `/auth/error`. Se renueva con otro magic link.
12. **Se prueba por `http://127.0.0.1:3000`**, nunca por `localhost:3000` *(D-33)*.
13. **Para `npm run build` hay que parar `npm run dev`.**

---

## Cómo verificar lo que escriba un subagente

**Van 18 hechos falsos**, de cuatro géneros, y cada uno necesita una comprobación distinta:

| Género | Qué se inventa | Cómo se caza |
|---|---|---|
| **Dato** | El hecho | Comprobar el hecho |
| **Atribución** | La fuente *(el hecho es cierto)* | **Abrir el archivo que se cita como fuente**, no el que se cita como hecho |
| **Sobre-afirmación de alcance** | El cuantificador *(cierto en el caso que importa)* | Leer **hasta dónde llega** la afirmación |
| **Falsedad sobre la propia salvaguarda** | Dice haber marcado algo en un comentario, y el comentario no lo marca | **Releer el comentario** que dice haber escrito |

**Y van cinco errores de quien dictaba.** El cierre de la T3A aportó tres de golpe **sin un solo hecho falso
de subagente**: dos contradicciones numéricas dentro del propio encargo, que el subagente **copió al pie de
la letra sin notar el choque**, y una regla mal citada. **Un subagente fiel amplifica un encargo incoherente
en vez de corregirlo**, así que revisar el encargo antes de mandarlo vale tanto como revisar lo que vuelve.

**Pedirle siempre que enumere lo que no verificó y qué le pareció contradictorio.** Los cinco errores de
quien dictaba salieron de esa pregunta, y es lo más barato que hay.

---

## Pendientes que esta tanda hereda y no cierra

- **Q-18** · las notas de unidad las lee cualquier alumno con sesión. **Destino escrito: la T4** *(D-41)*.
- **M-12** · cancelación con antelación mínima. D-38 cerró la mitad; cancelar un minuto antes de empezar
  sigue sin restricción.
- **`auth_leaked_password_protection` desactivada** — séptimo advisor de seguridad, el único que no es
  intencional. No urgente: se entra por magic link, no por contraseña. **Material de la T4.**
- **`supabase/setup-cli@v1` apunta a Node.js 20**, deprecado. Anotado desde la T2B. Candidato a la T4.
- **`admin_set_ban` sigue sin pantalla.** El admin puede corregir una sanción por SQL, no por interfaz.
