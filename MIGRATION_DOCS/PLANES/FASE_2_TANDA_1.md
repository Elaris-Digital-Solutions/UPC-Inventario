# Fase 2 · Tanda 1 — La sesión · Plan de implementación

---

## 📍 Dónde se paró — 2026-08-07, 20:24

> **Bloque temporal.** Se borra al cerrar la tanda, igual que se hizo con la sección 0 de
> `ESTADO_Y_PLAN.md`.

| Tarea | Estado |
|---|---|
| **Task 0** · dashboard y accesos | ✅ hecha. Clave publicable copiada, URL de redirección añadida, enganche activado. **Tenant de Entra ID: denegado** *(Q-16)* |
| **Task 1** · `.gitattributes` *(Q-15)* | ✅ cerrada y verificada |
| **Task 2** · `.env` y `.env.example` | ✅ cerrada |
| **Task 3** · migración 22, el enganche *(D-32)* | ✅ cerrada, empujada al remoto y **verificada en producción**: 403 real |
| **Task 4** · los tres clientes de `@supabase/ssr` | ✅ cerrada |
| **Task 5** · `proxy.ts` en la raíz | ✅ cerrada. JWKS remedido: **sigue en ES256** |
| **Task 6** · `/login` con magic link | ⬅ **SIGUIENTE**. Empieza por el Step 0: mirar el correo en Mailpit |
| Tasks 7 a 10 | pendientes |

**Estado de git:** rama `feature/fase-2-tanda-1`, **5 commits** (1.1 a 1.5), árbol limpio, **sin publicar
—no hay rama remota ni PR—**. `develop` está en `8a3731e`.

**Estado de la base:** 22 migraciones con `local` y `remote` idénticos · **142 aserciones pgTAP en 23
archivos** · `auth.users` en producción con **cero filas**.

**Lo que NO hay que rehacer:** la migración 22 ya está en el remoto, el enganche ya está activo en el
dashboard y ya se comprobó con una petición real, y Q-15 ya se verificó regenerando los tipos.

**Trampa que espera en la Task 7:** los usuarios que siembra `seed.sql` llevan las columnas de token en
`NULL` y **GoTrue devuelve `500` con cualquiera de ellos**. No sirven para probar el flujo de sesión en
local; hay que crear usuarios nuevos por el flujo real *(corrección 8)*.

---

## ⚠ Correcciones tras ejecutar — se añaden sobre la marcha

> **El plan de abajo no se reescribe.** Esto es lo que la ejecución desmintió, anotado al cerrar cada
> tarea y no al final, para no perderlo.

### Task 1 · El `.gitattributes` no hacía lo que el plan creía que hacía

1. **`git add --renormalize .` cambió CERO archivos.** El Step 2 pedía «anotar cuántos archivos toca»
   dando por hecho que renormalizar produce ruido, y por eso la tarea iba sola y primera. **No hay ruido
   que aislar: todo el repositorio ya estaba en LF.** Lo confirma lo que la tanda 0 había medido —el blob
   versionado coincidía byte a byte con lo que genera la CLI— y esta tarea lo extiende a los 89 archivos:
   ninguno cambia de contenido. El aislamiento del commit deja de ser una precaución y pasa a ser
   ordenado, pero la razón para tomarla era correcta con la información de entonces.

2. **Y por eso el trabajo real era otro, que el plan no menciona: refrescar el árbol de trabajo.** El
   `.gitattributes` arregla lo que se materializa en un checkout **futuro**; los archivos que ya están en
   el disco siguen con CRLF hasta que algo los reescriba. Medido: tras crear el archivo y renormalizar,
   `lib/database.types.ts`, `package.json`, `db.yml`, `config.toml`, `CLAUDE.md` y `globals.css` seguían
   todos en CRLF. **El diff falso de Q-15 seguía ahí con el `.gitattributes` ya escrito.**

3. **Dos formas de refrescar que NO funcionan, y las dos parecen que sí:**
   - **`.gitattributes` sin añadir al índice no aplica a un checkout.** Git lee los atributos del árbol
     que está desplegando, no del disco. Con el archivo escrito pero sin `git add`, `check-attr` ya
     contesta `eol: lf` —porque eso sí mira el disco— y un checkout sigue escribiendo CRLF. **Las dos
     respuestas son ciertas y contradictorias**, que es lo que hace que cueste verlo.
   - **`git checkout-index -a -f` no reescribe los archivos que ya existen**, ni con `-f`. Devuelve `0` y
     no toca nada. Verificado: los seis archivos seguían en CRLF después de correrlo.
   → Lo que sí funciona es borrar y recuperar: `rm <archivo>` y `git checkout -- <archivo>` devuelve el
   archivo en LF. Comprobado sobre `package.json` y sobre `lib/database.types.ts`.

4. **El refresco completo tiene que ir DESPUÉS del commit**, y esto es un orden que se puede estropear sin
   darse cuenta. La receta habitual es `git reset --hard`, y con `.gitattributes` solo en el índice **eso
   lo borra**: `reset --hard` deja índice y disco igual que `HEAD`, y el archivo todavía no está en `HEAD`.
   Se commitea primero, se refresca después.

> **Lo que esta tarea enseña, y no es sobre finales de línea:** `check-attr` decía que el atributo estaba
> puesto, `checkout-index` terminaba en `0`, y el problema seguía intacto. **Dos herramientas contestando
> «bien» a preguntas que no eran la pregunta.** La única comprobación que servía era mirar el byte:
> ¿tiene este archivo un `\r` dentro?

**Resultado final de la tarea, medido y no supuesto:** cero archivos de texto con `\r` en el disco, los
ocho binarios intactos —`git status` limpio—, y el paso que motivó Q-15 comprobado de verdad con el stack
local: `supabase gen types --local` contra `lib/database.types.ts` da `diff` limpio **en Windows**. De
paso, la CLI vuelve a anunciar `Connecting to db 5432`, que confirma otra vez lo que midió la tanda 0.

### Task 2 · El `.env`, y una tercera herramienta contestando a otra pregunta

5. **La clave publicable ya estaba en el `.env`, bajo un nombre que mentía.** `VITE_SUPABASE_ANON_KEY`
   guardaba una `sb_publishable_…`, no una `anon` en formato JWT. El Step 1 daba por hecho que había que
   traerla del dashboard; lo que hacía falta era **renombrarla**. El valor no cambia. Que el nombre de una
   variable describa mal lo que guarda es barato hasta el día en que alguien la rota mirando el nombre.

6. **`git check-ignore -v` contesta que sí a un archivo que NO está ignorado.** Con `!.env.example` en el
   `.gitignore`, imprime la línea de la **negación** y sale con código `0`, que es el mismo código con el
   que anuncia que un archivo sí está ignorado. La comprobación del Step 2 estaba escrita sobre ese código
   de salida y **daba el resultado contrario al real**.
   → Lo que sí responde la pregunta es `git add --dry-run <archivo>`: dice `add '.env.example'` para el que
   se puede versionar y **rechaza** el `.env` con `The following paths are ignored`. Es la tercera vez en
   dos tareas que la herramienta obvia contesta con confianza a una pregunta que no era la que se hacía.

