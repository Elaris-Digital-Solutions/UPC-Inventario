# Fase 2 · Tanda 0 — Cimientos · Plan de implementación

---

## ⚠ Correcciones tras ejecutar — 2026-08-06

> **El plan de abajo no se reescribe.** Esto es lo que la ejecución desmintió, y se anota aquí para no
> borrar lo aprendido. Ejecutado el 2026-08-06 en las ocho tareas.

### Los cuatro puntos a verificar, resueltos midiendo

| # | Respuesta | Evidencia |
|---|---|---|
| **1** | **`create or replace` conserva el `revoke`: sí.** | Medido en local con una función sonda: antes del replace `anon = f`, después `anon = f`. **Y el contraejemplo también:** `drop` + `create` la devuelve a `anon = t`. Por eso la migración de D-19 no lleva un `drop` delante — no era una precaución teórica |
| **2** | **Ninguna función de `public` es ejecutable por `anon`.** | Las cinco RPC con `anon = f`, `auth = t`, y nada más en la lista. El conteo de la aserción nueva da cero, y pasó ya en la primera corrida |
| **3** | **`gen types --local` funciona con el stack recortado.** | Medido parando el contenedor `postgres-meta` y volviendo a generar: la CLI anuncia `Connecting to db 5432` y sale por conexión directa. **El paso va en `db.yml` sin devolverle ningún servicio.** Simulado además el `diff -u` completo: limpio |
| **4** | **Tailwind 4 + shadcn 4 + Next.js 16 se llevan bien.** No se baja a 3.4. | Build limpio, y el `<Button>` hereda el rojo UPC sin tocarle nada: `--primary` resuelve a `#e00614`, y a `#f90617` dentro de `.dark`. La fricción no fue de compatibilidad sino de **formato de tokens** → D-30 |

### Lo que el plan decía y no era cierto

1. **`19_function_hardening.sql` ya tenía `plan(3)`, no `plan(2)`.** Sube a `plan(4)`. El plan contó mal:
   el archivo tenía tres aserciones —dos de `search_path` y una de funciones de trigger—, no dos.

2. **Fallaron las cuatro pruebas de `28_duration_slot.sql`, no dos.** El plan predecía que la tercera y la
   cuarta pasarían ya. Ninguna de las dos razones era la esperada, y la segunda es la interesante:
   - La **cuarta** falla porque `min_duration_minutes` valía **15**, así que 20 minutos *sí* entraba en
     rango y la reserva se creaba. El plan razonó como si el mínimo ya fuera 30.
   - La **tercera** falla **en cascada por culpa de la segunda**: como 45 minutos hoy se acepta, esa
     llamada crea una reserva real y consume el cupo diario del producto, así que la de 30 minutos recibe
     `Ya tienes una reserva de este producto para ese dia`. **Las aserciones de un archivo pgTAP comparten
     una sola transacción**, así que una prueba que hoy «pasa de más» contamina a la siguiente. Al aplicar
     D-19 las cuatro pasan, sin tocar la prueba.

3. **`29_available_slots.sql`, tal como lo trae el plan, no puede funcionar.** Inserta el día inhabilitado
   **después** de `set local role authenticated`, y un alumno no inhabilita días: RLS lo rechaza con
   `new row violates row-level security policy for table "disabled_days"`. Corregido sacando el `insert`
   fuera del rol. **Las cuatro aserciones anteriores ya habían pasado**, así que el fallo era de la prueba
   y no de la función. Que haga falta salir del rol para montar el escenario es, de paso, la prueba de que
   la política está puesta.

4. **El total no es 134 aserciones sino 135.** El plan olvidó contar la aserción de cobertura que añade la
   propia Task 1.

5. **Matiz de la Task 2 Step 2:** el plan espera ver el error seis veces. Se ve **una**: psql aborta la
   transacción en el primer `function ... does not exist` y el resto no llega a ejecutarse.

6. **`--src-dir=false` no es un flag válido** de `create-next-app`. El correcto es **`--no-src-dir`**.

7. **`create-next-app` genera su propio `CLAUDE.md`,** y el plan solo excluía de la copia `public/`,
   `README.md` y `.gitignore`. Con `Copy-Item -Force` **habría pisado las reglas de trabajo del proyecto**,
   sin error y sin aviso. Excluido. Su `AGENTS.md` **sí se conserva**: son las reglas oficiales de Next.js
   16, que abren avisando «*This is NOT the Next.js you know*» y remiten a los docs de la versión
   instalada. Se enlaza desde `CLAUDE.md` con `@AGENTS.md`.

8. **`typecheck` no puede ser solo `tsc --noEmit`.** Next.js 16 **tipa las rutas**: `LayoutProps<"/">` es
   un tipo *generado* a partir del árbol de `app/`, vive en `.next/`, y `.next/` está en `.gitignore`. En
   un runner limpio el paso habría fallado con `Cannot find name 'LayoutProps'`. El script pasa a ser
   `next typegen && tsc --noEmit`, verificado borrando `.next` entero.

9. **El lint necesitaba ignores propios**, y el plan no lo previó. `eslint .` recorría `dist/` —el bundle
   minificado de Vite, que **seguía en el disco** porque nunca estuvo versionado y por eso el `git rm` de
   la Task 3 no lo tocó—, `.remember/` y `supabase/.temp/`: 1.463 de los 1.672 problemas. Importa más de
   lo que parece, porque desde esta tanda **el lint bloquea**: un ignore que falte es un PR que no entra.

10. **`vitest` no venía instalado.** El script `test` del plan lo invoca y `create-next-app` no lo trae, así
    que el paso del CI habría fallado por «command not found». Instalado como `devDependency` — el diseño
    §13 ya lo prevé como arnés de la tanda 2.

11. **`tailwind.config.ts` no podía quedarse en el árbol.** Rompía el typecheck contra Tailwind 4
    (`darkMode: ["class"]` no encaja en `DarkModeStrategy`). Sale del árbol y su `theme.extend` se traduce
    a `@theme` en el CSS, que es lo que la Task 5 pedía. Se recupera con
    `git show legacy/vite-final:tailwind.config.ts`.

12. **`shadcn` 4 tiene otra API y `init` es interactivo.** No existe `--base-color`; ahora es
    `--base <base>` *(base, radix, aria)* y `--preset <nombre>` de ocho temas, sin opción «custom» por CLI.
    Se eligió **radix**, que es sobre lo que estaba construido el shadcn del Vite.

