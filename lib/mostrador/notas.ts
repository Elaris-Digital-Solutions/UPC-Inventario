import { createClient } from '@/lib/supabase/server';

// La lectura de notas de unidad, Task 7 de la tanda 3A. SEPARADA de
// lib/mostrador/consultas.ts a proposito, no por descuido: aquella lectura
// depende de una RESERVA -un join contra inventory_reservations, products,
// inventory_units, campuses y alumnos-, y esta depende de una UNIDAD:
// inventory_unit_notes no tiene ninguna columna que la conecte con una
// reserva concreta, solo con `unit_id`. Juntar las dos en el mismo archivo
// mezclaria dos consultas que no comparten tabla de origen ni criterio de
// filtro, solo el hecho de que las dos alimentan la misma pantalla.
//
// Y ES EL MISMO TIPO DE HUECO que ya registro la Task 1 sobre
// app/(personal)/mostrador/page.tsx: la "Estructura de archivos" del plan
// (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md) enumera, bajo `lib/mostrador/`,
// solo `consultas.ts`, `columnas.ts`, `columnas.test.ts` y `acciones.ts` -
// este archivo no esta en esa lista-. Y el Step 2 de la Task 7 TAMPOCO lo
// nombra: lo que pide, literalmente, es que la lectura sea "una lectura
// nueva, separada de lib/mostrador/consultas.ts porque no depende de una
// reserva sino de una unidad". El nombre `notas.ts` lo elige esta tarea al
// ejecutar, no el plan -una version anterior de este comentario decia que el
// Step lo pedia "por nombre", y eso era falso-. Lo que el plan manda es la
// SEPARACION; donde vive el archivo separado es una decision de aqui.

// Una nota de `inventory_unit_notes`, ya traducida al tipo que consume la
// pantalla. `fecha` llega en ISO TAL CUAL, sin reformatear aca -mismo
// criterio que `inicio`/`fin` en ReservaMostrador (lib/mostrador/consultas.ts):
// quien la pinta decide el formato, esta funcion solo la trae.
export type NotaUnidad = { id: string; texto: string; fecha: string };

// Las notas de una o mas unidades, agrupadas por `unit_id` en un `Record`.
// UNA SOLA consulta para TODAS las unidades pedidas -`in.(...)`- y no una
// consulta por unidad: la pantalla del mostrador pinta varias tarjetas a la
// vez, y cada una necesita el historial de su propia unidad; resolverlo con
// N consultas seria una llamada de red por tarjeta donde una sola, con el
// resultado repartido en memoria, alcanza.
export async function notasPorUnidad(unitIds: string[]): Promise<Record<string, NotaUnidad[]>> {
  // Vacio SIN CONSULTAR. Un `in.()` vacio no es un atajo gratis para
  // PostgREST: sigue siendo una peticion de red entera, ida y vuelta, para
  // devolver necesariamente cero filas -ningun `unit_id` puede matchear una
  // lista vacia-. Cuando la pagina no tiene ninguna reserva que mostrar (el
  // estado vacio de app/(personal)/mostrador/page.tsx, o entre que se limpia
  // el escenario de datos y se rehace), `unitIds` llega vacio y esta rama
  // ahorra esa llamada inutil.
  if (unitIds.length === 0) {
    return {};
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_unit_notes')
    .select('id,unit_id,note,created_at')
    .in('unit_id', unitIds)
    .order('created_at', { ascending: false });

  // PROPAGA el error, igual que reservasMostrador() en consultas.ts y por el
  // MISMO argumento que su comentario ya desarrolla: degradar a un `Record`
  // vacio por un fallo de red o de RLS se leeria como "esta unidad no tiene
  // ninguna nota", que es una afirmacion FALSA con una consecuencia real. Una
  // nota puede estar diciendo que el equipo llego roto, que le falta una
  // pieza o que el ultimo alumno lo devolvio incompleto; el personal se
  // quedaria sin saberlo, pensando que no hay nada que saber, en vez de
  // recibiendo un error que le dice que la lectura fallo.
  if (error) {
    throw new Error(`notasPorUnidad: fallo la consulta a inventory_unit_notes: ${error.message}`);
  }

  // Agrupado por `unit_id` en un `Record`, con un `for` explicito -mismo
  // patron que agruparEnColumnas() en app/(personal)/mostrador/page.tsx- y
  // no un `reduce` que anidaria la logica de agrupar dentro de una sola
  // expresion. El orden DESCENDENTE de la consulta -mas reciente primero- se
  // CONSERVA dentro de cada grupo: `.push()` respeta el orden en que las
  // filas fueron llegando, y no hay ningun paso posterior que las reordene.
  const porUnidad: Record<string, NotaUnidad[]> = {};

  for (const fila of data) {
    const nota: NotaUnidad = { id: fila.id, texto: fila.note, fecha: fila.created_at };

    if (porUnidad[fila.unit_id] === undefined) {
      porUnidad[fila.unit_id] = [];
    }

    porUnidad[fila.unit_id].push(nota);
  }

  return porUnidad;
}
