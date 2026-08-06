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