13. **`shadcn init` pisa los tokens, y en silencio.** Añade su propia paleta en `oklch` **al final** de
    `globals.css`, así que gana por cascada: `--primary` pasó de rojo UPC a `oklch(0.205 0 0)`, gris casi
    negro, y `--radius` de `0.75rem` a `0.625rem`. Sin error, sin warning, con el build en verde. También
    enganchó la fuente **Geist** como `--font-sans` en `layout.tsx` —contra D-23—, se instaló a sí mismo
    como **dependencia de producción**, y dejó tokens `--chart-1..5` apuntando a variables inexistentes.
    Todo reconciliado. **Un token pisado por cascada no se ve leyendo el archivo por arriba: hay que
    leerlo entero o mirar el CSS emitido, porque quien gana es el último.**

### Decisión nueva

**D-30 · Los tokens de diseño se escriben en formato de color completo** —`hsl(356 95% 45%)`—, no en el
HSL crudo del Vite —`356 95% 45%`—, y el `@theme` los referencia con `var(--x)` en vez de envolverlos con
`hsl(var(--x))`. **Los valores no cambian: uno a uno son los mismos.** El motivo es que shadcn 4 escribe
así, los dos formatos no conviven en un mismo `@theme`, y mantener el viejo obligaría a limpiar la
inyección de la CLI en cada `shadcn add` de las tandas 2 y 3.

### Lo que salió bien y conviene no perder

- **El grep previo a la Task 1 Step 4 no encontró nada.** Ninguna prueba de la Fase 1 usa una duración que
  D-19 invalide: las llamadas pasan 120, 60 y 300 minutos, y las tres son múltiplos de 30. El riesgo nº 1
  de la autorrevisión no se materializó, pero la comprobación costó un minuto.
- **El conteo de franjas dio 25 a la primera**, sin tocar el número de la aserción.
- **La excepción D-8 de los cuatro `.xlsx` sobrevivió** a la fusión del `.gitignore`, verificada con
  `git check-ignore`. Era el riesgo nº 2.
- **La batería pgTAP no se enteró de que se borró el Vite:** 135 en verde antes y después.

---

**Goal:** dejar el repositorio listo para construir pantallas, y **sin una sola pantalla construida**. Al
final de esta tanda el stack respira —Next.js arranca, el CI pasa, los tipos salen del esquema— y no hay
ninguna ruta de negocio. Es deliberado: todo lo que sale mal aquí sale mal barato.

**Architecture:** dos mitades que no se tocan entre sí. **La primera es SQL** y cierra la base para
siempre: las dos últimas migraciones del proyecto, con el ritmo de la Fase 1 —prueba que falla, migración
mínima, prueba que pasa—. **La segunda es JavaScript** y no existe todavía: borrar el árbol Vite entero y
levantar el de Next.js encima. Van en ese orden por dos motivos, y ninguno es estético: los tipos de la
tarea 7 tienen que salir del esquema **definitivo**, y mientras la primera mitad corre, `db.yml` sigue
verde y da señal.

**Tech Stack:** Next.js 16 (App Router) · TypeScript estricto · Tailwind 4 · shadcn/ui · `@supabase/ssr` ·
PostgreSQL 17 · pgTAP · Supabase CLI 2.111.0

---

## Global Constraints

- **La autorización no se replica.** Esta tanda no escribe ni una comprobación de permisos en el cliente.
  Si aparece la tentación, es que algo del diseño se entendió al revés *(FASE_2_DISENO.md §2)*.
- **Ninguna pantalla de negocio.** Ni catálogo, ni login, ni panel. La única página que queda es la que
  `create-next-app` genera, y sirve para ver que el stack arranca.
- Toda función nueva: `security definer set search_path = ''` y referencias cualificadas con esquema.
- A las RPC se les **revoca** `EXECUTE` a `public` y `anon`, y se les **concede** a `authenticated`. Al
  crear una función, `PUBLIC` recibe `EXECUTE` por defecto. *(Lección de la tanda 0 de la Fase 1.)*
- **`SET LOCAL` en una migración no hace nada.** La CLI aplica cada archivo fuera de un bloque de
  transacción. Lo que dependa del `search_path` se cualifica.
- Migraciones versionadas con `npx supabase migration new`. Nada de SQL suelto.
- Local: `npx supabase start` y luego `npx supabase db reset`. **`db reset` exige el stack completo.**
- **Los nombres de los scripts de `package.json` no son libres.** `ci.yml` invoca `typecheck`, `lint`,
  `test` y `build`. Si el `package.json` nuevo no los trae, el CI falla por una razón que no tiene nada que
  ver con el código.
- Mensajes de commit sin acentos. Claude no toca el remoto: el `push` y el PR los ejecuta Alejandro.

---

## Correcciones al diseño, antes de empezar

Cuatro cosas de `FASE_2_DISENO.md` que no son ciertas o están incompletas. Se anotan aquí para no
descubrirlas a mitad de la ejecución, que es lo que hizo que la tanda 3 de la Fase 1 casi no fallara.

### 1. **Es un fallo, no un matiz: `available_slots` podía ofrecer franjas que la RPC rechaza**

§11.2 filtra la ventana móvil así:

```sql
and p_date <= (now() at time zone 'America/Lima')::date + (select booking_window_days from s)
```

**Compara fechas; la RPC compara instantes.** `create_reservation` rechaza con
`p_start_at > now() + make_interval(days => booking_window_days)`. Si son las 10:00 de hoy, el día 7 entra
entero en mi filtro, pero la RPC solo acepta hasta las 10:00 de ese día: **las franjas de 10:30 a 20:00 del
séptimo día se ofrecerían y luego se rechazarían.** Es exactamente el error que la función existe para
evitar.

Se corrige usando la misma comparación que la RPC, sobre el instante y no sobre la fecha:

```sql
and g.slot_start <= now() + make_interval(days => (select booking_window_days from s))
```

> **La regla que sale de aquí, y que vale más que el arreglo:** la rejilla puede ser **más estricta** que
> la RPC, nunca más laxa. Por eso el filtro del pasado usa `g.slot_start > now()` mientras la RPC rechaza
> con `p_start_at < now()`: en el instante exacto la rejilla no lo ofrece y la RPC sí lo aceptaría. Esa
> asimetría es segura. La contraria no.

### 2. **«La última migración» son dos, no una**

