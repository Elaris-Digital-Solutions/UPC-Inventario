# Fase 2 · Tanda 2A — Vitrina y catálogo · Plan de implementación

---

## 📍 Dónde se paró — pausa del 2026-08-10, 14:23

> **Bloque temporal.** Se borra al cerrar la tanda; lo que sea reutilizable se convierte en receta, como se
> hizo con el bloque equivalente de la tanda 1.

**SEIS de siete tareas cerradas.** Rama `feature/fase-2-tanda-2a`, **ocho commits, NADA empujado**, árbol
limpio. `develop` sigue en `e03523c`.

| Commit | Tarea |
|---|---|
| `e60e128` | 2A.1 · componentes de interfaz y el host de las imágenes |
| `b76085d` | 2A.2 · cabecera, pie y la FAQ como ruta pública |
| `2ff7538` | 2A.3 · la landing como vitrina pública |
| `309d634` | 2A.3-bis · la tarjeta, arreglada con un navegador delante |
| `14aaf35` | 2A.4 · FAQ pública, 404 propio y salida desde `/login` |
| `7f598d6` | registro de la pausa anterior |
| `57ab928` | 2A.5 · catálogo con sede, filtros y BR-14 |
| `d3d82fb` | 2A.6 · detalle de producto |

**Falta SOLO la Task 7: verificación de punta a punta y cierre.**

### ⚠ Lo primero al volver, y es nuevo: el seed impide entrar en local

**Con `seed.sql` tal cual, NADIE puede entrar en el stack local.** GoTrue devuelve **500** al pedir el
magic link y el correo no llega nunca a Mailpit. Está explicado entero en la **corrección 21**.

**El arreglo, que hay que repetir después de cada `db reset`:**

```
docker exec supabase_db_UPC-Inventario psql -U postgres -d postgres -c "update auth.users set confirmation_token = coalesce(confirmation_token, ''), recovery_token = coalesce(recovery_token, ''), email_change_token_new = coalesce(email_change_token_new, ''), email_change = coalesce(email_change, '') where confirmation_token is null or recovery_token is null or email_change_token_new is null or email_change is null;"
```

**Y esto choca de frente con el Step 1 de la Task 7, que empieza con `npx supabase db reset`.** El orden
correcto es: `db reset` → `supabase test db` → **volver a aplicar este `update`** → recién entonces el
recorrido en navegador. Si se hace al revés, el login falla y parecerá un defecto de la aplicación.

**Decisión abierta para el cierre:** o se arregla `seed.sql` de raíz, o esto queda como receta permanente.
La 2B entra en local constantemente, así que le pesa más a ella que a esta tanda.

### Lo que hay que levantar antes de seguir

1. **Docker Desktop arrancado**, luego `npx supabase start` desde la raíz del repositorio. Que aparezcan
   seis servicios como «Stopped» —storage, imgproxy, edge_runtime, analytics, vector, pooler— **es lo
   correcto**: `config.toml` los deshabilita a propósito.
2. **`.env.local` tiene que existir** y apuntar a `http://127.0.0.1:54321`. **No se versiona**, así que
   sobrevive a los checkouts pero no a un clon nuevo. **Comprobarlo antes de tocar nada** *(corrección 31
   de la tanda 1)*.
3. El `update` de `auth.users` de aquí arriba, si se hizo `db reset`.
4. `npm run dev`, y probar **siempre por `http://127.0.0.1:3000`**, nunca por `localhost:3000`.
5. **Borrar `.next/` si se mueve, renombra o borra algo dentro de `app/`** *(corrección 6)*.

### La cuenta con la que se entra, y cómo

`alumno.a@upc.edu.pe` (Ana) **tiene el perfil completo**, así que cae directo en `/catalogo` sin pasar por
`/completar-perfil`. El magic link se recoge de Mailpit por API, sin abrir su interfaz:

```
curl -s "http://127.0.0.1:54324/api/v1/messages?limit=1"
```

y luego `http://127.0.0.1:54324/api/v1/message/<ID>`, de donde se saca el enlace a
`127.0.0.1:3000/auth/confirm?token_hash=...`. **Es de un solo uso.**

### El navegador ya está disponible, y costó habilitarlo

El plugin **`chrome-devtools-mcp@claude-plugins-official`** está habilitado en
`.claude/settings.local.json`, junto al de Supabase. **Ese archivo NO se versiona** —lo ignora una regla
global de git—, así que en otra máquina hay que volver a habilitarlo. Se activa sin reiniciar la sesión con
`/reload-plugins` y luego `/mcp`. Hay también un plugin de Playwright conectado.

**Y esto no es un detalle de comodidad:** **cinco** de los hallazgos de esta tanda **solo aparecieron con
un navegador delante**, y ninguno lo habría visto `typecheck`, `lint`, `build` ni una sonda HTTP. El
último, el 404 duplicado de la corrección 29, apareció con las tres herramientas en verde.

> **Trampa de la herramienta, medida en la Task 5:** el **snapshot** del árbol de accesibilidad se queda
> **rancio** tras una navegación de cliente y llegó a mostrar la pantalla anterior. **Confirmar siempre
> contra el DOM vivo con `evaluate_script`** antes de creerse un snapshot. Ver la corrección 26.

### Lo que quedó medido y sirve para lo que falta

- **El embed `products` → `product_images` FUNCIONA**, y el de **`product_availability` NO**, en
  **ninguna** de las dos direcciones *(corrección 18)*. El catálogo y el detalle usan **dos consultas**.
  **Ya está medido: no hay que repetirlo.**