### Task 3 · El enganche estuvo desactivado y todo salía en verde

7. **`supabase db reset` NO aplica el `config.toml` a los contenedores, y este es el hallazgo grave de la
   tanda.** El Step 5 decía «activarlo en local con el bloque del `config.toml` y `supabase db reset`».
   Se hizo, y **el enganche no existía**: `docker exec supabase_auth_… env | grep hook` no devolvía ni una
   variable. `db reset` reinicia contenedores, pero su entorno se genera en `supabase start`.
   → Hace falta **`supabase stop` y `supabase start`**. Después, las tres variables aparecen.
   → **Lo que hace que esto asuste es cómo se veía mientras tanto:** la migración aplicada, las 142
   aserciones pgTAP en verde, la función existiendo y contestando bien cuando se la llama a mano… y la
   puerta abierta de par en par. **Las pruebas unitarias de una función de enganche no prueban que el
   enganche esté enganchado.** Solo lo prueba pedir un registro de verdad y ver el 403.

8. **La primera prueba de rechazo fue inválida, y por poco pasa por buena.** Se probó con
   `alguien@gmail.com`, que **existe en `seed.sql`**. GoTrue devolvió `HTTP 500 Database error finding
   user` y era tentador leerlo como «rechaza». No rechazaba nada: reventaba antes. El registro del
   contenedor lo dijo entero —`Scan error on column index 3, name "confirmation_token": converting NULL to
   string is unsupported`—, y esa línea también deja un **pendiente que muerde en la Task 7**: las filas de
   `auth.users` que siembra `seed.sql` llevan las columnas de token en `NULL`, así que **GoTrue da 500 con
   cualquiera de ellas**. Los usuarios sembrados no sirven para probar el flujo real de sesión en local.
   → La sonda tiene que usar un correo que no exista. Con uno nuevo: **403 con el mensaje exacto**, tanto
   para `gmail.com` como para `notupc.edu.pe`, y **cero cuentas creadas**. El `@upc.edu.pe` entra con 200 y
   sale con su fila en `alumnos` puesta por el trigger: las dos capas, verificadas por separado.

9. **Siete aserciones, no cuatro**, y la séptima salió de escribirlas. Se añaden el `http_code` y dos casos
   que el plan no tenía: el sufijo `@upc.edu.pe.evil.com` y **un evento sin correo**. Esta última obligó a
   decidir la forma de la función: escrita como pedía el instinto —«si NO casa, rechaza»— un correo `NULL`
   da `not (NULL like …)`, que es `NULL`, el `IF` no entra y **la función deja pasar a todo el mundo sin un
   solo error**. Escrita al derecho, falla cerrada. Es el mismo modo de fallo que persiguió la Fase 1,
   encontrado esta vez antes de que existiera.

10. **Probar por HTTP contra el stack local contamina las fixtures, y una aserción lo cazó.**
    `14_rls_alumnos.sql` falló con «el admin ve a todos los alumnos: have 5, want 4»: el `@upc.edu.pe` de
    la sonda se había convertido en un alumno real por el trigger. **Las pruebas pgTAP hacen `rollback` de
    lo suyo, pero no de lo que otro escribió fuera.** `db reset` antes de correr la batería después de
    cualquier sonda. La aserción de conteo fijo, que parece frágil, es justo lo que lo detectó.

11. **En local no se puede observar lo que dice la corrección 3.** `config.toml` trae
    `enable_confirmations = false`, así que un magic link crea la cuenta **ya confirmada** y
    `email_confirmed_at` nunca se ve en `NULL`. La corrección sigue valiendo para el proyecto remoto, que
    es donde corre la Task 9; **se verifica ahí y no aquí**. De paso: el stack local **no es un ensayo fiel
    del flujo de confirmación**.

12. **Al plan le falta un paso, y sin él D-32 no protege nada en producción.** La Task 0 Step 3 manda
    activar el enganche en el dashboard, pero **la función tiene que existir antes en el proyecto remoto**,
    y ninguna tarea hace `supabase db push`. Sin ese empujón, el dashboard apuntaría a una función que no
    está. Se añade como paso de la Task 3, ejecutado por Alejandro por ser una escritura en producción.

**Verificado en el proyecto real al cerrar la tarea**, y no dando por hecho que el dashboard quedó bien
—que es el error que esta misma tarea acababa de enseñar—: 22 migraciones con `local` y `remote`
idénticos; la función en `private`, `prosecdef = false`, `search_path=""`, ejecutable por
`supabase_auth_admin` y por nadie más; y **una petición de registro real contra el Auth de producción
devuelve `403` con el mensaje exacto**. `auth.users` sigue en **cero filas**: la sonda usó un dominio
reservado, que no puede recibir correo, precisamente para no dejar rastro si el enganche hubiera estado
apagado.

### Task 4 · La versión instalada trae un aviso de seguridad que el diseño no tenía

13. **Punto a verificar 1, resuelto por el lado bueno:** `@supabase/ssr` 0.12.4 conserva
    `cookies: { getAll, setAll }`. El código de §7.1 del diseño entra tal cual. *(Matiz: en 0.12.4 `setAll`
    es opcional en el tipo. No cambia nada aquí, pero significa que omitirlo compila.)*

14. **Y leyendo esos mismos tipos aparecen dos avisos que no están en el diseño.** El primero refuerza lo
    que ya sabíamos —llamar a `getClaims()` **temprano**, antes de generar la respuesta, porque un refresco
    que termina después de que la respuesta salió pierde la sesión nueva—. **El segundo es nuevo y es de
    seguridad:** los refrescos de token escriben `Set-Cookie`, y si la aplicación queda detrás de un CDN o
    proxy inverso, **una respuesta cacheada con la cookie de sesión de alguien dentro se le sirve a otra
    persona**. No es hipotético para este proyecto: Vercel y Netlify ya reaccionan a cada commit del
    repositorio. Se cierra con `Cache-Control: private, no-store` en el proxy, y va **en el archivo**, no
    solo en este documento. **La lección de método:** leer los tipos de la versión instalada no era solo
    para confirmar una firma; traía una regla de diseño que ninguna documentación de las consultadas al
    escribir el plan mencionaba.

15. **El `Cache-Control` tiene que ir DESPUÉS de `getClaims()`, y el motivo no se ve leyendo la línea.**
    `setAll` **reconstruye** la respuesta —`response = NextResponse.next({ request })`— y `setAll` lo
    invoca `getClaims()` cuando toca refrescar. Puesta la cabecera antes, se perdería **exactamente en las
    peticiones que escriben `Set-Cookie`**, que son las únicas donde protege de algo. Escrito en el orden
    correcto y comprobado leyendo los números de línea: reasignación en la 39, `getClaims()` en la 53,
    cabecera en la 66.

