# UPC-Inventario

Sistema de reserva y préstamo de equipamiento para alumnos UPC. En migración de React/Vite a Next.js,
reconstruyendo primero la base de datos.

> **Fuente de verdad del estado: [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).**
> Leerlo antes de tocar nada. Contiene las decisiones (D-n), los pendientes (Q-n), el plan por fases y la
> bitácora. Complementos: `ESPECIFICACION_FUNCIONAL.md` describe *qué hace* el sistema,
> `FASE_1_DISENO.md` *cómo se construye* la base de datos, `FASE_2_DISENO.md` *cómo se construye* la
> aplicación Next.js, y `PLANES/` guarda el desglose paso a paso de cada tanda. **Los planes no se
> reescriben tras ejecutar:** lo que la ejecución desmiente va en una cabecera de correcciones.

@AGENTS.md

> `AGENTS.md` lo genera `next dev` y son las reglas oficiales de **Next.js 16**, que abre avisando «*This is
> NOT the Next.js you know*» y remite a `node_modules/next/dist/docs/`. **Se conserva porque este proyecto ya
> pagó ese aviso a mano:** el archivo de proxy se llama `proxy.ts` y no `middleware.ts` desde la 16, y se
> descubrió midiendo.

**Vale el `CLAUDE.md` global** *(`~/.claude/CLAUDE.md`)*. Lo de abajo son las reglas de negocio y **las
desviaciones**, con su motivo.

## Reglas de negocio

**Las veinte están escritas y numeradas** en [`MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md`](./MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md)
**§6**, como `BR-01` a `BR-20`. **Aquí no se copian** — una tercera copia diverge.

> ⚠ **Ese documento es un retrato fechado del sistema React/Vite que se borró**, no de la app actual. Cuatro
> de sus reglas fueron reemplazadas y **la tabla de §6 no lo dice**: `BR-03` *(admin hardcodeado)* → **D-2**,
> dos roles con cuenta propia; `BR-10` *(ventana semanal)* → **D-3**, ventana móvil de 7 días validada en la
> base; `BR-06` *(1 a 4 horas)* → **D-1**, máxima por producto; y `BR-01` se cierra ahora en el enganche y no
> en el cliente *(**D-32**)*.

**Lo que tiene que estar delante en cada sesión, porque es caro si se pasa por alto:**

- **Solo entran correos `@upc.edu.pe`**, y se cierra **en el enganche, no en la app**.
- **No hay contraseñas: se entra sólo por magic link**, porque lo pidió el cliente. De ahí que
  `auth_leaked_password_protection` quede desactivado **por producto y no por descuido**.
- **La autorización vive en la base.** Ninguna queda en el cliente.
- ⚠ **La baja de personal es desactivar, NUNCA borrar** — borrar pierde la constancia de que esa persona fue
  personal y con qué rol. Y **nadie puede cambiarse el rol a sí mismo**.

## Qué hace este proyecto distinto del global

| Desviación | Motivo |
|---|---|
| **En el remoto solo viven `main` y `develop`** *(D-29)*. Lo no integrado **se congela en un tag anotado** antes de borrar la rama | Si la rama es la única referencia que sostiene un commit, borrarla lo pierde. Tags vivos: `legacy/vite-final` y `legacy/refactor-marzo` |
| **Migraciones solo por CLI versionada.** Nada de SQL suelto | Es lo que permite que `migration list` compare local contra remoto |
| ⚠ **El E2E corre en cada PR**, además de al empujar a `develop` | El global recomienda **no** en cada PR, por minutos y por *flakiness*. Aquí se decidió así y **vive en su propio workflow** *(D-63)*. Sin revisar |

## Decisiones vigentes que el código no explica

*Punteros. La decisión entera, con su porqué, está en `MIGRATION_DOCS/ESTADO_Y_PLAN.md`.*

- **D-32** — el dominio se cierra en el enganche, no en la app. Es la migración 22.
- **D-63** — el E2E va en workflow propio y no como paso de `ci.yml`.
- **D-66** — la protección de contraseñas filtradas se cierra por producto: no hay contraseñas.

## Trampas medidas en este proyecto

1. ⚠ **El `seed.sql` local no es una muestra de los datos reales.** `products.featured` vale `true` en 2 de
   sus 4 productos locales y **`false` en los 34 de producción**. Una vitrina filtrada por esa columna se ve
   llena en local y **vacía en el sitio real**, con `typecheck`, `lint`, `build` y el recorrido en navegador
   **todos en verde**, porque el recorrido se hace contra local. *Leer el esquema dice qué columnas existen;
   solo consultar dice qué hay dentro.*
2. **La fila de `auth.users` nace al PEDIR el magic link, no al abrirlo.** Comprobar que el usuario existe no
   sirve: hay que comprobar que `email_confirmed_at` no sea `NULL`.
3. **La base de producción nunca ha corrido `ANALYZE` ni autovacuum**, así que el planificador decide sin
   estadísticas y **«índice sin usar» no mide utilidad**. Cualquier reevaluación de advisors **empieza por
   correr un `ANALYZE`**.
4. **Supabase hiberna.** Si un comando contra el remoto falla, reintentar antes de diagnosticar.
5. **`db reset` exige el stack completo:** falla si se arrancó con `-x`. Y **Docker Desktop tiene que estar
   arrancado** para `supabase db pull` y `supabase start`.

## Cómo se levanta y cómo se prueba

Proyecto canónico de Supabase: `zqfkzgdyeqxzgzpxgadi`.

```powershell
npx supabase start
```

```powershell
npx supabase db reset
```

```powershell
npx supabase test db
```

| Qué | Comando |
|---|---|
| Desarrollo | `npm run dev` |
| Lint · typecheck · tests | `npm run lint` · `npm run typecheck` · `npm test` |
| Build | `npm run build` |
| E2E | `npm run test:e2e` |

**Antes de tocar el esquema:** la migración pasa por el stack local en Docker y por `npx supabase test db`.
Nunca se aplica al remoto sin eso.

## Estado

**Remite y no cuenta:** [`MIGRATION_DOCS/ESTADO_Y_PLAN.md`](./MIGRATION_DOCS/ESTADO_Y_PLAN.md).

> ⚠ **Este bloque no lleva recuentos ni fases «en marcha», y el motivo es de este archivo.** Aquí había
> **385 líneas** de estado e historia de fase: el recuento de migraciones se corrigió **cinco veces**
> —así se numera el propio documento— y el de tandas **dos** *(cinco → seis → siete)*. Verificado antes de borrarlas: de **426 hechos comprobables, 421 ya vivían en
> `MIGRATION_DOCS`**, y los 5 restantes eran rutas de archivo. **No se corrige mejor: no se tiene el dato
> aquí.**
