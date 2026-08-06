# Fase 2 — Diseño de la aplicación Next.js

> Documento de diseño, escrito el **2026-08-06**. Describe *cómo* se construye la aplicación de la Fase 2.
> El estado y el avance viven en [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md); las reglas de negocio, en
> [`ESPECIFICACION_FUNCIONAL.md`](./ESPECIFICACION_FUNCIONAL.md); el esquema sobre el que se construye, en
> [`FASE_1_DISENO.md`](./FASE_1_DISENO.md).
>
> Se implementa en **cinco tandas, una por perfil**, cada una con su PR y sus pruebas *(D-27)*.

---

## 1. Qué resuelve

| Defecto / pendiente | Cómo se cierra |
|---|---|
| **P0-3** · tokens de sesión firmados con la cadena literal `'signature'` | Desaparece la sesión propia. La lleva Supabase Auth en cookies, y la firma se **verifica** con `getClaims()` *(D-25)* |
| **P0-2** · el `if (isAdmin)` que quedaba en el cliente | El cliente deja de decidir. Oculta por comodidad; quien autoriza es RLS *(§2)* |
| **P0-4** · el secreto de Cloudinary | La subida se firma en un route handler; el secreto nunca sale del servidor *(tanda 3)* |
| **P1-8** · `Number()` sobre un UUID rompe el flujo de reserva | El código donde vive se borra en el primer commit *(D-6)* |
| **Q-10** · 15 vulnerabilidades de dependencias | Casi todas son `devDependencies` de Vite. El árbol se reemplaza entero; la auditoría pasa a bloqueante en la tanda 4 |
| **Q-11** · `min_duration_minutes` = 15 contra `slot_minutes` = 30 | *(D-19)*: la duración tiene que ser **múltiplo del bloque** |
| **Q-12** · cinco documentos de la raíz que describen una arquitectura muerta | Se van con el código Vite, en el mismo commit *(D-6)* |
| **Q-13** · 22 avisos de rendimiento prematuros | Se revisan en la tanda 4, con tráfico real y no antes |
| **D-18** · «sin sesión, sin stock» dejaba abierto qué hace la landing | *(D-21)*: la landing muestra catálogo, no disponibilidad. Cero cambios en la base |

**Lo que la Fase 2 *no* resuelve, y conviene decirlo:** la autorización. Ya está resuelta. Esta fase
consume un esquema que decide por sí solo quién puede leer y escribir qué, y su trabajo es **no
estropearlo**.

---

## 2. Principio rector: la aplicación no autoriza, muestra

La Fase 1 dejó la autorización dentro del motor: `staff_members` + RLS + privilegios por columna, y una
sola puerta de escritura para las reservas. La consecuencia directa para esta fase es que **ningún control
del cliente es un control**.

Eso no significa que no haya controles en el cliente. Significa que están para otra cosa:

| Nivel | Qué hace | Qué pasa si falla |
|---|---|---|
| **`proxy.ts`** | Redirección optimista: sin cookie de sesión, a `/login`. Y refresca el token | El usuario llega a una página que no le sirve |
| **Layout del grupo de rutas** | Lee los claims, redirige si el perfil no encaja. Comodidad | El usuario ve una pantalla vacía |
| **El componente** | Oculta el botón que no aplica | El usuario ve un botón que no funciona |
| **RLS y los `GRANT`** | **Decide.** Cero filas, `42501`, o la excepción de la RPC | Nada. Es el fondo |

> **Regla:** si quitar una comprobación del cliente abre un agujero, la comprobación estaba en el sitio
> equivocado. La prueba mental es: *un `curl` con la clave publicable y una cookie válida, ¿qué consigue?*
> La respuesta tiene que ser la misma con la interfaz y sin ella.

Esto no es una interpretación forzada del framework: la documentación de Next.js dice lo mismo del proxy
—«no está pensado para ser una solución completa de sesión o autorización», solo chequeos optimistas—.
Y hay una trampa concreta del App Router que lo refuerza: **un layout no se vuelve a ejecutar al navegar
entre rutas hermanas del mismo grupo**, así que una comprobación puesta solo ahí se salta sola. Aquí da
igual, porque el cerco es RLS. Se anota para que nadie la «mejore» hasta convertirla en el cerco.

**Corolario que vale como prueba de humo del diseño:** la aplicación **nunca usa `service_role`**. Está
verificado que no le hace falta —el admin lee todos los `alumnos` por `alumnos_select_staff`, y escribe
`staff_members` por `staff_admin_all`—. Si en algún momento un flujo necesita esa clave, no es que falte
una clave: es que falta una política.

---

## 3. Decisiones nuevas

