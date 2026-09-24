# Despliegue · Netlify y Cloudflare

> **Fuente de verdad del estado del proyecto: [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md).**
> Este documento no lleva estado ni recuentos: es **operativo** y se consulta **por tarea**, no por
> fase. Lo que aquí se decide queda registrado como decisión allí.
>
> **Aquí vive el CÓMO se configura cada servicio. El CUÁNTO CUESTA vive en
> [`COSTOS.md`](./COSTOS.md)**, y ninguno de los dos repite al otro: los precios caducan y por eso van
> fechados y con su fuente en un solo sitio. ⚠ **Y `COSTOS.md` señala la partida sin la cual nadie
> puede entrar: el SMTP propio.** El correo integrado de Supabase manda **2 mensajes por hora** y aquí
> se entra sólo por magic link.
>
> ⚠ *Caducado el 2026-09-17: el SMTP propio ya está montado y **su cómo vive en el §4** de este
> documento. La frase de arriba decía que este documento «no lo menciona», y era cierta hasta hoy.*

**Escrito el 2026-08-23**, al cerrar los siete huecos de la auditoría de seguridad. Cubre el paso que
falta para que el Next.js exista en internet, y el orden importa: **Netlify primero, Cloudflare
después**, porque Cloudflare necesita un origen al que apuntar.

---

## 0. Lo que hay que saber antes de tocar nada

### El sitio viejo ya no existe, y `main` sigue teniendo su configuración

⚠ **Alejandro eliminó el sitio de Netlify el 2026-08-24.** `upc-inventario.netlify.app` ya no
responde y **no hay nada que reutilizar**: el sitio se crea nuevo. Lo que queda de aquello es lo que
sigue versionado en `main`.

⚠ **Caducado el 2026-09-14: el sitio se volvió a crear con el mismo nombre.** `upc-inventario.netlify.app`
responde **200** en `/` y **307 a `/login`** en `/catalogo`, medido con `curl.exe -sI`. El párrafo de
arriba describe el 2026-08-24 y se conserva por eso.

`main` tiene hoy un `netlify.toml` con `publish = "dist"` y un redirect SPA de `/*` a `/index.html`.
Es la configuración del **Vite**, no del Next.js. Y esa aplicación **está rota contra el esquema desde
la Fase 1** — usa `from('app_admins')` y `rpc('get_all_carreras')`, que no existen, e `INSERT` directo
en `inventory_reservations`, para el que `authenticated` no tiene privilegio *(D-93)*.

**El bloqueo nunca fue que faltara configuración: es que la que hay publica lo equivocado.**

⚠ **Medido el 2026-08-24, y corrige lo que este documento decía antes.** Se dio por hecho que el merge
daría «el conflicto de `netlify.toml`». **`netlify.toml` no conflictúa**: `main` no lo tocó en sus tres
commits propios, así que git se queda con el de `develop` solo. Lo que sí pasa es más grave y no
estaba escrito — `git merge-tree origin/main origin/develop`:

| | |
|---|---|
| Archivos en conflicto | **18**, no uno |
| De ellos, `modify/delete` | **17** — `src/*` que `develop` borró y `main` modificó. **Git deja en el árbol la versión de `main`** |
| Conflicto de contenido real | **1**, `.gitignore` |
| Sobrante total frente a `develop` | **39 archivos, 7 225 líneas** — los 35 de `src/`, dos SQL sueltos en `supabase/` y `.claude/settings.local.json` |
| Archivos de `develop` que se perderían | **0** |

**O sea: quien resuelva sólo `netlify.toml` y commitee devuelve el Vite entero a `main`.** Y los dos
SQL sueltos son justo lo que el `CLAUDE.md` del repo prohíbe. **Nada de `main` vale la pena conservar**,
así que la resolución no es negociar archivo por archivo: **`main` se queda con el árbol de `develop`,
exacto**. El control que lo demuestra es `git diff --stat main develop` **vacío**, y va después de
commitear, no antes.

### Cloudflare no es lo que para un DDoS por sí solo, y hay que decirlo

Poner Cloudflare delante **sí** añade WAF y límite de tasa, que es lo que cubre H-2 fuera del código.
Pero conviene tener claro el reparto:

| Amenaza | Quién la para |
|---|---|
| Inundación volumétrica (L3/L4) | ~~**Cloudflare**, y sólo Cloudflare~~ ⚠ *Corregido el 2026-09-17:* **Netlify**, que mitiga DDoS de capa 3, 4 y 7 en todos sus planes. Y Supabase, que tiene su propio borde |
| Abuso de una ruta cara por alguien autenticado | El código — `pedir_firma_cloudinary()`, `daily_limit_per_product`, los topes de H-1 |
| Texto de 500 MB en una columna | **La base** *(H-1)*. Cloudflare no mira el cuerpo de un `POST` autenticado |
| Bots que raspan el catálogo | Cloudflare |
| **Agotar el tope de correos para que nadie entre** *(H-9)* | **Un CAPTCHA dentro de Supabase Auth.** Ni Cloudflare ni Netlify lo ven: la petición va del navegador a `supabase.co` |
| **Agotar los créditos de Netlify, que pausa el sitio** *(H-12)* | El código —`remotePatterns` acotado a nuestra cuenta de Cloudinary— y la recarga automática del plan |

