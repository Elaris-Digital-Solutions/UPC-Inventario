# Fase 3 · Tanda 5 — Plan de ejecución

> **Para quien ejecute:** las tareas se hacen **en orden** y cada una termina en **un commit**. Los pasos
> llevan casilla (`- [ ]`) para ir marcándolos. **Este plan no se reescribe tras ejecutar:** lo que la
> ejecución desmienta va en la cabecera de correcciones de abajo, para no borrar lo aprendido.
>
> **Y se releen las correcciones antes de CADA tarea, no al final de la tanda.** En la F3-T1 una
> corrección anotada para la Tarea 2 dejó muerto un paso de la Tarea 1 que nadie volvió a mirar.

**Objetivo:** que la aplicación **se pueda instalar en el móvil** desde el navegador, con su nombre y su
icono propios, sin que la CSP registre una sola violación.

**Enfoque:** un `app/manifest.ts`, dos iconos, y **la reverificación completa de la CSP**. Cero SQL, cero
migraciones y cero dependencias nuevas. **Lo caro no es el manifest —son unas veinte líneas—: es volver a
medir las quince pantallas con control positivo**, que es lo que D-81 exige y lo que ninguna otra tanda de
la fase pagó. **Y ese recorrido es también donde Q-20 pasa de cuatro superficies medidas a dieciocho**
*(D-89)*: el montaje ya está pagado.

**Stack:** Next.js **16.3.0** (App Router) · TypeScript estricto · Vitest · Playwright · CSP por nonce
*(D-56)* servida desde `proxy.ts`.

**Diseño:** [`../FASE_3_DISENO.md`](../FASE_3_DISENO.md) §9 — se lee junto con este plan, no en su lugar.
⚠ **Ocho de sus afirmaciones no sobrevivieron a la medición y están abajo.** Ejecuta **D-81** y trae dos
decisiones propias de alcance, **D-88 y D-89**, las dos de Alejandro el 2026-08-19.

**Punto de partida, medido el 2026-08-19 y no citado:** `develop` limpio en **`9f848b2`**, sólo `develop` y
`main` en local; en el remoto hay **tres** ramas —`develop`, `main` y `feature/estilos-sistema-visual`,
**que es de otra persona y no se toca**—; **32 migraciones** con `local` y `remote` idénticos y **0 huecos
en cualquiera de los dos lados**; pgTAP **`Files=33, Tests=200, PASS`** *(tras `db reset`)*; Vitest **12
archivos, 166 pruebas** *(contadas archivo por archivo: 16+12+35+5+8+8+8+9+22+19+10+14 = 166)*; E2E **5
archivos, 7 pruebas** *(2+2+1+1+1)*.

---

## Correcciones al diseño

*(Todas son de la escritura de este plan, antes de ejecutar nada.)*

1. ⚠ **LA QUE MÁS CAMBIA LA TANDA: instalar en el móvil NO necesita un service worker.** §9 pide
   *«`manifest`, iconos, **service worker**, y un botón de instalar»*. La guía de la versión instalada
   —`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`, §6— dice que para que la
   aplicación se pueda instalar hacen falta **dos** cosas y ninguna es un service worker: *«1. A valid web
   app manifest (created in step 1). 2. The website served over HTTPS»*. El service worker aparece en esa
   guía **sólo** para *push* y para caché offline, que **nadie pidió**. **El diseño describía la
   implementación de una PWA de manual, no la del requisito del cliente.**

2. ⚠ **Y el botón de instalar propio está DESACONSEJADO por la misma guía.** Textual: *«You can provide a
   custom installation button with `beforeinstallprompt`, however, **we do not recommend this** as it is
   not cross browser and platform (does not work on Safari iOS)»*. §9 lo pide explícitamente. **Se
   descarta**, y el motivo no es de gusto: el navegador ya ofrece la instalación cuando se cumplen los dos
   requisitos, y un botón propio **no funcionaría en iOS**, que es justamente donde el usuario necesita la
   instrucción. **Lo que sí puede hacer falta es un texto**, y eso lo decide la fase visual, no ésta.

