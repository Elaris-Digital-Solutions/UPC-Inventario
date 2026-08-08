# Fase 2 · Tanda 2A — Vitrina y catálogo · Plan de implementación

> Escrito el 2026-08-08, **antes de ejecutar nada**. Sale de `FASE_2_DISENO.md` §5, §9 y §10, y de lo que
> dejó medido `PLANES/FASE_2_TANDA_1.md`, no de la imaginación. Al terminar, la cabecera de correcciones va
> **arriba de este párrafo**, fechada. Los planes de este proyecto NO se reescriben tras ejecutar.

**Goal:** que un alumno pueda **ver qué hay**. Al final de la tanda existen la landing como vitrina
pública, la FAQ, el catálogo con filtros por sede y el detalle de cada producto. **Nadie reserva
todavía**: eso es la 2B.

**Architecture:** dos capas. **La de abajo** son las piezas compartidas —los componentes que faltan, el
host de las imágenes y la cabecera— que las cuatro pantallas usan. **La de arriba** son las pantallas, en
orden de menos a más datos: landing (sin stock), FAQ (estática), catálogo (stock por sede), detalle. Van en
ese orden porque cada una se ve funcionar sin la siguiente.

**La propiedad que define esta tanda: no escribe una sola fila.** Todo es lectura. Ninguna pantalla del 2A
puede corromper un dato, y esa es la razón del corte, no el tamaño.

**Tech Stack:** Next.js 16.3.0 (App Router) · React 19.2.8 · TypeScript estricto · Tailwind 4 · shadcn 4
sobre Radix · `@supabase/ssr` 0.12.4 · `@supabase/supabase-js` 2.112.2 · PostgreSQL 17 · pgTAP

## Lo que cambió al empezar a escribir este plan

**La tanda 2 se parte en dos, y la Fase 2 pasa de cinco tandas a seis.** Es **D-34**, decidida el
2026-08-08 al escribir este plan. El diseño lo dejaba anotado como riesgo —§12 y §14 de
`FASE_2_DISENO.md`— con un umbral: «si al escribir su plan pasa de unas quince tareas, se parte en dos».
El desglose dio **16**.

**Pero el conteo no es el argumento, y conviene decirlo porque el umbral invita a creer que sí.** El corte
cae en un sitio que no es arbitrario: **la 2A no escribe una sola fila en la base y la 2B toca las reglas
de negocio.** Landing, FAQ, catálogo y detalle son lectura pura; el calendario, la reserva, la cancelación
y la encuesta escriben. Una tanda que solo lee no puede corromper un dato, y eso cambia qué hay que
verificar y con cuánto cuidado.

**El segundo argumento es de revisión.** La tanda 1 tuvo **once** tareas y dejó **48 correcciones**. Un PR
de dieciséis tareas sobre nueve pantallas no lo revisa nadie de verdad, y cuando algo se rompa habrá
dieciséis sitios donde mirar.

| | 2A · vitrina y catálogo | | 2B · reserva y panel |
|---|---|---|---|
| 1 | Las piezas que faltan | 8 | La rejilla como lógica pura |
| 2 | Cabecera, pie y `/faq` en la lista blanca | 9 | `/catalogo/[id]/reservar` — el calendario |
| 3 | Landing `/` — vitrina sin stock | 10 | La reserva contra `create_reservation` |
| 4 | `/faq` y `not-found.tsx` | 11 | El bloqueo por sanción |
| 5 | `/catalogo` — sede, filtros, BR-14 | 12 | `/mi-panel` |
| 6 | `/catalogo/[id]` — detalle | 13 | Cancelación con motivo |
| 7 | Verificación en navegador y cierre | 14 | Encuesta (BR-18) |
| | | 15 | Verificación de punta a punta |
| | | 16 | Cierre y documentación |

> **El plan de la 2B se escribe al cerrar la 2A, no ahora.** Es la regla del proyecto: un plan escrito
> antes de tiempo se escribe sin lo que enseñe la tanda anterior, y la 2A va a enseñar cosas —la forma de
> las consultas, cómo se comporta el embed de PostgREST, qué trae `shadcn add`— que la 2B necesita. Lo que
> sí queda escrito ahora es **su alcance**, al final de este documento, para que partir no sea una excusa
> para recortar.

## Global Constraints

- **La autorización no se replica.** Ni una comprobación de permisos en el cliente que decida algo. El
  proxy redirige, el layout es comodidad, el componente oculta, y **quien decide es RLS**. Si quitar una
  comprobación del cliente abriera un agujero, estaba en el sitio equivocado.
- **Esta tanda no escribe una sola fila.** Ni un `insert`, ni un `update`, ni una llamada a
  `create_reservation` o `cancel_reservation`. Si una tarea parece pedirlo, es de la 2B y se anota como
  desvío antes de tocarla.
