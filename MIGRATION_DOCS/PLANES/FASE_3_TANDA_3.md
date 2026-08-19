# Fase 3 · Tanda 3 — Plan de ejecución

> **Para quien ejecute:** las tareas se hacen **en orden** y cada una termina en **un commit**. Los pasos
> llevan casilla (`- [ ]`) para ir marcándolos. **Este plan no se reescribe tras ejecutar:** lo que la
> ejecución desmienta va en la cabecera de correcciones de abajo, para no borrar lo aprendido.
>
> **Y se releen las correcciones antes de CADA tarea, no al final de la tanda.** En la F3-T1 una
> corrección anotada para la Tarea 2 dejó muerto un paso de la Tarea 1 que nadie volvió a mirar.

**Objetivo:** que el personal **vea el equipo** en las dos pantallas donde hoy no lo ve — la lista de
inventario, que muestra un número, y el mostrador, que no muestra nada — y pueda **ampliar la foto sin
salir de la pantalla**.

**Enfoque:** cero SQL y cero migraciones. La regla de «cuál es la imagen principal» se saca a **un solo
sitio** —hoy vive suelta en el catálogo—, las dos consultas piden `secure_url` e `is_main`, las dos
pantallas pintan la miniatura, y el lightbox se monta sobre el `Dialog` que ya existe. **Y la tanda mide
Q-20 por una vía que nadie había mirado** *(Tarea 5)*, con la salida escrita por delante para que medir no
pueda costar más que una tarea.

**Stack:** Next.js 16 (App Router) · TypeScript estricto · Vitest · Playwright · Radix vía `radix-ui`
1.6.7 · `next/image` contra Cloudinary.

**Diseño:** [`../FASE_3_DISENO.md`](../FASE_3_DISENO.md) §8 — se lee junto con este plan, no en su lugar.
**Toca** Q-20 *(lo mide, no promete cerrarlo)*. **No ejecuta ninguna decisión del diseño** —la F3-T3 es la
única tanda de la fase que no tiene una `D-n` que implementar, porque no la necesitaba— pero **sí trajo una
propia al decidir su alcance: D-87**, las tres elecciones de Alejandro del 2026-08-19 *(no partirla, medir
Q-20, arreglar el seed)*.

**Punto de partida, medido el 2026-08-19 y no citado:** `develop` limpio en **`56e314b`**, sólo `develop`
y `main` en local; en el remoto hay **tres** ramas —`develop`, `main` y `feature/estilos-sistema-visual`,
**que es de otra persona y no se toca**—; **32 migraciones** con `local` y `remote` idénticos; pgTAP
**`Files=33, Tests=200, PASS`**; Vitest **11 archivos, 158 pruebas** *(contadas archivo por archivo:
16+12+35+5+8+8+9+22+19+10+14 = 158)*; E2E **5 archivos, 7 pruebas**.

---

## Correcciones al diseño

*(Todas son de la escritura de este plan, antes de ejecutar nada.)*

1. ⚠ **La trampa nº 1 del proyecto aparece INVERTIDA, y por eso es más peligrosa que de costumbre.** El
   `seed.sql` local siembra 2 imágenes apuntando a `https://res.cloudinary.com/demo/image/upload/seed/cam-001.jpg`
   *(`supabase/seed.sql:73-75`)*, y **esa URL devuelve `404`** — medido el 2026-08-19 con `curl -I`, que
   contesta `404` con `content-type: image/gif`, el gif de error de Cloudinary. Una URL real de producción
   —`.../dnkgkql1t/image/upload/v1773086229/products/o5bwiwdwllzppph2xxll.jpg`— contesta
   **`200 image/jpeg`**.

   **O sea: la miniatura se va a ver ROTA en local y BIEN en producción.** No es la forma habitual de la
   trampa —«verde en local, vacío en el sitio real»—, es la contraria, y su daño es distinto: quien
   verifique en local va a creer que el trabajo está mal y **puede “arreglar” código que está sano**,
   añadiendo un fallback que esconda el hueco o cambiando la implementación que ya funcionaba. **El
   arreglo es del seed y no del código** *(Tarea 1, paso 5)*, decidido por Alejandro el 2026-08-19: mismo
   precedente que la corrección 3 de la F3-T2, que sembró `confirmation_sent_at` porque en local faltaba.

2. **La regla de «cuál es la imagen principal» YA EXISTE y el diseño no lo dice.** §8 describe la tarea
   como «pedirle además `secure_url` e `is_main`», y se queda corto: `imagenPrincipal()` vive en
   `lib/catalogo/consultas.ts:54`, es privada de ese archivo, y ya decide exactamente esto —la que tenga
   `is_main`, o si nadie la marcó, la de menor `sort_order`—. **Copiarla a `lib/admin` y a `lib/mostrador`
   dejaría la misma regla en tres sitios**, que es justo lo que su propio comentario existe para evitar
   *(«el aplanado vive aquí y no en el componente que pinta la tarjeta»)*. Se extrae a un módulo propio
   *(Tarea 1)*.

