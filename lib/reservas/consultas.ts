import { createClient } from '@/lib/supabase/server';

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
};

// Fila unica de `app_settings` -PK booleana con `check (id)`, insertada en la
// migracion 20260806002459 y no en `seed.sql`, asi que existe igual en local
// y en produccion-. No hay "todavia no existe" que manejar, a diferencia de
// disponibilidadPorSede en lib/catalogo/consultas.ts.
//
// Si la consulta falla, esta funcion NO devuelve un valor por defecto,
// aunque sea tentador: los cinco numeros de esta fila estan medidos arriba
// en este mismo archivo (7, 08:00, 22:00, 30, 30) y copiarlos aca seria
// exactamente lo que D-19 prohibe para las duraciones -una constante que se
// separa del dato real sin que nada avise-. Si `app_settings` no responde,
// toda la pantalla depende de un horario que no se pudo leer, asi que el
// error se propaga y la pagina falla de forma visible en vez de ofrecer un
// calendario con un horario inventado.
export async function ajustesReserva(): Promise<AjustesReserva> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select('booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes')
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
