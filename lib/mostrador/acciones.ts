'use server';

// Las Server Actions del mostrador. Task 5 de la tanda 3A dejo entregar() y
// recibir(); la Task 6 agrego marcarNoRecogida() y marcarNoDevuelta() -las
// dos faltas-. Esta misma Task 7 agrega anotar(): el plan
// (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md, "Estructura de archivos") ya
// describia este archivo entero como "entregar, recibir, las dos faltas,
// anotar", asi que agregarla ahora no es una sorpresa de alcance.

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type ResultadoMostrador = { error: string } | null;

// UPDATE DIRECTO sobre `inventory_reservations`, NUNCA una RPC -al contrario
// que reservar() y cancelar() en lib/reservas/acciones.ts, que si son RPC-.
// La razon no es que un UPDATE directo sea seguro "en general": es que ACA
// hay una politica de UPDATE que le aplica a quien llama.
//
//   - `grant update (status, cancellation_reason) on public.inventory_reservations
//     to authenticated` y la politica `reservations_update_staff`
//     -`using ((select private.is_staff())) with check ((select private.is_staff()))`-,
//     las dos en supabase/migrations/20260806005731_reservation_state_machine.sql:62-68.
//     El personal (admin u operador, D-16) SI cumple `is_staff()`, asi que su
//     UPDATE llega a la fila.
//   - Ninguna de las dos transiciones de aca exige motivo: el trigger
//     `enforce_reservation_transition()` (mismo archivo, linea 45) solo lo
//     exige cuando `new.status = 'cancelled'`, y ni entregar() ni recibir()
//     escriben ese valor.
//
// POR QUE ESTO NO CONTRADICE que el alumno cancele SIEMPRE por RPC
// (cancelar(), lib/reservas/acciones.ts): son dos situaciones distintas, no
// dos reglas inconsistentes.
//
//   El alumno NO tiene ninguna politica de UPDATE sobre esta tabla -tiene el
//   privilegio de COLUMNA (`authenticated` lo incluye), pero la UNICA
//   politica de UPDATE es `reservations_update_staff`, y un alumno no cumple
//   `is_staff()`-, asi que su UPDATE directo afectaria CERO FILAS SIN ERROR:
//   el modo de fallo silencioso que el propio comentario de cancelar() ya
//   documenta. La fuente de este hecho es la seccion
//   "8. El alumno tiene `UPDATE` sobre `status` y no le sirve de nada" del
//   CUERPO de MIGRATION_DOCS/PLANES/FASE_2_TANDA_2B.md -y no su correccion 8,
//   que trata de otra cosa, la sede que se perdia entre catalogo, detalle y
//   reserva-. Y ahora esta MEDIDO por PostgREST, no solo leido en el esquema:
//   el mismo PATCH con un JWT de alumno -contra el stack local, el
//   2026-08-12- devolvio HTTP 200 con `[]`, cero filas, sin ningun error.
//
//   El personal, en cambio, SI tiene esa politica. `cancel_reservation`
//   existe porque es la UNICA via del alumno para cancelar -no porque un
//   UPDATE sea inseguro en abstracto-, y el personal puede llegar a la misma
//   fila por la puerta que el alumno tiene cerrada. La regla real es "cada
//   rol usa la puerta que RLS le abre", y aca a el si se la abre.
//
// Traduce el mensaje CRUDO del trigger de la maquina de estados al texto que
// ve el personal, con el MISMO criterio que ya aplican mensajeDeRechazo() y
// mensajeDeRechazoCancelacion() en lib/reservas/acciones.ts: texto propio
// SOLO para lo que esta pantalla puede provocar de verdad, mensaje CRUDO
// para lo inalcanzable, y lo no reconocido cae al crudo, NUNCA a un
// generico "algo salio mal".
//
// DESDE ESTA PANTALLA, el UNICO rechazo alcanzable es la transicion
// invalida -"Transicion no permitida: % -> %", raise en
// supabase/migrations/20260806005731_reservation_state_machine.sql:41-, y no
// por descuido: la tarjeta (components/mostrador/tarjeta-mostrador.tsx, con
// el dialogo de confirmacion de components/mostrador/dialogo-falta.tsx para
// las dos faltas) solo ofrece "Producto entregado" y "No se retiro" sobre una
// reserva `reserved`, y "Producto devuelto" y "No se devolvio" sobre una
// `active`, asi que este codigo nunca PIDE una transicion que la maquina de
// estados rechace... salvo que la reserva HAYA CAMBIADO DE ESTADO entre que
// la pagina se pinto y que el operador pulso el boton. La Task 8 de esta
// tanda decidio no usar un temporizador de cliente, asi que una pantalla
// abierta hace un rato puede estar desfasada. Es una CARRERA -entre dos
// operadores en dos mostradores, el mismo operador con dos pestañas, o un
// operador pulsando un boton sobre una reserva que otro ya movio con
// cualquiera de los otros tres-, no un error de nadie.
//
// EL CASO "LAS DOS ESCRITURAS LLEGAN AL MISMO VALOR" -dos operadores
// pulsando "Producto entregado" casi a la vez sobre la misma reserva- NO cae
// en este rechazo: el propio trigger lo deja pasar sin excepcion
// -`if new.status = old.status then return new`, linea 33 del mismo
// archivo-, asi que la segunda pulsacion recibe HTTP 200 sin ningun cambio
// real, no un error. El rechazo solo aparece cuando la reserva tomo un
// camino DISTINTO -por ejemplo, otro operador ya la marco `not_picked_up` o
// `not_returned` antes de que esta pulsacion llegara-.
//
// Cancelar sin motivo (`Cancelar exige un motivo`) y la falta de GRANT sobre
// una columna (`permission denied for table inventory_reservations`) son
// INALCANZABLES desde aca: ninguna de las dos acciones de este archivo
// escribe `cancellation_reason` ni ninguna columna sin GRANT -solo `status`,
// que si lo tiene-. Si cualquiera de esos dos apareciera en pantalla, seria
// un DEFECTO en otro sitio, y el mensaje crudo lo dice mejor que uno bonito
// que lo disimularia.
//
// Los textos EXACTOS y su SQLSTATE que llegan por PostgREST, tal como
// `error.code` y `error.message` -contra el stack local, con un JWT de
// operador firmado a mano, el 2026-08-12-:
//   - transicion invalida: code "23514", ej.
//     "Transicion no permitida: reserved -> completed", HTTP 400.
//   - cancelar sin motivo: code "23514", "Cancelar exige un motivo", HTTP 400.
//   - columna sin GRANT (probado con `purpose`): code "42501",
//     "permission denied for table inventory_reservations", HTTP 403.
function mensajeDeRechazoMostrador(mensajeDelMotor: string): string {
  const PREFIJO_TRANSICION = 'Transicion no permitida:';
  if (mensajeDelMotor.startsWith(PREFIJO_TRANSICION)) {
    return 'Esta reserva ya cambió de estado, probablemente porque otro operador la actualizó primero. Actualiza la página para ver su estado actual.';
  }

  return mensajeDelMotor;
}

