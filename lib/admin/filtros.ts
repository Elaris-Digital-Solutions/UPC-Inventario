// Los filtros de /admin/reservas (F6), como logica pura: sin React, sin
// Supabase y sin red. Mismo espiritu que lib/mostrador/filtro.ts y
// lib/mostrador/columnas.ts -- se puede PROBAR sin montar nada, y "que reserva
// pasa el filtro" se decide en UN SOLO SITIO.
//
// DESDE LA TASK 7 TAMBIEN SIRVE A F8 (/admin/dias): particionarPorDia(), al
// final del archivo, reparte las reservas "vivas" del dia que el admin elige
// en reservadas y activas, para que esa pantalla sepa cuantas reservas se
// cancelarian y cuantos prestamos ya entregados seguirian vigentes, ANTES de
// confirmar. Es la misma idea que el resto de este archivo -- una funcion
// pura, probada aparte -- aplicada a otra pantalla.
//
// Y DESDE LA TASK 9 TAMBIEN SIRVE A /admin/personal: cruzarPersonal(), al
// final del archivo, junta una fila de `staff_members` con su fila de
// `alumnos` -- dos consultas que lib/admin/personal.ts hace por separado,
// porque el embed entre esas dos tablas no existe -- ver el comentario de la
// funcion, con la medicion que lo confirma.
//
// IMPORTS RELATIVOS y no `@/`: este modulo lo carga filtros.test.ts, y Vitest
// no conoce el alias que declara tsconfig.json -- no hay vitest.config.ts --.
// `typecheck` y `build` pasan en verde con el alias; solo `vitest run` se
// rompe. Medido en la Task 8 de la tanda 3A.
import { fechaEnLima, sumarDias } from '../reservas/rejilla';

import type { Database } from '../database.types';
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

// ─────────────────────────────────────────────────────────────────────────────
// Task 7 · /admin/dias (F8, D-40)
// ─────────────────────────────────────────────────────────────────────────────

// Lo que particionarPorDia() necesita leer de una reserva "viva", y NADA MAS.
// Se declara estructural, mismo criterio que ReservaFiltrable mas arriba: no
// se importa el tipo de lib/admin/dias.ts para no acoplar este modulo -- que
// Vitest carga -- a uno que trae el cliente de servidor.
export type ReservaDelDia = { id: string; inicio: string; estado: EstadoReserva };

