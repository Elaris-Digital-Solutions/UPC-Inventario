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
| [`TANDA_2.md`](./TANDA_2.md) | Reglas de reserva | 📝 escrito, sin ejecutar |

## Cómo leerlos

**Para saber cómo quedó el sistema, estos NO son la fuente.** Lo son:

- `ESTADO_Y_PLAN.md` — qué está hecho y qué falta
- `FASE_1_DISENO.md` — cómo está construido, con el SQL vigente
- Las migraciones de `supabase/migrations/` — la verdad, sin intermediarios

Estos planes sirven para otra cosa: **ver el razonamiento y los errores**. Por qué se eligió un orden,
qué se dio por supuesto, y en qué se falló. Si una decisión del diseño parece arbitraria, aquí suele
estar el motivo.

## Al escribir el plan de una tanda nueva

1. Sale del diseño (`FASE_1_DISENO.md`), no de la imaginación.
2. Cada tarea: prueba que falla → verla fallar → SQL mínimo → verla pasar → commit.
3. Lo que no se sepa con certeza se marca como **punto a verificar**, con los dos desenlaces posibles y
   qué se hace en cada uno. No se resuelve suponiendo.
4. Al terminar, se añade la cabecera de correcciones. Sin ella el plan miente por omisión.
