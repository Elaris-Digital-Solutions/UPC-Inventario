// Los agregados de /admin/estadisticas (F9, ampliada por D-51): cuantas
// reservas hay por estado, cuantos prestamos se retiraron esta semana y que dia
// se pide mas equipo. Modulo PURO -sin React, sin Supabase, sin red-.
//
// IMPORTS RELATIVOS y no `@/`: lo carga estadisticas.test.ts y bajo Vitest el
// alias no resuelve. Ver COMPORTAMIENTO_MEDIDO.md §5. Por lo mismo,
// ReservaContable se declara aqui en vez de importarse de lib/admin/reservas.ts:
// encaja por ESTRUCTURA con lo que produce reservasParaEstadisticas().
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

import type { EstadoReserva } from '../reservas/consultas';

export type ReservaContable = {
  inicio: string; // ISO, tal cual llega
  estado: EstadoReserva;
};

// Claves SIN tilde porque son identificadores, no texto de pantalla. Las
// etiquetas con tilde estan en ETIQUETAS_DIA.
export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

// De lunes a domingo, como se lee una semana en castellano, y distinto del orden
// de `getUTCDay()`, que empieza en domingo con indice 0.
export const ORDEN_DIAS: readonly DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const ETIQUETAS_DIA: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

// En PLURAL, aparte de ETIQUETAS_ESTADO, que esta en singular: aquella nombra
// una fila o una opcion -"esta reserva esta Reservada"- y esta cuenta filas
// -"3 Reservadas"-. El VOCABULARIO es el mismo para que un admin no tenga que
// aprender dos juegos de nombres.
export const ETIQUETAS_ESTADO_PLURAL: Record<EstadoReserva, string> = {
  reserved: 'Reservadas',
  active: 'Entregadas',
  completed: 'Devueltas',
  cancelled: 'Canceladas',
  not_picked_up: 'No se retiraron',
  not_returned: 'No se devolvieron',
};

// D-49: "se retiro" son los tres estados en los que el equipo salio del
// mostrador en algun momento. `cancelled` queda fuera porque nunca llego, y
// `not_picked_up` por el motivo contrario -es la marca de que el alumno NO vino-:
// contarlas inflaria "Prestamos esta semana" con lo que jamas fue un prestamo.
export const ESTADOS_RETIRADOS: readonly EstadoReserva[] = ['active', 'completed', 'not_returned'];

export function seRetiro(estado: EstadoReserva): boolean {
  return ESTADOS_RETIRADOS.includes(estado);
}

// SOLO se usa dentro de diaDeSemanaEnLima(): en el resto del archivo el dia se
// nombra por su string, nunca por su indice.
const DIAS_POR_INDICE_UTC: readonly DiaSemana[] = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
];

/**
 * A que dia de la semana, en Lima, pertenece un instante ISO.
 *
 * SE PASA PRIMERO POR fechaEnLima() Y RECIEN DESPUES SE MIRA EL INDICE. Ni
 * `getDay()` ni `getUTCDay()` sobre el instante CRUDO sirven: el primero acierta
 * solo si la maquina corre en UTC-5, y el segundo confunde el dia UTC con el dia
 * civil de Lima. Los dos fallan en el CI, que corre en `TZ=UTC`.
 *
 * CONSECUENCIA: una prueba de esta propiedad pasa en verde en la maquina de
 * desarrollo AUNQUE el codigo use `getDay()`. La defensa no es correr la prueba,
 * es no escribir `getDay()` ni `getUTCDay()` sobre un instante crudo en ningun
 * sitio de este archivo. Ver COMPORTAMIENTO_MEDIDO.md §4.
 */
export function diaDeSemanaEnLima(instante: string): DiaSemana {
  const fecha = fechaEnLima(new Date(instante));
  const indice = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return DIAS_POR_INDICE_UTC[indice];
}

/**
 * Cuenta las reservas por estado. LOS SEIS SIEMPRE APARECEN, incluso en cero: si
 * un estado en cero desapareciera, la suma de los seis dejaria de poder
 * compararse con el total en pantalla, que es la propiedad que D-51 hace
 * verificable de un vistazo.
 *
 * Los seis campos se escriben A MANO y no se derivan de ORDEN_ESTADOS: si el
 * enum ganara o perdiera un miembro, el typecheck de ESTE literal fallaria antes
 * de ejecutar nada.
 */
export function contarPorEstado(reservas: ReservaContable[]): Record<EstadoReserva, number> {
  const contadores: Record<EstadoReserva, number> = {
    reserved: 0,
    active: 0,
    completed: 0,
    cancelled: 0,
    not_picked_up: 0,
    not_returned: 0,
  };

  for (const reserva of reservas) {
    contadores[reserva.estado] += 1;
  }

  return contadores;
}

/**
 * D-49: cuantos prestamos se retiraron en los ultimos 7 dias, hoy incluido.
 *
 * Ventana CERRADA y MOVIL hacia ATRAS, al reves que el filtro de /admin/reservas:
 * aquel mira adelante porque sirve para planificar, y esto mira atras porque es
 * una estadistica.
 *
 * `ahora` llega POR PARAMETRO: una funcion que lee el reloj no se puede probar en
 * la frontera de medianoche, que es justo el suelo de esta ventana.
 */
export function prestamosDeLaSemana(reservas: ReservaContable[], ahora: Date): number {
  const hoy = fechaEnLima(ahora);
  const suelo = sumarDias(hoy, -6);

  return reservas.filter((reserva) => {
    if (!seRetiro(reserva.estado)) {
      return false;
    }

    const dia = fechaEnLima(new Date(reserva.inicio));
    return dia >= suelo && dia <= hoy;
  }).length;
}

/**
 * D-50: prestamos por dia de la semana sobre TODO el historico, no sobre la
 * ventana de 7 dias. Responde "que dia se pide mas equipo", asi que acumula
 * jueves de semanas distintas bajo el mismo contador.
 *
 * Cuenta el MISMO conjunto de estados que D-49, y por eso el panel titula
 * "Prestamos por dia" y no "Reservas por dia": la etiqueta dice que conjunto es.
 */
export function desglosePorDiaDeSemana(reservas: ReservaContable[]): Record<DiaSemana, number> {
  const contadores: Record<DiaSemana, number> = {
    lunes: 0,
    martes: 0,
    miercoles: 0,
    jueves: 0,
    viernes: 0,
    sabado: 0,
    domingo: 0,
  };

  for (const reserva of reservas) {
    if (!seRetiro(reserva.estado)) {
      continue;
    }

    const dia = diaDeSemanaEnLima(reserva.inicio);
    contadores[dia] += 1;
  }

  return contadores;
}

export type Estadisticas = {
  registradas: number;
  porEstado: Record<EstadoReserva, number>;
  prestamosSemana: number;
  porDia: Record<DiaSemana, number>;
};

/** Junta los tres agregados para que la pagina no orqueste tres funciones. */
export function calcularEstadisticas(reservas: ReservaContable[], ahora: Date): Estadisticas {
  return {
    registradas: reservas.length,
    porEstado: contarPorEstado(reservas),
    prestamosSemana: prestamosDeLaSemana(reservas, ahora),
    porDia: desglosePorDiaDeSemana(reservas),
  };
}
