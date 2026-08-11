'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { MOTIVOS, type Motivo } from '@/lib/reservas/motivos';

export type EstadoReserva = { error: string } | null;

// Type guard y no un `.includes()` a secas: MOTIVOS es un array `as const`
// -readonly, tipado a Motivo-, y su `.includes()` solo acepta un `Motivo` como
// argumento. `motivo` sale del FormData como `string` a secas, asi que hace
// falta esta funcion para ESTRECHAR el tipo en vez de forzarlo con `as`. Un
// `as Motivo` habria dado por cierto justo lo que esta funcion existe para
// comprobar: una asercion de tipo no ejecuta ninguna comprobacion en tiempo
// de ejecucion, solo silencia al compilador.
function esMotivoValido(valor: string): valor is Motivo {
  return (MOTIVOS as readonly string[]).includes(valor);
}

// Un FormData de un input oculto o un radio siempre es texto, pero el tipo de
// `FormData.get()` es `FormDataEntryValue | null` -admite tambien `File`,
// porque el mismo metodo sirve para inputs de archivo-. Esta funcion reduce
// eso a `string | null`, tratando el string vacio como ausente: un input
// oculto sin `value` manda `""`, no `null`, y esta pantalla no tiene ningun
// campo para el que la cadena vacia sea un valor valido.
function comoTexto(valor: FormDataEntryValue | null): string | null {
  return typeof valor === 'string' && valor.length > 0 ? valor : null;
}

