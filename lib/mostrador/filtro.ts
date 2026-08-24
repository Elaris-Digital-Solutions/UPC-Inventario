// El filtro de fecha del mostrador (F5), como logica pura: se puede PROBAR sin
// montar React ni Supabase, y "que reserva pasa el filtro" se decide en UN SOLO
// SITIO.
//
// DOS DECISIONES:
//
//   1. ACOTA HACIA ADELANTE, NUNCA HACIA ATRAS. Una reserva de "Por entregar"
//      cuya hora ya paso se ve con CUALQUIER opcion, incluida "Hoy": son
//      justamente las candidatas a "No se retiro", y esconderlas haria que esa
//      falta no se marcara nunca. Por eso la condicion es un TECHO, sin suelo.
//   2. VENTANAS MOVILES, no de calendario: el tamaño no cambia segun el dia en
//      que se mire. Mismo criterio que diasDeLaVentana().
//
// Import RELATIVO y no `@/`, a proposito distinto del que usa
// lib/mostrador/consultas.ts para el mismo cruce: a aquel no lo carga Vitest y a
// este si, y bajo Vitest el alias no resuelve. Ver COMPORTAMIENTO_MEDIDO.md §5.
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

export type FiltroFecha = 'hoy' | 'tres_dias' | 'semana' | 'todas';

// Cuantos dias suma el techo de cada opcion, contando HOY como el dia 0. "todas"
// no esta porque no tiene techo: se resuelve antes de mirar la tabla.
const DIAS_DE_TECHO: Record<Exclude<FiltroFecha, 'todas'>, number> = {
  hoy: 0,
  tres_dias: 2,
  semana: 6,
};

/**
 * Si una reserva pasa el filtro de fecha de la columna "Por entregar".
 *
 * `ahora` se RECIBE y no se lee con `new Date()`: una funcion que lee el reloj no
 * se puede probar en la frontera de medianoche, que es justo donde este filtro se
 * rompe si se escribe mal.
 *
 * SIN SUELO: no hay ninguna comparacion que descarte una reserva por vieja.
 */
export function pasaFiltroFecha(inicio: string, ahora: Date, filtro: FiltroFecha): boolean {
  if (filtro === 'todas') {
    return true;
  }

  const hoy = fechaEnLima(ahora);
  const techo = sumarDias(hoy, DIAS_DE_TECHO[filtro]);

  // Comparacion de texto sin truco: las dos son `YYYY-MM-DD`, y ese formato
  // ordena igual como texto que como fecha.
  return fechaEnLima(new Date(inicio)) <= techo;
}

export const ETIQUETAS_FILTRO_FECHA: Record<FiltroFecha, string> = {
  hoy: 'Hoy',
  tres_dias: 'Próximos 3 días',
  semana: 'Esta semana',
  todas: 'Todas',
};

// Array EXPLICITO y no `Object.keys()`: eso devuelve `string[]` y convertirlo
// exigiria un `as`. La red de seguridad es el `Record` de arriba, con las cuatro
// claves escritas: si el tipo cambiara, su typecheck fallaria primero.
export const ORDEN_FILTROS_FECHA: readonly FiltroFecha[] = ['hoy', 'tres_dias', 'semana', 'todas'];
