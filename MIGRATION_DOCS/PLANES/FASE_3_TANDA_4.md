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

**Y el estado de producción, medido el mismo día:** `staff_members` = **1**, de los cuales **operadores =
0** y **admins = 1**; `alumnos` = 1; `inventory_reservations` = **0**; productos / unidades / notas / sedes
= **34 / 92 / 68 / 2**. Sin despliegue del Next.js: **no hay `netlify.toml`, `vercel.json` ni Dockerfile en
el repositorio**, sólo los tres workflows de CI, que no publican.

> ⚠ **Este bloque decía «la precondición» y esa palabra sobraba, corregido el 2026-08-20 con D-93.** El
> **1 admin es suficiente** para desplegar la tanda: los turnos son de cualquier miembro activo de
> `staff_members` y **nunca estuvieron atados al rol**. **El 0 de operadores es un dato del servicio, no
> una puerta cerrada del sistema** — y esa diferencia se dio por sabida en tres documentos seguidos sin
> que nadie la comprobara.

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
   vacía como con `products.featured`: **acaba en que nadie puede reservar nada.**

   > ⚠ **CORREGIDA el 2026-08-20, el mismo día, por D-93 — y la corrección es del género que este
   > proyecto persigue: el peligro es real y la conclusión que se sacaba de él era falsa.** Aquí se
   > cerraba diciendo que *«esta tanda no se despliega hasta que haya operadores de verdad»*. **No es
   > cierto:** `staff_shifts.staff_id` referencia `staff_members(user_id)` **sin filtro de rol**
   > —`FASE_3_DISENO.md:259`—, así que **el admin se asigna turnos a sí mismo** y el calendario dice la
   > verdad con una sola persona. **Lo que se midió era el dato; lo que se copió sin comprobar era la
   > inferencia.** El riesgo del párrafo de arriba **sigue en pie tal cual**: si se despliega con
   > `staff_shifts` vacío, nadie puede reservar. **Lo que cambia es la cura** — ya no es «esperar a que
   > contraten», es **cargar turnos antes o a la vez que el `db push`**, y eso sí lo entrega esta tanda.

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
✅ **Las tres están resueltas desde el 2026-08-20, las tres por Alejandro. El plan no tiene ningún hueco
de decisión: se puede ejecutar entero en cuanto haya operadores.**

| # | Qué había que decidir | Resuelto |
|---|---|---|
| **A** | **¿La cobertura es por la unión de turnos o por un turno solo?** | ✅ **La UNIÓN. De Alejandro, el 2026-08-20 → D-90.** Alimentada por la corrección 3, medida con control negativo: 13 franjas con dos turnos consecutivos y 8 con un hueco. **La comprobación es «cada bloque del tramo cae en algún turno»**, y como D-19 obliga a que la duración sea múltiplo del bloque, se escribe **sin unir intervalos y sin `distinct`** |
| **B** | **¿`app_settings.opening_time` y `closing_time` se borran o se dejan muertas?** §5.2 delegaba esto al plan explícitamente | ✅ **SE BORRAN, con su restricción `app_settings_horario`. De Alejandro, el 2026-08-20 → D-91.** El argumento no es de limpieza: **una columna que conserva su nombre y deja de gobernar es la forma exacta de `products.description`** *(D-82)*, que este proyecto ya pagó una vez |
| **C** | **¿Q-21 entra en esta tanda o se deja escrito?** | ✅ **AVISAR SIN IMPEDIR. De Alejandro, el 2026-08-20 → D-92, y con ella se CIERRA Q-21.** Se eligió por **cuál de los dos daños es reversible**: un turno huérfano deja a un alumno frente a un mostrador vacío —visible y arreglable—; impedir el borrado deja al admin sin poder reflejar que un operador se fue, salvo **cancelando reservas de alumnos una a una**. ⚠ **El recuento es la parte que D-90 vuelve fácil de hacer mal** — ver el paso 3 de la Tarea 9 |

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

- [ ] **Paso 1.** Las dos tablas de §5.1, tal cual. ⚠ **NO se añade alineación sobre `staff_shifts`**: con
      la corrección 2 los turnos no generan rejilla, así que no pueden desalinearla.
- [ ] **Paso 1 bis.** ⚠ **La alineación de `campus_hours.opens_at` va en DOS DISPARADORES, no en un
      `CHECK`** — ver la **corrección 1 de la cabecera**, medida: `cannot use subquery in check
      constraint`. Uno sobre `campus_hours` y otro sobre `app_settings` para la puerta de atrás de
      `slot_minutes`, **que ahora puede desalinear 14 filas de golpe en vez de una**.
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

- [x] **Paso 1.** `lib/reservas/consultas.ts`: quitar `openingTime` y `closingTime` del tipo
      `AjustesReserva` y del `return` *(corrección 4)*. **Cuatro líneas.**
- [x] **Paso 2.** `npm run typecheck`. ⚠ **Aquí el typecheck es el instrumento:** si algún consumidor los
      leía y el `grep` no lo vio, sale ahora. **Esperado: verde**, y si no lo está, la corrección 4 estaba
      mal y se anota.
- [x] **Paso 3.** **D-91: borrar** `opening_time` y `closing_time` de `app_settings`, **con su restricción
      `app_settings_horario`**. ⚠ **En una migración 35 PROPIA y no dentro de la 34** — ver la
      **corrección 5**: la 34 se confirma en la Tarea 3 y meterlo aquí obligaría a editar una migración ya
      commiteada. **El orden lo garantiza el timestamp:** primero las RPC dejan de leerlas *(Tarea 3)*,
      después se borran.
- [x] **Paso 4.** Y con ellas, los **siete** sitios que las arrastran, contados en D-91:
      `opening_time_aligned` *(D-54, que se muda a `campus_hours` en la Tarea 2)*,
      `supabase/tests/32_opening_time_aligned.sql` *(Tarea 5)*,
      `components/admin/formulario-ajustes.tsx`, `lib/admin/configuracion.ts`, `lib/admin/acciones.ts`,
      `lib/admin/ajustes.ts` *(los cuatro en la Tarea 7)* y `lib/database.types.ts`.
- [x] **Paso 5.** Regenerar `lib/database.types.ts` **con el comando, nunca a mano**.