| ID | Decisión | Fecha |
|---|---|---|
| D-19 | **La duración de una reserva tiene que ser múltiplo de `slot_minutes`**, con mínimo un bloque. `min_duration_minutes` pasa de 15 a 30 y `create_reservation` gana una validación. *Cierra Q-11* | 2026-08-06 |
| D-20 | **`available_slots(...)`: la rejilla del día en una sola llamada**, en vez de 28 llamadas a `available_units`. No es solo velocidad: 28 llamadas son 28 fotos distintas de la base | 2026-08-06 |
| D-21 | **La landing muestra catálogo, no disponibilidad.** `/` es una vitrina pública sin stock; `/catalogo`, con sus filtros por sede, exige sesión. Cierra lo que D-18 dejó abierto, sin tocar la base | 2026-08-06 |
| D-22 | **App Router con grupos de rutas por perfil**, y el layout del grupo como comodidad, no como cerco *(§2)*. El archivo de proxy se llama `proxy.ts`, no `middleware.ts`: Next.js 16 lo renombró | 2026-08-06 |
| D-23 | **Los tokens de diseño se copian tal cual a `app/globals.css`; las fuentes pasan a `next/font`.** Se cae el `@import` de Google Fonts: es una petición bloqueante a un tercero y obligaría a abrirle la CSP de la tanda 4 | 2026-08-06 |
| D-24 | **Tres clientes de `@supabase/ssr`, y ninguno compartido entre peticiones.** Navegador, servidor y proxy. Un cliente de servidor a nivel de módulo filtraría la sesión de un usuario a otro | 2026-08-06 |
| D-25 | **`getClaims()` para proteger; `getSession()` nunca para decidir.** Medido: el proyecto firma con **ES256**, así que `getClaims()` verifica la firma en local y no cuesta una llamada de red | 2026-08-06 |
| D-26 | **Los tipos salen de `supabase gen types`, y el CI comprueba que no estén desactualizados.** Un tipo viejo no rompe la compilación: miente en silencio | 2026-08-06 |
| D-27 | **Cinco tandas, una por perfil**, un PR cada una. En la Fase 1 cada tanda dejaba una propiedad verificable del motor; aquí, un perfil que puede hacer su trabajo entero | 2026-08-06 |
| D-28 | **Clave publicable `sb_publishable_…`, no la `anon` heredada.** Rotación independiente y es lo que Supabase recomienda para clientes públicos | 2026-08-06 |

---

## 4. Lo primero es borrar

El primer commit de la tanda 0 **elimina el código Vite** *(D-6)*. Sin carpeta `legacy/`: el historial ya
es el archivo, y una carpeta muerta obliga a excluirla de lint, typecheck y CI, y vuelve ambiguo qué
código está vivo.

```
src/  index.html  vite.config.ts  vitest.config.ts  eslint.config.js
tsconfig.app.json  tsconfig.node.json  netlify.toml  components.json
dist/  server/  bun.lockb
```

> **`public/` NO está en esa lista, y es la trampa de este commit.** Parece andamiaje y no lo es: contiene
> `Campus.png`, `campus-san-miguel.webp`, `favicon.png`, `placeholder.svg` y `robots.txt` — las fotos de
> las dos sedes y el favicon, que son **contenido**. Y Next.js usa `public/` para estáticos exactamente
> igual que Vite, así que ni siquiera hay que moverla. Se queda tal cual.

Y con ellos, **los cinco documentos de la raíz que Q-12 dejó abiertos** —`DELIVERABLES.md`,
`MIGRATION_GUIDE.md`, `README_REFACTORING.md`, `SUPABASE_RPC_CHEATSHEET.md`, `SUPABASE_RPC_GUIDE.md`—
más `API_EXAMPLES.md`, `BACKEND_SETUP.md`, `FRONTEND_INTEGRATION.md` y
`scripts/generate_inventory_seed.py`. Todos documentan RPCs que nunca existieron en el proyecto canónico
y enlazan a los `.sql` que borró la tanda 3. **Q-12 se cierra aquí**, sin trabajo propio: es una línea más
del mismo `git rm`.

**Lo que se queda:** `supabase/` entero, `MIGRATION_DOCS/`, `CLAUDE.md`, los cuatro Excel *(D-8)*,
`public/` con sus estáticos, `.github/workflows/db.yml` sin tocar, y `README.md`, que se reescribe.

**Lo que se copia antes de borrar:** `src/index.css` y `tailwind.config.ts`. Son las ~230 líneas del
lenguaje visual, lo único del código Vite que la Fase 2 conserva *(§6)*.

> **Recuperación, si alguna vez hace falta:** `git show legacy/vite-final:<ruta>`.

---

## 5. Estructura del App Router *(D-22)*