- **Datos reales de producción** *(reconfirmados el 2026-08-10)*: 34 productos, **18 con stock en San
  Miguel y 16 en Monterrico**, **cero productos en dos sedes**, 10 categorías, una imagen por producto,
  `max_duration_hours` = 4 en los 34, **ninguna sede inactiva**.
- **Datos del stack local, que NO se parecen:** 4 productos, **3 en Monterrico y 2 en San Miguel** —el
  Laptop está en **las dos**, cosa que en producción no pasa—, el Laptop con `max_duration_hours = **8**`,
  dos productos **sin ninguna imagen** y dos con una que da **404** porque el cloud `demo` de Cloudinary no
  la tiene. **En local las fotos del catálogo salen rotas y eso es lo esperado.**
- **Un id malformado y un UUID inexistente fallan distinto** *(corrección 28)*: `22P02`/400 el primero,
  `[]`/200 el segundo.

### Lo que ya NO hace falta hacer en la Task 7

- **Cerrado el pendiente de la corrección 15** *(ver corrección 25)*: con sesión real, `/ruta-inventada` da
  el 404 propio y no rebota. Ya no hay que medirlo.

### Tres decisiones abiertas para el cierre, ninguna bloquea

1. **`seed.sql` y el login** — arreglarlo de raíz o dejarlo como receta *(corrección 21)*.
2. **`components/ui/select.tsx` quedó sin usar** al elegir pestañas en vez de desplegable. Es superficie
   muerta según el criterio que la propia Task 1 escribió *(corrección 27)*.
3. **«Volver al catálogo» pierde la sede elegida** *(corrección 32)*.

### Pendiente que viene de antes y sigue igual

- **A 390 px de ancho no está verificado.** Chrome no redimensiona por debajo de **485** en Windows con la
  herramienta usada. A 485 no hay desborde horizontal. **Playwright sí controla el viewport de verdad**,
  así que es la vía si se quiere cerrar.

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

> **El plan de abajo no se reescribe.** Esto es lo que la ejecución desmintió, anotado al cerrar cada
> tarea y no al final, para no perderlo.

### Task 1 · El plan pedía una versión que el proyecto ya tenía fijada

1. **El plan dice `npx shadcn@latest` y eso habría traído una versión distinta de la del proyecto.**
   `shadcn` está **declarado en `devDependencies`** —`^4.16.2`, instalado 4.16.2—, así que `@latest` se
   habría descargado otra por encima y el generador que escribe el código no habría sido el que el
   `package.json` fija. Se usó `npx shadcn` a secas, que resuelve el local.
   → **Es el reverso exacto de lo que anotó la tanda 1** al final de su Task 5: allí `npx supabase` trajo
   la 2.112.0 en vez de la 2.111.0 «porque la CLI no está fijada en ningún sitio del repositorio». Aquí
   **sí** lo está, y el plan lo ignoró. La regla que sirve para las dos: **antes de invocar una herramienta
   que genera código, mirar si el proyecto ya dice cuál.**

2. **`shadcn add` tiene `--dry-run`, y es mejor instrumento que los hashes.** El plan medía el efecto
   *después*; `--dry-run` lo **predice antes**, y dijo exactamente lo que pasó: «Files (4) +4 new», sin una
   sola modificación. Los hashes no se retiran —una predicción no es un hecho— pero pasan a confirmar en
   vez de a descubrir. **Se usaron los dos, y el orden correcto es ese.**

3. **Punto a verificar 2, resuelto por el lado bueno y con margen.** `app/globals.css` y `package.json`
   salieron con **el hash idéntico** —`9f5a30c0…` y `e7ea3a31…` antes y después—, así que `add` no pisa
   nada y **no añadió ni una dependencia**. La corrección 28 de la tanda 1 se extiende: valía para
   `globals.css`, vale también para `package.json`.
   → **Y se comprobó lo que el punto a verificar no preguntaba, que era la mitad que importaba:** de dónde
   importan los cuatro componentes. Salen de `radix-ui`, `lucide-react` y `class-variance-authority`, **los
   tres declarados**. Si hubieran importado de `@radix-ui/react-select` —que llega solo de forma
   transitiva— habría compilado igual y sería una **dependencia invisible**, que es literalmente la
   corrección 16 de la tanda 1. **Cero dependencias nuevas no es lo mismo que cero dependencias sin
   declarar**, y solo la segunda pregunta protege de algo.

**Verificado al cerrar la tarea:** `typecheck`, `lint` y `build`, los tres en verde. El `build` deja **ocho
rutas** —`/` y `/login` estáticas, las otras seis dinámicas—, **idéntico a como lo dejó la tanda 1**. Ese
número es la línea base contra la que se mide el punto a verificar 5 en la Task 2.

### Task 2 · Mover un archivo dejó al `typecheck` mintiendo, y solo en local

4. **Punto a verificar 5, resuelto midiendo y por el lado que se temía.** Se escribió la cabecera leyendo
   `getClaims()`, se enganchó en `app/layout.tsx` y se comparó `next build` contra la línea base de la
   Task 1: **las ocho rutas pasaron de `○` a `ƒ`** y desapareció la línea `○ (Static)` del pie del informe.
   Cualquier lectura de cookies en el layout raíz vuelve dinámico todo lo que cuelga de él, y de él cuelga
   todo. Se aplicó el desenlace previsto y **`/`, `/login` y `/_not-found` volvieron a `○`**.
   → **Lo que hace que esto valga la medición y no el razonamiento:** el código que lo provoca no está en
   la landing. Está en un componente de la cabecera, tres archivos más allá, y no menciona a `/` por
   ninguna parte. Leyendo `app/(publico)/page.tsx` no hay forma de saber si es estática.

