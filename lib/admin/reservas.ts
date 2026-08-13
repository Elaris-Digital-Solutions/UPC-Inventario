import { createClient } from '@/lib/supabase/server';

import type { EstadoUnidad } from '@/lib/admin/consultas';
import type { EstadoReserva } from '@/lib/reservas/consultas';

// La lectura de /admin/reservas (F6 de ESPECIFICACION_FUNCIONAL.md): la tabla
// COMPLETA de reservas con su join a producto, unidad y alumno. Sigue la FORMA
// de lib/mostrador/consultas.ts y lib/admin/consultas.ts -- tipo de fila
// medido y declarado, funcion de traduccion, error crudo hacia arriba --, con
// una diferencia de criterio que se explica en filaAReservaAdmin().

export type AlumnoReserva = {
  nombre: string | null;
  apellido: string | null;
  email: string;
};

export type ReservaAdmin = {
  id: string;
  inicio: string; // ISO, tal cual llega
  fin: string; // ISO, tal cual llega
  registro: string; // `created_at` en ISO: el tercer orden que pide F6
  estado: EstadoReserva;
  // `| null` porque asi arma PostgREST el JSON cuando RLS bloquea el embed
  // -- medido en la T3A con tres sets de columnas distintos sobre la misma
  // fila bloqueada: los tres devolvieron `"alumnos":null`, sin llegar a mirar
  // columnas --. En ESTA pantalla no puede pasar: el layout de /admin exige
  // rol `admin`, y `alumnos_select_staff` le deja ver a todos los alumnos
  // -- es al OPERADOR a quien le recorta a los que tienen una reserva viva --.
  // El tipo lo admite igual porque el caso es de la API, no de la pantalla.
  alumno: AlumnoReserva | null;
  producto: string;
  categoria: string | null;
  unidad: string;
  activoFijo: string | null;
  // La FK cruda a `inventory_units`, no el embed. La necesita el paso a
  // `not_returned` para escribir la nota obligatoria en `inventory_unit_notes`
  // sin depender de que el embed de arriba haya llegado poblado -- misma razon
  // por la que ReservaMostrador trae `unidadId` en lib/mostrador/consultas.ts.
  unidadId: string;
  // Los cuatro ultimos son los de la fila expandible que pide F6: "fecha de
  // registro, estado de la unidad, duracion en minutos, proposito y razon de
  // cancelacion". `registro` es el primero y esta arriba con las demas fechas.
  estadoUnidad: EstadoUnidad;
  sede: string;
  duracionMinutos: number;
  motivo: string | null; // `purpose`: para que se pidio el equipo
  motivoCancelacion: string | null;
};

// La forma MEDIDA de la fila que devuelve el embed. Misma tecnica que
// FilaMostrador y FilaCruda: se declara la forma esperada y se usa como tipo
// del parametro de la traduccion, para que TypeScript la CONTRASTE contra lo
// que el `select` infiere en vez de imponerla con `.returns<>()`, que seria un
// `as` con otro nombre.
//
// MEDIDO EL 2026-08-12 con un JWT de admin firmado a mano contra el stack
// local: HTTP 200 con las nueve reservas del escenario y los tres embeds
// poblados, `campuses` anidado dentro de `inventory_units` incluido.
//
// `products` e `inventory_units` -- y `campuses` dentro del segundo -- llegan
// como OBJETO y no como array: la FK vive en la tabla que consulta, no en la
// embebida, asi que cada fila trae como mucho una relacionada. Al reves que
// `inventory_units` DENTRO de `products` en lib/admin/consultas.ts, que si
// llega como array porque alli la FK esta del otro lado.
type FilaCruda = {
  id: string;
  start_at: string;
  end_at: string;
  created_at: string;
  status: EstadoReserva;
  unit_id: string;
  purpose: string | null;
  cancellation_reason: string | null;
  products: { name: string; category: string | null } | null;
  inventory_units: {
    unit_code: string;
    asset_code: string | null;
    status: EstadoUnidad;
    campuses: { name: string } | null;
  } | null;
  alumnos: { nombre: string | null; apellido: string | null; email: string } | null;
};