§12 y la tarea 2.3-bis hablan en singular. D-19 y D-20 son dos conceptos distintos —una regla de negocio y
una función de lectura— y en la Fase 1 cada tarea fue una migración con su prueba. Se mantiene esa forma:
dos migraciones, dos archivos de prueba, dos commits.

### 3. **El lint puede volverse bloqueante en esta tanda, no en la 4**

§12 pone «lint y auditoría bloqueantes» en T4. Pero D-7 dice literalmente que el lint no bloquea *porque*
«los 59 errores viven en código que la migración elimina». **Ese motivo muere en la Task 3 de esta tanda**,
cuando ese código deja de existir. Dejarlo no bloqueante hasta T4 permitiría acumular deuda nueva durante
tres tandas, que es justo lo que D-7 no quería.

→ El lint pasa a bloqueante aquí. La **auditoría de dependencias** se queda no bloqueante hasta T4: el
árbol de Next.js acaba de nacer y conviene ver qué reporta antes de frenar con ello *(Q-10)*.

### 4. **`create-next-app` no puede andamiar sobre esta raíz**

Se niega a escribir en un directorio que ya contiene archivos que él quiere crear. Aquí chocan tres que
**se quedan**: `public/`, `README.md` y `.gitignore`. Andamiar en la raíz o falla o pisa cosas.

→ Se andamia en un directorio hermano temporal y se copia lo generado, excluyendo esos tres, que se
fusionan a mano. Detalle en la Task 4.

---

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `…_duration_slot_multiple.sql` | D-19: `min_duration_minutes` a 30 y la validación de múltiplo en la RPC |
| `…_available_slots.sql` | D-20: la rejilla del día en una llamada |
| `supabase/tests/28_duration_slot.sql` | Que 45 se rechace por múltiplo y 20 por rango — el **orden** de los mensajes |
| `supabase/tests/29_available_slots.sql` | Que la rejilla no ofrezca nada que la RPC rechace |
| `supabase/tests/19_function_hardening.sql` | Se amplía: **ninguna RPC de `public` ejecutable por `anon`** |
| `app/layout.tsx` · `app/page.tsx` · `app/globals.css` | El andamio y los tokens |
| `tailwind.config.ts` *(o `@theme` en el CSS)* | El lenguaje visual, traducido una vez |
| `lib/database.types.ts` | Generado. Nunca escrito a mano |
| `package.json` · `tsconfig.json` · `next.config.ts` · `eslint.config.mjs` | Andamio |
| `.gitignore` | **Se fusiona, no se reemplaza**: conserva las reglas de Supabase y la excepción D-8 |
| `.github/workflows/ci.yml` · `db.yml` | Adaptados |
| `README.md` | Reescrito |
| Todo lo de la lista de `FASE_2_DISENO.md` §4 | Borrado |

---

## Puntos a verificar

Los cuatro se resuelven **midiendo**, no suponiendo, y los dos desenlaces están escritos.

1. **¿`create or replace function` conserva el `revoke` sobre `create_reservation`?** La documentación de
   PostgreSQL dice que sí: reemplazar una función no cambia su propietario ni sus privilegios. Pero si no
   fuera así, la RPC de reserva volvería a publicarse en `/rest/v1/rpc/` para el rol anónimo, y **hoy nada
   lo detectaría** — `19_function_hardening.sql` solo vigila las funciones de trigger.
   → Se comprueba **antes** de escribir la migración, con la consulta del Step 0 de la Task 1.
   → **En los dos desenlaces se añade la aserción de cobertura que falta.** Si resultara que los
   privilegios no sobreviven, la migración repite el `revoke`/`grant` explícitamente al final.

2. **¿Hay hoy alguna función de `public` que `anon` pueda ejecutar y no deba?** La aserción nueva de la
   Task 1 afirma que el conteo es cero. Antes de escribirla hay que correr la consulta y ver qué devuelve.
   → `btree_gist` y `pgtap` viven en `extensions` —verificado en `20260805184306_extensions.sql` y en
   `seed.sql`—, así que `public` no debería tener funciones de extensión y el conteo debería dar cero.
   → Si diera distinto de cero por algo que no sea un defecto, la aserción se acota a las funciones cuyo
   propietario sea el del esquema, en vez de relajarse a un número mágico.

3. **¿`gen types --local` funciona con la lista recortada de servicios de `db.yml`?** Ese workflow arranca
   con `-x gotrue,realtime,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,supavisor`.
   Si la CLI introspecta la base por conexión directa, funciona; si se apoya en `postgres-meta`, no.
   → Si funciona, el paso de verificación de tipos va en `db.yml`, que ya tiene el stack en pie.
   → Si no, se le devuelve `postgres-meta` a la lista de `db.yml` —es el servicio más barato de los
   excluidos— antes que duplicar un stack entero en `ci.yml`.

4. **¿Tailwind 4 + shadcn + Next.js 16 se llevan bien?** Es la combinación más reciente del stack y la
   única pieza de esta tanda que no está bajo nuestro control.
   → Si `shadcn init` y dos componentes de prueba se instalan y renderizan con los tokens aplicados, se
   sigue con Tailwind 4.
   → Si da guerra, **se baja a Tailwind 3.4 con el `tailwind.config.ts` copiado tal cual** del Vite, que es
   el camino conocido y ya está escrito. Se decide aquí porque esta tanda no construye pantallas: dar
   marcha atrás no arrastra trabajo. Se registra como decisión sea cual sea la respuesta.

---

### Task 1: La duración es múltiplo del bloque *(D-19, cierra Q-11)*

**Files:**
- Create: `supabase/migrations/<ts>_duration_slot_multiple.sql`
- Create: `supabase/tests/28_duration_slot.sql`
- Modify: `supabase/tests/19_function_hardening.sql` — `plan(2)` → `plan(3)`

**Interfaces:**
- Consumes: `app_settings.slot_minutes`, `app_settings.min_duration_minutes`, `products.max_duration_hours`.
- Produces: `public.create_reservation(...)` con una validación más. **Misma firma**, así que ningún
  llamador cambia.

- [ ] **Step 0: Medir antes de tocar nada** *(puntos a verificar 1 y 2)*

```sql
-- Quien puede ejecutar hoy las funciones de public que NO son de trigger.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.prorettype <> 'pg_catalog.trigger'::regtype
 order by p.proname;
```

Esperado: las cinco RPC con `anon = false` y `auth = true`, y nada más en la lista. **Anotar la salida en
la cabecera de correcciones al terminar**, sea la esperada o no.

- [ ] **Step 1: Escribir las pruebas que fallan**