16. **El plan pedía un tipo de retorno imposible.** La Task 4 Step 3 decía
    `updateSession(request): Promise<NextResponse>` y a la vez que devolviera `{ response, claims }` para
    que el proxy de la raíz decidiera. Son dos cosas incompatibles y ganó la segunda: el retorno es un
    `UpdateSessionResult { response, claims }`. **Y el tipo de `claims` no se importa de
    `@supabase/auth-js`**, que llega solo de forma transitiva y no está declarado en `package.json`; se
    deriva del propio `createServerClient<Database>`. Atarse a un paquete que el `package.json` no declara
    es una dependencia invisible que se rompe en la actualización que nadie relaciona con esto.

**Verificado al cerrar la tarea, y las dos preguntas que ninguna herramienta contesta:** no hay **ninguna**
constante de módulo con un cliente de servidor dentro, y `getSession(` no aparece en todo el árbol salvo en
los comentarios que explican por qué no se usa. `typecheck`, `lint` y `build`, los tres en verde.

### Task 5 · El plan no decía quién es privado, y una cabecera que no sobrevive

17. **Punto a verificar 3, resuelto por el lado bueno: el JWKS sigue en ES256.** Remedido el 2026-08-07
    contra `https://zqfkzgdyeqxzgzpxgadi.supabase.co/auth/v1/.well-known/jwks.json`: una sola clave, `kty:
    EC`, `crv: P-256`, `alg: ES256`, `kid` `b65ec4a5-7e4d-4801-923d-bd4abe7dd148`. `getClaims()` verifica
    la firma en local con WebCrypto y el proxy **no** paga una ida y vuelta por petición. No hay coste que
    registrar y el código se escribe como estaba diseñado.

18. **El plan no dice cómo decide el proxy qué ruta es privada, y son dos diseños con fallos opuestos.**
    El Step 4 da por hecho que existe «una ruta privada» sin definir el criterio. **Se decidió lista
    blanca:** se declara lo público —`/`, `/login`, `/auth`— y **todo lo demás pide sesión**. Falla cerrada,
    que es la misma forma de la corrección 9: una pantalla nueva nace protegida sin que nadie tenga que
    acordarse de añadirla. Con lista negra, la pantalla que alguien olvide añadir nace abierta.
    → Medido: `/catalogo`, `/admin/inventario` y `/completar-perfil` redirigen **sin estar declaradas en
    ningún sitio**. Esa es exactamente la propiedad que se compró.

19. **Al redirigir hay que copiar las cookies a mano, y el plan no lo menciona.** `NextResponse.redirect()`
    nace **vacío**: no hereda nada de la respuesta que construyó `updateSession`. Importa incluso cuando no
    hay sesión, que es justo cuando el proxy redirige: si el refresco falló, Supabase escribe un `Set-Cookie`
    que **borra** la cookie muerta, y perder ese borrado deja al navegador reintentando con una cookie que
    ya no sirve. Se copian las cookies y **también el `Cache-Control`**, por el mismo motivo de la
    corrección 14.

20. **Punto a verificar 4, resuelto: el matcher se queda como está.** El proxy corre sobre `/auth/confirm`
    y no interfiere —contesta `404` porque la ruta aún no existe, sin redirigir—. Con la lista blanca,
    `/auth` es público, así que ahí el proxy **solo refresca**, que es precisamente lo que el canje
    necesita. No hay que excluir `/auth/` del matcher.

21. **Y un hallazgo que contradice a la corrección 14 en la mitad de los casos: Next.js pisa el
    `Cache-Control` del proxy en las respuestas que renderiza una página.** Medido en `dev` sobre las seis
    rutas: las tres **redirecciones** salen con `private, no-store`, pero `/` y `/login` salen con
    `no-cache, must-revalidate`, que lo pone Next. **La cabecera sobrevive donde el proxy responde y se
    pierde donde responde una página.** Hoy no hay riesgo —en esas rutas no hay sesión ni `Set-Cookie`—,
    pero la corrección 14 existe para el caso contrario.
    → **Pendiente de medir, y no se da por sabido:** repetirlo en la Task 7 con **sesión real**, y con
    `next build` en vez de `dev`, porque las cabeceras de desarrollo no son las de producción. Si se
    confirma, la mitigación tiene que mudarse de sitio.

22. **Lo que el proxy deliberadamente NO hace, anotado para que no parezca un olvido:** no guarda la ruta
    que se pidió. Quien abre un enlace profundo a `/catalogo/...` sin sesión aterriza en `/login` y después
    va a donde diga `destino.ts`, no de vuelta. Es una carencia de comodidad, no de seguridad, y añadir un
    parámetro `next=` sin validarlo es una redirección abierta. Se decide en la Task 8, con el reparto
    delante.

**Verificado al cerrar la tarea:** `typecheck` y `lint` en verde, y las seis sondas HTTP contra el servidor
de desarrollo dando el resultado esperado **en los dos sentidos** —lo público pasa, lo no declarado
rebota—. El `404` de `/login` **es** el resultado correcto de este paso: significa que el proxy decidió
dejarlo pasar y todavía no hay pantalla que servir.

**De paso, un detalle de reproducibilidad que no bloquea nada:** `supabase` no está en las dependencias del
`package.json`, así que `npx` se descarga la CLI cada vez que no la encuentra en caché — y hoy trajo la
**2.112.0**, no la 2.111.0 que fija este plan. La versión de la CLI del proyecto no está fijada en ningún
sitio del repositorio.

---

> Escrito el 2026-08-06, **antes de ejecutar nada**. Sale de
> [`FASE_2_DISENO.md`](../FASE_2_DISENO.md) §7, §8 y §12, no de la imaginación.
> Al terminar, la cabecera de correcciones va **arriba de este párrafo**, fechada.

---

**Goal:** que una persona de la UPC pueda **entrar y salir**, y que el sistema sepa quién es sin
preguntárselo al navegador. Al final de la tanda existen `/login`, el canje del magic link,
`/completar-perfil` y el cierre de sesión; hay un administrador sembrado; **la puerta del dominio se
cierra antes de crear la cuenta**; y **P0-3 queda cerrado**: se acabaron los tokens firmados con la cadena
literal `'signature'`.

**Architecture:** tres capas que se tocan poco. **La de abajo** son los tres clientes de `@supabase/ssr`,
uno por contexto, y el `proxy.ts` que refresca la cookie. **La de en medio** es el canje del magic link,
que es un route handler y no una página. **La de arriba** son las dos únicas pantallas de la tanda,
`/login` y `/completar-perfil`. Van en ese orden porque cada capa se ve funcionar sin la de encima.