3. ⚠ **En producción el desempate por `sort_order` NO SE EJERCITA NUNCA, y eso decide dónde va la
   prueba.** Medido contra el proyecto real el 2026-08-19:

   | Qué | Valor |
   |---|---|
   | Productos | **34** |
   | Filas en `product_images` | **34** |
   | Productos con al menos una imagen | **34** |
   | Filas con `is_main = true` | **34** |
   | Productos con imagen principal | **34** |
   | Filas con `cloudinary_public_id` nulo | **34** |
   | Filas con `secure_url` nulo | **0** |
   | Hosts distintos | **1** — `res.cloudinary.com`, `https` |

   **Una imagen por producto y todas marcadas como principal.** La rama del desempate es código que
   **sólo el seed y las pruebas pueden alcanzar**, así que su cobertura tiene que venir de Vitest y no de
   mirar una pantalla — y eso es un argumento *a favor* de extraer la función, no en contra: hoy esa rama
   no la prueba nadie.

4. **El host ya está declarado y no hay que tocar `next.config.ts`.** `images.remotePatterns` cubre
   `res.cloudinary.com` con `pathname: "/**"` desde la T2A *(`next.config.ts:39-47`)*, y la medición de
   arriba confirma que sigue siendo el **único** host de las 34. Se escribe para que nadie abra ese
   archivo «por si acaso»: es la clase de cambio que no falla en `typecheck`, `lint` ni `build` y sólo se
   ve cuando el optimizador va a buscar la imagen.

5. ⚠ **La miniatura del mostrador NO se puede verificar contra producción, y hay que decirlo antes de
   prometerlo.** Medido: **0 reservas en producción** —consultado el 2026-08-19— y **0 reservas en el
   `seed.sql`**, que no tiene ni un `insert into public.inventory_reservations`. El mostrador está vacío
   en los dos sitios. **La única forma de ver una tarjeta con miniatura es crear la reserva caminando la
   aplicación**, que es exactamente lo que hace `reservarParaManana()` *(`e2e/apoyo/reserva.ts`)*. Por eso
   la verificación de esta mitad de la tanda es **el E2E y el navegador en local**, y el cierre dirá
   *«verificado en local; en producción no hay ninguna reserva que mostrar»* en vez de insinuar que se vio
   en el sitio real.

6. ⚠ **Q-20 tiene una TERCERA cura que el diseño no conocía, y no es el hash ni `'unsafe-inline'`.**
   Q-20 dice que las dos curas conocidas son peores que la enfermedad. Medido el 2026-08-19 leyendo las
   dependencias instaladas, la cadena que inyecta esa hoja `<style>` es:

   ```
   @radix-ui/react-dialog  ->  react-remove-scroll  ->  react-style-singleton  ->  get-nonce
   ```

   `react-style-singleton/dist/es2015/singleton.js` crea el `<style>` y **le pone el atributo `nonce` si
   `getNonce()` devuelve algo**; y `get-nonce` exporta **`setNonce(nonce)`**, una función pública que fija
   ese valor. Si la aplicación llama a `setNonce()` con el nonce de la petición, **la hoja nace con el
   nonce y la CSP la acepta sin hashes y sin desarmar D-56**.

   **Y explica el hallazgo que la F3-T2 dejó abierto:** `@radix-ui/react-select` importa **el mismo
   `RemoveScroll`** —comprobado en su `dist/index.mjs`—, así que los **dos hashes** de Q-20 no son dos
   problemas: son **dos hojas del mismo inyector**, y una sola llamada las cubriría a las dos.

   ⚠ **Esto es una lectura del código de la dependencia, NO una verificación por el efecto.** Hoy nadie
   llama a `setNonce()` y **nadie lee `x-nonce`**: el proxy la pone en las cabeceras del request
   *(`proxy.ts:59`)* y ningún componente la consume — comprobado por búsqueda en todo el árbol menos
   `node_modules`. La Tarea 5 lo mide, con su salida escrita.

7. ⚠ **Q-20 no se ve en `npm run dev`, y medirlo ahí daría un verde falso.** `lib/seguridad/csp.ts:91`
   construye `style-src 'self' 'unsafe-inline'` **en desarrollo** y `style-src 'self' 'nonce-…'` sólo en
   producción — lo fija además `lib/seguridad/csp.test.ts:52-65`. **Cualquier medición de la Tarea 5 en
   `dev` sale limpia por construcción**, sin que nada esté arreglado. Se mide con `npm run build` y
   `npm start`, y ésa es la única forma que cuenta.