// El UPDATE compartido entre entregar(), recibir() y marcarNoRecogida(): las
// tres hacen EXACTAMENTE lo mismo -escribir `status` sobre una fila de
// `inventory_reservations` y revalidar `/mostrador`- y solo cambian el valor
// destino. `status` se tipa como el subconjunto de TRES valores que esta
// funcion puede escribir SIN NINGUNA PRECONDICION previa, no como el enum
// completo de seis.
//
// `not_picked_up` SI entra en ese subconjunto -una version anterior de este
// comentario decia lo contrario, y era falso-: F5 no le exige ninguna
// anotacion, solo a `not_returned` -"«No se devolvio» fuerza una anotacion
// de alerta roja", MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md:142-, asi que
// marcar `reserved -> not_picked_up` es tan simple como entregar() o
// recibir(): un UPDATE y ya, sin nada que hacer antes.
//
// `not_returned` SI se queda afuera, y esta vez a proposito: esa transicion
// SI tiene una precondicion real -el INSERT de la nota obligatoria tiene que
// terminar bien ANTES de que el UPDATE se dispare, ver marcarNoDevuelta() mas
// abajo-, asi que el contrato de esta funcion -"llamame y la transicion queda
// completa y a salvo, sin nada pendiente"- seria FALSO para ese valor.
// Sacarlo del tipo evita que una llamada futura a moverEstado() escriba
// `not_returned` sin haber pasado antes por esa anotacion: ni siquiera se le
// da la oportunidad al tipo. marcarNoDevuelta() no reutiliza esta funcion
// por eso, y repite su forma -mismo `.update()`, misma traduccion de
// mensaje, mismo `revalidatePath`- con la precondicion delante.
async function moverEstado(
  reservationId: string,
  status: 'active' | 'completed' | 'not_picked_up',
): Promise<ResultadoMostrador> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('inventory_reservations')
    .update({ status })
    .eq('id', reservationId);

  if (error) {
    return { error: mensajeDeRechazoMostrador(error.message) };
  }

  // `revalidatePath` y no `redirect`: el personal YA esta en /mostrador
  // cuando entrega o recibe -el boton vive dentro de esa misma pantalla,
  // montado por TarjetaMostrador-, asi que no hay a donde llevarlo. Mismo
  // patron que cancelar() en lib/reservas/acciones.ts.
  revalidatePath('/mostrador');

  return null;
}