**Y una pieza que no es de ninguna capa:** el enganche que rechaza el registro cuando el correo no es de
la UPC. Es SQL, va primero, y se prueba sin que exista una sola pantalla.

**Tech Stack:** Next.js 16.3.0 (App Router) · TypeScript estricto · `@supabase/ssr` **0.12.4** ·
`@supabase/supabase-js` **2.112.2** · Supabase Auth (ES256) · PostgreSQL 17 · pgTAP · Supabase CLI 2.111.0

---

## Lo que cambió al empezar a escribir este plan

**Microsoft sale de la tanda.** Entrar con Microsoft exige registrar una aplicación en el tenant de
Microsoft Entra ID de la universidad, y la profesora que encargó el proyecto avisó que **es muy poco
probable que den ese acceso**. Se recomendó pedirlo igual; mientras tanto no se construye contra una
dependencia que no se controla.

**No se pierde el control de dominio, porque nunca dependió de Microsoft.** El filtro vive en la base
desde la Fase 1: `handle_new_auth_user` crea la fila de `alumnos` **solo si el correo termina en
`@upc.edu.pe`** *(D-9)*. Y el magic link es, para este caso, **más fuerte** que el SSO disponible: obliga
a abrir el correo en esa casilla, que es prueba directa de controlarla. Un Microsoft montado sobre un
tenant de pruebas dejaría entrar a cualquier cuenta del mundo y el filtro de dominio acabaría haciendo
todo el trabajo igual, con una pieza más y una dependencia externa de regalo.

**Y se cierra la puerta un paso antes** *(D-32, decidido el 2026-08-06)*. Hoy, quien entra con un correo
de fuera consigue sesión y ve una pantalla vacía: funciona, pero es raro de explicar y deja cuentas
inútiles en `auth.users`. Con el enganche **Before User Created** de Supabase Auth, ese registro se
rechaza con un mensaje claro y **no se crea ninguna cuenta**.

> **El costo, dicho antes de decidir y aceptado:** es la **migración 22**, y el proyecto tiene escrito en
> tres sitios que la base quedó cerrada en 21. La frase se corrige a propósito en el cierre de la tanda,
> no se deja mintiendo. *Verificado antes de proponerlo: el enganche está disponible en los planes Free y
> Pro.*

---

## Global Constraints

- **La autorización no se replica.** Ni una comprobación de permisos escrita en el cliente que decida
  algo. El proxy redirige, el layout es comodidad, y **quien decide es RLS** *(§2 del diseño)*. Si quitar
  una comprobación del cliente abriera un agujero, estaba en el sitio equivocado.
- **`lib/supabase/server.ts` exporta una FUNCIÓN, jamás una constante de módulo** *(D-24)*. Es el fallo
  más grave que esta fase puede introducir sin tocar una sola política: un singleton lleva dentro las
  cookies de una petición y termina sirviéndole a un alumno la sesión de otro.
- **`getClaims()` para decidir. `getSession()` nunca** *(D-25)*. `getSession()` lee la cookie sin
  revalidar: es **P0-3 otra vez con otro nombre**, y P0-3 es justo lo que esta tanda cierra.
- **No se ejecuta código entre `createServerClient(...)` y `getClaims()`** dentro del proxy. Lo dice la
  documentación de Supabase y produce cierres de sesión intermitentes, de lo más caro de diagnosticar. Va
  como comentario en el archivo, no solo en este plan.
- **La aplicación nunca usa `service_role`.** Si un flujo parece pedirla, falta una política, no una
  clave. Única excepción, y no es de la aplicación: la sentencia manual de la Task 9, en el editor SQL.
- **Una sola migración, y está decidida** *(D-32, Task 3)*. Cualquier otra necesidad de SQL significa que
  algo se entendió mal, y se registra como desvío **antes** de escribirla.
- **Ninguna pantalla de negocio.** Ni catálogo, ni panel, ni calendario. Eso es la tanda 2.
- Versiones **fijadas** y `package-lock.json` versionado, sin rangos abiertos para los paquetes de
  Supabase *(recomendación de seguridad de cadena de suministro de la propia Supabase)*.
- Mensajes de commit sin acentos. **Claude no toca el remoto:** `push`, PR y merge los ejecuta Alejandro.

---

## Correcciones al diseño, antes de empezar

Seis cosas de `FASE_2_DISENO.md` que no son ciertas, están incompletas, o no funcionarían. Se anotan aquí
para no descubrirlas a mitad de la ejecución.

### 1. **El `.env` sigue siendo el de Vite, y el diseño lo da por migrado**