3. ⚠ **`primer_acceso_personal()` NO puede condicionar el aviso, y el diseño lo da por hecho.** §9 dice
   que *«el aviso se le muestra a quien ya recibió su primer correo, que es el dato que expone T2»*. Leído
   el cuerpo de la migración 31: esa función selecciona **`from public.staff_members`** y su `where` es
   **`(select private.is_admin())`**. O sea que es **doblemente inaplicable**: sólo devuelve filas de
   **personal**, y sólo si quien llama es **admin**. **A un alumno le devuelve cero filas siempre**, y el
   alumno es quien instalaría la aplicación. Con la corrección 2 el aviso desaparece del alcance, así que
   **esto no bloquea nada** — se anota porque el diseño lo afirmaba y alguien podría intentar construirlo.

4. ⚠ **Ninguna pieza de PWA existe, y esta vez la trampa de «ya estaba construido» NO aplica — pero se
   midió en vez de suponerlo.** `grep -rli "manifest\|serviceworker\|service-worker\|workbox\|
   beforeinstallprompt"` sobre `app`, `lib`, `components`, `public`, `next.config.ts` y `package.json`:
   **cero coincidencias**. Es la tercera tanda seguida en que se hace esta comprobación, y las dos
   anteriores la necesitaron —el alta de operadores estaba entera *(F3-T2)*—. **Que esta vez salga vacía
   es el resultado, no la ausencia de resultado.**

5. **Los iconos no existen y hay que fabricarlos.** `public/` tiene `favicon.png` **(6.603 bytes)**,
   `upc-logo.png` **(40.907 bytes)**, `Campus.png`, `campus-san-miguel.webp`, `placeholder.svg` y
   `robots.txt`. **Ninguno es 192×192 ni 512×512**, que son los dos tamaños que pide la guía. Existe
   además `app/favicon.ico`, que es la convención de Next para la pestaña y **no sirve para el manifest**.
   **El origen razonable es `upc-logo.png`**, y las medidas reales de esa imagen se comprueban en la
   Tarea 2 antes de escalarla: escalar hacia arriba desde algo pequeño da un icono borroso, y eso **se ve
   en la pantalla de inicio del teléfono, que es el único sitio donde se mira**.

6. ⚠ **La CSP no declara `worker-src` NI `manifest-src`, y las dos herencias NO son iguales.** Leído
   `lib/seguridad/csp.ts`: las once directivas son `default-src`, `script-src`, `style-src`,
   `style-src-attr`, `img-src`, `font-src`, `connect-src`, `object-src`, `base-uri`, `form-action` y
   `frame-ancestors`, más `upgrade-insecure-requests` en producción. **`manifest-src` hereda de
   `default-src`, que es `'self'`** → el manifest de mismo origen debería cargar sin tocar nada.
   **`worker-src` hereda de `child-src` y de ahí de `script-src`**, que lleva **`'strict-dynamic'`** — y
   `strict-dynamic` **hace que se ignore el `'self'`**. ⚠ **ESTO ES UNA LECTURA DE LA ESPECIFICACIÓN Y NO
   UNA VERIFICACIÓN POR EL EFECTO**, y se marca así a propósito: es exactamente el género de deducción que
   la F3-T3 presentó como mecanismo completo con los dos hashes de Q-20 y **resultó estar a medias**. Con
   D-88 no hay service worker, así que la mitad de `worker-src` **no se ejercita en esta tanda**; la de
   `manifest-src` **sí, y la mide la Tarea 1**.