// `reserved -> active`. El boton "Producto entregado" en
// components/mostrador/tarjeta-mostrador.tsx solo se ofrece sobre una
// reserva en `reserved` (columna "Por entregar"), asi que en el uso normal
// esta funcion siempre pide una transicion valida.
export async function entregar(reservationId: string): Promise<ResultadoMostrador> {
  return moverEstado(reservationId, 'active');
}

// `active -> completed`. El boton "Producto devuelto" se ofrece sobre una
// reserva en `active` (columnas "Activas" y "Por devolver" -las dos son
// `active`, solo cambia si `fin` ya paso, lib/mostrador/columnas.ts-).
export async function recibir(reservationId: string): Promise<ResultadoMostrador> {
  return moverEstado(reservationId, 'completed');
}

// `reserved -> not_picked_up`, la primera de las dos faltas (Task 6, "la
// tarea delicada de la tanda": es la primera vez que el proyecto sanciona a
// una persona de verdad). El boton "No se retiro" en
// components/mostrador/tarjeta-mostrador.tsx, dentro del dialogo de
// confirmacion de components/mostrador/dialogo-falta.tsx, solo se ofrece
// sobre una reserva en `reserved` (columna "Por entregar") y solo despues de
// que ese dialogo lo confirme explicitamente.
//
// SIN anotacion: a diferencia de marcarNoDevuelta() de mas abajo, F5 no
// fuerza ninguna nota para esta falta -solo para "No se devolvio"-, asi que
// es un UPDATE tan simple como entregar() o recibir(), y por eso SI pasa por
// moverEstado(). La sancion -15 dias si es la SEGUNDA `not_picked_up` del
// mismo alumno en los ultimos 90 dias, contra `updated_at`- la aplica el
// trigger `apply_penalties`
// (supabase/migrations/20260806013146_penalties.sql:35-48) por su cuenta:
// este codigo no calcula nada de eso, solo pide la transicion. La PRIMERA
// falta no sanciona -el trigger exige `v_count >= 2`, linea 44 del mismo
// archivo-, asi que tras una unica `not_picked_up` `banned_until` se queda
// en `NULL`; ya esta medido asi en el Step 0 de la Task 4 de esta tanda.
export async function marcarNoRecogida(reservationId: string): Promise<ResultadoMostrador> {
  return moverEstado(reservationId, 'not_picked_up');
}

