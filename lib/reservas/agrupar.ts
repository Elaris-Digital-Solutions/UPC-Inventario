// Agrupar reservas para /mi-panel, como logica pura: sin React y sin base de
// datos, igual que lib/reservas/rejilla.ts y lib/reservas/sancion.ts. Se
// puede PROBAR sin montar un escenario en la base, y "en que seccion cae
// esta reserva" se decide en UN SOLO SITIO -este-, no en cada pantalla que
// necesite pintar la lista.

import type { EstadoReserva } from './consultas';

export type Grupo = 'en_curso' | 'proxima' | 'pasada';

/**
 * En que seccion de /mi-panel cae una reserva.
 *
 * La regla, decidida al escribir esta tarea y no leida de ningun sitio:
 *
 *   - `active` -> `en_curso`. El equipo esta en manos del alumno ahora mismo.
 *   - `reserved` con `fin` en el futuro -> `proxima`.
 *   - `reserved` con `fin` YA PASADO -> `pasada`, y NO `en_curso` ni
 *     `proxima`. El alumno ya no puede recogerla -la franja que reservo
 *     termino sin que nadie la marcara `active`-, asi que ensenarla entre
 *     las proximas seria prometerle algo que no va a pasar. El estado en la
 *     BASE sigue siendo `reserved`: cerrar esa reserva -pasarla a
 *     `not_picked_up` o a otro estado final- es trabajo del personal, y esa
 *     pantalla no existe todavia -llega en la T3-. Esta funcion no toca la
 *     base ni inventa un estado nuevo: solo elige DONDE se pinta una fila
 *     que ya existe, sin escribir nada.
 *   - `cancelled`, `completed`, `not_picked_up`, `not_returned` -> `pasada`.
 *     Los cuatro son estados finales del motor -no hay transicion de vuelta
 *     desde ninguno-, asi que no hay ambiguedad de fecha que resolver: van a
 *     `pasada` sin mirar `fin`.
 *
 * `ahora` se RECIBE y no se calcula aca con `new Date()`, por el mismo
 * motivo que sancionVigente() (lib/reservas/sancion.ts) y hoyEnLima()
 * (lib/reservas/rejilla.ts) lo reciben: una funcion que lee el reloj del
 * sistema no se puede probar en el borde exacto -`fin` igual a `ahora`-, que
 * es justo el caso que separa `proxima` de `pasada`.
 */
export function grupoDeReserva(estado: EstadoReserva, fin: string, ahora: Date): Grupo {
  if (estado === 'active') {
    return 'en_curso';
  }

  if (estado === 'reserved') {
    const finFecha = new Date(fin);
    // Estricto y no `>=`: en el instante exacto en que `fin` alcanza a
    // `ahora`, la franja ya se termino -no queda ningun segundo dentro de
    // ella-, asi que cae a `pasada`. Es la misma frontera "no laxa" que
    // sancionVigente() aplica del lado contrario.
    return finFecha > ahora ? 'proxima' : 'pasada';
  }

  // 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned': los cuatro
  // estados finales del motor. No hay un quinto valor posible aca porque el
  // `if` de arriba ya agoto 'active' y 'reserved' -TypeScript lo sabe por el
  // tipo `EstadoReserva`, no hace falta un switch para esta rama-.
  return 'pasada';
}

/**
 * El texto que ve el alumno para cada estado, en español y sin jerga de
 * esquema -que se entienda sin saber que es un `enum` de Postgres-.
 *
 * `switch` EXHAUSTIVO y SIN `default` a proposito: es la misma idea que ya
 * usa mensajeDeRechazo() en lib/reservas/acciones.ts para el mensaje de la
 * RPC -que el desfase se VEA en vez de esconderse-. Un `default` que
 * devolviera un texto generico habria dejado pasar un estado nuevo con una
 * etiqueta que no dice nada, y nadie se habria enterado hasta que un alumno
 * la viera en pantalla.
 *
 * Y que eso funcione NO es una suposicion sobre TypeScript: se MIDIO el
 * 2026-08-11 anadiendo un septimo valor al enum de lib/database.types.ts y
 * corriendo el typecheck, que fallo con
 * `TS2366: Function lacks ending return statement`. El cambio se revirtio
 * despues. Un matiz que conviene saber de antemano: el error apunta a ESTA
 * FUNCION, no al valor concreto que falta -el mensaje habla de un `return`
 * ausente, no de un caso sin cubrir-, asi que quien se lo encuentre tiene que
 * comparar el switch contra el enum para ver cual es el nuevo.
 */
export function etiquetaDeEstado(estado: EstadoReserva): string {
  switch (estado) {
    case 'reserved':
      return 'Reservada';
    case 'active':
      return 'En curso';
    case 'cancelled':
      return 'Cancelada';
    case 'completed':
      return 'Completada';
    case 'not_picked_up':
      return 'No recogida';
    case 'not_returned':
      return 'No devuelta';
  }
}