**Commit:** `refactor: el horario global deja de gobernar la rejilla`

---

> ### ✂ Aquí corta la mitad A si la tanda se parte
>
> Hasta aquí: **dos migraciones, cinco archivos de prueba y el seed**. Lo que sigue **no toca el esquema**.

---

## Tarea 7 · `/admin/ajustes` pierde apertura y cierre

- [x] **Paso 1.** Quitar los dos campos del formulario y de `guardarAjustes()`.
- [x] **Paso 2.** Dejar en su sitio un enlace a `/admin/horarios`, para que quien vaya a buscarlos donde
      siempre estuvieron **encuentre adónde fueron**.
- [x] **Paso 3.** Comprobar que las pruebas de Vitest de ajustes siguen en verde o se ajustan.

**Commit:** `feat: ajustes deja de llevar el horario global`

---

## Tarea 8 · `/admin/horarios` · el horario de cada sede

- [x] **Paso 1.** `lib/admin/horarios.ts` con la lectura y las acciones de servidor. **La autorización la
      pone RLS**, no la pantalla.
- [x] **Paso 2.** La pantalla, con una tabla por sede: siete días, apertura y cierre. **Un día sin fila es
      un día cerrado**, y se ve que lo está *(D-76)*.
- [x] **Paso 3.** ⚠ **El error de la base no se reenvía al cliente**: mensaje genérico más el id de
      correlación, y el contexto entero a Sentry bajo ese id.
- [x] **Paso 4.** **El séptimo enlace en `components/cabecera-personal.tsx`** *(corrección 8)*, y **se
      mira la barra a 1440 px** antes de dar la tarea por hecha.

**Commit:** `feat: pantalla de horarios por sede`

---

## Tarea 9 · Los turnos de cada operador

- [x] **Paso 1.** En la misma ruta: alta, edición y baja de turnos, por operador y por sede.
- [x] **Paso 2.** ⚠ **Se ofrece TODO el personal `activo = true`, admin incluido** *(D-93)*, no sólo los
      de rol `operator`: el modelo nunca ató los turnos al rol y **hoy el único personal que existe en
      producción es un admin**. La baja de personal es desactivar y nunca borrar, y **un miembro
      desactivado no debe poder recibir turnos nuevos** — eso sí se filtra.
- [x] **Paso 3.** **D-92, que cierra Q-21: al borrar o acortar un turno se AVISA y no se impide.** Antes
      de confirmar, la pantalla dice **cuántas reservas quedan descubiertas**; el admin decide con el
      dato delante.
- [x] **Paso 4.** ⚠ **EL RECUENTO ES LA PARTE QUE SE HACE MAL, y el motivo es D-90.** *«Las reservas que
      caían dentro de ese turno»* **no es la cifra**: con la cobertura por unión, **el turno de un
      compañero puede seguir cubriéndolas**, así que ese total sale **inflado** y el admin decide sobre
      un número que mide otra cosa. **Se cuenta recalculando la cobertura SIN ese turno** y quedándose
      con las que dejan de estarlo. **Es la lección de la migración 28 aplicada por adelantado.**
- [x] **Paso 5.** El universo, acotado y medido contra el enum `reservation_status` y no recordado:
      **reservas no terminadas —`reserved` y `active`—**, nunca `cancelled`, `completed`,
      `not_picked_up` ni `not_returned`. ⚠ **Y se mira el intervalo entero `[start_at, end_at)`, no sólo
      el inicio:** un turno que desaparece por la tarde descubre la **devolución** de una reserva
      retirada por la mañana.
- [x] **Paso 6.** ⚠ **El control que hace válido el recuento:** montar dos turnos solapados, borrar uno y
      comprobar que el aviso dice **0** —el compañero cubre—, y repetirlo sin solape para que diga el
      número real. **Un aviso que siempre da un número no distingue «cuenta bien» de «cuenta las de ese
      turno».**
- [x] **Paso 7.** **No va a Sentry:** es una acción esperada del admin, no un incidente.

**Commit:** `feat: turnos de operador por sede y dia`

---

## Tarea 10 · El aviso de D-76 · «cerrado» no es «sin operador»

- [x] **Paso 1.** El panel de los **próximos 7 días** *(la ventana móvil de D-3)*: qué sedes tienen horas
      declaradas **sin ningún turno detrás**.
- [x] **Paso 2.** Las tres formas de §5.3, distinguibles en pantalla: **cerrado** *(sin fila)*, **sin
      operador asignado** *(fila sin cobertura)*, y **tramo descubierto** *(el bloque no aparece y el día
      muestra lo que sí)*.
- [x] **Paso 3.** ⚠ **Este es el fallo diseñado a propósito** *(D-76)*, y el aviso va **en la pantalla
      donde se corrige**. Sin él, una sede sin turnos se lee como «hoy no hay nada» y nadie pregunta.

**Commit:** `feat: aviso de sede con horario y sin operador`

---

## Tarea 11 · El calendario del alumno

- [x] **Paso 1.** Comprobar en navegador que el calendario refleja los turnos: **con el turno completo
      del seed, la rejilla de siempre**; quitando un turno, **las franjas desaparecen**.
- [x] **Paso 2.** ⚠ **El control positivo:** que la franja que sobrevive es la que se predijo, no que
      «hay menos». **Un calendario más corto no distingue «filtra bien» de «se rompió la consulta».**
- [x] **Paso 3.** El mensaje que ve el alumno cuando la sede abre y no hay nadie: genérico, y **no dice
      quién falta** — un nombre de operador es dato de personal.

**Commit:** `fix: lo que el alumno ve cuando no hay operador`

---

## Tarea 12 · La octava prueba E2E

- [x] **Paso 1.** `e2e/horarios.spec.ts`: un admin carga un turno y el calendario del alumno lo refleja.
- [x] **Paso 2.** ⚠ **La prueba tiene que fallar si se borra la cobertura**, y se comprueba quitándola una
      vez. Una prueba E2E que pasa con y sin el cambio no mide el cambio.
