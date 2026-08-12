"use client";

// El dialogo de cancelacion, Task 13 de la tanda 2B: un boton "Cancelar
// reserva" que abre un dialogo modal de Radix con el motivo obligatorio
// (BR-17, y linea 127 de MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md).
//
// Vive en su propio archivo, y no dentro de tarjeta-reserva.tsx, por la
// misma frontera servidor/cliente que separa calendario.tsx de la pagina que
// lo monta: este componente necesita estado -si el dialogo esta abierto, que
// escribio el alumno- y useActionState, y TarjetaReserva es un Server
// Component que no puede llevar ninguno de los dos. Y no se extrae a
// components/ui/dialog.tsx: hay un UNICO consumidor de un dialogo modal en
// todo el proyecto hasta ahora, este. Si la T3 del personal necesita otro
// -por ejemplo para inhabilitar un dia con reservas encima, BR-11-, ES
// ENTONCES cuando se extrae el envoltorio comun a components/ui/, no antes:
// generalizar con un unico caso real todavia no es generalizar, es adivinar.
import { useActionState, useId, useState } from "react";
import { Dialog } from "radix-ui";

import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cancelar, type EstadoReserva } from "@/lib/reservas/acciones";

type DialogoCancelarProps = {
  reservationId: string;
  // El nombre del producto, PEDIDO POR PROPS y no deducido aca: este
  // componente no tiene forma de leer la base -no es Server Component, y
  // aunque lo fuera, pedirle su propia consulta solo para el texto de un
  // dialogo duplicaria la fila que TarjetaReserva ya trajo de
  // misReservas()-. Quien ya tiene el dato se lo pasa.
  producto: string;
};

// Ni Dialog.Trigger ni Dialog.Close se envuelven con `asChild` alrededor de
// <Button>. Podria hacerse -es el patron habitual de shadcn-, pero Button
// (components/ui/button.tsx) NO usa `React.forwardRef`, y anidar un
// componente sin forwardRef dentro del `asChild` de OTRO componente depende
// de que React reenvie la prop `ref` a traves del `...props` que Button
// esparce sobre su elemento final. Nadie abrio un navegador para confirmar
// que esa cadena no deja una advertencia en consola -y la consola sin una
// sola advertencia es el criterio de cierre de este proyecto-, asi que se
// evita el riesgo por completo: Dialog.Trigger y Dialog.Close ya renderizan
// su propio <button> nativo -leido en
// node_modules/@radix-ui/react-dialog/dist/index.mjs, los dos usan
// `Primitive.button` con `type: "button"` por defecto-, y basta con pintarlo
// con las clases de `buttonVariants` en vez de anidar el componente.
export function DialogoCancelar({ reservationId, producto }: DialogoCancelarProps) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estado, accionFormulario, pendiente] = useActionState<EstadoReserva, FormData>(
    cancelar,
    null,
  );
  const idMotivo = useId();

  // Por que este dialogo se cierra solo tras cancelar bien, SIN ningun
  // useEffect ni `setAbierto(false)` a mano: cuando cancelar() termina con
  // exito llama a `revalidatePath('/mi-panel')`, y ese re-fetch trae la
  // reserva con `status = 'cancelled'`. app/(alumno)/mi-panel/page.tsx
  // reagrupa con grupoDeReserva() y esta reserva deja el array `proxima`
  // para pasar a `pasada`, ASI QUE la condicion de mas abajo en
  // tarjeta-reserva.tsx -hoy la llamada a seOfreceCancelar(),
  // lib/reservas/agrupar.ts; esta linea citaba la condicion inline vieja
  // `reserva.estado === "reserved" && grupo === "proxima"`, que la Task 3 de
  // la tanda 3A extrajo a esa funcion y amplio con un tercer termino- deja
  // de cumplirse: `cancelled` no es `reserved`, asi que el PRIMER termino ya
  // basta para que devuelva `false`. React no mueve ese TarjetaReserva de una
  // seccion a otra: lo desmonta donde estaba -ya no aparece en el array que
  // pinta "Proximas"- y monta uno nuevo, sin este dialogo, donde ahora
  // corresponde -"Anteriores"-. Este componente desaparece con el, y con el
  // desaparece tambien su `abierto = true`: no hay ningun estado que cerrar
  // a mano porque no queda ningun componente vivo que lo sostenga. Esto es
  // una propiedad ESTRUCTURAL de como esta escrito el arbol, no algo que se
  // haya medido en un navegador.
  return (
    <Dialog.Root open={abierto} onOpenChange={setAbierto}>
      <Dialog.Trigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Cancelar reserva
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 text-popover-foreground shadow-lg outline-none data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95">
          {/* Dialog.Title y Dialog.Description son OBLIGATORIOS aca dentro:
              sin ellos Radix escribe una advertencia en la consola -y la
              consola sin una sola advertencia es el criterio de cierre de
              este proyecto-. No son un adorno visual: son lo que un lector
              de pantalla anuncia al abrir el dialogo. */}
          <Dialog.Title className="font-heading text-lg">Cancelar reserva</Dialog.Title>
          <Dialog.Description className="text-muted-foreground mt-1 text-sm">
            {producto}. Esta acción no se puede deshacer.
          </Dialog.Description>

          <form action={accionFormulario} className="mt-4">
            <input type="hidden" name="reservationId" value={reservationId} />

            <label htmlFor={idMotivo} className="text-sm font-medium">
              Motivo de la cancelación
            </label>
            {/* `Input` de components/ui/input.tsx, ya existente y
                estilizado -NO un textarea nuevo, y NO
                components/ui/textarea.tsx: ver el comentario de arriba del
                archivo sobre por que un unico consumidor no justifica
                extraer nada todavia-. Y SIN `maxLength`: `cancellation_reason`
                es `text` sin ningun limite de longitud, y el UNICO `CHECK` de
                `inventory_reservations` es `chk_reservation_dates`
                (`end_at > start_at`), que no tiene nada que ver con el
                motivo. MEDIDO el 2026-08-11 contra el stack local, sobre
                `information_schema.columns` y `pg_constraint` -y NO leido de
                MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md, que es donde una
                version anterior de este comentario decia haberlo leido: esa
                especificacion solo dice, en su linea 127, que la razon "se
                guarda en `cancellation_reason`", y no dice ni el tipo de la
                columna ni que no tenga `CHECK`-. Poner un limite aca seria la
                interfaz inventando una regla que el motor no tiene. */}
            <Input
              id={idMotivo}
              name="motivo"
              type="text"
              autoComplete="off"
              value={motivo}
              onChange={(evento) => setMotivo(evento.target.value)}
              className="mt-1"
            />

            {estado?.error && (
              <p
                role="alert"
                className="bg-destructive/10 text-destructive mt-3 rounded-lg px-3 py-2 text-sm"
              >
                {estado.error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <Dialog.Close type="button" className={buttonVariants({ variant: "ghost" })}>
                No, mantener reserva
              </Dialog.Close>

              {/* Deshabilitado mientras el motivo este vacio TRAS `trim()`
                  -no basta con que tenga longitud mayor que cero-, porque
                  un motivo de solo espacios pasaria esta comprobacion si
                  solo mirara la longitud. lib/reservas/acciones.ts explica
                  con mas detalle, en el comentario de cancelar(), por que
                  esto importa: es lo que mantiene inalcanzable desde esta
                  pantalla el rechazo #1 de la RPC ("La cancelacion exige un
                  motivo"). */}
              <Button
                type="submit"
                variant="destructive"
                disabled={motivo.trim() === "" || pendiente}
              >
                {pendiente ? "Cancelando…" : "Confirmar cancelación"}
              </Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