// `active -> not_returned`, la segunda falta (Task 6) y la unica accion de
// este archivo con una sancion PERMANENTE: `apply_penalties` pone
// `banned_until = 'infinity'` sin condicion, linea 30-33 del mismo archivo
// de arriba -a diferencia de `not_picked_up`, que exige una segunda vez-.
// Solo `admin_set_ban`, de admin, puede revertirlo: esta pantalla no ofrece
// ninguna forma de deshacer el propio error del operador, y eso es a
// proposito, no un hueco (Step 6 del plan).
//
// `unidadId` llega por parametro y NO se consulta aca: ReservaMostrador
// (lib/mostrador/consultas.ts) ya trae `unidadId` -la FK cruda `unit_id`-,
// asi que quien ya tiene el dato -la tarjeta, via dialogo-falta.tsx- se lo
// pasa directo, sin que esta funcion tenga que volver a leerlo de la base.
// La Task 4 lo agrego anticipando anotar() (Task 7), no esta funcion -asi lo
// dice su propio comentario en consultas.ts, y una version anterior de estas
// lineas se lo atribuia a la Task 6-. Que sirva tambien aca es porque las dos
// escriben en la misma tabla, no porque estuviera previsto para esto.
//
// ORDEN DECIDIDO EN EL PLAN Y NO REABIERTO AQUI
// (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md, "Task 6 - Las dos faltas"):
// PRIMERO el INSERT de la nota obligatoria que pide F5 -"«No se devolvio»
// fuerza una anotacion de alerta roja",
// MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md:142-, DESPUES el UPDATE de
// `status`. La API REST de Supabase no da una transaccion entre dos
// llamadas del cliente -a diferencia de una funcion SQL, que corre entera
// dentro de una sola-, asi que las dos escrituras pueden fallar por
// separado, y el orden decide cual es el peor caso:
//
//   - CON ESTE ORDEN (nota primero): si el INSERT falla, la funcion
//     devuelve el error de inmediato y el UPDATE de status NUNCA se
//     ejecuta -la sancion no se dispara-. El peor caso es una falta SIN
//     marcar, que el operador puede reintentar sin que nada se haya
//     escrito a medias.
//   - AL REVES (status primero): si el UPDATE tuviera exito y el INSERT de
//     la nota fallara despues, quedaria un alumno BLOQUEADO -en este caso,
//     de forma PERMANENTE- sin ningun rastro escrito de POR QUE. Ni el
//     operador que lo hizo ni el admin que revise despues con
//     `admin_set_ban` sabrian que paso con el equipo.
//
// El primer caso es un error recuperable; el segundo es una persona
// sancionada a ciegas. Por eso nota primero, estado despues, siempre.
//
// El INSERT compartido entre marcarNoDevuelta() (mas abajo) y anotar() (al
// final del archivo): las DOS hacen exactamente el mismo `INSERT` sobre
// `inventory_unit_notes`, con las mismas columnas y el mismo recorte, y solo
// cambia QUIEN las llama y CUANDO. Hasta esta Task 7 vivia escrito una unica
// vez, dentro de marcarNoDevuelta(): con un solo consumidor, extraerlo
// habria sido la misma sobre-generalizacion que dialogo-cancelar.tsx (T2B)
// ya evito una vez -adivinar un segundo caso antes de que exista-. El Step 3
// de la Task 7 del plan (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md) lo dice
// de forma literal: "la escritura que Task 6 hace dentro de
// marcarNoDevuelta() es un caso particular de la misma tabla, no una tabla
// distinta; si conviene compartir codigo entre las dos, se extrae aqui, no
// antes -la misma regla que ya aplico dialogo-cancelar.tsx sobre
// generalizar con un unico caso real". Con anotar() como segundo
// consumidor, este es exactamente ese momento previsto, no antes.
//
// Se define ANTES de marcarNoDevuelta() -no despues- por la MISMA
// convencion que ya sigue moverEstado() con entregar(), recibir() y
// marcarNoRecogida() mas arriba en este archivo: el helper privado precede
// a sus consumidores.
async function insertarNota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  unidadId: string,
  nota: string,
): Promise<{ error: string | null }> {
  // Recortada -mismo motivo que motivo.trim() en cancelar()
  // (lib/reservas/acciones.ts): cada llamador ya valida por su cuenta que la
  // nota no quede vacia tras `trim()` -el dialogo de dialogo-falta.tsx, para
  // marcarNoDevuelta(); anotar() mismo, para su propio caso, mas abajo-,
  // pero esto es la misma regla aplicada una segunda vez del lado del
  // servidor, por si algo llega hasta aca sin pasar por esa validacion.
  // `note` es `text not null` sin ningun `CHECK` que rechace una cadena
  // vacia -IGUAL que `cancellation_reason`, que tampoco lo tiene-, asi que
  // sin este recorte una nota de solo espacios pasaria el INSERT tal cual,
  // con los espacios dentro.
  const notaRecortada = nota.trim();

  // Columnas EXACTAS `(unit_id, note)`, y nada mas -ni `created_by`: el
  // DEFAULT `auth.uid()` lo rellena solo, y el GRANT de INSERT de
  // `inventory_unit_notes` NI SIQUIERA ENUMERA esa columna
  // (`grant insert (unit_id, note) on public.inventory_unit_notes to
  // authenticated`, supabase/migrations/20260805195549_traceability.sql:26).
  // Mandar `created_by` a proposito da HTTP 403 con `42501` -medido por
  // PostgREST contra el stack local, el 2026-08-12-, asi que ni conviene
  // intentarlo.
  const { error } = await supabase
    .from('inventory_unit_notes')
    .insert({ unit_id: unidadId, note: notaRecortada });

  return { error: error?.message ?? null };
}

