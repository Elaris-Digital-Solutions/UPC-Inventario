import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

// Tres consultas para pintar el calendario, y no una, y el motivo esta
// medido y no es gusto de diseno.
//
// `available_slots(p_product_id, p_campus_id, p_date, p_duration_minutes)`
// devuelve CERO FILAS por TRES causas distintas -medido el 2026-08-10 con
// cuatro sondas contra el STACK LOCAL, que es donde se puede montar el
// escenario porque produccion no tiene ni una reserva-: un dia de
// `disabled_days`, un dia fuera de la ventana movil (hoy +
// `booking_window_days`), o -la que nadie esperaria- HOY MISMO cuando ya no
// cabe ninguna franja de esa duracion. Esa tercera se midio a las 19:31 de
// Lima: pedir 30 minutos ese dia dio 4 filas (20:00, 20:30, 21:00, 21:30) y
// pedir 240 dio CERO, porque la unica franja de 4 horas que quedaba habria
// empezado a las 18:00 y esa hora ya paso. Ese mismo dia NO estaba en
// `disabled_days`.
//
// El local y produccion comparten los cinco valores de `app_settings` -7,
// 08:00, 22:00, 30, 30, comprobados en los dos-, asi que la forma de la
// rejilla es la misma en ambos. Lo que NO se puede medir en produccion es el
// efecto de una reserva, porque alli no hay ninguna.
//
// EL SEXTO VALOR, `min_cancel_minutes`, NO ENTRA EN ESA FRASE, y hay que
// decir por que en vez de estirar el "comprobados en los dos" a una columna
// mas: la migracion 26 que lo crea esta aplicada SOLO EN LOCAL mientras se
// escribe esto, asi que en produccion la columna todavia NO EXISTE. En
// cuanto la rama se mergee y se empuje, la fila pasa a tener seis valores
// iguales en los dos lados y esta salvedad sobra.
//
// Con solo la RPC, franjasDelDia() no puede distinguir esos tres casos: los
// tres le llegan identicos, un array vacio. Por eso hace falta
// diasInhabilitados() APARTE -la unica forma de saber si el motivo es "no
// hay atencion" y no "se acabo el dia para esta duracion"-. Quien junta las
// dos respuestas y decide el mensaje es el componente de calendario, no esta
// capa: aqui solo se traduce cada tabla/RPC a un tipo mas comodo.
//
// Y la tercera consulta, ajustesReserva(), no es un capricho de horario:
// `diasDeLaVentana()` (lib/reservas/rejilla.ts) necesita `booking_window_days`
// como parametro, no lo asume, y el calendario necesita el horario para
// poder decir "hoy ya no queda franja para esta duracion" en vez de una
// pantalla vacia sin explicacion.
//
// La afirmacion que sostiene todo el diseño de la pantalla:
// CERO FILAS NUNCA SIGNIFICA "LLENO".
//
// Medido dos veces, y la segunda cerro lo que la primera dejaba abierto:
//
//   - Un dia con la unica unidad ocupada por la manana devolvio sus
//     VEINTIOCHO filas -el dia entero con `slot_minutes` 30 y el horario
//     08:00-22:00-, nueve de ellas con `free = 0`. La RPC no omite las
//     franjas ocupadas: las devuelve con su conteo en cero.
//   - Un dia SIN NINGUNA unidad activa -la unica puesta en `maintenance`-
//     devolvio las 28 filas con las 28 en `free = 0`.
//
// El segundo escenario se monto justamente porque el primero solo permitia
// DEDUCIR como se ve un dia lleno del todo, y una deduccion escrita como si
// fuera una medicion es la clase de afirmacion que este proyecto persigue.
// Ahora los dos extremos estan medidos: parcialmente ocupado y lleno entero.
//
// "Lleno" se lee en los datos y jamas se infiere de una respuesta vacia.

export type AjustesReserva = {
  bookingWindowDays: number;
  openingTime: string;
  closingTime: string;
  slotMinutes: number;
  minDurationMinutes: number;
  minCancelMinutes: number;
};