8. ⚠ **La superficie de Q-20 es MUCHO mayor que «tres diálogos, dos pantallas», y ni siquiera que las
   dos ampliaciones ya anotadas.** Contado el 2026-08-19: **8 archivos** consumen `components/ui/dialog`
   y **9** consumen `components/ui/select`, y los dos pasan por el mismo `RemoveScroll`:

   | | Archivos |
   |---|---|
   | `Dialog` | `admin/dialogo-agregar-unidad` · `admin/dialogo-estado-reserva` · `admin/dialogo-estado-unidad` · `admin/formulario-ajustes` · `admin/panel-dias` · `mostrador/dialogo-falta` · `mostrador/dialogo-nota` · `reservas/dialogo-cancelar` |
   | `Select` | `admin/dialogo-agregar-unidad` · `admin/dialogo-estado-unidad` · `admin/filas-unidad` · `admin/filtros-reservas` · `admin/formulario-ajustes` · `admin/formulario-editar-producto` · `admin/formulario-producto` · `admin/tabla-personal` · `admin/tabla-reservas` |

   **No se van a medir los diecisiete.** La Tarea 5 mide **cuatro superficies** —las tres que Q-20 ya tiene
   documentadas más el lightbox nuevo— y lo que este recuento cambia es **la lectura del resultado**: si la
   cura funciona en las cuatro, la afirmación honesta es *«funciona en las cuatro medidas»*, no *«Q-20 está
   cerrado»*. **Contar la superficie por delante es lo que impide que un 4/4 se lea como un 17/17.**

9. **El hueco sin imagen ya tiene convención en este proyecto y no se inventa otra.**
   `components/catalogo/tarjeta-producto.tsx:36` cae a `/placeholder.svg` —que existe en `public/`,
   3.253 bytes— cuando el producto no trae imagen. Las dos pantallas nuevas usan **la misma**, en vez de
   un recuadro gris propio: dos huecos distintos para el mismo caso se leen como dos estados distintos.

10. **`format` y `cloudinary_public_id` NO entran en el `select`, y se dice para que nadie los pida.**
    Los dos son `NULL` en las 34 filas de producción —medido—, así que no pueden decidir nada. La
    miniatura necesita `secure_url` e `is_main`; `sort_order` entra sólo porque lo exige el desempate de
    la corrección 3.

11. **Cambiar `FilaCruda` en `lib/admin/consultas.ts` va a romper el `typecheck` a propósito, y eso es el
    diseño funcionando.** Ese tipo existe para que TypeScript **contraste** la forma declarada contra lo
    que infiere el `select`, en vez de imponerla con un `.returns<>()` —su comentario lo dice en
    `lib/admin/consultas.ts:34-40`—. Si se toca el `select` y no el tipo, el typecheck falla; **es la
    señal correcta, no un fallo del plan.** Hay tres sitios acoplados y no uno: el tipo *(línea 67)*, el
    `select` *(línea 115)* y **el comentario de la línea 55, que transcribe el select medido** — un
    comentario caducado compila igual que uno cierto.

12. **`FilaInventario` no aparece en ninguna prueba de Vitest, así que ampliarlo no rompe nada.**
    Comprobado por búsqueda en `lib/admin/filtros.test.ts` y en `lib/admin/filtros.ts`: **cero
    ocurrencias**. Es lo contrario de lo que pasó en la F3-T2, donde tocar `cruzarPersonal()` rompió cinco
    llamadas *(su corrección 5)*, y se escribe porque **la ausencia de acoplamiento también se mide**.

13. **Ninguna prueba pgTAP toca `product_images`** —cero ocurrencias en `supabase/tests/`—, así que
    cambiar dos URLs del seed **no puede mover las 200 aserciones**. La predicción es exacta y comprobable:
    después de la Tarea 1, `npx supabase test db` sigue dando `Files=33, Tests=200, PASS`.

---

## Restricciones globales

*Valen para todas las tareas y no se repiten en cada una.*

- **PowerShell 5.1:** sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Un comando por bloque.
- **Esta tanda NO toca el esquema.** Cero migraciones, cero SQL nuevo. Si alguna tarea parece pedir una
  migración, es que se salió del alcance: se para y se anota.
- **Docker Desktop tiene que estar arrancado**, y `db reset` exige el stack completo: falla si se arrancó
  con `-x`. ⚠ **`npx supabase start` devuelve exit 0 aunque Docker esté parado** —medido el 2026-08-18 y
  reconfirmado el 2026-08-19—, así que se comprueba **por el efecto**: `docker ps` lista contenedores, o
  `netstat -ano` encuentra el 54322.
- **El código de salida se captura por redirección a archivo, nunca por tubería.** `cmd | tail` devuelve
  el código de `tail`. Le costó una rama equivocada a la sesión del 2026-08-19.
- **Sólo `git ls-remote` o `fetch --prune` dicen qué hay en el remoto.** Un `[ahead 1]` de `git branch -v`
  describe una referencia local que puede estar caducada — mismo error, misma sesión, tres veces.
- **Mensajes de commit sin acentos y SIN `Co-Authored-By` ni ninguna firma de Claude.** Los documentos,
  con tildes.