- **Ninguna migración.** La base quedó cerrada en **22 migraciones y 142 aserciones**. Si aparece una
  necesidad de SQL, significa que algo se entendió mal: se registra como desvío **antes** de escribirlo,
  con el costo por delante, igual que se hizo con D-32.
- **La landing no promete disponibilidad** *(D-21)*. Ni «quedan 3», ni «en stock», ni un badge de agotado.
  No la sabe, y un catálogo que filtra por un stock que no puede leer **miente**.
- **La aplicación nunca usa `service_role`.** Si un flujo la pide, falta una política, no una clave.
- **Se prueba siempre por `http://127.0.0.1:3000`, nunca por `localhost:3000`** *(corrección 27 de la
  T1)*, y con `.env.local` presente apuntando al stack local *(corrección 31)*. Sin él, `npm run dev` habla
  con el proyecto real.
- **Cada pantalla se abre en un navegador de verdad antes de darla por hecha.** Los cinco fallos de la T1
  pasaron con `typecheck`, `lint` y `build` en verde, y el quinto —D-33— solo aparecía ante un navegador,
  porque `curl` no manda cabecera `Origin`. Al probar por HTTP, la pregunta es **qué manda el cliente real
  que la sonda no manda**.
- Mensajes de commit **sin acentos**. **Claude no toca el remoto:** `push`, PR y merge los ejecuta
  Alejandro.

## Correcciones al diseño, antes de empezar

**Tres** cosas de `FASE_2_DISENO.md` que no son ciertas o no funcionarían tal como están escritas, y
salieron **leyendo el repositorio**. Se anotan aquí para no descubrirlas a mitad de la ejecución. Las que
afectan solo a la 2B van con su alcance, al final.

**Y una cuarta que no es del diseño**, sino de este mismo plan mientras se escribía, y que ninguna lectura
podía encontrar: salió de **consultar el proyecto real**.

### 1. **`/faq` es pública en el diseño y hoy pediría sesión**

§9 la lista como pública. Pero el proxy de la tanda 1 usa **lista blanca**, y su constante es
`RUTAS_PUBLICAS = ['/', '/login', '/auth']` (`proxy.ts:16`). `/faq` no está, así que cae en «todo lo demás
pide sesión» y rebota a `/login`.

**No es un defecto del proxy: es exactamente lo que se compró.** La corrección 18 de la tanda 1 eligió
lista blanca sobre lista negra para que «una pantalla nueva nazca protegida sin que nadie tenga que
acordarse de añadirla». El precio de esa propiedad es este: **abrir una ruta al público es un acto
deliberado y visible en el diff.**

→ Se añade `/faq` a `RUTAS_PUBLICAS` en la Task 2, con el comentario que lo explique. Y queda la regla:
**cada pantalla pública nueva es una edición de esa constante, nunca un olvido feliz.**

### 2. **`next/image` no sirve las imágenes de Cloudinary sin declarar el host**

`product_images.secure_url` guarda URLs de `res.cloudinary.com` —verificado en `supabase/seed.sql`, que
siembra `https://res.cloudinary.com/demo/image/upload/seed/cam-001.jpg`—. Next.js **bloquea** los hosts
remotos que no estén en `images.remotePatterns`, y el diseño no lo menciona en ningún sitio.

→ Va en `next.config.ts` en la Task 1, junto a `allowedDevOrigins`.

> **Y es del mismo género que los cinco fallos de la tanda 1: un fallo de a qué se CONECTA el código, no
> de qué dice.** El componente compila, `lint` pasa y `build` pasa. El error aparece cuando el navegador
> pide la imagen. Ninguna comprobación estática puede verlo.

### 3. **El detalle no necesita leer `inventory_units`**

§9 dice que `/catalogo/[id]` sale de `products`, `product_images` e `inventory_units`. Lo que la pantalla
muestra es **cuántas unidades hay por sede**, y eso ya lo da `product_availability` —`active_units` e
`in_stock`, agrupado por `campus_id`—.

Leer `inventory_units` le entrega al alumno el `unit_code` y el `asset_code` de todo el inventario físico.
**No es un agujero nuevo:** la política `units_select_auth` es `for select to authenticated using (true)`,
así que ya puede. Pero una pantalla que no lo necesita no tiene por qué pedirlo.

→ El detalle consulta `product_availability`. `inventory_units` es de la tanda 3, donde el admin los
gestiona.

### 4. **`featured` vale `false` en los 34 productos, y la vitrina habría salido vacía**

