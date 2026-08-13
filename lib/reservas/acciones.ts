'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { MOTIVOS, type Motivo } from '@/lib/reservas/motivos';

export type EstadoReserva = { error: string } | null;

// Estado PROPIO para guardarEncuesta(), y no una reutilizacion de
// EstadoReserva: esa accion nunca redirige -sirve tanto para crear como para
// editar, y las dos veces el alumno se queda en la misma pantalla- y necesita
// poder decir "guardada" para que la pantalla muestre un acuse de recibo, algo
// que EstadoReserva no representa.
export type EstadoEncuesta = { error: string } | { guardada: true } | null;

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

// Traduce el valor de un radio de valoracion ('1' a '5') a numero, o `null`
// si el radio no llego marcado -mismo `null` que comoTexto() de arriba
// devuelve para cualquier campo ausente-. Se revalida el rango 1-5 aca y no
// solo se confia en que el formulario (components/reservas/formulario-encuesta.tsx)
// solo pinte cinco radios: es la misma regla que esMotivoValido() aplica al
// motivo de reservar() mas abajo -un alumno navegando normal no puede mandar
// otra cosa, y si algo distinto llega, el defecto esta en la pantalla, no en
// lo que el alumno hizo-.
function comoValoracion(valor: FormDataEntryValue | null): number | null {
  const texto = comoTexto(valor);
  if (texto === null) {
    return null;
  }
  const numero = Number(texto);
  return Number.isInteger(numero) && numero >= 1 && numero <= 5 ? numero : null;
}