5. **El plan decía dónde vive la cabecera CON sesión y no dónde vive la otra, y ahí estaba el problema.**
   «La cabecera con sesión vive en el grupo `(alumno)`» deja implícito que la pública va en el layout raíz
   — y ahí **se suma** a la del alumno en vez de sustituirla: dos cabeceras en `/catalogo`. Un layout de
   grupo envuelve al raíz, no lo reemplaza.
   → **Desvío decidido y anotado: nace `app/(publico)/`**, con su layout y la landing dentro; la FAQ se le
   suma en la Task 4. `app/page.tsx` se movió con `git mv` para conservar el historial, y la URL no cambia
   porque un grupo entre paréntesis no aporta segmento. **El layout raíz se queda sin cabecera**, con el
   motivo escrito dentro.

6. **Mover esa página dejó el `typecheck` fallando, y habría fallado SOLO en local.** Tras el `git mv`,
   `npm run typecheck` reventó con
   `.next/dev/types/validator.ts(89,39): error TS2307: Cannot find module '../../../app/page.js'`.
   **`next typegen` añade las rutas nuevas pero no retira las viejas:** el validador seguía comprobando un
   archivo que ya no existe. Se cierra borrando `.next` — comprobado: falla con la caché, pasa sin ella.
   → **Y es el ESPEJO exacto de la trampa que midió la tanda 0.** Allí, `tsc --noEmit` a secas pasaba en
   local —donde `.next/` estaba poblado— y **habría roto el CI** en un runner limpio. Aquí, con el script
   ya corregido, la caché rancia rompe **en local** y el CI habría salido verde, porque clona sin `.next/`.
   **La misma carpeta ignorada produce los dos falsos, en direcciones opuestas.**
   → La regla que sale, y que no estaba en ningún plan: **al mover, renombrar o borrar algo dentro de
   `app/`, se borra `.next/` antes de creerse el `typecheck`** — el verde y el rojo por igual.

7. **`CabeceraSesion` NO lee la sesión, contra lo que sugiere su nombre.** Cuando se pinta, el layout de
   `(alumno)` ya llamó a `getClaims()` y ya redirigió a quien no tuviera. Volver a leerla sería una segunda
   consulta para una pregunta ya respondida, y **la segunda copia se desincronizaría de la primera** — es
   el mismo argumento por el que `lib/auth/destino.ts` es la lectura única que reparte. El motivo va
   escrito en el archivo, porque el nombre invita a lo contrario.

**Verificado al cerrar la tarea, con sondas en los dos sentidos:** `/` y `/login` responden **200**,
`/faq` responde **404** —y ese 404 **es** el resultado correcto de este paso: significa que el proxy la
dejó pasar y que todavía no hay pantalla, igual que el `404` de `/login` en la Task 5 de la tanda 1—, y
`/catalogo`, `/mi-panel` y `/admin/inventario` **rebotan con 307 a `/login`**, las dos últimas **sin
existir siquiera**: la lista blanca sigue cerrando lo que nadie declaró. En el HTML de `/` hay **un solo
`<header>` y un solo `<footer>`**, y **cero** apariciones de `auth/signout`, que es lo que probaría que se
coló la cabecera equivocada. `typecheck`, `lint` y `build` en verde, con **`/`, `/login` y `/_not-found`
otra vez estáticas**.

> **Desvío de método, dicho por delante:** esta tarea se verificó por HTTP y **no** en un navegador. Lo que
> cambia es el reparto de cabeceras y los códigos del proxy, que es exactamente lo que una sonda sí ve —no
> hay formulario ni hidratación de por medio—. **La landing todavía es el marcador de posición de la tanda
> 0**, así que abrir un navegador ahora mediría una pantalla que la Task 3 va a reemplazar entera. La
> comprobación visual se hace en la Task 3, con la pantalla de verdad delante.

### Task 3 · La landing dejó de ser estática, y el seed apunta a fotos que no existen

8. **`/` es DINÁMICA, y la corrección 4 de la Task 2 se queda a medias.** Medido con `.next` borrado: el
   `build` la marca **`ƒ /`**. Y la causa **no** es leer sesión —esta página no llama a `getClaims()`—
   sino que `productosVitrina()` usa `createClient()`, que hace `await cookies()` para construirse aunque
   la consulta salga como anónima. **Next.js trata `cookies()` como Dynamic API sin mirar si el valor se
   usa: pedirla ya saca la ruta del prerender.**
   → **Lo que esto le quita a la Task 2, dicho sin rodeos:** el argumento que justificó repartir la
   cabecera en dos era conservar `/` estática, y **ese argumento se cayó una tarea después**. El reparto se
   queda, pero sostenido por los otros dos motivos, que siguen en pie y son independientes: **(a)** una
   cabecera en el layout raíz se *sumaría* a la del grupo `(alumno)` en vez de sustituirla, y **(b)**
   `/login` y `/_not-found` **sí siguen estáticas** y una lectura de sesión arriba las habría sacado.
   → **Y se acepta que `/` sea dinámica en vez de pelearlo, por dos razones que van en el mismo sentido.**
   Una: una vitrina prerenderizada en el `build` mostraría un catálogo **congelado**, y los productos que
   el admin dé de alta en la tanda 3 no aparecerían hasta el siguiente despliegue. Dos: **elimina de raíz
   el riesgo de la corrección 14 de la tanda 1** — una respuesta estática es justo la que un CDN quiere
   guardar, y el proxy puede escribir `Set-Cookie` en esa misma petición. **La medición que parecía una
   pérdida cierra un riesgo que estaba anotado desde la tanda anterior.**