> **Esta no es una corrección al diseño, y la distinción importa.** §10 dice qué muestra la vitrina
> —«nombre, imagen, descripción, categoría»— pero **no dice de dónde sale la selección**. El primer
> borrador de la Task 3 rellenó ese hueco con `products.featured`, que es lo que cualquiera haría al ver
> esa columna en el esquema. **El diseño no se equivocó: dejó una decisión sin tomar, y quien la tomó se
> equivocó.** Un hueco en un documento se lee después como si estuviera resuelto.

**Medido el 2026-08-08 contra `zqfkzgdyeqxzgzpxgadi`, no leído.** En el proyecto real **ningún producto
está marcado como destacado**: `select count(*) from products where featured` devuelve **0** sobre 34.

**Y lo grave no es eso, sino dónde se habría visto bien.** `supabase/seed.sql` marca `featured = true` en
**2 de sus 4 productos**. En el stack local la vitrina se ve llena; en producción, vacía. `typecheck`,
`lint` y `build` en verde en los dos casos, y el recorrido en navegador —que es lo que encontró los cinco
fallos de la tanda 1— **también habría salido bien**, porque se hace contra el stack local.

→ **La vitrina ordena por `sort_order` y toma los primeros.** `featured` queda como columna que hoy no usa
nadie, hasta que la tanda 3 le dé interfaz al admin. Cuando alguien marque destacados, la landing podrá
usarla; hacerlo antes es construir contra un dato que no existe.

> **La regla que sale de aquí, y va más allá de esta pantalla:** el seed local **no es una muestra de los
> datos reales**. Es una fixture diseñada para que cada caso de prueba tenga un producto que lo ejercite
> —lo dice su propio comentario—, y por eso sus valores son *convenientes*, no *representativos*. Una
> pantalla cuyo contenido dependa del **valor** de una columna hay que mirarla contra producción antes de
> escribirla. Leer el esquema dice qué columnas existen; solo consultar dice qué hay dentro.

## Lo que ya está verificado contra el esquema

Leído en las migraciones, no supuesto. Sirve para no volver a mirarlo a mitad de una tarea.

| Pregunta | Respuesta, y dónde está escrita |
|---|---|
| ¿Un anónimo puede leer el catálogo? | Sí. `products_select_all` y `product_images_select_all` son `for select to anon, authenticated using (true)`, con su `grant select` — `20260805195304_catalog_policies.sql` |
| ¿Y la disponibilidad? | **No.** `revoke select on public.product_availability from anon` y la vista es `security_invoker` — `20260806023404_linter_fixes.sql`. Es D-18, y de ahí sale D-21 |
| ¿BR-14 se puede aplicar con una consulta? | Sí. `product_availability` agrupa por `(product_id, campus_id)`, así que filtrar por `campus_id` e `in_stock` da exactamente «productos con stock en esta sede». Un producto sin unidades saldría con `campus_id` nulo y el filtro lo excluiría solo — **hoy no hay ninguno**, ver la tabla de abajo |
| ¿De dónde salen las categorías? | De `products.category`, derivadas de los productos existentes. **No hay tabla de categorías**, igual que en el Vite |
| ¿De dónde sale la duración máxima del detalle? | `products.max_duration_hours` *(D-1)*, no de una constante |
| ¿El alumno puede leer el horario y la ventana? | Sí, `app_settings` tiene `grant select ... to authenticated` y `app_settings_select_auth`. Lo necesita la 2B, no esta tanda |

## La forma real de los datos

**Consultado el 2026-08-08 contra `zqfkzgdyeqxzgzpxgadi`**, porque el esquema dice qué columnas existen y
solo los datos dicen qué hay dentro. De aquí salió la corrección 4, y estas cifras son además el **criterio
de aceptación** de varias tareas: si una pantalla muestra otro número, el filtro no se aplicó.

| Dato | Valor real | Para qué importa |
|---|---|---|
| Productos | **34**, todos con categoría y descripción | Nada que defender contra nulos en la tarjeta |
| Imágenes | **34**, una por producto, **las 34 `is_main`** | La «galería» del detalle es hoy **una sola foto** y tiene que verse bien así |
| Host de las imágenes | **`res.cloudinary.com`**, uno solo | La corrección 2 está completa con un único patrón |
| `featured` | **0 de 34** | Corrección 4. El seed local dice 2 de 4 |
| Categorías | **10**, la mayor con 8 productos | Diez chips, no tres. Hay que ver cómo caen en móvil |
| Reparto por sede | **18 en San Miguel · 16 en Monterrico**, y **cada producto está en una sola sede** | **El catálogo filtrado muestra 18 o 16, nunca 34.** Si salen 34, BR-14 no se aplicó, y ese es el modo de fallo más probable de la Task 5 |
| Productos sin unidades | **0** | El caso del `campus_id` nulo existe en la vista y hoy no lo ejercita nadie |
| `max_duration_hours` | **4 en los 34** | D-1 existe pero hoy no varía. El detalle debe leerla igual, no escribir «4 h» |
| `app_settings` | 7 días · 08:00–22:00 · bloques de 30 · mínimo **30** · 1 por producto y día | **D-19 confirmada en producción.** Son los números de la FAQ, y de la rejilla de la 2B |
| `disabled_days` | **2 filas** | Para la 2B: hay con qué probar el día inhabilitado sin inventarlo |