/**
 * Reparte las reservas "vivas" -- reserved y active -- de un dia entre las que
 * se cancelarian (reservadas) y las que seguirian vigentes (activas), para que
 * /admin/dias pueda mostrar los DOS numeros antes de inhabilitar un dia.
 *
 * LA PERTENENCIA AL DIA SE DECIDE CON `fechaEnLima()`, COMPARANDO TEXTO CONTRA
 * TEXTO -- `fechaEnLima(new Date(r.inicio)) === fecha` --, igual que ya hace
 * pasaFiltroFechaReservas() unas lineas mas arriba en este archivo. NO es un
 * rango de instantes UTC, y la razon no es gusto: un rango obligaria a
 * escribir a mano que Lima es UTC-5 para convertir el dia civil `fecha` en sus
 * dos extremos, y fechaEnLima() (lib/reservas/rejilla.ts:21-24) ya tiene
 * escrita la regla contraria -- verificada literal antes de citarla aca --:
 * "Se usa Intl y no aritmetica de horas porque Intl SI conoce el calendario de
 * la zona; hoy Peru no cambia de hora, pero una resta de cinco horas escrita a
 * mano seria una suposicion sin nadie que la vigile." Comparar texto reutiliza
 * esa misma funcion en vez de escribir una segunda version de la regla.
 *
 * GENERICA sobre `T extends ReservaDelDia`, mismo motivo que filtrarYOrdenar()
 * mas arriba: devuelve el tipo COMPLETO que le entra -- `ReservaViva`, con su
 * `id`, que la pantalla necesita para mandar la lista al servidor -- y no el
 * recorte que esta funcion necesita leer.
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
// Task 9 · /admin/personal (D-52, D-53)
// ─────────────────────────────────────────────────────────────────────────────

// El rol de un miembro del personal, leido del ESQUEMA GENERADO y no escrito
// a mano como `'admin' | 'operator'` -- D-26 --. Si el enum ganara un tercer
// valor algun dia, el typecheck de este archivo lo diria solo.
export type RolStaff = Database['public']['Enums']['staff_role'];

// Lo que cruzarPersonal() necesita leer de una fila de `staff_members`, y NADA
// MAS. Estructural y declarado aca -- no importado de lib/admin/personal.ts --,
// mismo motivo que ReservaDelDia mas arriba: ese modulo importa el cliente de
// servidor por el alias `@/`, y este archivo lo carga Vitest.
export type StaffParaCruce = {
  userId: string;
  rol: RolStaff;
  activo: boolean;
  registro: string; // `created_at` en ISO, tal cual llega
};

// Lo que cruzarPersonal() necesita leer de una fila de `alumnos` que YA tiene
// `auth_user_id` -- la columna es nulable en el esquema, pero quien produce
// este tipo (lib/admin/personal.ts) descarta esa rama antes de construirlo--.
export type AlumnoParaCruce = {
  authUserId: string;
  email: string;
  nombre: string | null;
  apellido: string | null;
};

// Lo que devuelve public.primer_acceso_personal() por cada miembro (D-80,
// migracion 31). `primerAcceso` es nulable de verdad: `confirmation_sent_at`
// es NULLABLE en auth.users, y una fila de personal insertada por SQL directo
// -- como el primer admin -- puede no tenerla.
export type PrimerAccesoParaCruce = {
  userId: string;
  primerAcceso: string | null;
};

// Lo que pinta /admin/personal por cada miembro. Misma forma que
// `ReservaFiltrable.alumno` mas arriba: `nombre` y `apellido` nulables por
// separado, `email` no.
export type MiembroPersonal = {
  userId: string;
  rol: RolStaff;
  activo: boolean;
  registro: string; // `created_at` en ISO, tal cual llega
  // Fecha del PRIMER magic link, en ISO. `null` por DOS causas distintas que
  // esta capa no distingue, y no hace falta que lo haga: que la funcion no
  // haya devuelto fila para este `user_id` -- quien mira no es admin, y
  // entonces no devuelve ninguna --, o que `confirmation_sent_at` sea null de
  // verdad. Quien no es admin no llega a esta pantalla: el layout de
  // app/(personal)/admin/ lo para antes.
  primerAcceso: string | null;
  // `null` cuando NO hay fila en `alumnos` para este `user_id`. La rama
  // IMPORTA aunque hoy sea el camino menos comun -- no es un caso teorico,
  // pero tampoco el camino normal --: desde D-32 el enganche Before User
  // Created `private.hook_restrict_signup_domain()`
  // (supabase/migrations/20260807002839_signup_domain_hook.sql) RECHAZA el
  // registro si el correo no termina en `@upc.edu.pe`, asi que por el flujo
  // normal -pedir el enlace de acceso- una cuenta asi ya no deberia poder
  // nacer. Sigue siendo alcanzable saltandose ese flujo -por SQL directo: el
  // propio seed local inserta `alguien@gmail.com` en `auth.users` asi
  // (supabase/seed.sql:105), sin pasar por Auth ni por el enganche-, y
  // `staff_members.user_id` referencia `auth.users`, no `alumnos`: nada en el
  // esquema impide que una fila de personal exista sin fila de alumnos. (El
  // primer admin de produccion NO es un ejemplo de esta rama: Task 9 de
  // MIGRATION_DOCS/PLANES/FASE_2_TANDA_1.md exige entrar primero por el flujo
  // normal con la cuenta @upc.edu.pe -Step 1- y recien despues insertar por
  // SQL SOLO la fila de `staff_members` -Step 3-, asi que esa cuenta si tiene
  // fila en `alumnos`: el trigger ya la habia creado.) El cruce no puede
  // descartar la fila sin alumno: perder de vista a un miembro del personal
  // es peor que mostrarlo sin correo.
  alumno: { email: string; nombre: string | null; apellido: string | null } | null;
};

/**
 * Cruza el personal con sus datos de alumno, por `user_id` / `auth_user_id`.
 *
 * PURA: sin red, sin Supabase, mismo espiritu que el resto del archivo. Hace
 * falta como funcion aparte porque el embed que haria PostgREST solo
 * -`staff_members(...alumnos(...))`- no existe: `staff_members.user_id`
 * referencia `auth.users`, no `alumnos`, y no hay ninguna FK entre las dos
 * tablas. La medicion completa -el codigo, el HTTP y el mensaje literal de
 * PostgREST- esta en el comentario de cabecera de lib/admin/personal.ts, que
 * es quien hace las DOS consultas por separado y le pasa los dos arrays a
 * esta funcion.
 *
 * EL ORDEN QUE ENTRA ES EL ORDEN QUE SALE: recorre `staff` con `.map()`, que
 * no reordena, asi que quien decide el orden final es el `order('created_at')`
 * de la consulta en lib/admin/personal.ts, no esta funcion.
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
      // `?? null` y no `get()` a secas: la clave puede faltar -- la funcion no
      // devolvio fila -- o estar con valor null. Las dos salen como null, que
      // es lo que la columna pinta con un guion.
      primerAcceso: accesoPorUserId.get(s.userId) ?? null,
      alumno: alumno ? { email: alumno.email, nombre: alumno.nombre, apellido: alumno.apellido } : null,
    };
  });
}
