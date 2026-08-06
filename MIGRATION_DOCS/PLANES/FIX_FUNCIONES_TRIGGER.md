> ## ✅ Ejecutado el 2026-08-05 · sin correcciones
>
> El plan de abajo es **el que se escribió antes de ejecutar**, y salió tal cual: una migración, una
> aserción, 124 en verde. Es el primero de la Fase 1 que no necesita corregir nada, y probablemente porque
> es también el más pequeño.
>
> **La pregunta abierta quedó respondida, y en el sentido cómodo:** **un trigger no necesita `EXECUTE` sobre
> su función.** Tras revocarlo a las seis, las 124 aserciones pasan —incluidas `21`, `22` y `25`, que caen
> en el acto si los triggers dejan de dispararse—. No hizo falta el plan B de moverlas a `private`.
>
> **La asimetría que eso destapa es lo que vale la pena guardar.** Con un helper de política RLS, revocar
> `EXECUTE` **rompe** la política (medido en la tanda 0). Con una función de trigger, no. El motivo: a un
> trigger lo invoca el **motor**, mientras que la expresión de una política se evalúa como el **usuario que
> consulta**, así que necesita poder ejecutar lo que invoca.
>
> Y eso, a su vez, explica por qué el esquema `private` de la tanda 1 no era un capricho: donde no se puede
> revocar sin romper, el aislamiento tiene que venir del esquema. **Dos herramientas para el mismo fin, y
> cuál sirve depende de quién invoca la función.**
>
> **Un tropiezo que no fue del plan:** el primer `supabase db reset` murió con
> `failed to bootstrap the local database` **antes de aplicar ninguna migración**, en «Initialising
> schema». No tenía que ver con el `REVOKE`; el contenedor se recreó sano y el reintento pasó sin más. Si
> vuelve a ocurrir, mirar `docker ps` antes de sospechar del SQL.

# Fix — Funciones de trigger expuestas como RPC · Plan de implementación

**Goal:** que las seis funciones de trigger de `public` dejen de ser invocables por HTTP. Cierra los seis
avisos `WARN` de los advisors que sí son reales.

**Architecture:** una migración que revoca `EXECUTE`, y una aserción de cobertura que impide que vuelva a
pasar. No cambia ninguna función ni ningún trigger.

**Tech Stack:** PostgreSQL 17 · pgTAP · Supabase CLI 2.111.0

## Qué se arregla, exactamente

Medido el 2026-08-05 sobre el stack local:

| Función | Seguridad | `anon` | `authenticated` | ¿La marca el linter? |
|---|---|---|---|---|
| `apply_penalties` | DEFINER | ejecuta | ejecuta | Sí |
| `handle_new_auth_user` | DEFINER | ejecuta | ejecuta | Sí |
| `log_reservation_status` | DEFINER | ejecuta | ejecuta | Sí |
| `enforce_reservation_transition` | invoker | ejecuta | ejecuta | No |
| `fn_update_updated_at` | invoker | ejecuta | ejecuta | No |
| `set_blocked_range` | invoker | ejecuta | ejecuta | No |

**Se revocan las seis, no solo las tres que marca el linter.** Las otras tres están igual de expuestas en
`/rest/v1/rpc/...`; lo único que cambia es que, al no ser `SECURITY DEFINER`, correrían con los privilegios
de quien llama y por eso el linter no las considera escalada. Dejar la mitad arreglada es peor que no
arreglar nada, porque la prueba de cobertura tendría que llevar excepciones.

**Por qué están expuestas:** al crear una función, `PUBLIC` recibe `EXECUTE` por defecto. En la tanda 1 se
revocó explícitamente a las cinco RPC de verdad y nunca a las de trigger. Es la lección de la tanda 0
aplicada a medias.

**Por qué no es una urgencia:** plpgsql se niega a ejecutarlas fuera de un trigger. Medido:

```
ERROR:  trigger functions can only be called as triggers
```

Pero esa protección la da el intérprete, no el diseño. El día que alguien convierta una de ellas en una
función normal, la exposición se vuelve real y nada avisa.

## Global Constraints

- No se modifica el cuerpo ni la firma de ninguna función, ni se recrea ningún trigger. Solo privilegios.
- Las cinco RPC de verdad —`create_reservation`, `cancel_reservation`, `available_units`, `admin_set_ban`,
  `admin_set_alumno_activo`— **no se tocan**. Que `authenticated` pueda ejecutarlas es el diseño entero, y
  cada una comprueba la autorización por dentro.