`supabase/tests/28_duration_slot.sql`:

```sql
-- D-19: la duracion tiene que ser multiplo de slot_minutes (cierra Q-11).
--
-- La asercion que de verdad importa es la tercera. Cuando dos reglas rechazan la
-- misma entrada hay que contestar la mas fundamental, y 20 minutos viola las dos:
-- es menor que el minimo Y no es multiplo. Si el mensaje habla del multiplo, la
-- validacion quedo en el orden equivocado.
--
-- Es la leccion de la tanda 2 de la Fase 1, donde pedir una hora de ayer se
-- contestaba por la rejilla horaria en vez de por lo evidente. Por eso estas
-- pruebas afirman el MENSAJE y no el SQLSTATE: con throws_ok sobre el codigo,
-- las tres pasarian en verde con el mensaje equivocado.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(4);

delete from public.disabled_days;


select is(
  (select min_duration_minutes::int from public.app_settings),
  30,
  'la duracion minima es un bloque entero');


set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;

-- La camara admite hasta 4 h, asi que 45 min entra en rango y solo falla por el
-- multiplo. Sin ese cuidado, la prueba pasaria por el motivo equivocado.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '10:00') at time zone 'America/Lima',
      45, 'cuarenta y cinco')$$,
  '%multiplo de 30%',
  '45 minutos se rechaza por no ser multiplo del bloque');

select lives_ok(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000001',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '15:00') at time zone 'America/Lima',
      30, 'media hora')$$,
  'un bloque exacto se acepta');

-- 20 minutos viola las dos reglas. Tiene que contestar el rango, no el multiplo.
select throws_ilike(
  $$select public.create_reservation(
      'bbbbbbbb-0000-0000-0000-000000000003',
      'cccccccc-0000-0000-0000-000000000001',
      (((now() at time zone 'America/Lima')::date + 1) + time '18:00') at time zone 'America/Lima',
      20, 'veinte')$$,
  '%rango permitido%',
  'por debajo del minimo contesta el rango, no el multiplo');

reset role;


select * from finish();

rollback;
```

Y en `supabase/tests/19_function_hardening.sql`, subir a `plan(3)` y añadir antes del `finish()`:

```sql
-- El hueco que destapo el diseno de la Fase 2: la asercion de arriba vigila las
-- funciones de TRIGGER, pero nadie afirmaba lo mismo de las RPC de verdad.
--
-- Importa ahora porque D-19 recrea create_reservation con CREATE OR REPLACE. La
-- documentacion dice que reemplazar una funcion conserva sus privilegios; si
-- alguna vez dejara de ser cierto, o si alguien la recreara con DROP + CREATE, la
-- RPC volveria a publicarse en /rest/v1/rpc/ para el rol anonimo sin que nada lo
-- notara.
--
-- btree_gist y pgtap viven en `extensions`, asi que public no tiene funciones de
-- extension que ensucien este conteo.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype <> 'pg_catalog.trigger'::regtype
      and has_function_privilege('anon', p.oid, 'EXECUTE')),
  0,
  'ninguna funcion de public es ejecutable por anon'
);
```

- [ ] **Step 2: Correr y confirmar que fallan**

Run: `npx supabase test db`
Expected: falla la primera (`min_duration_minutes` vale 15) y la segunda (45 min se acepta hoy). **La
tercera y la de cobertura deberían pasar ya**: 20 minutos ya se rechaza por rango, y las RPC ya tienen el
`revoke`. Que pasen antes es correcto — son las que vigilan que el arreglo no rompa nada.

> Si la aserción de cobertura **falla** en este punto, no se sigue: significa que el punto a verificar 2
> tenía razón y hay una función expuesta desde antes. Se investiga primero.

- [ ] **Step 3: Escribir la migración**

```sql
-- D-19: la duracion de una reserva tiene que ser multiplo de slot_minutes.
-- Cierra Q-11.
--
-- El enunciado de Q-11 estaba incompleto por dos lados, y conviene dejarlo escrito
-- porque el enunciado equivocado sigue circulando:
--
--   1. Subir min_duration_minutes a 30 NO alinea nada. 45 minutos sigue siendo
--      mayor que 30 y sigue terminando a mitad de bloque. La regla que hace falta
--      es el multiplo, no el minimo.
--
--   2. Lo que desalinea la rejilla es duracion + buffer, no la duracion sola. Con
--      buffer_minutes = 120, una reserva de 10:00 a 10:15 no bloquea hasta las
--      10:30 sino hasta las 12:15. El hueco perdido esta al final del BLOQUEO.
--
-- Lo segundo no lo cierra esta migracion: el buffer puede desalinear la cola por
-- su cuenta y un CHECK de tabla no puede leer app_settings. Queda como Q-14, con
-- riesgo nulo hoy porque los 34 productos tienen buffer 120, multiplo de 30.
--
-- La validacion va DESPUES de la comprobacion de rango, no antes. 20 minutos
-- viola las dos reglas, y contestar por el multiplo seria cierto e inutil: la
-- regla mas fundamental es que no llega al minimo. Es la leccion de la tanda 2.
--
-- CREATE OR REPLACE conserva los privilegios de la funcion, asi que el
-- revoke a public y anon de 20260806010454 sigue en pie. Medido antes de escribir
-- esto, y vigilado desde ahora por 19_function_hardening.sql.
--
-- Ver MIGRATION_DOCS/FASE_2_DISENO.md, seccion 11.1.

alter table public.app_settings
  alter column min_duration_minutes set default 30;

update public.app_settings
   set min_duration_minutes = 30
 where min_duration_minutes < 30;
```

Y a continuación, la RPC completa con el bloque nuevo insertado tras el paso 3. **Se copia entera desde
`20260806010454_create_reservation_rpc.sql`** —no se parchea de memoria— y se le añade, justo después del
`raise exception 'Duracion fuera del rango permitido para este producto';` y antes de calcular `v_end_at`:

```sql
  if p_duration_minutes % v_settings.slot_minutes <> 0 then
    raise exception 'La duracion tiene que ser multiplo de % minutos', v_settings.slot_minutes
      using errcode = 'check_violation';
  end if;
```

> **Al copiar la función, comprobar tres cosas antes de aplicar:** que la firma es idéntica —cinco
> parámetros, mismo orden, mismos tipos—, que conserva `security definer set search_path = ''`, y que
> **no** se le añade un `drop function` delante. Un `drop` + `create` sí resetea los privilegios.

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 4 nuevas de `28` pasan, la de cobertura sigue pasando, y las 124 anteriores también.

