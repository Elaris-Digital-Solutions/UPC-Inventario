// Los filtros de /admin/reservas (F6), como logica pura: sin React, sin
// Supabase y sin red. Mismo espiritu que lib/mostrador/filtro.ts y
// lib/mostrador/columnas.ts -- se puede PROBAR sin montar nada, y "que reserva
// pasa el filtro" se decide en UN SOLO SITIO.
//
// IMPORTS RELATIVOS y no `@/`: este modulo lo carga filtros.test.ts, y Vitest
// no conoce el alias que declara tsconfig.json -- no hay vitest.config.ts --.
// `typecheck` y `build` pasan en verde con el alias; solo `vitest run` se
// rompe. Medido en la Task 8 de la tanda 3A.
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

import type { EstadoReserva } from '../reservas/consultas';

// Re-exportado para que la pantalla y sus componentes tengan un solo sitio de
// donde importar el enum, igual que ya hace lib/mostrador/consultas.ts. El
// enum de verdad -- leido del esquema generado, no una union escrita a mano --
// vive en lib/reservas/consultas.ts y no se duplica.
export type { EstadoReserva };

// Lo que el filtro necesita leer de una reserva, y NADA MAS. Se declara aca y
// no se importa `ReservaAdmin` de lib/admin/reservas.ts a proposito: ese modulo
// importa el cliente de servidor por el alias `@/`, y con un import de VALOR
// -- o con uno de tipo que alguien convierta en valor mañana -- este archivo
// dejaria de poder cargarse bajo Vitest. Al declararlo estructural, la consulta
// encaja sola con solo tener estos campos, y filtrarYOrdenar() es generica para
// devolver el tipo COMPLETO de la pantalla y no este recorte.
export type ReservaFiltrable = {
  inicio: string; // ISO, tal cual llega
  registro: string; // `created_at` en ISO: el tercer orden que pide F6
  estado: EstadoReserva;
  alumno: { nombre: string | null; apellido: string | null; email: string } | null;
  producto: string;
  categoria: string | null;
  unidad: string;
  activoFijo: string | null;
};

export type FiltroFechaReservas = 'hoy' | 'tres_dias' | 'semana' | 'todas';
export type FiltroEstado = EstadoReserva | 'todos';
export type OrdenReservas = 'inicio_desc' | 'inicio_asc' | 'registro_desc';

export type CriteriosReservas = {
  busqueda: string;
  fecha: FiltroFechaReservas;
  estado: FiltroEstado;
  orden: OrdenReservas;
};

/**
 * Un texto listo para comparar: sin tildes, en minusculas y recortado.
 *
 * `NFD` separa cada letra acentuada en letra + diacritico suelto, y el
 * `replace` borra los diacriticos. Se aplica a los DOS lados -- la consulta y
 * el dato --, que es la parte que se olvida: normalizar solo lo que alguien
 * teclea encuentra "Microfono" buscando "micrófono" pero NO al reves, y nada
 * garantiza que los nombres guardados lleven o no lleven tilde. El caso lo
 * nombra el Step 3 del plan de esta tanda; el producto concreto que lo hace
 * visible -- "Microfono Rode NTG4", sin tilde -- es del SEED LOCAL, no del
 * catalogo real, cuyas categorias son otras.
 *
 * LA EÑE SE CONVIERTE EN `n`, y es a proposito: NFD la descompone igual que a
 * una vocal acentuada. Quien teclea "diseno" quiere encontrar "diseño", asi
 * que para BUSCAR es lo correcto. Esta funcion no sirve para MOSTRAR texto.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Si una reserva casa con la busqueda de texto libre.
 *
 * Los SEIS campos que pide F6 -- solicitante, correo, producto, categoria,
 * codigo de unidad y activo fijo -- se juntan en un solo texto y se busca la
 * consulta dentro. Es lo mismo que hacia el panel de Vite, con dos
 * diferencias: aquel no normalizaba tildes, y el solicitante era una columna
 * suelta (`requester_name`) que el esquema nuevo no tiene -- hoy sale del
 * embed de `alumnos`, que puede llegar `null` entero cuando RLS lo bloquea.
 *
 * Una consulta vacia -- o de solo espacios -- no filtra nada. `normalizar()`
 * ya recorta, asi que los espacios sueltos caen aca solos.
 */