- **No se empuja al remoto.** El plan entrega los comandos; los ejecuta Alejandro.
- **Ningún control de autorización en el cliente.** Quien decide es RLS. Esta tanda no añade ninguno: las
  dos pantallas ya viven bajo layouts que exigen personal.
- **Nada de estética.** La fase visual la hace otra persona. Esta tanda entrega **funcionalidad y
  visibilidad** —que la imagen exista, se vea y se pueda ampliar—, no tamaños ni posiciones afinados.
- **El E2E necesita base limpia Y Auth caliente** *(Q-26)*. El orden que funciona: **`db reset` → calentar
  Auth (UNA sola petición: la segunda seguida da 429) → E2E**. Y desde la F3-T2 hay un motivo nuevo:
  `e2e/perfil.spec.ts` **deja a Bruno confirmado**, así que una segunda corrida sin `db reset` no vería el
  rebote y fallaría sin que nada esté roto.
- **Si el `typecheck` falla con errores de SINTAXIS en `.next/dev/types/routes.d.ts`, no es el código:** es
  ese archivo generado, truncado al matar el servidor de desarrollo. `rm -rf .next` y vuelve a verde
  *(corrección 17 de la F3-T1)*.
- **Para puertos, `netstat -ano`, nunca `curl`**: devuelve `000` por timeout y se lee como «puerto libre».
  Para **matar un proceso**, PowerShell `Stop-Process -Id <pid> -Force` — en Git Bash `taskkill /PID` falla,
  convierte `/PID` en una ruta.

---

## Mapa de archivos

**Se crean:**

| Archivo | De qué responde |
|---|---|
| `lib/imagenes/principal.ts` | La regla «cuál es la imagen principal», en **un** sitio *(corrección 2)* |
| `lib/imagenes/principal.test.ts` | Sus casos, **incluida la rama que producción no ejercita** *(corrección 3)* |
| `components/imagenes/miniatura-ampliable.tsx` | La miniatura que abre el lightbox. Client Component |

**Se modifican:**

| Archivo | Qué cambia |
|---|---|
| `supabase/seed.sql` | Las 2 URLs de `product_images` pasan a apuntar a algo que responde `200` *(corrección 1)* |
| `lib/catalogo/consultas.ts` | Deja de tener `imagenPrincipal()` propia: la importa del módulo nuevo |
| `lib/admin/consultas.ts` | `FilaCruda`, `FilaInventario`, `filaAInventario()`, el `select` y **el comentario de la línea 55** |
| `lib/mostrador/consultas.ts` | `FilaMostrador`, `ReservaMostrador`, `filaAMostrador()` y el `select` |
| `components/admin/tabla-inventario.tsx` | La columna «Imágenes» pasa de número a miniatura |
| `components/mostrador/tarjeta-mostrador.tsx` | La miniatura del producto en la tarjeta |

**Se modifican sólo si la Tarea 5 sale por A:**

| Archivo | Qué cambia |
|---|---|
| `app/layout.tsx` | Lee `x-nonce` de `headers()` y se lo pasa al componente de abajo |
| `components/seguridad/nonce-radix.tsx` | Llama a `setNonce()` con el nonce de la petición |

**No se toca, y se dice para que nadie lo intente:** `next.config.ts` —el host ya está declarado
*(corrección 4)*—, `lib/seguridad/csp.ts` —la cura del nonce **no cambia la política**, que es justamente
lo que la hace preferible al hash— y ninguna migración.

---

## Tarea 0 · La rama y el punto de partida

*Un commit al final de la tanda no vale: si la Tarea 5 sale mal, hay que poder volver al estado de antes
sin arrastrar lo demás.*

- [ ] **Paso 1.** Comprobar que `develop` está limpio y al día. Esperado: rama `develop`, `git status`
      vacío, último commit **`56e314b`**. ⚠ **Sin tubería**: `git status --short` a secas.
- [ ] **Paso 2.** Comprobar **por el efecto** que el stack local está arriba: `docker ps` lista
      `supabase_db_UPC-Inventario`. **No basta con que `supabase start` haya devuelto 0.**
- [ ] **Paso 3.** Crear la rama `feature/fase-3-tanda-3` desde `develop`.
- [ ] **Paso 4.** **Fijar la línea base contando, no citando:** `npx supabase test db` y `npm test`.
      Esperado: **`Files=33, Tests=200, PASS`** y **11 archivos, 158 pruebas**. Si no coinciden, se para y
      se averigua por qué antes de escribir una línea.

**Commit:** ninguno. Esta tarea no cambia archivos.

---

## Tarea 1 · La regla de la imagen principal, en un solo sitio — y el seed que sí responde

*Va primera porque las Tareas 2 y 3 la importan las dos. Y el arreglo del seed va aquí y no al final
porque **sin él nadie puede verificar en local lo que las dos tareas siguientes construyen**.*

