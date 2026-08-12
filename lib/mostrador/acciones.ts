'use server';

// Las Server Actions del mostrador, Task 5 de la tanda 3A: HOY solo dos,
// entregar() y recibir(). marcarNoRecogida(), marcarNoDevuelta() (Task 6) y
// anotar() (Task 7) se agregan a este mismo archivo despues -el plan
// (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md, "Estructura de archivos") ya
// describe este archivo entero como "entregar, recibir, las dos faltas,
// anotar", asi que agregarlas aca no es una sorpresa de alcance.

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
// por descuido: la tarjeta (components/mostrador/tarjeta-mostrador.tsx) solo
// ofrece "Producto entregado" sobre una reserva `reserved` y "Producto
// devuelto" sobre una `active`, asi que este codigo nunca PIDE una
// transicion que la maquina de estados rechace... salvo que la reserva HAYA
// CAMBIADO DE ESTADO entre que la pagina se pinto y que el operador pulso el
// boton. La Task 8 de esta tanda decidio no usar un temporizador de
// cliente, asi que una pantalla abierta hace un rato puede estar desfasada.
// Es una CARRERA -entre dos operadores en dos mostradores, el mismo
// operador con dos pestañas, o la Task 6 marcando una falta sobre la misma
// reserva mientras esta pantalla seguia mostrando el boton viejo-, no un
// error de nadie.
//
// EL CASO "LAS DOS ESCRITURAS LLEGAN AL MISMO VALOR" -dos operadores
// pulsando "Producto entregado" casi a la vez sobre la misma reserva- NO cae
// en este rechazo: el propio trigger lo deja pasar sin excepcion
// -`if new.status = old.status then return new`, linea 33 del mismo
// archivo-, asi que la segunda pulsacion recibe HTTP 200 sin ningun cambio
// real, no un error. El rechazo solo aparece cuando la reserva tomo un
// camino DISTINTO -por ejemplo, otro operador ya la marco `not_picked_up` o
// `not_returned` (Task 6) antes de que esta pulsacion llegara-.
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

// El UPDATE compartido entre entregar() y recibir(): las dos hacen
// EXACTAMENTE lo mismo -escribir `status` sobre una fila de
// `inventory_reservations` y revalidar `/mostrador`- y solo cambian el valor
// destino. `status` se tipa como el subconjunto de dos valores que este
// archivo necesita, no como el enum completo de seis: escribir aca
// `not_picked_up` o `not_returned` seria saltarse la anotacion obligatoria
// que la Task 6 exige para esas dos, asi que ni siquiera se le da la
// oportunidad al tipo.
async function moverEstado(
  reservationId: string,
  status: 'active' | 'completed',
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