> **Una prueba anterior podría romperse, y hay que mirarla:** `23_create_reservation.sql` afirma la
> alineación del bloque de inicio. Si alguna de sus llamadas usa una duración que no sea múltiplo de 30
> —15, 45, 90 no; 90 sí lo es—, dejará de pasar por el motivo nuevo. **Buscar antes con**
> `grep -n "create_reservation" supabase/tests/*.sql` y revisar cada duración. Si alguna cae, es un
> hallazgo real: significa que había una prueba escrita sobre una duración que a partir de ahora es
> inválida, y hay que decidir si se ajusta la prueba o si la regla es demasiado estricta.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m "Fase 2 tanda 0.1: la duracion es multiplo del bloque" -m "D-19, cierra Q-11. min_duration_minutes pasa a 30 y create_reservation valida el multiplo despues del rango, no antes: 20 minutos viola las dos reglas y contestar por el multiplo seria cierto e inutil." -m "Y una asercion de cobertura que faltaba: ninguna funcion de public es ejecutable por anon. Vigilaba solo las de trigger."
```

---

### Task 2: La rejilla del día en una llamada *(D-20)*

**Files:**
- Create: `supabase/migrations/<ts>_available_slots.sql`
- Create: `supabase/tests/29_available_slots.sql`

**Interfaces:**
- Consumes: `public.available_units(...)` *(tanda 3 de la Fase 1)*, `app_settings`, `disabled_days`.
- Produces:
  `public.available_slots(p_product_id uuid, p_campus_id uuid, p_date date, p_duration_minutes int) returns table (slot_start timestamptz, free int)`,
  ejecutable solo por `authenticated`.

- [ ] **Step 1: Escribir la prueba que falla**

```sql
-- D-20: la rejilla del dia en una sola llamada.
--
-- La propiedad que se prueba no es "devuelve N filas": es que TODO lo que la
-- rejilla ofrece lo acepta create_reservation. Por eso las aserciones miran los
-- bordes -primera franja, ultima franja, dia inhabilitado, fuera de ventana- y no
-- el conteo del medio.
--
-- La rejilla puede ser mas ESTRICTA que la RPC, nunca mas laxa.
--
-- Camara: 3 unidades en Monterrico, max 4 h, buffer 120. Horario 08:00-22:00,
-- bloques de 30. Con duracion 120 la ultima franja empieza a las 20:00 y termina
-- justo al cierre: 25 franjas.

begin;

set local search_path = extensions, public, pg_catalog;

select plan(6);

delete from public.disabled_days;

set local request.jwt.claims = '{"sub":"a0000000-0000-0000-0000-000000000001","role":"authenticated"}';
set local role authenticated;


select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120)),
  25,
  'de 08:00 a 22:00 con duracion 120 salen 25 franjas');

select is(
  (select min(slot_start) at time zone 'America/Lima' from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120))::time,
  time '08:00',
  'la primera franja empieza a la hora de apertura');

-- La ultima franja mas la duracion cae exactamente en el cierre. La RPC acepta la
-- igualdad y rechaza pasarse, asi que este borde tiene que coincidir.
select is(
  (select max(slot_start) at time zone 'America/Lima' from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120))::time,
  time '20:00',
  'la ultima franja termina justo al cierre');

select is(
  (select free from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 1), 120)
    order by slot_start limit 1),
  3,
  'sin reservas, las tres camaras estan libres en la primera franja');


-- Un dia inhabilitado no devuelve franjas grises: no devuelve nada.
insert into public.disabled_days (date)
values ((now() at time zone 'America/Lima')::date + 2);

select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 2), 120)),
  0,
  'un dia inhabilitado no ofrece ninguna franja');

-- Fuera de la ventana movil de 7 dias, tampoco.
select is(
  (select count(*)::int from public.available_slots(
     'bbbbbbbb-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-000000000001',
     ((now() at time zone 'America/Lima')::date + 30), 120)),
  0,
  'fuera de la ventana movil no ofrece ninguna franja');

reset role;


select * from finish();

rollback;
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: `function public.available_slots(...) does not exist`, seis veces.

- [ ] **Step 3: Escribir la migración**

```sql
-- D-20: la rejilla del dia en una sola llamada.
--
-- Con bloques de 30 minutos de 08:00 a 22:00, pintar un dia con available_units
-- son 28 llamadas. El coste no es solo la latencia: son 28 fotos distintas de la
-- base, y la primera franja y la ultima se responden con estados diferentes.
--
-- DELEGA en available_units en vez de repetir el calculo del rango. Si las dos
-- formulas se separan, el calendario miente -es la advertencia que ya lleva
-- escrita 20260806023952_available_units.sql-.
--
-- SECURITY DEFINER por el mismo motivo medido en la tanda 3: un alumno no ve las
-- reservas ajenas, y con sus propios privilegios veria libre todo lo ocupado.
--
-- Los tres filtros no son cosmetica. La propiedad que sostiene el calendario es
-- que TODO lo que la rejilla ofrece lo acepta create_reservation:
--
--   * el pasado, con > y no >=: en el instante exacto la rejilla no lo ofrece y
--     la RPC si lo aceptaria. La rejilla puede ser mas ESTRICTA, nunca mas laxa.
--   * la ventana movil, comparando INSTANTES y no fechas. Comparar
--     p_date <= hoy + 7 ofreceria el septimo dia entero mientras la RPC solo
--     acepta hasta la hora actual de ese dia.
--   * el dia inhabilitado, que devuelve cero filas y no 28 franjas grises.
--
-- La ultima franja es closing_time - duracion, para que la reserva termine justo
-- al cierre: la RPC rechaza end_at::time > closing_time pero acepta la igualdad.
--
-- Ver MIGRATION_DOCS/FASE_2_DISENO.md, seccion 11.2, y la correccion 1 de
-- MIGRATION_DOCS/PLANES/FASE_2_TANDA_0.md.

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
     and not exists (
       select 1 from public.disabled_days d where d.date = p_date
     );
$$;

revoke execute on function
  public.available_slots(uuid, uuid, date, int) from public, anon;
grant execute on function
  public.available_slots(uuid, uuid, date, int) to authenticated;
```