- [ ] **Paso 1.** Crear `lib/imagenes/principal.ts` con una función pura, sin React y sin base de datos —
      mismo espíritu que `lib/mostrador/columnas.ts`. Recibe una lista de `{ secure_url, is_main,
      sort_order }` y devuelve la URL o `null`. **Se mueve la lógica de `lib/catalogo/consultas.ts:54`
      tal cual, sin “mejorarla” de paso:** si algo de ella hay que cambiar, es un cambio aparte y con su
      motivo.
- [ ] **Paso 2.** Cambiar `lib/catalogo/consultas.ts` para que **importe** la función en vez de tener la
      suya. El comentario que explica *por qué* el aplanado vive en la capa de datos y no en el componente
      **se mueve con la función**, no se queda huérfano en el archivo del que sale.
- [ ] **Paso 3.** Escribir `lib/imagenes/principal.test.ts`. Los casos que importan, y el tercero es el
      que justifica la extracción:
      - lista vacía → `null`;
      - una sola imagen con `is_main` → esa;
      - **varias sin ninguna `is_main` → la de menor `sort_order`** *(la rama que producción no ejercita
        nunca, corrección 3)*;
      - varias con una `is_main` que **no** es la de menor `sort_order` → gana `is_main`, no el orden;
      - `sort_order` empatado → **se afirma que devuelve una de las dos y no cuál**, porque el desempate
        no está definido y afirmarlo ataría la prueba a un detalle de `Array.sort`.
- [ ] **Paso 4.** Correr `npm test`. **Predicción, a contrastar y no a dar por buena:** 11 archivos pasan
      a **12**, y 158 pruebas pasan a **158 + las escritas en el paso 3**. Si el número de archivos no
      sube, el archivo nuevo no se está recogiendo.
- [ ] **Paso 5.** **Arreglar el `seed.sql`** *(corrección 1)*. Las dos filas de `product_images`
      *(`supabase/seed.sql:73-75`)* pasan a apuntar a una URL de la cuenta pública `demo` que **responde
      `200 image/jpeg`** —medido el 2026-08-19: `https://res.cloudinary.com/demo/image/upload/sample.jpg`
      y `.../couple.jpg` contestan las dos—. **Van dos URLs distintas y no la misma dos veces:** con la
      misma foto en los dos productos, una miniatura pegada a la fila equivocada se vería correcta.
      Se deja escrito en el propio `seed.sql`, en un comentario **sin acentos**, que esas URLs son de la
      cuenta de demostración de Cloudinary y no del proyecto, y **por qué se cambiaron**.
- [ ] **Paso 6.** `npx supabase db reset` y `npx supabase test db`. **Predicción:** `Files=33, Tests=200,
      PASS`, **sin moverse ni una aserción** *(corrección 13)*. Si se mueve alguna, hay un acoplamiento al
      seed que nadie había medido y se anota antes de seguir.
- [ ] **Paso 7.** **Comprobar por el efecto que el arreglo del seed sirve, y con control negativo:**
      `curl -I` sobre **la URL nueva** —esperado `200`— y sobre **la vieja**, `.../demo/image/upload/seed/cam-001.jpg`
      —esperado `404`—. **Sin el segundo, un `200` no prueba que se haya cambiado nada.**

**Commit:** `feat: regla de imagen principal en un solo modulo y seed con urls que responden`

---

## Tarea 2 · La miniatura en la lista de inventario

- [ ] **Paso 1.** En `lib/admin/consultas.ts`, ampliar el `select` de `listarInventario()` *(línea 115)*
      de `product_images(id)` a `product_images(secure_url,is_main,sort_order)`. **`id` deja de pedirse
      si no lo usa nadie**: pedir columnas que no se leen es lo que hizo falta cuatro tandas para
      descubrir en `description`.
- [ ] **Paso 2.** Actualizar **los tres sitios acoplados** *(corrección 11)*: el tipo `FilaCruda`
      *(línea 67)*, el `select` *(paso 1)* y **el comentario de la línea 55**, que transcribe la consulta
      medida. **El typecheck en rojo entre el paso 1 y éste es la señal correcta**, no un fallo.
- [ ] **Paso 3.** En `FilaInventario`, el campo `imagenes: number` pasa a ser **la URL de la principal, o
      `null`** — no las dos cosas. Un tipo que lleva el número *y* la URL obliga a cada pantalla a decidir
      cuál mira, y la lista ya no muestra el número. Si algún día hace falta el recuento, se añade
      entonces y con su motivo.
- [ ] **Paso 4.** En `filaAInventario()`, calcular ese campo con la función de la Tarea 1. **No se
      reimplementa aquí**: si se copia la regla, la corrección 2 se ha cobrado otra vez.
- [ ] **Paso 5.** En `components/admin/tabla-inventario.tsx`, la celda «Imágenes» pasa a pintar la
      miniatura con `next/image` —el mismo patrón que `galeria-admin.tsx`, contenedor con proporción y
      `fill`— y cae a `/placeholder.svg` cuando no hay ninguna *(corrección 9)*. La cabecera de columna
      deja de llamarse «Imágenes» y pasa a decir lo que hay debajo. **`alt` con el nombre del producto**,
      no vacío: en una tabla la miniatura es el identificador visual de la fila.