§7.5 lista `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` como si existieran. El
archivo real tiene `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: **prefijo que Next.js no lee, y la
clave heredada en formato JWT que D-28 descarta.** Tampoco existe `.env.example`, aunque `.gitignore` ya
lo tiene exceptuado con `!.env.example` desde la tanda 0.

→ Es una tarea propia, y no un paso escondido dentro de otra.

### 2. **`/completar-perfil` dentro de `(alumno)/` es un bucle de redirección**

§5 coloca `completar-perfil/page.tsx` **dentro** del grupo `(alumno)`, y al mismo tiempo dice que
`(alumno)/layout.tsx` redirige a `/completar-perfil` cuando el perfil está incompleto. Quien entra con el
perfil incompleto pide `/completar-perfil`, el layout del grupo se ejecuta, ve el perfil incompleto y
redirige a `/completar-perfil`. **Otra vez, y otra.**

Y no se arregla exceptuando la ruta dentro del layout: **un layout de servidor no recibe la ruta actual.**
No hay `pathname` en un Server Component, y sacarlo de `headers()` obliga a que el proxy lo inyecte, que
es un apaño para sostener una estructura equivocada.

→ **`/completar-perfil` sale del grupo `(alumno)`** y vive en su propio grupo `(perfil)`, cuyo layout pide
sesión y fila en `alumnos` pero **no** exige el perfil completo. La regla general: **un layout no puede
redirigir a una ruta que él mismo cubre.**

### 3. **Un `INSERT 0 1` no prueba que esa persona haya entrado** *(§8-bis)*

El diseño dice: «Se comprueba el `INSERT 0 1`. Un `INSERT 0 0` significa que esa persona todavía no ha
entrado». **La fila de `auth.users` no aparece al entrar: aparece al PEDIR el magic link.** `signInWithOtp`
crea el usuario con `email_confirmed_at` en `NULL` antes de que nadie abra el correo.

→ La comprobación correcta lleva el estado del correo dentro:

```sql
select id, email, email_confirmed_at from auth.users where email = '<correo>@upc.edu.pe';
```

→ Si `email_confirmed_at` es `NULL`, esa persona pidió el enlace y no lo abrió. Sembrar un admin sobre esa
fila funcionaría, y sería un administrador que nadie ha demostrado ser.

**Consecuencia que va más allá de esa tarea:** el trigger `on_auth_user_created` dispara en el `INSERT`,
así que **la fila de `alumnos` también nace sin correo confirmado**. No es un agujero —sin abrir el correo
no hay sesión— pero significa que se pueden provocar filas en `alumnos` para direcciones ajenas pidiendo
magic links. **D-32 lo reduce, no lo elimina:** el enganche filtra los correos de fuera, y dentro del
dominio la superficie que queda son direcciones reales de la UPC, cuyos dueños recibirían el correo.
Queda anotado como pendiente para la T4.

### 4. **El diseño da por hecho el acceso al tenant de Entra ID, y no lo hay**

§8 describe el botón de Microsoft como si registrar la aplicación fuera un trámite. No lo es: depende del
tenant de la universidad, y ese acceso es poco probable.

→ **Microsoft sale de la tanda y queda como Q-16.** El diseño de §8 se conserva tal cual para cuando haya
tenant: no está mal, está bloqueado. Si algún día llega el acceso, se retoma con dos avisos ya medidos:
**Azure no admite `127.0.0.1` como URI de redirección** —exige `localhost`, y el `config.toml` local usa
hoy `127.0.0.1`, en `https` para un desarrollo que corre en `http`— y **Entra puede devolver dominios de
correo sin verificar** en aplicaciones de un solo tenant, lo que atravesaría la única puerta del sistema;
se cierra con la reclamación opcional `xms_edov` en el manifiesto.

### 5. **La regla de la casa dice `security definer`, y para este enganche Supabase dice que no**

El plan de la tanda 0 fijó como restricción global: *«Toda función nueva: `security definer set
search_path = ''`»*. La documentación de Auth Hooks **desaconseja explícitamente `security definer`** en
las funciones de enganche, por los privilegios que arrastra el rol `postgres`.

→ **La función de D-32 es `security invoker`** —el valor por defecto— **con `set search_path = ''` y todas
las referencias cualificadas con esquema.** El aislamiento no viene del `definer` sino de los privilegios:
`execute` solo para `supabase_auth_admin`, revocado a `authenticated`, `anon` y `public`. Es el mismo
razonamiento de la Fase 1 —*donde no se puede confiar en el `definer`, el aislamiento tiene que venir de
otro sitio*— aplicado al revés.

### 6. **El diseño dice «ninguna tanda vuelve a tocar SQL», y esta tanda toca SQL**

§12 y `CLAUDE.md` lo afirman en presente. D-32 lo desmiente a propósito, con la decisión tomada y anotada.

→ La frase se corrige en el cierre de la tanda, en los tres sitios donde está escrita. **No se deja
mintiendo y no se borra el original:** se anota como corrección fechada, igual que se hizo con D-31.

---

## Estructura de archivos

```
.gitattributes                     NUEVO — eol=lf (cierra Q-15)
.env                               MODIFICADO — NEXT_PUBLIC_*, clave publicable
.env.example                       NUEVO — mismas claves, sin valores
supabase/config.toml               MODIFICADO — [auth.hook.before_user_created]

supabase/migrations/
  <ts>_signup_domain_hook.sql      NUEVO — la migración 22 (D-32)
supabase/tests/
  30_signup_domain.sql             NUEVO — las aserciones del enganche

lib/supabase/
  client.ts                        NUEVO — createBrowserClient
  server.ts                        NUEVO — createServerClient + cookies() · FUNCIÓN
  proxy.ts                         NUEVO — updateSession(request)

proxy.ts                           NUEVO — raíz, al nivel de app/

app/
  (auth)/login/page.tsx            NUEVO — magic link (Microsoft: Q-16)
  auth/confirm/route.ts            NUEVO — verifyOtp del magic link
  auth/error/page.tsx              NUEVO — con motivo legible
  auth/signout/route.ts            NUEVO — POST
  (perfil)/layout.tsx              NUEVO — sesión + fila en alumnos
  (perfil)/completar-perfil/
    page.tsx                       NUEVO — nombre, apellido, carrera
    actions.ts                     NUEVO — Server Action del UPDATE
  (alumno)/layout.tsx              NUEVO — sesión + perfil COMPLETO
  page.tsx                         MODIFICADO — enlace a /login, nada más

lib/auth/destino.ts                NUEVO — la lectura única que reparte (§8)
```

**`app/auth/callback/route.ts` no se crea.** Es el canje de OAuth y no hay OAuth *(Q-16)*. Crear un route
handler que nadie puede alcanzar es superficie muerta.

---

## Puntos a verificar

Los seis se resuelven **midiendo**. Los dos desenlaces están escritos.

1. **¿`@supabase/ssr` 0.12.4 conserva la API de cookies `getAll`/`setAll`?** El diseño escribió
   `lib/supabase/server.ts` contra esa forma. Es una librería en `0.x`, que es donde las APIs se mueven.
   → Si la conserva, el código del diseño entra tal cual.
   → Si cambió, **manda la documentación de la versión instalada, no el diseño**, y el cambio se registra
   como corrección. Se comprueba leyendo los tipos de `node_modules/@supabase/ssr` antes de escribir nada.

2. **¿El enganche funciona con la función en el esquema `private`?** La documentación pone el ejemplo en
   `public`; el `config.toml` de la CLI 2.111.0 trae uno con el esquema `auth`, así que un esquema
   distinto de `public` claramente vale. Este proyecto ya aísla helpers en `private`, fuera de
   `api.schemas`, y ahí encaja mejor.
   → Si `supabase_auth_admin` puede ejecutarla con `grant usage on schema private`, se queda en `private`.
   → Si no, va a `public` con los `revoke` explícitos, que es exactamente lo que hace la documentación. En
   los dos casos la aserción de cobertura de `19_function_hardening.sql` tiene que seguir en verde.

3. **¿`getClaims()` verifica en local, como se midió?** El proyecto firmaba con ES256 el 2026-08-06 y por
   eso `getClaims()` no cuesta una llamada de red por petición. Una rotación de claves lo cambiaría sin
   avisar.
   → Se vuelve a consultar el JWKS antes de escribir el proxy. Si sigue en ES256, nada que hacer.
   → Si apareciera HS256, el proxy pasa a costar una ida y vuelta por petición: **no se cambia el código,
   se registra el coste** y se decide con datos si conviene mover la comprobación al layout.

4. **¿Basta el `matcher` del proxy, o hay que excluir más rutas?** El proxy debe correr en todo salvo
   estáticos e imágenes; si corriera sobre `/auth/confirm`, podría interferir con el canje.
   → Se prueba entrando con el enlace del correo. Si el canje funciona, el matcher se queda.
   → Si el canje falla o entra en bucle, se excluye `/auth/` del matcher y se anota por qué.

5. **¿El correo del magic link llega, y a dónde apunta?** En local lo captura Mailpit; en el proyecto
   remoto sale por el SMTP por defecto de Supabase, **que tiene un límite bajo de envíos por hora**.
   → Si llega y el enlace apunta a `/auth/confirm?token_hash=…&type=…`, el canje es el del plan.
   → Si el enlace apunta directamente a Supabase con un `redirect_to`, hay que ajustar la plantilla de
   correo del proyecto. Se comprueba **antes** de escribir la pantalla de login.

6. **¿El primer administrador queda sembrado y `staff_members` lo reconoce?** Es el único paso de la tanda
   que escribe en el proyecto real.
   → `INSERT 0 1` **y** `email_confirmed_at` no nulo *(corrección 3)*. Con las dos cosas, se comprueba
   además que la sesión de esa cuenta cae en `/admin/inventario` y no en `/catalogo`.
   → Si diera `INSERT 0 0`, esa persona no ha pedido nunca el enlace. No se fuerza la fila a mano.

---

## Task 0 · Lo que solo puede hacer Alejandro *(se entrega el día uno)*

- [ ] **Step 1:** Copiar la **clave publicable** del dashboard (`sb_publishable_…`). No es la `anon` en
      formato JWT, que sigue existiendo por compatibilidad *(D-28)*.
- [ ] **Step 2:** Añadir a la lista blanca de URL de redirección del proyecto: `http://localhost:3000/**`
      para desarrollo, y la de producción cuando exista.