```
app/
  layout.tsx                       raíz: fuentes, tokens, <html lang="es">
  page.tsx                         landing — vitrina sin stock (D-21)
  faq/page.tsx
  not-found.tsx

  (auth)/
    login/page.tsx                 magic link + Microsoft
  auth/
    confirm/route.ts               canjea el token del magic link
    callback/route.ts              canjea el `code` de OAuth (PKCE)
    error/page.tsx
    signout/route.ts               POST

  (alumno)/
    layout.tsx                     sesión + fila en `alumnos`; si falta perfil → /completar-perfil
    completar-perfil/page.tsx      nombre, apellido, carrera (D-9)
    catalogo/page.tsx
    catalogo/[id]/page.tsx
    catalogo/[id]/reservar/page.tsx
    mi-panel/page.tsx

  (personal)/
    layout.tsx                     fila en `staff_members`
    mostrador/page.tsx             operador y admin (D-16)
    admin/
      layout.tsx                   role = 'admin'
      inventario/page.tsx
      reservas/page.tsx
      dias/page.tsx
      estadisticas/page.tsx
      personal/page.tsx

  api/
    cloudinary/firma/route.ts      firma la subida; el secreto no sale de aquí

lib/
  supabase/client.ts               createBrowserClient
  supabase/server.ts               createServerClient (cookies de next/headers)
  supabase/proxy.ts                updateSession
  database.types.ts                generado, versionado (D-26)

components/
  ui/                              shadcn, regenerado nativo — no portado
  ...

proxy.ts                           en la raíz, al mismo nivel que app/
```

**Por qué grupos de rutas y no carpetas de verdad.** `(alumno)`, `(personal)` y `(auth)` no aparecen en la
URL: `/catalogo` sigue siendo `/catalogo`. Lo que aportan es **un layout por perfil**, que es el sitio
natural para leer los claims una vez y redirigir. Las URL se conservan tal como las tiene hoy la
especificación funcional, que es lo que la gente ya conoce.

**Dos cambios de ruta respecto del sistema actual:**

- **`/register` desaparece** *(D-9)*. No hay registro previo: quien entra con un correo `@upc.edu.pe`
  obtiene su fila en `alumnos` por trigger, y completa el perfil en `/completar-perfil`.
- **`/admin` deja de ser una pantalla de seis pestañas** y se abre en cinco rutas. Una pestaña que no es
  una URL no se puede enlazar, ni marcar, ni proteger por separado. `/admin/unidades` se absorbe en
  `/admin/inventario`.

---

## 6. Tokens de diseño *(D-23)*

**Se copian tal cual** los bloques `:root` y `.dark` de `src/index.css` a `app/globals.css`: la paleta UPC
en HSL, el radio, las sombras y los gradientes. Son variables CSS; no dependen de Vite ni de la versión de
Tailwind. Igual las utilidades `.text-gradient-upc`, `.bg-gradient-upc` y `.bg-gradient-hero`.

**Lo que no se copia es la línea 1**, el `@import url('https://fonts.googleapis.com/…')`. Dos motivos, y
el segundo es el que decide:

1. Es una petición bloqueante a un tercero en el camino crítico del primer render.
2. **Choca de frente con la CSP de la tanda 4.** Mantenerla obliga a abrir `fonts.googleapis.com` en
   `style-src` y `fonts.gstatic.com` en `font-src`, es decir, a debilitar la política por comodidad.

En su lugar, `next/font/google` con `Montserrat` y `Playfair_Display`: descarga las fuentes en el build y
las sirve desde el propio dominio, con `display: 'swap'` y sin capa de terceros. Expone variables CSS que
se enganchan en la configuración de Tailwind, y se cae el `font-family: 'Montserrat'` literal del `body`.

**Sobre Tailwind.** Se va a la 4, no a la 3.4 del proyecto Vite. Es lo que producen hoy `create-next-app`
y `shadcn init`, y arrancar una reconstrucción en la versión anterior para ahorrarse una traducción de
~100 líneas es exactamente la clase de deuda que este proyecto lleva tres fases pagando. Los tokens de
color no se ven afectados —siguen siendo variables CSS—; lo que se traduce es el `theme.extend` del
`tailwind.config.ts` a un bloque `@theme` en el CSS, una vez.

> **Punto a verificar de la tanda 0.** Si la combinación Tailwind 4 + shadcn + Next.js 16 da guerra, el
> desenlace alternativo es Tailwind 3.4 con el `tailwind.config.ts` copiado tal cual, que es el camino
> conocido. Se decide **midiendo en la tanda 0**, que no construye pantallas y por tanto no arrastra
> trabajo si hay que dar marcha atrás.

Los componentes de shadcn **se regeneran**, no se portan: los 3.954 líneas del proyecto Vite son salida de
un generador, y regenerarlos contra la versión nueva sale más barato y más limpio que migrarlos.

---

## 7. Conexión con Supabase *(D-24, D-25, D-26, D-28)*

### 7.1 Tres clientes, uno por contexto

| Archivo | Función | Dónde se usa |
|---|---|---|
| `lib/supabase/client.ts` | `createBrowserClient` | Solo en Client Components |
| `lib/supabase/server.ts` | `createServerClient` con `cookies()` de `next/headers` | Server Components, Server Actions, route handlers |
| `lib/supabase/proxy.ts` | `createServerClient` sobre `NextRequest`/`NextResponse` | Solo desde `proxy.ts` |

```ts
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Un Server Component no puede escribir cookies. Lo hace el proxy.
          }
        },
      },
    },
  )
}
```

> **La regla que no se puede relajar:** es una **función**, no una constante de módulo. El cliente de
> servidor lleva dentro las cookies de *una* petición. Un singleton en el ámbito del módulo se comparte
> entre peticiones concurrentes y termina sirviéndole a un alumno la sesión de otro. Es el error que
> convierte un modelo de autorización correcto en una fuga, sin tocar una sola política.