- [x] **Paso 3.** `db reset` → calentar Auth con **una** petición → `npm run test:e2e`. **Esperado: 8/8.**

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
| **V-6** | **¿El aviso de D-92 cuenta las reservas que quedan descubiertas, o las que caían en el turno?** | Con dos turnos solapados, borrar uno avisa **0**; sin solape, avisa el número real | Está contando por turno y no por cobertura: **es la cifra inflada de la corrección de D-90 y se arregla**, no se documenta |

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
y `staff_shifts` = **0**. **Con `staff_shifts` en 0 nadie puede reservar** *(corrección 6)*, así que el
`db push` **no es el último paso**.

**El último paso lo entrega esta tanda, y desde D-93 no depende de nadie más:** el admin carga sus propios
turnos desde `/admin/horarios`, y se verifica **por el efecto y con control positivo** —el calendario del
alumno ofrece franjas dentro de esos turnos y **ninguna fuera**—. Producción tiene **1 miembro de
`staff_members`, un admin**, medido el 2026-08-20: **es suficiente**.

⚠ **Lo que sigue siendo cierto y es más pequeño de lo que este plan afirmó dos veces:** sin operadores
contratados, **la atención depende de una sola persona**. Es una limitación **del servicio**, no del
sistema, y el sistema la refleja con exactitud en vez de disimularla.

---

## Cabecera de correcciones

*(Lo que la ejecución desmienta va aquí, no reescribiendo el plan.)*

1. ⚠ **LA TAREA DE RIESGO ENCONTRÓ ALGO, Y NO ES LA INTERSECCIÓN: `D-54` NO SE PUEDE MUDAR A
   `campus_hours` COMO UN `CHECK`.** La Tarea 2, paso 1, dice *«la restricción de alineación sobre
   `campus_hours.opens_at`, que es D-54 mudándose de tabla»*. **Postgres lo rechaza, medido y no
   deducido:**

   ```
   ERROR:  cannot use subquery in check constraint
   ```

   **El motivo es que en `app_settings` la regla funcionaba por una casualidad de forma:** `opening_time`
   y `slot_minutes` viven **en la misma fila**, así que el `CHECK` no necesitaba mirar fuera.
   `campus_hours` no tiene `slot_minutes` — vive en `app_settings` — y **un `CHECK` no puede leer otra
   tabla**. Es la misma pared contra la que Q-14 ya se había dado.

   **La cura son DOS disparadores, y hacen falta los dos:**
   - `before insert or update on public.campus_hours` → valida `opens_at` contra
     `app_settings.slot_minutes`.
   - `before update on public.app_settings` → si cambia `slot_minutes`, comprueba que **ninguna** fila de
     `campus_hours` quede desalineada.

   ⚠ **El segundo no es simetría decorativa: el daño creció de tamaño.** En `app_settings` cambiar
   `slot_minutes` podía desalinear **una** fila, y el `CHECK` de la propia tabla lo frenaba; con
   `campus_hours` puede desalinear **14 de golpe** *(2 sedes × 7 días)* **y ya no hay `CHECK` que lo
   frene**. **La prueba 32 ya tiene la forma correcta** —su aserción 1 prueba la vía directa y la 3 «la
   puerta de atrás» de `slot_minutes`—, así que **cambia la tabla y no el diseño de la prueba**.

2. ✅ **La intersección salió por la salida A con las tablas reales y `available_units` dentro**, o sea
   que la medición del prototipo no dependía de haberla hecho sobre tablas temporales. **13 franjas** de
   2 h con dos turnos consecutivos —**incluida 11:00–13:00**— y **8** con un hueco de una hora, con
   `available_units` devolviendo **3** en todas. ⚠ **Y el borde que más valía comprobar:** sobrevive
   **09:00–11:00**, que termina exactamente donde acaba el turno, lo que confirma que el `>=` sobre
   `ends_at` es el operador correcto y no uno más laxo de la cuenta.

3. ⚠ **EL ORDEN DE LAS TAREAS ESTÁ MAL: la 4 no puede ir después de la 2, porque sin ella la 2 NO SE
   PUEDE VERIFICAR.** Y no se dedujo, se pagó: la primera verificación de la Tarea 2 dio `campus_hours` =
   **0** donde el plan predecía 14, **y los tres controles de debajo salieron todos en verde sobre una
   tabla vacía** —dos `UPDATE 0` leídos como «el trigger cierra» y un `0` de RLS leído como «el alumno no
   ve turnos»—. **Un cero por no haber nada que mirar se lee exactamente igual que un cero por
   funcionar**, y aquí hubo tres seguidos.

   **La causa la tenía escrita el propio `seed.sql` desde la migración 27** *(D-77)*: `db reset` aplica
   las migraciones y **después** corre el seed, así que **cuando la migración siembra, `campuses` está
   VACÍA en local**. En producción las dos sedes existen desde antes y sí habría sembrado.

   ⚠ **Con `salon_devolucion` eso se aceptó —una columna de texto que el seed rellena aparte—. Aquí no se
   puede:** si la siembra falla en producción, **nadie puede reservar**, y el precedente deja esa
   sentencia sin probar en local. **La cura es una función, `private.sembrar_horarios_por_defecto(opens,
   closes)`, a la que llaman la migración Y el seed** — copiar el `INSERT` en el seed habría dejado dos
   versiones que se separan, y **la que corre en producción sería la que nadie probó**. La función
   **recibe las dos horas en vez de leer `app_settings`** porque la migración 34 borra esas columnas
   *(D-91)*: una función que las leyera quedaría rota al día siguiente de escribirse. Y **devuelve el
   número de filas insertadas**, que es lo que permite verificarla por el efecto.

4. ✅ **Tarea 2 verificada, y las cifras del plan salieron exactas una vez sembrado el seed:**
   `campus_hours` = **14** *(2 sedes × 7 días, las 14 coincidiendo con `app_settings`)* y `staff_shifts` =
   **13** *(7 de Monterrico + 6 de San Miguel, sin el miércoles, a propósito para poder probar D-76)*.
   **Con los controles en las dos direcciones, sin los cuales nada de esto valdría:** el trigger rechaza
   `09:10` y **acepta `09:00`**; la puerta de atrás rechaza bajar el bloque a 20 min diciendo **«14
   horario(s) de sede sin alinear»** —la cifra correcta— y **acepta el mismo 20 con la apertura en
   08:00**; las tres funciones nuevas dan `EXECUTE = false` para `authenticated` y `anon` **mientras
   `is_admin` e `is_staff` dan `true`**, que es lo que distingue «revocado» de «la sonda pregunta mal»; y
   el alumno ve **14 horarios y 0 turnos** mientras **el admin ve 14 y 13**. ✅ **Y las 200 aserciones
   existentes siguen pasando sin tocar una prueba** —`Files=33, Tests=200, PASS`—, que era el riesgo que
   describe la corrección 1.

