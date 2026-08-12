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
 * Si a esta reserva se le ofrece el boton de cancelar en /mi-panel.
 *
 * `true` solo si se cumplen TRES condiciones a la vez, y son TRES DECISIONES
 * distintas que solo coinciden en esta misma linea:
 *
 *   - `estado === 'reserved'`. En `active` el boton DESAPARECE -no se
 *     deshabilita-, porque una reserva ya entregada no se cancela, se
 *     devuelve (ya estaba, antes de esta funcion).
 *   - `grupo === 'proxima'`. D-35: oculta la reserva cuyo FIN ya paso -sigue
 *     en `reserved` en la base porque nadie la recogio, pero ofrecerla como
 *     cancelable prometeria algo que ya no tiene sentido (ya estaba).
 *   - `new Date(inicio) > ahora`. D-38: oculta la reserva cuyo INICIO ya
 *     paso, aunque el FIN siga en el futuro -la migracion 23
 *     (20260812053243_cancel_before_start.sql) rechaza esa cancelacion en el
 *     motor, asi que la pantalla deja de ofrecer un boton que el motor va a
 *     rechazar (nuevo, D-38).
 *
 * Comparacion ESTRICTA (`>`), no `>=`: el SQL de la migracion 23 rechaza con
 * `v_start_at <= now()`, asi que esta funcion y el motor coinciden en el
 * instante exacto del inicio -ningun segundo en el que uno ofrezca el boton
 * y el otro lo rechace.
 *
 * `ahora` se RECIBE y no se calcula aca con `new Date()`, por el mismo
 * motivo que ya explica el comentario de grupoDeReserva() mas arriba.
 *
 * HALLAZGO: para una reserva `reserved`, el TERCER termino SUBSUME al
 * SEGUNDO. `grupo === 'proxima'` equivale a `fin > ahora` -es literalmente
 * como lo calcula grupoDeReserva()-, y como `inicio < fin` siempre es cierto,
 * `inicio > ahora` ya implica `fin > ahora`. Y ese "siempre" NO es una
 * suposicion de dominio: la base lo hace cumplir con
 * `CONSTRAINT chk_reservation_dates CHECK (end_at > start_at)`, leido en
 * supabase/migrations/20260805030123_baseline.sql:180 -asi que ninguna fila
 * de `inventory_reservations` puede violarlo. Los
 * dos terminos se CONSERVAN a proposito, ninguno sobra: son dos decisiones
 * con dos fuentes distintas -D-35 y D-38-, y quitar el de D-35 haria que
 * este boton dependiera del invariante `inicio < fin` sin revalidarlo -esta
 * funcion no lee `fin` en ningun momento, asi que no tiene forma de saber si
 * ese invariante se sigue cumpliendo.
 */
export function seOfreceCancelar(
  estado: EstadoReserva,
  grupo: Grupo,
  inicio: string,
  ahora: Date,
): boolean {
  return estado === 'reserved' && grupo === 'proxima' && new Date(inicio) > ahora;
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
