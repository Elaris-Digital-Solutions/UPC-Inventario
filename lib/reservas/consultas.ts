import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

// LA AFIRMACION QUE SOSTIENE EL DISEÑO DE LA PANTALLA:
// CERO FILAS DE `available_slots` NUNCA SIGNIFICA "LLENO".
//
// Un dia lleno devuelve TODAS sus franjas con `free = 0`; la RPC no omite las
// ocupadas. Cero filas significa otra cosa, y son TRES causas indistinguibles
// desde la RPC: dia en `disabled_days`, dia fuera de la ventana movil, o HOY
// cuando ya no cabe ninguna franja de esa duracion. Por eso hacen falta tres
// consultas y no una: diasInhabilitados() es la unica forma de saber si el
// motivo es "no hay atencion". Quien junta las respuestas y decide el mensaje es
// el componente de calendario, no esta capa.
//
// "Lleno" se lee en los datos y jamas se infiere de una respuesta vacia.
//
// CUANDO SE PROPAGA EL ERROR Y CUANDO SE DEVUELVE VACIO. La regla no es de
// estilo, es de que significa el vacio para quien llama:
//   - SE PROPAGA cuando un vacio se leeria como un permiso -sin sancion, sin
//     encuesta, sin ajustes-: ajustesReserva(), sancionDelAlumno(), miEncuesta().
//     Un fallo de red no puede dejar pasar a quien tiene una sancion.
//   - SE REGISTRA Y SE DEVUELVE VACIO cuando el vacio es una pantalla sin datos,
//     que ya tiene su propio diseño: franjasDelDia(), diasInhabilitados(),
//     misReservas(). El console.error es lo que distingue los dos casos para
//     quien lea los logs.
//
// OJO (D-91): esta capa YA NO LEE EL HORARIO. Dejo de ser global y vive en
// `campus_hours` por sede y por dia, recortado por `staff_shifts` (D-74); quien
// lo aplica es `available_slots` dentro de la base.

export type AjustesReserva = {
  bookingWindowDays: number;
  slotMinutes: number;
  minDurationMinutes: number;
  minCancelMinutes: number;
};

// Fila unica de `app_settings`, creada por migracion y no por `seed.sql`, asi
// que existe igual en local y en produccion: no hay "todavia no existe" que
// manejar.
//
// NO devuelve valores por defecto si falla, aunque sea tentador: copiarlos aqui
// seria lo que D-19 prohibe, una constante que se separa del dato real sin que
// nada avise. Sin `app_settings` el calendario no sabe ni cuantos dias ofrecer.
export async function ajustesReserva(): Promise<AjustesReserva> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select(
      'booking_window_days, slot_minutes, min_duration_minutes, min_cancel_minutes',
    )
    .eq('id', true)
    .single();

  if (error) {
    throw new Error(`ajustesReserva: fallo la consulta a app_settings: ${error.message}`);
  }

  return {
    bookingWindowDays: data.booking_window_days,
    slotMinutes: data.slot_minutes,
    minDurationMinutes: data.min_duration_minutes,
    minCancelMinutes: data.min_cancel_minutes,
  };
}

export type Franja = {
  slotStart: string;
  free: number;
};

// La RPC tal cual: aqui no hay interpretacion de negocio, solo camelCase.
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

// Acotada al rango que el calendario va a ofrecer, no la tabla entera.
//
// `reason` va `| null` a proposito: las filas reales de produccion lo tienen en
// NULL, asi que un mensaje que diera por hecho que siempre hay motivo se
// romperia con los unicos datos que existen.
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

