# UPC-Inventario

Sistema de reserva y préstamo de equipamiento para alumnos UPC. En migración de React/Vite a Next.js,
reconstruyendo primero la base de datos.

> **Fuente de verdad del estado: [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).**
> Leerlo antes de tocar nada. Contiene las decisiones (D-n), los pendientes (Q-n), el plan por fases y la
> bitácora. Complementos: `ESPECIFICACION_FUNCIONAL.md` describe *qué hace* el sistema,
> `FASE_1_DISENO.md` *cómo se construye* la base de datos nueva, `FASE_2_DISENO.md` *cómo se construye* la
> aplicación Next.js, y `PLANES/` guarda el desglose paso a paso de cada tanda. **Los planes no se
> reescriben tras ejecutar:** lo que la ejecución desmiente va en una cabecera de correcciones, para no
> borrar lo aprendido.

@AGENTS.md

> `AGENTS.md` lo generó `create-next-app` y son las reglas oficiales de **Next.js 16**, que abre avisando
> «*This is NOT the Next.js you know*» y remite a los docs de la versión instalada en
> `node_modules/next/dist/docs/`. Se conserva porque este proyecto ya pagó ese aviso a mano: el archivo de
> proxy se llama `proxy.ts` y no `middleware.ts` desde la 16, y se descubrió midiendo.

## Cómo se trabaja

**Claude no escribe en el remoto.** Nada de `git push`, PRs, merges, ramas remotas ni protecciones de rama.
Trabaja en local y **entrega los comandos listos para PowerShell**, que ejecuta Alejandro, con una línea
explicando qué hace cada uno.

**Excepción de solo lectura:** `gh run list`, `gh run view --log-failed`, `gh pr checks`, `gh pr view`,
`gh api` sobre endpoints de lectura y `git ls-remote`, para diagnosticar el CI sin copiar y pegar salidas.

**Comandos para PowerShell 5.1:**

- Sin `&&` ni `||`. Encadenar con `;` o `if ($?) { }`.
- **Nada de here-strings `@'...'@`**: al pegarlos en la consola interactiva, el prompt de continuación
  rompe el bloque. Para mensajes de commit largos, varios `-m` seguidos en una sola línea.
- Un comando por línea, cada uno en su propio bloque, para poder copiarlos de a uno.
- Comillas simples cuando el texto lleve `<`, `>` o `*`.

**Los documentos de registro se actualizan sobre la marcha**, al cerrar cada tarea, no al final. Las
decisiones se numeran `D-n` con fecha; lo aplazado entra como `Q-n` con el motivo. Un hallazgo que
contradice la auditoría previa se registra como corrección explícita, no reescribiendo el original.

**Cerrar las ediciones de documentación antes de pasar comandos de git**, nunca después: si no, quedan
cambios sin versionar que bloquean el siguiente `checkout`.

## Ramas

Gitflow: `main` (producción) · `develop` (integración) · `feature/*` `fix/*` `docs/*` `hotfix/*`.
Sin commits directos a `main` ni `develop`; todo entra por PR.

**En el remoto solo viven `main` y `develop`** *(D-29)*. Una rama se borra al mergearla. Lo que no está
integrado se congela antes en un tag anotado, nunca se borra a secas: si la rama es la única referencia
que sostiene un commit, borrarla lo pierde. Tags vivos: `legacy/vite-final` y `legacy/refactor-marzo`.

## Entorno