- Migración versionada con `npx supabase migration new`.
- Local: `npx supabase db reset` y `npx supabase test db`. **`db reset` exige el stack completo.**
- Mensajes de commit sin acentos. Claude no toca el remoto.

## El punto a verificar, que es el motivo real de escribir esto

**¿Revocar `EXECUTE` impide que el trigger dispare?**

No lo sabemos, y **no se puede suponer**: la tanda 0 midió que revocar `EXECUTE` a un helper de política
**rompe** la política que lo usa, con `permission denied for function`. La expresión de una política se
evalúa como el usuario que consulta, así que necesita el privilegio. Si un trigger funcionara igual, esta
migración rompería las sanciones, la máquina de estados, la auditoría y el `blocked_range` de golpe.

La expectativa razonada es que **no** los rompa, porque a un trigger lo invoca el motor y no el usuario, y
el privilegio se comprueba en la llamada. Pero eso es exactamente el tipo de razonamiento que la tanda 0
desmintió.

**Los dos desenlaces:**

- **No los rompe** → la batería pasa entera, 124 aserciones, y el frente queda cerrado.
- **Sí los rompe** → caen `21_no_overlap`, `22_state_machine` y `25_penalties` en el acto. En ese caso se
  revierte la migración y la salida es **mover las seis funciones al esquema `private`**, que PostgREST no
  expone porque no está en `api.schemas`. Un trigger puede apuntar a una función de otro esquema sin
  problema. Es además la solución más fiel al principio que ya rige en este proyecto desde la tanda 1:
  *el aislamiento lo da el esquema, no el privilegio.*

Se intenta primero el `REVOKE` porque son seis líneas y no toca ninguna definición. Si falla, el plan B
está escrito.

## Estructura de archivos

| Archivo | Responsabilidad |
|---|---|
| `…_revoke_trigger_functions.sql` | Revoca `EXECUTE` a las seis |
| `supabase/tests/19_function_hardening.sql` | Gana una tercera aserción: `plan(2)` → `plan(3)` |

---

### Task 1: Revocar y comprobar que nada se rompe

**Files:**
- Create: `supabase/migrations/<ts>_revoke_trigger_functions.sql`
- Modify: `supabase/tests/19_function_hardening.sql` — `plan(2)` → `plan(3)`

**Interfaces:**
- Produces: ninguna función de trigger de `public` ejecutable por `anon` ni `authenticated`. Ninguna firma
  cambia, así que nada que dependa de ellas se entera.

- [ ] **Step 1: Escribir la aserción que falla**

En `19_function_hardening.sql`, subir el plan a `plan(3)` y añadir antes del `finish()`:

```sql
-- Una funcion de trigger no tiene por que ser invocable por HTTP. PostgREST
-- publica en /rest/v1/rpc/ todo lo que el rol pueda ejecutar, y al crear una
-- funcion PUBLIC recibe EXECUTE por defecto: si no se revoca, quedan ahi.
--
-- Hoy plpgsql las rechaza con "trigger functions can only be called as triggers",
-- pero esa proteccion es del intérprete y no del diseño: desaparece en cuanto
-- alguna deje de ser de trigger.
select is(
  (select count(*)::int
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prorettype = 'pg_catalog.trigger'::regtype
      and (has_function_privilege('anon', p.oid, 'EXECUTE')
        or has_function_privilege('authenticated', p.oid, 'EXECUTE'))),
  0,
  'ninguna funcion de trigger queda expuesta como RPC'
);
```

- [ ] **Step 2: Correr y confirmar que falla**

Run: `npx supabase test db`
Expected: falla con `have: 6 / want: 0`. **Si dijera otro número, parar y averiguar por qué** antes de
escribir la migración: el arreglo está dimensionado para seis.

- [ ] **Step 3: Escribir la migración**

