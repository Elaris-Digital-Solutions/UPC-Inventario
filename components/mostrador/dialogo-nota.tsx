"use client";

// El punto de entrada GENERAL de `inventory_unit_notes`: anotar CUALQUIER unidad
// desde el mostrador, no solo al marcar una falta.
//
// CIERRA A MANO TRAS EL EXITO, al reves que dialogo-falta.tsx, y es la misma
// propiedad estructural mirada al reves: alli las acciones mueven la reserva a un
// estado terminal y la tarjeta entera se DESMONTA con el dialogo dentro. Aqui
// anotar() no toca `inventory_reservations`, asi que la tarjeta sigue montada y
// el dialogo seguiria abierto con el texto ya enviado dentro.
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
import { HistorialNotas } from "@/components/mostrador/historial-notas";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { anotar, type ResultadoMostrador } from "@/lib/mostrador/acciones";
import type { NotaUnidad } from "@/lib/mostrador/notas";

type DialogoNotaProps = {
  unidadId: string;
  // El CODIGO y no el objeto entero: quien ya tiene el dato resuelto se lo pasa.
  // Se usa solo para el titulo.
  unidad: string;
  notas: NotaUnidad[];
  // La ruta a revalidar: /admin/inventario/[id] tambien monta este dialogo, y sin
  // esto anotar() refrescaria /mostrador, que el admin no esta mirando.
  ruta?: string;
};

export function DialogoNota({ unidadId, unidad, notas, ruta }: DialogoNotaProps) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idNota = useId();

  // Barrera del CLIENTE: anotar() repite la misma regla en el SERVIDOR.
  const notaVacia = nota.trim() === "";

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado: ResultadoMostrador = await anotar(unidadId, nota, ruta);

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      // Ver la cabecera: aqui la tarjeta sigue montada, asi que este componente
      // limpia su propio estado o invitaria a reenviar la nota por error.
      setNota("");
      setAbierto(false);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Anotar unidad
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Notas de {unidad}</DialogTitle>
          {/* EL AVISO CAMBIO EL 2026-08-15, y lo que lo hizo cambiar fue una
              migracion, no una opinion. Hasta esa fecha estaba MEDIDO que un
              JWT de alumno leyendo `inventory_unit_notes` recibia HTTP 200
              con las notas, porque la politica `unit_notes_select_auth` era
              `for select to authenticated using (true)`
              (supabase/migrations/20260805195549_traceability.sql:37-38) -
              sin ningun recorte por rol ni por unidad-. Eso era Q-18, y lo
              cerro la migracion 25
              (supabase/migrations/20260815190010_unit_notes_staff_only.sql)
              con D-69: hoy la politica se llama `unit_notes_select_staff` y
              su USING es `(select private.is_staff())`.
              POR ESO SE VA LA MITAD DE PRIVACIDAD Y SE QUEDA LA DE
              TRAZABILIDAD. Prometer que la lee cualquiera con sesion seria
              hoy FALSO. Pero la nota sigue siendo permanente y atada a la
              unidad -D-2 quedo ACOTADO, no revocado-, y esa mitad es la que
              hace que el operador piense antes de escribir. */}
          <DialogDescription>
            Queda en el historial del equipo, con la fecha, y no se puede deshacer. La leen el
            personal del mostrador y los administradores.
          </DialogDescription>
        </DialogHeader>

        <HistorialNotas notas={notas} />

        <div>
          <Label htmlFor={idNota}>Nueva nota</Label>
          <Textarea
            id={idNota}
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
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

          <Button type="button" disabled={pendiente || notaVacia} onClick={confirmar}>
            {pendiente ? "Guardando…" : "Guardar nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
