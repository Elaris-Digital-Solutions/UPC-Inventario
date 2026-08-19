import { imagenPrincipal } from '@/lib/imagenes/principal';
import { createClient } from '@/lib/supabase/server';

import type { EstadoReserva } from '@/lib/reservas/consultas';

// Re-exportado para que lib/mostrador/columnas.ts (y quien pinte el
// mostrador) tengan un solo sitio de donde importar el enum, sin que cada
// archivo decida por su cuenta si lo trae de lib/reservas/consultas.ts o de
// aca. El enum de verdad -leido del esquema generado, y no una union escrita
// a mano- ya vive en lib/reservas/consultas.ts; no se duplica.
export type { EstadoReserva };

// La lectura del mostrador (F5 de ESPECIFICACION_FUNCIONAL.md): las reservas
// que el personal tiene que ver para entregar, recibir o marcar una falta.
// Una sola consulta a `inventory_reservations`, siguiendo `misReservas()` de
// lib/reservas/consultas.ts como referencia de FORMA -mismo patron de tipo
// medido, funcion de traduccion y manejo de errores-, pero con diferencias
// deliberadas que se explican en cada bloque de abajo.

// El alumno embebido en una reserva del mostrador. Solo los tres campos que
// identifican a la persona -no `id`, `banned_until` ni el resto de columnas
// de `alumnos`-, porque es lo unico que el mostrador necesita mostrar; si
// una pantalla futura necesita mas, se amplia el `select` de abajo y este
// tipo junto con el.
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
  unidadId: string; // FK cruda a inventory_units, no el embed: la necesita
  // anotar() (Task 7) para escribir en inventory_unit_notes sin depender de
  // que el embed de abajo haya llegado poblado.
  producto: string;
  // La imagen del producto, o `null` si no tiene ninguna (F3-T3). La regla de
  // cual es "la" imagen la decide imagenPrincipal(), no esta pantalla.
  imagenUrl: string | null;
  unidad: string;
  sede: string;
  // `| null` A PROPOSITO, y NO por el mismo motivo que products/inventory_units
  // de abajo. Ver el comentario de FilaMostrador y de filaAMostrador() mas
  // abajo para la razon completa: con el filtro de esta consulta, hoy NUNCA
  // llega `null` en la practica, pero el tipo lo admite porque asi es como
  // PostgREST arma el JSON cuando RLS bloquea un embed, y porque una reserva
  // sin alumno legible NO se descarta aca -a diferencia de producto/unidad/sede-.
  alumno: AlumnoMostrador | null;
};