// NO PASA POR moverEstado(): a proposito, no un descuido. Esa funcion
// asume que su UNICA responsabilidad es escribir `status` y revalidar -un
// UPDATE SIN ninguna precondicion previa-, y ese contrato es FALSO para
// `not_returned`: esta transicion exige que el INSERT de arriba
// -insertarNota()- haya terminado bien ANTES de que el UPDATE se dispare, y
// por eso el tipo de moverEstado() ya no admite este valor (ver su
// comentario). El UPDATE de aca abajo repite la forma de esa funcion -mismo
// `.update()`, misma traduccion de mensaje via mensajeDeRechazoMostrador(),
// mismo `revalidatePath`- porque es exactamente lo mismo que hace esa
// funcion, solo que con una precondicion que su tipo ya no puede admitir.
//
// El INSERT de la nota YA NO ESTA ESCRITO ACA: vive en insertarNota(), justo
// arriba de esta funcion. La Task 7 lo extrajo -ver su comentario para el
// porque y el cuando-; esta funcion sigue haciendo EXACTAMENTE lo mismo que
// hacia antes de la extraccion, solo que a traves del helper.
export async function marcarNoDevuelta(
  reservationId: string,
  unidadId: string,
  nota: string,
): Promise<ResultadoMostrador> {
  const supabase = await createClient();

  const { error: errorNota } = await insertarNota(supabase, unidadId, nota);

  // SIN mensajeDeRechazoMostrador(): esa funcion traduce mensajes del
  // TRIGGER DE LA MAQUINA DE ESTADOS sobre `inventory_reservations`, y esto
  // es un error de OTRA tabla -`inventory_unit_notes`- con otro origen
  // posible. En el uso normal esta rama es inalcanzable -el boton de
  // dialogo-falta.tsx ya exige la nota no vacia tras `trim()`, y la politica
  // `unit_notes_insert_staff` (`private.is_staff()`,
  // supabase/migrations/20260805195549_traceability.sql:40-42) ya deja
  // pasar a cualquier operador o admin activo-, asi que si algo cae aca es
  // un DEFECTO en otro sitio -o una cuenta de personal que dejo de estar
  // activa entre que abrio el mostrador y este clic-, y el mensaje crudo lo
  // dice mejor que uno bonito que lo disimularia.
  if (errorNota) {
    return { error: errorNota };
  }

  const { error: errorEstado } = await supabase
    .from('inventory_reservations')
    .update({ status: 'not_returned' })
    .eq('id', reservationId);

  if (errorEstado) {
    return { error: mensajeDeRechazoMostrador(errorEstado.message) };
  }

  // Mismo motivo que moverEstado(): el personal YA esta en /mostrador, asi
  // que revalidar y no redirigir.
  revalidatePath('/mostrador');

  return null;
}

// `anotar(unitId, nota)`, Task 7 de la tanda 3A: el punto de entrada GENERAL
// para dejar una anotacion en el historial de una unidad, no solo al marcar
// "No se devolvio". F5 lo pide asi -"Toda accion admite adjuntar una
// anotacion a la unidad, que se guarda en el historial",
// MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md:141- y el Step 3 del plan lo
// dice igual: el INSERT de marcarNoDevuelta() de arriba es UN CASO
// PARTICULAR de la misma tabla, no una tabla distinta.
//
// RECHAZA CON UN ERROR PROPIO si la nota queda vacia tras `trim()` -barrera
// de SERVIDOR, igual que cancelar() en lib/reservas/acciones.ts es una
// barrera de servidor y no solo del dialogo que la invoca-, pero por un
// MECANISMO distinto al de cancelar(): esa funcion delega el rechazo en el
// propio motor -`cancel_reservation` hace `raise exception 'La cancelacion
// exige un motivo' using errcode = 'check_violation'` cuando el motivo llega
// vacio, supabase/migrations/20260806012057_cancel_reservation_rpc.sql:27;
// es un `raise` con ese SQLSTATE, NO una restriccion `CHECK` de tabla, y
// buscar una restriccion no la encontraria-. `note` no tiene ni una cosa ni
// la otra (ver el comentario de insertarNota() mas arriba). Sin esta comprobacion aca, una nota vacia pasaria el INSERT sin
// ningun error y quedaria guardada como una cadena vacia en el historial de
// la unidad: un registro sin contenido, indistinguible en la base de un
// fallo silencioso de la interfaz.
//
// SIN mensajeDeRechazoMostrador(): esa funcion traduce mensajes del TRIGGER
// DE LA MAQUINA DE ESTADOS sobre `inventory_reservations`, y esta accion ni
// siquiera toca esa tabla -escribe unicamente en `inventory_unit_notes`.
// Mensaje crudo del INSERT, el mismo criterio que ya aplica la rama de error
// de marcarNoDevuelta() de mas arriba.
export async function anotar(unitId: string, nota: string): Promise<ResultadoMostrador> {
  if (nota.trim() === '') {
    return { error: 'La nota no puede quedar vacía.' };
  }

  const supabase = await createClient();

  const { error } = await insertarNota(supabase, unitId, nota);

  if (error) {
    return { error };
  }

  // Mismo motivo que moverEstado() y marcarNoDevuelta(): el personal YA esta
  // en /mostrador, asi que revalidar y no redirigir.
  revalidatePath('/mostrador');

  return null;
}
