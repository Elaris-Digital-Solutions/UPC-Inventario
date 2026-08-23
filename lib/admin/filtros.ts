// Logica pura de /admin/reservas (F6), /admin/dias (F8) y /admin/personal: sin
// React, sin Supabase y sin red. Se puede PROBAR sin montar nada, y "que reserva
// pasa el filtro" se decide en UN SOLO SITIO.
//
// DOS REGLAS QUE VALEN PARA TODO EL ARCHIVO.
//
// 1. IMPORTS RELATIVOS y no `@/`: este modulo lo carga filtros.test.ts, y bajo
//    Vitest el alias no resuelve. `typecheck` y `build` pasan en verde con el
//    alias; solo `vitest run` se rompe. Ver COMPORTAMIENTO_MEDIDO.md §5.
//    Por lo mismo, los tipos de entrada se declaran ESTRUCTURALES aqui en vez de
//    importarse de los modulos que traen el cliente de servidor.
// 2. LAS FUNCIONES SON GENERICAS sobre su tipo de entrada para devolver el tipo
//    COMPLETO que reciben y no el recorte que necesitan leer. Sin el generico, la
//    pantalla recibiria objetos sin `id` y habria que reunirlos por id.
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

import type { Database } from '../database.types';
import type { EstadoReserva } from '../reservas/consultas';

// Re-exportado para que la pantalla tenga un solo sitio de donde importarlo. El
// enum de verdad vive en lib/reservas/consultas.ts y no se duplica.
export type { EstadoReserva };

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
 * Se aplica a los DOS lados -la consulta y el dato-, que es la parte que se
 * olvida: normalizar solo lo que alguien teclea encuentra "Microfono" buscando
 * "micrófono" pero NO al reves.
 *
 * LA EÑE SE CONVIERTE EN `n`, y es a proposito: quien teclea "diseno" quiere
 * encontrar "diseño". Esta funcion no sirve para MOSTRAR texto.
 */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/**
 * Si una reserva casa con la busqueda de texto libre: los SEIS campos que pide
 * F6 se juntan en un solo texto y se busca la consulta dentro.
 *
 * Una consulta vacia no filtra nada; `normalizar()` ya recorta, asi que los
 * espacios sueltos caen solos.
 */