// Traduce el mensaje CRUDO que devuelve `create_reservation` -sin tildes,
// porque todo el SQL de este proyecto se escribe asi- al texto que ve el
// alumno. El criterio, aprobado por Alejandro el 2026-08-11:
//
//   - TEXTO PROPIO para los CUATRO rechazos que un alumno puede provocar
//     navegando de verdad: 1b (perfil incompleto), 2 (sancion vigente), 7
//     (limite diario) y 8 (sin unidades libres en la franja). Son los unicos
//     que la interfaz no evita por su cuenta.
//   - MENSAJE CRUDO DEL MOTOR para los ocho restantes -1a, 3, 3-bis, 4a, 4b,
//     5a, 5b y 6-, que son INALCANZABLES desde esta pantalla mientras el
//     calendario funcione: la rejilla ya no ofrece franjas pasadas, ni fuera
//     de ventana, ni fuera de horario, ni desalineadas de bloque, ni de dias
//     inhabilitados, ni con una duracion que no sea multiplo de 30 -el
//     desplegable de duracion solo ofrece multiplos, Task 8-. SI alguno de
//     estos ocho aparece en pantalla, es un DEFECTO en otro sitio -el
//     calendario mintiendo, o alguien llamando a la RPC sin pasar por el
//     formulario-, y el mensaje crudo dice que se rompio mejor que uno bonito
//     que lo disimularia.
//   - LO NO RECONOCIDO CAE AL CRUDO, nunca a un generico tipo "algo salio
//     mal". Este mapa se puede quedar viejo si alguien cambia el SQL sin
//     tocar este archivo, y ese desfase tiene que VERSE, no esconderse detras
//     de un mensaje amable que miente sobre que paso. De hecho ya ocurrio una
//     vez en esta tanda, del otro lado: el mapa de mensajes medidos se
//     escribio con ONCE casos y el motor tiene DOCE -la migracion
//     20260806171347_duration_slot_multiple.sql anadio el paso 3-bis y la
//     sesion de medicion del 2026-08-10 no lo alcanzo: probo 15 y 600
//     minutos, que mueren antes en el paso 3. Se descubrio leyendo el SQL el
//     2026-08-11 y se midio ese mismo dia contra el stack local -45 minutos
//     sobre el Laptop, que tiene max_duration_hours = 8, asi que pasa el
//     paso 3-: contesta "La duracion tiene que ser multiplo de 30 minutos",
//     y el mismo instante con 60 minutos si crea la reserva. El SQLSTATE es
//     23514, leido del `using errcode = 'check_violation'` de la migracion y
//     no medido aparte. Cae al crudo igual que los otros siete, porque el
//     desplegable de duracion solo ofrece multiplos.
//   - El EMPAREJAMIENTO VA POR EL TEXTO del mensaje, no por el SQLSTATE:
//     `23514` (check_violation) lo comparten 1b, 2 y 6, asi que ramificar por
//     codigo habria mezclado los tres.
//
// Dos de los mensajes crudos son ademas INSERVIBLES para un alumno aunque se
// reconozcan: dentro del caso 2, `infinity` es jerga de Postgres para "sin
// fin" (el bloqueo permanente de D-12, por no devolucion) y el timestamp que
// manda la RPC en el resto de los casos trae microsegundos y un desfase de
// dos digitos -formato que `new Date()` no siempre digiere bien sin
// normalizar-. Los dos se tratan aparte dentro del caso 2, mas abajo.
function mensajeDeRechazo(mensajeDelMotor: string): string {
  // 1b · perfil incompleto. Coincidencia exacta: este mensaje no lleva
  // ningun dato variable pegado.
  if (mensajeDelMotor === 'Completa tu perfil antes de reservar') {
    return 'Completa tu perfil antes de reservar: nos falta tu nombre, tu apellido o tu carrera.';
  }

  // 2 · sancion vigente. Coincidencia por PREFIJO y no exacta, porque el
  // resto del mensaje es la fecha -variable- o la palabra `infinity`.
  const PREFIJO_SANCION = 'Tienes una sancion vigente hasta ';
  if (mensajeDelMotor.startsWith(PREFIJO_SANCION)) {
    const resto = mensajeDelMotor.slice(PREFIJO_SANCION.length);

    // El bloqueo permanente por no devolucion (D-12) llega como la palabra
    // literal `infinity` -el valor especial de Postgres para `timestamptz`-,
    // no como una fecha. Formatearla como fecha seria inventar un dato que
    // no existe: no hay ningun instante en que este bloqueo termine.
    if (resto === 'infinity') {
      return 'Tienes una sanción vigente sin fecha de fin. Contacta con el personal para más información.';
    }

    // El formato que manda Postgres al interpolar con `%` -por ejemplo
    // `2026-08-21 01:06:08.212931+00`- usa un espacio en vez de la `T` de ISO
    // 8601, y un desfase de solo dos digitos en vez de `+00:00`. Esos dos si
    // se normalizan antes de `new Date(...)`.
    //
    // Los decimales, en cambio, no se tocan, y el numero de digitos VARIA:
    // Postgres recorta los ceros finales, asi que la misma columna puede dar
    // seis (`.212931`) o cinco (`.73449`), las dos medidas contra el stack
    // local. `new Date()` los tolera y trunca a milisegundos por su cuenta en
    // los cuatro casos probados -cero, uno, cinco y seis decimales-, asi que
    // recortarlos a mano seria codigo que solo puede equivocarse.
    //
    // OJO: esta normalizacion es SOLO para el mensaje de error de la RPC. El
    // mismo dato leido de la columna por la API llega en ISO completo
    // (`2026-08-26T04:41:49.669513+00:00`) y no necesita nada de esto — ver
    // lib/reservas/sancion.ts, que a proposito no repite este bloque.
    const normalizado = resto.replace(' ', 'T').replace(/([+-]\d{2})$/, '$1:00');
    const fecha = new Date(normalizado);

    // Si no parsea, NUNCA se inventa una fecha: se cae al mensaje crudo. Es
    // la misma regla que el resto del proyecto aplica a cualquier dato que no
    // se pueda leer con certeza -mejor un texto feo y cierto que uno bonito y
    // falso.
    if (Number.isNaN(fecha.getTime())) {
      return mensajeDelMotor;
    }

    // Se muestra la HORA y no solo el dia, y no es un adorno. La RPC compara
    // `banned_until > now()`, o sea un INSTANTE, no una fecha civil: la
    // sancion de ejemplo medida el 2026-08-10 vence a las 20:06 de Lima. Con
    // solo el dia, quien leyera "hasta el 20 de agosto" volveria esa manana y
    // se llevaria el mismo rechazo con el mismo texto, sin forma de entender
    // por que. La zona es `America/Lima` igual que en todo el resto del
    // proyecto, porque el motor almacena en UTC y el alumno vive en Lima.
    // `hour12: false` por el mismo par de motivos que en
    // lib/reservas/sancion.ts: en `es-PE` el formato de 12 horas termina en
    // "p. m." y chocaba con el punto final de la frase -"11:41 p. m.."-, y el
    // resto del proyecto escribe las horas en 24 (formatearHora() en
    // components/reservas/calendario.tsx).
    const formateada = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'long',
      timeStyle: 'short',
      hour12: false,
    }).format(fecha);

    return `Tienes una sanción vigente hasta el ${formateada}.`;
  }

  // 7 · limite diario por producto. Coincidencia exacta.
  if (mensajeDelMotor === 'Ya tienes una reserva de este producto para ese dia') {
    return 'Ya tienes una reserva de este equipo para ese día. Solo se permite una por equipo y día.';
  }

  // 8 · sin unidades libres en la franja. Coincidencia exacta. Es el unico de
  // los cuatro que no es culpa de nadie: otro alumno ocupo la ultima unidad
  // libre de esa franja mientras este elegia -una carrera entre dos personas,
  // no un error de la pantalla ni del alumno.
  if (mensajeDelMotor === 'No hay unidades disponibles en esa franja') {
    return 'Esa franja se acaba de ocupar mientras elegías. Por favor, elige otra hora.';
  }

  // Cualquier otro mensaje -los ocho inalcanzables, o uno que este mapa
  // todavia no conoce- se muestra tal cual llego del motor.
  return mensajeDelMotor;
}