9. **`.returns<FilaProducto[]>()` se escribió, se midió y se quitó.** El primer borrador forzaba el tipo del
   embed por miedo a una inferencia ambigua —`product_images` aparece con el mismo nombre de FK dos veces
   en los tipos generados, hacia `products` y hacia `product_availability`—. Se probó sin él: **la
   inferencia resuelve bien**, `typecheck` en verde.
   → El motivo de quitarlo vale más que la línea ahorrada: **`.returns<>()` es un `as` con otro nombre.**
   *Sustituye* el tipo inferido en vez de comprobarlo, así que el día que alguien cambie el `select` y no
   toque la declaración, **el tipo seguiría afirmando la forma vieja y compilaría igual**. Es exactamente
   el modo de fallo contra el que se escribió **D-26**: «un tipo desactualizado no rompe la compilación,
   miente en silencio».
   → Tal como queda, el tipo se usa solo como parámetro de `imagenPrincipal()`, así que TypeScript lo
   **contrasta** con lo que la consulta devuelve de verdad. **El mismo tipo escrito, pero verificado en
   lugar de impuesto.**

10. **Punto a verificar 4, resuelto — y hubo que resolverlo con el dato REAL, porque el del seed no
    existe.** El optimizador de Next devuelve **`200 image/jpeg`, 17.447 bytes** para una imagen real de
    producción, y **`400`** para un host no declarado: `remotePatterns` funciona y **es** la frontera, no un
    adorno.
    → **Pero la misma sonda contra la URL del `seed.sql` devuelve `404`.** El seed siembra
    `https://res.cloudinary.com/demo/image/upload/seed/cam-001.jpg`, y el cloud `demo` de Cloudinary **no
    tiene** esa imagen: la URL es **ficticia**, con la forma correcta y sin contenido detrás.
    → **Consecuencia práctica, y es una trampa preparada:** al abrir la landing en local **las fotos del
    catálogo salen rotas**, y la lectura obvia —«`remotePatterns` no funciona»— es **la contraria de la
    verdad**. La configuración funciona; lo que no existe es el archivo. Quien lo vea sin este párrafo va a
    tocar `next.config.ts` para arreglar algo que no está roto.
    → **Es la segunda vez en esta tanda que el seed engaña sobre los datos reales**, después de `featured`.
    Y las dos veces en direcciones opuestas: `featured` hace que **local se vea mejor** que producción, las
    URLs hacen que **local se vea peor**. **Decidido no tocar `seed.sql`:** su trabajo es dar filas
    deterministas a las pruebas pgTAP, y apuntarlo a imágenes de verdad le metería una dependencia de red
    donde hoy no la hay. **El punto a verificar ya quedó resuelto contra el dato real, que es donde
    importaba.**

11. **La redacción llegó en voseo rioplatense**, con «Entrá con tu correo institucional y accedé». Los
    usuarios son alumnos de la UPC, en Lima: **tuteo**. Corregido a «Entra» y «accede». Y el cierre decía
    «¿Lista tu próxima reserva?», que **le presupone el género a quien lee**; cambiado a «Empieza tu
    próxima reserva», que no marca ninguno.

**Verificado al cerrar la tarea:** `typecheck`, `lint` y `build`, los tres en verde. `/` responde **200**
con **un solo `<header>`, un solo `<footer>` y cero `auth/signout`**. El optimizador de imágenes sirve una
foto real de Cloudinary y rechaza un host sin declarar.

> ⚠ **Escrito al cerrar la tarea y superado media hora después:** «la pantalla no se ha abierto en un
> navegador, no hay herramienta de navegador en esta sesión». Se habilitó el plugin de Chrome DevTools
> —`enabledPlugins` en `.claude/settings.local.json`, recargado con `/reload-plugins` y `/mcp`, **sin
> reiniciar la sesión**— y la comprobación se hizo. Lo que encontró está abajo. **El párrafo se conserva
> porque describe la decisión correcta con las herramientas de aquel momento:** decir qué no está
> verificado vale más que un cierre limpio de mentira.

### Task 3-bis · Lo que solo se vio con un navegador delante

12. **El badge de categoría le robaba el ancho al título y desalineaba la fila entera.** Compartían fila
    con `flex justify-between`, así que los nombres largos se partían: «Tripode Manfrotto MT055» salía en
    **tres** líneas y «Camara Sony A7 III» en dos, y cada tarjeta terminaba a una altura distinta.
    → El badge pasa a ir **sobre la imagen**, en absoluto, donde no compite con nada; y el título gana
    `line-clamp-2`. **Medido después, no mirado:** las cuatro tarjetas en **282 px exactos**, y los títulos
    de tres a una línea salvo el Trípode, que se queda en dos.
    → **Nada de esto era visible por HTTP.** El HTML era correcto en los dos casos; lo que cambia es dónde
    cae el texto una vez aplicado el CSS, y eso solo lo sabe un motor de render.