## Puntos a verificar

Cinco, y los cinco se resuelven **midiendo**. Los dos desenlaces están escritos, para que medir no se
convierta en elegir el resultado que conviene.

1. **¿PostgREST deja embeber `product_availability` desde `products`?** Los tipos generados declaran la
   relación **desde** `product_images` e `inventory_units` **hacia** la vista, pero `products` sale con
   `Relationships: []` (`lib/database.types.ts`).
   **Y esa asimetría tiene una explicación que permite predecir el resultado**, en vez de dejar el punto
   abierto: PostgREST infiere relaciones a partir de **claves foráneas reales**, y las columnas de una
   vista las heredan. `product_images.product_id` **es** una FK que apunta a `products.id`, y la vista
   expone esa columna, así que la relación `product_images → product_availability` se deduce sola. Pero
   `products.id` → `product_availability.product_id` **no es una FK**: es una clave primaria vista desde
   el otro lado. Por eso `products` sale sin relaciones. Es la misma razón por la que la vista sí declara
   `campuses`, que llega por `inventory_units_campus_id_fkey`.
   → **Predicción: el embed NO funciona en esa dirección**, y el catálogo son **dos** consultas con la
   unión en el servidor.
   → Si funcionara, es **una** con `select('..., product_availability(...)')`, y se anota como corrección
   porque este razonamiento estaría incompleto.
   **En ningún caso se crea una vista nueva para conseguir el embed:** eso sería SQL, y esta tanda no toca
   SQL. Se mide **antes** de escribir la pantalla, que es para lo que existe el Step 0 de la Task 5.

   > **Por qué se escribe la predicción y no solo la pregunta.** Una predicción se puede equivocar y
   > queda por escrito que se equivocó; una pregunta abierta se «resuelve» siempre a favor de lo que uno
   > encuentre. Es la misma disciplina con la que la tanda 0 predijo dos fallos en `28_duration_slot.sql`
   > y fallaron cuatro: el número de más fue la información útil.

2. **¿Qué escribe `shadcn add` en `package.json`?** La tanda 1 midió que `add` **no** pisa `globals.css`
   como hacía `init` *(corrección 28)*. Lo que nadie midió es qué dependencias mete.
   → Si son paquetes de Radix que ya están en el árbol, no hay nada que decidir.
   → Si trae una librería nueva, se lee para qué sirve **antes** de aceptarla y se anota en el plan. Se
   compara `package.json` por hash antes y después, igual que la tanda 1 hizo con `globals.css`.

3. **¿La landing ve los productos SIN sesión?** Es la primera pantalla del proyecto que consulta la base
   como `anon`. La tabla de arriba dice que la política existe; una cosa es que exista y otra que la
   consulta funcione.
   → Si devuelve los **4** productos del seed —**34** contra el proyecto real—, `products_select_all` está
   haciendo su trabajo.
   → Si devuelve cero filas **sin error**, hay un privilegio donde el plan cree que no lo hay, y se para a
   mirarlo. **Cero filas sin error es el modo de fallo que persiguió media Fase 1**, y aquí reaparece en
   el cliente.

4. **¿`next/image` sirve las imágenes de Cloudinary, EN UN NAVEGADOR?** Con `remotePatterns` puesto
   debería. El optimizador de imágenes de Next corre en el servidor y pide la imagen él mismo, así que hay
   una petición más de la que se ve.
   → Si cargan, listo.
   → Si el optimizador devuelve 400 o 502, se lee su error **antes** de tocar la configuración. Y se
   comprueba con un navegador, no con `curl`: es la lección de D-33.

5. **¿La cabecera con sesión saca a la landing del prerender estático?** La tanda 1 midió que `/` y
   `/login` se **prerenderizan como estáticas** *(corrección 34)*. Una cabecera que llame a `getClaims()`
   desde el layout raíz vuelve **dinámicas todas las rutas**, incluida la vitrina pública.
   → Si el `build` lo confirma, la cabecera de la landing **no lee sesión**: muestra «Entrar» y punto, y
   la cabecera con sesión vive en el grupo `(alumno)`. Una vitrina pública no necesita saber quién mira.
   → Si no lo confirma —porque Next lo trate distinto—, se anota el resultado real y se decide con él
   delante. **Se mide comparando la salida de `next build` antes y después**, no leyendo el código.

