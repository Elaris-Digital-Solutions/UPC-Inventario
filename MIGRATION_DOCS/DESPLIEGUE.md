# Despliegue · Netlify y Cloudflare

> **Fuente de verdad del estado del proyecto: [`ESTADO_Y_PLAN.md`](./ESTADO_Y_PLAN.md).**
> Este documento no lleva estado ni recuentos: es **operativo** y se consulta **por tarea**, no por
> fase. Lo que aquí se decide queda registrado como decisión allí.

**Escrito el 2026-08-23**, al cerrar los siete huecos de la auditoría de seguridad. Cubre el paso que
falta para que el Next.js exista en internet, y el orden importa: **Netlify primero, Cloudflare
después**, porque Cloudflare necesita un origen al que apuntar.

---

## 0. Lo que hay que saber antes de tocar nada

### El sitio viejo ya no existe, y `main` sigue teniendo su configuración

⚠ **Alejandro eliminó el sitio de Netlify el 2026-08-24.** `upc-inventario.netlify.app` ya no
responde y **no hay nada que reutilizar**: el sitio se crea nuevo. Lo que queda de aquello es lo que
sigue versionado en `main`.

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
| Inundación volumétrica (L3/L4) | **Cloudflare**, y sólo Cloudflare |
| Abuso de una ruta cara por alguien autenticado | El código — `pedir_firma_cloudinary()`, `daily_limit_per_product`, los topes de H-1 |
| Texto de 500 MB en una columna | **La base** *(H-1)*. Cloudflare no mira el cuerpo de un `POST` autenticado |
| Bots que raspan el catálogo | Cloudflare |

**Nada de lo que se configure en Cloudflare sustituye a los topes de la base.** Son capas distintas
sobre problemas distintos.

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

*Site configuration → Environment variables.* Son siete, y **una es un secreto de verdad**:

| Variable | Valor | Nota |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zqfkzgdyeqxzgzpxgadi.supabase.co` | Pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | La clave publicable | Pública, viaja al navegador |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | El cloud name | Pública |
| `CLOUDINARY_API_KEY` | La API key | **Sin** `NEXT_PUBLIC_` |
| `CLOUDINARY_API_SECRET` | El secreto | ⚠ **Secreto. Marcar como *secret* en Netlify** |
| `CLOUDINARY_FOLDER` | La carpeta | — |
| `SENTRY_DSN` | El DSN, cuando exista | **Sin** `NEXT_PUBLIC_`; vacía no rompe nada |

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

- **Site URL:** la URL del sitio desplegado.
- **Redirect URLs:** añadir esa URL. `http://127.0.0.1:3000` se queda para el desarrollo local.

**Sin esto, entrar desde el sitio desplegado manda el enlace a `127.0.0.1` y no funciona para nadie**
— y el fallo no da error: el correo llega, el enlace existe, y al pulsarlo no lleva a ninguna parte.

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

---

## 2. Cloudflare

**No se puede configurar hasta que haya dominio.** Cloudflare funciona haciendo de intermediario para
un nombre de dominio; sin uno, no hay nada que interceptar. Lo de abajo queda listo para el día que
llegue el definitivo.

### 2.1 El orden, que no es intuitivo

1. **Añadir el dominio a Cloudflare** (*Add a site*). Cloudflare escanea los DNS existentes.
2. **Cambiar los nameservers** en el registrador al par que Cloudflare indique. Tarda de minutos a 24 h.
3. **En Netlify**, añadir el dominio personalizado (*Domain management → Add a domain*).
4. **En Cloudflare**, crear el registro DNS hacia Netlify **con la nube naranja activada** (proxied).
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
IP. `/auth` no tiene nada delante salvo los límites de Supabase, y es la única puerta que un anónimo
puede aporrear.

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