### 7.2 `proxy.ts`, y por qué no se llama `middleware.ts`

**Next.js 16 renombró Middleware a Proxy** (verificado contra la documentación de la 16.3.0: «Starting
with Next.js 16, Middleware is now called Proxy»). Misma funcionalidad, archivo `proxy.ts` en la raíz, al
mismo nivel que `app/`.

Hace exactamente dos cosas:

1. **Refresca el token de Auth** llamando a `supabase.auth.getClaims()` y devolviendo las cookies nuevas
   tanto a los Server Components (`request.cookies.set`) como al navegador (`response.cookies.set`). Sin
   esto los usuarios se desloguean solos y al azar, porque un Server Component no puede escribir cookies.
2. **Redirige a `/login`** cuando no hay sesión y la ruta es privada. Optimista, y nada más *(§2)*.

> **Una advertencia literal de la documentación de Supabase, que vale la pena copiar al código:** *no
> ejecutar código entre `createServerClient` y `getClaims()`*. Un cambio inocente ahí produce cierres de
> sesión intermitentes, que es de los fallos más caros de diagnosticar.

### 7.3 `getClaims`, `getUser`, `getSession`

| Método | Qué hace | Cuándo |
|---|---|---|
| **`getClaims()`** | Lee el token y **verifica la firma** | Siempre que haya que proteger algo |
| `getUser()` | Llamada de red a Auth por el registro fresco del usuario | Solo si hace falta el dato al día |
| `getSession()` | Lee la cookie **sin revalidar** | Solo para reenviar el token a otro servicio. **Nunca para decidir** |

**Medido el 2026-08-06, y cambia el coste del diseño entero:** el proyecto `zqfkzgdyeqxzgzpxgadi` firma
sus JWT con **ES256** (curva elíptica) — verificado contra
`https://zqfkzgdyeqxzgzpxgadi.supabase.co/auth/v1/.well-known/jwks.json`, que devuelve una clave con
`"alg": "ES256"`, `"kty": "EC"`. Con firma asimétrica, `getClaims()` verifica **en local** con WebCrypto
contra el JWKS cacheado. Si el proyecto firmara con HS256, la misma llamada sería una ida y vuelta al
servidor de Auth **en cada petición** que pase por el proxy.

> **`getSession()` es P0-3 otra vez, con otro nombre.** El defecto crítico que esta fase cierra es
> literalmente «verificación sin validar firma». Confiar en el objeto `user` que devuelve `getSession()`
> reintroduce el mismo error, en un sistema distinto y con la misma consecuencia: la cookie la escribe
> quien quiera.

### 7.4 Tipos generados *(D-26)*

```powershell
npx supabase gen types typescript --local > lib/database.types.ts
```

Versionado, nunca escrito a mano, y aplicado como parámetro genérico en los tres clientes
(`createServerClient<Database>`), que es lo que hace que el tipado llegue hasta el resultado de cada
consulta.

**Y un paso nuevo en el CI**, en `db.yml`, que ya levanta el stack: regenerar y comparar contra el archivo
versionado; si difieren, falla. Motivo: **un tipo desactualizado no rompe la compilación.** Da un `any`
silencioso o, peor, un campo que el editor autocompleta y la base no tiene. Es el mismo modo de fallo
—efecto silencioso en vez de excepción— contra el que se escribió media batería de la Fase 1.

> **Punto a verificar de la tanda 0.** `db.yml` arranca con la lista de servicios recortada. Hay que
> comprobar si `gen types --local` funciona con ese recorte o necesita alguno de los excluidos. Los dos
> desenlaces: si funciona, el paso va en `db.yml`; si no, va en `ci.yml` con su propio stack, o se le
> devuelve el servicio que pida. No se resuelve suponiendo.

### 7.5 Claves *(D-28)*

| Variable | Valor | Dónde |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zqfkzgdyeqxzgzpxgadi.supabase.co` | Navegador y servidor |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` | Navegador y servidor |
| `CLOUDINARY_API_SECRET` | — | **Solo servidor.** Sin prefijo `NEXT_PUBLIC_` *(P0-4)* |

Se usa la clave **publicable** (`sb_publishable_…`), no la `anon` heredada en formato JWT, que sigue
existiendo en el proyecto por compatibilidad. La publicable se rota por su cuenta sin invalidar nada más.

> En Next.js **cualquier variable con prefijo `NEXT_PUBLIC_` viaja al navegador**. Es la misma trampa que
> P0-4 con el prefijo `VITE_`, con otro prefijo. Que el secreto de Cloudinary no lo lleve no es un detalle
> de estilo: es la corrección.

---

## 8. Flujo de autenticación *(tanda 1)*

D-9 en la práctica: **autenticación primero, perfil después.** No hay formulario de registro.

```
  /login
    ├─ magic link  → signInWithOtp({ emailRedirectTo: …/auth/confirm })
    │                  correo → /auth/confirm?token_hash=…&type=email
    │                  verifyOtp → cookies de sesión → redirección
    │
    └─ Microsoft   → signInWithOAuth({ provider: 'azure', redirectTo: …/auth/callback })
                       vuelta con ?code=… (PKCE)
                       exchangeCodeForSession → cookies de sesión → redirección
```

