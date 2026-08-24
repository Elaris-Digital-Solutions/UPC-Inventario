import { createClient } from '@/lib/supabase/server';

import type { EstadoUnidad } from '@/lib/admin/consultas';
import type { EstadoReserva } from '@/lib/reservas/consultas';

// La lectura de /admin/reservas (F6): la tabla COMPLETA con su join a producto,
// unidad y alumno. Sigue la FORMA del resto de esta capa -tipo de fila
// declarado, funcion de traduccion, error crudo hacia arriba-, con una
// diferencia de criterio que se explica en filaAReservaAdmin().

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
  // `| null` porque asi arma PostgREST el JSON cuando RLS bloquea el embed. En
  // ESTA pantalla no puede pasar -el layout exige rol admin, y
  // `alumnos_select_staff` le deja ver a todos-: es al OPERADOR a quien recorta.
  // El tipo lo admite porque el caso es de la API, no de la pantalla.
  alumno: AlumnoReserva | null;
  producto: string;
  categoria: string | null;
  unidad: string;
  activoFijo: string | null;
  // La FK cruda y no el embed: la necesita el paso a `not_returned` para
  // escribir la nota obligatoria sin depender de que el embed llegara poblado.
  unidadId: string;
  // Los de la fila expandible que pide F6.
  estadoUnidad: EstadoUnidad;
  sede: string;
  duracionMinutos: number;
  motivo: string | null; // `purpose`: para que se pidio el equipo
  motivoCancelacion: string | null;
};

// `products` e `inventory_units` -y `campuses` dentro del segundo- llegan como
// OBJETO: la FK vive en la tabla que consulta. Al reves que `inventory_units`
// DENTRO de `products` en lib/admin/consultas.ts.
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

// NO DESCARTA NINGUNA FILA, y esa es la diferencia deliberada con
// filaAMostrador(). Los dos criterios son correctos para su pantalla:
//
//   - En el mostrador la fila es una TARJETA CON BOTONES: sin saber que equipo
//     es ni donde esta, el operador no puede hacer nada con ella.
//   - Aca es un REGISTRO HISTORICO: aunque faltara el nombre del producto, la
//     fila sigue diciendo quien reservo y como acabo, y las dos acciones del
//     admin viajan por `id`. Descartarla le quitaria la unica pantalla donde esa
//     reserva existe.
//
// NINGUNO DE LOS TRES PUEDE LLEGAR `null` HOY: las tres politicas de SELECT son
// `using (true)` para `authenticated` y las tres FK son NOT NULL. Se cae a un
// texto en vez de tipar `string | null` porque propagar a toda la pantalla un
// `null` que no puede existir obliga a cada consumidor a decidir que pintar para
// un caso que nadie va a ver.
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
    // `'active'` y no `'—'`: `EstadoUnidad` es un enum de tres valores y la
    // insignia se pinta desde el. Inalcanzable, por lo dicho arriba.
    estadoUnidad: fila.inventory_units?.status ?? 'active',
    sede: fila.inventory_units?.campuses?.name ?? '—',
    // Se CALCULA: la tabla guarda `start_at` y `end_at`, y F6 pide los minutos.
    // El `Math.round` es por si algun instante trae fracciones de segundo.
    duracionMinutos: Math.round((Date.parse(fila.end_at) - Date.parse(fila.start_at)) / 60_000),
    motivo: fila.purpose,
    motivoCancelacion: fila.cancellation_reason,
  };
}

// Todas las reservas, para /admin/reservas.
//
// SIN FILTRO DE NINGUN TIPO, al reves que reservasMostrador(): F6 pide la tabla
// COMPLETA con filtro de estado en la pantalla, asi que filtrar aca dejaria al
// desplegable sin nada que ofrecer. El filtrado lo hace lib/admin/filtros.ts
// sobre el array ya traido: logica pura y probada, en vez de un viaje por tecla.
//
// SIN FILTRAR POR ROL en el cliente: `reservations_select_staff` ya deja ver la
// tabla a quien cumple `private.is_staff()`. Repetirlo sugeriria que el
// aislamiento hace falta en esta capa.
//
// TRAE LA TABLA ENTERA y el limite se dice por delante: produccion tiene cero
// reservas y la escala esperada es de decenas. Con decenas de miles esto pasa a
// filtros de PostgREST con paginacion, o a una vista.
//
// CON `order` explicito aunque filtrarYOrdenar() lo reaplique: sin el, el primer
// pintado dependeria del orden en que el motor devuelva las filas.
//
// El error se PROPAGA: un array vacio por fallo de red se leeria igual que "no
// hay ninguna reserva", que hoy es ademas el estado real de produccion.
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
// /admin/estadisticas (F9, ampliada por D-51)
// ─────────────────────────────────────────────────────────────────────────────

// Encaja ESTRUCTURALMENTE con ReservaContable sin importarlo: quien produce el
// dato declara su tipo y quien lo consume el suyo, y coinciden porque TypeScript
// compara estructura y no nombre.
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
 * Las reservas para /admin/estadisticas: SOLO `start_at` y `status`.
 *
 * CONSULTA PROPIA Y NO listarReservas() REUTILIZADA: aquella trae dieciseis
 * columnas y tres embeds que esta pantalla ni pinta ni necesita. Pedir menos es
 * mas barato que traerlas y descartarlas en memoria.
 *
 * SIN `order`, al reves que las dos anteriores: aquellas PINTAN una lista, y los
 * agregados de esta -contar por estado, repartir por dia- no dependen del orden
 * de llegada.
 *
 * TRAE LA TABLA ENTERA y PROPAGA el error, mismo criterio y mismo motivo que
 * listarReservas().
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