export function pasaBusqueda(reserva: ReservaFiltrable, consulta: string): boolean {
  const aguja = normalizar(consulta);
  if (aguja === '') {
    return true;
  }

  // `filter(Boolean)` NO sirve aca aunque parezca lo mismo que hacia el panel
  // viejo: no estrecha el tipo, asi que TypeScript seguiria viendo
  // `(string | null)[]` y el `join` de abajo escribiria "null" dentro del
  // texto buscable. Un `null` explicito fuera con un predicado de tipo.
  const partes: (string | null)[] = [
    reserva.alumno?.nombre ?? null,
    reserva.alumno?.apellido ?? null,
    reserva.alumno?.email ?? null,
    reserva.producto,
    reserva.categoria,
    reserva.unidad,
    reserva.activoFijo,
  ];

  const pajar = normalizar(partes.filter((p): p is string => p !== null).join(' '));

  return pajar.includes(aguja);
}

// Cuantos dias suma el techo de cada opcion, contando HOY como el dia 0.
// "todas" no esta en la tabla porque no tiene techo: se resuelve aparte, antes
// de mirarla.
const DIAS_DE_TECHO: Record<Exclude<FiltroFechaReservas, 'todas'>, number> = {
  hoy: 0,
  tres_dias: 2,
  semana: 6,
};

/**
 * Si una reserva pasa el filtro de fecha, comparando su INICIO.
 *
 * DECISION DE ALEJANDRO, 2026-08-12: rango CERRADO -- con suelo y con techo --
 * y ventanas MOVILES.
 *
 *   1. CON SUELO, al reves que pasaFiltroFecha() del mostrador
 *      (lib/mostrador/filtro.ts). Alli el techo sin suelo existe por un motivo
 *      concreto: las reservas de "Por entregar" cuya hora ya paso son las
 *      candidatas a "No se retiro", y esconderlas haria que esa falta no se
 *      marcara nunca. ACA la tabla es HISTORICA y trae los seis estados,
 *      incluidas reservas completadas de hace meses: sin suelo, "Hoy"
 *      arrastraria todo el pasado y el filtro no filtraria casi nada. Las dos
 *      pantallas miran conjuntos distintos, asi que la misma forma de filtrar
 *      daria resultados opuestos.
 *   2. VENTANAS MOVILES, igual que el mostrador y al reves que el panel de
 *      Vite, que usaba "esta semana" de calendario -- lunes a domingo --. Una
 *      ventana de calendario cambia de tamaño segun el dia en que se mire: un
 *      viernes son tres dias y un lunes son siete.
 *
 * `ahora` llega POR PARAMETRO y no se lee con `new Date()` por dentro, mismo
 * motivo que hoyEnLima() y pasaFiltroFecha(): una funcion que lee el reloj del
 * sistema no se puede probar en la frontera de medianoche, que es justo donde
 * este filtro se rompe si se escribe mal.
 */
export function pasaFiltroFechaReservas(
  inicio: string,
  ahora: Date,
  filtro: FiltroFechaReservas,
): boolean {
  if (filtro === 'todas') {
    return true;
  }

  const hoy = fechaEnLima(ahora);
  const techo = sumarDias(hoy, DIAS_DE_TECHO[filtro]);
  const dia = fechaEnLima(new Date(inicio));

  // Comparacion de texto sin ningun truco: las tres fechas son `YYYY-MM-DD`,
  // el formato que devuelve fechaEnLima() en los tres casos, y ese formato
  // ordena igual como texto que como fecha.
  return dia >= hoy && dia <= techo;
}

/** Si una reserva pasa el filtro de estado. `'todos'` no descarta ninguna. */
export function pasaFiltroEstado(estado: EstadoReserva, filtro: FiltroEstado): boolean {
  return filtro === 'todos' || estado === filtro;
}