13. **El área de imagen gana `bg-muted`, y el motivo es el dato roto.** Sin fondo, las tarjetas cuyo
    Cloudinary da 404 quedaban en **blanco** y las que caen al `placeholder.svg` en **gris**: cuatro
    tarjetas con dos aspectos distintos por un motivo que nadie puede deducir mirándolas. Con el fondo, el
    hueco es el mismo venga de donde venga.
    → **`next/image` no cae al placeholder cuando la carga falla**, solo cuando `imagenUrl` es `null`.
    Cambiarlo exigiría un `onError`, y eso convierte la tarjeta en Client Component. **No se hace:** en
    producción las 34 imágenes existen —comprobado—, y el caso solo se da en local por la corrección 10.

**Verificado en un navegador de verdad, por `127.0.0.1:3000`:** los chunks de `/_next/*` responden **200**
—**D-33 sigue cerrado, y esta vez medido con el cliente que sí manda `Origin`**—; la consola trae
**exactamente dos errores**, los dos `404` de las imágenes ficticias del seed, y **ni uno de React ni de
hidratación**; `/Campus.png` y `/campus-san-miguel.webp` cargan con **200**; y la cabecera, el pie y las
cuatro tarjetas se pintan una sola vez. El círculo con la «N» que aparece abajo a la izquierda es el
indicador de **Next DevTools** —el chunk `next-devtools` sale en la lista de red—, no código del proyecto.

### Task 4 · La lista blanca se lleva por delante el 404, y /login estaba encerrado

14. **La FAQ va en `app/(publico)/faq/`, no en `app/faq/`.** Consecuencia directa de la corrección 5: el
    grupo `(publico)` es quien pinta la cabecera y el pie, y un archivo fuera de él nacería sin ninguno de
    los dos. La URL no cambia — un grupo entre paréntesis no aporta segmento.

15. **El 404 propio NO se alcanza desde la raíz sin sesión, y es la lista blanca cobrando otra vez.** El
    Step 3 pedía «una ruta inventada, que tiene que dar el 404 nuevo». Medido en un navegador:
    `/ruta-inventada` **rebota a `/login`**. El proxy corre **antes** que el router, así que no sabe si la
    ruta existe: solo sabe que nadie la declaró pública.
    → **Y el matiz importa, porque «el 404 es inalcanzable» sería falso.** Medido las cuatro
    combinaciones: `/faq/subruta-falsa` → **404**, `/login/algo` → **404**, `/ruta-inventada` →
    **redirección**, `/catalogo/xxx` → **redirección**. **El 404 se alcanza dentro de las ramas públicas
    declaradas, y no fuera de ellas.**
    → **Se acepta y no se arregla.** La única forma de que una URL inventada llegara al 404 es que el
    proxy dejara pasar lo no declarado, que es exactamente la propiedad que la corrección 18 de la tanda 1
    compró a propósito. **Cambiar una garantía de que nada nace abierto por un mensaje de error más bonito
    es el trueque que este proyecto rechaza.** Con sesión el 404 aparece siempre; sin ella, quien inventa
    una URL ve la pantalla de acceso, que tampoco es una mentira.
    → **Queda por medir en la Task 7:** que con sesión real una ruta inventada dé el 404 y no otra cosa.

16. **`/login` no tenía UN SOLO enlace, y quien llegaba ahí quedaba encerrado.** Se vio abriendo la
    pantalla, no leyéndola: el proxy rebota `/catalogo` a `/login`, y desde ahí no había logo, ni inicio,
    ni nada — solo el botón atrás del navegador. Medido después con `document.querySelectorAll('a')`:
    **cero enlaces**.
    → Nace `app/(auth)/layout.tsx` y `Cabecera` gana una variante **`minima`**, con solo el logo. La
    completa no servía: su botón «Entrar» lleva a la página en la que ya estás.
    → **Lo destapó esta tanda sin haberlo causado.** El defecto venía de la tanda 1; lo hizo visible dar
    cabecera a unas pantallas y no a otras. Comprobado que `/auth/error` sí tenía salida —un enlace a
    `/login`—, así que con esto la cadena se cierra entera.
    → Verificado: `/login` pasa a **dos** enlaces —logo a `/` y el pie a `/faq`—, **una** cabecera, **un**
    pie, **sin** botón «Entrar» redundante, y el formulario intacto.

17. **Dos arreglos de redacción sobre lo que escribió el generador.** (a) «quedas bloqueado 15 días»:
    el participio **concuerda en género con quien lee**, y no se sabe cuál es. Cambiado a «pierdes el
    acceso durante 15 días», que no marca ninguno. (b) El cierre decía «¿No encontraste lo que buscabas?»
    y debajo un botón para entrar: **si no encontró la respuesta, entrar no se la da**. La pregunta pasa a
    ser la que ese botón sí resuelve.

**Verificado al cerrar la tarea, en un navegador:** `/faq` responde **sin sesión** y se lee entera; el 404
propio se pinta con su cabecera y su pie —que él mismo importa, porque no cuelga de ningún grupo—; y
`/login` ya tiene salida. `typecheck`, `lint` y `build` en verde. El `build` deja **nueve rutas**, una más
que la tanda 1, y **`/faq` sale estática** (`○`), igual que `/login` y `/_not-found`: **la cabecera mínima
no lee cookies, así que no saca nada del prerender**.

