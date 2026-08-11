// La sancion, como logica pura: sin React y sin base de datos, igual que
// lib/reservas/rejilla.ts. Vive aparte por el mismo motivo que esa: se puede
// PROBAR sin montar un escenario en la base, y "esta vigente o no" se
// calcula en UN SOLO SITIO -este-, en vez de repetirse en cada pantalla que
// necesite saberlo.
//
// El motor -paso 2 de create_reservation- es quien de verdad bloquea:
// rechaza con SQLSTATE 23514 y el mensaje "Tienes una sancion vigente hasta
// <valor>" mientras `banned_until > now()`. Este archivo NO inventa esa
// regla, la REPLICA en el cliente para poder anticipar el rechazo antes de
// pintar un calendario que no va a llevar a ningun lado. Si este archivo
// desaparece o se equivoca, el motor sigue rechazando igual: la autorizacion
// real vive alla, no aca.
//
// D-12: dos `not_picked_up` en 90 dias dan 15 dias de bloqueo; un
// `not_returned` da bloqueo permanente. El motor representa "permanente" con
// el valor especial `infinity` de `timestamptz`, no con NULL ni con una
// fecha lejana -medido el 2026-08-11 con `to_jsonb`, la misma serializacion
// que devuelve PostgREST al cliente-.

export type Sancion =
  | { tipo: "permanente" }
  | { tipo: "temporal"; hasta: Date };

/**
 * Si el alumno tiene una sancion vigente en el instante `ahora`, o `null` si
 * no.
 *
 * `ahora` se RECIBE y no se calcula aca con `new Date()`, por el mismo
 * motivo que lib/reservas/rejilla.ts recibe el instante para calcular el dia
 * de hoy: una funcion que lee el reloj del sistema no se puede probar en el
 * borde exacto -`bannedUntil` igual a `ahora`-, que es justo el caso que
 * separa "vigente" de "caducada".
 */
export function sancionVigente(bannedUntil: string | null, ahora: Date): Sancion | null {
  // Columna vacia: nunca hubo sancion.
  if (bannedUntil === null) {
    return null;
  }

  // El valor especial de Postgres para "sin fin", medido como string literal
  // y no como una fecha lejana ni como null.
  if (bannedUntil === "infinity") {
    return { tipo: "permanente" };
  }

  const fecha = new Date(bannedUntil);

  // A diferencia de mensajeDeRechazo() en lib/reservas/acciones.ts, ACA NO
  // HAY NADA QUE NORMALIZAR antes de este `new Date(...)`. Ese archivo recibe
  // el mensaje de ERROR de la RPC, con un espacio en vez de la `T` de ISO y
  // un desfase de solo dos digitos -formato que `new Date()` no digiere bien
  // sin arreglar antes-. Este valor en cambio sale de leer la COLUMNA por la
  // API -`to_jsonb`, medido el 2026-08-11 contra el stack local- y llega
  // como ISO 8601 completo: con `T`, microsegundos y el desfase en
  // `+00:00`. `new Date()` lo parsea directo. Copiar esa normalizacion aca
  // por analogia seria codigo muerto que sugiere un problema que aca no
  // existe.
  //
  // Si de todos modos no parsea -un dato corrupto o un formato que cambio sin
  // que este archivo se enterara-, se trata al alumno como SANCIONADO
  // (permanente) y no como "sin sancion". Ante un dato ilegible la opcion
  // segura es la restrictiva: el motor va a rechazar la reserva igual -su
  // `banned_until` sigue siendo lo que sea que no se pudo leer aca-, asi que
  // ofrecer un boton que va a fallar seguro es peor que no ofrecerlo. Y de
  // todos modos esta funcion no abre nada por equivocarse: quien decide de
  // verdad es el motor.
  if (Number.isNaN(fecha.getTime())) {
    return { tipo: "permanente" };
  }

  // Estricto y no `>=`, para copiar la frontera exacta del motor: el paso 2
  // de create_reservation compara `banned_until > now()`. Eso esta LEIDO del
  // SQL (20260806171347_duration_slot_multiple.sql), no medido: el instante
  // exacto del vencimiento no se puede disparar a proposito, porque `now()`
  // avanza mientras se prepara la sonda. Lo que SI esta medido es el caso de
  // al lado, una sancion ya vencida, que la RPC acepta.
  //
  // Es §11.2 de FASE_2_DISENO.md -"la rejilla puede ser mas estricta que la
  // RPC, nunca mas laxa"- aplicada del lado contrario: aca ser "mas estricta"
  // significaria bloquear a alguien a quien el motor ya deja reservar, y eso
  // no es prudencia, es una pantalla que miente.
  if (fecha > ahora) {
    return { tipo: "temporal", hasta: fecha };
  }

  // Pasada o igual: caducada. Una sancion caducada NO bloquea -medido contra
  // la RPC-, y esta funcion es la interfaz alineandose con el motor, no
  // inventando su propia regla.
  return null;
}

/**
 * El texto que ve el alumno en pantalla.
 */
export function textoDeSancion(sancion: Sancion): string {
  if (sancion.tipo === "permanente") {
    // La palabra "infinity" NUNCA aparece aca ni se formatea como fecha: es
    // jerga interna de Postgres para "timestamptz sin fin", no un dato para
    // mostrarle a un alumno. No hay ningun instante en que este bloqueo
    // termine, asi que no hay fecha que inventar.
    return "Tienes una sanción vigente sin fecha de fin. Contacta con el personal para más información.";
  }

  // La HORA es obligatoria y no es un adorno: el motor compara INSTANTES
  // (`banned_until > now()`), no fechas civiles. Sin la hora, alguien leeria
  // "hasta el 26 de agosto", volveria esa misma manana y se llevaria el
  // mismo rechazo sin entender por que. Es la misma correccion que ya se
  // aplico en lib/reservas/acciones.ts. La zona es `America/Lima` igual que
  // en todo el resto del proyecto: el motor almacena en UTC y el alumno vive
  // en Lima.
  //
  // `hour12: false` arregla DOS cosas de una, y las dos se vieron en pantalla
  // antes de corregirlas:
  //
  //   1. En `es-PE` el formato de 12 horas termina en "p. m." -con punto-, y
  //      la frase de abajo cierra con otro: salia "11:41 p. m..", con dos
  //      puntos seguidos. En 24 horas da "23:41" y el punto final vuelve a
  //      ser el unico.
  //   2. El calendario ya pinta las franjas en 24 horas -formatearHora() en
  //      components/reservas/calendario.tsx usa `hour12: false`-, asi que en
  //      12 horas esta pantalla contradecia a la de al lado sobre como se
  //      escribe una hora en este sistema.
  const formateada = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "long",
    timeStyle: "short",
    hour12: false,
  }).format(sancion.hasta);

  return `Tienes una sanción vigente hasta el ${formateada}.`;
}