// Traduce una fila cruda a lo que pinta la tabla.
//
// NO DESCARTA NINGUNA FILA, y esa es la diferencia deliberada con
// filaAMostrador() (lib/mostrador/consultas.ts), que si descarta cuando falta
// el producto, la unidad o la sede. Los dos criterios son correctos para su
// pantalla:
//
//   - En el mostrador, la fila es una TARJETA CON BOTONES: sin saber que
//     equipo es ni donde esta, el operador no puede entregar ni recibir nada,
//     asi que una tarjeta rota le hace perder tiempo y es preferible que falte.
//   - Aca la fila es un REGISTRO HISTORICO. Aunque faltara el nombre del
//     producto, la fila sigue diciendo quien reservo, cuando y como acabo, y
//     las dos acciones del admin -- cambiar estado y cancelar -- viajan por
//     `id`, asi que funcionan igual. Descartarla le quitaria al admin la unica
//     pantalla donde esa reserva existe. Un listado de administracion que
//     esconde filas es un listado que miente, que es lo mismo que ya decidio
//     listarInventario() al no filtrar unidades retiradas.
//
// Y NINGUNO DE LOS TRES PUEDE LLEGAR `null` HOY, medido y no supuesto: las
// politicas de SELECT de `products`, `inventory_units` y `campuses` son las
// tres `using (true)` para `authenticated`
// -- `products_select_all`, `units_select_auth` y `campuses_select_all`,
// consultadas en `pg_policies` el 2026-08-12 --, y las tres FK son NOT NULL.
// Asi que el marcador de abajo no se ve nunca con los datos de hoy. Se cae a
// un texto en vez de descartar por el argumento del parrafo anterior, y se
// escribe `?? '—'` en vez de tipar `string | null` por el mismo motivo que ya
// eligio leerProducto() en lib/admin/consultas.ts para la sede: propagar a
// toda la pantalla un `null` que no puede existir obliga a cada consumidor a
// decidir que pintar para un caso que nadie va a ver.
function filaAReservaAdmin(fila: FilaCruda): ReservaAdmin {
  return {
    id: fila.id,
    inicio: fila.start_at,
    fin: fila.end_at,
    registro: fila.created_at,
    estado: fila.status,
    alumno: fila.alumnos,
    producto: fila.products?.name ?? '—',
    categoria: fila.products?.category ?? null,
    unidad: fila.inventory_units?.unit_code ?? '—',
    activoFijo: fila.inventory_units?.asset_code ?? null,
    unidadId: fila.unit_id,
    // `'active'` como valor de respaldo y no `'—'`: `EstadoUnidad` es un enum
    // de tres valores y la insignia de la fila expandible se pinta desde el.
    // Es inalcanzable por lo dicho arriba -- la FK es NOT NULL y la politica
    // deja leer a cualquier `authenticated` --.
    estadoUnidad: fila.inventory_units?.status ?? 'active',
    sede: fila.inventory_units?.campuses?.name ?? '—',
    // La duracion se CALCULA y no se lee de ninguna columna: la tabla guarda
    // `start_at` y `end_at`, y F6 pide los minutos. `Date.parse` sobre dos ISO
    // da milisegundos; el `Math.round` es por si algun instante trae
    // fracciones de segundo -- las reservas caen siempre en bloques enteros,
    // pero redondear cuesta menos que confiar en que siempre sera asi --.
    duracionMinutos: Math.round((Date.parse(fila.end_at) - Date.parse(fila.start_at)) / 60_000),
    motivo: fila.purpose,
    motivoCancelacion: fila.cancellation_reason,
  };
}

// Todas las reservas, para /admin/reservas.
//
// SIN FILTRO DE NINGUN TIPO en la consulta, al reves que reservasMostrador(),
// que solo pide `reserved` y `active`. F6 pide la tabla COMPLETA con filtro de
// estado en la pantalla, asi que filtrar aca dejaria al desplegable sin nada
// que ofrecer. El filtrado lo hace lib/admin/filtros.ts sobre el array ya
// traido -- logica pura y probada, en vez de un viaje a la base por cada
// tecla.
//
// TRAE LA TABLA ENTERA, y el limite se dice por delante en vez de descubrirlo
// tarde: produccion tiene CERO reservas hoy y la escala esperada es de
// decenas, asi que traerlas todas y filtrar en memoria es correcto y
// probable. Si algun dia hay decenas de miles, esto se convierte en filtros de
// PostgREST con paginacion, o en una vista. No es deuda oculta si esta
// escrita, mismo criterio que ya dejo anotado listarInventario().
//
// SIN FILTRAR POR ROL en el cliente, a proposito: `reservations_select_staff`
// ya deja ver toda la tabla a quien cumple `private.is_staff()`
// (supabase/migrations/20260805195852_reservation_policies.sql:27-29), y
// `alumnos_select_staff` ya recorta por su cuenta que alumno ve cada rol.
// Repetir ese filtro aca sugeriria que el aislamiento hace falta en esta capa.
//
// El orden de la consulta es el mismo que la pantalla ofrece por defecto
// -- inicio descendente --, aunque filtrarYOrdenar() lo vuelva a aplicar: sin
// un `order` explicito, el primer pintado dependeria del orden en que el motor
// devuelva las filas, que no esta garantizado.
//
// El error se PROPAGA, mismo criterio que reservasMostrador() y por el mismo
// motivo: un array vacio por un fallo de red o de RLS se leeria exactamente
// igual que "no hay ninguna reserva", que hoy es ademas el estado REAL de
// produccion. El admin no podria distinguir una pantalla rota de una base
// vacia.
export async function listarReservas(): Promise<ReservaAdmin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_reservations')
    .select(
      'id,start_at,end_at,created_at,status,unit_id,purpose,cancellation_reason,products(name,category),inventory_units(unit_code,asset_code,status,campuses(name)),alumnos(nombre,apellido,email)',
    )
    .order('start_at', { ascending: false });

  if (error) {
    throw new Error(`listarReservas: fallo la consulta a inventory_reservations: ${error.message}`);
  }

  return (data ?? []).map(filaAReservaAdmin);
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 8 · /admin/estadisticas (F9, ampliada por D-51)
// ─────────────────────────────────────────────────────────────────────────────

