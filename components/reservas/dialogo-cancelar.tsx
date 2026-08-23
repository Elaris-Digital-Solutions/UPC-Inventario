"use client";

// El dialogo de cancelacion: motivo obligatorio (BR-17).
//
// EN SU PROPIO ARCHIVO por la frontera servidor/cliente: necesita estado y
// useActionState, y TarjetaReserva es un Server Component.
//
// CONSTRUIDO SOBRE `radix-ui` DIRECTO y no sobre components/ui/dialog.tsx, que
// nacio despues: cuando se escribio habia un UNICO consumidor de un dialogo modal
// en el proyecto, y generalizar con un solo caso real es adivinar.
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

// Ni Trigger ni Close se envuelven con `asChild` alrededor de <Button>: Button no
// usa `React.forwardRef`, y los dos ya renderizan su propio <button> nativo, asi
// que basta con pintarlos con `buttonVariants`. Mismo patron en los otros
// dialogos del proyecto.
export function DialogoCancelar({ reservationId, producto }: DialogoCancelarProps) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [estado, accionFormulario, pendiente] = useActionState<EstadoReserva, FormData>(
    cancelar,
    null,
  );
  const idMotivo = useId();

  // SE CIERRA SOLO tras cancelar bien, sin `setAbierto(false)` a mano: el exito
  // revalida /mi-panel, la reserva pasa a `cancelled`, seOfreceCancelar() deja de
  // devolver `true` y React DESMONTA esta tarjeta para montar otra en
  // "Anteriores". Este componente desaparece con ella, y su `abierto` con el.
  //
  // Es una propiedad ESTRUCTURAL del arbol, no algo medido en un navegador.
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
                extraer nada todavia-.

                CON `maxLength` DESDE EL 2026-08-23, y antes NO. Hasta esa
                fecha este comentario decia que ponerlo seria "la interfaz
                inventando una regla que el motor no tiene", y era CIERTO
                cuando se escribio: medido el 2026-08-11, el unico `CHECK` de
                `inventory_reservations` era `chk_reservation_dates`
                (`end_at > start_at`). Lo que cambio no es la medida sino el
                esquema: la migracion `20260823145500_topes_de_texto.sql`
                anadio `reservations_motivo_largo`, que limita esta columna a
                300 caracteres. Ahora el 300 de abajo NO inventa nada -copia.

                Y SIGUE SIN SER EL CONTROL. El tope que cuenta es el del motor,
                que se cumple aunque nadie pase por este formulario; este
                atributo es cortesia, para que quien escriba vea el limite en
                vez de llevarse un 23514 con el parrafo ya escrito. Si los dos
                numeros se separan alguna vez, manda el de la migracion. */}
            <Input
              id={idMotivo}
              name="motivo"
              type="text"
              maxLength={300}
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