**Nada de lo que se configure en Cloudflare sustituye a los topes de la base.** Son capas distintas
sobre problemas distintos.

⚠ **Añadido el 2026-09-17, con la segunda auditoría.** Esta sección decía «Cloudflare no para un DDoS
por sí solo» y era cierto, pero se quedaba corto: **el DoS que más duele aquí no es de volumen, es de
cupo**. Un solo script sin sesión puede gastar el tope de correos de todo el proyecto, o los créditos
del mes de Netlify, **sin llegar nunca a parecer un ataque**. Los hallazgos están en `ESTADO_Y_PLAN.md`
§3, de H-8 a H-19.

---

## 1. Netlify

### 1.1 Lo que ya está en el repositorio

`netlify.toml` en la raíz, con `publish = ".next"` y `NODE_VERSION = "22"` — **la misma que usa el
CI**, para que el build de despliegue no corra en una versión distinta a la que dio verde en el PR.

**No lleva bloque `[[headers]]` a propósito.** Las cinco cabeceras de seguridad viven en
`next.config.ts` y la CSP con nonce en `proxy.ts`. Repetirlas en Netlify crearía una segunda fuente de
verdad, y **las de Netlify ganan sobre las del framework**: la copia vieja pisaría a la nueva y el
síntoma sería una cabecera que «no se aplica» sin ningún error en ninguna parte.

**No lleva `[[plugins]]`.** El Next.js Runtime v5 se detecta e instala solo, y declararlo a mano lo
congela en una versión. Comprobado en el changelog de Netlify: **Next.js 16 se despliega sin
configuración y sin cambios respecto a la 15.**

### 1.2 Variables de entorno — en el panel, nunca en el repositorio

*Site configuration → Environment variables.* ~~Son siete~~ Son ocho desde el 2026-09-18 —se suma la de
Turnstile, H-9—, y **una es un secreto de verdad**:

