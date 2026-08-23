'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { MOTIVOS, type Motivo } from '@/lib/reservas/motivos';

// TRES REGLAS QUE VALEN PARA TODO EL ARCHIVO.
//
// 1. TRADUCCION DE RECHAZOS: texto propio SOLO para lo que un alumno puede
//    provocar navegando de verdad; lo inalcanzable y lo desconocido caen al
//    mensaje CRUDO del motor, nunca a un generico. Un mapa que se quede viejo
//    tiene que VERSE, no esconderse detras de un texto amable que miente.
// 2. EL EMPAREJAMIENTO VA POR EL TEXTO del mensaje, nunca por el SQLSTATE:
//    `23514` lo comparten varios rechazos distintos en las dos RPC.
// 3. EL CLIENTE NUNCA AFIRMA UNA IDENTIDAD. Las RPC deducen quien llama con
//    `auth.uid()` por dentro; donde no hay RPC, la resuelve esta capa desde la
//    sesion. Ningun `alumno_id` viaja desde el navegador.

export type EstadoReserva = { error: string } | null;

// Tipo PROPIO y no una reutilizacion de EstadoReserva: guardarEncuesta() nunca
// redirige y necesita poder decir "guardada" para que la pantalla muestre un
// acuse de recibo, algo que EstadoReserva no representa.
export type EstadoEncuesta = { error: string } | { guardada: true } | null;

// Type guard y no un `.includes()` a secas: hace falta ESTRECHAR el tipo, y un
// `as Motivo` habria dado por cierto justo lo que esta funcion comprueba -una
// asercion no ejecuta nada, solo silencia al compilador-.
function esMotivoValido(valor: string): valor is Motivo {
  return (MOTIVOS as readonly string[]).includes(valor);
}

// Reduce `FormDataEntryValue | null` -que admite `File`- a `string | null`,
// tratando la cadena vacia como ausente: un input oculto sin `value` manda `""`
// y no `null`, y aqui ningun campo admite la cadena vacia como valor.
function comoTexto(valor: FormDataEntryValue | null): string | null {
  return typeof valor === 'string' && valor.length > 0 ? valor : null;
}

// Revalida el rango 1-5 en vez de confiar en que el formulario solo pinte cinco
// radios: si llega otra cosa, el defecto esta en la pantalla.
function comoValoracion(valor: FormDataEntryValue | null): number | null {
  const texto = comoTexto(valor);
  if (texto === null) {
    return null;
  }
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : null;
}

// Una cadena vacia tras el recorte se guarda como `null` y no como `''`: "no
// escribio nada" y "escribio solo espacios" son el mismo hecho, y la columna ya
// tiene una forma de decirlo.
function comoTextoOpcional(valor: FormDataEntryValue | null): string | null {
  const texto = comoTexto(valor);
  if (texto === null) {
    return null;
  }
  const recortado = texto.trim();
  return recortado.length > 0 ? recortado : null;
}