5. ⚠ **El borrado de columnas de D-91 va en una migración 35 PROPIA, no dentro de la 34.** La Tarea 6,
   paso 3, dice *«va en la migración 34, no en una tercera»*. **No se sostiene al ejecutar:** la 34 se
   escribe y se confirma en la Tarea 3, y la Tarea 6 llega cinco tareas después. Meterlo en el mismo
   archivo obligaría a **editar una migración ya confirmada**, o a dejar el commit de la Tarea 3 con una
   migración a medias. **Un archivo por propósito, y el orden lo garantiza el timestamp**, que es la
   convención del proyecto desde la Fase 1. La 34 deja `opening_time` y `closing_time` **existiendo y
   sin gobernar nada**, y su cabecera lo dice para que nadie las lea creyendo que mandan.

6. ⚠ **LA SONDA DE LA PROPIEDAD SE MONTÓ MAL LA PRIMERA VEZ, Y CONFIRMABA LA HIPÓTESIS EQUIVOCADA.**
   Recorrer las 25 franjas llamando a `create_reservation` **sin revertir entre intentos** dio **1
   aceptada y 24 rechazadas**, que leído deprisa es *«la rejilla ofrece franjas que la RPC rechaza»* — o
   sea, justo la propiedad rota. **El mensaje decía otra cosa:** *«Ya tienes una reserva de este producto
   para ese dia»*, que es **BR-09, el límite diario**, no el horario. **La primera reserva agotaba el
   cupo y envenenaba las 24 siguientes.** Es el mismo género que la sesión del 2026-08-19 ya pagó: **un
   control mal montado que confirma lo que se temía**, y lo salvó leer el mensaje en vez de el recuento.
   La versión correcta pone cada intento en su propio bloque `BEGIN/EXCEPTION` de plpgsql —savepoint
   implícito— y fuerza el rollback tras aceptar.

7. ✅ **Tarea 3 verificada por el efecto, y la propiedad se sostiene: 25 franjas ofrecidas, 25
   ACEPTADAS, 0 rechazadas.** ⚠ **Con el control negativo que la hace válida:** pedir las **07:00**
   —una hora que la rejilla no ofrece— se rechaza con *«Fuera del horario de atencion»*; sin él, un 25
   de 25 no distingue «valida bien» de «acepta cualquier cosa». **Los dos mensajes de D-76 salen
   distintos y por la causa correcta:** sin turno ese día, *«No hay ningun operador en ese horario»*;
   sin fila en `campus_hours`, *«Ese dia la sede no abre»*. **Y las 200 aserciones siguen pasando sin
   tocar una sola prueba** —`Files=33, Tests=200, PASS`—, que era exactamente el riesgo de la
   corrección 1: **la cura era el seed y no reescribir nueve archivos**. La sonda dejó **0** reservas.

8. ⚠ **`29_available_slots.sql` NO rompió, y la corrección 1 decía que sí.** La predicción era que la
   29 caía con la 32; **pasó tal cual, sin tocar una línea**, porque el seed siembra turnos que cubren
   el día entero y sus seis aserciones miran los mismos bordes de siempre. **La corrección 1 acertó en
   lo caro —las nueve baterías de `create_reservation`— y se pasó de largo en esta.** Se deja escrito
   porque el género importa: **estimar cuántos archivos rompen no es contarlos**, y aquí la estimación
   sobró en uno. La cobertura de turnos se prueba en `43_interseccion.sql`, que es donde tiene sentido.

9. ⚠ **Dos suposiciones sobre pgTAP que costaron una corrida en rojo, y las dos se midieron:**

   - **Borrar una sede del seed para probar una cascada NO funciona.** `delete from campuses` sobre San
     Miguel falla con `inventory_units_campus_id_fkey` —esa FK **no lleva cascada**— y **aborta la
     transacción entera**, dejando `Bad plan. You planned 10 tests but ran 5` en vez de un fallo
     legible. Es el mismo modo de fallo que la F3-T2 documentó: **una prueba que aborta no prueba que
     la aserción mida, prueba que algo antes se rompió.** Las cascadas se prueban sobre **filas
     propias**, creadas dentro de la transacción.
   - ⚠ **Un `UPDATE` que RLS no deja ver NO lanza `42501`: filtra a cero filas y termina bien.** El
     `42501` sólo salta cuando el `WITH CHECK` rechaza una fila **nueva**. La primera versión probaba
     la escritura del alumno con un `UPDATE` y `throws_ok` devolvió **«no exception»**, que se lee
     como «la política no cierra» cuando **lo que no cerraba era la prueba**. Se prueba con `INSERT`.

10. ✅ **Tarea 5 cerrada: `Files=36, Tests=229, PASS`**, y el 229 salió exacto contra la predicción
    escrita antes de correrlo. Tres baterías nuevas —`41_campus_hours`, `42_staff_shifts`,
    `43_interseccion`— y la 32 reescrita contra `campus_hours` **conservando su estructura**, que es lo
    que dice que la regla de D-54 es la misma y sólo cambió de tabla.

    ✅ **La prueba de mutación salió por donde se predijo, y se comprobó DÓNDE falla.** Cambiando la
    cobertura de «cada bloque cae en algún turno» a «el tramo entero cabe en un turno» —el cambio
    exacto que D-90 descartó— fallan **la 1 y la 2 de la 43**, las 229 corren enteras **sin abortar**,
    y el recuento baja de **13 a 10**: desaparecen las tres franjas que cruzan de un turno al otro.

    ⚠ **Y destapó algo que no se buscaba: la aserción 4 —el control negativo del hueco— NO falla con la
    mutación.** Con un hueco de una hora, «por bloque» y «por tramo entero» dan **el mismo 8**. O sea
    que **el control negativo, por sí solo, no distingue las dos semánticas**: la única aserción que
    las separa es la de las 11:00. **Un control negativo que pasa no siempre acota lo que uno cree que
    acota**, y eso sólo se ve mutando.