7. **La superficie de Q-20 son 9 y 9, no 8 y 9, y el denominador se movió solo.** Contado el 2026-08-19
   con la definición estrecha —archivos que **importan** el primitivo, descartando `components/ui/*` y el
   propio `nonce-radix.tsx`—: **9 consumen `dialog` y 9 consumen `select`**. El «8» del plan de la F3-T3
   se contó antes de que **esa misma tanda añadiera `components/imagenes/miniatura-ampliable.tsx`**
   *(commit `67cef0c`)*. **Las cuatro superficies medidas son 4 de 18, no 4 de 17.** La definición ancha
   *(cualquier aparición del texto)* da **16 y 14** y **mide otra cosa** — se dejan las dos escritas para
   que nadie las compare entre sí.

8. ⚠ **La afirmación que la F3-T3 desmintió seguía viva en el código, y ningún comando la habría puesto
   roja.** El comentario de `components/seguridad/nonce-radix.tsx` aún decía que el Dialog y el Select eran
   *«dos hojas del mismo inyector, y una sola llamada cubre las dos»*. La búsqueda por texto sobre el árbol
   entero encontró **4 copias: 3 corregidas el mismo día** —`ESTADO_Y_PLAN.md`, el plan de la F3-T3 y
   `PLANES/README.md`— **y 1 sin corregir, la del código**. **Corregida el 2026-08-19 en commit aparte**,
   fuera de esta tanda, para no mezclar una corrección con una funcionalidad. **`lint` no lee prosa**: es
   el mismo género que el comentario de `FilaProducto`, con la diferencia que importa —aquél tocaba un
   identificador y por eso saltó un *warning*; éste era sólo texto, y por eso no saltó nada.

---

## Restricciones globales

*Valen para todas las tareas y no se repiten en cada una.*

- **PowerShell 5.1:** sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Un comando por bloque.
- ⚠ **La CSP SÓLO se mide con `npm run build` + `npm start`.** `lib/seguridad/csp.ts:91` pone
  `'unsafe-inline'` en `style-src` **en desarrollo**, así que **cualquier medición en `npm run dev` sale
  limpia por construcción**. Es la corrección que en la F3-T3 habría regalado un verde falso.
- **Esta tanda NO toca el esquema.** Cero migraciones, cero SQL. Si alguna tarea parece pedir una
  migración, es que se salió del alcance: se para y se anota.
- **Y NO añade dependencias.** `web-push` queda fuera con el *push* *(D-88)*. Si algún paso pide un
  `npm install`, es la misma señal.
- **Docker Desktop tiene que estar arrancado**, y `db reset` exige el stack completo. ⚠ **`npx supabase
  start` devuelve exit 0 aunque Docker esté parado**, así que se comprueba **por el efecto**: `docker ps`
  lista contenedores, o `netstat -ano` encuentra el 54322.
- ⚠ **`pgTAP` se mide DESPUÉS de un `db reset`, no antes.** Sin él da rojo sin que nada esté roto, y la
  lectura natural es «rompí algo». Pasó dos veces el 2026-08-19. **Es la corrección 4 del plan anterior, y
  aquí va como restricción para que no dependa de acordarse.**
- ⚠ **Playwright tiene `reuseExistingServer: false`:** si queda un `npm start` ocupando el 3000, el E2E no
  arranca. Se libera el puerto antes.
- **El E2E necesita base limpia Y Auth caliente** *(Q-26)*. El orden que funciona: **`db reset` → calentar
  Auth (UNA sola petición: la segunda seguida da 429) → E2E**.
- **El código de salida se captura por redirección a archivo, nunca por tubería.** `cmd | tail` devuelve
  el código de `tail`.
- **Para puertos, `netstat -ano`, nunca `curl`**: devuelve `000` por timeout y se lee como «puerto libre».
  Para **matar un proceso**, PowerShell `Stop-Process -Id <pid> -Force` — en Git Bash `taskkill /PID` falla.
- **Si el `typecheck` falla con errores de SINTAXIS en `.next/dev/types/routes.d.ts`, no es el código:**
  `rm -rf .next` y vuelve a verde.