// Los rechazos de `create_reservation`. De los doce que tiene la RPC, solo
// CUATRO llevan texto propio -perfil incompleto, sancion vigente, limite diario
// y franja ocupada-: son los unicos que la interfaz no evita por su cuenta. Los
// otros ocho exigirian que el calendario mintiera o que alguien llamara a la RPC
// sin pasar por el formulario, asi que el crudo dice que algo se rompio mejor
// que un mensaje bonito que lo disimularia (regla 1).
function mensajeDeRechazo(mensajeDelMotor: string): string {
  if (mensajeDelMotor === 'Completa tu perfil antes de reservar') {
    return 'Completa tu perfil antes de reservar: nos falta tu nombre, tu apellido o tu carrera.';
  }

  // Por PREFIJO: el resto del mensaje es la fecha, o la palabra `infinity`.
  const PREFIJO_SANCION = 'Tienes una sancion vigente hasta ';
  if (mensajeDelMotor.startsWith(PREFIJO_SANCION)) {
    const resto = mensajeDelMotor.slice(PREFIJO_SANCION.length);

    // El bloqueo permanente de D-12 llega como la palabra literal `infinity`.
    // Formatearla como fecha seria inventar un instante que no existe.
    if (resto === 'infinity') {
      return 'Tienes una sanción vigente sin fecha de fin. Contacta con el personal para más información.';
    }

    // Postgres interpola con un espacio en vez de la `T` de ISO 8601 y un
    // desfase de dos digitos. Solo eso se normaliza: los decimales varian en
    // numero -Postgres recorta ceros finales- y `new Date()` los tolera solo,
    // asi que recortarlos a mano seria codigo que solo puede equivocarse.
    //
    // Es SOLO para el mensaje de error de la RPC: el mismo dato leido de la
    // columna por la API llega en ISO completo. Ver lib/reservas/sancion.ts.
    const normalizado = resto.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
    const fecha = new Date(normalizado);

    // Si no parsea, NUNCA se inventa una fecha: se cae al crudo.
    if (Number.isNaN(fecha.getTime())) {
      return mensajeDelMotor;
    }

    // Con HORA y no solo el dia: la RPC compara `banned_until > now()`, o sea un
    // INSTANTE. Con solo el dia, quien leyera "hasta el 20 de agosto" volveria
    // esa mañana y se llevaria el mismo rechazo sin entender por que.
    //
    // `hour12: false` porque en `es-PE` el formato de 12 horas termina en
    // "p. m." y choca con el punto final de la frase.
    const formateada = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'long',
      timeStyle: 'short',
      hour12: false,
    }).format(fecha);

    return `Tienes una sanción vigente hasta el ${formateada}.`;
  }

  if (mensajeDelMotor === 'Ya tienes una reserva de este producto para ese dia') {
    return 'Ya tienes una reserva de este equipo para ese día. Solo se permite una por equipo y día.';
  }

  // El unico de los cuatro que no es culpa de nadie: otro alumno ocupo la ultima
  // unidad libre mientras este elegia.
  if (mensajeDelMotor === 'No hay unidades disponibles en esa franja') {
    return 'Esa franja se acaba de ocupar mientras elegías. Por favor, elige otra hora.';
  }

  return mensajeDelMotor;
}

// Los rechazos de `cancel_reservation`. La RPC rechaza en cinco pasos y solo DOS
// llevan texto propio, los dos por una carrera que el alumno no provoca:
//
//   #4 estado != reserved -> el personal le entrega el equipo mientras tiene
//      /mi-panel abierto.
//   #5 inicio ya pasado (D-38) -> la misma carrera contra el RELOJ: la pantalla
//      se pinto cuando aun era cancelable, y React no reevalua al pasar el
//      tiempo.
//
// #1 (motivo vacio), #2 (inexistente) y #3 (ajena) van CRUDOS: el dialogo
// deshabilita el boton sin motivo, el id sale de misReservas() y esa consulta ya
// esta filtrada por RLS.
//
// OJO CON EL ORDEN: el motor evalua #1 ANTES que #2. Cancelar una reserva
// inexistente y sin motivo a la vez contesta "La cancelacion exige un motivo",
// asi que ese mensaje NO significa que la reserva exista.
function mensajeDeRechazoCancelacion(mensajeDelMotor: string): string {
  // Por PREFIJO: el motor interpola el estado actual al final.
  const PREFIJO_ESTADO = 'Solo se cancela una reserva en estado reserved (esta en ';
  if (mensajeDelMotor.startsWith(PREFIJO_ESTADO)) {
    return 'El equipo ya se entregó, y una reserva entregada no se cancela, se devuelve. Si necesitas devolverla antes de tiempo, contacta con el personal.';
  }

  // Por IGUALDAD EXACTA: este mensaje es texto fijo, sin nada interpolado.
  if (mensajeDelMotor === 'No puedes cancelar una reserva que ya empezo') {
    // NO promete que el personal se la va a cancelar: lo que puede hacer con una
    // `reserved` ya empezada es marcarla `not_picked_up`, que CUENTA para el
    // bloqueo de D-12. Prometer una cancelacion seria mas amable y falso.
    return 'Ya empezó la franja de esta reserva y no se puede cancelar desde aquí. Habla con el personal del mostrador.';
  }

  return mensajeDelMotor;
}