**Lo que pasa por debajo, y ya está construido:** al crearse la fila en `auth.users`, el trigger
`handle_new_auth_user` crea la fila en `alumnos` **si y solo si** el correo termina en `@upc.edu.pe`. El
dominio es la única puerta *(D-9 dejó BR-02 sin efecto)*. Un correo de fuera consigue sesión pero no tiene
fila en `alumnos`, así que no ve nada y no puede reservar: **lo cierra la ausencia de datos, no una
comprobación**.

**Después del canje, la redirección se decide con una sola lectura:**

| Estado | Destino |
|---|---|
| Fila en `staff_members` con `role = 'admin'` | `/admin/inventario` |
| Fila en `staff_members` con `role = 'operator'` | `/mostrador` |
| Fila en `alumnos` con `nombre`, `apellido` o `carrera_id` en `NULL` | `/completar-perfil` |
| Fila en `alumnos` completa | `/catalogo` |
| Sin fila en ninguna | `/auth/error`, con el motivo: el correo no es institucional |

`/completar-perfil` escribe solo `nombre`, `apellido` y `carrera_id`, que son **las tres únicas columnas de
`alumnos` con `GRANT UPDATE` para `authenticated`**. No hace falta validar en el formulario que nadie toque
`banned_until` ni `activo`: la sentencia no se planificaría.

### 8-bis · Sembrar el primer miembro del personal *(tarea 2.4-bis)*

Va **después** de que el flujo de arriba funcione y de que esa persona haya entrado una vez con su cuenta
UPC. Antes, `auth.users` está vacío y el `insert … select` no encuentra a nadie e inserta **cero filas sin
dar error** — el mismo modo de fallo silencioso que la Fase 1 persiguió durante cuatro tandas.

Una sentencia puntual, en el editor SQL del proyecto, con la sesión de `service_role` del dashboard:

```sql
insert into public.staff_members (user_id, role)
select id, 'admin' from auth.users where email = '<correo>@upc.edu.pe';
```

**Se comprueba el `INSERT 0 1`.** Un `INSERT 0 0` significa que esa persona todavía no ha entrado.

---

## 9. Inventario de rutas por perfil

| Ruta | Pantalla | Perfil | De dónde salen los datos |
|---|---|---|---|
| `/` | Landing con vitrina | **Público** | `products`, `product_images`. **Sin stock** *(D-21)* |
| `/faq` | Preguntas frecuentes | **Público** | Estático |
| `/login` | Ingreso | **Público** | — |
| `/auth/confirm` · `/auth/callback` | Canje de token y de `code` | **Público** | — |
| `/auth/error` | Motivo del rechazo | **Público** | — |
| `/auth/signout` | Cierre de sesión (POST) | Con sesión | — |
| `/completar-perfil` | Nombre, apellido, carrera | **Alumno** sin perfil | `carreras` · `update alumnos` |
| `/catalogo` | Catálogo con filtros y sede | **Alumno** | `products`, `product_availability`, `campuses` |
| `/catalogo/[id]` | Detalle del producto | **Alumno** | `products`, `product_images`, `inventory_units` |
| `/catalogo/[id]/reservar` | Calendario y reserva | **Alumno** | `app_settings`, `disabled_days`, `available_slots` → `create_reservation` |
| `/mi-panel` | Reservas, historial, encuesta | **Alumno** | `inventory_reservations` propias, `final_satisfaction_surveys` |
| `/mostrador` | Entregar, recibir, no-retirado, no-devuelto | **Operador y admin** *(D-16)* | Reservas + `alumnos` con reserva viva · `inventory_unit_notes` |
| `/admin/inventario` | Productos, unidades e imágenes | **Admin** | Catálogo completo + `/api/cloudinary/firma` |
| `/admin/reservas` | Tabla completa con filtros | **Admin** | `inventory_reservations` · `cancel_reservation` |
| `/admin/dias` | Días inhabilitados | **Admin** | `disabled_days` |
| `/admin/estadisticas` | Cinco indicadores y desgloses | **Admin** | Agregados sobre reservas |
| `/admin/personal` | Alta y baja de personal | **Admin** | `staff_members` |

**Tres cosas que esta tabla dice y conviene leer despacio:**

1. **El operador no tiene ninguna ruta propia bajo `/admin`.** Es D-11 hecho URL: estrictamente operativo,
   sin estadísticas, sin inventario. Y no es una decisión del router — `is_admin()` lo bloquea en la base
   aunque escriba la URL a mano.
2. **`/mostrador` puede leer nombre y correo del alumno**, pero solo de quien tiene una reserva viva. Lo
   impone `alumnos_select_staff` con el helper `private.tiene_reserva_viva()`, no un `select` cuidadoso.
3. **La landing y `/catalogo` muestran cosas distintas a propósito** *(D-21, §10)*.

---

## 10. La landing y el catálogo *(D-21)*