// La forma medida de la fila que devuelve el embed -misma tecnica que
// FilaReserva en lib/reservas/consultas.ts: se declara la forma esperada y se
// usa como tipo del parametro de filaAMostrador() mas abajo, para que
// TypeScript la CONTRASTE contra lo que el `select` de reservasMostrador()
// infiere, en vez de imponerla con `.returns<>()` -que seria un `as` con otro
// nombre-. Si el select cambia y este tipo no, el typecheck falla en vez de
// mentir en silencio.
//
// `products` e `inventory_units`, y adentro `campuses`, llegan como OBJETO y
// no como array -mismo hecho que ya midio lib/reservas/consultas.ts el
// 2026-08-11 (ver el comentario de FilaReserva alla): la FK vive en
// `inventory_reservations` y en `inventory_units`, no en la tabla embebida,
// asi que cada fila trae como mucho una relacionada.
//
// `alumnos` -asi, en plural, porque PostgREST usa el nombre de la TABLA como
// llave del embed cuando no se le pide un alias- SI esta medido: no esta
// consulta completa palabra por palabra, sino el comportamiento del embed de
// `alumnos` sobre `inventory_reservations` bajo el mismo filtro
// (`status in ('reserved', 'active')`), contra el stack local, el
// 2026-08-12, con un JWT de operador firmado a mano (ver "Task 4 - Step 0"
// en MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md): una reserva de un alumno sin
// reserva viva -bloqueado por la politica `alumnos_select_staff`- llego como
// `{"id":"...","status":"not_picked_up","alumnos":null}`. La fila entera NO
// se descarta; solo el embed se vacia, igual que un LEFT JOIN.
//
// Y que las columnas pedidas no cambien eso TAMBIEN esta medido, el mismo
// dia y contra la misma fila bloqueada -antes era una inferencia razonada
// sobre como funciona RLS, y se midio en vez de dejarla escrita como si
// fuera un hecho-. Se pidieron TRES sets distintos sobre la misma reserva:
// `alumnos(email)`, `alumnos(nombre,apellido,email)` -el de esta consulta- y
// `alumnos(id,nombre,apellido,email,banned_until,activo,created_at)`. Los
// tres devolvieron `"alumnos":null`, el tercero incluido, que pide ademas
// `banned_until` -una columna sin GRANT para NADIE-: cuando RLS bloquea la
// fila relacionada, el embed entero se vacia sin llegar a mirar columnas.
type FilaMostrador = {
  id: string;
  start_at: string;
  end_at: string;
  status: EstadoReserva;
  unit_id: string;
  // `product_images` cuelga de `products`, o sea un embed ANIDADO A DOS
  // NIVELES desde `inventory_reservations`. Este proyecto NO lo daba por
  // hecho: la T2A ya se topo con que PostgREST no embebe `product_availability`
  // desde `products` (PGRST200), asi que se midio antes de escribir esto.
  //
  // MEDIDO EL 2026-08-19 contra el stack local, y con control negativo, que es
  // lo que hace valida la medicion -- en local hay CERO reservas, asi que un
  // HTTP 200 con `[]` no probaria nada por si solo:
  //
  //   GET /rest/v1/inventory_reservations?select=id,status,
  //       products(name,product_images(secure_url,is_main,sort_order)),
  //       inventory_units(unit_code,campuses(name))
  //   -> HTTP 200
  //
  //   GET .../inventory_reservations?select=id,products(name,product_availability(in_stock))
  //   -> HTTP 400, PGRST200 "Could not find a relationship"
  //
  // El segundo, sobre LA MISMA TABLA VACIA, falla. Eso prueba que PostgREST
  // valida las relaciones ANTES de ejecutar, y por tanto que el 200 de arriba
  // si dice algo. La diferencia entre los dos casos no es el anidamiento: es
  // que `product_availability` es una VISTA sin FK propia y `product_images`
  // es una tabla con FK real.
  products: {
    name: string;
    product_images: { secure_url: string; is_main: boolean; sort_order: number }[];
  } | null;
  inventory_units: { unit_code: string; campuses: { name: string } | null } | null;
  alumnos: { nombre: string | null; apellido: string | null; email: string } | null;
};

// Traduce una fila cruda al tipo que pinta el mostrador.
//
// CRITERIO DISTINTO al de filaAReserva() (lib/reservas/consultas.ts) para el
// embed que falta, y la diferencia es deliberada, no un olvido:
//
//   - `products`, `inventory_units` o `inventory_units.campuses` en `null`
//     SIGUE descartando la fila entera, exactamente como filaAReserva():
//     una tarjeta del mostrador sin nombre de equipo, sin codigo de unidad o
//     sin sede no le sirve al personal para hacer nada -no sabe que
//     entregar ni donde esta-, asi que es preferible que falte la fila a
//     que se vea rota.
//   - `alumnos` en `null` NO descarta la fila. Aca el criterio se invierte
//     a proposito: el personal necesita ver que la reserva EXISTE -alguien
//     tiene un equipo pendiente de entregar o devolver- aunque no pueda leer
//     quien la hizo. Descartarla esconderia del mostrador un prestamo real,
//     que es peor que mostrarlo con el nombre del alumno vacio.
//
// Y ese `alumnos: null` es, ademas, un caso que la consulta de abajo hace
// ESTRUCTURALMENTE IMPOSIBLE hoy -no solo infrecuente-: reservasMostrador()
// filtra `status in ('reserved', 'active')`, y esas son EXACTAMENTE las dos
// que cuenta `private.tiene_reserva_viva()`
// (supabase/migrations/20260805194848_alumno_policies.sql:58,
// `r.status in ('reserved', 'active')`), que es la condicion que
// `alumnos_select_staff` evalua para decidir si el operador puede leer al
// alumno. El filtro de esta consulta y la condicion de la politica son LA
// MISMA CONDICION: si una reserva esta en la lista que trae esta funcion,
// su alumno TIENE una reserva viva por definicion, asi que la politica nunca
// lo bloquea. Confirmado el 2026-08-12 moviendo una reserva a `active` y
// viendo el embed poblarse solo, sin tocar ninguna politica. Por eso el tipo
// de `ReservaMostrador.alumno` admite `null` -PostgREST puede devolverlo asi
// y un cambio futuro del filtro lo haria aparecer de verdad- pero NO es un
// caso que esta pantalla vaya a ver a menudo con el filtro de hoy: no ocurre
// nunca.
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
    // UNA FOTO QUE FALTA NO DESCARTA LA FILA, y el criterio es distinto a
    // proposito del que aplica el `if` de arriba a `products`,
    // `inventory_units` y `campuses`.
    //
    // Alli la fila entera se descarta porque sin nombre de equipo, sin codigo
    // de unidad o sin sede el personal NO SABE QUE ENTREGAR NI DONDE ESTA: la
    // tarjeta no le sirve para nada. Una reserva sin foto SI le sirve --
    // tiene el nombre, el codigo y la sede, que es todo lo que necesita para
    // trabajar --. Descartarla escondaria del mostrador un prestamo real, que
    // es el mismo modo de fallo que ya evita el criterio de `alumnos`: falta
    // el dato, no la fila.
    //
    // Y no es un caso teorico: `product_images` llega `[]` para cualquier
    // producto sin imagen, y el `seed.sql` deja 2 de sus 4 productos asi.
    imagenUrl: imagenPrincipal(fila.products.product_images),
    unidad: fila.inventory_units.unit_code,
    sede: fila.inventory_units.campuses.name,
    alumno: fila.alumnos,
  };
}