- [ ] **Step 3:** Tras la Task 3, **activar el enganche en el dashboard** —Authentication → Hooks →
      *Before User Created*— apuntando a la función que crea la migración. En local lo activa el
      `config.toml`; en el proyecto real, esto.
- [ ] **Step 4:** Pedir formalmente el acceso al tenant de Entra ID, aunque sea poco probable. Que la
      respuesta quede por escrito es lo que convierte Q-16 en una decisión y no en un olvido.

---

## Task 1 · `.gitattributes` con `eol=lf` *(cierra Q-15)*

Va **sola y primera**, con su commit propio. `text=auto eol=lf` renormaliza archivos, y mezclar esa
diferencia con trabajo de verdad hace ilegible el único diff que importa.

**Files:** Create `.gitattributes`

- [ ] **Step 1:** Escribirlo, con `* text=auto eol=lf` y las excepciones binarias que ya existen —los
      cuatro `.xlsx` de D-8, `.ico`, `.png`, `.jpg`, `.webp`— marcadas como `binary`.
- [ ] **Step 2: Ver el efecto antes de commitear.** `git add --renormalize .` y luego
      `git status --short`. **Se anota cuántos archivos toca.** Si toca más de los esperados, se lee la
      lista antes de seguir; ahí es donde un `.gitattributes` demasiado amplio estropea un binario.
- [ ] **Step 3:** Comprobar que el paso que motivó Q-15 deja de mentir: regenerar los tipos en local y
      confirmar que `diff -u lib/database.types.ts` sale limpio en Windows, no solo en el runner.
- [ ] **Step 4:** Commit `Tanda 1.1: gitattributes con eol=lf (cierra Q-15)`.

> **Por qué ahora y no en la tanda 0:** porque entonces no había CI vivo que lo validara. Ahora sí.

---

## Task 2 · El entorno: prefijos nuevos y clave publicable *(D-28, corrección 1)*

**Files:** Modify `.env` · Create `.env.example`