export function pasaBusqueda(reserva: ReservaFiltrable, consulta: string): boolean {
  const aguja = normalizar(consulta);
  if (aguja === '') {
    return true;
  }

  // `filter(Boolean)` NO sirve aqui: no estrecha el tipo, asi que el `join`
  // escribiria "null" dentro del texto buscable. Hace falta un predicado.
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
// "todas" no esta porque no tiene techo: se resuelve antes de mirar la tabla.
const DIAS_DE_TECHO: Record<Exclude<FiltroFechaReservas, 'todas'>, number> = {
  hoy: 0,
  tres_dias: 2,
  semana: 6,
};

/**
 * Si una reserva pasa el filtro de fecha, comparando su INICIO. Rango CERRADO y
 * ventanas MOVILES.
 *
 * CON SUELO, al reves que el filtro del mostrador: alli el techo sin suelo
 * existe porque las reservas vencidas son las candidatas a "No se retiro". ACA la
 * tabla es HISTORICA y trae los seis estados, asi que sin suelo "Hoy" arrastraria
 * todo el pasado.
 *
 * MOVILES y no de calendario: una ventana de calendario cambia de tamaño segun el
 * dia en que se mire -un viernes son tres dias y un lunes son siete-.
 *
 * `ahora` llega POR PARAMETRO: una funcion que lee el reloj del sistema no se
 * puede probar en la frontera de medianoche, que es justo donde esto se rompe.
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

  // Comparacion de texto sin truco: las tres son `YYYY-MM-DD`, y ese formato
  // ordena igual como texto que como fecha.
  return dia >= hoy && dia <= techo;
}

/** Si una reserva pasa el filtro de estado. `'todos'` no descarta ninguna. */
export function pasaFiltroEstado(estado: EstadoReserva, filtro: FiltroEstado): boolean {
  return filtro === 'todos' || estado === filtro;
}

/**
 * Los tres filtros y el orden, en una sola pasada.
 *
 * COPIA ANTES DE ORDENAR: `sort` ordena en el sitio, asi que sin `[...]` esto
 * reordenaria el array del llamador, que en React es mutar una prop.
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

// Los ORDEN_* existen porque `Object.keys()` devuelve `string[]` y convertirlo al
// tipo exigiria un `as` que le mentiria al compilador. La red de seguridad son
// los `Record<..., string>`, con todas las claves escritas: si el tipo ganara o
// perdiera un miembro, el typecheck de ESE objeto fallaria primero.

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

// LOS SEIS ESTADOS. El panel de Vite ofrecia cinco -le faltaba `not_picked_up`-,
// y un filtro que no lo ofrece esconde reservas que existen.
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

// ─────────────────────────────────────────────────────────────────────────────
// /admin/dias (F8, D-40)
// ─────────────────────────────────────────────────────────────────────────────

export type ReservaDelDia = { id: string; inicio: string; estado: EstadoReserva };

/**
 * Reparte las reservas vivas de un dia entre las que se cancelarian y las que
 * seguirian vigentes, para que /admin/dias muestre los DOS numeros antes de
 * inhabilitar.
 *
 * LA PERTENENCIA AL DIA SE DECIDE COMPARANDO TEXTO CONTRA TEXTO con
 * `fechaEnLima()`, no con un rango de instantes UTC: un rango obligaria a
 * escribir a mano que Lima es UTC-5, y fechaEnLima() ya usa Intl justamente para
 * no hacer esa suposicion.
 */
export function particionarPorDia<T extends ReservaDelDia>(
  reservas: T[],
  fecha: string,
): { reservadas: T[]; activas: T[] } {
  const delDia = reservas.filter((r) => fechaEnLima(new Date(r.inicio)) === fecha);

  return {
    reservadas: delDia.filter((r) => r.estado === 'reserved'),
    activas: delDia.filter((r) => r.estado === 'active'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin/personal (D-52, D-53)
// ─────────────────────────────────────────────────────────────────────────────

// Leido del ESQUEMA GENERADO y no escrito a mano (D-26): si el enum ganara un
// tercer valor, el typecheck lo diria solo.
export type RolStaff = Database['public']['Enums']['staff_role'];

export type StaffParaCruce = {
  userId: string;
  rol: RolStaff;
  activo: boolean;
  registro: string; // `created_at` en ISO, tal cual llega
};

// De una fila de `alumnos` que YA tiene `auth_user_id`: la columna es nulable,
// pero quien produce este tipo descarta esa rama antes de construirlo.
export type AlumnoParaCruce = {
  authUserId: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
};

// Lo que devuelve public.primer_acceso_personal() (D-80). `primerAcceso` es
// nulable de verdad: `confirmation_sent_at` es NULLABLE en auth.users, y una fila
// insertada por SQL directo -como el primer admin- puede no tenerla.
export type PrimerAccesoParaCruce = {
  userId: string;
  primerAcceso: string | null;
};

export type MiembroPersonal = {
  userId: string;
  rol: RolStaff;
  activo: boolean;
  registro: string; // `created_at` en ISO, tal cual llega
  // `null` por DOS causas que esta capa no distingue y no le hace falta: que la
  // funcion no devolviera fila -quien mira no es admin-, o que
  // `confirmation_sent_at` sea null de verdad.
  primerAcceso: string | null;
  // `null` cuando NO hay fila en `alumnos` para este `user_id`. Poco comun pero
  // alcanzable: `staff_members.user_id` referencia `auth.users`, no `alumnos`, y
  // nada en el esquema exige la segunda fila -el seed local inserta una cuenta
  // asi por SQL directo, saltandose el enganche de dominio de D-32-. El cruce NO
  // descarta esa fila: perder de vista a un miembro del personal es peor que
  // mostrarlo sin correo.
  alumno: { email: string; nombre: string | null; apellido: string | null } | null;
};

/**
 * Cruza el personal con sus datos de alumno, por `user_id` / `auth_user_id`.
 *
 * Hace falta como funcion aparte porque el embed no existe: `staff_members.user_id`
 * referencia `auth.users`, no `alumnos`, y no hay FK entre las dos tablas
 * (COMPORTAMIENTO_MEDIDO.md §1.3).
 *
 * EL ORDEN QUE ENTRA ES EL ORDEN QUE SALE: `.map()` no reordena, asi que quien
 * decide el orden final es el `order()` de la consulta.
 */
export function cruzarPersonal(
  staff: StaffParaCruce[],
  alumnos: AlumnoParaCruce[],
  primerAcceso: PrimerAccesoParaCruce[],
): MiembroPersonal[] {
  const porUserId = new Map(alumnos.map((a) => [a.authUserId, a]));
  const accesoPorUserId = new Map(primerAcceso.map((p) => [p.userId, p.primerAcceso]));

  return staff.map((s) => {
    const alumno = porUserId.get(s.userId) ?? null;

    return {
      userId: s.userId,
      rol: s.rol,
      activo: s.activo,
      registro: s.registro,
      // `?? null` y no `get()` a secas: la clave puede faltar o estar con valor
      // null, y las dos salen como null.
      primerAcceso: accesoPorUserId.get(s.userId) ?? null,
      alumno: alumno ? { email: alumno.email, nombre: alumno.nombre, apellido: alumno.apellido } : null,
    };
  });
}