11. ⚠ **EL PASO QUE NO ESTABA EN LA TAREA 6 Y HABRÍA DEJADO `db reset` ROTO: `supabase/seed.sql` LEÍA
    LAS DOS COLUMNAS EN TRES SITIOS.** El paso 4 enumera **siete** arrastres contados en D-91 y el seed
    no está entre ellos. **Es el único de todos que corre DESPUÉS de la migración 35** —`db reset`
    aplica las migraciones y luego siembra—, así que sin tocarlo la base local no se levanta y
    **ninguna de las 229 aserciones llega a correr**. Los tres sitios eran la llamada a
    `private.sembrar_horarios_por_defecto(s.opening_time, s.closing_time)` y los dos `insert` de
    `staff_shifts`, que sacaban las horas del mismo `cross join public.app_settings`.

    **Cómo quedan, y los dos casos no son el mismo:**
    - **La siembra pasa a literales `'08:00'`/`'22:00'`, y eso NO contradice la corrección 7.** Aquella
      dice que la **migración 33** lee de `app_settings` en vez de transcribir, y lo sigue haciendo:
      cuando corre, las columnas existen y traen el dato vivo de producción. El seed corre después de
      la 35, cuando **ya no hay de dónde leerlas**, así que ese 08:00–22:00 deja de ser una
      transcripción y pasa a ser lo que de verdad es: **el techo elegido del stack de desarrollo**,
      con el que están escritas las nueve baterías que reservan.
    - **Los dos `insert` de turnos pasan a leer `campus_hours`**, que se acaba de sembrar dos líneas
      más arriba, en vez de repetir el par de horas por tercera vez. **Quita el `generate_series` y el
      `cross join`**, y hace que el turno cubra exactamente el techo de su sede sea cual sea.
      Comprobado por el efecto con el control que lo hace valer: **0 turnos con `starts_at`/`ends_at`
      distintos de los de su fila de `campus_hours`**, sobre 13 turnos y 14 horarios.

12. ⚠ **LA TAREA 6 NO PUEDE TERMINAR EN VERDE POR SÍ SOLA, y no es una preferencia de estilo: está
    medido.** Su paso 4 manda los cuatro archivos de `/admin/ajustes` a la **Tarea 7**. Con los tipos
    regenerados —paso 5, dentro de esta misma tarea— el árbol queda con **3 errores de `tsc` en 2
    archivos**, copiados tal cual:

    ```
    lib/admin/acciones.ts(1355,7): error TS2322: Type 'string' is not assignable to type 'never'.
    lib/admin/acciones.ts(1356,7): error TS2322: Type 'string' is not assignable to type 'never'.
    lib/admin/configuracion.ts(91,23): error TS2345: Argument of type
      'SelectQueryError<"column 'opening_time' does not exist on 'app_settings'.">' ...
    ```

    **No hay orden de pasos que lo salve**, y conviene decir por qué en vez de elegir uno al azar:
    regenerar los tipos más tarde deja el commit con el esquema sin las columnas y unos tipos que
    todavía las declaran, o sea **rojo por el otro lado** —el paso «los tipos coinciden con el
    esquema» de `db.yml`, que es D-26—. **La migración y el código que lee esas columnas tienen que
    entrar en el mismo commit**, y eso es un hecho del cambio y no una decisión de quien ejecuta.
    **Así que la Tarea 6 se lleva los pasos 1 y 3 de la Tarea 7.**

    **Lo que la Tarea 7 conserva es su paso 2**, el puntero a `/admin/horarios`, **y se mueve a la
    Tarea 8** por la misma convención que la corrección 8 aplica al séptimo enlace de la cabecera:
    **el enlace entra en la tarea que construye su pantalla**, nunca antes, porque hasta entonces es
    un 404. Mientras tanto la pantalla **sí dice adónde fue el horario**, en texto y sin enlace: quien
    lo busque donde siempre estuvo tiene que encontrarlo, o va a concluir que se perdió.

13. ⚠ **D-91 NOMBRA UNA RESTRICCIÓN Y HABÍA DOS.** `app_settings_horario` es la que la decisión
    enumera, y `app_settings_apertura_alineada` —D-54/Q-19, migración 24— **también referencia
    `opening_time`**. Contadas en la base y no leídas del documento: `pg_constraint` daba **10** sobre
    `app_settings` antes y **8** después. Postgres las habría borrado solas al caer las columnas, así
    que el riesgo no era que la migración fallara: era **que no dijera lo que quita**. Se nombran las
    dos en el `alter table`, lo que además hace que el archivo **falle en voz alta** si alguna no
    existe con ese nombre.

14. **`lib/reservas/consultas.ts` eran CINCO sitios y no cuatro, y el quinto es justo el que ninguna
    herramienta ve.** La corrección 4 contó `openingTime` y `closingTime` —declaración del tipo y
    `return`, cuatro líneas— y **el `select` los nombra en `snake_case` dentro de una cadena de
    texto**. El paso 2 de la tarea dice que ahí el `typecheck` es el instrumento, y para esa línea
    **no lo es**: es una cadena. Dejarla habría pedido a PostgREST dos columnas borradas y **la
    pantalla de reservar del alumno fallaría entera**, con `lint`, `typecheck` y `build` en verde.
    ⚠ **Sobrevive por un pelo, y la salvedad importa:** una vez regenerados los tipos, `supabase-js`
    sí convierte esa cadena en un `SelectQueryError` —es lo que destapó `lib/admin/configuracion.ts`
    en la corrección 12—, así que el instrumento habría avisado **en el paso 5 y no en el 2**. La
    corrección 4 acertó en lo caro —**cero consumidores**, confirmado: el `typecheck` del paso 2 salió
    verde— y se quedó corta en el recuento. **Es el mismo género que la corrección 8: estimar cuántos
    sitios rompen no es contarlos.**