- [ ] **Step 4: Correr y confirmar que pasa**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`
Expected: las 6 pasan. Total: **134 aserciones**.

> **Punto de atención al ver la primera aserción.** Si salen 24 o 26 franjas en vez de 25, no se ajusta el
> número: se mira por qué. Con apertura a las 08:00, cierre a las 22:00, bloques de 30 y duración 120, la
> serie va de 08:00 a 20:00 en saltos de media hora, que son 24 intervalos y **25 valores**. Un número
> distinto significa que un borde está mal, y ese borde es justo el que hace que el calendario mienta.

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m "Fase 2 tanda 0.2: la rejilla del dia en una llamada" -m "D-20. available_slots delega en available_units en vez de repetir la formula del rango, y filtra el pasado, la ventana movil y los feriados, para que todo lo que la rejilla ofrece lo acepte create_reservation." -m "La ventana se compara sobre instantes y no sobre fechas: comparar fechas ofrecia el septimo dia entero mientras la RPC solo acepta hasta la hora actual de ese dia."
```

---

### Task 3: Borrar el código Vite *(D-6, cierra Q-12)*

A partir de este commit el repositorio **no compila**, y es correcto: `ci.yml` solo corre sobre el PR y
sobre `develop`, así que un commit intermedio roto no dispara nada. La Task 4 lo devuelve a la vida.

**Files:**
- Delete: todo lo listado en `FASE_2_DISENO.md` §4

- [ ] **Step 1: Confirmar qué se va, antes de borrar nada**

```powershell
git ls-files | Select-String -Pattern '^(src/|server/|dist/|scripts/)' | Measure-Object -Line
```

- [ ] **Step 2: Borrar el árbol de aplicación**

```powershell
git rm -r src server scripts
```

```powershell
git rm index.html vite.config.ts vitest.config.ts eslint.config.js tsconfig.app.json tsconfig.node.json netlify.toml components.json bun.lockb
```

- [ ] **Step 3: Borrar los documentos muertos** *(cierra Q-12)*

```powershell
git rm API_EXAMPLES.md BACKEND_SETUP.md DELIVERABLES.md FRONTEND_INTEGRATION.md MIGRATION_GUIDE.md README_REFACTORING.md SUPABASE_RPC_CHEATSHEET.md SUPABASE_RPC_GUIDE.md
```

- [ ] **Step 4: Comprobar que lo que se queda sigue ahí**

```powershell
git status --short; git ls-files | Select-String -Pattern '^(supabase/|MIGRATION_DOCS/|public/|\.github/)' | Measure-Object -Line
```

Tienen que seguir: `supabase/` entero, `MIGRATION_DOCS/`, `.github/`, **`public/` con sus cinco
archivos**, `CLAUDE.md`, `README.md`, `.gitignore` y los cuatro `.xlsx`.

> **`public/` no está en la lista de borrado y es la trampa de este commit.** Parece andamiaje y es
> contenido: `Campus.png`, `campus-san-miguel.webp`, `favicon.png`, `placeholder.svg` y `robots.txt` — las
> fotos de las dos sedes y el favicon. Next.js usa esa misma carpeta para estáticos, así que ni siquiera
> hay que moverla.

- [ ] **Step 5: La batería pgTAP no debería notarlo**

Run: `npx supabase test db`
Expected: 134. Si algo cae, es que una prueba dependía de un archivo de `src/`, y eso sería un hallazgo.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "Fase 2 tanda 0.3: borra el codigo Vite" -m "D-6, y cierra Q-12 de paso: los ocho documentos de la raiz describian una arquitectura que ya no existe y enlazaban a los SQL que borro la tanda 3." -m "Sin carpeta legacy: el historial es el archivo. Se recupera con git show legacy/vite-final:<ruta>. public/ NO se borra: son las fotos de las sedes y el favicon, y Next.js usa esa misma carpeta."
```

---

### Task 4: Andamiar Next.js 16 *(2.1)*

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `app/layout.tsx`,
  `app/page.tsx`, `app/globals.css`
- Modify: `.gitignore` *(se fusiona)*, `README.md` *(se reescribe)*

- [ ] **Step 1: Andamiar fuera de la raíz** *(punto a verificar 4, corrección 4)*

`create-next-app` se niega a escribir donde ya hay archivos que él quiere crear, y aquí chocan `public/`,
`README.md` y `.gitignore`, que **se quedan**. Se andamia al lado y se copia:

```powershell
npx create-next-app@latest ..\upc-next-scaffold --typescript --tailwind --eslint --app --src-dir=false --import-alias '@/*' --use-npm
```

- [ ] **Step 2: Copiar lo generado, salvo los tres que chocan**

```powershell
Get-ChildItem ..\upc-next-scaffold -Exclude 'public','README.md','.gitignore','node_modules','.git' -Force | Copy-Item -Destination . -Recurse -Force
```

- [ ] **Step 3: Fusionar `.gitignore` a mano, no reemplazarlo**

Al bloque que ya existe se le **añade** lo de Next.js, y se le **quita** `dist`:

```
# Next.js
/.next/
/out/
next-env.d.ts
.vercel
```

> **Lo que no se puede perder de este archivo:** `supabase/.temp`, `supabase/.branches`, `*.stackdump`, y
> sobre todo **la excepción nominal de los cuatro `.xlsx` (D-8)**. Perderla haría que git los borrara del
> disco al saltar de rama — ya pasó el 2026-08-04.

- [ ] **Step 4: Arreglar los scripts de `package.json`**

`ci.yml` invoca cuatro nombres que `create-next-app` no genera todos:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run --passWithNoTests"
}
```

> **`--passWithNoTests` es deliberado y temporal.** Esta tanda no escribe ni una prueba de cliente —las
> reglas se prueban en pgTAP *(D-14)*— pero el paso del CI tiene que existir desde ya, con su sitio
> preparado para la primera prueba de la tanda 2. Un paso que no existe es un paso que nadie añade después.

Y comprobar que `tsconfig.json` trae **`"strict": true`**. El del Vite tenía `strict`, `noImplicitAny` y
`strictNullChecks` en `false`; empezar otra vez así sería repetir la deuda a propósito.

- [ ] **Step 5: Reescribir `README.md`**

Qué es el proyecto, cómo se levanta —`npm run dev` y `npx supabase start`—, y **el puntero a
`MIGRATION_DOCS/ESTADO_Y_PLAN.md` como fuente de verdad del estado**. Corto. La documentación real vive en
`MIGRATION_DOCS/`.

- [ ] **Step 6: Comprobar que arranca y compila**

```powershell
npm install
```
```powershell
npm run typecheck
```
```powershell
npm run lint
```
```powershell
npm run build
```

