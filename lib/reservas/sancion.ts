// La sancion, como logica pura: sin React y sin base de datos.
//
// EL MOTOR ES QUIEN BLOQUEA -paso 2 de create_reservation, mientras
// `banned_until > now()`-. Este archivo REPLICA esa regla para anticipar el
// rechazo antes de pintar un calendario que no lleva a ningun lado. Si
// desaparece o se equivoca, el motor sigue rechazando igual.
//
// D-12: dos `not_picked_up` en 90 dias dan 15 dias de bloqueo; un
// `not_returned` da bloqueo permanente, que el motor representa con el valor
// especial `infinity` de `timestamptz` -no con NULL ni con una fecha lejana-.

export type Sancion =
  | { tipo: "permanente" }
  | { tipo: "temporal"; hasta: Date };

/**
 * Si el alumno tiene una sancion vigente en el instante `ahora`.
 *
 * `ahora` se RECIBE: una funcion que lee el reloj no se puede probar en el borde
 * exacto, que es justo el caso que separa "vigente" de "caducada".
 */
export function sancionVigente(bannedUntil: string | null, ahora: Date): Sancion | null {
  // Columna vacia: nunca hubo sancion.
  if (bannedUntil === null) {
    return null;
  }

  // El valor de Postgres para "sin fin", que llega como string literal.
  if (bannedUntil === "infinity") {
    return { tipo: "permanente" };
  }

  const fecha = new Date(bannedUntil);

  // ACA NO HAY NADA QUE NORMALIZAR, al contrario que en lib/reservas/acciones.ts:
  // aquel recibe el MENSAJE DE ERROR de la RPC, con un espacio en vez de la `T` y
  // un desfase de dos digitos; este valor sale de leer la COLUMNA por la API y
  // llega en ISO 8601 completo. Copiar esa normalizacion aqui seria codigo muerto
  // que sugiere un problema inexistente.
  //
  // Si no parsea, se trata al alumno como SANCIONADO y no como "sin sancion":
  // ante un dato ilegible la opcion segura es la restrictiva, porque el motor va
  // a rechazar igual y ofrecer un boton que falla seguro es peor que no ofrecerlo.
  if (Number.isNaN(fecha.getTime())) {
    return { tipo: "permanente" };
  }

  // Estricto y no `>=`, copiando la frontera exacta del motor. Es §11.2 de
  // FASE_2_DISENO.md -"la rejilla puede ser mas estricta que la RPC, nunca mas
  // laxa"- del lado contrario: ser mas estricta aqui significaria bloquear a
  // alguien a quien el motor ya deja reservar, y eso no es prudencia, es una
  // pantalla que miente.
  if (fecha > ahora) {
    return { tipo: "temporal", hasta: fecha };
  }

  // Pasada o igual: caducada, y una sancion caducada NO bloquea.
  return null;
}

/**
 * El texto que ve el alumno en pantalla.
 */
export function textoDeSancion(sancion: Sancion): string {
  if (sancion.tipo === "permanente") {
    // La palabra "infinity" NUNCA aparece ni se formatea como fecha: es jerga de
    // Postgres, y no hay ningun instante en que este bloqueo termine.
    return "Tienes una sanción vigente sin fecha de fin. Contacta con el personal para más información.";
  }

  // La HORA es obligatoria: el motor compara INSTANTES, no fechas civiles. Sin
  // ella, alguien leeria "hasta el 26 de agosto", volveria esa mañana y se
  // llevaria el mismo rechazo sin entender por que.
  //
  // `hour12: false` arregla dos cosas, las dos vistas en pantalla: en `es-PE` el
  // formato de 12 horas termina en "p. m." y chocaba con el punto final de la
  // frase, y el calendario ya pinta las franjas en 24 horas.
  const formateada = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    dateStyle: "long",
    timeStyle: "short",
    hour12: false,
  }).format(sancion.hasta);

  return `Tienes una sanción vigente hasta el ${formateada}.`;
}