## Estructura de archivos

```
next.config.ts                     MODIFICADO — images.remotePatterns (correccion 2)
proxy.ts                           MODIFICADO — /faq en RUTAS_PUBLICAS (correccion 1)

components/
  ui/badge.tsx                     NUEVO — por `shadcn add`
  ui/select.tsx                    NUEVO — por `shadcn add`
  ui/skeleton.tsx                  NUEVO — por `shadcn add`
  ui/separator.tsx                 NUEVO — por `shadcn add`
  cabecera.tsx                     NUEVO — navegacion compartida
  pie.tsx                          NUEVO — pie compartido
  catalogo/tarjeta-producto.tsx    NUEVO — la tarjeta, compartida por landing y catalogo
  catalogo/filtros.tsx             NUEVO — sede, busqueda y categorias (Client Component)

app/
  page.tsx                         REEMPLAZADO — la landing de verdad (D-21)
  faq/page.tsx                     NUEVO — publica
  not-found.tsx                    NUEVO — el 404 propio
  (alumno)/catalogo/page.tsx       REEMPLAZADO — el catalogo de verdad
  (alumno)/catalogo/[id]/page.tsx  NUEVO — el detalle

lib/catalogo/consultas.ts          NUEVO — las consultas, en un solo sitio
```

> **`app/(alumno)/catalogo/page.tsx` y `app/page.tsx` se REEMPLAZAN, no se crean.** Los dos son marcadores
> de posición y lo dicen en su primera línea: «Marcador de posicion de la tanda 1. NO es el catalogo.» y
> «Marcador de posicion de la tanda 0. NO es la landing.». **Si al terminar una tarea ese comentario sigue
> ahí, la tarea no está hecha.**

## Task 1 · Las piezas que faltan, y medir qué escribe el generador

**Files:** Modify `next.config.ts` · Create `components/ui/badge.tsx`, `components/ui/select.tsx`,
`components/ui/skeleton.tsx`, `components/ui/separator.tsx` *(por `shadcn add`)*

- [ ] **Step 0:** Comprobar el entorno antes de nada. Que `.env.local` existe y apunta a
      `http://127.0.0.1:54321`; sin él `npm run dev` habla con el proyecto real *(corrección 31 de la
      T1)*. Docker Desktop arrancado y `npx supabase start`. **No `db reset` para aplicar `config.toml`:**
      hacen falta `stop` y `start` *(corrección 7)*.
- [ ] **Step 1:** Anotar el hash de `app/globals.css` y de `package.json` ANTES de correr el generador.
      Sin la foto previa, el diff después no prueba nada.
- [ ] **Step 2:** Ejecutar `npx shadcn@latest add badge select skeleton separator`. **Solo estos cuatro.**
      Los del calendario —`calendar`, `dialog`, `textarea`, `radio-group`— son de la 2B: un componente sin
      pantalla que lo use es superficie muerta que hay que mantener.
- [ ] **Step 3:** Volver a hashear y leer el diff de `package.json`. Es el punto a verificar 2. Se anota
      qué entró, aunque sea nada.
- [ ] **Step 4:** Declarar `res.cloudinary.com` en `images.remotePatterns` *(corrección 2)*, con el
      comentario de por qué: sin él `next/image` falla **en ejecución**, y ni `typecheck` ni `build` lo
      ven. El comentario va en el archivo, no solo en este plan.
- [ ] **Step 5:** Correr `npm run typecheck`, `npm run lint`, `npm run build`. Los tres en verde.
- [ ] **Step 6:** Commit `Tanda 2A.1: componentes de interfaz y el host de las imagenes`.

## Task 2 · La cabecera, el pie, y `/faq` deja de pedir sesión

**Files:** Modify `proxy.ts` · Create `components/cabecera.tsx`, `components/pie.tsx` · Modify
`app/layout.tsx`

- [ ] **Step 1:** Añadir `/faq` a `RUTAS_PUBLICAS` *(corrección 1)*. En el comentario, la regla: la lista
      blanca hace que una pantalla nueva nazca protegida, así que **abrir una al público es deliberado y
      se ve en el diff**. No se toca el matcher.
- [ ] **Step 2:** Resolver el punto a verificar 5 antes de escribir la cabecera. Se mide con `next build`:
      si una cabecera que lee sesión en el layout raíz saca a `/` del prerender estático, la cabecera de
      la vitrina **no lee sesión**.
