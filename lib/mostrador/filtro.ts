// El filtro de fecha del mostrador (F5), como logica pura: mismo espiritu
// que columnaDeReserva() en lib/mostrador/columnas.ts -se puede PROBAR sin
// montar React ni Supabase, y "que reserva pasa el filtro" se decide en UN
// SOLO SITIO, no en cada boton que lo use-.
//
// Decision de Alejandro, tomada el 2026-08-12 y NO discutida aca:
//
//   1. El filtro ACOTA HACIA ADELANTE, nunca hacia atras. Una reserva de
//      "Por entregar" cuya hora ya paso -el alumno no vino- se ve con
//      CUALQUIER opcion del filtro, incluida "Hoy": son justamente las
//      candidatas a "No se retiro", y esconderlas haria que esa falta no se
//      marcara nunca. Por eso la condicion de abajo es un TECHO, sin suelo:
//      no hay ningun `>=` que descarte una reserva por vieja.
//   2. Las ventanas son MOVILES, no de calendario. "Hoy" es solo hoy;
//      "proximos 3 dias" es hoy y los dos siguientes; "esta semana" es hoy y
//      los seis siguientes. El tamano no cambia segun el dia de la semana en
//      que se mire -no hay ningun concepto de "domingo a sabado" aca-, mismo
//      criterio movil que ya usa diasDeLaVentana() (lib/reservas/rejilla.ts)
//      para la ventana de reserva del alumno.
//
// Combinando las dos: una reserva pasa el filtro si
// `fechaEnLima(inicio) <= hoy + N`, con N = 0, 2 o 6 segun la opcion, y
// "todas" sin ninguna condicion.
//
// Import RELATIVO, no `@/lib/reservas/rejilla`, y a proposito DISTINTO del
// que usa lib/mostrador/consultas.ts para el mismo cruce de carpetas
// (`@/lib/reservas/consultas`). La diferencia no es un descuido: consultas.ts
// nunca lo carga Vitest -no existe consultas.test.ts-, mientras que ESTE
// archivo si lo carga filtro.test.ts. El proyecto no tiene
// `vitest.config.ts`, asi que Vitest corre con los valores por defecto y NO
// conoce el alias `@/*` que declara `tsconfig.json` -el mismo motivo por el
// que columnas.test.ts y rejilla.test.ts importan con ruta relativa en vez
// de alias-. Con el alias, `tsc` y `next build` lo resuelven igual y no
// habria fallado ninguno de los dos; solo `vitest run` se rompe, y solo
// porque este archivo es el sujeto de una prueba.
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

export type FiltroFecha = 'hoy' | 'tres_dias' | 'semana' | 'todas';

// Cuantos dias suma el techo de cada opcion, contando HOY como el dia 0:
// "hoy" no suma nada -techo = hoy-, "tres_dias" cubre hoy + 2 mas -tres dias
// civiles en total-, "semana" cubre hoy + 6 mas -siete dias civiles en
// total-. "todas" no esta en esta tabla porque no tiene techo: se resuelve
// aparte, antes de mirarla, en pasaFiltroFecha().
const DIAS_DE_TECHO: Record<Exclude<FiltroFecha, 'todas'>, number> = {
  hoy: 0,
  tres_dias: 2,
  semana: 6,
};

/**
 * Si una reserva pasa el filtro de fecha de la columna "Por entregar".
 *
 * `inicio` es el instante de arranque de la reserva, en ISO tal como llega
 * de ReservaMostrador.inicio. `ahora` es el instante actual -RECIBIDO y no
 * leido con `new Date()` por dentro, mismo motivo que ya explican
 * hoyEnLima() y columnaDeReserva(): una funcion que lee el reloj del sistema
 * no se puede probar en la frontera de medianoche, que es justo donde este
 * filtro se rompe si se escribe mal-.
 *
 * SIN SUELO: no hay ninguna comparacion que descarte una reserva por vieja.
 * Ver el punto 1 del comentario de cabecera.
 */
export function pasaFiltroFecha(inicio: string, ahora: Date, filtro: FiltroFecha): boolean {
  if (filtro === 'todas') {
    return true;
  }

  const hoy = fechaEnLima(ahora);
  const techo = sumarDias(hoy, DIAS_DE_TECHO[filtro]);

  // Comparacion de texto sin ningun truco: las dos fechas son `YYYY-MM-DD`,
  // el mismo formato que devuelve fechaEnLima() en los dos lados, y ese
  // formato ordena igual como texto que como fecha.
  return fechaEnLima(new Date(inicio)) <= techo;
}

// Las etiquetas de interfaz, CON sus tildes -a diferencia de los comentarios
// de este archivo, que van sin acentos ni ene por convencion del proyecto-.
export const ETIQUETAS_FILTRO_FECHA: Record<FiltroFecha, string> = {
  hoy: 'Hoy',
  tres_dias: 'Próximos 3 días',
  semana: 'Esta semana',
  todas: 'Todas',
};

// El orden de pintado, como array EXPLICITO en vez de
// `Object.keys(ETIQUETAS_FILTRO_FECHA)` -mismo motivo que COLUMNAS en
// app/(personal)/mostrador/page.tsx: `Object.keys()` devuelve `string[]`, y
// convertirlo a `FiltroFecha[]` exigiria un `as` que le mentiria al
// compilador sobre algo que si puede comprobar solo. La red de seguridad
// real es ETIQUETAS_FILTRO_FECHA, arriba: al ser un `Record<FiltroFecha,
// string>` con las CUATRO claves escritas a mano, si `FiltroFecha` ganara o
// perdiera un miembro el typecheck de ESE objeto fallaria antes de llegar
// aca -el mismo mecanismo que TITULOS (Record<Columna, string>) ya usa en
// page.tsx-. Este array solo evita el `as` al recorrerlo para pintar los
// botones.
export const ORDEN_FILTROS_FECHA: readonly FiltroFecha[] = ['hoy', 'tres_dias', 'semana', 'todas'];
