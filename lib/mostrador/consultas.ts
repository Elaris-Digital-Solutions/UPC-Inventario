import { imagenPrincipal } from '@/lib/imagenes/principal';
import { createClient } from '@/lib/supabase/server';

import type { EstadoReserva } from '@/lib/reservas/consultas';

// La lectura del mostrador (F5): las reservas que el personal tiene que ver para
// entregar, recibir o marcar una falta. Sigue la FORMA de misReservas() en
// lib/reservas/consultas.ts -tipo de fila declarado, funcion de traduccion,
// manejo de errores-, con las diferencias que se explican en cada bloque.

// Re-exportado para que columnas.ts y quien pinte el mostrador tengan un solo
// sitio de donde importarlo. El enum de verdad vive en lib/reservas/consultas.ts.
export type { EstadoReserva };

// Solo los tres campos que identifican a la persona: es lo unico que el mostrador
// necesita mostrar.
export type AlumnoMostrador = {
  nombre: string | null;
  apellido: string | null;
  email: string;
};

export type ReservaMostrador = {
  id: string;
  inicio: string; // ISO, tal cual llega
  fin: string; // ISO, tal cual llega
  estado: EstadoReserva;
  unidadId: string; // FK cruda y no el embed: la necesita anotar() para escribir
  // en inventory_unit_notes sin depender de que el embed llegara poblado.
  producto: string;
  // Cual es "la" imagen lo decide imagenPrincipal(), no esta pantalla.
  imagenUrl: string | null;
  unidad: string;
  sede: string;
  // `| null` porque asi arma PostgREST el JSON cuando RLS bloquea un embed, no
  // porque hoy pueda pasar: ver filaAMostrador().
  alumno: AlumnoMostrador | null;
};

// La forma de la fila del embed, declarada para que TypeScript la CONTRASTE
// contra lo que el `select` infiere, en vez de imponerla con `.returns<>()`.
//
// `products` e `inventory_units` llegan como OBJETO porque la FK vive en la tabla
// que consulta; `product_images` llega como ARRAY porque la FK vive en ella.
//
// EL EMBED ANIDADO A DOS NIVELES no se dio por hecho: `product_availability` no
// embebe desde `products` (PGRST200), asi que se midio. La diferencia no es el
// anidamiento, es que aquella es una VISTA sin FK propia y `product_images` es
// una tabla con FK real. Ver COMPORTAMIENTO_MEDIDO.md §1.3.
type FilaMostrador = {
  id: string;
  start_at: string;
  end_at: string;
  status: EstadoReserva;
  unit_id: string;
  products: {
    name: string;
    product_images: { secure_url: string; is_main: boolean; sort_order: number }[];
  } | null;
  inventory_units: { unit_code: string; campuses: { name: string } | null } | null;
  alumnos: { nombre: string | null; apellido: string | null; email: string } | null;
};

// CRITERIO DISTINTO al de filaAReserva() para el embed que falta, y la diferencia
// es deliberada:
//
//   - Sin producto, sin unidad o sin sede la fila SE DESCARTA: el personal no
//     sabria que entregar ni donde esta, asi que la tarjeta no le sirve.
//   - Sin ALUMNO la fila SE QUEDA: el personal necesita ver que la reserva
//     existe aunque no pueda leer quien la hizo. Esconder un prestamo real es
//     peor que mostrarlo con el nombre vacio.
//   - Sin FOTO la fila SE QUEDA, mismo criterio: falta el dato, no la fila. No es
//     teorico, el seed deja 2 de sus 4 productos sin imagen.
//
// Y hoy `alumnos: null` es ESTRUCTURALMENTE IMPOSIBLE: el filtro de esta consulta
// -`status in ('reserved','active')`- es LA MISMA CONDICION que evalua
// `private.tiene_reserva_viva()` dentro de `alumnos_select_staff`. Si una reserva
// esta en esta lista, su alumno tiene reserva viva por definicion.
function filaAMostrador(fila: FilaMostrador): ReservaMostrador | null {
  if (
    fila.products === null ||
    fila.inventory_units === null ||
    fila.inventory_units.campuses === null
  ) {
    console.error(
      'reservasMostrador: fila descartada, el producto, la unidad o la sede llegaron null',
      fila.id,
    );
    return null;
  }

  return {
    id: fila.id,
    inicio: fila.start_at,
    fin: fila.end_at,
    estado: fila.status,
    unidadId: fila.unit_id,
    producto: fila.products.name,
    imagenUrl: imagenPrincipal(fila.products.product_images),
    unidad: fila.inventory_units.unit_code,
    sede: fila.inventory_units.campuses.name,
    alumno: fila.alumnos,
  };
}

// Las reservas vivas para el mostrador.
//
// `status in ('reserved','active')`: las tres columnas de F5 salen de esos dos
// estados, y columnas.ts decide cual le toca a cada fila. Los cuatro terminales
// se excluyen en la consulta en vez de traerlos y filtrar despues.
//
// SIN FILTRAR POR ROL en el cliente, a proposito: `reservations_select_staff` ya
// deja ver la tabla a quien cumple `private.is_staff()`, y `alumnos_select_staff`
// ya recorta que ve el operador del alumno embebido. Repetirlo aqui sugeriria que
// el aislamiento hace falta en esta capa.
//
// PROPAGA el error y NO degrada a vacio, al reves que misReservas(): alla un
// array vacio es el estado real de produccion y tiene su propia pantalla. Aqui un
// vacio por fallo de red se leeria como "no hay nada pendiente", que es falso y
// tiene consecuencia operativa: el personal daria por cerrado un turno con
// equipos afuera.
export async function reservasMostrador(): Promise<ReservaMostrador[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_reservations')
    .select(
      'id,start_at,end_at,status,unit_id,products(name,product_images(secure_url,is_main,sort_order)),inventory_units(unit_code,campuses(name)),alumnos(nombre,apellido,email)',
    )
    .in('status', ['reserved', 'active'])
    .order('start_at');

  if (error) {
    throw new Error(
      `reservasMostrador: fallo la consulta a inventory_reservations: ${error.message}`,
    );
  }

  return data
    .map(filaAMostrador)
    .filter((reserva): reserva is ReservaMostrador => reserva !== null);
}
