// Los agregados de /admin/estadisticas (F9 de ESPECIFICACION_FUNCIONAL.md,
// ampliada por D-51): cuantas reservas hay por estado, cuantos prestamos se
// retiraron esta semana y que dia de la semana se pide mas equipo. Mismo
// espiritu que lib/admin/filtros.ts y lib/admin/dias.ts: un modulo PURO, sin
// React, sin Supabase y sin red, para poder probarlo sin montar nada.
//
// IMPORTS RELATIVOS y no `@/`: este modulo lo carga estadisticas.test.ts, y
// Vitest no conoce el alias que declara tsconfig.json -- no hay
// vitest.config.ts --. Medido primero en filtros.ts, en la Task 8 de la
// tanda 3A, y repetido aca: es el UNICO otro modulo puro de lib/admin que
// tiene algun import -plural.ts y ajustes.ts no importan nada, asi que ahi
// la practica no aplica-.
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

import type { EstadoReserva } from '../reservas/consultas';

// Lo minimo que los agregados de esta pantalla necesitan leer de una reserva,
// y NADA MAS. Se declara aca y no se importa `ReservaEstadistica` de
// lib/admin/reservas.ts, mismo motivo que ya explica ReservaFiltrable en
// lib/admin/filtros.ts: ese modulo importa el cliente de servidor por el
// alias `@/`, y con un import de VALOR -o con uno de tipo que alguien
// convierta en valor manana- este archivo dejaria de poder cargarse bajo
// Vitest. El tipo encaja SOLO por estructura con lo que produce
// reservasParaEstadisticas().
export type ReservaContable = {
  inicio: string; // ISO, tal cual llega
  estado: EstadoReserva;
};

// Claves SIN tilde porque son identificadores, no texto de pantalla -mismo
// criterio que `not_picked_up` en el enum de la base, que tampoco lleva
// espacio ni tilde-. Las etiquetas CON tilde, para pintar, estan en
// ETIQUETAS_DIA unas lineas mas abajo.
export type DiaSemana =
  | 'lunes'
  | 'martes'
  | 'miercoles'
  | 'jueves'
  | 'viernes'
  | 'sabado'
  | 'domingo';

