# Fase 3 · Tanda 4 — Plan de ejecución

> **Para quien ejecute:** las tareas se hacen **en orden** y cada una termina en **un commit**. Los pasos
> llevan casilla (`- [ ]`) para ir marcándolos. **Este plan no se reescribe tras ejecutar:** lo que la
> ejecución desmienta va en la cabecera de correcciones de abajo, para no borrar lo aprendido.
>
> **Y se releen las correcciones antes de CADA tarea, no al final de la tanda.** En la F3-T1 una
> corrección anotada para la Tarea 2 dejó muerto un paso de la Tarea 1 que nadie volvió a mirar.

**Objetivo:** que el calendario del alumno salga de **los turnos reales de operadores reales en cada
sede**, y no de una hora de apertura única para todo el sistema.

**Enfoque:** dos tablas nuevas, dos RPC reescritas por dentro **sin tocar su firma**, y una pantalla de
administración. **Dos migraciones —33 y 34—**, y la tanda **puede impedir reservar** si se despliega mal:
es el único bloque de la Fase 3 del que eso se puede decir.

**Stack:** Next.js **16.3.0** (App Router) · TypeScript estricto · Vitest · Playwright · pgTAP · Supabase
CLI en Docker.

**Diseño:** [`../FASE_3_DISENO.md`](../FASE_3_DISENO.md) **§5** —no §8, que es la T3— junto con **§2.4**,
que trae la medición previa. ⚠ **Once de sus afirmaciones no sobrevivieron a la medición y están abajo.**
Ejecuta **D-74, D-75 y D-76**, y trae **tres decisiones nuevas que son de Alejandro**.