- [ ] **Step 3:** Escribir `components/cabecera.tsx`. Con el desenlace recomendado del punto 5: dos
      variantes, la pública —logo, Catálogo, FAQ, «Entrar»— y la de sesión, que añade salir. En el
      comentario del archivo: **esto no decide nada.** Quien no debería llegar al catálogo ya lo tiene
      cerrado por el proxy y por RLS; la cabecera solo evita enseñar un botón que no funciona.
- [ ] **Step 4:** Salir es un POST, no un enlace. `/auth/signout` no exporta `GET` —la tanda 1 midió que
      devuelve **405**, y eso es correcto—. Se usa un `<form method="post">`.
- [ ] **Step 5:** El pie, con lo mínimo: el nombre del servicio y el enlace a la FAQ.
- [ ] **Step 6:** Comprobar en el navegador, por `127.0.0.1:3000`, que `/faq` responde sin sesión y que
      una ruta no declarada —`/catalogo`— sigue rebotando a `/login`. **Los dos sentidos**, que es como la
      tanda 1 verificó el proxy: comprobar solo que lo abierto abre no prueba que lo cerrado siga cerrado.
- [ ] **Step 7:** `typecheck`, `lint`, `build` y commit `Tanda 2A.2: cabecera, pie y la FAQ como ruta
      publica`.

## Task 3 · La landing, que es una vitrina y no un catálogo *(D-21)*

**Files:** Create `lib/catalogo/consultas.ts`, `components/catalogo/tarjeta-producto.tsx` · Replace
`app/page.tsx`

- [ ] **Step 1:** Resolver el punto a verificar 3. Consultar `products` como anónimo contra el stack local
      y contar las filas **antes** de escribir la pantalla. Si salen cero sin error, se para.
- [ ] **Step 2:** Escribir la consulta en `lib/catalogo/consultas.ts`: `products` con su imagen principal
      de `product_images` (`is_main`), ordenados por `sort_order`. **Sin `product_availability`** — y el
      comentario dice por qué, porque en seis meses parecerá un olvido.
- [ ] **Step 3:** La tarjeta de producto, compartida con el catálogo de la Task 5. Nombre, categoría,
      descripción e imagen. **Sin ningún dato de stock**, ni siquiera oculto tras una condición.
- [ ] **Step 4:** Reemplazar `app/page.tsx`. Qué es el servicio, la vitrina **ordenada por `sort_order`**
      *(corrección 4: `featured` vale `false` en los 34 y filtrar por ella deja la vitrina vacía en
      producción y llena en local)*, las dos sedes —`public/Campus.png` y `public/campus-san-miguel.webp`,
      que sobrevivieron a la tanda 0 porque son contenido y no andamiaje— y el llamado a entrar.
- [ ] **Step 5:** Verificar en el navegador que se ve IGUAL con sesión y sin ella. Si cambiara, la vitrina
      estaría prometiendo algo que depende de quién mira, y eso es justo lo que D-21 descarta.
- [ ] **Step 5-bis:** **Contar los productos que pinta la vitrina contra el stack local, y saber cuántos
      espera.** Es la lección de la corrección 4 convertida en paso: la pantalla que sale bien en local es
      exactamente la que hay que contar, no la que hay que dar por buena.
- [ ] **Step 6:** `typecheck`, `lint`, `build` y commit `Tanda 2A.3: la landing como vitrina publica`.

## Task 4 · La FAQ y un 404 propio

**Files:** Create `app/faq/page.tsx`, `app/not-found.tsx`

- [ ] **Step 1:** Escribir la FAQ con las reglas que el alumno necesita saber, en su idioma y no en el del
      esquema: horario de 08:00 a 22:00, la duración depende del equipo *(D-1)*, se reserva hasta 7 días
      por delante *(D-3)*, una reserva por equipo y día *(BR-09)*, qué pasa si no recoges —15 días de
      bloqueo a la segunda— y qué pasa si no devuelves —bloqueo permanente— *(D-12)*. **Los números salen
      de `app_settings` y de la especificación funcional, no de la memoria de nadie.**
- [ ] **Step 2:** Escribir `app/not-found.tsx`. Hoy responde el 404 de fábrica de Next: el `build` de la
      tanda 1 reportaba `/_not-found`.
- [ ] **Step 3:** Comprobar los dos en el navegador: `/faq` **sin sesión** —que es lo que la Task 2
      abrió— y una ruta inventada, que tiene que dar el 404 nuevo y no el de fábrica.
- [ ] **Step 4:** `typecheck`, `lint`, `build` y commit `Tanda 2A.4: FAQ publica y pagina 404 propia`.

## Task 5 · El catálogo, con sede y filtros *(BR-14)*

**Files:** Modify `lib/catalogo/consultas.ts` · Create `components/catalogo/filtros.tsx` · Replace
`app/(alumno)/catalogo/page.tsx`