// Server Action del formulario de reserva, enganchada con `useActionState`: por
// eso lleva el estado previo como primer argumento y devuelve el siguiente en
// vez de lanzar. Mismo patron en cancelar() y guardarEncuesta().
export async function reservar(
  _estadoPrevio: EstadoReserva,
  formData: FormData,
): Promise<EstadoReserva> {
  const productId = comoTexto(formData.get('productId'));
  const campusId = comoTexto(formData.get('campusId'));
  const slotStart = comoTexto(formData.get('slotStart'));
  const duracionMinutosTexto = comoTexto(formData.get('duracionMinutos'));
  const motivoTexto = comoTexto(formData.get('motivo'));

  // Los cinco son campos que la propia pantalla rellena. Un alumno navegando
  // normal no puede dejar ninguno vacio: si esto salta, el defecto esta en la
  // pantalla, y el mensaje lo dice para que quien lo vea sepa donde mirar.
  if (
    productId === null ||
    campusId === null ||
    slotStart === null ||
    duracionMinutosTexto === null ||
    motivoTexto === null
  ) {
    return {
      error:
        'Falta un dato para completar la reserva. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  if (!esMotivoValido(motivoTexto)) {
    return {
      error:
        'El motivo elegido no es una opción válida. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  const supabase = await createClient();

  // CINCO argumentos, y el alumno NO es uno de ellos (regla 3).
  //
  // `slotStart` se manda TAL CUAL, como lo devolvio `available_slots`. NO se
  // reconstruye el instante desde el dia y la hora por separado: eso obligaria a
  // convertir a `America/Lima` y de vuelta a UTC, y cada conversion es una
  // oportunidad de mover la reserva una hora.
  const { error } = await supabase.rpc('create_reservation', {
    p_product_id: productId,
    p_campus_id: campusId,
    p_start_at: slotStart,
    p_duration_minutes: Number(duracionMinutosTexto),
    p_purpose: motivoTexto,
  });

  if (error) {
    return { error: mensajeDeRechazo(error.message) };
  }

  // Fuera de cualquier try/catch: redirect() funciona lanzando una excepcion que
  // Next intercepta mas arriba, y un try/catch se la tragaria como un error.
  redirect('/mi-panel');
}

export async function cancelar(
  _estadoPrevio: EstadoReserva,
  formData: FormData,
): Promise<EstadoReserva> {
  const reservationId = comoTexto(formData.get('reservationId'));
  const motivoTexto = comoTexto(formData.get('motivo'));

  if (reservationId === null || motivoTexto === null) {
    return {
      error:
        'Falta un dato para completar la cancelación. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  // RECORTADO porque el `update` final de la RPC guarda `cancellation_reason`
  // TAL CUAL -el `btrim` solo decide el rechazo-, asi que sin esto un espacio de
  // mas se guardaria dentro y se veria al leerlo.
  const motivo = motivoTexto.trim();

  const supabase = await createClient();

  // TIENE QUE SER LA RPC Y NUNCA UN `.update()` DIRECTO, ni si alguien intenta
  // "optimizarlo" mas adelante. El alumno SI tiene el privilegio de columna
  // sobre `status` y `cancellation_reason`, pero la unica politica de UPDATE de
  // la tabla exige `private.is_staff()`. Su `.update()` no violaria ningun
  // privilegio -no lanzaria 42501- y afectaria CERO FILAS EN SILENCIO: el boton
  // dejaria de funcionar sin error en pantalla ni en el log.
  //
  // La RPC es SECURITY DEFINER y es la unica via del alumno, y tambien la unica
  // que hace cumplir el motivo obligatorio para el.
  const { error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_reason: motivo,
  });

  if (error) {
    return { error: mensajeDeRechazoCancelacion(error.message) };
  }

  // `revalidatePath` y no `redirect`: el alumno YA esta en /mi-panel -el dialogo
  // vive dentro de esa pantalla-, asi que no hay a donde llevarlo. Lo que hace
  // falta es releer la lista para que la tarjeta cancelada pase a "Anteriores".
  revalidatePath('/mi-panel');

  return null;
}

export async function guardarEncuesta(
  _estadoPrevio: EstadoEncuesta,
  formData: FormData,
): Promise<EstadoEncuesta> {
  const platformRating = comoValoracion(formData.get('platformRating'));
  const serviceRating = comoValoracion(formData.get('serviceRating'));
  const reservationProcessRating = comoValoracion(formData.get('reservationProcessRating'));
  const supportClarityRating = comoValoracion(formData.get('supportClarityRating'));
  const equipmentConditionRating = comoValoracion(formData.get('equipmentConditionRating'));
  const wouldRecommendTexto = comoTexto(formData.get('wouldRecommend'));

  // Las cinco valoraciones y el "¿lo recomendarias?" son obligatorios por
  // DECISION de la aplicacion: las seis columnas son nulables, asi que el motor
  // aceptaria cualquier combinacion. El argumento es pedir datos comparables sin
  // obligar a nadie a escribir prosa -por eso los tres textos libres no entran-.
  if (
    platformRating === null ||
    serviceRating === null ||
    reservationProcessRating === null ||
    supportClarityRating === null ||
    equipmentConditionRating === null ||
    wouldRecommendTexto === null
  ) {
    return {
      error:
        'Falta una valoración o la respuesta a si recomendarías el servicio. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  if (wouldRecommendTexto !== 'si' && wouldRecommendTexto !== 'no') {
    return {
      error:
        'La respuesta a si recomendarías el servicio no es válida. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  const bestFeature = comoTextoOpcional(formData.get('bestFeature'));
  const improvementArea = comoTextoOpcional(formData.get('improvementArea'));
  const comments = comoTextoOpcional(formData.get('comments'));

  const supabase = await createClient();

  // Regla 3, en dos pasos porque aqui NO HAY RPC: primero `getClaims()` para el
  // `sub` de la sesion, y despues `alumnos.id where auth_user_id = sub`. Son dos
  // uuid DISTINTOS -el de `auth.users` y el de la fila de `alumnos`-, y
  // confundirlos ya costo un falso positivo. La politica lo revalidaria igual si
  // este codigo se equivocara.
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  // Inalcanzable bajo app/(alumno)/: el layout del grupo ya redirigio a quien no
  // tiene sesion. Se comprueba igual porque `sub` es `string | undefined` y
  // afirmarle lo contrario al compilador seria mentirle.
  if (!sub) {
    return {
      error:
        'No se pudo identificar tu sesión. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  const { data: alumno, error: errorAlumno } = await supabase
    .from('alumnos')
    .select('id')
    .eq('auth_user_id', sub)
    .maybeSingle();

  // Tambien inalcanzable en el uso normal. Se mantiene para que un fallo de red
  // o de RLS no termine en un `insert` con un `alumno_id` inventado.
  if (errorAlumno || alumno === null) {
    return {
      error:
        'No se pudo identificar tu perfil de alumno. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  // `upsert` con `onConflict` y no un `select` seguido de `insert`: lo pide F10,
  // y resuelve crear y editar en UNA llamada sin carrera entre leer y escribir.
  //
  // NO se mandan `id`, `created_at` ni `updated_at` aunque haya privilegio: sus
  // defaults y su trigger ya hacen ese trabajo.
  const { error } = await supabase.from('final_satisfaction_surveys').upsert(
    {
      alumno_id: alumno.id,
      platform_rating: platformRating,
      service_rating: serviceRating,
      reservation_process_rating: reservationProcessRating,
      support_clarity_rating: supportClarityRating,
      equipment_condition_rating: equipmentConditionRating,
      would_recommend: wouldRecommendTexto === 'si',
      best_feature: bestFeature,
      improvement_area: improvementArea,
      comments,
    },
    { onConflict: 'alumno_id' },
  );

  // SIN mapa de traducciones, y es una DECISION: con las valoraciones limitadas a
  // radios, el `upsert` resolviendo el UNIQUE y el `alumno_id` puesto por este
  // codigo, no queda NINGUN rechazo que un alumno pueda provocar navegando. Los
  // tres que existen -23505, violacion de RLS y los CHECK de rango- exigirian un
  // defecto en otro sitio, y el crudo lo dice mejor (regla 1).
  if (error) {
    return { error: error.message };
  }

  // `/encuesta` para que la proxima carga la ofrezca como "editar" y no como
  // "crear"; `/mi-panel` para que su invitacion a responder DESAPAREZCA.
  revalidatePath('/encuesta');
  revalidatePath('/mi-panel');

  // Nunca `redirect()`: no hay a donde llevar al alumno, y perder el acuse de
  // recibo lo dejaria sin saber si se guardo.
  return { guardada: true };
}