15. ✅ **Tarea 6 cerrada y verificada por el efecto, con un control positivo al lado de cada cero.**
    Las dos columnas se fueron y **las otras siete de `app_settings` siguen ahí** —sin ese control,
    «no están» no distingue «borradas» de «tabla rota»—; las dos restricciones de horario no aparecen
    y **quedan 8**; `campus_hours` = **14**, `staff_shifts` = **13** (7 + 6) y **0 turnos desalineados
    de su techo**; el `select` exacto que ahora manda la aplicación devuelve su fila (**7 / 30 / 30 /
    1 / 60**); y `available_slots` para mañana en Monterrico a 120 min sigue dando **25 franjas**, que
    es **el mismo 25 de la corrección 7**: la prueba de que quitar las columnas no vació el
    calendario. **Cero referencias vivas** a las dos columnas fuera de los comentarios que hablan de
    su borrado. `Files=36, Tests=229, PASS` —sin moverse—, Vitest **12 / 166** —sin moverse, y es lo
    esperado: lo que se borró no tenía pruebas propias—, `lint`, `typecheck` y `build` en verde.

    **`aperturaDesalineada()` NO se borra con la columna**, y se deja dicho para que nadie lo
    «termine»: `/admin/ajustes` dejó de llamarla, pero **`/admin/horarios` la va a necesitar** para el
    mismo papel de siempre —avisar en pantalla antes de guardar— ahora sobre `campus_hours.opens_at`.
    Sus pruebas de Vitest no dependen de ninguna columna, que es por lo que el 166 no se movió. ⚠ **Y
    con ella se fue la única barrera de servidor de D-54 en esta pantalla**, lo cual está bien porque
    ahora la pone la base —los dos disparadores de la migración 33—, pero **cambia quién avisa**: al
    bajar `slot_minutes` el rechazo llega del motor y no del formulario, así que
    `mensajeDeRechazoAjustes()` gana una rama para él. **Se reconoce por su texto y no por un nombre
    de restricción**, porque un trigger no tiene nombre de `check` que salga en el mensaje.

    **En reloj, medido y no citado:** `db reset` **57 s** —el más rápido de las cinco mediciones del
    proyecto, contra 114, 131, 195 y 132— y `npx supabase test db` **16 s de punta a punta**, de los
    que el arnés declara 4 de reloj de pared. **Los dos números son del mismo día y del mismo stack de
    20 contenedores.**

16. **La migración 33 apuntaba a la 34 donde debía decir 35.** Su comentario decía «la migracion 34
    BORRA opening_time y closing_time (D-91)», escrito **antes** de que la corrección 5 moviera ese
    borrado a una migración propia. Se corrige el número **y nada más** —ni una línea de
    comportamiento—, que es justo lo que la corrección 5 protegía: lo que no se puede es **editar lo
    que una migración confirmada HACE**. Dejar un puntero equivocado dentro de un archivo que alguien
    va a leer es exactamente la enfermedad que D-91 borra las columnas para evitar.

17. ⚠ **EL `build` ENCONTRÓ LO QUE `typecheck` Y `lint` NO VEN, y es un modo de fallo que este proyecto
    no tenía escrito todavía.** `lib/admin/horarios.ts` importa `createClient()` de
    `@/lib/supabase/server`, y `components/admin/tabla-horarios-sede.tsx` le importaba **una constante**
    —la lista de días—. Con eso, Turbopack se lleva el módulo entero al bundle del navegador y corta:

    ```
    Error: You're importing a module that depends on "next/headers". This API is only
    available in Server Components in the App Router, but you are using it in the Pages Router.
        ./lib/admin/horarios.ts [Client Component Browser]
    ```

    **`typecheck` y `lint` habían salido en verde los dos** —el import es legal en TypeScript y ESLint
    no modela la frontera servidor/cliente—. **La cura son tres líneas movidas a `lib/admin/semana.ts`**,
    con lo puro que la pantalla pinta: la lista de días, su etiqueta y los dos tipos. **El tipo no era
    el problema** —`import type` se borra al compilar—: lo eran los **valores**. Es la misma línea que
    la cabecera de `lib/admin/acciones.ts` ya tenía trazada por otro motivo —«la separación es por lo
    que Vitest puede resolver, no por capas»—, y ahora hay un segundo motivo, medido: **por lo que el
    navegador puede resolver**.

18. ✅ **Tarea 8 cerrada, y V-5 contestado por salida A: la barra de administración CABE a 1440 px.**
    Medido en el navegador y no estimado, sobre la fila de administración con los **siete** enlaces:
    `clientWidth` = **1440** y `scrollWidth` = **1440**. Esa fila lleva `overflow-x-auto`, así que si
    no cupiera el `scrollWidth` sería mayor; **son iguales, luego no desborda.** ⚠ **Y no es el mismo
    siete de la medición vieja de `cabecera-personal.tsx`**, que daba 1481 px sobre 1440: aquella
    contaba **Mostrador más seis de administración en UNA sola barra**, y por eso se partió en dos
    filas. Esta cuenta la **segunda** fila, donde hoy hay siete.

    **La pantalla se caminó entera con Playwright, y lo que dice la base es lo que la pantalla
    prometió:** editar el lunes de San Miguel a **09:00–18:00** dejó esa fila con esas horas y **las
    otras cinco intactas en 08:00–22:00** —el control sin el cual «guardó» no distingue una escritura
    quirúrgica de un `update` que pisa la sede entera—; cerrar el martes **borró su fila** y
    `campus_hours` pasó de **14 a 13**, con la pantalla marcando «Cerrado» y los dos campos vacíos, que
    es la primera de las tres formas de D-76. ⚠ **Con el control negativo que hace válido lo anterior:**
    una apertura de **09:10** con bloques de 30 min deja el botón de guardar **deshabilitado**, así que
    el «guardó» del primer caso no significa «acepta cualquier cosa».

    **Y un control positivo del estado del seed que conviene dejar escrito porque se presta a
    confusión:** San Miguel tiene los **siete días abiertos** en `campus_hours`. Lo que el seed deja
    sin el miércoles —a propósito, para poder probar D-76— es el **turno**, no el horario de sede. Son
    las dos capas de D-74, y confundirlas al leer la pantalla llevaría a «arreglar» un seed que está
    bien.