- [ ] **Step 0:** Medir el embed antes de escribir nada *(punto a verificar 1)*. Una llamada a PostgREST
      con sesión de alumno, y se mira qué devuelve. De ahí sale si el catálogo es una consulta o dos.
- [ ] **Step 1:** La sede. Se leen de `campuses` las activas. La sede elegida viaja como **query param**,
      igual que en el Vite: así la pantalla se puede enlazar y compartir, que es lo que una pestaña no
      permitía.
- [ ] **Step 2:** Decidir qué se muestra sin sede elegida, y no dejarlo al azar. Se elige la primera activa
      por defecto y **se dice cuál es**. Un catálogo sin sede no puede aplicar BR-14 y acabaría mostrando
      un stock que no existe en ningún sitio concreto.
- [ ] **Step 3:** BR-14 contra `product_availability`: solo productos con `in_stock` en la sede elegida.
      **El filtro se aplica en la consulta, no en el cliente.** Filtrar después de traer todo funciona
      igual de bien y enseña el inventario entero a quien mire la respuesta.
- [ ] **Step 4:** Los filtros, en un Client Component: búsqueda por nombre y descripción, y chips de
      categoría derivadas de los productos que hay. Son comodidad de navegación y no tocan permisos.
- [ ] **Step 5:** Reemplazar el marcador de posición. Si al terminar sigue diciendo «El catálogo llega en
      la tanda 2», la tarea no está hecha.
- [ ] **Step 6:** Verificar en el navegador con sesión de alumno: cambiar de sede cambia la lista, buscar
      filtra, una categoría filtra. **Y sin sesión, que `/catalogo` siga rebotando a `/login`** — la
      tanda 1 lo dejó funcionando y esta tanda no puede romperlo.
- [ ] **Step 6-bis:** **Contar, y contra los datos reales.** La lista tiene que traer **18 productos en San
      Miguel y 16 en Monterrico**, nunca 34: cada producto está en una sola sede, medido. **Ver 34 es la
      firma de que BR-14 no se aplicó**, y es el modo de fallo más probable de esta tarea, porque una
      pantalla con 34 tarjetas bonitas no parece rota. En el stack local los números son otros —cuatro
      productos— y ahí el conteo no distingue gran cosa.
      → **Cómo se mira sin ensuciar nada:** o se consulta la base real por SQL y se compara con lo que
      pinta la pantalla local, o se **aparta el `.env.local`** y se abre la pantalla contra producción,
      que es el procedimiento que dejó escrito la tanda 1. **Esta tanda puede permitírselo justamente
      porque no escribe:** apuntar el desarrollo a producción fue el fallo (b) de la tanda 1 porque allí
      había un `signInWithOtp` detrás que mandaba correos y creaba cuentas. Aquí solo hay `select`.
      → Y se **devuelve el `.env.local` al terminar**. Olvidarlo deja el desarrollo hablando con el
      proyecto real, que es donde la 2B sí escribe.
- [ ] **Step 7:** `typecheck`, `lint`, `build` y commit `Tanda 2A.5: catalogo con sede, filtros y BR-14`.

## Task 6 · El detalle del producto

**Files:** Create `app/(alumno)/catalogo/[id]/page.tsx` · Modify `lib/catalogo/consultas.ts`

- [ ] **Step 1:** `params` es una Promise en Next.js 16 y hay que esperarla. No es un detalle de estilo:
      escribirlo como en las versiones viejas no compila con `strict`.
- [ ] **Step 2:** La consulta: `products`, sus `product_images` ordenadas por `sort_order`, y el stock por
      sede desde **`product_availability`** — **no `inventory_units`** *(corrección 3)*.
- [ ] **Step 3:** La pantalla: nombre, categoría, descripción, imágenes, disponibilidad por sede y **la
      duración máxima real del producto**, que sale de `max_duration_hours` *(D-1)* y no de «1 a 4 horas»
      —hoy vale 4 en los 34, y leerla igual es lo que hace que el día que un producto cambie no haya que
      tocar la pantalla—.
- [ ] **Step 3-bis:** **La galería tiene que verse bien con UNA sola imagen, que es el caso real de los
      34.** Medido: hay 34 imágenes para 34 productos y las 34 son `is_main`. Una tira de miniaturas con
      un solo elemento es un adorno vacío. Se diseña para una y se admiten varias, no al revés — el admin
      podrá subir más en la tanda 3.
- [ ] **Step 4:** Un id inexistente llama a `notFound()`, que ahora tiene pantalla propia gracias a la
      Task 4. Se comprueba con un UUID inventado.