- [ ] **Paso 6.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`. Los cuatro en verde.
- [ ] **Paso 7.** **Verificar por el efecto en el navegador**, en local, en `/admin/inventario`: de los 4
      productos del seed, **2 tienen imagen y 2 no** — se ven **2 miniaturas y 2 placeholders**, y ése es
      el control que hace que las miniaturas signifiquen algo. ⚠ **Y ahora se ven de verdad**, porque el
      paso 5 de la Tarea 1 arregló las URLs; antes de ese arreglo se habrían visto 4 huecos con los cuatro
      comandos en verde.

**Commit:** `feat: la lista de inventario muestra la miniatura principal`

---

## Tarea 3 · La miniatura en el mostrador

- [ ] **Paso 1.** En `lib/mostrador/consultas.ts`, ampliar el embed de `products` en el `select` de
      `reservasMostrador()`: de `products(name)` a `products(name,product_images(secure_url,is_main,sort_order))`.
      ⚠ **Es un embed anidado a dos niveles y este proyecto ya midió que eso NO se puede dar por hecho**:
      la T2A se topó con que PostgREST **no** embebe `product_availability` desde `products` en ninguna
      dirección *(PGRST200)*. **Se comprueba que llega poblado antes de escribir el resto de la tarea**, y
      si no llega, la salida está en V-2.
- [ ] **Paso 2.** Actualizar `FilaMostrador` y `ReservaMostrador` con el campo nuevo —**la URL o `null`**,
      igual que en la Tarea 2— y calcularlo en `filaAMostrador()` con la función de la Tarea 1.
- [ ] **Paso 3.** ⚠ **Decidir explícitamente qué pasa si el embed de imágenes viene vacío, y NO copiar el
      criterio de `products`.** `filaAMostrador()` descarta la fila entera cuando falta `products`,
      `inventory_units` o la sede, porque sin esos datos el personal no sabe qué entregar. **Una foto que
      falta no es ese caso:** la reserva sigue siendo atendible sin ella, así que **falta la foto, no la
      fila**. Descartar una reserva viva por no tener imagen escondería un préstamo real del mostrador.
- [ ] **Paso 4.** En `components/mostrador/tarjeta-mostrador.tsx`, pintar la miniatura junto al nombre del
      producto, con `/placeholder.svg` de respaldo. **La tarjeta ya es Client Component**, así que no hay
      frontera nueva que cruzar.
- [ ] **Paso 5.** Los cuatro comandos en verde.
- [ ] **Paso 6.** **Verificar por el efecto**, y aquí hay que crear la reserva porque **no hay ninguna**
      *(corrección 5)*: `db reset`, entrar como alumna, reservar, entrar como operador y mirar
      `/mostrador`. La miniatura tiene que ser **la del producto reservado**, y se comprueba contra el
      nombre que la tarjeta ya muestra — no basta con que se vea *una* foto.

**Commit:** `feat: el mostrador muestra la imagen del producto de cada reserva`

---

## Tarea 4 · El lightbox

- [ ] **Paso 1.** Crear `components/imagenes/miniatura-ampliable.tsx`: la miniatura envuelta en un
      `DialogTrigger`, y el `DialogContent` con la imagen grande. **Se monta sobre
      `components/ui/dialog.tsx`, que ya existe**, en vez de escribir un overlay propio: Radix ya trae
      resueltos el portal, el atrapado de foco, el `aria-modal` y el cierre con Escape, y reescribirlos a
      mano cambiaría deuda de CSP por deuda de accesibilidad.
- [ ] **Paso 2.** El diálogo lleva **`DialogTitle` con el nombre del producto**, aunque no se quiera ver
      un título: sin él, Radix avisa por consola y un lector de pantalla anuncia un diálogo sin nombre. Si
      no debe verse, va con la clase de sólo-lectores, no se omite.
- [ ] **Paso 3.** Sustituir la miniatura suelta de las Tareas 2 y 3 por este componente en **las dos**
      pantallas. **Una sola implementación para los dos sitios**, por el mismo motivo que la Tarea 1.
- [ ] **Paso 4.** El lightbox **no se abre cuando no hay imagen**: sobre `/placeholder.svg` la miniatura
      es un `<img>` y no un disparador. Ampliar un placeholder no muestra nada y deja al usuario en un
      diálogo vacío preguntándose qué falló.
- [ ] **Paso 5.** Los cuatro comandos en verde.
- [ ] **Paso 6.** **Verificar por el efecto en el navegador**, en las dos pantallas: abre, se ve la imagen
      grande, cierra con Escape, cierra con el botón, y **el foco vuelve a la miniatura** que lo abrió.
      ⚠ **Se anota si el fondo se desplaza con el diálogo abierto** — es el síntoma exacto de Q-20, y ésta
      es su cuarta superficie. **Se anota, no se arregla aquí:** eso es la Tarea 5.

**Commit:** `feat: lightbox para ampliar la imagen dentro del panel`

---

## Tarea 5 · Q-20, medido por la vía del nonce — **con la salida escrita por delante**

*Decidido por Alejandro el 2026-08-19: se mide. **El coste máximo de esta tarea es la propia tarea**: si
la vía no funciona, se escribe lo medido, se vuelve al estado del commit anterior y la tanda cierra igual
que si esta tarea no existiera. Lo que NO se hace en ningún desenlace es el hash ni `'unsafe-inline'`.*

- [ ] **Paso 1.** **Fijar el estado ANTES, en modo producción y con control positivo.** `npm run build` y
      `npm start` —⚠ **no `npm run dev`**, que lleva `'unsafe-inline'` en `style-src` y saldría limpio por
      construcción *(corrección 7)*—. Con la consola del navegador abierta, recorrer **las cuatro
      superficies** y contar las violaciones de CSP:

      | # | Pantalla | Interacción |
      |---|---|---|
      | 1 | `/mostrador` | abrir `DialogoFalta` o `DialogoNota` |
      | 2 | `/admin/inventario/[id]` | abrir el diálogo de estado de unidad |
      | 3 | `/admin/personal` | **abrir el desplegable de rol** — no es un diálogo |
      | 4 | `/admin/inventario` | **abrir el lightbox de la Tarea 4** |

      **El control positivo va aquí y no al final:** una medición que empieza contando violaciones
      **reales** ya demuestra que el detector funciona. Si el paso 1 diera 0 violaciones, **el instrumento
      está roto** y no hay nada que arreglar — se para y se averigua por qué.
- [ ] **Paso 2.** Anotar **cuántas violaciones y con qué hashes**, superficie por superficie. Q-20 tiene
      dos hashes documentados; **si aparece un tercero, se escribe**, porque el enunciado de Q-20 ya se
      quedó corto dos veces.
- [ ] **Paso 3.** Crear `components/seguridad/nonce-radix.tsx`: Client Component mínimo que recibe el
      nonce por prop y llama `setNonce()` de `get-nonce`. ⚠ **La llamada tiene que ocurrir ANTES de que se
      monte el primer `Dialog` o `Select`**, no en un `useEffect` tardío: `react-style-singleton` crea el
      `<style>` **una sola vez** —su contador arranca en 0 y sólo entonces llama a `makeStyleTag()`— y **no
      lo vuelve a crear**, así que un nonce que llegue tarde no arregla una hoja ya inyectada.
- [ ] **Paso 4.** En `app/layout.tsx`, leer `x-nonce` con `headers()` de `next/headers` y pasárselo. La
      cabecera ya viaja en el request desde `proxy.ts:59` —`updateSession` la inyecta con
      `new Headers(request.headers)` en `lib/supabase/proxy.ts:34-36`—, y **hoy no la lee nadie**
      *(corrección 6)*.
- [ ] **Paso 5.** ⚠ **Comprobar el caso que puede desmentir la cura entera: la navegación de cliente.**
      `get-nonce` guarda el nonce en **una variable de módulo del navegador**, y el nonce **cambia en cada
      petición**. En una navegación sin recarga el documento sigue siendo el de la primera carga —y su CSP
      también—, así que deberían coincidir; **pero eso es un razonamiento, no una medición.** Se camina
      `/admin/inventario` → `/admin/personal` → `/mostrador` **sin recargar**, abriendo un diálogo o un
      desplegable en cada una. **Si alguna da violación, la cura no sirve tal cual** y el desenlace es B.
- [ ] **Paso 6.** **Repetir el paso 1 entero**, mismas cuatro superficies, mismo modo producción. Y
      **volver a poner un control positivo explícito**, porque ahora se espera un 0 y **un 0 sin control no
      distingue «arreglado» de «dejé de mirar»**: inyectar a mano desde la consola un `<style>` sin nonce y
      comprobar que **sí** salta la violación.
- [ ] **Paso 7.** **Escribir el desenlace, sea cual sea, en la cabecera de correcciones y en Q-20.**

**Las dos salidas, decididas antes de medir:**

| | Qué se hace |
|---|---|
| **A — funciona** | Se conservan los dos archivos. **Q-20 se actualiza diciendo exactamente qué se midió: 4 superficies, no las 17 de la corrección 8.** No se declara cerrado por una medición de cuatro; se declara **la cura encontrada y verificada en cuatro**, y se deja escrito qué falta para cerrarlo |
| **B — no funciona** | **Se revierten los dos archivos** y la tanda sigue sin ellos. Q-20 gana lo más valioso que puede ganar un pendiente aplazado: **una tercera cura descartada con la medición que la descarta**, para que nadie la vuelva a proponer dentro de seis meses |

**Commit (sólo en la salida A):** `feat: el nonce de la peticion llega a los estilos que inyecta radix`
**Commit (en la salida B):** ninguno de código. Lo medido va en la documentación, en la Tarea 6.

---

## Tarea 6 · Verificación de punta a punta y cierre

- [ ] **Paso 1.** Los cuatro comandos, en orden de lo rápido a lo caro: `npm run lint`, `npm run
      typecheck`, `npm test`, `npm run build`.
- [ ] **Paso 2.** `npx supabase test db`. **Predicción: `Files=33, Tests=200, PASS`, sin moverse** — esta
      tanda no toca el esquema *(corrección 13)*.
- [ ] **Paso 3.** El E2E, **en el único orden que funciona** *(Q-26)*: `npx supabase db reset` →
      **una sola** petición a `/auth/v1/otp` para calentar Auth → `npm run test:e2e`. **Predicción: 7/7**,
      en torno a **1,3 min**. Esta tanda no cambia ningún flujo, así que **cualquier fallo aquí es una
      regresión de las Tareas 2 a 4**, no una prueba frágil.
- [ ] **Paso 4.** **NO se añade una octava prueba E2E.** El lightbox se verifica a ojo en la Tarea 4 y eso
      se dice en el cierre en vez de disimularlo: **hoy depende de que alguien se acuerde**, exactamente
      como estuvo la puerta de perfil entre la F3-T1 y la F3-T2. Si Alejandro quiere la octava, es una
      decisión suya y entra como Q-27.
- [ ] **Paso 5.** **Recorrido en navegador de las dos pantallas con los dos perfiles**, admin y operador:
      que la lista de inventario y el mostrador se ven bien con los dos, y que **el operador no gana
      acceso a nada nuevo** — esta tanda no toca RLS ni políticas, y comprobarlo es lo que lo demuestra.
- [ ] **Paso 6.** Cerrar los documentos **antes** de pasar los comandos de git *(regla 4 del `CLAUDE.md`
      global)*: la fila de la F3-T3 en `ESTADO_Y_PLAN.md` §6, la bitácora, el desenlace de la Tarea 5 en
      **Q-20** §8, y la cabecera de correcciones de este plan.
- [ ] **Paso 7.** Entregar los comandos de PowerShell para la rama y el PR. **No se ejecutan aquí.**

**Commit:** `docs: cierre de la F3-T3 en local`

---

## Puntos a verificar

*Lo que no se sabe con certeza, con los dos desenlaces y qué se hace en cada uno.*

| # | Duda | Si A | Si B |
|---|---|---|---|
| **V-1** | ¿`setNonce()` hace que la hoja de `react-remove-scroll` nazca con el nonce, en modo producción y con navegación de cliente? | Funciona → Tarea 5 salida **A**. Q-20 gana su primera cura que no es peor que la enfermedad | No funciona → salida **B**: se revierte y **se escribe la medición que la descarta**. La tanda cierra igual |
| **V-2** | ¿PostgREST embebe `product_images` **dentro** de `products` desde `inventory_reservations` —dos niveles— o contesta PGRST200, como hizo con `product_availability` en la T2A? | Llega poblado → Tarea 3 tal cual | PGRST200 → **segunda consulta** a `product_images` por los `product_id` de las reservas, agrupada en TypeScript. Se anota que el embed anidado no funciona, que es un dato del proyecto y no de esta tanda |
| **V-3** | ¿La celda de miniatura cabe en la tabla de inventario sin romper la fila en pantalla estrecha? | Cabe → Tarea 2 tal cual | No cabe → **se pone igual y no se ajusta la estética** *(la fase visual es de otra persona)*. Se anota. Mismo desenlace que V-2 de la F3-T2, que salió por A porque la tabla ya vive en un `overflow-x-auto` |
| **V-4** | ¿La reserva que crea `reservarParaManana()` cae en un producto **con** imagen? El arnés toma «la primera tarjeta del catálogo» a propósito, para no atarse al seed | Cae en uno con imagen → la Tarea 3 se verifica con miniatura | Cae en uno sin imagen → se verifica el **placeholder**, que también es un caso real, y se reserva a mano un producto con foto para ver la miniatura. **No se toca el arnés**: atarlo a un producto concreto rompería las cuatro pruebas que dependen de que no lo esté |
| **V-5** | ¿Alguna de las 34 imágenes de producción tiene una URL que ya no responde? Se midió **una** con `200`, no las 34 | Todas responden → nada que hacer | Alguna falla → **no es trabajo de esta tanda arreglarla**: se cuenta cuántas, se abre pendiente y la pantalla ya cae al placeholder por diseño |

---

## Cabecera de correcciones

*(Se rellena al ejecutar. Si al terminar está vacía, es que no se miró.)*

---

**Desenlace de los cinco puntos a verificar:** *(se rellena al ejecutar, con la fecha)*