19. **La Tarea 7 se cierra sin commit propio, y sus tres pasos están donde tenían que estar.** Los
    pasos 1 y 3 entraron en la Tarea 6 por la corrección 12 —la migración obliga—, y el paso 2, el
    puntero a `/admin/horarios`, entró aquí, en la tarea que construye esa pantalla: **ahora es un
    enlace de verdad y no un texto**, porque la ruta ya existe. Es la convención de la corrección 8
    aplicada a un segundo enlace. **Las pruebas de Vitest de ajustes siguen en verde sin tocarlas**
    —12 / 166—: lo que se borró no tenía ninguna.

    ⚠ **Lo que el paso 3 de la Tarea 8 pide y NO se puede hacer, dicho en vez de disimulado: Sentry no
    está en este proyecto.** El paso manda «el contexto entero a Sentry bajo ese id», y `package.json`
    tiene **0 coincidencias** con `sentry`, igual que todo el árbol fuera de `node_modules`. Instalarlo
    es una dependencia nueva y una decisión de despliegue, que no es de quien ejecuta. **Lo que sí se
    respeta es la convención que este repositorio ya tiene medida y documentada** —`mensajeDeRechazoAjustes()`
    en `lib/admin/acciones.ts`—: texto propio en castellano para los rechazos **alcanzables desde la
    pantalla**, y lo no reconocido cae al mensaje del motor en vez de a un genérico que escondería una
    causa que nadie previó. `mensajeDeRechazoHorario()` traduce los **dos** que esta pantalla puede
    provocar. ⚠ **Y uno de los dos no es un `check` de tabla sino un TRIGGER**, lo que cambia cómo se
    reconoce: los dos llegan con `23514`, pero el del trigger **no trae nombre de restricción en el
    mensaje**, así que se busca por su texto —que lo escribe la migración 33 y no Postgres—.

20. ⚠ **LA TAREA 9 TRAE UNA MIGRACIÓN, Y EL CORTE DECÍA «CERO SQL» EN LA MITAD B.** El recuento de D-92
    es «recalcular la cobertura SIN ese turno», y **esa cobertura ya está escrita DOS veces en la
    migración 34** —en `available_slots` y en el paso 6-bis de `create_reservation`—, cada una con una
    nota diciendo que las dos tienen que ser idénticas o el calendario miente. **Una tercera copia en
    TypeScript sería un tercer sitio del que separarse, y el único que pgTAP no puede probar.** Es el
    mismo argumento que hizo nacer `private.sembrar_horarios_por_defecto()` en la corrección 3, y por eso
    se toma la misma salida: **migración 36, `public.reservas_descubiertas(uuid, time, time)`**.

    **Es `SECURITY INVOKER`** —lo contrario de casi todo lo demás en este proyecto—, y con motivo: el
    admin **ya** puede leer `inventory_reservations` y `staff_shifts` por sus políticas, así que RLS
    decide sola y no hay que repetir `private.is_admin()`. A quien no sea personal, `staff_shifts` le
    devuelve cero filas y la función le contesta sobre un mundo vacío.

    ⚠ **Y cambia lo que hay que empujar: son CUATRO migraciones y no tres.** La 33, la 34, la 35 y esta
    36. **El cuándo sigue sin ser de quien ejecuta.**

    **Una cosa que la función añade y D-92 no decía, dicha en vez de colada:** el universo lleva
    `end_at > now()`. Los turnos son **semanales** —por `weekday`—, así que sin ese filtro un turno de
    los lunes contaría también los lunes de hace un mes. **Contarlos inflaría el número, que es
    justamente el defecto contra el que D-92 se escribió.**

21. ⚠ **`inventory_reservations` NO TIENE `campus_id`, y la primera versión de la migración 36 dio por
    hecho que sí.** `ERROR: column r.campus_id does not exist`. Sus doce columnas son `id`,
    `product_id`, `unit_id`, `alumno_id`, `purpose`, `cancellation_reason`, `start_at`, `end_at`,
    `status`, `created_at`, `updated_at` y `blocked_range`: **la sede vive en la UNIDAD**, y se alcanza
    por `unit_id`. Cuesta un `join` y se anota porque es de un género barato de repetir: **escribir el
    nombre de columna que la frase pide en castellano —«la reserva de esa sede»— en vez del que la tabla
    tiene.**

22. ✅ **V-6 CONTESTADO POR SALIDA A, y medido dos veces: en SQL y a través de la pantalla.** La sonda
    del paso 6, sobre una reserva viva de mañana 10:00–12:00 en Monterrico:

    | Escenario | Descubiertas |
    |---|---|
    | Borrar el único turno que la cubría | **1** |
    | Acortarlo a 08:00–11:00 | **1** |
    | «Acortarlo» a 08:00–22:00, o sea sin cambio | **0** ← control positivo |
    | Con un compañero 08:00–22:00, borrar el primero | **0** ← la que la cuenta ingenua daría como 1 |
    | Con el compañero solo hasta las 11:00, borrar el primero | **1** ← «hay compañero» ≠ «cubre» |

    **Las mismas dos cifras que deciden salieron por la pantalla**, con el diálogo diciendo «1
    reserva(s) se quedarían sin nadie» sin compañero y «Ninguna reserva se queda sin alguien» con él.

23. ✅ **La batería 44 convierte la sonda en regresión, y la mutación dice DÓNDE falla y no sólo que
    falla.** `Files=37, Tests=235, PASS`, y el 235 = 229 + 6. **Mutando `reservas_descubiertas` para que
    ignore los demás turnos** —que es exactamente la cuenta ingenua que D-92 prohíbe— **falla UNA sola
    aserción, la 5**, con `have: 1, want: 0`, y **las seis corren enteras sin abortar**. Las otras cinco
    son invariantes bajo esa mutación, y eso no es un defecto del diseño de la batería sino la razón de
    ser de la 5: **es la única que separa las dos semánticas.**