// De lunes a domingo, que es como una semana se lee en castellano -y
// distinto del orden que devuelve `getUTCDay()`, que empieza en domingo con
// indice 0-. components/admin/panel-estadisticas.tsx recorre este array para
// pintar las siete filas del desglose en este orden.
export const ORDEN_DIAS: readonly DiaSemana[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

// Las etiquetas de pantalla, CON tildes -a diferencia de los comentarios de
// este archivo, que van sin acentos ni ene por convencion del proyecto,
// misma nota que ya deja ETIQUETAS_ESTADO en lib/admin/filtros.ts-.
export const ETIQUETAS_DIA: Record<DiaSemana, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

// Las etiquetas de las tarjetas de recuento, en PLURAL. Existen APARTE de
// ETIQUETAS_ESTADO (lib/admin/filtros.ts), que esta en singular, porque las
// dos etiquetan cosas distintas: aquella nombra la fila de una tabla y la
// opcion de un desplegable -"esta reserva esta Reservada", "mostrar solo
// Reservada"-, y esta cuenta filas -"3 Reservadas"-. El VOCABULARIO es el
// MISMO en las dos -`active` sigue siendo "Entregada/s" y `completed` sigue
// siendo "Devuelta/s"-, para que un admin que ya aprendio los nombres en
// /admin/reservas no tenga que aprender otros aca.
export const ETIQUETAS_ESTADO_PLURAL: Record<EstadoReserva, string> = {
  reserved: 'Reservadas',
  active: 'Entregadas',
  completed: 'Devueltas',
  cancelled: 'Canceladas',
  not_picked_up: 'No se retiraron',
  not_returned: 'No se devolvieron',
};

// D-49: "se retiro" son los tres estados en los que el equipo, en algun
// momento, salio del mostrador -`active` porque lo tiene ahora, `completed`
// porque lo tuvo y ya lo devolvio, `not_returned` porque lo tiene y no lo
// devolvio-. `cancelled` queda fuera porque una reserva cancelada nunca
// llego al mostrador, y `not_picked_up` queda fuera por el motivo contrario:
// es justamente la marca de que el alumno NO vino a retirar nada. Contarlas
// como prestamo inflaria "Prestamos esta semana" con reservas que jamas
// fueron un prestamo de verdad.
export const ESTADOS_RETIRADOS: readonly EstadoReserva[] = ['active', 'completed', 'not_returned'];

export function seRetiro(estado: EstadoReserva): boolean {
  return ESTADOS_RETIRADOS.includes(estado);
}

// El indice que devuelve `getUTCDay()` sobre una medianoche UTC empieza en
// domingo (0), no en lunes -al reves que ORDEN_DIAS, que empieza en lunes
// porque asi se lee una semana en castellano-. Esta tabla traduce ese
// indice crudo al DiaSemana correspondiente, y SOLO se usa DENTRO de
// diaDeSemanaEnLima(): en el resto del archivo el dia se nombra por su
// string, nunca por su indice numerico.
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
 * HECHO MEDIDO EL 2026-08-13 sobre el instante `2026-08-17T02:00:00Z`
 * -domingo 21:00 en Lima-, que es la version de esta pantalla de la
 * "frontera de medianoche" de M-7: el instante crudo y el dia civil en Lima
 * caen en DIAS DISTINTOS, que es justo donde una funcion de fecha mal
 * escrita se rompe.
 *
 *   - fechaEnLima() sobre ese instante da '2026-08-16', y
 *     `new Date('2026-08-16T00:00:00Z').getUTCDay()` da 0 = domingo.
 *     CORRECTO, y es el camino que sigue esta funcion.
 *   - `getUTCDay()` sobre el instante CRUDO da 1 = lunes. INCORRECTO:
 *     confunde el dia UTC con el dia civil de Lima.
 *   - `getDay()` sobre el instante crudo da 0 = domingo. Correcto EN ESTA
 *     MAQUINA, y solo porque la maquina de desarrollo corre en UTC-5 -la
 *     misma diferencia horaria que Lima-.
 *
 * MEDIDO OTRA VEZ EL 2026-08-13, con `TZ=UTC` -la zona en la que corren el CI
 * y el servidor de produccion- para no tener que inferirlo: con
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` devolviendo `UTC`
 * -confirma que la zona quedo efectivamente cambiada-, el MISMO instante dio
 * `getDay()` = 1 = lunes y `getUTCDay()` = 1 = lunes -los DOS INCORRECTOS y
 * coincidentes, porque sin diferencia horaria las dos funciones dan lo
 * mismo-, mientras que el camino de esta funcion -fechaEnLima() y despues
 * `getUTCDay()` sobre la medianoche UTC de esa fecha civil- siguio dando
 * 0 = domingo: CORRECTO, e igual que en la maquina de desarrollo. Es esa
 * igualdad entre las dos zonas -el camino correcto da el MISMO resultado en
 * las dos, el incorrecto no- la que hace que esta funcion sea correcta y no
 * afortunada.
 *
 * CONSECUENCIA PARA QUIEN LEA ESTO DESPUES: una prueba de esta propiedad
 * pasa en verde en la maquina de desarrollo AUNQUE el codigo use `getDay()`
 * -el defecto no lo destapa la prueba corriendo en local, lo destapa el CI,
 * que corre en otra zona horaria-. La defensa real no es "correr la
 * prueba": es no escribir `getDay()` ni `getUTCDay()` sobre un instante
 * crudo en ningun sitio de este archivo, y pasar siempre primero por
 * fechaEnLima().
 */
export function diaDeSemanaEnLima(instante: string): DiaSemana {
  const fecha = fechaEnLima(new Date(instante));
  const indice = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return DIAS_POR_INDICE_UTC[indice];
}

/**
 * Cuenta las reservas por estado. Los SEIS estados siempre aparecen en el
 * resultado, incluso en cero: un array vacio no devuelve `{}` sino los seis
 * contadores en cero, porque si un estado en cero desapareciera del
 * resultado la suma de los seis dejaria de poder compararse con el total en
 * pantalla -la propiedad que D-51 hace verificable de un vistazo: sus OCHO
 * indicadores son los seis estados mas el total de registradas mas los
 * prestamos de la semana, y los seis estados suman exactamente ese total-.
 *
 * Los seis campos se escriben A MANO y no se derivan de ORDEN_ESTADOS de
 * lib/admin/filtros.ts -este modulo no importa ese archivo, mismo motivo que
 * ReservaContable de arriba-. La red de seguridad es la misma que ya explica
 * el comentario de ETIQUETAS_ESTADO en filtros.ts: si el enum
 * `reservation_status` ganara o perdiera un miembro, el typecheck de ESTE
 * objeto literal fallaria antes de llegar a ejecutar nada.
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
 * La ventana es [sumarDias(hoy, -6), hoy], CERRADA en los dos extremos y
 * MOVIL hacia atras -mismo tipo de ventana que ya usa
 * pasaFiltroFechaReservas() en lib/admin/filtros.ts para "Esta semana" del
 * filtro de /admin/reservas, con la direccion invertida: aquel filtro mira
 * hacia ADELANTE porque sirve para planificar el mostrador, y este indicador
 * mira hacia ATRAS porque es una estadistica y describe lo que ya paso-.
 *
 * La comparacion es de TEXTO contra TEXTO sobre `YYYY-MM-DD`, no de
 * instantes: las tres fechas salen de fechaEnLima(), que ya devuelve ese
 * formato, y ese formato ordena igual como texto que como fecha -misma
 * tecnica que pasaFiltroFechaReservas()-.
 *
 * `ahora` llega POR PARAMETRO y no se lee con `new Date()` por dentro: una
 * funcion que lee el reloj del sistema no se puede probar en la frontera de
 * medianoche, que es justo el suelo de esta ventana.
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
 * D-50: cuantos prestamos se retiraron en cada dia de la semana, sobre TODO
 * el historico -no sobre la ventana de 7 dias de prestamosDeLaSemana()-.
 * Responde "que dia se pide mas equipo", y por eso acumula reservas de
 * semanas distintas bajo el MISMO dia: dos prestamos retirados un jueves,
 * aunque sean de jueves diferentes, suman los dos al contador de "jueves".
 *
 * Cuenta el MISMO conjunto de estados que D-49 -seRetiro()-, y por eso el
 * panel titula esta seccion "Prestamos por dia de la semana" y no "Reservas
 * por dia de la semana": la etiqueta dice que conjunto es.
 *
 * Los siete dias arrancan en cero, mismo motivo que contarPorEstado(): un
 * dia sin ningun prestamo tiene que verse como "0", no desaparecer de la
 * lista.
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

/**
 * Junta los tres agregados de arriba en una sola llamada, para que
 * app/(personal)/admin/estadisticas/page.tsx no tenga que orquestar tres
 * funciones sueltas -mismo motivo por el que particionarPorDia()
 * (lib/admin/filtros.ts) le devuelve a /admin/dias los dos grupos ya
 * separados en vez de dejar que la pagina filtre dos veces-.
 */
export function calcularEstadisticas(reservas: ReservaContable[], ahora: Date): Estadisticas {
  return {
    registradas: reservas.length,
    porEstado: contarPorEstado(reservas),
    prestamosSemana: prestamosDeLaSemana(reservas, ahora),
    porDia: desglosePorDiaDeSemana(reservas),
  };
}