// Las reservas vivas para el mostrador, Task 4 de la tanda 3A.
//
// `status in ('reserved', 'active')`: son las dos columnas que F5 pinta -
// "Por entregar", "Activas" y "Por devolver" salen todas de reservas en uno
// de esos dos estados; lib/mostrador/columnas.ts decide cual de las tres le
// toca a cada fila. Los cuatro estados terminales -`cancelled`, `completed`,
// `not_picked_up`, `not_returned`- no tienen columna en el mostrador y se
// excluyen aca, en la consulta, en vez de traerlos todos y filtrar despues.
//
// SIN FILTRAR POR ROL en el cliente, a proposito -no un descuido, mismo
// criterio que ya aplica misReservas() en lib/reservas/consultas.ts-:
// `reservations_select_staff` ya deja ver TODA la tabla a quien cumple
// `private.is_staff()` -admin y operador por igual, sin distinguir entre
// ellos- (supabase/migrations/20260805195852_reservation_policies.sql:27-29),
// y `alumnos_select_staff` ya recorta que ve el operador del alumno
// embebido, evaluada como el usuario que consulta.
// Repetir ese filtro aca con un `if (rol === ...)` sugeriria que el
// aislamiento hace falta en esta capa, cuando la prueba -Task 4, Step 0- es
// que ya esta resuelto un nivel mas abajo, en RLS.
//
// Errores: esta funcion PROPAGA el error -como ajustesReserva() y
// sancionDelAlumno() en lib/reservas/consultas.ts- y NO degrada a un array
// vacio -como franjasDelDia() y diasInhabilitados(), en el mismo archivo-.
// La eleccion no es la misma que en misReservas(), que si degrada a vacio:
// alla un array vacio es el estado REAL de produccion hoy -cero reservas- y
// ya tiene su propia pantalla para ese caso. Aca, un array vacio por un
// fallo de red o de RLS se leeria exactamente igual que "no hay nada
// pendiente de entregar o devolver", que es una afirmacion FALSA con una
// consecuencia operativa real: el personal daria por cerrado un turno que en
// realidad tiene equipos afuera. Es el mismo razonamiento que ya aplica
// ajustesReserva() -no una cita textual de su comentario, sino el mismo
// argumento adaptado-: alla la pantalla entera depende de un horario que no
// se pudo leer y el error se propaga para no ofrecer un calendario con un
// horario inventado; aca depende de un listado que no se pudo leer, y por
// el mismo motivo se propaga en vez de ofrecer un mostrador vacio inventado.
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