Expected: los cuatro en verde. **El lint tiene que salir limpio**: es lo que permite volverlo bloqueante en
la Task 7 *(corrección 3)*.

- [ ] **Step 7: Borrar el andamio temporal**

```powershell
Remove-Item -Recurse -Force ..\upc-next-scaffold
```

- [ ] **Step 8: Commit**

```
git add -A
git commit -m "Fase 2 tanda 0.4: andamio de Next.js 16" -m "App Router, TypeScript estricto -el del Vite tenia strict, noImplicitAny y strictNullChecks en false- y los cuatro scripts que ci.yml invoca." -m "Andamiado fuera de la raiz y copiado, porque create-next-app se niega a escribir donde ya hay public/, README.md y .gitignore. El .gitignore se fusiono a mano para no perder la excepcion de los xlsx (D-8)."
```

---

### Task 5: Tokens de diseño y fuentes *(2.2, D-23)*

**Files:**
- Modify: `app/globals.css` — los bloques `:root` y `.dark`
- Modify: `app/layout.tsx` — `next/font`
- Modify: `tailwind.config.ts` *(o `@theme` en el CSS, según el punto a verificar 4)*

**Interfaces:**
- Consumes: `src/index.css` y `tailwind.config.ts` del Vite, **recuperados del tag**:
  `git show legacy/vite-final:src/index.css`

- [ ] **Step 1: Copiar los tokens tal cual**

Los bloques `:root` y `.dark` enteros —paleta UPC en HSL, `--radius`, sombras, gradientes, los cinco
`--upc-*`— y las tres utilidades `.text-gradient-upc`, `.bg-gradient-upc`, `.bg-gradient-hero`.

**Lo único que no se copia es la línea 1**, el `@import url('https://fonts.googleapis.com/…')`.

- [ ] **Step 2: Las fuentes, con `next/font`**

```tsx
import { Montserrat, Playfair_Display } from 'next/font/google'

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-playfair',
  display: 'swap',
})
```

Se aplican en `<html className={`${montserrat.variable} ${playfair.variable}`} lang="es">`, y se enganchan
en la configuración de Tailwind como `sans` y `display`. **Se quita el `font-family: 'Montserrat'` literal
del `body`**, que era lo que compensaba el `@import`.

> **Los pesos son los mismos que pedía el `@import` del Vite** —300 a 800 en Montserrat, 600 a 800 en
> Playfair—, para que nada cambie de aspecto. Si se recortan, cambia el render y parecerá un fallo de la
> migración cuando sería una decisión.

- [ ] **Step 3: Traducir el `theme.extend`** *(punto a verificar 4)*

Colores que apuntan a las variables, `borderRadius` derivado de `--radius`, las dos familias tipográficas,
y las animaciones de acordeón que usa shadcn. En Tailwind 4 va como bloque `@theme` en el CSS; en 3.4, como
`tailwind.config.ts` copiado tal cual.

> **Se quita el `require("tailwindcss-animate")`**: ese `require()` en un archivo TypeScript era uno de los
> 59 errores de lint que D-7 declaró no bloqueantes. Se importa como módulo, o se usa el equivalente que
> traiga shadcn en su versión actual.

- [ ] **Step 4: Comprobar que los tokens llegan**

En `app/page.tsx`, provisionalmente, un bloque con `bg-primary`, `text-upc-red`, `font-display` y
`shadow-card`, y mirarlo con `npm run dev`. Debe verse el rojo UPC, la Playfair en los títulos y la
Montserrat en el cuerpo. **Se borra antes del commit siguiente**: esta tanda no deja pantallas.

- [ ] **Step 5: Comprobar el modo oscuro**

`darkMode: ["class"]` y una clase `dark` en `<html>` a mano. Los tokens de `.dark` tienen que aplicarse.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "Fase 2 tanda 0.5: tokens de diseno y fuentes" -m "D-23. Los bloques :root y .dark se copian tal cual del Vite: son variables CSS y no dependen del bundler." -m "Las fuentes pasan a next/font y desaparece el @import de Google Fonts: era una peticion bloqueante a un tercero y habria obligado a abrirle la CSP de la tanda 4."
```

---

### Task 6: shadcn/ui *(2.1)*

Los componentes **se regeneran, no se portan**. Las 3.954 líneas del Vite son salida de un generador.

- [ ] **Step 1: Inicializar**

```powershell
npx shadcn@latest init
```

Apuntándolo a `app/globals.css` y al alias `@/components`. **Que no sobrescriba los tokens**: si propone
su propia paleta, se conservan los de la Task 5.

- [ ] **Step 2: Dos componentes de prueba**

```powershell
npx shadcn@latest add button card
```

- [ ] **Step 3: Verificar que heredan los tokens**

Un `<Button>` tiene que salir en rojo UPC sin tocarle nada. Si sale en el gris por defecto de shadcn, es
que la Task 5 no quedó enganchada y hay que arreglarlo **aquí**, no en la tanda 2 con diez pantallas
encima.

> **Este es el momento de resolver el punto a verificar 4.** Si Tailwind 4 + shadcn + Next.js 16 no se
> entienden, se baja a 3.4 con el `tailwind.config.ts` del Vite copiado tal cual. Cuesta rehacer la Task 5
> y nada más, porque no hay pantallas construidas. **Se registra como decisión sea cual sea la respuesta.**

- [ ] **Step 4: Commit**

```
git add -A
git commit -m "Fase 2 tanda 0.6: shadcn regenerado" -m "Nativo para App Router, no portado: los componentes del Vite son salida de un generador y regenerarlos sale mas limpio que migrarlos." -m "Verificado que heredan los tokens UPC sin tocarles nada."
```

---

### Task 7: Tipos generados y CI *(2.3, D-26)*

**Files:**
- Create: `lib/database.types.ts` *(generado)*
- Modify: `.github/workflows/ci.yml`, `.github/workflows/db.yml`

- [ ] **Step 1: Generar los tipos, contra el esquema ya definitivo**

```powershell
npx supabase gen types typescript --local > lib/database.types.ts
```

Sale de las 21 migraciones, D-19 y D-20 incluidas. Por eso las Tasks 1 y 2 iban primero.

- [ ] **Step 2: Comprobar que compilan y que traen lo nuevo**

```powershell
npm run typecheck
```

Y a ojo: que `Database['public']['Functions']` incluya `available_slots` y `create_reservation`, y que
`app_settings` traiga `min_duration_minutes`.

- [ ] **Step 3: El paso de CI que impide que se separen** *(punto a verificar 3)*

En `db.yml`, después de `supabase start`:

```yaml
      # Un tipo desactualizado no rompe la compilacion: da un `any` silencioso o
      # un campo que el editor autocompleta y la base no tiene. Es el mismo modo de
      # fallo -efecto silencioso en vez de excepcion- contra el que se escribio
      # media bateria de la Fase 1. (D-26)
      - name: Los tipos coinciden con el esquema
        run: |
          supabase gen types typescript --local > /tmp/types.ts
          diff -u lib/database.types.ts /tmp/types.ts