- [ ] **Step 1: Reescribir `.env`.** `VITE_SUPABASE_URL` → `NEXT_PUBLIC_SUPABASE_URL`;
      `VITE_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con el valor de la Task 0. Las
      tres `VITE_CLOUDINARY_*` pasan a `NEXT_PUBLIC_CLOUDINARY_*`. **`CLOUDINARY_API_SECRET` y
      `CLOUDINARY_API_KEY` se quedan sin prefijo**, que es literalmente la corrección de P0-4: en Next.js
      cualquier `NEXT_PUBLIC_` viaja al navegador.
- [ ] **Step 2: Crear `.env.example`** con las mismas claves y sin un solo valor. Comprobar con
      `git check-ignore -v .env.example` que **no** está ignorado, y con `git status` que `.env` **sí** lo
      sigue estando. Las dos comprobaciones, no una.
- [ ] **Step 3:** `npm run build`. Tiene que seguir pasando: todavía nadie lee esas variables.
- [ ] **Step 4:** Commit `Tanda 1.2: el entorno pasa a NEXT_PUBLIC y clave publicable`.

---

## Task 3 · La puerta se cierra antes de crear la cuenta *(D-32 · migración 22)*

**Files:** Create `supabase/migrations/<ts>_signup_domain_hook.sql`, `supabase/tests/30_signup_domain.sql`
· Modify `supabase/config.toml`

**Interfaces:** la invoca **Supabase Auth**, no la aplicación. Ningún código de Next.js la llama.

- [ ] **Step 1: Escribir las aserciones que fallan.** La función no existe todavía, así que fallan por
      «does not exist», que es la forma correcta de empezar. Cuatro aserciones:
      - un correo `@upc.edu.pe` devuelve `'{}'::jsonb` —dejar pasar—;
      - un correo de fuera devuelve un objeto con `error`, y **se afirma el mensaje**, no solo que haya
        error: es lo que va a leer una persona confundida;
      - `MAYUSCULAS@UPC.EDU.PE` pasa, porque el trigger de la Fase 1 compara en minúsculas y **las dos
        puertas tienen que decir lo mismo**;
      - `alguien@notupc.edu.pe` **no** pasa. Es el caso que parece que se cuela y no se cuela, y sin
        aserción nadie sabe cuál de las dos cosas es.
- [ ] **Step 2: Verlas fallar.** `npx supabase test db`. Sin este paso no hay forma de saber si el arnés
      está corriendo *(lección de la tanda 0 de la Fase 1)*.
- [ ] **Step 3: La migración.** `(event jsonb) returns jsonb`, **`security invoker`** —no `definer`,
      corrección 5— con `set search_path = ''` y todo cualificado. El predicado es **el mismo** que el del
      trigger: `lower(...) like '%@upc.edu.pe'`. Copiarlo del archivo original, no reescribirlo de memoria:
      dos puertas que dicen casi lo mismo son peores que una.
- [ ] **Step 4: Los privilegios, que son el aislamiento entero.**
      `grant usage on schema <esquema> to supabase_auth_admin`,
      `grant execute on function ... to supabase_auth_admin`,
      `revoke execute on function ... from authenticated, anon, public`.
      **Recordar que `PUBLIC` recibe `EXECUTE` por defecto al crear una función:** sin el `revoke`, esto
      nace publicado en `/rest/v1/rpc/`.
- [ ] **Step 5: Activarlo en local**, con el bloque `[auth.hook.before_user_created]` del `config.toml`
      —viene comentado en el archivo que generó la CLI— y `supabase db reset`.
- [ ] **Step 6: Verlas pasar**, y comprobar que **`19_function_hardening.sql` sigue en verde**: ninguna
      función de `public` ejecutable por `anon`. Es la aserción que esta tarea puede romper sin querer.
- [ ] **Step 7:** Commit `Tanda 1.3: el registro exige correo UPC (D-32)`.

> **Lo que esta tarea NO hace:** quitar el trigger. Las dos capas se quedan. Un enganche se desactiva desde
> un formulario del dashboard; una política y un trigger, no. **La puerta de la base es la que manda, y la
> nueva es comodidad y buen mensaje de error.** Si algún día la contradicen, gana la de la base.

---

## Task 4 · Los tres clientes de `@supabase/ssr` *(D-24)*

**Files:** Create `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/proxy.ts` ·
Modify `package.json`

- [ ] **Step 0: Leer la API instalada antes de escribir** *(punto a verificar 1)*. Instalar
      `@supabase/ssr@0.12.4` y `@supabase/supabase-js@2.112.2` con versión exacta, y **leer los tipos de
      `node_modules/@supabase/ssr`** para confirmar que `createServerClient` sigue recibiendo
      `cookies: { getAll, setAll }`. Se anota lo que se lea, coincida o no con el diseño.
- [ ] **Step 1: `server.ts`.** El del diseño §7.1, tal cual, con dos cosas que no son adorno: es
      `export async function createClient()` —**función, no constante**— y el `catch` vacío del `setAll`
      lleva el comentario que explica por qué está vacío. Un `catch` vacío sin ese comentario es
      indistinguible de un descuido.
- [ ] **Step 2: `client.ts`.** `createBrowserClient<Database>` con las dos variables públicas.
- [ ] **Step 3: `proxy.ts` de `lib/`.** `updateSession(request)`: crea el cliente sobre
      `NextRequest`/`NextResponse`, llama a `getClaims()` **inmediatamente después**, y devuelve las
      cookies nuevas por los dos lados. El aviso de «no ejecutar nada en medio» va **en el archivo**.
- [ ] **Step 4:** Los tres tipados con `<Database>`. Sin el genérico, el tipado no llega al resultado de
      las consultas y D-26 no sirve de nada.
- [ ] **Step 5:** `npm run typecheck` y `npm run lint`. Commit `Tanda 1.4: los tres clientes de supabase/ssr`.

> **La revisión de esta tarea es una sola pregunta:** ¿hay alguna constante de módulo que guarde un
> cliente de servidor? Si la hay, la tanda introdujo su peor fallo posible y el CI no va a decirlo.

---

## Task 5 · `proxy.ts` en la raíz

**Files:** Create `proxy.ts`

- [ ] **Step 0: Volver a medir el JWKS** *(punto a verificar 3)*. Consultar
      `https://zqfkzgdyeqxzgzpxgadi.supabase.co/auth/v1/.well-known/jwks.json` y confirmar `"alg":
      "ES256"`. Anotar el resultado.
- [ ] **Step 1: El archivo se llama `proxy.ts` y va en la raíz**, al mismo nivel que `app/`. **No
      `middleware.ts`.** Verificado en `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`,
      que además confirma que se exporta como `proxy` con nombre o por defecto, y que el `matcher` va en
      `export const config`.
- [ ] **Step 2: Hace exactamente dos cosas:** refrescar la sesión y redirigir optimistamente. **Y lleva
      escrito en el archivo que no es una solución de autorización**, citando la documentación de Next.js,
      que lo dice con esas palabras: *«it should not be used as a full session management or authorization
      solution»*.
- [ ] **Step 3: El `matcher`** excluye estáticos, imágenes y el favicon.
- [ ] **Step 4: Verlo funcionar antes de que exista el login** *(punto a verificar 4)*: `npm run dev`,
      pedir una ruta privada sin sesión y comprobar la redirección a `/login`, que todavía dará 404.
      **Un 404 tras la redirección es el resultado correcto en este paso**: significa que el proxy decidió.
- [ ] **Step 5:** Commit `Tanda 1.5: proxy.ts refresca la sesion y redirige`.

---

## Task 6 · `/login` con magic link

**Files:** Create `app/(auth)/login/page.tsx` · Modify `app/page.tsx`

- [ ] **Step 0: Comprobar el correo antes de construir la pantalla** *(punto a verificar 5)*. Con el stack
      local levantado, disparar un `signInWithOtp` de prueba y mirar el correo en Mailpit: **a dónde
      apunta el enlace**. Todo el diseño del canje depende de eso.
- [ ] **Step 1:** `signInWithOtp({ email, options: { emailRedirectTo: <origen>/auth/confirm } })`.
- [ ] **Step 2: Probar el rechazo del enganche desde la pantalla**, con un correo de fuera. Tiene que
      salir el mensaje de D-32 y **no** crearse cuenta: comprobarlo consultando `auth.users`, no fiándose
      de lo que diga la pantalla.
- [ ] **Step 3: El filtro de dominio en el formulario es cortesía, no control.** Se puede avisar antes de
      enviar, y **el comentario del código tiene que decir que no es una comprobación de seguridad**: las
      de verdad son el enganche y el trigger, y ahí seguirán aunque alguien borre esta.
- [ ] **Step 4: Sin botón de Microsoft** *(Q-16)*. Nada de dejarlo puesto y deshabilitado: un botón que no
      funciona es una promesa que la pantalla no puede cumplir.
- [ ] **Step 5:** Enlace desde `/` a `/login`. Nada más en la landing: es la tarea 2.5.
- [ ] **Step 6:** Commit `Tanda 1.6: pantalla de login con magic link`.

---

## Task 7 · El canje, el error y la salida

**Files:** Create `app/auth/confirm/route.ts`, `app/auth/error/page.tsx`, `app/auth/signout/route.ts`

- [ ] **Step 1: `/auth/confirm`** — `verifyOtp({ type, token_hash })`, con el patrón de la documentación:
      **se construye la redirección limpiando `token_hash` y `type` de la URL**, para que el secreto no
      quede en el historial del navegador ni en el `Referer`.
- [ ] **Step 2: `/auth/error`** — con el motivo legible. Con D-32 en pie, el caso de «correo no
      institucional» debería ser inalcanzable desde el registro; **la página se escribe igual**, porque el
      enganche se desactiva desde un formulario y esta pantalla es la red de abajo.
- [ ] **Step 3: `/auth/signout`** — **POST, no GET.** Un `GET` que cierra sesión lo dispara cualquier
      precarga del navegador. `signOut()` y redirección a `/`.
- [ ] **Step 4: Probarlo de punta a punta en local**, con el correo de Mailpit. Entrar, ver la cookie,
      salir, ver que la cookie se fue.
- [ ] **Step 5:** Commit `Tanda 1.7: canje del magic link, error y salida`.

---

## Task 8 · El reparto y `/completar-perfil` *(corrección 2)*

**Files:** Create `lib/auth/destino.ts`, `app/(perfil)/layout.tsx`,
`app/(perfil)/completar-perfil/page.tsx`, `app/(perfil)/completar-perfil/actions.ts`,
`app/(alumno)/layout.tsx`

- [ ] **Step 1: `lib/auth/destino.ts`** — la lectura única de §8: admin → `/admin/inventario`, operador →
      `/mostrador`, alumno con perfil incompleto → `/completar-perfil`, alumno completo → `/catalogo`, sin
      fila en ninguna → `/auth/error`. **Una sola función.**
- [ ] **Step 2: `(perfil)/layout.tsx`** — sesión y fila en `alumnos`, **sin exigir el perfil completo**.
      Es lo que evita el bucle, y el motivo va escrito en el archivo: *un layout no puede redirigir a una
      ruta que él mismo cubre*.
- [ ] **Step 3: `(alumno)/layout.tsx`** — sesión, fila y **perfil completo**. Este sí redirige a
      `/completar-perfil`, que ya no está debajo suyo.
- [ ] **Step 4: El formulario** escribe `nombre`, `apellido` y `carrera_id` por Server Action. **No lleva
      ninguna comprobación de que nadie toque `activo` ni `banned_until`:** son las tres únicas columnas
      con `GRANT UPDATE` para `authenticated`, así que la sentencia ni se planificaría. Escribir esa
      validación sería replicar la autorización, que es lo que §2 prohíbe.
- [ ] **Step 5: Verlo fallar antes de verlo pasar.** Pedir `/catalogo` con el perfil incompleto y
      comprobar que rebota; completarlo y comprobar que ya no. **Y pedir `/completar-perfil` con el perfil
      incompleto: si eso entra en bucle, la corrección 2 se aplicó mal.**
- [ ] **Step 6:** Commit `Tanda 1.8: reparto por perfil y completar-perfil`.

---

## Task 9 · Sembrar el primer administrador *(tarea 2.4-bis, punto a verificar 6)*

**Va al final.** Requiere que el flujo funcione y que la persona haya entrado **de verdad**.

- [ ] **Step 1:** Alejandro entra una vez con su cuenta `@upc.edu.pe` por el flujo recién construido.
- [ ] **Step 2: Comprobar que el correo está confirmado** *(corrección 3)*, no solo que la fila existe:

```sql
select id, email, email_confirmed_at from auth.users where email = '<correo>@upc.edu.pe';
```

- [ ] **Step 3: Sembrar**, en el editor SQL del dashboard:

```sql
insert into public.staff_members (user_id, role)
select id, 'admin' from auth.users where email = '<correo>@upc.edu.pe';
```

- [ ] **Step 4: Comprobar el efecto, no el mensaje.** `INSERT 0 1`, y después **volver a entrar y ver que
      la sesión cae en `/admin/inventario`**. Que la fila exista no prueba que el reparto la lea.
- [ ] **Step 5:** Sin commit: no toca el repositorio. Se registra en la bitácora.

---

## Task 10 · Cierre

- [ ] **Step 1:** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, y
      `npx supabase test db`. Los cinco en verde **antes** de tocar la documentación.
- [ ] **Step 2: Corregir la frase de «la base quedó cerrada en 21 migraciones»** en los tres sitios donde
      está escrita —`CLAUDE.md`, `ESTADO_Y_PLAN.md` y `FASE_2_DISENO.md` §12—, **como corrección fechada y
      sin borrar el original** *(corrección 6)*. Son 22, y la 22 tiene nombre y motivo.
- [ ] **Step 3:** Actualizar el registro: **P0-3 cerrado**, **Q-15 cerrado**, **D-32 registrada**, **Q-16
      abierta** (Microsoft, bloqueado por el tenant).
- [ ] **Step 4:** Cerrar las ediciones de documentación **antes** de pasar comandos de git, nunca después.
- [ ] **Step 5:** Commit de cierre, PR contra `develop`, **y esperar al CI antes de escribir su
      resultado.** Es la lección de la tanda 0: un resultado se registra cuando se mide.

---

## Autorrevisión

Seis preguntas que se contestan releyendo el diff, no la memoria.

1. **¿Hay una constante de módulo con un cliente de servidor dentro?** Es el fallo más grave que la fase
   puede introducir sin tocar una política, y ninguna herramienta lo detecta.
2. **¿Aparece `getSession()` en algún sitio donde se decida algo?** Si sí, P0-3 sigue vivo con otro
   nombre, en la tanda que existe para cerrarlo.
3. **¿Hay alguna comprobación de permisos en el cliente que no sea puramente visual?** Si quitarla abriera
   un agujero, estaba en el sitio equivocado.
4. **¿Se ejecuta algo entre `createServerClient` y `getClaims()` en el proxy?** Produce cierres de sesión
   intermitentes, y el síntoma no apunta nunca a la causa.
5. **¿Queda algún `NEXT_PUBLIC_` delante de un secreto?** Es P0-4 con otro prefijo, y ya pasó una vez con
   `VITE_`.
6. **¿El enganche y el trigger dicen exactamente lo mismo?** Dos puertas que casi coinciden son peores que
   una: el hueco entre ellas es el que nadie prueba.

---

## Riesgos de esta tanda

| Riesgo | Mitigación |
|---|---|
| **`@supabase/ssr` está en `0.x`** y el diseño se escribió contra una forma de su API | Punto a verificar 1: se leen los tipos instalados antes de escribir. Versión fijada exacta y lockfile versionado |
| **El enganche se desactiva desde un formulario del dashboard** y nadie se entera | Por eso **el trigger se queda**. La puerta de la base no la apaga un clic *(Task 3)* |
| **El bucle de `/completar-perfil`** | Corrección 2, resuelta por estructura. El Step 5 de la Task 8 lo comprueba explícitamente |
| **La migración 22 contradice una promesa escrita en tres documentos** | Se corrige en el cierre, fechada y sin borrar el original *(corrección 6)*. Que sea una decisión registrada, no un descuido |
| **El SMTP por defecto de Supabase tiene un límite bajo de envíos**, y ahora el magic link es la única puerta | En local, Mailpit. En el proyecto real se prueba con pocos correos. **Si la T2 necesita más, hace falta SMTP propio**, y conviene saberlo antes de que lo descubra una demostración |
| **Las filas de `alumnos` nacen sin correo confirmado** *(corrección 3)* | D-32 reduce la superficie a direcciones UPC reales. El resto se anota como pendiente de la T4: arreglarlo del todo tocaría el trigger |
| **Microsoft queda fuera y puede volver** | Q-16, con los dos avisos ya medidos —`localhost` y `xms_edov`— para que retomarlo no empiece de cero |