- [ ] **Step 5:** El botón de reservar, y es una decisión, no un olvido. La pantalla de reserva es de la
      2B. Se pone **deshabilitado**, diciendo que llega pronto, en vez de enlazar a una ruta que daría
      404. La tanda 1 estableció que un `404` tras una redirección interna es el resultado correcto; un
      botón visible que lleva a un 404 no lo es, porque el que se lleva el fallo es el usuario.
- [ ] **Step 6:** Verificar en el navegador: entrar desde una tarjeta del catálogo, ver la galería, y
      probar el id inventado.
- [ ] **Step 7:** `typecheck`, `lint`, `build` y commit `Tanda 2A.6: detalle de producto`.

## Task 7 · Verificación de punta a punta, y cierre

**Files:** Modify `MIGRATION_DOCS/ESTADO_Y_PLAN.md`, `MIGRATION_DOCS/FASE_2_DISENO.md`, `CLAUDE.md`, este
plan

- [ ] **Step 1:** `npx supabase db reset` antes de la batería pgTAP *(corrección 10 de la T1)*. Entrar por
      el flujo real crea alumnos, y `14_rls_alumnos.sql` afirma un conteo fijo. Si se sondeó, la batería
      falla por contaminación y no por un defecto.
- [ ] **Step 2:** `npx supabase test db`: tienen que seguir siendo 142 aserciones en 23 archivos. Esta
      tanda no toca SQL, así que un número distinto significa que algo se tocó sin querer.
- [ ] **Step 3:** El recorrido entero en un navegador de verdad, por `127.0.0.1:3000`, y no por partes:
      landing sin sesión → FAQ → entrar con magic link → catálogo → cambiar de sede → filtrar → abrir un
      detalle → volver → salir → comprobar que `/catalogo` vuelve a rebotar. **Es lo único que encontró
      los cinco fallos de la tanda 1.**
- [ ] **Step 4:** `typecheck`, `lint`, `test` y `build`. **Anotar cuántas rutas deja el build y cuáles son
      estáticas**, para comparar con las ocho de la tanda 1.
- [ ] **Step 5:** Actualizar los documentos de registro: `ESTADO_Y_PLAN.md` —la tabla de tandas pasa a
      seis, **D-34**, la bitácora y las tareas 2.5 y 2.6—, `FASE_2_DISENO.md` con la **corrección
      fechada** de §12 y §14 *(el riesgo anotado se materializó; no se reescribe, se anota)*, y
      `CLAUDE.md`. **Las ediciones de documentación se cierran ANTES de pasar los comandos de git.**
- [ ] **Step 6:** Entregar los comandos de PowerShell para la rama, el push y el PR. Los ejecuta
      Alejandro.

## El alcance de la 2B, para que partir no sea recortar

El plan detallado se escribe al cerrar la 2A. Lo que queda fijado ahora es qué entra, y **tres
correcciones al diseño que ya están encontradas y que la 2B no puede volver a descubrir**.

| Tarea | Título |
|---|---|
| 8 | La rejilla como lógica pura |
| 9 | `/catalogo/[id]/reservar` — el calendario |
| 10 | La reserva contra `create_reservation` |
| 11 | El bloqueo por sanción |
| 12 | `/mi-panel` |
| 13 | Cancelación con motivo |
| 14 | Encuesta (BR-18) |
| 15 | Verificación de punta a punta |
| 16 | Cierre y documentación |

### Tres correcciones que ya están encontradas

**a) Una rejilla vacía es ambigua.** `available_slots` devuelve **cero filas** tanto en un día
inhabilitado como en un día donde no queda nada libre — el `not exists` sobre `disabled_days` está dentro
del `where` (`20260806171930_available_slots.sql`). La interfaz **no puede distinguir «ese día no hay
atención» de «ese día está lleno»** a partir de esa respuesta. Hay que consultar `disabled_days` aparte, y
el alumno puede: `disabled_days_select_auth` se lo permite.

**b) «Hoy» tiene que calcularse en `America/Lima`.** `available_slots` recibe un `p_date date`. El
servidor de producción corre en UTC y el navegador en la zona del alumno: a las 20:00 de Lima, los tres
pueden estar en días distintos. Es **M-7** reapareciendo en el cliente, y el diseño no lo menciona al
describir el calendario.

**c) `cancel_reservation` solo acepta el estado `reserved`.** Lo dice el paso de la RPC: `if v_status <>
'reserved' then raise` (`20260806012057_cancel_reservation_rpc.sql`). El panel del Vite ofrecía cancelar
«reservas activas», que en el esquema nuevo son las **ya entregadas**. El botón tiene que **desaparecer**
cuando la reserva está en `active`, no fallar al pulsarlo. **La interfaz se alinea con el motor, nunca al
revés.**