// Traduce el mensaje CRUDO que devuelve `cancel_reservation` -Task 13 de la
// tanda 2B- al texto que ve el alumno, aplicando el MISMO criterio que
// mensajeDeRechazo() de arriba: texto propio SOLO para lo que un alumno puede
// provocar navegando de verdad, mensaje CRUDO para lo inalcanzable, y lo no
// reconocido cae al crudo, nunca a un generico.
//
// PRECISION SOBRE QUIEN DECIDIO QUE, porque la primera version de este
// comentario lo atribuia mal: el CRITERIO GENERAL de las tres lineas de
// arriba lo aprobo Alejandro el 2026-08-11, pero para la Task 10 y sus doce
// rechazos de `create_reservation`. Su APLICACION a los cuatro rechazos de
// ESTA funcion -que solo el #4 lleve texto propio y los otros tres vayan
// crudos- se decidio al escribir la Task 13, razonando caso por caso cual es
// alcanzable desde la pantalla, y no se le consulto aparte. Un criterio
// aprobado no aprueba por si solo cada uso que se le de despues.
//
// La RPC rechaza en CUATRO pasos, EN ESTE ORDEN -leido de
// supabase/migrations/20260806012057_cancel_reservation_rpc.sql-:
//
//   1. Motivo vacio o solo espacios (`btrim`)  -> 23514 (check_violation)
//   2. Reserva inexistente                     -> P0002 (no_data_found)
//   3. Reserva ajena                           -> 42501
//   4. Estado distinto de `reserved`           -> 23514 (check_violation)
//
// Y el reparto es:
//
//   - #4 -> TEXTO PROPIO. Es el UNICO alcanzable de forma realista: el
//     alumno tiene /mi-panel abierto, el personal le entrega el equipo -la
//     reserva pasa a `active`- y en ese momento el alumno pulsa Cancelar. Es
//     una carrera entre dos personas, igual que el caso 8 de
//     mensajeDeRechazo() de arriba, y no es culpa de nadie.
//   - #1, #2 y #3 -> CRUDO. Los tres son inalcanzables desde esta pantalla:
//     el dialogo (components/reservas/dialogo-cancelar.tsx) deja el boton de
//     confirmar deshabilitado mientras el motivo este vacio tras `trim()`,
//     asi que #1 no deberia dispararse nunca desde aca; el id que viaja en
//     el campo oculto sale de la propia consulta de misReservas()
//     (lib/reservas/consultas.ts), asi que #2 exigiria un id inventado a
//     mano; y esa misma consulta ya esta filtrada por RLS a las reservas DEL
//     alumno de la sesion -misReservas() no repite ese filtro en el
//     cliente, ver su comentario-, asi que #3 exigiria un id ajeno
//     conseguido por otra via. Si alguno de los tres aparece en pantalla, es
//     un DEFECTO en otro sitio, y el mensaje crudo dice que se rompio mejor
//     que uno bonito que lo disimularia.
//
// OJO CON EL ORDEN: el motor evalua #1 ANTES que #2. Pedir la cancelacion de
// una reserva INEXISTENTE y SIN MOTIVO a la vez contesta "La cancelacion
// exige un motivo", no "Reserva inexistente" -el motivo vacio nunca deja que
// el motor llegue a comprobar si el id existe-. Si este mensaje aparece
// alguna vez en pantalla, NO hay que leerlo como "la reserva no existe": el
// motor todavia no llego a mirar eso.
//
// Igual que en mensajeDeRechazo(), el EMPAREJAMIENTO VA POR EL TEXTO del
// mensaje y no por el SQLSTATE: `23514` lo comparten #1 y #4, asi que
// ramificar por codigo los habria mezclado.
function mensajeDeRechazoCancelacion(mensajeDelMotor: string): string {
  // 4 · estado distinto de `reserved`. Coincidencia por PREFIJO y no exacta,
  // porque el resto del mensaje es el estado ACTUAL de la reserva
  // -interpolado por el motor con `%`, por ejemplo `(esta en active)`- y
  // varia segun cual sea.
  const PREFIJO_ESTADO = 'Solo se cancela una reserva en estado reserved (esta en ';
  if (mensajeDelMotor.startsWith(PREFIJO_ESTADO)) {
    // CON TILDES, al contrario que PREFIJO_ESTADO de dos lineas arriba: ese
    // es el mensaje que manda el MOTOR y va sin tildes porque asi se escribe
    // todo el SQL del proyecto, mientras esto es texto que LEE el alumno. La
    // primera version de esta linea decia "se entrego" sin tilde y llego a
    // verse asi en pantalla: `typecheck`, `lint`, `test` y `build` estaban en
    // verde con el defecto dentro, y lo encontro abrir el dialogo y leerlo.
    // Es el mismo genero que el "11:41 p. m.." de textoDeSancion() en
    // lib/reservas/sancion.ts.
    return 'El equipo ya se entregó, y una reserva entregada no se cancela, se devuelve. Si necesitas devolverla antes de tiempo, contacta con el personal.';
  }

  // Los otros tres -1, 2 y 3- y cualquier mensaje que este mapa todavia no
  // conozca se muestran tal cual llegaron del motor. Ver el comentario de
  // arriba de esta funcion para el porque de cada uno.
  return mensajeDelMotor;
}