### Task 5 · La predicción acertó, y sobró; y el seed impide entrar en local

18. **Punto a verificar 1, resuelto midiendo, y la predicción se cumplió — con un número de más.** El embed
    `products` → `product_availability` **no funciona**: PostgREST devuelve `PGRST200`, «Could not find a
    relationship». Hasta ahí, lo previsto.
    → **Y lo que el plan no predijo: tampoco funciona la dirección INVERSA.** `product_availability` →
    `products` da el mismo `PGRST200`. El plan solo se preguntó por un sentido, y el razonamiento que usó
    —PostgREST infiere relaciones desde claves foráneas **reales**— resulta ser más fuerte de lo que su
    autor creyó: una vista agregada no expone FK **en ninguna dirección**. Que la vista sí declare
    `campuses` no lo contradice: esa columna llega heredada de `inventory_units_campus_id_fkey`.
    → **Consecuencia:** el catálogo son **dos consultas**, como decía el desenlace previsto. No se creó
    ninguna vista para conseguir el embed: eso habría sido SQL, y esta tanda no toca SQL.
    → **Cómo se midió sin confundir dos fallos distintos**, que es la parte reutilizable: se dispararon
    **tres** sondas, no una. El embed (`400 PGRST200`), un control de `products` a secas (`200`, con filas)
    y la vista directa como anónimo (`401`, código **`42501`**). Sin la tercera, «400 en el embed» se podría
    haber leído como falta de privilegio y llevar a tocar políticas que están bien. **Un fallo de parseo y
    uno de permiso se parecen desde fuera y traen códigos distintos.**

19. **La columna de `campuses` se llama `activo`, no `is_active`.** No se dedujo: lo dijo un error de SQL
    al consultarla. Las columnas reales son `id`, `name`, `address`, `activo`.

20. **El `seed.sql` engaña por TERCERA vez en esta tanda, y esta vez en una dirección nueva.** Las dos
    anteriores eran de *valor* —`featured` y las URLs de Cloudinary—. Esta es **estructural**: en el stack
    local **un producto está en las dos sedes** (la Laptop aparece en Monterrico y en San Miguel: 2 + 3
    sobre 4 productos), mientras que en producción **ningún** producto está en dos —medido hoy: 0—.
    → **Para el criterio de aceptación:** en local la pantalla debe traer **3 en Monterrico y 2 en San
    Miguel**, nunca 4. En producción, **18 y 16**, nunca 34.
    → **Y el seed resulta ser más exigente que producción en este punto**, lo cual por una vez juega a
    favor: ejercita un caso —el mismo producto en dos sedes— que los datos reales no tienen. Si la consulta
    se hubiera escrito suponiendo «un producto, una sede», el seed lo habría destapado.

21. **Con el `seed.sql` tal cual, NADIE puede entrar en local: GoTrue devuelve 500.** Al pedir el magic
    link para `alumno.a@upc.edu.pe`, Mailpit se quedaba sin correo y el log del contenedor de auth decía
    `error finding user: Scan error on column "confirmation_token": converting NULL to string is
    unsupported`, con `POST /otp → 500`.
    → **La causa:** el seed inserta en `auth.users` con `INSERT` directo, y ahí las columnas de token
    quedan en `NULL`. GoTrue las lee como `string` y revienta. Un usuario creado por la API lleva `''`, no
    `NULL`. Afectadas **4 columnas en los 5 usuarios**: `confirmation_token`, `recovery_token`,
    `email_change_token_new` y `email_change`.
    → **Por qué no lo vio la tanda 1:** su prueba de login entró con una cuenta **creada por la API**, no
    con una del seed. El defecto llevaba ahí desde entonces, sin que ninguna tanda lo tocara.
    → **Arreglado en caliente** (`update auth.users set ... = coalesce(..., '')`), **sin tocar
    `seed.sql`**. Es una escritura al esquema `auth` del stack local para poder probar, no una escritura
    de la aplicación: **la T2A sigue sin escribir una sola fila de negocio.**
    → ⚠ **`db reset` lo revierte**, y la Task 7 empieza con un `db reset`. **Queda como decisión abierta
    para el cierre:** o se arregla el seed, o cada sesión que necesite entrar en local repite el `update`.
    La 2B entra en local constantemente, así que esto la afecta a ella más que a esta tanda.

22. **No se puede escribir «disponibles», y la palabra parecía inocente.** `in_stock` significa que la sede
    tiene unidades **activas** de ese producto, **no** que haya una libre ahora —eso depende de que nadie
    la tenga reservada en esa franja, un dato que esta consulta ni pide—. «18 equipos disponibles» sería la
    mentira que D-21 descarta para la vitrina, repetida en el catálogo con otro nombre. La pantalla dice
    **«3 equipos en Monterrico»**.

23. **La búsqueda normaliza diacríticos, y el motivo salió de los datos reales.** Los nombres están
    guardados **sin tilde** —«Camara Sony A7 III», «Microfono Rode NTG4», «Tripode Manfrotto MT055»— y un
    alumno escribe «cámara». Sin normalizar, **la búsqueda más natural no encuentra nada** aunque el
    término esté literalmente en el nombre. Verificado en el navegador: escribir «micrófono» con tilde
    devuelve «Microfono Rode NTG4».