24. ⚠ **UN FALLO REAL QUE SOLO SE VE EN EL NAVEGADOR: la tabla de turnos reventaba al añadir uno.**
    `TablaTurnos` sembraba su mapa de edición con los turnos de la primera carga, indexado por `id`.
    Al añadir un turno, `revalidatePath` vuelve a pintar con un turno **más**, React conserva el estado
    del componente, y **la fila nueva no tenía entrada en el mapa**: `fila.inicio` sobre `undefined`
    tumbaba la tabla entera y las filas desaparecían de pantalla. **Ni `typecheck` ni `lint` ni `build`
    lo vieron** —el índice de un `Record<string, T>` se tipa como `T`, no como `T | undefined`, salvo con
    `noUncheckedIndexedAccess`—. La cura **quita código**: no se siembra nada y, si no hay edición local,
    el valor sale del turno. ⚠ **Y explica por qué `TablaHorariosSede` sí puede sembrar el suyo:** aquella
    lo indexa por `weekday`, que son siempre los mismos siete. **Aquí la clave es un id que nace y muere.**

25. **El paso 3 de la Tarea 9 se cumple con un diálogo y NO con un aviso permanente**, y la diferencia
    importa: el número depende del cambio concreto —acortar a las 11:00 y borrar descubren cantidades
    distintas—, así que se cuenta **al pedir la confirmación** y con las horas que hay en pantalla en ese
    momento. Un aviso siempre visible tendría que elegir un cambio hipotético y sería falso para todos
    los demás. **Y `contarDescubiertas()` devuelve `null` si la consulta falla, no 0:** el 0 es
    justamente la respuesta tranquilizadora, e inventarlo sería peor que decir que no se pudo saber.
    **No va a Sentry** —que además no está instalado— porque consultar el impacto de un cambio es una
    acción esperada del admin.

26. ✅ **Tarea 10 cerrada, y el cálculo de D-76 es una función PURA con pruebas de Vitest en vez de otra
    consulta.** `lib/admin/cobertura.ts` recibe lo que la pantalla ya trajo —los horarios y los turnos— y
    devuelve, para cada día de la ventana móvil, cuál de las **cuatro** formas es: `cerrado`,
    `sin-operador`, `parcial` o `cubierto`. **Son cuatro y no las tres de §5.3** porque «no pasa nada»
    también hay que poder decirlo: sin `cubierto`, un día correcto y un día que no se pudo calcular se
    verían igual, que es la enfermedad que D-76 persigue.

    ⚠ **NO puede vivir en `lib/admin/semana.ts`, y el motivo es medible: Vitest no resuelve el alias
    `@/`.** `vitest.config.mts` no declara ninguno, y `semana.ts` importa con `@/`. Es la misma frontera
    que la cabecera de `lib/admin/acciones.ts` ya tenía escrita —«la separación es por lo que Vitest
    puede resolver, no por capas»— y ahora hay **tres** líneas trazadas por la misma razón y no por
    gusto: lo que Vitest resuelve, lo que el navegador resuelve *(corrección 17)*, y lo que necesita
    `next/headers`.

    **La ventana la fija `booking_window_days` y no un 7 escrito a mano.** El plan dice «los próximos 7
    días *(la ventana móvil de D-3)*», y esas dos cosas coinciden hoy porque la columna vale 7. Escribir
    el 7 haría que el panel avisara tarde el día que alguien la suba.

    **Nueve pruebas nuevas de Vitest, de 166 a 175**, y la que decide es la segunda: mismo día, misma
    sede, y **la única diferencia es que hay fila de horario** — una da `cerrado` y la otra
    `sin-operador`. Si las dos salieran iguales, D-76 no estaría implementado. **Y la de los turnos
    solapados es la versión aritmética del error de D-92:** 08:00–12:00 y 10:00–14:00 sobre un techo de
    08:00–16:00 **no** cubren el día —contarlos por separado daría 8 h y la unión son 6—, así que quedan
    **120 minutos** sin cubrir.

27. ⚠ **LA TAREA 11 NO ERA «COMPROBAR EN NAVEGADOR»: HABÍA UN COMENTARIO QUE HABÍA DEJADO DE SER
    CIERTO, Y ERA EL QUE DESCRIBÍA ESTA RAMA.** `components/reservas/calendario.tsx` decía, sobre el caso
    «día futuro, no inhabilitado, con cero franjas», que **«no debería poder pasar»** y que la rama era
    **defensiva**. Desde la migración 34 **es el caso normal**: la rejilla sale de `campus_hours`
    recortada por los turnos, así que una sede que abre y no tiene a nadie da cero franjas todos los días.
    Era cierto cuando se escribió y dejó de serlo el mismo día en que la 34 se confirmó, sin que nada
    avisara.

    **El texto que ve el alumno se ajusta y NO NOMBRA A NADIE** *(paso 3)*: dice que puede no haber
    atención en esa sede a esas horas. **Quién falta es dato de personal**, y el alumno no tiene por qué
    saber que el operador de su sede no tiene turno ese día. La versión anterior sólo ofrecía «prueba con
    una duración más corta», que con cobertura cero es un consejo que no lleva a ninguna parte.

28. ✅ **Tarea 12 cerrada: `e2e/horarios.spec.ts`, y la prueba MIDE EL CAMBIO, comprobado quitándolo.**
    La predicción del plan se cumple exacta: **6 archivos y 8 pruebas**, `8 passed`. La prueba borra los
    turnos de mañana en las dos sedes, comprueba que el calendario del alumno se queda sin franjas, y
    **los repone para ver que vuelven** — esa segunda mitad es lo que la separa de una prueba que también
    pasaría con la consulta rota.

    ⚠ **El paso 2 se cumplió de verdad y no de palabra: se borró la cobertura y la prueba falló.**
    Quitando el `not exists` de turnos de `available_slots` —o sea, dejando la rejilla como estaba antes
    de la migración 34—, la corrida falla en la **línea 83**, `expect(getByText('No hay franjas
    disponibles')).toBeVisible()` → `element(s) not found`: sin cobertura, el alumno sigue viendo franjas
    aunque no haya un solo turno. **Es el punto exacto donde tenía que fallar.**

    **Y lleva dos controles que el plan no pedía y que evitan dos falsos verdes:** el mensaje que se
    busca **no** es el de día inhabilitado —que también da cero franjas—, y el nombre del día se calcula
    con `Intl` y **zona horaria explícita** en vez de con `getDay()` sobre el reloj del runner, porque el
    CI corre en UTC y en Lima la fecha civil va un día por detrás las cinco primeras horas del día UTC.
    Sin eso, la prueba pediría el turno de un día y miraría el calendario de otro, **y fallaría sólo en
    esa franja horaria**.