// Los tres textos libres de la encuesta se RECORTAN, y una cadena vacia tras
// el recorte se guarda como `null`, no como `''`. "No escribio nada" y
// "escribio solo espacios" son el MISMO HECHO para quien lea despues estos
// campos, y la columna ya tiene una forma de decir eso -`text` nulable, sin
// default, en `final_satisfaction_surveys`-. Guardar `''` en vez de `null`
// inventaria una tercera categoria que ninguna pantalla de este proyecto
// necesita distinguir de "no contesto".
function comoTextoOpcional(valor: FormDataEntryValue | null): string | null {
  const texto = comoTexto(valor);
  if (texto === null) {
    return null;
  }
  const recortado = texto.trim();
  return recortado.length > 0 ? recortado : null;
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
// tanda 2B, y Q-17/D-38 de la tanda 3A para el quinto caso- al texto que ve
// el alumno, aplicando el MISMO criterio que mensajeDeRechazo() de arriba:
// texto propio SOLO para lo que un alumno puede provocar navegando de
// verdad, mensaje CRUDO para lo inalcanzable, y lo no reconocido cae al
// crudo, nunca a un generico.
//
// PRECISION SOBRE QUIEN DECIDIO QUE, porque la primera version de este
// comentario lo atribuia mal: el CRITERIO GENERAL de las tres lineas de
// arriba lo aprobo Alejandro el 2026-08-11, pero para la Task 10 y sus doce
// rechazos de `create_reservation`. Su APLICACION a los rechazos de ESTA
// funcion -cuales llevan texto propio y cuales van crudos- se decidio caso
// por caso al escribir la Task 13 primero y la Task 3 de la tanda 3A
// despues, razonando cual es alcanzable desde la pantalla, y no se le
// consulto aparte. Un criterio aprobado no aprueba por si solo cada uso que
// se le de despues.
//
// La RPC rechaza en CINCO pasos, EN ESTE ORDEN -leido de
// supabase/migrations/20260806012057_cancel_reservation_rpc.sql y, desde la
// migracion 23, de
// supabase/migrations/20260812053243_cancel_before_start.sql-:
//
//   1. Motivo vacio o solo espacios (`btrim`)     -> 23514 (check_violation)
//   2. Reserva inexistente                        -> P0002 (no_data_found)
//   3. Reserva ajena                               -> 42501
//   4. Estado distinto de `reserved`               -> 23514 (check_violation)
//   5. Inicio ya pasado, SOLO si no es personal     -> 23514 (check_violation)
//
// Y el reparto es:
//
//   - #4 -> TEXTO PROPIO. Es el UNICO de los cuatro originales alcanzable de
//     forma realista: el alumno tiene /mi-panel abierto, el personal le
//     entrega el equipo -la reserva pasa a `active`- y en ese momento el
//     alumno pulsa Cancelar. Es una carrera entre dos personas, igual que el
//     caso 8 de mensajeDeRechazo() de arriba, y no es culpa de nadie.
//   - #5 -> TEXTO PROPIO, desde la tanda 3A (D-38). Tambien es alcanzable de
//     forma realista, y por una carrera parecida a la de #4 pero contra el
//     RELOJ en vez de contra otra persona: el alumno tiene /mi-panel abierto
//     desde ANTES de la hora de inicio, no recarga la pagina, y pulsa
//     Cancelar ya pasada esa hora. Una carga NUEVA de /mi-panel ya no
//     ofreceria el boton -seOfreceCancelar(), lib/reservas/agrupar.ts, lo
//     descarta-, pero la pantalla que el alumno tiene abierta se pinto
//     cuando la reserva todavia era cancelable, y React no vuelve a evaluar
//     esa condicion solo porque pase el tiempo.
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
// OJO CON EL ORDEN: el motor evalua #1 ANTES que #2, y #4 ANTES que #5.
// Pedir la cancelacion de una reserva INEXISTENTE y SIN MOTIVO a la vez
// contesta "La cancelacion exige un motivo", no "Reserva inexistente" -el
// motivo vacio nunca deja que el motor llegue a comprobar si el id existe-.
// Si este mensaje aparece alguna vez en pantalla, NO hay que leerlo como "la
// reserva no existe": el motor todavia no llego a mirar eso.
//
// Igual que en mensajeDeRechazo(), el EMPAREJAMIENTO VA POR EL TEXTO del
// mensaje y no por el SQLSTATE: `23514` lo comparten AHORA TRES -#1, #4 y
// #5-, asi que ramificar por codigo los habria mezclado.
//
// SOBRE EL SQLSTATE DE #5, TAL COMO LLEGA POR POSTGREST: esta funcion
// empareja por TEXTO, asi que el SQLSTATE exacto que PostgREST devuelve en
// `error.code` no le hace falta a este codigo. Pero para quien lea este
// comentario buscando esa cifra: NO ESTA MEDIDO todavia como llega ese campo
// desde PostgREST para este quinto rechazo -medirlo es la Task 9 de esta
// misma tanda, no esta tanda.
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

  // 5 · inicio ya pasado (D-38, migracion 23), solo para el alumno -guardado
  // en el SQL por `not private.is_staff()`-. Coincidencia por IGUALDAD
  // EXACTA y no por prefijo, al contrario que el caso 4 de arriba: este
  // mensaje es TEXTO FIJO, sin ningun dato variable interpolado con `%`, a
  // diferencia del estado de la reserva que el caso 4 si interpola. Es el
  // mismo criterio que ya distingue, dentro de mensajeDeRechazo() mas
  // arriba, sus casos de coincidencia exacta (1b, 7, 8) de su unico caso por
  // prefijo (2, la sancion con fecha variable pegada al final).
  if (mensajeDelMotor === 'No puedes cancelar una reserva que ya empezo') {
    // NO promete que el personal se la va a cancelar: lo que el personal
    // puede hacer con una reserva `reserved` ya empezada y no recogida es
    // marcarla `not_picked_up`, que CUENTA para el bloqueo de D-12 -dos
    // `not_picked_up` acumuladas en 90 dias, no cualquiera de forma
    // aislada-, y eso es exactamente lo contrario de lo que el alumno
    // querria. Prometer una cancelacion aca seria un texto MAS AMABLE que
    // FALSO, y este proyecto ya eligio, en mensajeDeRechazo() de arriba, que
    // un mensaje feo y cierto vale mas que uno bonito que no lo es.
    return 'Ya empezó la franja de esta reserva y no se puede cancelar desde aquí. Habla con el personal del mostrador.';
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
  // en tarjeta-reserva.tsx ("Motivo de la cancelación: ...") veria el descuadre. Y para
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

// La Server Action detras del formulario de encuesta
// (components/reservas/formulario-encuesta.tsx), Task 14 de la tanda 2B:
// misma forma que reservar() y cancelar() de arriba, enganchada con
// `useActionState` -el estado previo entra como primer argumento aunque no se
// use, y la funcion devuelve el estado siguiente en vez de lanzar-, pero con
// EstadoEncuesta y no EstadoReserva: ver el comentario de ese tipo, arriba del
// todo de este archivo.
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

  // Las CINCO valoraciones y el "¿lo recomendarias?" son obligatorios -
  // DECISION de Alejandro, 2026-08-11-: la base aceptaria cualquier
  // combinacion, las seis columnas son nulables, asi que esta regla es de la
  // APLICACION y no del motor. El argumento: se piden datos comparables entre
  // alumnos y no se obliga a nadie a escribir prosa -por eso los tres textos
  // libres, mas abajo, NO se comprueban aca-.
  //
  // Un alumno navegando normal no puede dejar ninguno de los seis sin marcar:
  // el boton de enviar en formulario-encuesta.tsx queda deshabilitado
  // mientras falte cualquiera. Si esto salta, el defecto esta en la pantalla,
  // no en lo que el alumno hizo, igual que las comprobaciones identicas de
  // reservar() y cancelar() mas arriba en este archivo.
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

  // El unico valor que un radio "si"/"no" puede mandar es uno de esos dos
  // textos -formulario-encuesta.tsx no pinta ningun otro-, pero se revalida
  // igual antes de convertirlo a boolean, por la misma regla que
  // comoValoracion() aplica al rango 1-5 de arriba.
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

  // El `alumno_id` NO LO MANDA EL NAVEGADOR: lo resuelve esta Server Action
  // leyendo la sesion, nunca un campo del formulario. Es la misma regla que
  // reservar() y cancelar() aplican mas arriba dejando que la RPC deduzca la
  // identidad con `auth.uid()` por dentro, pero aca NO HAY RPC -esta accion
  // hace un `upsert` directo sobre la tabla, la unica escritura de esta tanda
  // que no pasa por una-, asi que quien tiene que resolver el id es este
  // mismo codigo, en dos pasos: primero `getClaims()` para el `sub` de la
  // sesion, y despues `alumnos.id where auth_user_id = sub` -dos consultas, no
  // una, porque `sub` es el uuid de `auth.users` y `alumnos.id` es OTRO uuid
  // distinto, el de la fila propia de `alumnos`; confundir esas dos columnas
  // ya costo un falso positivo en esta tanda, ver el comentario de
  // sancionDelAlumno() en lib/reservas/consultas.ts-. Que el cliente nunca
  // afirme una identidad es la regla de toda la fase, y ademas la politica lo
  // revalidaria igual si este codigo se equivocara: la sonda 4 medida el
  // 2026-08-11 contra el stack local -un `insert` con el `alumno_id` de OTRO
  // alumno, usando las claims de Ana- la rechazo con "new row violates
  // row-level security policy for table final_satisfaction_surveys".
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  // Sin sesion no hay alumno de quien resolver el id. En la practica esta
  // rama es INALCANZABLE bajo app/(alumno)/: el layout del grupo
  // (app/(alumno)/layout.tsx) ya redirigio a /login a quien no tiene sesion
  // antes de que esta accion pudiera invocarse -misma razon que la rama
  // identica de sancionDelAlumno() en lib/reservas/consultas.ts-. Se comprueba
  // igual porque el tipo de `sub` es `string | undefined` y no hay forma de
  // afirmarle al compilador lo contrario sin un `as` que estaria mintiendo.
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

  // Tambien INALCANZABLE bajo app/(alumno)/ en el uso normal, por el mismo
  // motivo que la rama de `!sub` de arriba: el layout del grupo ya redirigio
  // a /auth/error a quien no tiene fila en `alumnos`. Se mantiene por el
  // mismo criterio que ajustesReserva() propaga en vez de inventar, en
  // lib/reservas/consultas.ts: un fallo de red o de RLS en esta consulta no
  // deberia terminar en un `insert` con un `alumno_id` inventado o vacio.
  if (errorAlumno || alumno === null) {
    return {
      error:
        'No se pudo identificar tu perfil de alumno. Esto es un defecto de la pantalla, no tuyo: recarga la página e inténtalo de nuevo.',
    };
  }

  // `upsert` con `onConflict: 'alumno_id'`, y no un `select` seguido de
  // `insert` o `update`: es lo que pide la especificacion (F10,
  // MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md, "Una respuesta por alumno
  // (upsert con onConflict: alumno_id)"), esta MEDIDO que funciona bajo RLS
  // -sonda 3 del set medido el 2026-08-11 contra el stack local: un
  // `insert ... on conflict (alumno_id) do update set ...` con las claims de
  // Ana dejo UNA SOLA fila con los valores nuevos-, y resuelve en UNA llamada el
  // crear y el editar sin una carrera entre leer y escribir: sin esto, dos
  // pestañas del mismo alumno guardando casi a la vez podrian leer "no existe"
  // las dos, y la segunda `insert` chocaria con el `UNIQUE` que la primera
  // acababa de satisfacer.
  //
  // NO se mandan `id`, `created_at` ni `updated_at`, aunque `authenticated`
  // tenga privilegio de INSERT sobre esas tres columnas -medido el 2026-08-11
  // contra el stack local, sobre `information_schema.column_privileges`-: sus
  // defaults y su trigger `BEFORE UPDATE` ya hacen ese trabajo, y mandarlas
  // seria este cliente decidiendo algo que la base decide mejor.
  //
  // Que el trigger de `updated_at` dispare TAMBIEN en la rama `do update` del
  // upsert esta medido, pero en una sonda APARTE de la del upsert, y la razon
  // vale para cualquier medicion futura sobre marcas de tiempo: dentro de UNA
  // sola transaccion `now()` es constante, asi que `updated_at` y `created_at`
  // salen IGUALES y un `updated_at > created_at` devuelve `false` aunque el
  // trigger haya hecho su trabajo. Se comprobo en DOS transacciones separadas
  // -el caso real, una peticion por envio- y ahi el instante si avanza. La
  // primera lectura parecia decir que el trigger no disparaba, y otra vez el
  // sospechoso correcto era la sonda.
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

  // SIN mensajeDeRechazo() ni ningun mapa de traducciones, al contrario que
  // reservar() y cancelar() mas arriba en este archivo, y es una DECISION y no
  // un olvido. Con las cinco valoraciones limitadas a radios de 1 a 5, el "¿lo
  // recomendarias?" a solo dos opciones, el `upsert` resolviendo el
  // `UNIQUE (alumno_id)` en vez de un `insert` que pudiera chocar con el, y el
  // `alumno_id` puesto por este mismo codigo -nunca por el navegador-, no
  // queda NINGUN rechazo que un alumno pueda provocar navegando. Los TRES
  // rechazos que existen estan MEDIDOS el 2026-08-11 contra el stack local, y
  // los tres son inalcanzables desde esta pantalla:
  //
  //   - `23505` (duplicate key en `alumno_id`): solo lo dispararia un `insert`
  //     SIN `on conflict`, y este codigo siempre usa `upsert`.
  //   - La violacion de RLS ("new row violates row-level security policy"):
  //     solo la dispararia un `alumno_id` distinto del de la sesion, y este
  //     codigo lo resuelve arriba desde `auth_user_id = sub`, nunca desde un
  //     dato que el navegador mande.
  //   - Los `CHECK` de cada valoracion (`>= 1 AND <= 5`): solo los violaria un
  //     numero fuera de rango, y comoValoracion() ya descarta cualquier valor
  //     que no sea un entero entre 1 y 5 antes de llegar aca.
  //
  // Si alguno de estos tres apareciera en pantalla, seria un DEFECTO EN OTRO
  // SITIO -esta validacion, el formulario, o la politica-, y el mensaje crudo
  // del motor lo dice mejor que uno bonito que lo disimularia.
  if (error) {
    return { error: error.message };
  }

  // Los DOS `revalidatePath`: `/encuesta` porque esta misma pantalla necesita
  // releer lo que se acaba de guardar para que la proxima carga la ofrezca
  // como "editar" y no como "crear" -formulario-encuesta.tsx explica, en su
  // propio comentario, por que esa distincion no se puede leer del prop
  // despues de guardar-; y `/mi-panel` porque la invitacion de esa pantalla
  // (Step 4 del plan) tiene que DESAPARECER apenas el alumno conteste: sin
  // este segundo `revalidatePath`, /mi-panel seguiria sirviendo la version
  // cacheada de antes de responder y la invitacion seguiria ahi.
  revalidatePath('/encuesta');
  revalidatePath('/mi-panel');

  // Nunca `redirect()`: a diferencia de reservar(), aca no hay a donde llevar
  // al alumno -ya esta en la unica pantalla de la encuesta-, y perder el
  // acuse de recibo lo dejaria sin saber si se guardo.
  return { guardada: true };
}