24. **El subagente que escribió los archivos coló DOS hechos falsos, y su informe no los mencionó.**
    (a) Fechó el trabajo como «tarea 2A.7» en dos archivos, cuando es la **2A.5**. (b) Escribió que la
    medición del `PGRST200` se hizo «contra el proyecto real», cuando se hizo **contra el stack local**.
    (c) Y justificó el `| null` de `product_id` diciendo que «un LEFT JOIN puede producir NULL en
    cualquiera de ellas» — **falso para esa columna**: la vista la saca de `p.id`, el lado **izquierdo**
    de sus dos LEFT JOIN, así que nunca viene vacía. Sale nullable porque **Postgres no propaga el
    `NOT NULL` de la tabla base a las columnas de una vista**. En esa misma vista sí hay una que puede ser
    null de verdad, `campus_id`, cuando un producto no tiene unidades.
    → **Las tres corregidas a mano.** Es la advertencia de la tanda 1 cobrando otra vez: **el informe de un
    subagente no es la verificación**, y lo que hay que revisar no es solo si el código compila sino si lo
    que AFIRMAN sus comentarios es cierto. Un comentario falso compila igual de bien que uno cierto.

25. **Cerrado el pendiente que la corrección 15 dejó para la Task 7.** Con **sesión real**, `/ruta-inventada`
    da el **404 propio** —«Esta página no existe», con su cabecera y su pie— y **no** rebota a `/login`.
    Confirma lo que aquella corrección predijo: el 404 se alcanza cuando hay sesión, y sin ella el proxy
    contesta antes.

26. **El snapshot del árbol de accesibilidad se queda rancio tras una navegación de cliente**, y por poco
    da un falso negativo. Al pulsar «San Miguel», el snapshot seguía mostrando «3 equipos en Monterrico» y
    la URL sin query param: parecía que las pestañas no funcionaban. `evaluate_script` sobre el DOM vivo
    devolvió lo correcto —`?sede=…002`, «2 equipos en San Miguel», 2 tarjetas—. **Regla: tras una
    navegación client-side, confirmar contra el DOM antes de creerse el snapshot.**

27. **`components/ui/select.tsx` quedó SIN USAR, y es superficie muerta según el criterio del propio
    plan.** La Task 1 lo instaló previendo un desplegable de sedes; al escribir la pantalla se eligieron
    **dos pestañas enlazadas** —se renderizan en el servidor, funcionan sin JavaScript, enseñan las dos
    sedes de un vistazo y dejan la URL enlazable y compartible, que es lo que el Step 1 pedía del query
    param—. Con dos sedes, un desplegable esconde la mitad de las opciones tras un clic.
    → La Task 1 escribió que «un componente sin pantalla que lo use es superficie muerta que hay que
    mantener», y ese criterio ahora aplica a `select`. **No se borra aquí:** se anota y **se decide en la
    Task 7**, que es el cierre. Borrarlo a mitad de tanda sería una tarea decidiendo por otra.

**Verificado al cerrar la tarea, en un navegador de verdad y con sesión real de alumno:** `/catalogo`
**sin** sesión sigue rebotando a `/login`; con sesión trae **3 equipos en Monterrico** (la sede por
defecto, primera alfabéticamente) y **2 en San Miguel** al pulsar la pestaña, **nunca 4** — BR-14 aplicado
en la consulta. Los chips de categoría cambian con la sede —«Computo/Fotografia» en una, «Audio/Computo»
en la otra—, porque se derivan de lo que hay en la sede y no del catálogo entero. Un `?sede=` inválido cae
a la sede por defecto con su `aria-current`, sin 404 ni pantalla rota. La consola trae **exactamente dos
errores**, los dos `404` de las imágenes ficticias del seed, y **ni uno de React ni de hidratación**. La
landing sigue con **una cabecera, un pie, cero `auth/signout`** y sin enlaces al catálogo, **aun teniendo
sesión**. `typecheck`, `lint` y `build` en verde, con **nueve rutas**, las mismas que dejó la Task 4.

### Task 6 · Hay dos caminos al 404, y el propio 404 salía duplicado

28. **Un id inexistente y un id MALFORMADO llegan por caminos distintos, y solo uno es silencioso.** Medido
    contra PostgREST: un UUID válido que no existe devuelve **`[]` con HTTP 200**; un id que no tiene forma
    de UUID —`/catalogo/cualquier-cosa`— devuelve el error **`22P02`** («invalid input syntax for type
    uuid») con **HTTP 400**, porque el `eq.` ni siquiera castea.
    → **El Step 4 del plan solo mandaba probar «un UUID inventado», que es justo el caso que funciona
    solo.** Si la consulta tratara todo error como fallo del sistema, cada URL mal tecleada se registraría
    con `console.error` como si fuera un problema de RLS o de red.
    → **Resuelto distinguiendo el código:** `22P02` devuelve `null` **callado** —es una URL inventada, no
    una avería— y cualquier otro error sí grita en el log. Las dos rutas acaban en el mismo `notFound()`
    hacia fuera, y se separan solo hacia dentro. **Llenar el log de ruido esconde los fallos de verdad.**

