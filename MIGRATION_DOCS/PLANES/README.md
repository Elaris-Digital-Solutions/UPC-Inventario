# Planes de implementación por tanda

Un archivo por tanda, con el desglose paso a paso: qué prueba se escribe primero, qué SQL la hace pasar,
y qué comando la verifica.

> **Estos documentos se escriben ANTES de ejecutar y NO se reescriben después.** Lo que la ejecución
> desmiente se anota en la cabecera de cada archivo, como corrección fechada. Reescribir el plan para que
> parezca que salió bien borra justo lo que valía la pena aprender.
>
> Misma regla que ya rige en `ESTADO_Y_PLAN.md`: un hallazgo que contradice lo anterior se registra como
> corrección explícita, no editando el original.

| Plan | Tanda | Estado |
|---|---|---|
| [`TANDA_0.md`](./TANDA_0.md) | Entorno local | ✅ ejecutado el 2026-08-05 · 3 desvíos |
| [`TANDA_1.md`](./TANDA_1.md) | Identidad y autorización | ✅ ejecutado el 2026-08-05 · 3 correcciones |
| [`TANDA_2.md`](./TANDA_2.md) | Reglas de reserva | ✅ ejecutado el 2026-08-05 · 5 correcciones |
| [`TANDA_3.md`](./TANDA_3.md) | Derivados, linter y limpieza | ✅ ejecutado el 2026-08-05 · 2 correcciones · cierra la Fase 1 |
| [`FIX_FUNCIONES_TRIGGER.md`](./FIX_FUNCIONES_TRIGGER.md) | *Fix posterior:* funciones de trigger expuestas como RPC | ✅ ejecutado el 2026-08-05 · sin correcciones |

### Fase 2 · La aplicación Next.js