- **Mensajes de commit sin acentos y SIN `Co-Authored-By` ni ninguna firma de Claude.** Los documentos,
  con tildes. **Comentarios de código en ASCII y con `OJO`**, que es la convención observada —6 usos de
  `OJO` y 1 de `CUIDADO`, cero tildes en los módulos de seguridad—, no `⚠` ni acentos.
- **No se empuja al remoto.** El plan entrega los comandos; los ejecuta Alejandro.
- **Nada de estética.** La fase visual la hace otra persona. Esta tanda entrega que la aplicación **se
  pueda instalar** y que **la CSP siga limpia**, no cómo se ve el icono.

---

## Mapa de archivos

**Se crean:**

| Archivo | De qué responde |
|---|---|
| `app/manifest.ts` | El manifest, por la convención de fichero de Next 16 *(corrección 1)* |
| `public/icon-192x192.png` | Icono de 192×192 *(corrección 5)* |
| `public/icon-512x512.png` | Icono de 512×512 *(corrección 5)* |

**Se modifican sólo si la Tarea 1 lo exige:**

| Archivo | Qué cambia |
|---|---|
| `lib/seguridad/csp.ts` | `manifest-src 'self'` explícito, **sólo si la herencia de `default-src` no basta** |
| `lib/seguridad/csp.test.ts` | Su caso, si se toca la política |

**No se toca, y se dice para que nadie lo intente:** `next.config.ts` —las tres cabeceras de la guía ya
están, y la de `/sw.js` no hace falta sin service worker—; `proxy.ts` —el nonce ya viaja—; ninguna
migración; ningún `package.json`.

---

## Tarea 0 · La rama y el punto de partida

- [ ] **Paso 1.** Comprobar que `develop` está limpio y al día. Esperado: rama `develop`, `git status`
      vacío, último commit **el de la corrección de `nonce-radix.tsx`**, que va antes que esta tanda.
      ⚠ **Sin tubería**: `git status --short` a secas.
- [ ] **Paso 2.** Comprobar **por el efecto** que el stack local está arriba: `docker ps` lista
      `supabase_db_UPC-Inventario`. **No basta con que `supabase start` haya devuelto 0.**
- [ ] **Paso 3.** Crear la rama `feature/fase-3-tanda-5` desde `develop`.
- [ ] **Paso 4.** **Fijar la línea base contando, no citando:** `npm test`. Esperado: **12 archivos, 166
      pruebas**. `pgTAP` no se mide aquí: se mide en la Tarea 5, **después** del `db reset`.

**Commit:** ninguno. Esta tarea no cambia archivos.

---

## Tarea 1 · LA TAREA DE RIESGO — ¿se instala sin service worker? **Con la salida escrita por delante**

*Va la primera porque **si sale mal cambia la tanda entera**, y sale mucho más barato saberlo antes de
fabricar iconos que después. D-88 se tomó sobre la documentación de Next, y **la documentación describe lo
que Next hace, no lo que Chrome exige**: son dos autoridades distintas y sólo una decide si el botón de
instalar aparece.*

- [ ] **Paso 1.** Escribir un `app/manifest.ts` **mínimo** —nombre, `start_url`, `display: 'standalone'`,
      y los dos iconos apuntando a rutas que **todavía no existen**—. Es un andamio para medir, no el
      entregable: el definitivo se escribe en la Tarea 3.
- [ ] **Paso 2.** `npm run build` y `npm start`. ⚠ **En modo producción o no se mide** *(restricción)*.
- [ ] **Paso 3.** Abrir `http://127.0.0.1:3000` con el MCP de Chrome DevTools y **leer la consola
      entera**. **Predicción, de la corrección 6:** el manifest carga **sin violación de CSP**, porque
      `manifest-src` hereda de `default-src 'self'`.