// La Server Action detras del formulario de reserva
// (components/reservas/formulario-reserva.tsx), enganchada con
// `useActionState`: por eso la firma lleva el estado previo como primer
// argumento aunque no se use, y devuelve el estado siguiente en vez de
// lanzar.
export async function reservar(
  _estadoPrevio: EstadoReserva,
  formData: FormData,
): Promise<EstadoReserva> {
  const productId = comoTexto(formData.get('productId'));
  const campusId = comoTexto(formData.get('campusId'));
  const slotStart = comoTexto(formData.get('slotStart'));
  const duracionMinutosTexto = comoTexto(formData.get('duracionMinutos'));
  const motivoTexto = comoTexto(formData.get('motivo'));

  // Los cuatro primeros son campos OCULTOS que la propia pantalla rellena
  // -productId y duracionMinutos vienen de la pagina, campusId de la sede ya
  // elegida en el catalogo, slotStart de la franja que el alumno toco en el
  // calendario- y el motivo sale de un grupo de radios cerrado
  // (lib/reservas/motivos.ts). Un alumno navegando normal NO puede dejar
  // ninguno vacio ni mandar un motivo fuera de la lista: si esto salta, el
  // defecto esta en la pantalla, no en lo que el alumno hizo, y el mensaje lo
  // dice para que quien lo vea sepa donde mirar.
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

  // CINCO argumentos, y el alumno NO es uno de ellos. `create_reservation`
  // deduce la identidad con `auth.uid()` por dentro (paso 1 de la RPC,
  // `where auth_user_id = (select auth.uid())`). Pasar un alumno_id desde
  // aqui seria la PRIMERA VEZ que el cliente afirma una identidad en vez de
  // que el servidor la deduzca de la sesion, y es exactamente lo que el
  // diseno de toda la Fase 2 prohibe: la autorizacion no se replica, y
  // afirmar quien eres es la forma mas basica de romper esa regla.
  //
  // `slotStart` se manda TAL CUAL, exactamente como lo devolvio
  // `available_slots` -es una columna `timestamptz` que llega como string
  // ISO, y este formulario la recibe igual, sin tocarla, a traves del hidden
  // `slotStart` que rellena el calendario-. NO se reconstruye el instante a
  // partir del dia elegido y la hora elegida por separado. Reconstruirlo
  // obligaria a convertir esa hora a `America/Lima` en el cliente y luego de
  // vuelta a UTC para mandarla a la RPC, y cada una de esas dos conversiones
  // es una oportunidad de mover la reserva una hora -el mismo genero de fallo
  // que M-7 persigue por todo el proyecto. El instante que la RPC recibe aqui
  // es literalmente el mismo que la rejilla ya ofrecio: no hay una segunda
  // fuente de verdad sobre la hora que pueda desincronizarse de la primera.
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

  // `/mi-panel` EXISTE desde la Task 12 de esta misma tanda -este comentario
  // decia lo contrario y llego a estar en lo cierto durante un tramo de la
  // tanda; se corrige aca en la Task 13 porque un comentario caducado
  // compila igual que uno cierto y enseña lo contrario de lo que pasa-. Una
  // reserva CORRECTA termina en el panel del alumno, con
  // TarjetaReserva (components/reservas/tarjeta-reserva.tsx) pintando la
  // fila recien creada.
  //
  // Fuera de cualquier try/catch: redirect() funciona lanzando una excepcion
  // interna que Next intercepta mas arriba, y un try/catch alrededor se la
  // tragaria como si fuera un error de verdad.
  redirect('/mi-panel');
}

