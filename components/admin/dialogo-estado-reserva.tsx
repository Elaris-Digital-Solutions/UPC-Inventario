"use client";

// Los dos cambios de estado de /admin/reservas que exigen escribir algo antes de
// aplicarse: cancelar -motivo, F6- y "No se devolvio" -la nota de F5-. Los otros
// tres salen del desplegable directo, porque no piden nada.
//
// EL SEGUNDO NO LO EXIGE F6, y se añadio a proposito: "No se devolvio" bloquea al
// alumno de forma PERMANENTE, y aplicarlo desde un desplegable sin nota dejaria a
// esa persona sancionada sin ningun rastro escrito de por que.
//
// UN UNICO COMPONENTE PARAMETRIZADO: hay DOS casos desde el primer dia, con la
// misma forma -dialogo modal, textarea obligatorio, confirmacion, useTransition-
// y textos distintos.
//
// CONTROLADO DESDE FUERA -`abierto` y `onCambioApertura` por props, sin
// DialogTrigger propio-, al reves que los otros dialogos: aqui no hay boton que
// lo abra, lo dispara el DESPLEGABLE de la fila. Un trigger propio pintaria un
// segundo control para la misma accion.
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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cancelarReserva, type ResultadoAdmin } from "@/lib/admin/acciones";
import { marcarNoDevuelta } from "@/lib/mostrador/acciones";

export type ModoDialogo = "cancelar" | "no_devuelta";

// Juntos y no repartidos por el JSX, para poder leer de un vistazo que se le dice
// al admin en cada caso.
//
// NINGUNO PROMETE UN RESULTADO EXACTO sobre la sancion: quien decide es el
// trigger `apply_penalties` en el momento de la escritura.
const TEXTOS: Record<
  ModoDialogo,
  { titulo: string; descripcion: string; etiqueta: string; ayuda: string; confirmar: string }
> = {
  cancelar: {
    titulo: "Cancelar la reserva",
    descripcion:
      "El alumno va a leer este motivo en su panel, así que escríbelo pensando en él. La reserva queda cancelada y la unidad vuelve a estar libre en esa franja.",
    etiqueta: "Motivo de la cancelación",
    ayuda: "Obligatorio. Una reserva cancelada sin motivo deja al alumno sin saber qué pasó.",
    confirmar: "Cancelar la reserva",
  },
  no_devuelta: {
    titulo: "Marcar «No se devolvió»",
    descripcion:
      "Esto bloquea al alumno de forma permanente, sin fecha de fin, y solo un administrador puede levantarlo después. La nota queda en el historial del equipo.",
    etiqueta: "¿Qué pasó con el equipo?",
    // El aviso es de TRAZABILIDAD: la nota es permanente y va con el nombre de
    // quien la escribe, y eso es lo que hace pensar antes de escribirla. Desde la
    // migracion 25 (D-69) solo la lee el personal.
    ayuda:
      "Obligatorio. Queda en el historial del equipo y lo leen el personal del mostrador y los administradores.",
    confirmar: "Marcar como no devuelta",
  },
};

type DialogoEstadoReservaProps = {
  modo: ModoDialogo;
  reservaId: string;
  unidadId: string;
  // Llega YA ARMADA desde la fila en vez de recibir los campos sueltos.
  descripcionReserva: string;
  abierto: boolean;
  onCambioApertura: (abierto: boolean) => void;
};

export function DialogoEstadoReserva({
  modo,
  reservaId,
  unidadId,
  descripcionReserva,
  abierto,
  onCambioApertura,
}: DialogoEstadoReservaProps) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idTexto = useId();

  const t = TEXTOS[modo];

  // Barrera del CLIENTE. Las dos Server Actions repiten la misma regla del lado
  // del servidor, por si algo llega alla sin pasar por aqui.
  const vacio = texto.trim() === "";

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      // `ruta` explicita en la segunda: marcarNoDevuelta() revalida `/mostrador`
      // por defecto, que es una pantalla que el admin no esta mirando.
      const resultado: ResultadoAdmin =
        modo === "cancelar"
          ? await cancelarReserva(reservaId, texto)
          : await marcarNoDevuelta(reservaId, unidadId, texto, "/admin/reservas");

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      // CIERRA A MANO, al reves que DialogoFalta: alla la tarjeta se desmonta
      // porque la reserva sale del filtro. Aqui la fila SIGUE en la tabla con su
      // estado nuevo, asi que nadie lo cierra si no lo hace el.
      setTexto("");
      onCambioApertura(false);
    });
  }

  // El estado local se limpia tambien al cerrar sin confirmar: sin esto, abrirlo
  // sobre OTRA fila mostraria el texto tecleado para la anterior, y en el caso de
  // "No se devolvio" eso seria escribir en el historial de un equipo lo que paso
  // con otro.
  function alCambiarApertura(siguiente: boolean) {
    if (!siguiente) {
      setTexto("");
      setError(null);
    }
    onCambioApertura(siguiente);
  }

  return (
    <Dialog open={abierto} onOpenChange={alCambiarApertura}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.titulo}</DialogTitle>
          <DialogDescription>{t.descripcion}</DialogDescription>
        </DialogHeader>

        <p className="bg-muted rounded-lg px-4 py-3 text-sm">{descripcionReserva}</p>

        <div>
          <Label htmlFor={idTexto}>{t.etiqueta}</Label>
          <Textarea
            id={idTexto}
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">{t.ayuda}</p>
        </div>

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          {/* Dice "Volver" y no "Cancelar": en el modo cancelar, un boton
              "Cancelar" al lado de otro "Cancelar la reserva" es justo el par que
              hace pulsar el equivocado. */}
          <DialogClose className={buttonVariants({ variant: "outline" })}>Volver</DialogClose>
          <Button variant="destructive" onClick={confirmar} disabled={vacio || pendiente}>
            {pendiente ? "Guardando…" : t.confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