D-18 dejó una pregunta para esta fase: si la landing necesita disponibilidad, hay que decidirlo antes de
escribir el catálogo. **No la necesita.**

Lo que un visitante anónimo puede leer hoy, verificado contra las políticas vigentes:

| Puede | No puede |
|---|---|
| `products`, `product_images`, `campuses`, `carreras` | `inventory_units` — sin política para `anon` |
| | `product_availability` — `SELECT` revocado *(D-18)* |
| | `available_units` / `available_slots` — `EXECUTE` revocado |

De ahí sale el reparto, sin tocar una línea de SQL:

- **`/` es una vitrina.** Muestra qué equipos existen —nombre, imagen, descripción, categoría— y qué es el
  servicio. No promete disponibilidad porque no la sabe.
- **`/catalogo` exige sesión.** Sus filtros son por sede y «solo productos con stock aquí» *(BR-14)*, y eso
  necesita `product_availability`. Un catálogo que filtra por un stock que no puede leer no es un catálogo
  incompleto: **es uno que miente**, que es justo lo que D-18 midió y descartó.

La frontera queda donde tiene que estar: la vitrina es promoción, el catálogo es una herramienta de
decisión, y una herramienta de decisión sin datos es peor que ninguna.

---

## 11. El calendario, que es la pantalla difícil

Es la única pantalla que se pinta a partir de una regla del motor, y por tanto la única que puede
contradecirlo. Todo lo de esta sección existe para que **lo que el calendario ofrece sea exactamente lo
que `create_reservation` acepta**.

### 11.1 D-19 · La duración es múltiplo del bloque *(cierra Q-11)*

El problema real no es el que describe Q-11. La RPC valida que el **inicio** caiga en un bloque
(`create_reservation`, paso 6), pero no la duración; y con `buffer_minutes = 120`, una reserva de 10:00 a
10:15 no bloquea hasta las 10:30 sino **hasta las 12:15**. Lo que desalinea la rejilla es
`duración + buffer`, no la duración sola. El hueco perdido está al final del bloqueo, no al final de la
reserva.

Y subir `min_duration_minutes` a 30 **no lo arregla**: 45 minutos sigue siendo ≥ 30 y sigue terminando a
mitad de bloque. La regla que hace falta es el múltiplo.

```sql
alter table public.app_settings
  alter column min_duration_minutes set default 30;

update public.app_settings
   set min_duration_minutes = 30
 where min_duration_minutes < 30;
```

Y dentro de `create_reservation`, **inmediatamente después** de la comprobación de rango del paso 3:

```sql
  if p_duration_minutes % v_settings.slot_minutes <> 0 then
    raise exception 'La duracion tiene que ser multiplo de % minutos', v_settings.slot_minutes
      using errcode = 'check_violation';
  end if;
```

El orden importa, y es la lección de la tanda 2: **contesta la más fundamental**. A quien pide 20 minutos
se le responde por el rango, no por el múltiplo; a quien pide 45, por el múltiplo. Al revés, el mensaje
sería cierto e inútil.

**Consecuencia en la interfaz:** el desplegable de duración se construye como `30, 60, 90, …` hasta
`products.max_duration_hours * 60`, y no como «1 a 4 horas».

> **Punto a verificar de la tanda 0.** `create or replace function` **conserva** los privilegios de la
> función según la documentación de PostgreSQL, así que el `revoke … from public, anon` de la Fase 1
> debería sobrevivir. Hay que **medirlo**, no darlo por hecho: si no sobrevive, la RPC de reserva vuelve a
> publicarse en `/rest/v1/rpc/` para el rol anónimo. Y nada lo detectaría hoy —`19_function_hardening.sql`
> solo vigila las funciones **de trigger**—, así que en cualquiera de los dos desenlaces se añade la
> aserción que falta: **ninguna RPC de `public` es ejecutable por `anon`**.

### 11.2 D-20 · `available_slots(...)`: el día entero en una llamada

> **Corrección (2026-08-06), detectada al escribir el plan de la tanda 0.** La primera versión de esta
> función filtraba la ventana móvil comparando **fechas**:
> `p_date <= (now() at time zone 'America/Lima')::date + booking_window_days`. La RPC compara **instantes**.
> Si son las 10:00 de hoy, ese filtro ofrecía el séptimo día entero mientras `create_reservation` solo
> acepta hasta las 10:00 de ese día: **las franjas de 10:30 a 20:00 del día 7 se ofrecían y luego se
> rechazaban.** Era exactamente el fallo que esta función existe para evitar. El SQL de abajo ya está
> corregido; el detalle, en [`PLANES/FASE_2_TANDA_0.md`](./PLANES/FASE_2_TANDA_0.md), corrección 1.
>
> **La regla que salió de ahí, y vale más que el arreglo:** la rejilla puede ser **más estricta** que la
> RPC, nunca más laxa.

Con la rejilla de 08:00 a 22:00 en bloques de 30, un día son 28 franjas. Pintarlo con `available_units`
son **28 llamadas**, y eso son 28 viajes a la base y —lo que importa más— **28 fotos distintas**: la
primera franja y la última se responden con estados diferentes de la tabla.