/**
 * Los tres filtros y el orden, aplicados en una sola pasada.
 *
 * GENERICA sobre `T extends ReservaFiltrable` para devolver el tipo COMPLETO
 * que le entra -- `ReservaAdmin`, con sus campos de la fila expandible -- y no
 * el recorte que el filtro necesita leer. Sin el generico, la pantalla
 * recibiria de vuelta objetos sin `id`, `fin` ni `motivo` y habria que
 * reunirlos por id, que es trabajo inventado.
 *
 * COPIA ANTES DE ORDENAR: `sort` ordena en el sitio, asi que sin `[...]` esta
 * funcion reordenaria el array del llamador -- y en React eso es mutar una
 * prop y pintar dos veces cosas distintas con el mismo dato.
 */
export function filtrarYOrdenar<T extends ReservaFiltrable>(
  reservas: T[],
  criterios: CriteriosReservas,
  ahora: Date,
): T[] {
  const filtradas = reservas.filter(
    (r) =>
      pasaFiltroEstado(r.estado, criterios.estado) &&
      pasaFiltroFechaReservas(r.inicio, ahora, criterios.fecha) &&
      pasaBusqueda(r, criterios.busqueda),
  );

  return [...filtradas].sort((a, b) => {
    switch (criterios.orden) {
      case 'inicio_asc':
        return Date.parse(a.inicio) - Date.parse(b.inicio);
      case 'registro_desc':
        return Date.parse(b.registro) - Date.parse(a.registro);
      case 'inicio_desc':
        return Date.parse(b.inicio) - Date.parse(a.inicio);
    }
  });
}

// Las etiquetas de interfaz, CON sus tildes -- a diferencia de los comentarios
// de este archivo, que van sin acentos ni eñe por convencion del proyecto --.
// Y los tres ORDEN_* de abajo existen por el mismo motivo que
// ORDEN_FILTROS_FECHA en lib/mostrador/filtro.ts: `Object.keys()` devuelve
// `string[]`, y convertirlo al tipo exigiria un `as` que le mentiria al
// compilador. La red de seguridad real son los `Record<..., string>` de arriba,
// con todas las claves escritas a mano: si el tipo ganara o perdiera un
// miembro, el typecheck de ESE objeto fallaria antes de llegar al array.

export const ETIQUETAS_FECHA: Record<FiltroFechaReservas, string> = {
  hoy: 'Hoy',
  tres_dias: 'Próximos 3 días',
  semana: 'Esta semana',
  todas: 'Todas las fechas',
};

export const ORDEN_FECHAS: readonly FiltroFechaReservas[] = [
  'todas',
  'hoy',
  'tres_dias',
  'semana',
];

// LOS SEIS ESTADOS, y el panel de Vite ofrecia CINCO -- le faltaba
// `not_picked_up` --. Se incluye porque el mostrador de la tanda 3A lo escribe
// de verdad desde su boton "No se retiro": un filtro que no lo ofrece esconde
// reservas que existen, y eso es visibilidad, no estetica.
export const ETIQUETAS_ESTADO: Record<EstadoReserva, string> = {
  reserved: 'Reservada',
  active: 'Entregada',
  completed: 'Devuelta',
  cancelled: 'Cancelada',
  not_picked_up: 'No se retiró',
  not_returned: 'No se devolvió',
};

export const ORDEN_ESTADOS: readonly EstadoReserva[] = [
  'reserved',
  'active',
  'completed',
  'cancelled',
  'not_picked_up',
  'not_returned',
];

export const ETIQUETAS_ORDEN: Record<OrdenReservas, string> = {
  inicio_desc: 'Inicio (recientes primero)',
  inicio_asc: 'Inicio (antiguas primero)',
  registro_desc: 'Registro (recientes primero)',
};

export const ORDEN_ORDENES: readonly OrdenReservas[] = [
  'inicio_desc',
  'inicio_asc',
  'registro_desc',
];