**Punto de partida, medido el 2026-08-20 y no citado:** `develop` limpio en **`587ce5a`** *(el merge del
PR #45)*; en el remoto **tres** ramas —`develop`, `main` y `feature/estilos-sistema-visual`, **que es de
otra persona y no se toca**—; **32 migraciones**, `local` y `remote` idénticas **según los dos
instrumentos**, el MCP y `npx supabase migration list`; pgTAP **`Files=33, Tests=200,
PASS`** tras un `db reset` de **114 s**; Vitest **12 archivos, 166 pruebas**; E2E **5 archivos, 7 pruebas**
*(2+2+1+1+1)*.

**Y la precondición, medida el mismo día contra producción:** `staff_members` = **1**, de los cuales
**operadores = 0**; `alumnos` = 1; `inventory_reservations` = **0**; productos / unidades / notas / sedes
= **34 / 92 / 68 / 2**.

---

## Correcciones al diseño

*(Todas son de la escritura de este plan, antes de ejecutar nada.)*

1. ⚠ **LA QUE MÁS CAMBIA LA TANDA: el radio de impacto sobre las pruebas es de NUEVE archivos pgTAP, no
   de uno.** §5.2 lista una sola fila de pruebas, `supabase/tests/32_opening_time_aligned.sql`. Contado:
   **`29_available_slots.sql` también rompe** —lee la rejilla—, y sobre todo **nueve baterías llaman a
   `create_reservation`**: la 19, 23, 24, 27, 28, 29, 31, 34 y 40. Todas reservan *«mañana a las 10:00»*
   contando con que el horario 08:00–22:00 del seed lo permita. **En cuanto la RPC exija cobertura de
   turno, las nueve fallan a la vez** — y fallarían por el motivo equivocado, que es lo caro: se leería
   como «rompí la RPC» y es «al fixture le falta un dato nuevo». **La cura no es tocar nueve archivos:
   es sembrar horarios y turnos en `seed.sql`** *(Tarea 4)*, y entonces sólo hay que reescribir dos.

2. ⚠ **La rejilla NO se genera desde la intersección: se genera desde `campus_hours` y los turnos la
   RECORTAN.** §5.1 dice *«los tramos de `campus_hours` cubiertos por al menos un turno»*, que leído
   literalmente invita a construir los tramos de la intersección y generar desde ellos. **Eso rompe dos
   veces:** dos turnos solapados generan la misma franja dos veces, y un turno que empiece a las 09:07
   genera una rejilla **desalineada** del bloque —justo lo que D-54 existe para impedir en `app_settings`—.
   **Generando desde el techo de la sede y filtrando por cobertura, las dos desaparecen solas:** cero
   duplicados sin `distinct` y cero desalineación sin restricción nueva sobre `staff_shifts`. **Es la
   lectura literal de D-74** —*«la sede pone el techo, el turno dice quién está debajo»*— y **quita
   trabajo en vez de añadirlo**.

3. ⚠ **La cobertura es por la UNIÓN de los turnos, no por un turno solo — y hay que decidirlo, porque el
   diseño no lo dice y las dos lecturas son defendibles.** Con el operador A de 08:00 a 12:00 y el B de
   12:00 a 16:00, una reserva de **11:00 a 13:00** no cabe entera en ninguno de los dos turnos, pero **hay
   alguien en el mostrador en todo momento**: el alumno la retira con A y la devuelve con B. **Medido en
   el stack local antes de escribir este plan**, con la técnica de la corrección 2 y con control negativo:

   | Escenario | Franjas de 2 h ofrecidas |
   |---|---|
   | Turnos **08:00–12:00** y **12:00–16:00** *(sin hueco)* | **13**, y entre ellas **11:00–13:00** |
   | Turnos **08:00–11:00** y **12:00–16:00** *(hueco de 1 h)* | **8** |

   **Las 5 que desaparecen son exactamente las que cruzan el hueco** —09:30, 10:00, 10:30, 11:00 y 11:30—
   y **sobrevive 09:00–11:00**, que termina justo en el borde del turno. Sin el segundo escenario, el 13
   del primero no distingue «filtra bien» de «no filtra nada». ⚠ **Candidata a D-90, y no la decide quien
   ejecuta.**

4. **`lib/reservas/consultas.ts` no «deja de leer el horario global»: se le borran dos campos que no lee
   nadie.** §5.2 lo pone como una fila de trabajo. Contado con `grep` sobre `app`, `lib` y `components`:
   **`openingTime` y `closingTime` aparecen 4 veces y las 4 están dentro de ese mismo archivo** —la
   declaración del tipo `AjustesReserva` y la asignación del `return`—. **Cero consumidores.** El
   calendario ya se pinta con lo que devuelve `available_slots`. Es borrar dos líneas del tipo y dos del
   objeto, y **quita trabajo**.

5. ⚠ **`at time zone` liga más fuerte que `+`, y la migración no compila si se olvida un paréntesis.**
   Medido al prototipar: `g.slot_start + make_interval(mins => 120) at time zone 'America/Lima'` falla con
   **`ERROR: function pg_catalog.timezone(unknown, interval) does not exist`**, porque Postgres lo lee
   como `slot_start + (make_interval(...) at time zone ...)`. Se escribe
   `(g.slot_start + make_interval(...)) at time zone 'America/Lima'`. **No es un detalle de estilo: es la
   diferencia entre que la migración corra y que no**, y el mensaje de error no señala al operador
   culpable.

6. ⚠ **LA TRAMPA Nº 1 DEL PROYECTO, en su forma clásica y con la peor cara que ha tenido en esta fase.**
   El `seed.sql` va a llevar horarios y turnos **con su operador sembrado** *(`a0000000-…-00000000000b`,
   que ya existe en el seed)*. **Producción tiene 0 operadores, medido hoy.** O sea: **calendario lleno en
   local y vacío en el sitio real**, con `lint`, `typecheck`, `build`, pgTAP, Vitest, E2E y el recorrido en
   navegador **todos en verde**, porque el recorrido se hace contra local. Aquí no acaba en una vitrina
   vacía como con `products.featured`: **acaba en que nadie puede reservar nada.** Es el argumento de §6
   —F3-T2 antes que F3-T4— llegando hasta el final, y **el motivo por el que esta tanda no se despliega
   hasta que haya operadores de verdad con turnos cargados**.

7. ⚠ **Y el diseño no dice lo que pasa con `campus_hours` VACÍO, que rompe más que el calendario.** Sin
   filas, `available_slots` devuelve cero franjas *(esperable)* **y `create_reservation` rechaza todo**
   *(no dicho en ninguna parte)*: el sistema deja de aceptar reservas en el instante del `db push`, antes
   de que nadie haya tenido ocasión de cargar un horario. **La migración 33 siembra `campus_hours` desde
   la propia `app_settings`** —`insert … select` cruzando las 2 sedes con los 7 días y tomando
   `opening_time` y `closing_time` de la fila única, **no literales `'08:00'`/`'22:00'` copiados a mano**—.
   Así el **techo queda idéntico al de hoy** y lo único que cambia de comportamiento es la cobertura de
   turnos. **Es el mismo criterio de D-84: el dato se lee de donde vive, no se transcribe.**

8. **La cabecera del personal pasa de 6 enlaces de administración a 7, y ya hay una medición sobre eso.**
   `components/cabecera-personal.tsx` dejó escrito que con **siete** enlaces en una sola barra —Mostrador
   más los seis de administración— la navegación pedía **1481 px** y se salía de la página a 1440, y por
   eso se partió en dos filas. ⚠ **Ese siete no es el de aquí:** el de aquí es el **séptimo de
   administración**, que va en la **segunda** fila, donde hoy hay seis. Esa fila lleva `overflow-x-auto`,
   así que **debería** aguantarlo, pero **se mira en vez de suponerlo**. Y la convención del archivo, escrita ahí siete veces: **el enlace entra en la tarea que
   construye su pantalla, nunca antes** *(Tarea 8, no Tarea 0)*.

9. **`staff_members` no tiene sede, confirmado y no supuesto.** Sus columnas son `user_id`, `role`,
   `activo`, `created_at`, `updated_at`. La sede vive **sólo** en `staff_shifts`, y eso decide algo que
   §5.1 no comenta: **un mismo operador puede tener turnos en las dos sedes**, y el modelo lo permite sin
   añadir nada. Se deja dicho para que nadie «arregle» la falta de `campus_id` en `staff_members`.

10. **Nada de esta tanda está construido ya, y esta vez se midió antes de decirlo.** `grep -rl
    "campus_hours\|staff_shifts"` sobre `supabase`, `app`, `lib` y `components`: **cero coincidencias**.
    Es la cuarta tanda seguida en que se hace esta comprobación; **dos de las tres anteriores la
    necesitaron** —el alta de operadores estaba entera *(F3-T2)*—. **Que salga vacía es el resultado, no
    la ausencia de resultado.**

11. **Q-21 llega con el plan delante, que es donde §12 del diseño dijo que se resolvería.** *«¿Qué pasa
    con una reserva ya creada si después se borra o se acorta el turno que la cubría?»* Las RPC validan al
    crear y no al llegar el día, así que la reserva sobrevive y el alumno se presenta a un mostrador
    vacío. **No lo resuelve quien ejecuta:** es la tercera decisión de Alejandro *(ver abajo)*.

---

## Las tres decisiones que NO toma quien ejecuta

*Se anotaron aquí y no en el cuerpo de una tarea, para que no se resolvieran de paso.*
**Dos están resueltas desde el 2026-08-20; la tercera sigue abierta y se dice.**

| # | Qué había que decidir | Resuelto |
|---|---|---|
| **A** | **¿La cobertura es por la unión de turnos o por un turno solo?** | ✅ **La UNIÓN. De Alejandro, el 2026-08-20 → D-90.** Alimentada por la corrección 3, medida con control negativo: 13 franjas con dos turnos consecutivos y 8 con un hueco. **La comprobación es «cada bloque del tramo cae en algún turno»**, y como D-19 obliga a que la duración sea múltiplo del bloque, se escribe **sin unir intervalos y sin `distinct`** |
| **B** | **¿`app_settings.opening_time` y `closing_time` se borran o se dejan muertas?** §5.2 delegaba esto al plan explícitamente | ✅ **SE BORRAN, con su restricción `app_settings_horario`. De Alejandro, el 2026-08-20 → D-91.** El argumento no es de limpieza: **una columna que conserva su nombre y deja de gobernar es la forma exacta de `products.description`** *(D-82)*, que este proyecto ya pagó una vez |
| **C** | **¿Q-21 entra en esta tanda o se deja escrito?** | ⬜ **ABIERTA.** *«¿Qué pasa con una reserva ya creada si después se borra o se acorta el turno que la cubría?»* Las RPC validan **al crear y no al llegar el día**, así que la reserva sobrevive en silencio y el alumno se presenta a un mostrador vacío. **Recomendación: avisar sin impedir** —la pantalla dice cuántas reservas quedan descubiertas y el admin decide—. ⚠ **Mientras no se decida, la Tarea 9 no está completa**, y se dice en su paso 3 |

---

## El corte: por dónde se parte si se parte

⚠ **Son 14 tareas, y el umbral de §6 son ~15. Cabe por poco, y el conteo no es el argumento.**

**El corte por riesgo es limpio y no hay que buscarlo:**

| Mitad | Tareas | Qué puede romper | Verificación que pide |
|---|---|---|---|
| **A · Esquema y RPC** | **0 a 6** | **Impedir reservar en producción.** Dos migraciones, `db push`, irreversible en la práctica | pgTAP, y las predicciones de producción escritas por delante |
| **B · Pantallas** | **7 a 13** | Una pantalla fea o un enlace roto. **Cero SQL** | Recorrido en navegador y E2E |

**Y el argumento en contra de partir, que es el que hay que mirar:** desplegada sola, la mitad A deja
producción **con horarios y sin ningún turno** — o sea, con el calendario vacío y la pantalla para cargar
turnos todavía sin construir. **Partir en dos PR no obliga a desplegar en dos pasos:** las dos mitades
pueden entrar a `develop` por separado y **compartir un solo `db push`**, el día que haya operadores.
Como esa precondición ya bloquea el despliegue de todos modos, **partir no cuesta nada y la revisión
gana**: un PR de 14 tareas sobre dos migraciones y tres pantallas no lo revisa nadie.

---

## Restricciones globales

*Valen para todas las tareas y no se repiten en cada una.*

- **PowerShell 5.1:** sin `&&` ni `||`; encadenar con `;` o `if ($?) { }`. Un comando por bloque.
- ⚠ **`pgTAP` se mide DESPUÉS de un `db reset`, no antes.** Sin él da rojo sin que nada esté roto.
- ⚠ **`db reset` con dos stacks de Supabase arriba tarda más, y no hay un número que citar:** medido
  **72, 331, 234 y 114 s** en dos días. Se mide, no se predice.
- **Docker Desktop tiene que estar arrancado.** ⚠ **`npx supabase start` devuelve exit 0 aunque Docker
  esté parado**, así que se comprueba **por el efecto**: `docker ps` lista `supabase_db_UPC-Inventario`.
  Y ⚠ **Docker puede caer dejando su API en 500**, lo que hace fallar 6 de las 7 pruebas E2E sin que nada
  esté roto: se arregla reiniciando Docker Desktop, no depurando código.
- ⚠ **Antes de caminar la aplicación, comprobar a qué base apunta.** `Get-Content .env.local` tiene que
  imprimir **dos líneas con forma `CLAVE=valor`**: `http://127.0.0.1:54321` y la clave publicable. **El
  cortafuegos de `e2e/apoyo/entorno.ts` protege a Playwright, NO a `npm run dev` ni a `npm start`.**
- ⚠ **Playwright tiene `reuseExistingServer: false`:** liberar el 3000 antes.
- **El E2E necesita base limpia Y Auth caliente** *(Q-26)*: `db reset` → calentar Auth con **una** sola
  petición → E2E.
- **El código de salida se captura por redirección a archivo, nunca por tubería.**
- **Para puertos, `netstat -ano`, nunca `curl`.** Para matar un proceso, `Stop-Process -Id <pid> -Force`.
- **Migraciones sólo por CLI versionada**, y ninguna toca el remoto sin haber pasado por el stack local y
  por `npx supabase test db`.
- **Mensajes de commit sin acentos y SIN `Co-Authored-By` ni ninguna firma.** Los documentos, con tildes.
  **Comentarios de código en ASCII y con `OJO`**, que es la convención observada.
- **No se empuja al remoto.** El plan entrega los comandos; los ejecuta Alejandro.
- **Nada de estética.** La fase visual la hace otra persona. Esta tanda entrega **que el calendario diga
  la verdad** y **que el admin pueda cargar horarios**, no cómo se ve la tabla.

---

## Mapa de archivos

**Se crean:**

| Archivo | De qué responde |
|---|---|
| `supabase/migrations/…_horarios_por_sede.sql` | **Migración 33:** `campus_hours`, `staff_shifts`, RLS y la siembra del techo actual *(corrección 7)* |
| `supabase/migrations/…_rejilla_por_turnos.sql` | **Migración 34:** `available_slots` y `create_reservation` reescritas |
| `supabase/tests/41_campus_hours.sql` | Restricciones y RLS de la tabla de horarios |
| `supabase/tests/42_staff_shifts.sql` | Restricciones y RLS de la tabla de turnos |
| `supabase/tests/43_interseccion.sql` | **La intersección, con el control negativo del hueco** *(corrección 3)* |
| `app/(personal)/admin/horarios/page.tsx` | La pantalla de horarios y turnos |
| `components/admin/tabla-horarios-sede.tsx` | El horario semanal de una sede |
| `components/admin/tabla-turnos.tsx` | Los turnos de los operadores |
| `components/admin/aviso-sin-operador.tsx` | El aviso de **D-76**, próximos 7 días |
| `lib/admin/horarios.ts` | Lecturas y acciones de servidor de las dos tablas |
| `e2e/horarios.spec.ts` | La octava prueba E2E |

**Se modifican:**

| Archivo | Qué cambia |
|---|---|
| `supabase/seed.sql` | Horarios y turnos que dejan pasar las nueve baterías *(corrección 1)* |
| `supabase/tests/29_available_slots.sql` | La rejilla ya no sale de `app_settings` |
| `supabase/tests/32_opening_time_aligned.sql` | La regla de D-54 pasa a `campus_hours` |
| `lib/reservas/consultas.ts` | Se le quitan `openingTime` y `closingTime` *(corrección 4)* |
| `components/cabecera-personal.tsx` | El séptimo enlace, **en la Tarea 8** *(corrección 8)* |
| `lib/database.types.ts` | Regenerado, no editado a mano |
| `components/admin/formulario-ajustes.tsx`, `lib/admin/{configuracion,acciones,ajustes}.ts` | Pierden apertura y cierre. **Firme desde D-91:** las dos columnas se borran |

**No se toca, y se dice para que nadie lo intente:** `available_units` —cuenta unidades libres en un
rango y la rejilla sólo decide qué rangos preguntar—; ninguna **firma** de RPC; ninguna llamada del
cliente; `disabled_days` —**Q-22** queda fuera de alcance a propósito—; y ninguna regla de duración,
buffer, ventana móvil o límite diario. **Esta tanda cambia *cuándo se puede*, no *cuánto ni cuántas
veces*.**

---

## Tarea 0 · La rama y el punto de partida

- [ ] **Paso 1.** `git branch --show-current` → `develop`; `git status --short` → vacío;
      `git log --oneline -1` → **`587ce5a`**, el merge del PR #45. ⚠ **Sin tubería.**
- [ ] **Paso 2.** Comprobar **por el efecto** que el stack local está arriba: `docker ps` lista
      `supabase_db_UPC-Inventario`. **No basta con que `supabase start` haya devuelto 0.**
- [ ] **Paso 3.** Crear la rama `feature/fase-3-tanda-4` desde `develop`.
- [ ] **Paso 4.** **Fijar la línea base contando, no citando:** `npm test` → **12 archivos, 166 pruebas**.
      pgTAP no se mide aquí: se mide en la Tarea 5, **después** del `db reset`.

**Commit:** ninguno. Esta tarea no cambia archivos.

---

## Tarea 1 · LA TAREA DE RIESGO — la intersección contra el esquema real, **con la salida escrita por delante**

*El prototipo ya salió bien el 2026-08-20 sobre tablas temporales* *(corrección 3)*. **Lo que esta tarea
comprueba es otra cosa: que la misma consulta funciona con `available_units` dentro y con las restricciones
reales encima.** Va primera porque si falla, cambia la tanda entera.

- [ ] **Paso 1.** Sobre el stack local y **dentro de una transacción que se revierte**, crear las dos
      tablas con su forma definitiva y sembrar: Monterrico abierta 08:00–22:00 mañana, y **dos turnos
      consecutivos** 08:00–12:00 y 12:00–16:00.
- [ ] **Paso 2.** Correr la rejilla **con `available_units` dentro**, para una duración de 120 min.
- [ ] **Paso 3.** ⚠ **El control negativo, que es lo que hace válido el paso 2:** repetir con un **hueco**
      entre los turnos (08:00–11:00 y 12:00–16:00).
- [ ] **Paso 4.** Anotar las dos cifras en la cabecera de correcciones, salgan como salgan.

| Salida | Qué se ve | Qué se hace |
|---|---|---|
| **A** | **13 franjas** sin hueco y **8** con hueco, **incluida 11:00–13:00** en el primer caso | Sigue la Tarea 2 con la consulta ya validada |
| **B** | Faltan las franjas que cruzan de un turno a otro | ⚠ **Ya no es una decisión abierta: D-90 dice que la cobertura es por la UNIÓN**, así que esto es un defecto de la consulta y se arregla. La comprobación tiene que ser **por bloque** —«cada bloque de `[start, end)` cae en algún turno»— y no por tramo entero |
| **C** | Salen franjas **repetidas**, o alguna no alineada al bloque | La rejilla se está generando desde los turnos y no desde `campus_hours`: **es la corrección 2 y se vuelve a leer**, no se parchea con un `distinct` |

**Commit:** ninguno. Es una medición.

---

## Tarea 2 · Migración 33 · `campus_hours` y `staff_shifts`

- [ ] **Paso 1.** Las dos tablas de §5.1, tal cual, **con una sola adición: la restricción de alineación
      sobre `campus_hours.opens_at`**, que es D-54 mudándose de tabla. ⚠ **NO se añade sobre
      `staff_shifts`**: con la corrección 2 los turnos no generan rejilla, así que no pueden desalinearla.
- [ ] **Paso 2.** RLS en las dos: **lectura para `authenticated`** —el alumno necesita saber si la sede
      abre—, **escritura sólo para admin** vía `private.is_admin()`, como el resto del proyecto.
- [ ] **Paso 3.** ⚠ **La siembra del techo actual** *(corrección 7)*: `insert … select` cruzando
      `campuses` con `generate_series(0, 6)` y tomando `opening_time` y `closing_time` **de
      `app_settings`**, no de literales. **Sin este paso la migración deja producción sin poder reservar.**
- [ ] **Paso 4.** `npx supabase db reset` y comprobar **por el efecto**: `campus_hours` tiene
      **2 sedes × 7 días = 14 filas** con 08:00–22:00, y `staff_shifts` **0**.
- [ ] **Paso 5.** Revocar `execute`/grants por defecto donde aplique, según `19_function_hardening.sql`.

**Commit:** `feat: tablas de horario por sede y turnos de operador`

---

## Tarea 3 · Migración 34 · las dos RPC sobre la intersección

- [ ] **Paso 1.** `available_slots`: la rejilla nace de `campus_hours` para el `weekday` de `p_date` y se
      filtra por cobertura de turnos. ⚠ **Los paréntesis de la corrección 5.** **La firma no cambia.**
- [ ] **Paso 2.** `create_reservation`: la comprobación de las líneas 123–126 —`::time < opening_time or
      ::time > closing_time`— pasa a ser «cada bloque de `[start, end)` cae dentro de algún turno de esa
      sede y ese día». **La firma no cambia.**
- [ ] **Paso 3.** ⚠ **Conservar la propiedad que sostiene el calendario:** todo lo que la rejilla ofrece,
      la RPC lo acepta. **La rejilla puede ser más estricta, nunca más laxa** — está escrita en la
      cabecera de la migración 21 y se vuelve a escribir en ésta.
- [ ] **Paso 4.** Dos mensajes de error distintos, porque son dos causas distintas *(D-76)*: **«Ese día la
      sede no abre»** y **«No hay ningún operador en ese horario»**.
- [ ] **Paso 5.** `npx supabase db reset` y comprobar por el efecto que con 0 turnos la rejilla devuelve
      **0 franjas** y `create_reservation` **rechaza**, con el mensaje del operador y no el de la sede.

**Commit:** `feat: la rejilla y la validacion salen de los turnos del operador`

---

## Tarea 4 · El `seed.sql`: lo que deja pasar las nueve baterías

*Esta tarea existe por la corrección 1 y **es la que evita tocar nueve archivos de prueba**.*

- [ ] **Paso 1.** Sembrar `campus_hours`: las **2 sedes × 7 días**, 08:00–22:00, que es el horario con el
      que están escritas las nueve baterías.
- [ ] **Paso 2.** Sembrar `staff_shifts` para el operador que **ya existe en el seed**
      (`a0000000-…-00000000000b`): un turno 08:00–22:00 en **las dos sedes**, los **7 días**.
- [ ] **Paso 3.** ⚠ **Sembrar además el caso que hace falta para probar D-76**: un día con horario de sede
      y **sin ningún turno**. Va en la sede de San Miguel para no tocar los escenarios de las baterías
      existentes, que reservan en Monterrico.
- [ ] **Paso 4.** `npx supabase db reset`, luego `npx supabase test db`. **Esperado: las 200 aserciones
      existentes siguen pasando**, salvo las de la 29 y la 32, que se reescriben en la Tarea 5.

**Commit:** `chore: horarios y turnos en el seed local`

---

## Tarea 5 · Las pruebas pgTAP

- [ ] **Paso 1.** Reescribir `29_available_slots.sql` contra la rejilla nueva.
- [ ] **Paso 2.** Reescribir `32_opening_time_aligned.sql` contra `campus_hours`. **La regla es la misma,
      la tabla es otra**, y su comentario de cabecera explica el porqué mejor que ningún resumen: se
      conserva y se adapta.
- [ ] **Paso 3.** `41_campus_hours.sql` y `42_staff_shifts.sql`: restricciones de orden, clave primaria,
      cascada al borrar una sede, y **RLS en las dos direcciones** —un alumno lee, un alumno no escribe,
      un admin escribe—. ⚠ **El control positivo no se salta:** sin un «sí puede» al lado, un «no puede»
      no distingue «revocado» de «la sonda pregunta mal».
- [ ] **Paso 4.** `43_interseccion.sql`: **las dos cifras de la corrección 3**, el hueco incluido. Es la
      prueba que convierte el prototipo en regresión.
- [ ] **Paso 5.** ⚠ **Una prueba de mutación por batería nueva**, y se comprueba **dónde** falla: en la
      F3-T2 una mutación abortó antes de llegar a la aserción que se quería probar y **`Bad plan` no es
      una prueba que mide**.
- [ ] **Paso 6.** `npx supabase db reset`, luego `npx supabase test db`.

**Commit:** `test: pgTAP de horarios, turnos y la interseccion`

---

## Tarea 6 · Lo que deja de gobernar

- [ ] **Paso 1.** `lib/reservas/consultas.ts`: quitar `openingTime` y `closingTime` del tipo
      `AjustesReserva` y del `return` *(corrección 4)*. **Cuatro líneas.**
- [ ] **Paso 2.** `npm run typecheck`. ⚠ **Aquí el typecheck es el instrumento:** si algún consumidor los
      leía y el `grep` no lo vio, sale ahora. **Esperado: verde**, y si no lo está, la corrección 4 estaba
      mal y se anota.
- [ ] **Paso 3.** **D-91: borrar** `opening_time` y `closing_time` de `app_settings`, **con su restricción
      `app_settings_horario`**. Va en la migración 34, no en una tercera. ⚠ **El orden importa:** primero
      las RPC dejan de leerlas *(Tarea 3)*, después se borran. Al revés, la migración 34 no compila.
- [ ] **Paso 4.** Y con ellas, los **siete** sitios que las arrastran, contados en D-91:
      `opening_time_aligned` *(D-54, que se muda a `campus_hours` en la Tarea 2)*,
      `supabase/tests/32_opening_time_aligned.sql` *(Tarea 5)*,
      `components/admin/formulario-ajustes.tsx`, `lib/admin/configuracion.ts`, `lib/admin/acciones.ts`,
      `lib/admin/ajustes.ts` *(los cuatro en la Tarea 7)* y `lib/database.types.ts`.
- [ ] **Paso 5.** Regenerar `lib/database.types.ts` **con el comando, nunca a mano**.

**Commit:** `refactor: el horario global deja de gobernar la rejilla`

---

> ### ✂ Aquí corta la mitad A si la tanda se parte
>
> Hasta aquí: **dos migraciones, cinco archivos de prueba y el seed**. Lo que sigue **no toca el esquema**.

---

## Tarea 7 · `/admin/ajustes` pierde apertura y cierre

- [ ] **Paso 1.** Quitar los dos campos del formulario y de `guardarAjustes()`.
- [ ] **Paso 2.** Dejar en su sitio un enlace a `/admin/horarios`, para que quien vaya a buscarlos donde
      siempre estuvieron **encuentre adónde fueron**.
- [ ] **Paso 3.** Comprobar que las pruebas de Vitest de ajustes siguen en verde o se ajustan.

**Commit:** `feat: ajustes deja de llevar el horario global`

---

## Tarea 8 · `/admin/horarios` · el horario de cada sede

- [ ] **Paso 1.** `lib/admin/horarios.ts` con la lectura y las acciones de servidor. **La autorización la
      pone RLS**, no la pantalla.
- [ ] **Paso 2.** La pantalla, con una tabla por sede: siete días, apertura y cierre. **Un día sin fila es
      un día cerrado**, y se ve que lo está *(D-76)*.
- [ ] **Paso 3.** ⚠ **El error de la base no se reenvía al cliente**: mensaje genérico más el id de
      correlación, y el contexto entero a Sentry bajo ese id.
- [ ] **Paso 4.** **El séptimo enlace en `components/cabecera-personal.tsx`** *(corrección 8)*, y **se
      mira la barra a 1440 px** antes de dar la tarea por hecha.

**Commit:** `feat: pantalla de horarios por sede`

---

## Tarea 9 · Los turnos de cada operador

- [ ] **Paso 1.** En la misma ruta: alta, edición y baja de turnos, por operador y por sede.
- [ ] **Paso 2.** ⚠ **Sólo se ofrecen operadores `activo = true`.** La baja de personal es desactivar y
      nunca borrar, y un operador desactivado no debe poder recibir turnos nuevos.
- [ ] **Paso 3.** ⚠ **PASO BLOQUEADO: la decisión C sigue abierta** *(Q-21)*. Al borrar o acortar un
      turno, o se dice **cuántas reservas quedan descubiertas** y el admin decide, o se impide. **No se
      elige al ejecutar.** Si al llegar aquí sigue sin decidirse, **se para y se pregunta**: dejar el
      borrado sin ninguna de las dos cosas es la opción que nadie eligió.

**Commit:** `feat: turnos de operador por sede y dia`

---

## Tarea 10 · El aviso de D-76 · «cerrado» no es «sin operador»

- [ ] **Paso 1.** El panel de los **próximos 7 días** *(la ventana móvil de D-3)*: qué sedes tienen horas
      declaradas **sin ningún turno detrás**.
- [ ] **Paso 2.** Las tres formas de §5.3, distinguibles en pantalla: **cerrado** *(sin fila)*, **sin
      operador asignado** *(fila sin cobertura)*, y **tramo descubierto** *(el bloque no aparece y el día
      muestra lo que sí)*.
- [ ] **Paso 3.** ⚠ **Este es el fallo diseñado a propósito** *(D-76)*, y el aviso va **en la pantalla
      donde se corrige**. Sin él, una sede sin turnos se lee como «hoy no hay nada» y nadie pregunta.

**Commit:** `feat: aviso de sede con horario y sin operador`

---

## Tarea 11 · El calendario del alumno

- [ ] **Paso 1.** Comprobar en navegador que el calendario refleja los turnos: **con el turno completo
      del seed, la rejilla de siempre**; quitando un turno, **las franjas desaparecen**.
- [ ] **Paso 2.** ⚠ **El control positivo:** que la franja que sobrevive es la que se predijo, no que
      «hay menos». **Un calendario más corto no distingue «filtra bien» de «se rompió la consulta».**
- [ ] **Paso 3.** El mensaje que ve el alumno cuando la sede abre y no hay nadie: genérico, y **no dice
      quién falta** — un nombre de operador es dato de personal.

**Commit:** `fix: lo que el alumno ve cuando no hay operador`

---

## Tarea 12 · La octava prueba E2E

- [ ] **Paso 1.** `e2e/horarios.spec.ts`: un admin carga un turno y el calendario del alumno lo refleja.
- [ ] **Paso 2.** ⚠ **La prueba tiene que fallar si se borra la cobertura**, y se comprueba quitándola una
      vez. Una prueba E2E que pasa con y sin el cambio no mide el cambio.
- [ ] **Paso 3.** `db reset` → calentar Auth con **una** petición → `npm run test:e2e`. **Esperado: 8/8.**

**Commit:** `test: E2E del calendario con turnos`

---

## Tarea 13 · Verificación de punta a punta y cierre

- [ ] **Paso 1.** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- [ ] **Paso 2.** `npx supabase db reset`, luego `npx supabase test db`.
- [ ] **Paso 3.** `npm run test:e2e` con Auth caliente.
- [ ] **Paso 4.** `npx supabase migration list` → **34**, `local` con las dos nuevas y `remote` **sin
      ellas**: es lo esperado, porque **el `db push` es un paso aparte y lo da Alejandro**.
- [ ] **Paso 5.** Cerrar `ESTADO_Y_PLAN.md` —la fila de la tanda en §6, la bitácora, las `D-n` nuevas y
      Q-21— **antes** de pasar los comandos de git, nunca después.
- [ ] **Paso 6.** ⚠ **Escribir las predicciones de producción por delante**, antes de que nadie dé un
      `db push`. Ver la tabla de abajo.

**Commit:** `docs: cierre de la F3-T4`

---

## Puntos a verificar

*Se contestan con lo medido, no con lo esperado.*

| # | Pregunta | Salida A | Salida B |
|---|---|---|---|
| **V-1** | ¿La intersección ofrece la franja que cruza de un turno a otro? | 13 sin hueco, **8** con hueco | **Para y decide Alejandro** *(decisión A)* |
| **V-2** | ¿La rejilla sigue siendo más estricta que la RPC y nunca más laxa? | Toda franja ofrecida se acepta | Es el defecto que Q-19 describió: **se para** |
| **V-3** | ¿`campus_hours` vacío rechaza con el mensaje de la **sede**, y sin turnos con el del **operador**? | Dos mensajes distintos | Uno solo: D-76 no está implementado |
| **V-4** | ¿Las nueve baterías que reservan siguen pasando **sin tocarlas**? | 200 aserciones intactas | El seed no cubre algún escenario: **se arregla el seed, no la prueba** |
| **V-5** | ¿El séptimo enlace cabe en la segunda fila a 1440 px? | Cabe, o se desplaza con `overflow-x-auto` | Se anota y **lo resuelve la fase visual**, no ésta |

---

## Predicciones de cifras, escritas antes de medirlas

| Métrica | Antes | Después |
|---|---|---|
| Migraciones | 32 | **34** |
| Archivos pgTAP | 33 | **36** |
| Aserciones pgTAP | 200 | *(se predice al escribir la Tarea 5, contando)* |
| Vitest, archivos / pruebas | 12 / 166 | **≥ 12 / ≥ 166** |
| E2E, archivos / pruebas | 5 / 7 | **6 / 8** |
| Enlaces de admin en la cabecera | 6 | **7** |

⚠ **Y las predicciones contra producción, que son las que sólo se pueden escribir antes:** tras el
`db push`, `campus_hours` = **14 filas** *(2 sedes × 7 días, 08:00–22:00, sembradas desde `app_settings`)*
y `staff_shifts` = **0**. **Con `staff_shifts` en 0, el calendario de producción sale vacío y eso es
correcto** *(corrección 6)*. **La tanda no está terminada hasta que haya turnos cargados de operadores
reales**, y eso no lo entrega un commit.

---

## Cabecera de correcciones

*(Lo que la ejecución desmienta va aquí, no reescribiendo el plan.)*

*Vacía: la tanda no se ha ejecutado.*