- [ ] **Paso 4.** **El control positivo, sin el cual el paso 3 no prueba nada:** comprobar que el
      navegador **pidió** el manifest —que aparezca `/manifest.webmanifest` en la lista de peticiones con
      su código de respuesta—. **Una consola limpia porque nadie pidió el archivo se lee igual que una
      consola limpia porque el archivo cargó bien.**
- [ ] **Paso 5.** Comprobar **si Chrome considera la aplicación instalable sin service worker**, que es la
      pregunta que decide la tanda.

**Las dos salidas, escritas ANTES de medir:**

| | Qué se ve | Qué se hace |
|---|---|---|
| **A** | El manifest carga, **0 violaciones de CSP**, y Chrome ofrece instalar | **Se sigue.** D-88 queda confirmado **por el efecto** y no sólo por la documentación |
| **B** | Chrome **exige un service worker**, o el manifest dispara una violación | **SE PARA Y SE LLEVA A ALEJANDRO.** No se crece el alcance a mitad de tanda: D-88 se tomó con una medición que ésta desmentiría, y **quien decide si la tanda cambia de tamaño es él**. Queda escrita la medición, que es lo que hace útil una salida mala |

> ⚠ **Lo que este paso NO puede probar, dicho por delante:** que se instale **en producción**. No hay
> despliegue —`main` publica el Vite viejo— y la guía exige **HTTPS**. `127.0.0.1` es un origen de
> confianza para el navegador y por eso la medición local vale, **pero vale para el mecanismo, no para el
> sitio real**. Es la misma frontera que la miniatura del mostrador en la F3-T3.

**Commit:** el andamio **no se commitea** si la salida es B. Si es A, entra con la Tarea 3.

---

## Tarea 2 · Los dos iconos

- [ ] **Paso 1.** Medir las dimensiones reales de `public/upc-logo.png` **antes** de escalarlo. Si es
      menor que 512 de lado, **escalar hacia arriba da un icono borroso** y hay que decirlo en vez de
      entregarlo: el resultado se mira en la pantalla de inicio del teléfono.
- [ ] **Paso 2.** Generar `public/icon-192x192.png` y `public/icon-512x512.png`.
- [ ] **Paso 3.** **Verificar por el efecto, no por que el comando devuelva 0:** que los dos archivos
      existan, pesen más de 0 bytes y **tengan las dimensiones que dicen** — un PNG mal escalado que se
      llame `512x512` es exactamente el género de instrumento que miente que este proyecto persigue.

**Commit:** `feat: iconos de 192 y 512 para el manifest`

---

## Tarea 3 · El manifest

*Aquí hay una decisión de producto que no es mía: **cómo se llama la aplicación en la pantalla de inicio**.
`name` y `short_name` son lo que el alumno va a leer bajo el icono, y `short_name` se corta a unos 12
caracteres en Android. La metadata de hoy dice `"Reserva UPC · Sistema de Préstamos"`, que **no cabe**.*

- [ ] **Paso 1.** Escribir `app/manifest.ts` con la firma `MetadataRoute.Manifest`, según la convención de
      fichero de Next 16.
- [ ] **Paso 2.** `name`, `short_name`, `description`, `start_url`, `display`, `background_color`,
      `theme_color` y los dos iconos.
- [ ] **Paso 3.** `npm run build` y `npm start`; abrir `/manifest.webmanifest` y comprobar que **el JSON
      servido tiene los campos que se escribieron**. Leer el archivo generado, no el fuente.
- [ ] **Paso 4.** Comprobar en el navegador que **los dos iconos cargan** —código 200, no 404—. Es la
      trampa nº 1 del proyecto en su forma más pura: una ruta de icono equivocada **no rompe el build, no
      rompe el typecheck y no rompe el lint**.

**Commit:** `feat: manifest de la aplicacion instalable`

---

## Tarea 4 · Q-20 — las catorce superficies que faltan *(D-89)*

