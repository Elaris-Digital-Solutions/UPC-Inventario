"use client";

// El dialogo para anotar una unidad, Task 7 de la tanda 3A: el punto de
// entrada GENERAL de `inventory_unit_notes` -anotar CUALQUIER unidad desde
// el mostrador, no solo al marcar "No se devolvio" (dialogo-falta.tsx,
// Task 6, que escribe en la misma tabla como un caso particular)-.
//
// SOBRE components/ui/dialog.tsx: SEGUNDO consumidor propio, despues de
// dialogo-falta.tsx -cuyo comentario ya explica por que este es el momento
// de usar el envoltorio comun en vez del patron ad hoc de
// dialogo-cancelar.tsx (T2B)-. Misma forma: ni el trigger ni DialogClose se
// envuelven con `asChild` alrededor de un `<Button>`, y los dos se pintan
// con `buttonVariants` directo.
//
// OJO CON EL PORQUE, que cambio el 2026-08-12 y una version anterior de
// estas lineas daba por vigente: la razon original era que Button
// (components/ui/button.tsx) no usa `React.forwardRef` y NADIE habia
// confirmado en un navegador que esa cadena no dejara una advertencia en
// consola. **Ya esta confirmado que NO la deja.** Se midio al cerrar la
// Task 6, contra `npm run dev` y con un dialogo abierto: cero advertencias,
// y eso cubre el caso porque `DialogContent` monta por su cuenta un
// `DialogPrimitive.Close asChild` alrededor de un `<Button>`
// (components/ui/dialog.tsx:70-81, con `showCloseButton` en `true` por
// defecto). Ver "Task 6 · Cierre" en el plan. Asi que hoy esto NO se evita
// por riesgo: se escribe asi porque los otros dos dialogos del proyecto ya
// lo hacen y no hay motivo para divergir.
//
// LA DIFERENCIA IMPORTANTE CON dialogo-falta.tsx, y hay que dejarla escrita
// porque es la MISMA propiedad estructural mirada al reves, no una
// inconsistencia entre los dos archivos: aquel dialogo NUNCA cierra a mano
// -sin `setAbierto(false)`- porque las dos acciones que dispara mueven la
// reserva a un estado TERMINAL y TarjetaMostrador entera se DESMONTA,
// llevandose consigo el dialogo y su `abierto = true`. ACA no pasa nada de
// eso: anotar() no toca `inventory_reservations` ni ningun estado de
// reserva, asi que la tarjeta sigue montada despues de guardar una nota, y
// este dialogo SEGUIRIA ABIERTO -con el texto ya enviado todavia escrito en
// el campo- si nadie lo cerrara. Por eso, y SOLO aca, el exito SI limpia el
// campo y cierra el dialogo a mano.
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
  // El CODIGO de la unidad, no el objeto entero: mismo criterio que
  // `alumno` en DialogoFaltaProps (dialogo-falta.tsx) -quien ya tiene el
  // dato resuelto se lo pasa, en vez de que este dialogo vuelva a leerlo-.
  // Se usa solo para el titulo.
  unidad: string;
  notas: NotaUnidad[];
  // La ruta a revalidar tras guardar. Agregada por la Task 3 de la tanda 3B,
  // que reutiliza este dialogo desde /admin/inventario/[id]: sin esto,
  // anotar() refrescaria /mostrador -- una pantalla que el admin no esta
  // mirando -- y dejaria rancia la que si. Con valor por defecto para que el
  // mostrador siga llamandolo igual que en la T3A.
  ruta?: string;
};

export function DialogoNota({ unidadId, unidad, notas, ruta }: DialogoNotaProps) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idNota = useId();

  // Deshabilitado mientras la nota este vacia TRAS `trim()`, mismo patron
  // que `notaFalta` en dialogo-falta.tsx: es la barrera del CLIENTE, y
  // anotar() (lib/mostrador/acciones.ts) repite la misma regla del lado del
  // SERVIDOR por si algo llega hasta alla sin pasar por este boton.
  const notaVacia = nota.trim() === "";

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado: ResultadoMostrador = await anotar(unidadId, nota, ruta);

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      // A DIFERENCIA de dialogo-falta.tsx -ver el comentario de cabecera de
      // este archivo-: aca la tarjeta sigue montada, asi que este
      // componente tiene que limpiar su propio estado. Sin esto, el dialogo
      // se quedaria abierto con la nota ya guardada todavia escrita en el
      // campo, invitando a reenviarla por error.
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
          {/* Este aviso NO es decorativo: esta MEDIDO que un JWT de alumno
              leyendo `inventory_unit_notes` recibe HTTP 200 con las notas,
              porque la politica `unit_notes_select_auth` es
              `for select to authenticated using (true)`
              (supabase/migrations/20260805195549_traceability.sql:37-38) -
              sin ningun recorte por rol ni por unidad. Un alumno no tiene
              hoy forma de LLEGAR a esta pantalla -`/mostrador` vive detras
              del layout de `app/(personal)/`, que exige `staff_members`-,
              pero el dato en si no esta protegido por RLS mas alla de
              "tener sesion", asi que el aviso tiene que decirlo con esa
              fuerza y no como una formalidad. */}
          <DialogDescription>
            Queda en el historial del equipo, con la fecha. Cualquier persona con sesión puede leer
            esta nota, así que no escribas datos personales de un alumno.
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