// Fila unica de `app_settings` -PK booleana con `check (id)`, insertada en la
// migracion 20260806002459 y no en `seed.sql`, asi que existe igual en local
// y en produccion-. No hay "todavia no existe" que manejar, a diferencia de
// disponibilidadPorSede en lib/catalogo/consultas.ts.
//
// Si la consulta falla, esta funcion NO devuelve un valor por defecto,
// aunque sea tentador: cinco de los SEIS numeros de esta fila estan medidos
// arriba en este mismo archivo (7, 08:00, 22:00, 30, 30) -el sexto es el
// margen de M-12, que nace con `default 60` en la migracion 26- y copiarlos
// aca seria exactamente lo que D-19 prohibe para las duraciones -una
// constante que se separa del dato real sin que nada avise-. Si
// `app_settings` no responde,
// toda la pantalla depende de un horario que no se pudo leer, asi que el
// error se propaga y la pagina falla de forma visible en vez de ofrecer un
// calendario con un horario inventado.
export async function ajustesReserva(): Promise<AjustesReserva> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select(
      'booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes, min_cancel_minutes',
    )
    .eq('id', true)
    .single();

  if (error) {
    throw new Error(`ajustesReserva: fallo la consulta a app_settings: ${error.message}`);
  }

  return {
    bookingWindowDays: data.booking_window_days,
    openingTime: data.opening_time,
    closingTime: data.closing_time,
    slotMinutes: data.slot_minutes,
    minDurationMinutes: data.min_duration_minutes,
    minCancelMinutes: data.min_cancel_minutes,
  };
}

export type Franja = {
  slotStart: string;
  free: number;
};

// Llama a la RPC tal cual -`grant execute to authenticated`, asi que esta
// pantalla (bajo app/(alumno)/) puede pedirla-. No hay interpretacion de
// negocio aqui: solo se traducen los nombres de columna a camelCase. Que
// "cero filas" NO significa "lleno" -ver el comentario de arriba del
// archivo- es una lectura que necesita TAMBIEN diasInhabilitados() y
// ajustesReserva(), que esta funcion no tiene, asi que esa lectura vive en
// el componente que junta las tres, no aca.
//
// Un error de red o de RLS se traga igual que en el resto de
// lib/catalogo/consultas.ts -se registra con console.error y se devuelve
// vacio-, con la misma consecuencia: el componente ve un array vacio
// identico al de un dia inhabilitado o agotado. El `console.error` es lo que
// distingue los dos casos para quien lea los logs; la pantalla, a proposito,
// no necesita distinguirlos para el alumno.
export async function franjasDelDia(
  productId: string,
  campusId: string,
  fecha: string,
  duracionMinutos: number,
): Promise<Franja[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('available_slots', {
    p_product_id: productId,
    p_campus_id: campusId,
    p_date: fecha,
    p_duration_minutes: duracionMinutos,
  });

  if (error) {
    console.error('franjasDelDia: fallo la RPC available_slots', error.message);
    return [];
  }

  return data.map((fila) => ({
    slotStart: fila.slot_start,
    free: fila.free,
  }));
}

export type DiaInhabilitado = {
  date: string;
  reason: string | null;
};

// Entre `desde` y `hasta` (`YYYY-MM-DD`, los dos extremos incluidos) y no la
// tabla entera: al calendario solo le importan los dias que YA VA A OFRECER
// -los de `diasDeLaVentana()`-, y `disabled_days` puede tener filas fuera de
// ese rango que no pintan nada aqui.
//
// `reason` sale `| null` en el tipo y se deja asi a proposito: las DOS filas
// que hay hoy en produccion, medidas el 2026-08-10, tienen el motivo en
// NULL. Un mensaje que diera por hecho que siempre hay motivo se rompería
// con los unicos datos reales que existen.
export async function diasInhabilitados(desde: string, hasta: string): Promise<DiaInhabilitado[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('disabled_days')
    .select('date, reason')
    .gte('date', desde)
    .lte('date', hasta)
    .order('date');

  if (error) {
    console.error('diasInhabilitados: fallo la consulta a disabled_days', error.message);
    return [];
  }

  return data;
}