| Plan | Tanda | Estado |
|---|---|---|
| [`FASE_2_TANDA_0.md`](./FASE_2_TANDA_0.md) | Cimientos: borrar el Vite, Next.js, tokens, tipos, y las dos últimas migraciones | ✅ ejecutado el 2026-08-06 · 4 correcciones al diseño + **13 al plan** · 4 puntos a verificar resueltos |
| [`FASE_2_TANDA_1.md`](./FASE_2_TANDA_1.md) | La sesión: `@supabase/ssr`, `proxy.ts`, magic link, completar perfil, sembrar el admin, y la puerta del dominio *(D-32)* | ✅ **ejecutado y mergeado el 2026-08-07** (PR #21) · 6 correcciones al diseño + **48 al plan** · **cierra P0-3 y Q-15** |
| [`FASE_2_TANDA_2A.md`](./FASE_2_TANDA_2A.md) | El alumno que mira: landing, FAQ, catálogo con sede y detalle. **No escribe una sola fila** | ✅ **ejecutado y mergeado el 2026-08-10** (PR #25; el #24 fue el del plan) · **41 correcciones al plan** |
| [`FASE_2_TANDA_2B.md`](./FASE_2_TANDA_2B.md) | El alumno que reserva: el calendario, la reserva, la sanción, `/mi-panel`, la cancelación y la encuesta | ✅ **ejecutado y mergeado el 2026-08-11** (PR #27) · **57 correcciones al plan** · estrena Vitest |
| [`FASE_2_TANDA_3A.md`](./FASE_2_TANDA_3A.md) | El mostrador: entregar, recibir, las dos faltas con sanción real, anotaciones de unidad. **Y la migración 23** *(D-38)* | ✅ **ejecutado y mergeado el 2026-08-12** (PR #29) · correcciones al plan por tarea, sin total declarado · **cierra Q-17**, abre Q-18 |
| [`FASE_2_TANDA_3B.md`](./FASE_2_TANDA_3B.md) | La administración: inventario en tres URL, imágenes con firma de servidor, reservas, días, estadísticas, personal y ajustes | ✅ **ejecutado y mergeado el 2026-08-13** (PR #30) · **145 correcciones al plan** · **cierra P0-4 y Q-14**, abre Q-19 |
| [`FASE_2_TANDA_4.md`](./FASE_2_TANDA_4.md) | El endurecimiento: cabeceras con CSP por nonce, E2E de Playwright, lint y auditoría bloqueantes, Q-13, y la migración 24 *(Q-19)* | ~~📝 escrito el 2026-08-13 · **en ejecución**~~ ⚠ **Corregido el 2026-08-18:** ✅ **ejecutado y mergeado el 2026-08-15** (PR #33) · **D-55 a D-68** · **cierra Q-10, Q-13 y Q-19, y con ella la Fase 2 entera** |

### Después de la Fase 2, antes de la Fase 3

| Plan | Tanda | Estado |
|---|---|---|
| [`TANDA_5.md`](./TANDA_5.md) | Los dos pendientes que exigían SQL: Q-18 *(notas privadas)* y M-12 *(margen de cancelación)*. Migraciones 25 y 26 | ✅ **ejecutada y EN PRODUCCIÓN el 2026-08-16** (PR #34) · **D-69 a D-72** · **cierra Q-18 y M-12**, abre Q-20 |

> **Su fila de bitácora decía que «no abre una Fase 3»**, y era cierto al escribirlo. Lo desmintió una
> petición del cliente el 2026-08-18, no el despliegue. Por eso las tandas de abajo llevan prefijo `F3-`:
> ya hay una «tanda 5» y no es de esa fase.

### Fase 3 · Los cambios acordados con el cliente

| Plan | Tanda | Estado |
|---|---|---|
| [`FASE_3_TANDA_1.md`](./FASE_3_TANDA_1.md) | FAQ, salones y fichas: el salón pasa a la sede *(D-77)*, **se desempaqueta `products.description`** *(D-82)*, el FAQ gana la facultad y el TIU *(D-78)*, y el formulario se muda a la primera reserva *(D-79)*. Migraciones 27, 28 y 29 | ⚠ **ejecutado EN LOCAL el 2026-08-18** · **7 correcciones al diseño + 19 al plan** · 8 tareas · 53 pasos · V-1, V-2 y V-3 resueltos y **V-4 no**, porque se mide contra producción · **abre Q-25 y Q-26** · ✅ **EN PRODUCCIÓN el 2026-08-19** (PR #38) · **cierra Q-23 y V-4: son 2, la predicción acertó** · ⚠ **dejó 41 notas duplicadas** —el diseño midió el origen y no el destino—, **arregladas el mismo día con la migración 30** *(D-83, PR #39)*: de 109 notas a 68, cero duplicados |
| [`FASE_3_TANDA_2.md`](./FASE_3_TANDA_2.md) | Operadores, primer correo y limpieza: la función del primer acceso *(D-80)*, su columna en `/admin/personal`, el **borrado de los datos de demo** y la séptima prueba E2E *(Q-25)*. Migraciones 31 y 32 | ✅ **EN PRODUCCIÓN el 2026-08-19** (PR #42, `db push` aplicado, las 32 con `local` y `remote` idénticos) · **11 correcciones al diseño + 8 al plan** · 7 tareas · **los cuatro puntos a verificar resueltos** · **cierra Q-25**, **amplía Q-20** · 200 aserciones en 33 archivos, 158 de Vitest, E2E 7/7 · **catorce predicciones de cifras, catorce exactas** · datos de demo borrados con los tres controles intactos (34 / 92 / 68) |
| [`FASE_3_TANDA_3.md`](./FASE_3_TANDA_3.md) | Imágenes en los paneles: miniatura en la lista de inventario y en el mostrador, lightbox, y **la medición de Q-20 por la vía del nonce**. **Cero migraciones** | ⚠ **ejecutada EN LOCAL el 2026-08-19** · **13 correcciones al diseño + 8 al plan** · 7 tareas · **los 5 puntos a verificar resueltos, los 5 por A** · **D-87** · **166 de Vitest en 12 archivos, pgTAP 200 en 33 sin moverse, E2E 7/7** · **sin migraciones: no hay `db push`** · ✅ **Q-20 en gran parte curado con `setNonce()`: de 5 violaciones a 1**, y el *scroll-lock* **ahora se aplica** —`overflow: visible` a `hidden`—, con control positivo en las dos direcciones · ⚠ **y desmiente la deducción que lo propuso: los dos hashes eran DOS MECANISMOS**, no dos hojas del mismo inyector; el que queda lo renderiza el `Select` de Radix en JSX · ⚠ **pgTAP dio 7 archivos en rojo y NO era una regresión: era la base sucia** que dejó la propia verificación |
| [`FASE_3_TANDA_5.md`](./FASE_3_TANDA_5.md) | PWA: `manifest` e iconos, y **la reverificación completa de la CSP** *(D-81)*. **Cero migraciones, cero SQL y cero dependencias nuevas** | ✅ **EJECUTADA Y VERIFICADA EN LOCAL el 2026-08-19** · **los 4 puntos por la salida A** · **E2E 7/7, exit 0, 204 s** *(al segundo intento: el primero dio 1 de 7 por Docker caído, y las mismas 7 pasan sin tocar código)* · ✅ **se instala sin service worker, medido por el efecto**: `beforeinstallprompt` con **0** service workers, manifest e iconos en **200**, **0 violaciones** y `csp.ts` sin tocar · lint, typecheck, build en verde · **Vitest 166/12**, **pgTAP 200/33 PASS** · **10 correcciones al plan** · ⚠ **el primer E2E dio 1 de 7 por Docker caído** *(GoTrue: «Processing this request timed out»)*, **y no era regresión**: reparado el entorno, las mismas 7 pasan. **La `[4/7]` es la que ejercita `proxy.ts`**, el único archivo de comportamiento que la tanda tocó · ⚠ **destapó que la aplicación en local hablaba con PRODUCCIÓN** —`.env.local` con un token pelado sin nombre de variable— y que **el cortafuegos de entorno protege a Playwright, no a `npm start`** · ⚠ **la salida no prevista: el manifest daba 307 a `/login`** porque `proxy.ts` lo rebotaba, **y no se arreglaba con sesión** —el manifest se pide sin credenciales—; lo delató el **control positivo** · **8 correcciones al diseño** · 6 tareas · 4 puntos a verificar · **D-88 y D-89** · ⚠ **la corrección principal QUITA alcance: instalar NO necesita service worker** —la guía de Next 16 instalada pide manifest y HTTPS— **y el botón de instalar propio lo desaconseja esa misma guía**, por no funcionar en Safari iOS · ⚠ **`primer_acceso_personal()` no puede condicionar el aviso al alumno**: lee de `staff_members` y exige `is_admin()`, o sea **cero filas siempre** · **la tarea de riesgo va primera, con las dos salidas escritas por delante**: si Chrome exigiera un service worker, **se para y decide Alejandro** · **Q-20 se mide dentro de su recorrido de CSP** *(D-89)*: ~~de 4 superficies a 18, **y son 18 y no 17 porque la F3-T3 añadió un Dialog**~~ ⚠ **Desmentido al ejecutar: NO son 18 ni 17, son 15.** El «18» sumó un archivo que **ya estaba contado**, y las tres versiones del recuento **omitían los imports directos de `radix-ui`** — `components/reservas/dialogo-cancelar.tsx`, medido y limpio, no figuraba en ninguna. **Ningún mecanismo nuevo apareció** *(V-4 por la salida A)* |

## Cómo leerlos

**Para saber cómo quedó el sistema, estos NO son la fuente.** Lo son:

- `ESTADO_Y_PLAN.md` — qué está hecho y qué falta
- `FASE_1_DISENO.md` — cómo está construido, con el SQL vigente
- Las migraciones de `supabase/migrations/` — la verdad, sin intermediarios

Estos planes sirven para otra cosa: **ver el razonamiento y los errores**. Por qué se eligió un orden,
qué se dio por supuesto, y en qué se falló. Si una decisión del diseño parece arbitraria, aquí suele
estar el motivo.

## Al escribir el plan de una tanda nueva

1. Sale del diseño (`FASE_1_DISENO.md` o `FASE_2_DISENO.md`), no de la imaginación.
2. Cada tarea: prueba que falla → verla fallar → cambio mínimo → verla pasar → commit.
3. Lo que no se sepa con certeza se marca como **punto a verificar**, con los dos desenlaces posibles y
   qué se hace en cada uno. No se resuelve suponiendo.
4. Al terminar, se añade la cabecera de correcciones. Sin ella el plan miente por omisión.

> **Lo que añadió la tanda 0 de la Fase 2 a esta lista.** Cuando un paso invoca una herramienta que
> *genera* código —`create-next-app`, `shadcn init`—, el plan tiene que decir **qué se comprueba después
> de que escriba**, no solo qué comando se corre. Esa tanda acumuló trece correcciones y las tres peores
> son de ese tipo: un generador que pisa `CLAUDE.md`, otro que pisa la paleta por cascada, y un script de
> `package.json` que funciona en la máquina donde se acaba de generar y fallaría en un runner limpio.
> **Ninguna daba error.** El SQL de la Fase 1 no tenía esta clase de riesgo, porque nadie escribía
> migraciones por ti.
