// Agrupar reservas para /mi-panel, como logica pura: sin React y sin base de
// datos. Se puede PROBAR sin montar un escenario, y "en que seccion cae esta
// reserva" se decide en UN SOLO SITIO.
//
// `ahora` SE RECIBE en las dos funciones que lo usan, nunca se lee con
// `new Date()` por dentro: una funcion que lee el reloj del sistema no se puede
// probar en el borde exacto, que es justo el caso que separa los grupos.

import type { EstadoReserva } from './consultas';

export type Grupo = 'en_curso' | 'proxima' | 'pasada';

/**
 * En que seccion de /mi-panel cae una reserva.
 *
 *   - `active` -> `en_curso`: el equipo esta en manos del alumno ahora.
 *   - `reserved` con `fin` futuro -> `proxima`.
 *   - `reserved` con `fin` YA PASADO -> `pasada`. El alumno ya no puede
 *     recogerla, asi que enseñarla entre las proximas seria prometerle algo que
 *     no va a pasar. En la BASE sigue siendo `reserved`: cerrarla es trabajo del
 *     personal. Esta funcion solo elige DONDE se pinta, no escribe nada.
 *   - Los cuatro estados finales -> `pasada` sin mirar `fin`: no hay transicion
 *     de vuelta desde ninguno, asi que no hay ambiguedad que resolver.
 */
export function grupoDeReserva(estado: EstadoReserva, fin: string, ahora: Date): Grupo {
  if (estado === 'active') {
    return 'en_curso';
  }

  if (estado === 'reserved') {
    const finFecha = new Date(fin);
    // Estricto y no `>=`: en el instante en que `fin` alcanza a `ahora` ya no
    // queda ningun segundo dentro de la franja.
    return finFecha > ahora ? 'proxima' : 'pasada';
  }

  // Los cuatro estados finales. TypeScript sabe que no hay un quinto valor
  // porque el `if` de arriba agoto los otros dos.
  return 'pasada';
}

/**
 * Si a esta reserva se le ofrece el boton de cancelar en /mi-panel. TRES
 * condiciones que cargan CUATRO decisiones:
 *
 *   - `estado === 'reserved'`: en `active` el boton DESAPARECE -no se
 *     deshabilita-, porque una reserva entregada no se cancela, se devuelve.
 *   - `grupo === 'proxima'` (D-35): oculta la reserva cuyo FIN ya paso.
 *   - `inicio > limite` carga D-38 -inicio ya pasado- y M-12/D-70 -empieza
 *     dentro del margen configurado-. SON UN SOLO TERMINO porque con margen 0 el
 *     limite ES `ahora`, asi que el segundo subsume al primero. El SQL si los
 *     tiene separados, y no es incoherencia: alla cada rama devuelve un MENSAJE
 *     distinto, y aqui solo se decide pintar o no pintar.
 *
 * ESTRICTA (`>`) y no `>=`: las dos migraciones rechazan con `<=`, asi que esta
 * funcion y el motor coinciden en el instante exacto del borde.
 *
 * EL MARGEN SE RECIBE en vez de leerse de una constante: su unica fuente es
 * `app_settings.min_cancel_minutes`, la misma que usa la RPC. Dos fuentes serian
 * dos reglas, y al separarse la pantalla ofreceria un boton que el motor rechaza.
 *
 * LOS DOS PRIMEROS TERMINOS PARECEN REDUNDANTES Y NO SOBRAN: `inicio > ahora`
 * implica `fin > ahora` porque la base garantiza `end_at > start_at`. Se
 * conservan porque son dos decisiones con dos fuentes -D-35 y D-38-, y quitar el
 * de D-35 haria que este boton dependiera de un invariante que esta funcion no
 * puede revalidar, porque no lee `fin`.
 */
export function seOfreceCancelar(
  estado: EstadoReserva,
  grupo: Grupo,
  inicio: string,
  ahora: Date,
  margenMinutos: number,
): boolean {
  const limite = new Date(ahora.getTime() + margenMinutos * 60_000);
  return estado === 'reserved' && grupo === 'proxima' && new Date(inicio) > limite;
}

/**
 * El texto que ve el alumno para cada estado, sin jerga de esquema.
 *
 * `switch` EXHAUSTIVO y SIN `default` a proposito: un `default` generico dejaria
 * pasar un estado nuevo con una etiqueta que no dice nada, y nadie se enteraria
 * hasta que un alumno la viera. Sin el, añadir un valor al enum rompe el
 * typecheck con `TS2366: Function lacks ending return statement`.
 *
 * OJO: ese error apunta a ESTA FUNCION y no al valor que falta, asi que hay que
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