| | |
|---|---|
| Supabase | Proyecto canónico `zqfkzgdyeqxzgzpxgadi`. **Hiberna**: si un comando falla, reintentar |
| Migraciones | Solo por CLI versionada. Nada de SQL suelto |
| Docker Desktop | Instalado. Debe estar **arrancado** para `supabase db pull` y `supabase start` |
| Stack local | `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo**: falla si se arrancó con `-x`. Pruebas: `npx supabase test db` |
| Shell | PowerShell 5.1 |

## Estado

**Fases 0 y 1 cerradas, y la base de datos está terminada del todo.** La Fase 1 dejó 19 migraciones y 124
aserciones pgTAP; la **tanda 0 de la Fase 2** añadió las dos últimas migraciones del proyecto: **21
migraciones, 135 aserciones en 22 archivos**, las 13 tablas con RLS y políticas. ⚠ **Corregido el
2026-08-07:** la tanda 1 añadió **una migración más, la 22** *(D-32, el enganche de dominio)*, así que hoy
son **22 migraciones y 142 aserciones en 23 archivos**. Diseño en
`MIGRATION_DOCS/FASE_1_DISENO.md`, ejecutado en cuatro tandas con un PR cada una, más un arreglo posterior.

| Tanda | Contenido | Estado |
|---|---|---|
| 0 | Entorno local: `supabase init`, `config.toml`, `seed.sql`, pgTAP en el CI | ✅ cerrada |
| 1 | Identidad y autorización: `staff_members`, privilegios por columna, RLS completa, trazabilidad | ✅ cerrada |
| 2 | Reglas de reserva: RPC única, `EXCLUDE` anti-solape, máquina de estados, sanciones | ✅ cerrada |
| 3 | Derivados, avisos del linter, pruebas y limpieza de los SQL sueltos | ✅ cerrada |

**Las 19 migraciones están empujadas al remoto** *(D-17, hecho el 2026-08-05)*. `migration list` muestra
`Local` y `Remote` idénticos, el catálogo sobrevivió intacto —34 productos, 92 unidades— y `app_settings`
llegó con su fila. Los tres avisos originales del linter desaparecieron.

**Los advisors, ya con señal limpia, dejaron esto** (verificado tras el arreglo: bajaron de 11 avisos a 5):

- ✅ **Seis funciones de trigger estaban expuestas como RPC** en `/rest/v1/rpc/...`, porque `PUBLIC` recibe
  `EXECUTE` por defecto y solo se le revocó a las cinco RPC de verdad. **Cerrado** revocándoselo a las seis.
- **Quedan 5 avisos, y se quedan a propósito:** que `authenticated` pueda ejecutar `create_reservation`,
  `cancel_reservation`, `available_units` y las dos `admin_set_*` es el diseño entero. Cada una comprueba la
  autorización por dentro.
- **22 avisos de rendimiento**, todos prematuros: la base nunca ha servido una consulta. Ver Q-13.

~~**Sembrar el primer admin es tarea de la Fase 2, no de ahora.** `auth.users` está vacío porque nada usa
Supabase Auth todavía; se conecta en la tarea 2.4. Antes de eso, el `insert ... select` no encontraría a
nadie e insertaría cero filas **sin dar error**.~~ ⚠ **Al día 2026-08-07:** la tarea 2.4 ya está hecha —la
tanda 1 conectó Supabase Auth—, así que la siembra ya es posible. Sigue pendiente de ejecutarse, y la
comprobación previa **no** es que la fila exista sino que `email_confirmed_at` no sea `NULL`: la fila de
`auth.users` nace al **pedir** el magic link, no al abrirlo.

## Fase 2 en marcha

**Diseño escrito el 2026-08-06: `MIGRATION_DOCS/FASE_2_DISENO.md`.** Cinco tandas, una por perfil, un PR
cada una *(D-27)*: **T0** cimientos, **T1** sesión, **T2** alumno, **T3** personal, **T4** endurecimiento.
Decisiones D-19 a D-32; cerrados Q-7, Q-11, Q-12 y **Q-15**; abierto Q-14; **Q-16 respondido y aplazado**
—no dan acceso al tenant de Entra ID, así que Microsoft queda fuera—.

**Plan de la T1 escrito el 2026-08-06: `MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md`.** Once tareas y seis
correcciones al diseño. **Dos cambios de alcance decididos al escribirlo:** **Microsoft sale** —el acceso
al tenant de Entra ID de la UPC es poco probable, y queda como **Q-16**—, y **D-32 cierra la puerta del
dominio un paso antes**, con un enganche *Before User Created* que rechaza el registro si el correo no es
`@upc.edu.pe`. **Eso es la migración 22, y contradice a propósito el «ninguna tanda vuelve a tocar SQL»
de la T0:** la frase se corrige fechada al cerrar la tanda, no se borra.

**T0 cerrada el 2026-08-06.** Ocho commits numerados, 0.1 a 0.8. El árbol Vite fuera —121 archivos, 18.633 líneas— y el de
Next.js 16 en pie: App Router, TypeScript **estricto**, Tailwind 4, shadcn 4 sobre Radix, tipos generados,
CI adaptado. Las dos últimas migraciones del proyecto *(D-19, D-20)*: **21 migraciones y 135 aserciones
pgTAP**. ~~**Desde aquí ninguna tanda vuelve a tocar SQL.**~~ ⚠ **Falso desde el 2026-08-07:** D-32 añadió
la migración 22, con la decisión tomada y el costo dicho por delante. Correcciones en
`MIGRATION_DOCS/PLANES/FASE_2_TANDA_0.md`.

**T1 CERRADA y mergeada el 2026-08-08.** PR #21, merge en `895e1625`, **cuatro corridas de CI y las cuatro
verdes**. Está escrito y medido todo el código de la
sesión: `.gitattributes` *(cierra Q-15)*, el `.env` en `NEXT_PUBLIC_` con la clave publicable, la
**migración 22** del enganche de dominio ya en el remoto *(D-32)*, los tres clientes de `@supabase/ssr`,
`proxy.ts` con **lista blanca** —se declara lo público y todo lo demás pide sesión—, `/login` con magic
link, el canje en `/auth/confirm`, `/auth/error`, `/auth/signout`, el reparto por perfil y
`/completar-perfil`. **Cierra P0-3.** El **primer administrador ya está sembrado** en el proyecto real, y el
flujo se probó entero en un navegador de verdad: entrar, completar el perfil y caer en `/admin/inventario`.
Las **48 correcciones** al plan están en `MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md`. **Siguiente: T2, el
alumno** — landing, catálogo, el calendario, reserva y panel.

**Cinco fallos de la T1 pasaron con `typecheck`, `lint` y `build` en verde, y ninguna herramienta avisó:**
el enganche de dominio **desactivado en los contenedores** —`db reset` no aplica el `config.toml`, hacen
falta `stop` y `start`—; `npm run dev` **hablando con producción** por falta de un `.env.local`, que no se
versiona; el canje **cambiando de host** en la redirección y tirando la sesión, porque las cookies se
guardan por host y ni `new URL(request.url).origin` ni `request.nextUrl` lo conservan; y la **plantilla de
correo de fábrica** mandando el enlace a Supabase en vez de a la aplicación; y **los chunks de `/_next/*`
respondiendo `403` a un navegador y `200` a `curl`** *(D-33)*, que dejó la aplicación inutilizable en un
navegador durante ocho tareas en verde. **Son fallos de a qué se conecta el código, no de qué dice.** Lo
único que los encontró fue pedir el flujo entero y mirar el resultado.

**Y el quinto enseña algo que los otros cuatro no:** `curl` no manda cabecera `Origin` y un navegador sí,
así que **la herramienta de prueba era más privilegiada que el usuario final**. Quince sondas HTTP en verde
no significaban que la pantalla funcionara. Cuando se prueba por HTTP, la pregunta es qué manda el cliente
real que la sonda no manda.

**La T0 estuvo a punto de entrar sin CI** *(D-31)*, por una caída mayor de GitHub Actions que duró todo el
2026-08-06. **Acabó teniéndolo entero:** Actions drenó su atrasado hacia las 23:26 UTC y corrió los dos
workflows sobre cada commit, el merge en `develop` incluido. **Diez corridas, las diez verdes.** D-31 se
conserva anotada: el criterio vale para la próxima caída, pero la deuda no llegó a existir. **Q-15 sigue
abierto** y es el primer candidato de la T1: falta un `.gitattributes` con `eol=lf`.

**Estado del árbol tras la T0:** `app/` con el andamio y **ninguna pantalla de negocio** —`/` es un
marcador de posición, la landing es la tarea 2.5—, `components/ui/` con `button` y `card`, `lib/utils.ts`
y `lib/database.types.ts` *(generado, nunca a mano)*. El **lint bloquea** el CI desde esta tanda; la
auditoría de dependencias no, hasta la T4, aunque el árbol nuevo reporta **0 vulnerabilidades**.

**Tres trampas que la T0 midió, y ninguna daba error.** Cuando un paso invoca una herramienta que
*genera* código, hay que comprobar qué escribió:

1. **`shadcn init` pisa los tokens por cascada.** Inyecta su paleta en `oklch` **al final** de
   `globals.css` y gana el último: `--primary` pasó de rojo UPC a gris casi negro con el build en verde.
   De ahí **D-30** —los tokens se escriben en formato de color completo, `hsl(356 95% 45%)`—. También
   enganchó la fuente Geist contra D-23 y se instaló como dependencia de producción.
2. **`create-next-app` genera su propio `CLAUDE.md`.** Copiar con `-Force` habría borrado este archivo.
   Su `AGENTS.md` sí se conserva: son las reglas de Next.js 16 y están enlazadas arriba.
3. **`typecheck` es `next typegen && tsc --noEmit`, no `tsc` a secas.** Next 16 tipa las rutas,
   `LayoutProps` se genera desde `app/` y vive en `.next/`, que está en `.gitignore`. Con `tsc` solo, el
   CI falla en un runner limpio aunque en local pase.

**Lo único que hay que no estropear: la autorización ya vive en la base.** Ningún control del cliente es
un control. El proxy redirige, el layout es comodidad, el componente oculta, y **quien decide es RLS**. Si
quitar una comprobación del cliente abre un agujero, estaba en el sitio equivocado. Corolario verificado:
**la aplicación nunca usa `service_role`** — si un flujo la necesita, no falta una clave, falta una
política.

**Cuatro cosas medidas al diseñar, y las cuatro contradicen lo que uno escribiría de memoria:**

1. **Next.js 16 renombró `middleware.ts` a `proxy.ts`.** Y su documentación dice que el proxy *no* es una
   solución de sesión ni de autorización: solo chequeos optimistas.
2. **Supabase ya no recomienda `getUser()` sino `getClaims()`** para proteger páginas. `getSession()` no
   revalida la cookie: usarlo para decidir es **P0-3 otra vez**, con otro nombre.
3. **El proyecto firma con ES256**, medido contra su JWKS, así que `getClaims()` verifica en local con
   WebCrypto. Con HS256 sería una llamada de red por petición.
4. **El cliente de servidor de `@supabase/ssr` se crea por petición, nunca en el ámbito del módulo.** Un
   singleton lleva las cookies de una petición y termina sirviéndole a un alumno la sesión de otro.

**Al escribir SQL de la Fase 1, seis reglas que costaron un fallo cada una:**

1. A los helpers de política se les **concede** `EXECUTE`; revocarlo rompe la política. **A una función de
   trigger, en cambio, se le revoca**, y el trigger sigue disparando: a un trigger lo invoca el motor,
   mientras que una política se evalúa como el usuario que consulta. Las dos cosas están medidas.
2. Una política que consulta otra tabla protegida necesita un helper `SECURITY DEFINER` o entra en
   recursión.
3. Falta de privilegio lanza `42501`; falta de política deja el `UPDATE` en cero filas **sin error**. Las
   pruebas comprueban el efecto, no la excepción. **Y ampliar un `GRANT` cambia el modo de fallo de quien
   no debería tenerlo:** conceder algo a `authenticated` se lo concede también a los alumnos, así que una
   prueba con `throws_ok` que hoy es correcta puede dejar de serlo mañana.
4. **`SET LOCAL` en una migración no hace nada:** la CLI aplica cada archivo fuera de un bloque de
   transacción. Lo que dependa del `search_path` se cualifica con esquema.
5. Cuando varias reglas rechazan la misma entrada, **contesta la más fundamental**: ordenar mal las
   validaciones de una RPC da mensajes ciertos e inútiles.

El código Vite está congelado en el tag `legacy/vite-final` y se borra en la Fase 2; se recupera con
`git show legacy/vite-final:<ruta>`.