// El `banned_until` del alumno de la sesion, SIN interpretar: decidir si es
// "infinity", pasado o futuro es trabajo de sancionVigente(), que es pura y esta
// probada aparte.
//
// `auth_user_id` y NUNCA `id`: son columnas DISTINTAS de `alumnos` y confundirlas
// NO da error, devuelve cero filas en silencio. Ya costo un falso positivo que
// parecia un agujero de seguridad y no lo era.
//
// ESTO NO ES UN CONTROL DE AUTORIZACION, aunque el nombre lo sugiera:
// `create_reservation` ya rechaza con sancion vigente dentro del motor. Esto solo
// ANTICIPA el rechazo para no pintar un boton que va a fallar seguro. Borrar esta
// funcion no abriria ningun agujero, y esa es la prueba de que el control esta en
// el sitio correcto.
export async function sancionDelAlumno(): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  // Inalcanzable bajo app/(alumno)/: el layout del grupo ya redirigio. Se
  // comprueba igual porque `sub` es `string | undefined`.
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

// El enum leido del esquema generado y NO una union escrita a mano: agrupar.ts
// necesita los seis valores para un switch exhaustivo, y una lista tecleada se
// quedaria corta ante una migracion futura sin que el typecheck se quejara.
export type EstadoReserva = Database['public']['Enums']['reservation_status'];

export type ReservaDelAlumno = {
  id: string;
  inicio: string; // ISO, tal cual llega
  fin: string; // ISO, tal cual llega
  estado: EstadoReserva;
  motivo: string | null;
  // No es el mismo dato que `motivo` -ese es el proposito de uso-. Se trae
  // porque el personal tambien cancela (BR-11, al inhabilitar un dia), y ahi
  // esta es la unica explicacion que el alumno va a recibir.
  motivoCancelacion: string | null;
  producto: string;
  sede: string;
  unidad: string;
};

// La forma de la fila que devuelve el embed, declarada para que TypeScript la
// CONTRASTE contra lo que el `select` infiere. No se usa `.returns<>()`: eso es
// un `as` con otro nombre, y sustituye el tipo en vez de comprobarlo (D-26).
//
// `products` e `inventory_units` llegan como OBJETO y no como array porque la FK
// vive en la tabla que consulta, no en la embebida -al reves que
// `product_images` en lib/catalogo/consultas.ts-.
//
// Los tres embeds van `| null` por DEDUCCION y no por medicion: si el producto o
// la sede se borraran, PostgREST devolveria `null` como un LEFT JOIN, y nadie ha
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

// DESCARTA la fila si falta algun embed, en vez de pintarla con un nombre vacio:
// una tarjeta sin equipo ni sede no le dice nada util al alumno, y es preferible
// que falte a que se vea rota.
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

// Las reservas del alumno de la sesion, para /mi-panel.
//
// NO SE FILTRA POR `alumno_id` en el cliente, y es a proposito:
// `reservations_select_own` ya lo hace DENTRO de RLS, evaluada como el alumno que
// consulta. Un `.eq()` redundante no reforzaria nada: solo sugeriria que el
// aislamiento hace falta en el cliente, cuando ya esta resuelto un nivel abajo.
//
// Ordenadas por `start_at` para que agrupar.ts las reciba ya cronologicas.
export async function misReservas(): Promise<ReservaDelAlumno[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_reservations')
    .select(
      'id,start_at,end_at,status,purpose,cancellation_reason,products(name),inventory_units(unit_code,campuses(name))',
    )
    .order('start_at');

  if (error) {
    console.error('misReservas: fallo la consulta a inventory_reservations', error.message);
    return [];
  }

  return data.map(filaAReserva).filter((reserva): reserva is ReservaDelAlumno => reserva !== null);
}

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
//
// SIN `.eq('alumno_id', ...)`, mismo motivo que misReservas().
//
// `.maybeSingle()` y no `.single()`: cero filas es el estado NORMAL de quien no
// respondio, y hoy ese es el estado de todo alumno. `.single()` lanzaria.
//
// Propaga el error (ver la regla de la cabecera): un `null` por fallo de red se
// leeria como "no ha contestado", la pantalla ofreceria un formulario vacio a
// quien ya tiene fila, y al enviarlo chocaria con el `UNIQUE (alumno_id)`.
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