// Lo que el alumno de la sesion tiene en `banned_until`, SIN interpretar.
// Task 11 de la tanda 2B.
//
// `auth_user_id` y NUNCA `id`: son columnas DISTINTAS de la misma tabla
// `alumnos` -`id` es la clave primaria propia de la fila, `auth_user_id` es
// la del usuario en `auth.users`-, y confundirlas NO da error. Un
// `.eq('id', sub)` con el UUID de sesion, que no coincide con ningun `id` de
// `alumnos`, devuelve CERO FILAS en silencio: `maybeSingle()` no distingue
// "este alumno no existe" de "consultaste por la columna equivocada". Ya
// costo un falso positivo en esta tanda que parecia un agujero de seguridad
// y no lo era: era esta misma confusion.
//
// ESTO NO ES UN CONTROL DE AUTORIZACION, y el nombre de esta funcion invita a
// pensar lo contrario. `create_reservation` ya rechaza con sancion vigente en
// su paso 2, adentro del motor. Esta funcion solo ANTICIPA ese rechazo para
// no pintar un calendario y un boton de reservar que van a fallar seguro. Si
// alguien borrara esta funcion entera, NO se abriria ningun agujero: la
// reserva seguiria rechazandose exactamente igual, solo que sin avisar
// antes. Esa es la prueba de que el control esta en el sitio correcto.
//
// Devuelve el valor CRUDO -tal cual sale de la columna- y no lo interpreta:
// decidir que es "infinity", que es una fecha pasada o que es una fecha
// futura es trabajo de sancionVigente() (lib/reservas/sancion.ts), que es
// pura y esta probada aparte. Esta capa solo traduce la fila.
//
// Si la consulta FALLA, esta funcion NO sigue el patron de `console.error` +
// vacio que usan franjasDelDia() y diasInhabilitados() mas arriba en este
// mismo archivo, y es a proposito: alla un resultado vacio es una pantalla
// sin datos que pintar, una degradacion razonable. ACA un vacio -`null`-
// significa "sin sancion" para quien llama, y devolverlo por un error
// dejaria pasar a alguien cuya sancion no se pudo leer, no por no tenerla
// sino porque la consulta fallo. Por eso se PROPAGA el error -igual que
// ajustesReserva(), mas arriba en este archivo- y la pagina falla de forma
// visible en vez de ofrecer, por un fallo de red o de RLS, una reserva que
// no deberia ofrecerse.
export async function sancionDelAlumno(): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  // Sin sesion no hay alumno de quien leer la sancion. En la practica esta
  // rama es INALCANZABLE bajo app/(alumno)/: el layout del grupo
  // (app/(alumno)/layout.tsx) ya redirigio a /login a quien no tiene sesion
  // antes de que esta funcion llegue a llamarse. Se comprueba igual porque
  // el tipo de `sub` es `string | undefined` y no hay forma de afirmarle al
  // compilador lo contrario sin un `as` que estaria mintiendo.
  if (!sub) {
    return null;
  }

  const { data: alumno, error } = await supabase
    .from('alumnos')
    .select('banned_until')
    .eq('auth_user_id', sub)
    .maybeSingle();

  if (error) {
    throw new Error(`sancionDelAlumno: fallo la consulta a alumnos: ${error.message}`);
  }

  return alumno?.banned_until ?? null;
}

// El enum de verdad, leido del esquema generado, y NO una union escrita a
// mano. lib/reservas/agrupar.ts necesita los SEIS valores para un switch
// exhaustivo, y escribirlos ahi Y aca serian dos listas que se separan del
// esquema real sin que nada avise: si una migracion futura le agrega un
// septimo valor al enum, este alias lo hereda con solo regenerar
// lib/database.types.ts, mientras que una union tecleada a mano se quedaria
// en seis sin que el typecheck se quejara.
export type EstadoReserva = Database['public']['Enums']['reservation_status'];

export type ReservaDelAlumno = {
  id: string;
  inicio: string; // ISO, tal cual llega
  fin: string; // ISO, tal cual llega
  estado: EstadoReserva;
  motivo: string | null;
  // El motivo de la CANCELACION, que no es el mismo dato que `motivo` -ese es
  // el proposito de uso que el alumno eligio al reservar-. Se trae porque una
  // reserva cancelada sin decir por que deja al alumno sin la unica
  // informacion que le importa de ella, y el caso no es hipotetico por dos
  // lados: la cancelacion del alumno exige un motivo obligatorio (BR-17, y es
  // la Task 13), y el personal tambien puede cancelar reservas -BR-11, cuando
  // se inhabilita un dia que ya tenia reservas hechas-. En ese segundo caso
  // es la unica explicacion que el alumno va a recibir.
  motivoCancelacion: string | null;
  producto: string;
  sede: string;
  unidad: string;
};