```sql
create or replace function public.available_slots(
  p_product_id       uuid,
  p_campus_id        uuid,
  p_date             date,
  p_duration_minutes int
) returns table (slot_start timestamptz, free int)
language sql stable security definer set search_path = ''
as $$
  with s as (select * from public.app_settings),
  grid as (
    select generate_series(
             ((p_date + (select opening_time from s)) at time zone 'America/Lima'),
             ((p_date + (select closing_time from s)) at time zone 'America/Lima')
               - make_interval(mins => p_duration_minutes),
             make_interval(mins => (select slot_minutes from s))
           ) as slot_start
  )
  select g.slot_start,
         public.available_units(p_product_id, p_campus_id, g.slot_start, p_duration_minutes)
    from grid g
   where g.slot_start > now()
     and g.slot_start <= now()
           + make_interval(days => (select booking_window_days from s))
     and not exists (select 1 from public.disabled_days d where d.date = p_date);
$$;

revoke execute on function
  public.available_slots(uuid, uuid, date, int) from public, anon;
grant execute on function
  public.available_slots(uuid, uuid, date, int) to authenticated;
```

Cuatro decisiones dentro de esas veinte líneas:

- **Delega en `available_units`** en lugar de repetir el cálculo del rango. Si las dos fórmulas se separan,
  el calendario miente — es la advertencia que ya lleva escrita `20260806023952_available_units.sql`.
- **Filtra el pasado, los feriados y la ventana móvil** *(BR-13, C-7, D-3)*. No es cosmética: la propiedad
  que se quiere es que **todo lo que la rejilla ofrezca lo acepte la RPC**. Un día inhabilitado devuelve
  cero filas, no 28 franjas grises. La ventana se compara sobre **instantes**, igual que la RPC — ver la
  corrección de arriba. El pasado, en cambio, usa `>` donde la RPC usa `<`: en el instante exacto la
  rejilla no lo ofrece y la RPC sí lo aceptaría, y esa asimetría es la segura.
- **`SECURITY DEFINER`**, por el mismo motivo medido en la tanda 3: un alumno no ve las reservas ajenas, y
  con sus propios privilegios vería libre todo lo que otros tienen ocupado.
- **La última franja es `closing_time - duración`**, para que la reserva termine justo al cierre. Coincide
  con el paso 5 de la RPC, que rechaza `v_end_at::time > closing_time` pero acepta la igualdad.

### 11.3 Cómo se pinta

Con D-19 aplicada, **cada bloque de 30 minutos cae entero en un estado**. La rejilla es fiel: libre u
ocupado, sin medios bloques y sin decidir cómo se dibuja un residuo de 15 minutos.

```
  duración: [ 30 ] [ 60 ] [ 90 ] [ 120 ]        ← desde max_duration_hours

  08:00  08:30  09:00  09:30  10:00  10:30  11:00  …
  [ 3 ]  [ 3 ]  [ 2 ]  [ 2 ]  [ — ]  [ — ]  [ 1 ]      ← free por franja
```

El número de cada franja es el conteo de unidades libres, igual que hoy. Las franjas con `free = 0` no se
ofrecen.

---

## 12. Las cinco tandas *(D-27)*

En la Fase 1, cada tanda dejaba una propiedad verificable del motor. Aquí el equivalente es **un perfil que
puede hacer su trabajo entero**, porque es justo lo que un E2E puede afirmar. Y encaja con que la
autorización viva en la base: cada tanda se puede probar contra el perfil real, no contra un simulacro.

| Tanda | Contenido | Tareas del plan | Qué deja |
|---|---|---|---|
| **T0 · Cimientos** | Borrar Vite y los documentos muertos. Next.js 16 + App Router + Tailwind con los tokens + shadcn. Los tipos generados. El CI adaptado. **La última migración: D-19 y D-20** | 2.1, 2.2, 2.3 · D-6 · Q-12 | El stack respira. Sin pantallas reales |
| **T1 · Sesión** | `@supabase/ssr`, `proxy.ts`, magic link y Microsoft, `/completar-perfil`, cierre de sesión. Sembrar el primer admin | 2.4, 2.4-bis | **Cierra P0-3.** Se entra y se sale |
| **T2 · Alumno** | Landing, FAQ, catálogo, detalle, **el calendario**, reserva, panel, cancelación, encuesta | 2.5, 2.6 | Un alumno reserva de punta a punta |
| **T3 · Personal** | Mostrador (operador y admin), inventario, imágenes con firma, reservas, días, estadísticas, personal | 2.7, 2.8, 2.9 | **Cierra P0-4.** El ciclo de préstamo se cierra |
| **T4 · Endurecimiento** | Cabeceras de seguridad, E2E de Playwright, lint y auditoría bloqueantes, Q-10, Q-13 | 2.10, 2.11 | Desplegable |