| Variable | Valor | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zqfkzgdyeqxzgzpxgadi.supabase.co` | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La clave publicable | Pública, viaja al navegador |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | El cloud name | Pública |
| `CLOUDINARY_API_KEY` | La API key | **Sin** `NEXT_PUBLIC_`. **NO se marca *secret*** — ver abajo |
| `CLOUDINARY_API_SECRET` | El secreto | ⚠ **Secreto. Marcar como *secret* en Netlify** |
| `CLOUDINARY_FOLDER` | La carpeta | — |
| `SENTRY_DSN` | El DSN, cuando exista | **Sin** `NEXT_PUBLIC_`; vacía no rompe nada |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | La *site key* de Turnstile | Pública. **Se pone ANTES de encender el CAPTCHA en Supabase** *(§5.1)*; la *secret key* va a Supabase, no aquí |

⚠ **De las dos de Cloudinary sólo una es secreta, y la pregunta se repite.** `CLOUDINARY_API_KEY`
**viaja al navegador por diseño**: `app/api/cloudinary/firmas/route.ts:150` la devuelve en la respuesta
JSON junto con la firma, porque el navegador la necesita para el POST a Cloudinary. **Lo que autoriza
la subida no es la key: es la firma**, calculada en el servidor con el secreto, atada a un `timestamp`
y a unos parámetros exactos. La key **identifica**, el secreto **autoriza** —el mismo reparto que
`client_id` y `client_secret` en OAuth—, y por eso filtrar la key sola no permite subir nada. Marcarla
*secret* en Netlify no añade seguridad **y arriesga el build**: Netlify escanea el output buscando los
valores marcados como secretos y falla si los encuentra. *No medido en este proyecto; es motivo para no
hacerlo, no un fallo previsto.* **El único que no puede llevar `NEXT_PUBLIC_` ni salir del servidor es
`CLOUDINARY_API_SECRET`** *(D-28, P0-4)*.

⚠ **Medido el 2026-09-14: el escaneo saltó de verdad, y no por el código.** El primer Deploy Preview
del sitio falló con *«Secret env var "CLOUDINARY_API_SECRET"'s value detected»* en
`.netlify/.next/cache/turbopack/…/*.sst`: **la caché de compilación de Turbopack**, que desde Next 16.3.0
guarda los valores de las variables que lee el build y que Netlify conserva entre builds. **El output
publicado estaba limpio.** Se cerró **apagando esa caché** en `next.config.ts` *(D-100)*, **no**
excluyendo la ruta con `SECRETS_SCAN_OMIT_PATHS`. ⚠ **Si alguien reactiva la caché, el deploy vuelve a
fallar**, y es lo correcto: el secreto estaría otra vez en disco.

⚠ **Son siete y sólo siete: `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` y `NEXT_PUBLIC_CLOUDINARY_FOLDER`
NO van aquí.** Estaban en `.env.example` hasta el 2026-08-24 y **el código no las lee en ningún sitio**
—`grep` de `process.env` sobre todo el repositorio—. Son residuo del Vite, que subía a Cloudinary
**desde el navegador con un upload preset sin firmar**. El Next.js firma en el servidor, que es H-2 de
la auditoría *(D-97)*. **Copiarlas de un `.env` viejo al panel reabre ese hueco**, y con
`NEXT_PUBLIC_` viajarían al navegador. Ya no están en `.env.example`, y en su sitio hay un comentario
diciendo por qué. **La lista buena es `.env.example`, y coincide con esta tabla: siete.**

⚠ **Ninguna variable de Supabase con `SERVICE_ROLE` va aquí.** Esa clave salta RLS por diseño y la
aplicación no la usa en ningún sitio; si aparece en el panel, alguien la puso por error.

### 1.3 El paso que hay que dar en Supabase y es fácil de olvidar

El magic link vuelve a la URL que Auth tenga configurada, **no a la que el navegador estaba usando**.
Cuando haya URL de Netlify:

*Supabase → Authentication → URL Configuration*

- **Site URL:** la URL del sitio desplegado, ⚠ **SIN barra final** — ver abajo.
- **Redirect URLs:** añadir esa URL. `http://127.0.0.1:3000` se queda para el desarrollo local.

**Sin esto, entrar desde el sitio desplegado manda el enlace a `127.0.0.1` y no funciona para nadie**
— y el fallo no da error: el correo llega, el enlace existe, y al pulsarlo no lleva a ninguna parte.

⚠ **Y la barra final del Site URL rompe el canje, medido contra producción el 2026-08-24.** La plantilla
de correo construye el destino concatenando —`{{ .SiteURL }}/auth/confirm?token_hash=…`—, así que un
Site URL acabado en `/` produce **dos barras**. Y las dos barras no son cosméticas:

| Enlace | Respuesta de producción |
|---|---|
| `/auth/confirm?token_hash=…` | 307 → `/auth/error?motivo=enlace` — la ruta se alcanza y procesa el token |
| `//auth/confirm?token_hash=…` | 307 → **`/login?token_hash=…`** — **la ruta no se alcanza nunca** |

**Con dos barras el proxy no reconoce la ruta, la trata como privada y la manda a `/login`:** el canje no
ocurre, quien entra cae en la pantalla de ingreso sin sesión, y el `token_hash` acaba en la query de una
página que no lo canjea. **Es el mismo fallo mudo que esta sección advierte, con otra cara** — no hay
error, sólo un enlace que devuelve al principio. *No se midió si GoTrue normaliza la barra antes de
concatenar, y no hace falta: quitarla cuesta diez segundos y borra la pregunta.*

### 1.4 Cómo se verifica que el despliegue funcionó

**No basta con que Netlify diga «Published».** Tres comprobaciones por el efecto, en orden:

```powershell
curl.exe -sI https://<el-sitio>.netlify.app/ | Select-String "referrer|permissions|x-frame|strict-transport"
```

Las cuatro cabeceras tienen que salir. **`Strict-Transport-Security` es la que nunca se pudo verificar
en este proyecto** por no haber HTTPS: este es el día.

```powershell
curl.exe -sI https://<el-sitio>.netlify.app/catalogo | Select-String "location|content-security-policy"
```

Sin sesión tiene que responder **307 hacia `/login`** — eso demuestra que `proxy.ts` está corriendo de
verdad, que es lo que un despliegue mal configurado rompe primero.

Y el recorrido entero en el navegador: pedir magic link, entrar, ver el catálogo. **El E2E local no
sustituye a esto**: corre contra el stack local, y lo que se está verificando aquí es la configuración
de producción.

### 1.5 El dominio: `ccnode.net` y `dispositivos.ccnode.net` *(D-99)*

**Una sola aplicación, un solo sitio de Netlify, dos nombres.** `ccnode.net` sirve la portada, el FAQ y
el manifest; **todo lo demás salta con un 307 a `dispositivos.ccnode.net`**, con la ruta y la query
enteras. Quien reparte es `proxy.ts` a través de `lib/dominios.ts`, **no Netlify**. El porqué, en D-99.

**El DNS lo lleva Mochahost** —nameservers `ns1` a `ns4.mysecurecloudhost.com`— y se edita en su
cPanel, *Zone Editor* de `ccnode.net`. **Estado medido el 2026-09-14**, antes de cambiar nada:

| Registro | Hoy | Cambiar a |
|---|---|---|
| `ccnode.net` **A** | `194.39.149.173` | **`75.2.60.5`** — el balanceador de Netlify para DNS externo |
| `www` **CNAME** | `ccnode.net` | **`upc-inventario.netlify.app`** |
| `dispositivos` **A** | `194.39.149.173` | **Borrarlo** y crear **CNAME** → **`upc-inventario.netlify.app`** |
| `mail` **CNAME** | `ccnode.net` | Borrarlo y crear **A** → `194.39.149.173` |
| `ftp` **CNAME** | `ccnode.net` | Borrarlo y crear **A** → `194.39.149.173` |
| **MX** | `ccnode.net` | **`mail.ccnode.net`** |

⚠ **Las tres últimas filas son las que se olvidan, y sin ellas se cae el correo del dominio.** El MX,
`mail` y `ftp` apuntaban al propio `ccnode.net`: al pasar su registro A a Netlify, el correo se va
detrás sin ningún aviso. **No se tocan** el TXT del SPF, `webmail` ni `cpanel`, que ya son registros A
hacia Mochahost. `dispositivos` hay que **borrarlo**, no editarlo: un nombre no puede tener a la vez un A
y un CNAME. **Sin registros AAAA ni CAA** que estorben; CAA se consultó por `dns.google`, porque
`Resolve-DnsName` de PowerShell 5.1 no conoce ese tipo.

**El orden:**

1. **Netlify primero** —*Domain management*—: `dispositivos.ccnode.net` como **principal**, `ccnode.net`
   y `www.ccnode.net` como alias. Si el DNS llega antes, Netlify responde *«Site not found»*.
2. **Los seis registros de la tabla** en Mochahost. Propagan de minutos a 24 h.
3. **Supabase, sólo cuando `https://dispositivos.ccnode.net` ya cargue:** Site URL
   `https://dispositivos.ccnode.net`, **sin barra final** *(§1.3)*, y la misma URL en Redirect URLs.
   Antes de eso, los magic links llevarían a una página que no carga.

**Cómo se verifica, por el efecto y con control negativo:**

```powershell
Resolve-DnsName mail.ccnode.net -Server 8.8.8.8
```

*Tiene que seguir saliendo `194.39.149.173`: el correo sigue en Mochahost.*

```powershell
curl.exe -sI https://ccnode.net/ | Select-String "HTTP|location"
```

*`200` sin `Location`: la portada se sirve en `ccnode.net`.*

```powershell
curl.exe -sI https://ccnode.net/catalogo | Select-String "HTTP|location"
```

*El control negativo: `307` hacia `https://dispositivos.ccnode.net/catalogo`.*

Y después, el recorrido entero del §1.4 sobre `dispositivos.ccnode.net`, **empezando por el botón
«Entrar» de `ccnode.net`**.

⚠ **Dos cosas NO medidas, porque sólo se miden con el dominio apuntando:**

- **Si Netlify redirige por su cuenta los alias al dominio principal.** Su documentación no lo aclara. Si
  el `curl` a `https://ccnode.net/` devuelve `301` hacia `dispositivos`, la portada no se vería nunca en
  `ccnode.net`.
- **Si el salto de dominio del botón «Entrar» deja avisos de CSP en la consola.** El `Link` de Next
  intenta traer `/login` por `fetch`, el proxy lo manda a otro origen y `connect-src 'self'` lo bloquea.
  Se espera que Next caiga a una navegación completa y funcione igual; **se mira en el navegador**.

---

## 2. Cloudflare

**No se puede configurar hasta que haya dominio.** Cloudflare funciona haciendo de intermediario para
un nombre de dominio; sin uno, no hay nada que interceptar. Lo de abajo queda listo para el día que
llegue el definitivo.

⚠ **El dominio llegó el 2026-09-14, y Cloudflare se aplaza igual, por otro motivo** *(D-99)*: usarlo
exige mover los nameservers de **todo** `ccnode.net` —correo incluido— desde Mochahost, y el dominio es
del cliente. El DNS se queda en Mochahost *(§1.5)*.

⚠ **Y la segunda auditoría, el 2026-09-17, encontró dos motivos más para no darlo por hecho** *(Q-31)*:

1. **Netlify desaconseja poner el proxy de Cloudflare delante de su CDN.** Lo dice su guía de soporte
   *«What problems could occur when using Cloudflare in front of Netlify?»*: lo que recomienda es la nube
   **gris** —sólo DNS—, que no protege nada. El paso 4 del §2.1 pedía la **naranja**.
2. **La regla del §2.3 no cubre la puerta que importa.** El magic link lo pide el navegador directo a
   `supabase.co` y nunca pasa por este dominio. Esa puerta se cierra con **Turnstile dentro de Supabase
   Auth** *(H-9)*, y **Turnstile no exige tener el DNS en Cloudflare**.

**Lo de abajo se conserva** porque sigue siendo correcto si algún día se decide ponerlo, pero ya no es
el siguiente paso del despliegue.

### 2.1 El orden, que no es intuitivo

1. **Añadir el dominio a Cloudflare** (*Add a site*). Cloudflare escanea los DNS existentes.
2. **Cambiar los nameservers** en el registrador al par que Cloudflare indique. Tarda de minutos a 24 h.
3. **En Netlify**, añadir el dominio personalizado (*Domain management → Add a domain*).
4. **En Cloudflare**, crear el registro DNS hacia Netlify **con la nube naranja activada** (proxied).
   ⚠ *Precisado el 2026-09-17: **Netlify desaconseja este paso** —ver arriba, Q-31—. Si se hace, es
   contra la recomendación del proveedor y hay que medir que los certificados se sigan renovando.*
5. **Recién entonces**, SSL y las reglas.

### 2.2 SSL — el ajuste que rompe el sitio si se hace mal

*SSL/TLS → Overview →* **`Full (strict)`**

⚠ **`Flexible` deja el tramo Cloudflare→Netlify en HTTP.** Con `Strict-Transport-Security` activo y un
`upgrade-insecure-requests` en la CSP, eso produce **un bucle de redirecciones** que deja el sitio
inaccesible. Y el síntoma no dice su causa: parece un problema de Netlify.

`Full (strict)` es además el único que verifica el certificado del origen. Netlify sirve uno válido,
así que no hay motivo para bajar de ahí.

### 2.3 Rate limiting — lo que cubre H-2 fuera del código

*Security → WAF → Rate limiting rules.* **El plan gratuito permite una regla.** Con una sola, se gasta
donde más duele:

| Campo | Valor |
|---|---|
| Nombre | `Freno de autenticacion` |
| Si… | `URI Path` **starts with** `/auth` **or** `URI Path` equals `/login` |
| Contar por | IP |
| Umbral | **20 peticiones en 1 minuto** |
| Acción | *Managed Challenge* |

**Por qué `/auth` y no `/api`:** `/api/cloudinary/firmas` **ya tiene su tope en la base**
—`pedir_firma_cloudinary()`, 60/hora por persona— y ese cuenta por **usuario**, que es mejor que por
IP. `/auth` no tiene nada delante salvo los límites de Supabase, ~~y es la única puerta que un anónimo
puede aporrear~~.

⚠ *Corregido el 2026-09-17: **no es la única, y no es la que más importa.** `signInWithOtp` sale del
navegador directo a `https://zqfkzgdyeqxzgzpxgadi.supabase.co/auth/v1/otp`, así que **pedir magic links
no pasa por `/auth` ni por `/login`** y esta regla no lo vería. `/login` es sólo la página. Lo que sí
llega por aquí es `/auth/confirm`, el canje: eso sí lo frena la regla.*

*Managed Challenge* y no *Block*: un bloqueo duro por IP en una universidad **castiga a un campus
entero detrás de un NAT**. El desafío deja pasar a la persona real y frena al script.

### 2.4 Caché — el ajuste que puede filtrar una sesión

⚠ **Esto es lo más peligroso de toda la configuración de Cloudflare.**

Si Cloudflare cachea una respuesta que lleva `Set-Cookie` con la sesión de alguien, **se la sirve al
siguiente visitante**. Eso es una toma de sesión, y no la produce un atacante: la produce la
configuración.

**Lo que ya protege:** `updateSession()` en `lib/supabase/proxy.ts` pone
`Cache-Control: private, no-store` en cada respuesta, y el comentario del archivo dice exactamente por
qué — *«detrás de un CDN, una respuesta cacheada con la cookie de sesión de alguien dentro se le
serviría a otro»*. Cloudflare respeta `private` por defecto.

**Lo que NO hay que hacer, nunca:**

- Activar *Cache Everything* en una Page Rule que cubra `/*`.
- Poner *Edge Cache TTL* sobre rutas con sesión.
- Activar *Always Online*.

**Cómo comprobarlo** después de configurar, con dos peticiones y una sesión iniciada:

```powershell
curl.exe -sI https://<dominio>/mi-panel -H "Cookie: <la cookie de sesion>" | Select-String "cf-cache-status|cache-control"
```

`cf-cache-status` tiene que decir **`DYNAMIC` o `BYPASS`**. Si dice `HIT`, hay que parar y revisar
antes de dar el sitio por bueno.

### 2.5 Lo que conviene activar, y es gratis

| Ajuste | Dónde | Por qué |
|---|---|---|
| **Always Use HTTPS** | SSL/TLS → Edge Certificates | Redirige el `http://` antes de llegar al origen |
| **Bot Fight Mode** | Security → Bots | Frena el raspado del catálogo |
| **Browser Integrity Check** | Security → Settings | Filtra clientes con cabeceras falsificadas |

⚠ **Auto Minify NO** — está deprecado, y además Next.js ya minifica. Que dos capas toquen el mismo
JavaScript es una forma de romper el nonce de la CSP sin que nadie entienda por qué.

⚠ **Rocket Loader NO.** Reordena la carga de scripts y **rompe la CSP con nonce**: los scripts que
mueve pierden su nonce y el navegador los bloquea. La aplicación se queda en blanco con el build en
verde, que es el modo de fallo favorito de este proyecto.

---

## 3. El orden completo, de aquí al dominio

**Cambió el 2026-08-24 al eliminarse el sitio viejo.** Mientras el sitio existía y apuntaba a `main`,
las variables tenían que estar puestas **antes** de mergear, porque el merge disparaba el build solo.
**Sin sitio, eso ya no aplica:** el merge no dispara nada, y las variables se ponen en el asistente de
creación, que las pide antes del primer despliegue. **El merge pasa a ir primero.**

1. Mergear la rama de la auditoría a `develop`, con el CI en verde.
2. **Aplicar las migraciones nuevas a producción a propósito** —`db push`—, nunca al mergear.
3. **Mergear `develop` a `main` dejando el árbol de `develop` exacto** *(§3.1)*.
4. **Crear el sitio en Netlify** conectado a `main`, con **las siete variables del §1.2 puestas en el
   asistente**, antes de pulsar *Deploy*.
5. Actualizar Site URL y Redirect URLs en Supabase *(§1.3)*. **Sin esto el fallo es mudo.**
6. Verificar por el efecto *(§1.4)* — incluido HSTS, por primera vez.
7. **Cuando llegue el dominio:** Cloudflare, en el orden del §2.1.
   ⚠ *Caducado el 2026-09-14: el dominio llegó y el paso 7 pasa a ser el §1.5 —DNS en Mochahost—.
   Cloudflare queda aplazado (D-99), y con él el paso 8.*
8. Comprobar `cf-cache-status` *(§2.4)* antes de dar nada por cerrado.

### 3.1 El merge a `main`, que no se resuelve archivo por archivo

**Son 18 conflictos y 39 archivos sobrantes** *(§0, D-98)*. Resolverlos a mano es donde se cuela el
Vite de vuelta. **No se negocian: se impone el árbol de `develop` entero**, que es lo que `read-tree`
hace en una línea.

```powershell
git checkout main
```

```powershell
git pull --ff-only origin main
```

⚠ **Este paso no es de adorno, y se midió el 2026-08-24: `main` local estaba 4 commits atrás de
`origin/main`** —los cuatro propios, los mismos que este §3.1 dice más abajo que no cubre ningún tag—.
**Contra ese `main` viejo el merge da 0 conflictos, no 18.** O sea: se pierde la señal de que el
documento habla del árbol correcto, y el `push` posterior sale *non-fast-forward*. **Si el paso
siguiente no informa de 18 conflictos, no se sigue: se está mergeando contra otro `main`.**

```powershell
git merge --no-ff --no-commit develop
```

*Va a informar de los 18 conflictos. **Es lo esperado y no se toca ninguno.***

```powershell
git read-tree -u --reset develop
```

*Fuerza el índice y el árbol de trabajo al de `develop`, borrando los 39 sobrantes de golpe.
`MERGE_HEAD` sobrevive, así que el commit siguiente conserva sus **dos** padres.*

```powershell
git commit -m "merge: develop a main, el Next.js reemplaza al Vite" -m "Arbol identico a develop. Ver D-98."
```

**Y el control, que va DESPUÉS de commitear porque antes no mide nada:**

```powershell
git diff --stat main develop
```

⚠ **Tiene que salir VACÍO.** Si sale una sola línea, el merge conservó algo de `main` y no está listo
para desplegar. Comprobaciones de apoyo, las dos a **0**:

```powershell
git ls-tree -r --name-only main | Select-String "^src/" | Measure-Object | Select-Object -ExpandProperty Count
```

**Lo que NO se hace, y por qué.** `git reset --hard develop` más `push --force` deja el mismo árbol
con menos pasos, y `main` **no está protegida**, así que el remoto lo aceptaría. **Pero borraría los
cuatro commits propios de `main`, y ninguno está cubierto por `legacy/vite-final` ni por
`legacy/refactor-marzo`** —comprobado con `git tag --contains`—, así que se perderían de verdad. Es
justo lo que D-29 existe para impedir. **Y no compra nada:** Netlify publica el árbol del último
commit, nunca la historia. Conservar los ancestros no publica ni un byte del Vite.

---

## 4. Correo saliente · Resend y el SMTP propio

**Montado el 2026-09-17.** Sin esto nadie entra: no hay contraseñas, y el SMTP integrado de Supabase
manda **2 mensajes por hora**. El coste y por qué Resend y no otro están en
[`COSTOS.md`](./COSTOS.md) §4; aquí sólo vive el cómo.

### 4.1 El dominio remitente es `dispositivos.ccnode.net`, no `ccnode.net`

**Subdominio, y por dos motivos.** Si los correos del sistema caen en spam, no arrastran la reputación
del correo de la empresa, que sigue en Mochahost. Y el remitente coincide con la dirección donde está
la aplicación.

⚠ **El correo de `ccnode.net` no se toca.** El MX sigue en `mail.ccnode.net` y el SPF de la raíz
—`v=spf1 +a +mx +ip4:198.38.90.23 include:spf.mysecurecloudhost.com ~all`— se queda como está: los
registros de Resend cuelgan de **otros nombres** y no compiten con él. **Y no hace falta DMARC nuevo:**
`_dmarc.ccnode.net` ya publica `v=DMARC1; p=none;` sin `sp=`, así que el subdominio hereda esa política.

### 4.2 Los registros en cPanel, que NO son los que documenta Resend en su guía vieja

⚠ **Resend pide hoy un TXT y DOS CNAME.** La guía que circula —y lo que este documento decía antes de
medirlo— habla de un **MX a `feedback-smtp…amazonses.com` y un TXT de SPF**. **Lo que la consola
entregó el 2026-09-17 fue otra cosa**, la infraestructura `forge.rmta.net`. **Se copia lo que muestra
la consola, no lo que dice ninguna guía.**

| Tipo | Nombre *(completo y con punto final)* | Valor |
|---|---|---|
| TXT | `resend._domainkey.dispositivos.ccnode.net.` | la clave DKIM, `p=MIGf…`, **en una sola línea y sin comillas** |
| CNAME | `rsend.dispositivos.ccnode.net.` | `rsend-sae1.forge.rmta.net.` |
| CNAME | `send.dispositivos.ccnode.net.` | `send.forge.rmta.net.` |

**El punto final no es cosmético:** sin él, cPanel añade `.ccnode.net` otra vez y el registro queda en
`send.dispositivos.ccnode.net.ccnode.net`. **Y el formulario simple del Zone Editor no ofrece TTL**:
pone el suyo, y no pasa nada.

**Que `dispositivos` sea un CNAME a Netlify no estorba:** un CNAME sólo prohíbe otros datos **en su
mismo nombre**, y estos tres son nombres distintos.

### 4.3 Comprobar el DNS antes de pulsar *Verify*, y contra los CUATRO nameservers

Preguntar a un resolutor público mide la caché. Preguntar al servidor autoritativo mide lo que quedó
guardado. **Los dos comandos siguientes se corren contra `ns1` … `ns4`**, y el motivo se midió ese
mismo día:

⚠ **Los cuatro nameservers de Mochahost no se sincronizan a la vez, y su número de serie miente.**
Medido el 2026-09-17: con los tres registros ya guardados, `ns3` y `ns4` servían los tres y **`ns1` y
`ns2` no tenían `send`** —y sus seriales discrepaban, `…14` contra `…17`—. **Pulsar *Verify* en ese
momento habría fallado sin que hubiera nada mal**: basta con que Resend le pregunte al que va atrasado.

```powershell
foreach ($s in 'ns1','ns2','ns3','ns4') { "== $s"; Resolve-DnsName send.dispositivos.ccnode.net -Type CNAME -Server "$s.mysecurecloudhost.com" -DnsOnly | Where-Object Section -eq 'Answer' | Select-Object -ExpandProperty NameHost }
```

**Y el DKIM se compara entero, no se mira.** Una clave truncada tiene el mismo aspecto que una buena:

```powershell
$esperado = 'PEGAR_AQUI_EL_VALOR_DE_RESEND'
```

```powershell
foreach ($s in 'ns1','ns2','ns3','ns4') { $v = (Resolve-DnsName resend._domainkey.dispositivos.ccnode.net -Type TXT -Server "$s.mysecurecloudhost.com" -DnsOnly | Where-Object Section -eq 'Answer').Strings -join ''; "$s igual=$($v -ceq $esperado) largo=$($v.Length)/$($esperado.Length)" }
```

*El 2026-09-17 salió `igual=True largo=218/218` en los cuatro.*

### 4.4 Resend: seguimiento apagado y una clave que sólo puede enviar

- **Domains → Configuration: *Click tracking* y *Open tracking* APAGADOS.** ⚠ Con el de clics
  encendido, Resend **reescribe el enlace del correo** para pasarlo por su dominio de seguimiento: el
  magic link deja de apuntar a `dispositivos.ccnode.net` y el canje se rompe.
- **API Keys → *Sending access*, limitada a `dispositivos.ccnode.net`.** Resend la muestra **una sola
  vez**. Va al gestor de contraseñas: **ni al repositorio ni a `.env`** — es la misma regla del token
  de la CLI de Supabase.
- **La clave de la pantalla de bienvenida se borra al terminar.** Sirve para el correo de prueba y
  nada más.

⚠ **La prueba de bienvenida no mide nada de este montaje** y conviene saberlo antes de perder una
hora: sale de `onboarding@resend.dev`, un remitente **compartido por todas las cuentas de Resend**, y
sólo acepta como destinatario el correo de la propia cuenta. El 2026-09-17 Resend la registró
`Delivered` y **Gmail no la mostró en ninguna carpeta**. **Eso no dice nada sobre el dominio propio.**

### 4.5 Supabase: el SMTP y el límite que deja a todos fuera

**Authentication → Emails → SMTP Settings → *Enable custom SMTP*:**

| Campo | Valor |
|---|---|
| Sender email | `no-responder@dispositivos.ccnode.net` |
| Host · Port | `smtp.resend.com` · `465` |
| Username | `resend` |
| Password | la clave de envío de Resend |

⚠ **Y a continuación, Authentication → Rate Limits.** Al activar SMTP propio el tope pasa de 2 a
**30 correos por hora**, y **es uno solo para todo el proyecto, no por alumno**. Al superarlo **nadie
puede entrar** hasta la hora siguiente, y el fallo aparece como un error genérico de inicio de sesión.

**Las plantillas no las toca este paso.** Siguen siendo las del dashboard, que apuntan a
`/auth/confirm?token_hash=…`; ver el §1.3 sobre la barra final del Site URL.

### 4.6 Verificar por el efecto, con control negativo

Se pide un enlace en `https://dispositivos.ccnode.net/login` con un correo **`@upc.edu.pe` real**:

1. **Resend → Emails** lo muestra `Delivered`. **Es el control positivo de que salió por Resend:** el
   SMTP integrado de Supabase no aparecería ahí.
2. En el origen del mensaje: `dkim=pass`, `spf=pass`, `dmarc=pass`.
3. **Se abre el enlace UNA sola vez** y la sesión queda iniciada.
4. **Control negativo:** un correo que no sea `@upc.edu.pe` **no** produce ningún envío en Resend,
   porque lo corta el enganche *(D-32)*.

*Medido el 2026-09-17: los cuatro pasan. **El correo llegó a Correo no deseado**, que es lo único
abierto y vive como pendiente en `ESTADO_Y_PLAN.md`.*

⚠ *Precisado el 2026-09-18: **desde la noche del 17 la entrega es errática**, con Resend marcando `delivered` todos los que se contrastaron: unos se abren, otros caen en spam y al menos uno no aparece en ninguna carpeta. El diagnóstico y lo que falta, en Q-29.*

⚠ **`Delivered` en Resend significa que el servidor del destinatario aceptó el mensaje, no que el
usuario lo vea.** Dónde lo coloca después —Bandeja de entrada o Correo no deseado— lo decide
Microsoft, y Resend no lo sabe. **Es un instrumento que mide el tramo hasta la puerta, no hasta la
persona.**

## 5. El CAPTCHA del login · Turnstile *(H-9)*

**Por qué hace falta:** pedir un magic link sale **del navegador directo a `supabase.co`**, y el tope de
correos por hora *(§4.5)* es **uno para todo el proyecto**. Sin CAPTCHA, cualquiera lo agota pidiendo
enlaces para correos inventados, y **nadie entra durante esa hora**. **Turnstile es de Cloudflare pero
NO exige tener el DNS en Cloudflare** *(§2)*.

**El código ya está preparado** *(2026-09-18)*: sin la variable de abajo, el login funciona exactamente
como antes. Con ella, pinta el widget y el botón espera al token.

### 5.1 El orden, y el que está mal deja a todos fuera

1. **Cloudflare → Turnstile → *Add widget*.** Nombre `upc-inventario`; *Hostnames*
   `dispositivos.ccnode.net` **y `upc-inventario.netlify.app`** *(el segundo, añadido el 2026-09-23: ver
   el aviso de abajo)*; modo **Managed**. Cloudflare da **dos claves**: la *site key*, pública, y
   la *secret key*.
2. **Netlify → Environment variables:** `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = la *site key*. ⚠ Es
   `NEXT_PUBLIC_`, así que **se inlinea al compilar**: hace falta un **deploy nuevo** después de ponerla.
   La *secret key* **no** va a Netlify.
3. **Desplegar, y comprobar que el widget aparece** en `https://dispositivos.ccnode.net/login` y que el
   enlace se sigue pidiendo bien. **Todavía con el CAPTCHA apagado en Supabase**: el token viaja y
   Supabase lo ignora.
4. **Recién entonces, Supabase → Authentication → Attack Protection → *Enable Captcha protection*:**
   proveedor **Turnstile** y la *secret key*.

⚠ **Si el paso 4 se da antes que el 3, NADIE puede pedir su enlace**: Supabase exige un token que el
sitio publicado todavía no manda. Medido en local: sin token responde **`400 captcha_failed`**, *«no
captcha_token found»*.

⚠ **Y desde el paso 3, un hostname que no esté en el widget se queda sin login, AUNQUE el CAPTCHA siga
apagado en Supabase** *(medido el 2026-09-23)*. El botón espera el token, y el widget no lo da fuera de su
lista. `upc-inventario.netlify.app/login` sirve el login directamente —no redirige, a diferencia de
`ccnode.net` y `www.ccnode.net`— y muestra *«No se pudo cargar la verificación anti-bots»*, con el botón
deshabilitado. **Le pasa también a cada Deploy Preview**, `deploy-preview-N--upc-inventario.netlify.app`:
ese hostname cambia en cada PR, así que **el login no se puede probar en un preview**. ✅ **`netlify.app` se
añadió al widget el mismo día**: token de 773 caracteres y botón habilitado. Los previews siguen sin login.

### 5.2 Verificar por el efecto, con control negativo

- **Positivo:** pedir un enlace desde el sitio → «Revisa tu correo», y el correo llega.
- **Negativo:** pedir un enlace **sin** token —`POST /auth/v1/otp` a mano, sin `captcha_token`— → tiene
  que dar **400 `captcha_failed`**. Es lo que demuestra que el CAPTCHA está encendido y no sólo pintado.

*Medido el 2026-09-18 **en local**, con las claves de prueba que publica Cloudflare —la que siempre
pasa—: el negativo dio `400 captcha_failed`; en un navegador real contra el build de producción, el botón
empezó deshabilitado, se habilitó al llegar el token, el enlace se pidió y salió «Revisa tu correo», con
**0 violaciones de CSP**. El widget es un iframe de `https://challenges.cloudflare.com`, y por eso la CSP
lleva `frame-src` hacia ese origen y sólo hacia ése. ~~**En producción no está medido todavía.**~~*

✅ **Medido en producción el 2026-09-23, con el orden del §5.1.** En `dispositivos.ccnode.net/login` el
widget dio un token de 752 caracteres y habilitó el botón, sin violaciones de CSP propias. El negativo dio
**`400 captcha_failed`** —*«no captcha_token found»*—, y los logs de Auth lo registran. El positivo: un
enlace pedido desde el sitio y canjeado, con `/otp` 200 y `/verify` 200.