*No se persigue la violación que queda: se **cuenta** dónde está y dónde no. El montaje —`build`, `start`,
navegador— ya está pagado por la Tarea 1, y ése era el argumento de D-89.*

- [ ] **Paso 1.** Con `build` + `start`, recorrer las **siete pantallas que la F3-T3 no midió**:
      `/admin/ajustes`, `/admin/dias`, `/admin/reservas`, `/admin/inventario/nuevo`, `/mi-panel`,
      `/catalogo/[id]/reservar` y `/completar-perfil`.
- [ ] **Paso 2.** En cada una, **abrir el diálogo y desplegar el `Select`** — no basta con cargar la
      pantalla. **Es la lección que Q-20 ya cobró dos veces: se midieron pantallas y no interacciones.**
- [ ] **Paso 3.** Anotar violaciones **por superficie y por mecanismo**, distinguiendo el *scroll-lock*
      —que `setNonce()` cubre— del `<style>` en JSX del `Select` —que no—.
- [ ] **Paso 4.** **Actualizar Q-20 con el recuento real: cuántas de 18 quedan medidas.** Si aparece un
      **tercer** mecanismo, es un hallazgo y se escribe; si no aparece ninguno nuevo, **eso también se
      escribe**, porque una ausencia medida vale.

> **Esta tarea NO cierra Q-20 y el plan no lo promete.** Puede dejarlo en 18 de 18 medidas con una
> violación cosmética conocida, que es un estado honesto. **Cerrarlo exigiría curar el `Select` de Radix, y
> eso Alejandro decidió no hacerlo** *(D-89)*.

**Commit:** ninguno de código. Lo que produce es documentación, y va con la Tarea 5.

---

## Tarea 5 · Verificación de punta a punta y cierre

- [ ] **Paso 1.** `npm run lint`, `npm run typecheck`, `npm run build`. **Predicción: los tres en verde.**
- [ ] **Paso 2.** `npm test`. **Predicción: 12 archivos, 166 pruebas** — la tanda no añade lógica pura.
      ⚠ **Si se tocó `lib/seguridad/csp.ts` en la Tarea 1, esta cifra sube** y hay que decir en cuánto.
- [ ] **Paso 3.** `npx supabase db reset`, **y después** `npx supabase test db`. **Predicción:
      `Files=33, Tests=200, PASS` sin moverse una aserción** — la tanda no toca el esquema.
- [ ] **Paso 4.** Calentar Auth con **una** petición y correr `npm run test:e2e`. **Predicción: 7/7.**
      ⚠ **Liberar el 3000 antes**: `reuseExistingServer: false`.
- [ ] **Paso 5.** Cerrar los documentos **antes** de pasar los comandos de git: `ESTADO_Y_PLAN.md`
      *(fila de la F3-T5, Q-20, bitácora)* y `PLANES/README.md`.

**Commit:** `docs: cierre de la F3-T5 en local`

---

## Puntos a verificar

*Con su salida escrita por delante, que es lo que impide que medir cueste más de lo previsto.*

| | Pregunta | A | B |
|---|---|---|---|
| **V-1** | ¿Se instala sin service worker? | Se sigue con D-88 | **Se para y decide Alejandro** *(Tarea 1)* |
| **V-2** | ¿El manifest dispara alguna violación de CSP? | No: la herencia de `default-src 'self'` basta | Se añade `manifest-src 'self'` explícito y su prueba |
| **V-3** | ¿`upc-logo.png` da un 512×512 nítido? | Se usa | Se dice que el icono es borroso **en vez de entregarlo callando** |
| **V-4** | ¿Aparece un tercer mecanismo de CSP en las 7 pantallas nuevas? | No: Q-20 queda en 18/18 medidas con 1 violación conocida | Se escribe el mecanismo nuevo y Q-20 se amplía otra vez |

---

## Cabecera de correcciones

*(Se rellena al ejecutar. Si al terminar está vacía, es que no se miró.)*