// La forma medida de la fila que devuelve el embed -misma tecnica que
// FilaProducto en lib/catalogo/consultas.ts: se declara la forma esperada y
// se usa como tipo del parametro de filaAReserva() mas abajo, para que
// TypeScript la CONTRASTE contra lo que el `select` de misReservas() infiere
// en vez de imponerla con `.returns<>()`, que seria un `as` con otro
// nombre. Si el select cambia y este tipo no, el typecheck falla en vez de
// mentir en silencio -D-26-.
//
// `products` e `inventory_units`, y adentro `campuses`, llegan como OBJETO y
// no como array. Esto SI esta medido -el 2026-08-11, contra el stack local,
// con un JWT firmado de la alumna Ana-: la consulta exacta de abajo devolvio
// `"products":{"name":"Laptop Dell XPS 15"}` y
// `"inventory_units":{"campuses":{"name":"Monterrico"},"unit_code":"LAP-001"}`.
// Tiene sentido con el esquema: la FK vive en `inventory_reservations` y en
// `inventory_units` -no en la tabla embebida-, asi que cada fila trae COMO
// MUCHO una relacionada. Es lo contrario de `product_images` en
// lib/catalogo/consultas.ts, donde la FK vive en la tabla embebida y por eso
// llega como array.
//
// Los tres campos embebidos se tipan `| null` aunque las TRES filas medidas
// -las unicas que existen en el escenario- trajeran los tres completos: esto
// es DEDUCCION, no medicion. Si el producto, la unidad o la sede de una
// reserva se borraran, PostgREST devolveria `null` en ese embed en vez de
// omitir la fila entera -es como se comporta un LEFT JOIN-, y nadie ha
// borrado un producto con una reserva encima para comprobarlo.
type FilaReserva = {
  id: string;
  start_at: string;
  end_at: string;
  status: EstadoReserva;
  purpose: string | null;
  cancellation_reason: string | null;
  products: { name: string } | null;
  inventory_units: { unit_code: string; campuses: { name: string } | null } | null;
};

// Traduce una fila cruda al tipo que pinta la pantalla, o la DESCARTA -null-
// si falta alguno de los tres embeds. Ver el comentario de FilaReserva
// arriba: esa caida es una deduccion sobre un caso que nunca ocurrio en el
// escenario medido, no un hecho comprobado. Se descarta en vez de pintarse
// con un nombre vacio porque una tarjeta sin nombre de equipo o sin sede no
// le dice nada util al alumno: es preferible que falte la fila a que se vea
// rota. El console.error deja rastro de que paso, igual que el resto de
// funciones de este archivo que se tragan un fallo.
function filaAReserva(fila: FilaReserva): ReservaDelAlumno | null {
  if (
    fila.products === null ||
    fila.inventory_units === null ||
    fila.inventory_units.campuses === null
  ) {
    console.error(
      'misReservas: fila descartada, el producto, la unidad o la sede llegaron null',
      fila.id,
    );
    return null;
  }

  return {
    id: fila.id,
    inicio: fila.start_at,
    fin: fila.end_at,
    estado: fila.status,
    motivo: fila.purpose,
    motivoCancelacion: fila.cancellation_reason,
    producto: fila.products.name,
    sede: fila.inventory_units.campuses.name,
    unidad: fila.inventory_units.unit_code,
  };
}

// Las reservas del alumno de la sesion, para /mi-panel. Task 12 de la tanda 2B.
//
// NO SE FILTRA POR `alumno_id` en el cliente, y es a proposito -no un
// descuido-. Medido el 2026-08-11 contra el stack local con un JWT firmado
// de la alumna Ana: la tabla tenia TRES reservas -dos de Ana y una de
// Bruno-, y esta misma consulta, sin ningun `.eq()` de por medio, devolvio
// EXACTAMENTE las dos de Ana; la de Bruno no aparecio. La politica
// `reservations_select_own` ya hace ese filtro DENTRO de RLS, evaluada como
// el alumno que consulta y no como este codigo, asi que anadir aca un
// `.eq('alumno_id', ...)` redundante no reforzaria nada: solo sugeriria que
// el aislamiento hace falta en el cliente, cuando la prueba es que ya esta
// resuelto un nivel mas abajo.
//
// El embed es el exacto medido arriba en el comentario de FilaReserva, y el
// orden es por `start_at` para que agrupar.ts reciba las reservas ya en
// orden cronologico dentro de cada grupo.
export async function misReservas(): Promise<ReservaDelAlumno[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_reservations')
    .select(
      'id,start_at,end_at,status,purpose,cancellation_reason,products(name),inventory_units(unit_code,campuses(name))',
    )
    .order('start_at');

  // Igual que franjasDelDia() y diasInhabilitados() mas arriba en este
  // archivo, y A DIFERENCIA de sancionDelAlumno(): aca un array vacio es una
  // pantalla sin reservas, que es exactamente el estado real de produccion
  // hoy -cero reservas creadas fuera de un escenario de prueba- y ya tiene
  // su propio diseno en app/(alumno)/mi-panel/page.tsx. No es un permiso que
  // se le escape a nadie por leerse vacio: a diferencia de la sancion, donde
  // un `null` por fallo de red se leeria como "no tiene sancion" y dejaria
  // pasar a alguien que si la tiene, aca un vacio por fallo de red y un
  // vacio por no tener reservas se ven identicos EN LA PANTALLA CORRECTA
  // para los dos casos: ninguno le da al alumno algo que no deberia tener.
  if (error) {
    console.error('misReservas: fallo la consulta a inventory_reservations', error.message);
    return [];
  }

  return data.map(filaAReserva).filter((reserva): reserva is ReservaDelAlumno => reserva !== null);
}