```

> **Aquí se resuelve el punto a verificar 3.** Si `gen types --local` falla porque le falta un servicio, se
> le devuelve `postgres-meta` a la lista de `-x` de `db.yml`, que es el más barato de los excluidos, antes
> que levantar un stack entero en `ci.yml`.

- [ ] **Step 4: Adaptar `ci.yml`** *(corrección 3)*

Quitar el `continue-on-error` del paso de **lint**, y actualizar el comentario que explica por qué estaba:
el motivo de D-7 —«los 59 errores viven en código que la migración elimina»— dejó de existir en la Task 3.

La **auditoría de dependencias se queda no bloqueante** hasta T4: el árbol de Next.js acaba de nacer y hay
que ver qué reporta antes de frenar con ello *(Q-10)*.

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "Fase 2 tanda 0.7: tipos generados y CI adaptado" -m "D-26: los tipos salen de supabase gen types y un paso de db.yml comprueba que no se separen del esquema. Un tipo viejo no rompe la compilacion, miente en silencio." -m "Y el lint pasa a bloqueante: el motivo de D-7 era que los 59 errores vivian en codigo que la migracion elimina, y ese codigo ya no existe. La auditoria de dependencias sigue sin bloquear hasta la tanda 4 (Q-10)."
```

---

### Task 8: Cierre de la tanda

- [ ] **Step 1: Todo en verde, en local**

```powershell
npx supabase db reset; if ($?) { npx supabase test db }
```
```powershell
npm run typecheck; if ($?) { npm run lint }
```
```powershell
npm run build
```

- [ ] **Step 2: Cerrar 2.1, 2.2, 2.3 y 2.3-bis en `ESTADO_Y_PLAN.md`; marcar T0 como cerrada; anotar el
      conteo real de aserciones y el estado de Q-12**

- [ ] **Step 3: Registrar las decisiones que salieron al ejecutar** — como mínimo la de Tailwind
      *(punto a verificar 4)*, con su número D-n y su fecha

- [ ] **Step 4: Cabecera de correcciones en este archivo**, con los cuatro puntos a verificar resueltos y
      lo que la ejecución desmienta. **Sin ella el plan miente por omisión.**

- [ ] **Step 5: Tabla de `PLANES/README.md` con la tanda 0 de la Fase 2; sección «Fase 2 en marcha» de
      `CLAUDE.md` actualizada**

- [ ] **Step 6: Commit de documentación, `push` y PR** — los ejecuta Alejandro

- [ ] **Step 7: Verificar el CI con `gh run list`**

- [ ] **Step 8: Empujar las dos migraciones al remoto**

```powershell
npx supabase migration list
```
```powershell
npx supabase db push
```
```powershell
npx supabase migration list
```

> El proyecto **hiberna**: si falla, reintentar. Las dos migraciones nuevas son seguras sobre datos reales
> —un `update` de una fila en `app_settings` y una función nueva—, pero el `update` **solo afecta si
> `min_duration_minutes` sigue en 15** en el remoto. Comprobarlo antes y después.

- [ ] **Step 9: Correr los advisors** y anotar el resultado. Deberían seguir en 5 avisos intencionales,
      **más uno nuevo por `available_slots`**, que es ejecutable por `authenticated` a propósito y por el
      mismo motivo que las otras cinco. Si aparece cualquier otra cosa, se abre como tarea, no se parchea.

---

## Autorrevisión

**Cobertura del diseño.** §4 borrar el Vite → Task 3. §5 estructura del App Router → Task 4, **solo el
esqueleto**: los grupos de rutas por perfil son de T1 y T2, porque un layout de grupo sin sesión que leer
no se puede probar. §6 tokens → Task 5. §7.4 tipos → Task 7. §11.1 D-19 → Task 1. §11.2 D-20 → Task 2.
§12 CI → Task 7. **Sin huecos.** Lo que esta tanda deja fuera a propósito: §7.1 a §7.3 —los tres clientes
y el proxy— y §8 —autenticación—, que son T1 entera.

**Sin marcadores.** Las diez aserciones nuevas van escritas enteras, con el `plan(n)` de cada archivo.

**Consistencia.** `available_slots` usa los cuatro parámetros en el mismo orden en la migración, en la
prueba y en los `grant`. Los UUID son los del seed, y el producto elegido —la cámara— es el único con tres
unidades, que es lo que hace legible el conteo `free = 3`. Las horas se calculan relativas a la corrida,
nunca literales, porque la ventana móvil es de 7 días.

**Lo que más fácilmente sale mal, por orden.**

1. **La Task 1 Step 4.** Cambiar la regla de duración puede romper pruebas de la Fase 1 que usen una
   duración que ya no es válida. El plan manda buscarlas **antes** con `grep`, pero si alguna se escapa,
   fallará por un motivo que parecerá un defecto de D-19 y no lo será.
2. **La Task 4 Step 3.** Fusionar el `.gitignore` a mano es donde se pierde la excepción de los `.xlsx`
   *(D-8)*. No daría error: los archivos desaparecerían del disco al saltar de rama, callando, como el
   2026-08-04.
3. **La Task 2 Step 4.** Si el conteo de franjas no da 25, la tentación es ajustar el número de la
   aserción. Es justo lo contrario de lo que hay que hacer: ese número **es** el borde.

**Riesgo conocido, y es de los que no se pueden probar aquí.** Esta tanda no ejecuta una sola línea de
`@supabase/ssr`. Todo lo que §7 del diseño afirma —los tres clientes, `getClaims()` verificando en local
con ES256, el `proxy.ts` que refresca— sigue sin comprobarse cuando la tanda cierre. **Es correcto que sea
así** —T1 existe para eso— pero significa que la pieza más delicada del diseño llega a T1 sin una sola
medición detrás, mientras que la base de datos llega con 134.