**Por qué la migración de D-19 y D-20 va en T0 y no en T2**, que es donde se usa: para que **ninguna otra
tanda toque SQL**. Es la última migración del proyecto; agrupada con los cimientos, deja T1 a T4 como
trabajo puramente de aplicación, y hace que los tipos que genera T0 salgan ya del esquema definitivo.

**Riesgo anotado: T2 es la tanda grande.** El calendario solo puede llevarse media tanda. Si al escribir su
plan pasa de unas quince tareas, se parte en dos —«catálogo y detalle» y «reserva y panel»— y son seis PR
en vez de cinco. Se decide **escribiendo el plan**, no a mitad de ejecutarlo.

---

## 13. Pruebas

Tres arneses, y cada uno responde una pregunta distinta:

| Arnés | Qué prueba | Dónde |
|---|---|---|
| **pgTAP** *(D-14)* | Las reglas y RLS. **Se queda entero**: 124 aserciones que sobreviven a la migración porque no dependen del toolchain | `supabase/tests/` |
| **Vitest** | Lógica pura del cliente: construcción de la rejilla, formato de fechas en `America/Lima`, derivaciones del panel | Junto al código |
| **Playwright** *(2.11)* | Los flujos, con sesión real: entrar, reservar, cancelar, entregar, recibir | `e2e/` |

**Aserciones nuevas en pgTAP, todas de la tanda 0:**

- Duración de 45 minutos rechazada; de 30, aceptada; de 20, rechazada **por el rango** y no por el múltiplo
  — el mensaje se afirma, no solo el SQLSTATE *(lección de la tanda 2)*.
- `available_slots` de un día inhabilitado devuelve cero filas.
- `available_slots` no devuelve franjas pasadas ni fuera de la ventana móvil.
- La primera franja empieza en `opening_time` y la última termina exactamente en `closing_time`.
- **Ninguna RPC de `public` es ejecutable por `anon`** — el hueco de cobertura que destapó §11.1.

> **Lo que Vitest no prueba, y hay que resistirse a que lo pruebe:** la autorización. Un test de cliente
> que afirma «el botón de admin no se ve» es un test de maquetación. Que un operador no pueda escribir
> inventario lo prueba pgTAP, dentro del motor, y ya está probado.

---

## 14. Riesgos

| Riesgo | Mitigación |
|---|---|
| **Tailwind 4 + shadcn + Next.js 16 es una combinación reciente** y puede dar guerra | Se mide en T0, que no construye pantallas. Desenlace alternativo escrito: Tailwind 3.4 con el config copiado tal cual *(§6)* |
| **`create or replace` sobre `create_reservation` podría reabrir la RPC a `anon`** | Punto a verificar de T0, con los dos desenlaces. En ambos se añade la aserción de cobertura que falta *(§11.1)* |
| **`getClaims()` deja de ser local si el proyecto cambia a firma simétrica** | Medido y anotado: hoy es ES256. Si el proxy se pone lento, mirar el JWKS antes que el código |
| **Un cliente de servidor a nivel de módulo filtra sesiones entre usuarios** | `lib/supabase/server.ts` exporta una **función**, nunca una constante *(D-24)*. Es el fallo más grave que esta fase puede introducir sin tocar una política |
| **La rejilla del calendario y `create_reservation` se separan** | `available_slots` delega en `available_units`, que ya comparte fórmula con `blocked_range`. Una sola definición del rango, en un solo sitio |
| **T2 se desborda** | Se parte en dos al escribir su plan, no a mitad de ejecutarlo *(§12)* |
| **El buffer puede desalinear la cola del bloqueo igual que la duración** | **Q-14**, abierto a propósito *(§15)* |
| **`gen types --local` puede no funcionar con los servicios recortados de `db.yml`** | Punto a verificar de T0, con los dos desenlaces escritos *(§7.4)* |
| Supabase hiberna por inactividad | Reintentar; la primera llamada lo despierta |

---

## 15. Pendiente que esta fase abre

**Q-14 · El buffer desalinea la cola del bloqueo, igual que la duración.** D-19 obliga a que la duración
sea múltiplo del bloque, pero `products.buffer_minutes` solo tiene `check (between 0 and 480)`. Un buffer
de 45 minutos vuelve a dejar la cola del bloqueo a mitad de bloque, por la puerta de atrás.

**Por qué no se decide ahora:** un `CHECK` de tabla **no puede leer `app_settings`**, así que atarlo exige
elegir entre tres salidas con costes distintos —un trigger sobre `products`, redondear `blocked_range`
hacia el bloque siguiente, o que la interfaz de admin solo ofrezca múltiplos—, y la de en medio toca una
migración de la Fase 1 que está probada y mueve el borde que afirma `21_no_overlap.sql`: «una reserva que
empieza justo al terminar el buffer sí entra» y «a un minuto del borde del buffer, se rechaza».
**`buffer_minutes` no tiene interfaz hasta la tanda 3**, y para entonces se sabrá si el admin necesita
buffers finos o no.

**Riesgo mientras tanto: ninguno con los datos actuales.** Los 34 productos tienen `buffer_minutes = 120`,
que es múltiplo de 30. Hoy el único desalineador posible era la duración, y D-19 lo cierra.
