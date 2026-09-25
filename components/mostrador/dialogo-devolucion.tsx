"use client";

// "Producto devuelto" con nota OPCIONAL (F5: "toda accion admite adjuntar una
// anotacion"). La nota queda atada a la reserva, y por eso aparece en su fila de
// /admin/reservas ademas de en el historial de la unidad.
//
// ARCHIVO PROPIO y no un tercer `tipo` de dialogo-falta.tsx: aquel es una
// sancion -boton destructivo, nota obligatoria en un caso- y esto es el cierre
// normal de un prestamo.
//
// SIN `setAbierto(false)` tras el exito, igual que dialogo-falta.tsx: la reserva
// pasa a `completed`, sale del mostrador y la tarjeta se desmonta con el dialogo.
import { useId, useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { recibir } from "@/lib/mostrador/acciones";

type DialogoDevolucionProps = {
  reservationId: string;
  unidadId: string;
  unidad: string;
  alumno: string;
};

export function DialogoDevolucion({ reservationId, unidadId, unidad, alumno }: DialogoDevolucionProps) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idNota = useId();

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await recibir(reservationId, unidadId, nota);
      if (resultado?.error) {
        setError(resultado.error);
      }
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants({ size: "sm" })}>Producto devuelto</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar devolución de {unidad}</DialogTitle>
          <DialogDescription>
            {alumno} devuelve el equipo. Si vuelve con algún detalle, anótalo: queda en el
            historial de la unidad y de esta reserva, y lo leen el personal del mostrador y los
            administradores.
          </DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor={idNota}>Nota (opcional)</Label>
          <Textarea
            id={idNota}
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            // El CHECK `unit_notes_note_largo` de H-1.
            maxLength={500}
            className="mt-1"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "ghost" })}>Volver</DialogClose>

          <Button type="button" disabled={pendiente} onClick={confirmar}>
            {pendiente ? "Recibiendo…" : "Confirmar devolución"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