```sql
-- Las funciones de trigger dejan de ser invocables por HTTP.
--
-- PostgREST publica en /rest/v1/rpc/ toda funcion que el rol pueda ejecutar, y al
-- crear una funcion PUBLIC recibe EXECUTE por defecto. La tanda 1 se lo revoco a
-- las cinco RPC de verdad y nunca a las de trigger, asi que las seis quedaron
-- expuestas. Los advisors del remoto lo detectaron al empujar la Fase 1.
--
-- No es explotable hoy: plpgsql responde "trigger functions can only be called as
-- triggers". Pero esa proteccion la da el intérprete, no el diseño, y desaparece
-- si alguna deja de ser de trigger.
--
-- Se revocan las SEIS, no solo las tres SECURITY DEFINER que marca el linter. Las
-- otras tres estan igual de publicadas; lo unico que cambia es que correrian con
-- los privilegios de quien llama, y por eso el linter no las cuenta como escalada.
--
-- Un trigger NO necesita EXECUTE sobre su funcion: lo invoca el motor, no el
-- usuario. Verificado por la bateria completa, donde 21, 22 y 25 caerian en el
-- acto si dejaran de dispararse.
--
-- Las cinco RPC de verdad no se tocan: que `authenticated` pueda ejecutarlas es
-- el diseño, y cada una comprueba la autorizacion por dentro.

revoke execute on function public.apply_penalties()                from public, anon, authenticated;
revoke execute on function public.handle_new_auth_user()           from public, anon, authenticated;
revoke execute on function public.log_reservation_status()         from public, anon, authenticated;
revoke execute on function public.enforce_reservation_transition() from public, anon, authenticated;
revoke execute on function public.fn_update_updated_at()           from public, anon, authenticated;
revoke execute on function public.set_blocked_range()              from public, anon, authenticated;
```

- [ ] **Step 4: Correr la batería entera. Este paso es el experimento**

Run: `npx supabase db reset; if ($?) { npx supabase test db }`

Expected: **124 aserciones en verde**, 20 archivos.

**Cómo leer el resultado:**

| Lo que sale | Qué significa | Qué se hace |
|---|---|---|
| 124 en verde | Un trigger no necesita `EXECUTE` sobre su función. Frente cerrado | Seguir a la Task 2 |
| Caen `21`, `22` o `25` | Revocar sí impide el disparo, igual que con las políticas | Revertir la migración y aplicar el plan B: mover las seis a `private` |
| Cae otra cosa | Algo depende de esos privilegios que no habíamos visto | Leer el error antes de tocar nada más |

- [ ] **Step 5: Commit**

```
git add supabase/migrations supabase/tests
git commit -m 'Revoca EXECUTE a las funciones de trigger' -m 'Cierra los seis avisos reales de los advisors. PostgREST publica en /rest/v1/rpc/ toda funcion ejecutable por el rol, y PUBLIC recibe EXECUTE por defecto al crearla: la tanda 1 se lo revoco a las cinco RPC de verdad y nunca a las de trigger. No era explotable -plpgsql las rechaza fuera de un trigger- pero esa proteccion es del intérprete y no del diseño.' -m 'Se revocan las seis, no solo las tres SECURITY DEFINER que marca el linter. 19_function_hardening.sql gana la asercion que impide que vuelva a pasar.'
```

---

### Task 2: Cierre y verificación contra el remoto

- [ ] **Step 1: Actualizar la tabla de avisos nuevos en `ESTADO_Y_PLAN.md`** — el `WARN ×6` pasa a cerrado;
      el `WARN ×5` de las RPC se queda, documentado como intencional

- [ ] **Step 2: Actualizar `CLAUDE.md`** — quitar el pendiente y añadir a la lista de reglas la que deja
      esto: *toda función nueva declara explícitamente quién puede ejecutarla, incluidas las de trigger*

- [ ] **Step 3: Cabecera de correcciones en este archivo y fila en `PLANES/README.md`**

- [ ] **Step 4: Commit de documentación, `push` y PR** — los ejecuta Alejandro

- [ ] **Step 5: Verificar el CI**

- [ ] **Step 6: Empujar al remoto**

```powershell
npx supabase db push
```

- [ ] **Step 7: Volver a correr los advisors de seguridad**

Expected: quedan **5 avisos**, los de las RPC de verdad, y ninguno más. Si aparece otro, es nuevo y se
registra.

---

## Autorrevisión

**Alcance.** Seis funciones, seis líneas, una aserción. No se toca ninguna definición ni ningún trigger, así
que el riesgo de regresión funcional es el que mida la batería y nada más.

**Sin marcadores.** La migración y la aserción van completas.

**Consistencia.** Los seis nombres salen de una consulta al catálogo, no de memoria. La aserción nueva usa
`prorettype = 'pg_catalog.trigger'::regtype`, que es como Postgres identifica una función de trigger, así
que cubre también las que se añadan en el futuro sin tener que enumerarlas.

**Lo que decide si este plan valió la pena.** No es el arreglo, que es trivial. Es el Step 4: responde si
un trigger necesita `EXECUTE` sobre su función, que hoy nadie en este proyecto sabe. La respuesta queda
grabada en la batería, y si es la incómoda, el plan B ya está escrito.

**Lo que este plan no arregla, a propósito.** Los cinco avisos de las RPC de verdad y los 22 de rendimiento
*(Q-13)*. Los primeros son el diseño; los segundos son prematuros mientras la base no haya servido una
consulta.
