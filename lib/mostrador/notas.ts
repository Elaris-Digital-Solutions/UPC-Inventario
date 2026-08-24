import { createClient } from '@/lib/supabase/server';

// La lectura de notas de unidad. SEPARADA de lib/mostrador/consultas.ts a
// proposito: aquella depende de una RESERVA -un join contra cinco tablas- y esta
// de una UNIDAD. `inventory_unit_notes` no tiene ninguna columna que la conecte
// con una reserva, solo con `unit_id`.

// `fecha` llega en ISO TAL CUAL, sin reformatear aqui: quien la pinta decide el
// formato, esta funcion solo la trae.
export type NotaUnidad = { id: string; texto: string; fecha: string };

// UNA SOLA consulta para TODAS las unidades pedidas y no una por unidad: la
// pantalla pinta varias tarjetas a la vez, y resolverlo con N consultas seria
// una llamada de red por tarjeta donde una sola alcanza.
export async function notasPorUnidad(unitIds: string[]): Promise<Record<string, NotaUnidad[]>> {
  // Vacio SIN CONSULTAR. Un `in.()` vacio no es un atajo gratis: sigue siendo una
  // peticion de red entera para devolver necesariamente cero filas.
  if (unitIds.length === 0) {
    return {};
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_unit_notes')
    .select('id,unit_id,note,created_at')
    .in('unit_id', unitIds)
    .order('created_at', { ascending: false });

  // PROPAGA el error: degradar a un `Record` vacio se leeria como "esta unidad no
  // tiene ninguna nota", que es FALSO y tiene consecuencia real. Una nota puede
  // estar diciendo que el equipo llego roto o le falta una pieza, y el personal
  // se quedaria sin saberlo pensando que no hay nada que saber.
  if (error) {
    throw new Error(`notasPorUnidad: fallo la consulta a inventory_unit_notes: ${error.message}`);
  }

  // El orden DESCENDENTE de la consulta se CONSERVA dentro de cada grupo:
  // `.push()` respeta el orden de llegada y no hay ningun paso que reordene.
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