// La forma medida de `final_satisfaction_surveys` -leida en
// lib/database.types.ts-: NUEVE columnas de contenido, todas nulables salvo
// `alumno_id`, que ni siquiera se pide aca porque `surveys_select_own` ya lo
// resuelve. Camel case, igual que el resto de tipos de este archivo.
export type EncuestaDelAlumno = {
  platformRating: number | null;
  serviceRating: number | null;
  reservationProcessRating: number | null;
  supportClarityRating: number | null;
  equipmentConditionRating: number | null;
  wouldRecommend: boolean | null;
  bestFeature: string | null;
  improvementArea: string | null;
  comments: string | null;
};

// La encuesta del alumno de la sesion, o `null` si todavia no la contesto.
// Task 14 de la tanda 2B.
//
// SIN `.eq('alumno_id', ...)` en el `select`, igual que misReservas() mas
// arriba en este archivo y por el mismo motivo: la politica
// `surveys_select_own` ya filtra por `alumno_id = private.current_alumno_id()`
// DENTRO de RLS, evaluada como el alumno que consulta. Anadir aca un `.eq()`
// redundante no reforzaria nada, solo sugeriria que el aislamiento hace falta
// en el cliente cuando ya esta resuelto un nivel mas abajo.
//
// `.maybeSingle()` y no `.single()`: CERO FILAS es el estado NORMAL de quien
// todavia no respondio, no un error, y hoy ese es el estado de TODO alumno.
// `.single()` lanzaria una excepcion para ese caso exacto.
//
// Las dos mediciones que sostienen esa frase son de DIAS DISTINTOS, y conviene
// no juntarlas bajo una sola fecha: el **stack local** se midio el 2026-08-11
// -cero encuestas-, y **produccion** el 2026-08-10, anotada en la tabla "La
// forma real de los datos" de MIGRATION_DOCS/PLANES/FASE_2_TANDA_2B.md, que
// tambien es donde se midio el `UNIQUE (alumno_id)` (correccion 4). Una
// version anterior de este comentario decia que las dos se habian medido el
// 2026-08-11; el dato es cierto en las dos, la fecha no.
//
// Si la consulta FALLA, esta funcion PROPAGA el error -igual que
// ajustesReserva() y sancionDelAlumno() mas arriba en este archivo, y AL
// CONTRARIO que misReservas()-. El motivo es el mismo que el de
// sancionDelAlumno(): un `null` devuelto por un fallo de red se leeria
// exactamente igual que "no ha contestado", y la pantalla ofreceria un
// formulario VACIO a alguien que en realidad ya tiene una fila. Enviarlo
// chocaria con el `UNIQUE (alumno_id)` -sonda 2 del set medido el 2026-08-11
// contra el stack local, `duplicate key value violates unique constraint
// "final_satisfaction_surveys_alumno_id_key"`- y el alumno veria un rechazo
// que no tiene como entender, por un problema que no fue suyo.
export async function miEncuesta(): Promise<EncuestaDelAlumno | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('final_satisfaction_surveys')
    .select(
      'platform_rating,service_rating,reservation_process_rating,support_clarity_rating,equipment_condition_rating,would_recommend,best_feature,improvement_area,comments',
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `miEncuesta: fallo la consulta a final_satisfaction_surveys: ${error.message}`,
    );
  }

  if (data === null) {
    return null;
  }

  return {
    platformRating: data.platform_rating,
    serviceRating: data.service_rating,
    reservationProcessRating: data.reservation_process_rating,
    supportClarityRating: data.support_clarity_rating,
    equipmentConditionRating: data.equipment_condition_rating,
    wouldRecommend: data.would_recommend,
    bestFeature: data.best_feature,
    improvementArea: data.improvement_area,
    comments: data.comments,
  };
}