// La forma que lib/admin/estadisticas.ts necesita para sus agregados:
// exactamente los dos campos de ReservaContable, con nombres ya traducidos.
// Encaja ESTRUCTURALMENTE con ReservaContable -no se importa ese tipo aca,
// mismo reparto que ya hay entre ReservaViva (lib/admin/dias.ts) y
// ReservaDelDia (lib/admin/filtros.ts)-: quien produce el dato declara su
// propio tipo, y quien lo consume declara el suyo, y los dos coinciden
// porque TypeScript compara estructura y no nombre.
export type ReservaEstadistica = {
  inicio: string; // `start_at`, ISO tal cual llega
  estado: EstadoReserva;
};

type FilaEstadisticaCruda = {
  start_at: string;
  status: EstadoReserva;
};

function filaAReservaEstadistica(fila: FilaEstadisticaCruda): ReservaEstadistica {
  return {
    inicio: fila.start_at,
    estado: fila.status,
  };
}

/**
 * Las reservas para /admin/estadisticas: SOLO `start_at` y `status`, la
 * tabla entera y sin ningun filtro.
 *
 * ES UNA CONSULTA PROPIA Y NO listarReservas() REUTILIZADA, por dos motivos.
 * Primero, el volumen: esta pide DOS columnas contra las DIECISEIS que traduce
 * filaAReservaAdmin() con TRES embeds -`products`, `inventory_units` y su
 * `campuses` anidado- que esta pantalla ni pinta ni necesita, porque
 * calcularEstadisticas() (lib/admin/estadisticas.ts) solo lee `inicio` y
 * `estado`. Segundo, el contrato: listarReservas() devuelve `ReservaAdmin`,
 * un tipo con `alumno`, `producto` y demas campos que aca quedarian sin
 * usar; pedir menos columnas es mas barato que traerlas todas y descartarlas
 * en memoria.
 *
 * SIN `order`, al reves que listarReservas() y reservasVivas(): las
 * pantallas de aquellas dos funciones PINTAN una lista, y el primer render
 * sin `order` dependeria del orden en que el motor devuelva las filas. Los
 * agregados de esta pantalla -contar por estado, sumar la ventana de 7 dias,
 * repartir por dia de la semana- no dependen en absoluto del orden de
 * llegada: contarPorEstado() suma, no posiciona.
 *
 * TRAE LA TABLA ENTERA, y el limite se dice por delante en vez de
 * descubrirlo tarde -mismo criterio que ya dejo anotado listarReservas():
 * produccion tiene CERO reservas hoy (medido) y la escala esperada es de
 * decenas, asi que traerlas todas y agregarlas en memoria es correcto y
 * barato. Con decenas de miles de reservas esto se convierte en una vista
 * SQL que agregue en la base -exactamente el tipo de trabajo que D-41 deja
 * fuera de esta tanda-, y no es deuda oculta si queda escrita aca.
 *
 * El error se PROPAGA con throw, mismo criterio que listarReservas() y
 * reservasVivas() y por el mismo motivo: un array vacio por un fallo de red
 * o de RLS se leeria exactamente igual que "no hay ninguna reserva" -que
 * ademas es el estado REAL de produccion hoy, medido-, y el admin no podria
 * distinguir una pantalla rota de una base sin reservas todavia.
 */
export async function reservasParaEstadisticas(): Promise<ReservaEstadistica[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('inventory_reservations').select('start_at, status');

  if (error) {
    throw new Error(
      `reservasParaEstadisticas: fallo la consulta a inventory_reservations: ${error.message}`,
    );
  }

  return (data ?? []).map(filaAReservaEstadistica);
}
