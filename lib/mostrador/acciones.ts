'use server';

// Server Actions del mostrador: entregar, recibir, las dos faltas, anotar.
//
// UPDATE DIRECTO sobre `inventory_reservations` y NUNCA una RPC, al contrario
// que las acciones del alumno. No es que un UPDATE sea seguro en abstracto: es
// que ACA hay una politica que le abre esa puerta a quien llama.
// `reservations_update_staff` exige `private.is_staff()`, que el personal
// cumple y el alumno no -su UPDATE afectaria cero filas EN SILENCIO, que es por
// lo que el alumno cancela por RPC-. La regla real es "cada rol usa la puerta
// que RLS le abre". Ver COMPORTAMIENTO_MEDIDO.md §1.1 y §2.
//
// TRADUCCION DE RECHAZOS, mismo criterio que en lib/reservas/acciones.ts: texto
// propio SOLO para lo alcanzable, crudo para lo demas, y lo no reconocido al
// crudo y nunca a un generico.

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type ResultadoMostrador = { error: string } | null;

// DESDE ESTA PANTALLA el UNICO rechazo alcanzable es la transicion invalida, y
// solo por una CARRERA: la tarjeta ofrece cada boton segun el estado que la
// pagina pinto, y esa pagina puede estar desfasada -no hay temporizador de
// cliente-. Dos operadores, dos pestañas, o uno pulsando sobre una reserva que
// otro ya movio.
//
// DOS PULSACIONES AL MISMO VALOR no caen aqui: el trigger las deja pasar sin
// excepcion, asi que la segunda recibe 200 sin cambio real. El rechazo solo
// aparece cuando la reserva tomo un camino DISTINTO.
//
// Cancelar sin motivo y la falta de GRANT son inalcanzables: ninguna accion de
// este archivo escribe `cancellation_reason` ni ninguna columna sin GRANT.
function mensajeDeRechazoMostrador(mensajeDelMotor: string): string {
  const PREFIJO_TRANSICION = 'Transicion no permitida:';
  if (mensajeDelMotor.startsWith(PREFIJO_TRANSICION)) {
    return 'Esta reserva ya cambió de estado, probablemente porque otro operador la actualizó primero. Actualiza la página para ver su estado actual.';
  }

  return mensajeDelMotor;
}

// El UPDATE compartido por entregar(), recibir() y marcarNoRecogida(): las tres
// escriben `status` y revalidan, y solo cambia el valor destino.
//
// EL TIPO ES EL SUBCONJUNTO DE TRES VALORES QUE SE PUEDEN ESCRIBIR SIN NINGUNA
// PRECONDICION, no el enum de seis. `not_returned` queda fuera a proposito: esa
// transicion exige que la nota obligatoria de F5 entre ANTES, asi que el
// contrato de esta funcion -"llamame y la transicion queda completa"- seria
// falso para ella. Sacarlo del tipo evita que una llamada futura la escriba sin
// pasar por esa anotacion.
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

  // `revalidatePath` y no `redirect`: el personal YA esta en la pantalla.
  revalidatePath('/mostrador');

  return null;
}

// `reserved -> active`.
export async function entregar(reservationId: string): Promise<ResultadoMostrador> {
  return moverEstado(reservationId, 'active');
}

// `active -> completed`.
export async function recibir(reservationId: string): Promise<ResultadoMostrador> {
  return moverEstado(reservationId, 'completed');
}

// `reserved -> not_picked_up`, la primera falta. SIN anotacion: F5 solo la
// fuerza para "No se devolvio".
//
// La sancion la aplica el trigger `apply_penalties`, no este codigo: 15 dias si
// es la SEGUNDA `not_picked_up` del alumno en 90 dias. La primera no sanciona.
export async function marcarNoRecogida(reservationId: string): Promise<ResultadoMostrador> {
  return moverEstado(reservationId, 'not_picked_up');
}

// El INSERT compartido por marcarNoDevuelta() y anotar().
async function insertarNota(
  supabase: Awaited<ReturnType<typeof createClient>>,
  unidadId: string,
  nota: string,
): Promise<{ error: string | null }> {
  // Recortada del lado del SERVIDOR aunque cada llamador ya valide: `note` es
  // `text not null` SIN ningun CHECK que rechace la cadena vacia, asi que sin
  // esto una nota de solo espacios pasaria el INSERT tal cual.
  const notaRecortada = nota.trim();

  // Columnas EXACTAS `(unit_id, note)`: `created_by` lo rellena el DEFAULT
  // auth.uid() y el GRANT ni la enumera. Mandarla da 403/42501.
  const { error } = await supabase
    .from('inventory_unit_notes')
    .insert({ unit_id: unidadId, note: notaRecortada });

  return { error: error?.message ?? null };
}

// `active -> not_returned`, la segunda falta y la unica con sancion PERMANENTE:
// `apply_penalties` pone `banned_until = 'infinity'` sin condicion. Solo
// `admin_set_ban` puede revertirlo; esta pantalla no ofrece deshacer, y es a
// proposito.
//
// NO PASA POR moverEstado() porque tiene una PRECONDICION: la nota entra
// primero. Repite su forma con esa precondicion delante.
//
// PRIMERO LA NOTA, DESPUES EL ESTADO, y el orden es lo que decide el peor caso
// -no hay transaccion entre dos llamadas del cliente-: asi un fallo deja la
// falta SIN marcar, recuperable; al reves dejaria a un alumno bloqueado DE
// FORMA PERMANENTE sin ningun rastro escrito de por que.
//
// `unidadId` llega por parametro: ReservaMostrador ya lo trae, asi que quien
// tiene el dato se lo pasa en vez de que esta funcion lo relea.
//
// `ruta` se PARAMETRIZA en vez de duplicar la accion: /admin/reservas tambien
// marca esta falta, y desde alli revalidar '/mostrador' refrescaria una pantalla
// que el admin no esta mirando mientras deja rancia la que si.
export async function marcarNoDevuelta(
  reservationId: string,
  unidadId: string,
  nota: string,
  ruta: string = '/mostrador',
): Promise<ResultadoMostrador> {
  const supabase = await createClient();

  const { error: errorNota } = await insertarNota(supabase, unidadId, nota);

  // SIN mensajeDeRechazoMostrador(): esa traduce el trigger de la maquina de
  // estados, y esto es un error de OTRA tabla. En el uso normal es inalcanzable,
  // asi que si algo cae aqui es un defecto en otro sitio -o una cuenta que dejo
  // de estar activa entre abrir el mostrador y este clic-.
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

  revalidatePath(ruta);

  return null;
}

// El punto de entrada GENERAL para anotar en el historial de una unidad, no solo
// al marcar una falta (F5: "toda accion admite adjuntar una anotacion").
//
// RECHAZA CON ERROR PROPIO la nota vacia, y hace falta: `note` no tiene ni CHECK
// de tabla ni `raise` en una RPC, asi que sin esto una nota vacia pasaria el
// INSERT sin error y quedaria en el historial como un registro sin contenido,
// indistinguible de un fallo silencioso de la interfaz.
//
// SIN mensajeDeRechazoMostrador(): esta accion ni siquiera toca
// `inventory_reservations`.
export async function anotar(
  unitId: string,
  nota: string,
  ruta: string = '/mostrador',
): Promise<ResultadoMostrador> {
  if (nota.trim() === '') {
    return { error: 'La nota no puede quedar vacía.' };
  }

  const supabase = await createClient();

  const { error } = await insertarNota(supabase, unitId, nota);

  if (error) {
    return { error };
  }

  revalidatePath(ruta);

  return null;
}
