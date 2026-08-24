// Logica PURA de la configuracion de reserva. Q-14 vive aca.
//
// ESTE ARCHIVO NO IMPORTA NADA, Y NO PUEDE HACERLO. Es una restriccion real: un
// test lo carga, y bajo Vitest el alias `@/` no resuelve. En cuanto importara
// `@/lib/supabase/server` el test se rompe, y `typecheck` y `build` seguirian en
// VERDE, que es lo que hace peligroso ese modo de fallo. Ver
// COMPORTAMIENTO_MEDIDO.md §5.
//
// De ahi la regla: un modulo que un test carga NO puede contener una Server
// Action. Por eso guardarAjustes() vive en lib/admin/acciones.ts y no aqui.

// Q-14, PRIMERA MITAD. `products.buffer_minutes` solo tiene un `check` de rango,
// asi que la base NO defiende que sea multiplo de `slot_minutes`. La defensa es
// esta funcion: la interfaz de admin solo ofrece multiplos (D-39).
//
// SOLO MIRA HACIA ADELANTE -que buffer se puede elegir HOY-. La segunda mitad,
// que mira hacia atras, es productosDesalineados().
//
// EL TOPE SE PASA POR PARAMETRO: quien llama sabe para que columna pide los
// multiplos. Hoy el unico llamador usa 480, el `check` de `buffer_minutes`.
export function multiplosDeSlot(slotMinutes: number, maximo: number): number[] {
  const salida: number[] = [];
  for (let v = 0; v <= maximo; v += slotMinutes) {
    salida.push(v);
  }
  return salida;
}

// Q-14, SEGUNDA MITAD: los productos cuyo `buffer_minutes` DEJARIA de ser
// multiplo si el admin guardara `slotNuevo`.
//
// NO IMPIDE GUARDAR, y no es una omision: la base permite cualquier combinacion
// -no hay `check` que las relacione-, asi que bloquear aqui inventaria una regla
// que el motor no tiene. El aviso lo escribe la pantalla; esto solo calcula.
//
// Con los datos de HOY es INALCANZABLE: los ocho valores legales de
// `slot_minutes` dividen a 120, que es el buffer de los 34 productos reales. El
// riesgo nace en cuanto exista un producto con otro buffer.
export function productosDesalineados(
  productos: { id: string; nombre: string; bufferMinutos: number }[],
  slotNuevo: number,
): { id: string; nombre: string; bufferMinutos: number }[] {
  // Un buffer de 0 nunca entra: 0 modulo cualquier cosa es 0.
  return productos.filter((p) => p.bufferMinutos % slotNuevo !== 0);
}

// D-54: si una hora de apertura NO cae justo en un bloque.
//
// EL DEFECTO QUE LA MOTIVA: con una apertura desalineada, `available_slots`
// devuelve franjas que `create_reservation` rechaza una por una, y la alineada
// mas cercana cae fuera del horario. NINGUNA franja del dia se puede reservar, y
// el alumno solo ve un calendario vacio, indistinguible de un dia sin cupo.
//
// SOLO `opening_time` Y NUNCA EL CIERRE: `generate_series` arranca en la apertura,
// asi que todas las franjas heredan SU alineacion; el cierre solo recorta la
// serie, nunca la desplaza. Medido con el contraejemplo. Ver
// COMPORTAMIENTO_MEDIDO.md §1.
//
// SOLO MIRA MINUTOS Y SEGUNDOS, nunca la hora entera: los ocho valores legales de
// `slot_minutes` son todos divisores de 60, asi que una hora civil completa
// siempre cae en un bloque y su contribucion al resto es cero.
//
// TOLERA ENTRADA MALFORMADA devolviendo `true`: tratar lo que no se entiende como
// desalineado es el lado seguro.
//
// CADA PARTE SE VALIDA CON `/^\d+$/` y NO con `Number.isFinite()`: `Number('')`
// da `0`, que es finito, asi que una parte VACIA -"08:" o "::"- pasaba el filtro
// y se leia como cero, o sea "alineada". La regex exige al menos un digito.
//
// DONDE VIVE LA REGLA HOY: la aplica la BASE, con dos disparadores de la
// migracion 33 -no un `check`, que no puede llevar subconsulta-. Esta funcion NO
// se borro con la columna `opening_time`: /admin/horarios la sigue necesitando
// para avisar en pantalla antes de guardar, ahora sobre `campus_hours.opens_at`.
// Es VISIBILIDAD y nunca la unica barrera.
export function aperturaDesalineada(apertura: string, slotMinutos: number): boolean {
  const partes = apertura.split(':');

  if (partes.length !== 2 && partes.length !== 3) {
    return true;
  }

  if (partes.some((p) => !/^\d+$/.test(p))) {
    return true;
  }

  const numeros = partes.map(Number);
  const minutos = numeros[1];
  const segundos = partes.length === 3 ? numeros[2] : 0;

  return minutos % slotMinutos !== 0 || segundos !== 0;
}