29. **El 404 salía con DOS cabeceras y DOS pies dentro del catálogo, y es la corrección 5 reapareciendo por
    otra puerta.** Medido en un navegador, y la distinción es fina:

    | URL | Qué ocurre | Antes |
    |---|---|---|
    | `/faq/subruta-falsa` | **ninguna** ruta casa | 1 cabecera, 1 pie |
    | `/catalogo/cualquier-cosa` | **sí** casa con `[id]`, y la página llama a `notFound()` | **2 cabeceras, 2 pies** |

    → **La causa:** cuando ninguna ruta casa, Next resuelve `app/not-found.tsx` **sin montar el layout de
    ningún grupo**, y ese archivo pinta su propia `Cabecera` y su propio `Pie` a mano —porque el layout
    raíz no los tiene—. Pero `/catalogo/[id]` **existe**: el layout de `(alumno)` ya se montó y ya pintó
    `CabeceraSesion` y `Pie`, y solo **después** la página llamó a `notFound()`. El 404 de la raíz se
    renderiza **dentro** de ese layout y suma los suyos a los que ya había.
    → **Arreglado con `app/(alumno)/not-found.tsx`**, que **no** pinta cabecera ni pie porque el layout del
    grupo ya las puso. Verificado: los dos caminos al 404 —id malformado y UUID inexistente— dan ahora
    **1 y 1**, y `/faq/subruta-falsa` sigue en **1 y 1** con sus enlaces originales.
    → **Y ese 404 sí enlaza a `/catalogo`, al revés que el global.** El global lo evita a propósito
    *(corrección de la Task 4)* porque quien cae ahí puede no tener sesión y rebotaría a `/login`. Bajo
    `(alumno)` la sesión ya está comprobada, así que el enlace lleva a donde dice que lleva.
    → **La tarea 2A.4 no pudo verlo, y eso lo explica todo:** cuando escribió el 404, **ninguna pantalla
    llamaba a `notFound()`**, así que el segundo caso no existía. El defecto **nace con esta tarea**, no
    estaba latente. Y la corrección 15 midió aquel 404 por su **código de respuesta**, no por su contenido:
    un 404 correcto puede estar pintado dos veces.

30. **El `seed.sql` ejercita D-1 y producción NO.** El Laptop local tiene `max_duration_hours = 8`,
    mientras que en producción **los 34 valen 4**. Así que si alguien escribiera «4 horas» a mano en la
    pantalla, **producción no lo delataría jamás** y el stack local sí. Verificado en el navegador: el
    detalle del Laptop dice «hasta **8** horas seguidas» y el de la Cámara «hasta 4».
    → Es la tercera vez en esta tanda que el seed resulta ser **más exigente** que los datos reales, y va
    en el mismo sentido que la corrección 20. **El seed no es representativo, pero sus rarezas no son todas
    ruido: algunas son los únicos casos de prueba que existen.**

31. **La tira de miniaturas es una rama que hoy NO se puede verificar con datos reales, y se dice en vez de
    darla por buena.** Ningún producto tiene más de una imagen **ni en local ni en producción** —34
    imágenes para 34 productos, todas `is_main`; en local, dos productos con una y dos con ninguna—. El
    código que pinta las secundarias está escrito y compila, pero **ningún dato lo ejecuta**. Se conserva
    porque es barato y porque el admin podrá subir más en la tanda 3; queda anotado que **no está probado
    contra nada**.
    → Lo que sí se verificó es el caso real y el borde de abajo: **una** imagen (Cámara, Laptop) y
    **ninguna** (Micrófono, Trípode), que cae al `placeholder.svg` sin dejar una tira vacía.

32. **El enlace «Volver al catálogo» pierde la sede.** Si entras al detalle desde San Miguel y vuelves,
    aparece Monterrico, que es la sede por defecto. No es un fallo de BR-14 —la consulta filtra bien— sino
    de navegación: el `href` de la tarjeta es `/catalogo/${id}` sin arrastrar el `?sede=`. **Se deja
    anotado y sin arreglar en esta tarea:** propagarlo obliga a pasar la sede por la tarjeta, por los
    filtros y por el detalle, y el botón «atrás» del navegador ya resuelve el camino habitual. **Decisión
    para la Task 7 o para la 2B**, con el costo dicho por delante.

33. **Tercer hecho falso de un subagente en esta tanda, y van cuatro.** Su informe justificó no comentar el
    caso «producto sin imágenes» diciendo que «no está entre los datos medidos hoy». **Falso en local:** el
    Micrófono y el Trípode no tienen ninguna. Era cierto solo de producción, y lo dijo como si fuera cierto
    de todo. El código que escribió **sí** cubre el caso —cae al `placeholder.svg`—, así que el defecto
    estaba en la afirmación, no en la implementación.
    → **La forma del error se repite: el subagente generaliza «no lo he medido» a «no existe».** Es la
    misma familia que la corrección 24. **Lo que hay que revisar de un subagente no es solo si su código
    funciona, sino si lo que AFIRMA es cierto**, y las dos cosas se comprueban por separado.

**Verificado al cerrar la tarea, en un navegador y con sesión real:** entrar desde una tarjeta del catálogo
abre el detalle correcto; el Laptop dice **8 horas** y Monterrico y San Miguel con **1 unidad** cada una;
la Cámara dice **4 horas** y **3 unidades** en Monterrico, con el plural y el singular bien; el botón
**«Reservar (muy pronto)» sale deshabilitado**; el Micrófono, sin imágenes, cae al `placeholder.svg`; un id
malformado y un UUID inexistente dan **los dos** el 404 propio con **una** cabecera y **un** pie; y la
consola queda **sin un solo error** —el detalle del Micrófono no pide ninguna imagen de Cloudinary—.
`typecheck`, `lint` y `build` en verde, con **diez rutas**: la nueva es `ƒ /catalogo/[id]`.

---

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
