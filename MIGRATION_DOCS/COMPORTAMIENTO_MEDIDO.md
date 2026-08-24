# UPC-Inventario — Comportamiento medido de la plataforma

> **Documento de referencia, no de estado.** Contesta *cómo se comporta de verdad* PostgREST, RLS,
> `@supabase/ssr`, Next.js 16 y la zona horaria de Lima **en este proyecto**, con la fecha y el método de
> cada medición.
>
> **No contesta** en qué estado está el proyecto —eso es
> [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md), que sigue siendo **la fuente de verdad**—, ni qué hace el
> sistema ([`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md)), ni cómo se construye
> (`FASE_n_DISENO.md`), ni qué trajo ejecutar cada tanda ([`PLANES/`](./PLANES/)).
>
> **Por qué existe:** estos hechos ya estaban escritos, repartidos entre los `PLANES/` y 7 656 líneas de
> comentario. Un plan es historia fechada y se consulta por tanda; esto se consulta **por síntoma**, que es
> como aparece el problema. Se consolidó aquí el 2026-08-22 al reducir los comentarios del código.
>
> **Regla de mantenimiento:** cada entrada lleva **cómo se midió**. Una que no se pueda reproducir con lo
> que dice, se marca — no se borra en silencio.

---

## 1. PostgREST · Códigos de error y su HTTP

Todos medidos contra el stack local en Docker, con JWT firmados a mano por rol. Las fechas son las de la
medición original.

| Código | HTTP | Cuándo aparece | Medido |
|---|---|---|---|
| `PGRST102` | 400 | `INSERT` múltiple cuyos objetos **no coinciden en el juego de claves**. Mensaje: *"All object keys must match"* | 2026-08-12 |
| `PGRST200` | 400 | Embed pedido en una dirección que la FK no ofrece. *"Could not find a relationship"* | 2026-08-12 |
| `PGRST303` | — | Trampa del **epoch**: unidad o zona equivocada en un timestamp | T3A |
| `23505` | **409** *(no 400)* | Clave única duplicada. El `message` nombra la constraint | 2026-08-12 |
| `23514` | 400 | `CHECK` violado. Aquí es el vehículo de **todas las reglas de negocio** rechazadas | 2026-08-12 |
| `42501` | 403 | `permission denied for table …` — se mandó una columna sin `GRANT` | 2026-08-12 |
| `22P02` | 400 | UUID malformado. PostgREST **ni intenta** la consulta: `eq.` no castea | 2026-08-10 |
| `21000` | 400 | *"UPDATE requires a WHERE clause"* — `PATCH` sin filtro | 2026-08-13 |

### 1.1 El fallo silencioso, y es el importante

> ⚠ **`HTTP 200` con cuerpo `[]` y ningún error es la respuesta normal de RLS cuando deniega.**

No hay excepción. Un `PATCH`, un `DELETE` o un `UPDATE` que RLS no autoriza **no devuelve 403**: devuelve
200 con cero filas. Medido por separado sobre `products`, `disabled_days`, `staff_members`,
`app_settings` e `inventory_unit_notes`, entre el 2026-08-12 y el 2026-08-13.

**Consecuencia para el código:** una escritura que no comprueba el número de filas afectadas **no puede
distinguir «no había nada que cambiar» de «RLS te lo denegó»**. Por eso las acciones de
`lib/admin/acciones.ts` verifican el resultado en lugar de mirar solo `error`.

Casos concretos medidos:

- `PATCH /rest/v1/products` con JWT de alumno → **200 con `[]`**.
- `DELETE /rest/v1/disabled_days` con JWT de operador → **200 con `[]`**, sin error.
- `PATCH /rest/v1/staff_members` de un operador sobre la fila de otro → **200 con `[]`**.
- `PATCH /rest/v1/app_settings?id=eq.true` con JWT de operador o de alumno → **200 con `[]`** *(los dos,
  2026-08-13)*.
- `DELETE` de una nota como admin → **200 con la fila borrada**; el mismo `DELETE` con JWT de alumno →
  **200 con `[]`**.

### 1.2 Atomicidad y orden

- **Un `INSERT` con array es una sola sentencia: o entran todas las filas o no entra ninguna.** Medido con
  tres unidades y dos códigos repetidos: quedaron **cero** en la tabla, no una. Por eso el alta de producto
  usa un `insert` con array y **nunca un bucle**.
- **PostgREST no promete devolver las filas en el orden en que se mandaron.** Emparejar por posición es
  apostar a eso; hay que releer por una clave natural (`unit_code`).
- **Un `PATCH` sin filtro de estado alcanza más filas de las que se pretende.** Medido: sobre un día con
  3 `reserved` y 1 `active`, un `PATCH` sin `status=eq.reserved` devolvió 400 y afectó a **las cuatro**.

### 1.3 Unicidad y embeds

- `inventory_units`: la unicidad es **`(product_id, unit_code)`, no global**. Medido con el
  contraejemplo — el mismo código en otro producto se aceptó con **HTTP 201** *(2026-08-12)*. Sin ese
  control negativo, «es único por producto» no se distingue de «es único y nadie repitió todavía».
- `product_images`: **«una sola principal por producto» NO la defiende la base.** Se insertaron dos con
  `is_primary = true` y PostgREST contestó **201** con las dos dentro *(2026-08-12)*. La regla la sostiene
  la aplicación: se apagan las demás con **un `PATCH` por producto**, no con un bucle *(medido: el `PATCH`
  devolvió 200 y apagó las dos)*.
- **Los embeds no son simétricos.** `products` → `product_images` + `inventory_units` funciona *(200 con
  las dos colecciones pobladas, 2026-08-12)*. En sentido contrario, o hacia una vista que comparte columna,
  devuelve `PGRST200`. **Se mide antes de escribirlo**: `products` ↔ `product_availability` falla en las
  dos direcciones.
- `inventory_unit_notes` → `staff_members(full_name)` devuelve **`PGRST200`**: la FK no existe en esa
  dirección. Por eso el historial de notas hace dos consultas.
- `staff_members` → `alumnos` tampoco embebe: **400 / `PGRST200` / "Searched for a foreign key…"**. Dos
  consultas, y no es estilo.

---

## 2. RLS · Cómo se manifiesta desde la aplicación

- **Un embed que RLS bloquea llega como `null`**, no como error. Medido en la T3A sobre `alumno` dentro de
  las reservas.
- **`private.is_admin()` exige `activo = true`.** De ahí un comportamiento asimétrico medido: un admin
  **sí puede desactivarse a sí mismo** *(200 con la fila)*, pero **no puede reactivarse** después
  *(200 con `[]`)* — al desactivarse dejó de ser admin para las políticas. Es irreversible desde la
  aplicación.
- **Las columnas sin `GRANT` no se mandan.** `created_by` y `updated_at` no se conceden a nadie: incluirlas
  en un `PATCH` o un `INSERT` da **403 / `42501`** *(2026-08-12 y 2026-08-13)*.
- **La transición de estado la defiende la base, y por las dos puertas.** Medido el mismo día contra la RPC
  y contra el `UPDATE` directo:

  | Intento | Resultado |
  |---|---|
  | `reserved → completed` | 400, `23514`, *"Transicion no permitida: reserved -> completed"* |
  | `reserved → active` | 200, la fila vuelve con `status = "active"` |
  | `active → cancelled` (directo) | 400, `23514`, *"Transicion no permitida"* |
  | `cancel_reservation` con JWT de la dueña sobre reserva ajena | 400, `23514` |
  | `cancel_reservation` con JWT de admin | **204, cancelada** |

- **`product_availability` está revocada a `anon`:** como anónimo devuelve **HTTP 401** *(2026-08-08)*. La
  vitrina pública no puede mostrar disponibilidad aunque quisiera, y el fallo sería **ruidoso**, no
  silencioso.
- **Un id inexistente y un id malformado fallan distinto.** UUID válido que no existe → `[]` con **200**.
  UUID malformado → `22P02` con **400**. Las dos ramas hacen falta.

---

## 3. `@supabase/ssr` y Next.js 16

Lo estructural —los tres clientes, `getClaims` frente a `getSession`, los tipos generados, las claves— está
en [`FASE_2_DISENO.md`](./FASE_2_DISENO.md) §7 *(D-24 a D-28)*. Aquí solo lo que se midió y muerde.

- **El cliente de servidor es una función, jamás una constante de módulo** *(D-24)*. Un singleton se
  comparte entre peticiones concurrentes y termina sirviéndole a un alumno la sesión de otro.
- **No se ejecuta nada entre crear el cliente y llamar a `getClaims()`.** Cualquier línea intermedia puede
  dejar pasar el refresco de token antes de que el cliente pueda escribirlo: el síntoma es un cierre de
  sesión intermitente que nunca apunta a su causa.
- **Las cookies vuelven por los dos lados** —al `request` y al `response`— o la sesión se desincroniza. Y
  los headers del request se reconstruyen **en cada uso**, no una vez: `request.cookies.set()` los cambia.
- **Un `NextResponse.redirect()` nace vacío.** No hereda cookies ni cabeceras de la respuesta que venía
  construyéndose; hay que copiarlas o el refresco de token se pierde justo en la petición que lo necesitaba.
- **La CSP va en el request y en el response, y no es redundancia.** Next.js lee el nonce de la cabecera
  **del request** al renderizar; el navegador solo ve la **del response**. Con una sola, o los scripts salen
  sin nonce y la CSP los bloquea todos, o la política nunca se aplica.
- **`Location` relativo en las redirecciones de auth.** Las dos formas de construir uno absoluto
  —`new URL(request.url).origin` y `request.nextUrl`— **emiten `localhost` aunque la petición llegara a
  `127.0.0.1`**. Medido. El navegador los trata como sitios distintos para las cookies, así que la sesión
  se escribe en un host y el usuario aterriza en el otro sin ella.
- **`/manifest.webmanifest` tiene que estar en la lista blanca del proxy.** Sin la entrada, el proxy lo
  rebota a `/login` con **307** *(medido el 2026-08-19 con `build` + `start`)* y la aplicación no se puede
  instalar. **No se arregla iniciando sesión**: el navegador lo pide sin credenciales. El `matcher` tampoco
  lo cubre — excluye extensiones de imagen, no `.webmanifest`.
- **El navegador ya ofrece instalar sin service worker** *(medido el 2026-08-19)*.
- **Ninguna ruta es estática.** Leer `headers()` en el layout raíz vuelve dinámicas todas, y se hace
  igual porque ya lo eran por otra vía. Medido sobre `npm run build`: al 2026-08-22 son **24 rutas, 24
  dinámicas**. *(La cifra cambia con cada pantalla nueva; lo que no cambia es que no hay ninguna estática.)*
- **`LayoutProps<...>` no sirve para los layouts de grupo.** Medido en `.next/types/routes.d.ts`:
  `type LayoutRoutes = "/"`. Se escriben a mano.
- **Los Server Components no pueden escribir cookies** —se renderizan en modo lectura—. Quien las escribe
  es el proxy. De ahí el único `catch` vacío justificado del proyecto, en `lib/supabase/server.ts`. En un
  **Route Handler** sí está permitido, y por eso `verifyOtp` deja la sesión puesta de verdad.

---

## 4. Zona horaria · Lima (UTC−5)

> ⚠ **El CI corre en `TZ=UTC`. La máquina de desarrollo, no.** Una prueba que dependa de la zona del
> proceso pasa en local y falla en CI, o al revés.

- **El día cambia.** Medido con `node -e`: el mismo instante es *"15 set. 2026"* en UTC y *"14 set. 2026"*
  en Lima. Cualquier agrupación por día pasa por `fechaEnLima()`.
- **Segundos, no milisegundos.** La firma de Cloudinary usa `Math.floor(Date.now() / 1000)`. Es la misma
  trampa del epoch que costó un `PGRST303`, con otra cara: allí era la zona, aquí la unidad.
- **`hour12: false`** en los formateos, por el mismo motivo.
- **El valor de Postgres para «sin fin»** llega por la API como *string* literal (`to_jsonb`), no como
  fecha *(2026-08-11)*.
- **Las pruebas que cruzan medianoche se miden con `node` antes de escribirlas**, no se razonan.

---

## 5. Vitest · El alias `@/`

> ⚠ **Corregido el 2026-08-22.** Seis comentarios del código decían *«no hay `vitest.config.ts`»*. **Sí
> lo hay**: `vitest.config.mts` en la raíz, desde el 2026-08-15. El hecho que justificaban sigue siendo
> cierto, pero **por otra razón**.

**El hecho, hoy:** `vitest.config.mts` existe pero **no declara `resolve.alias`**, así que `@/` no resuelve
bajo Vitest. `lint`, `typecheck` y `build` pasan en verde y **solo `vitest run` se rompe**.

**Consecuencia:** un módulo que se prueba con Vitest **no puede importar** `@/lib/supabase/server`. Por eso
la lógica pura vive separada de la que toca el cliente de servidor —`lib/admin/ajustes.ts` frente a
`lib/admin/acciones.ts`—. **La separación es por lo que Vitest puede resolver, no por capas.**

**Y la extensión es `.mts` a propósito:** `package.json` no declara `"type": "module"`, así que un `.ts`
con sintaxis ESM lo carga Vite como CommonJS y avisa en cada `npm test`.

---

## 6. React · Dos defectos medidos

- **React resetea un campo no controlado cuando el árbol se vuelve a renderizar.** Por eso todos los campos
  de los formularios de admin son controlados. Medido en la Task 2 de la T3B.
- **El nonce de Radix se pone durante el render, no en un `useEffect`.** `react-style-singleton` crea su
  `<style>` **una sola vez**; un nonce que llegue después no arregla nada, porque no hay una segunda hoja
  que acreditar.

### 6.1 Q-20 · Radix inyecta estilos por DOS mecanismos, no uno

Medido el 2026-08-19 sobre las dependencias instaladas, **y esto corrigió una lectura previa que los daba
por el mismo**:

| Qué se inyecta | Por dónde | ¿Lo alcanza `setNonce()`? |
|---|---|---|
| El *scroll-lock* del `<body>` | `react-style-singleton` → `get-nonce` | **Sí** |
| `[data-radix-select-viewport]` | JSX de `@radix-ui/react-select`, insertado por React DOM | **No** |

Cadena completa del primero: `@radix-ui/react-dialog` y `@radix-ui/react-select` → `react-remove-scroll`
→ `react-remove-scroll-bar` → `react-style-singleton` → `get-nonce`.

**Consecuencia:** `setNonce()` cierra el primero y **ninguna llamada alcanza al segundo**. La violación
de CSP que queda es de ese segundo mecanismo y su efecto es **cosmético** — se ve la barra de
desplazamiento del desplegable. Las dos alternativas son peores: un *hash* casa hasta que Radix cambie un
byte y entonces el bloqueo vuelve **en silencio**, y `'unsafe-inline'` desarma lo que D-56 construyó.

> **La lección, y por eso queda escrita:** la versión anterior de esa nota era una **lectura del código**
> de la dependencia presentada como mecanismo completo. Se corrigió en tres documentos el mismo día y **el
> comentario del código se quedó sin corregir** — corregir una afirmación caducada en un sitio no la
> corrige en los otros, y la copia que vive en el código es la que nadie relee. `lint` no lee prosa.

---

## 7. Datos reales de producción

> ⚠ **Cifras fechadas. No son el estado de hoy** — el estado vive en
> [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md). Se conservan porque explican por qué cierto código está escrito
> como está.

| Hecho | Valor | Fecha |
|---|---|---|
| Productos | 34 | 2026-08-19 |
| `products.featured` | `false` en **los 34** *(en el seed local: `true` en 2 de 4)* | 2026-08-19 |
| Reservas | 0 | 2026-08-12 |
| `disabled_days` | 0 filas, y las de producción tenían `reason` en `NULL` | 2026-08-10 |
| Imágenes por producto | 34 productos, ninguno con galería múltiple | 2026-08-19 |
| Horarios | pocos, tan pocos que juntarlos en memoria es gratis | 2026-08-21 |

> La primera fila de esta tabla es **la trampa número 1 del `CLAUDE.md`**: una vitrina filtrada por
> `featured` se ve llena en local y **vacía en el sitio real**, con todos los checks en verde.

---

## 8. Herramientas · Lo que miente

- **`npx supabase start` con Docker parado imprime su error y sale con código 0** *(medido el 2026-08-19:
  `LegacyDockerLifecycleInspectError` en la salida, `exit 0` en el código)*. Que el stack esté arriba **se
  comprueba por el efecto**: `docker ps`, o `netstat -ano` buscando el 54322.
- **`supabase status` tarda entre 7 y 12 s** *(medido dos veces)*. Los tiempos de espera del E2E lo tienen
  en cuenta.
- **El E2E necesita base limpia.** Con la base sucia de tres corridas da **3/6**. El arnés **detecta y
  aborta**, no limpia: limpiar por su cuenta borraría datos que alguien podía estar mirando.
- **El `seed.sql` no siembra ninguna reserva** *(comprobado: cero `insert into inventory_reservations`)*, así
  que cualquier reserva presente al arrancar es residuo de una corrida anterior.

---

## 9. Deuda de este documento

Nada pendiente al 2026-08-22. Las entradas que se retiren van aquí nombradas, con lo que se rompe si nadie
las toca.