// La Server Action detras del boton de cancelar
// (components/reservas/dialogo-cancelar.tsx), Task 13 de la tanda 2B: misma
// forma que reservar() de arriba, enganchada con `useActionState` -el estado
// previo entra como primer argumento aunque no se use, y la funcion devuelve
// el estado siguiente en vez de lanzar-.
export async function cancelar(
  _estadoPrevio: EstadoReserva,
  formData: FormData,
): Promise<EstadoReserva> {
  const reservationId = comoTexto(formData.get('reservationId'));
  const motivoTexto = comoTexto(formData.get('motivo'));

  // `reservationId` es un campo OCULTO que el propio dialogo rellena con el
  // id que le llego por props -nunca uno que el alumno teclee-, y `motivo`
  // sale de un input de texto cuyo boton de confirmar queda deshabilitado
  // mientras este vacio tras `trim()`. Un alumno navegando normal no puede
  // dejar ninguno de los dos sin valor: si esto salta, el defecto esta en la
  // pantalla, no en lo que el alumno hizo, igual que la comprobacion
  // identica de reservar() mas arriba.
  if (reservationId === null || motivoTexto === null) {
    return {
      error:
        'Falta un dato para completar la cancelación. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  // Se manda RECORTADO -`trim()`-, igual que el motor recorta con `btrim`
  // para decidir si el motivo cuenta como vacio (paso 1 de la RPC). Pero el
  // porque de este trim aca no es solo imitar esa comprobacion: leyendo esa
  // misma migracion (supabase/migrations/20260806012057_cancel_reservation_rpc.sql),
  // el `update` final guarda `cancellation_reason = p_reason` TAL CUAL -no
  // `btrim(p_reason)`, que solo se usa dos lineas antes, para el rechazo-.
  // Sin este trim aca, un motivo tecleado con un espacio de mas al principio
  // o al final se guardaria con ese espacio dentro, y quien lo lea despues
  // en tarjeta-reserva.tsx ("Cancelada por: ...") veria el descuadre. Y para
  // el motivo de SOLO espacios -sin texto de verdad-: el boton de confirmar
  // en dialogo-cancelar.tsx ya lo deja deshabilitado comprobando
  // `motivo.trim() === ""`, asi que este trim aca no es la unica barrera:
  // es la misma regla aplicada una segunda vez del lado del servidor, por si
  // algo llega a esta funcion sin pasar por ese boton. Sin ninguna de las
  // dos barreras, un motivo de solo espacios pasaria la comprobacion del
  // cliente tal cual -tiene longitud mayor que cero- y moriria recien en el
  // motor, y el rechazo #1 de mensajeDeRechazoCancelacion() de arriba
  // dejaria de ser inalcanzable desde esta pantalla.
  const motivo = motivoTexto.trim();

  const supabase = await createClient();

  // ESTO TIENE QUE SER LA RPC, Y NUNCA UN `.update()` DIRECTO SOBRE
  // `inventory_reservations` -ni ahora ni si alguien intenta "optimizarlo"
  // mas adelante-. Escrito en
  // supabase/migrations/20260806005731_reservation_state_machine.sql y
  // MEDIDO ADEMAS contra el stack local el 2026-08-11, que es la comprobacion
  // que de verdad cierra la duda: `pg_policies` devuelve TRES politicas para
  // esta tabla -`reservations_select_own`, `reservations_select_staff` y
  // `reservations_update_staff`-, o sea que la de UPDATE es UNA SOLA y exige
  // `is_staff()`, y no hay ninguna de INSERT; y
  // `information_schema.column_privileges` confirma que `authenticated` tiene
  // `UPDATE` sobre exactamente dos columnas, `status` y
  // `cancellation_reason`. Leer la migracion dice lo que se escribio;
  // consultar el catalogo dice lo que hay hoy, despues de veintidos
  // migraciones. El detalle importa asi: el
  // alumno SI tiene el privilegio de columna `UPDATE (status,
  // cancellation_reason)` -se concede al rol `authenticated`, que lo
  // incluye-, pero la UNICA politica de UPDATE sobre esa tabla,
  // `reservations_update_staff`, exige `private.is_staff()`. Un alumno no lo
  // es, asi que su `.update()` no violaria ningun privilegio -no lanzaria
  // `42501`- y en cambio afectaria CERO FILAS EN SILENCIO, sin ningun error
  // que un try/catch pudiera atrapar: es el comportamiento normal de RLS
  // ante un UPDATE que no matchea ninguna fila del `USING`. Quien viera solo
  // el codigo de esta funcion, sin conocer esa combinacion privilegio +
  // politica, podria cambiar esto a un `.update()` pensando que es
  // equivalente y mas simple, y el boton de cancelar dejaria de funcionar
  // sin que nada lo avisara -ni un error en pantalla, ni un log-. La RPC
  // (`cancel_reservation`, SECURITY DEFINER) es la UNICA via del alumno para
  // cancelar, y es tambien la unica que hace cumplir el motivo obligatorio
  // -el trigger de la maquina de estados lo exige en las DOS puertas, RPC y
  // UPDATE directo del personal, pero solo la RPC esta abierta para el
  // alumno-.
  //
  // DOS argumentos, y el alumno NO es uno de ellos, por el mismo motivo que
  // create_reservation en reservar() de arriba: `cancel_reservation` deduce
  // la propiedad de la reserva comparando `p_reservation_id` contra lo que
  // saca de `auth.uid()` por dentro, asi que este cliente nunca afirma quien
  // es.
  const { error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_reason: motivo,
  });

  if (error) {
    return { error: mensajeDeRechazoCancelacion(error.message) };
  }

  // `revalidatePath` y no `redirect`: a diferencia de reservar(), el alumno
  // YA esta en /mi-panel cuando cancela -el dialogo vive dentro de esa misma
  // pantalla, montado por TarjetaReserva- asi que no hay a donde llevarlo. Lo
  // que hace falta es que la lista se vuelva a leer de la base para que la
  // tarjeta cancelada deje de aparecer entre las "Proximas" y pase a
  // "Anteriores" con su nuevo estado. `revalidatePath('/mi-panel')`,
  // importado de `next/cache`, hace exactamente eso, y es la PRIMERA vez que
  // este proyecto llama a esta funcion: reservar() resolvia lo mismo con un
  // `redirect()` a una pagina que de todos modos iba a pedir los datos de
  // cero. El patron -llamarla DENTRO de la propia Server Function, despues
  // de mutar y antes de devolver- sale de la seccion "Revalidate data" de
  // los docs de Next 16
  // (node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md).
  revalidatePath('/mi-panel');

  return null;
}
