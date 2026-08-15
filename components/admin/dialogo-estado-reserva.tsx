"use client";

// Los dos cambios de estado de /admin/reservas que exigen escribir algo antes
// de aplicarse: cancelar -- que pide un motivo, F6 -- y "No se devolvio" -- que
// pide la nota de F5 --. Los otros tres salen del desplegable directo, sin
// dialogo, porque no piden nada.
//
// SE LLAMA `dialogo-estado-reserva` Y NO `dialogo-cancelar-admin`, que es como
// lo nombraba la "Estructura de archivos" del plan. El nombre del plan se quedo
// corto por una decision de Alejandro tomada al ejecutar esta tarea: F6 solo
// exige el dialogo para cancelar, pero "No se devolvio" bloquea al alumno de
// forma PERMANENTE, y aplicarlo desde un desplegable sin nota dejaria a esa
// persona sancionada sin ningun rastro escrito de por que -- exactamente el
// peor caso que marcarNoDevuelta() (lib/mostrador/acciones.ts) ya tenia
// documentado y evitado en el mostrador --. Con dos casos, un archivo llamado
// "cancelar" mentiria sobre lo que hace.
//
// UN UNICO COMPONENTE PARAMETRIZADO, mismo criterio que DialogoFalta en la T3A
// y al reves que dialogo-cancelar.tsx en la T2B: alli habia UN solo caso real y
// generalizar habria sido adivinar; aca hay DOS desde el primer dia, con la
// misma forma -- dialogo modal, un textarea obligatorio, confirmacion explicita
// y `useTransition` -- y textos y consecuencias distintas.
//
// CONTROLADO DESDE FUERA -- `abierto` y `onCambioApertura` por props, sin
// DialogTrigger propio --, al reves que DialogoFalta y DialogoEstadoUnidad, que
// traen su propio boton. Aca no hay boton que abrirlo: lo dispara el
// DESPLEGABLE de estado de la fila al elegir una de estas dos opciones, y ese
// desplegable vive en tabla-reservas.tsx. Un trigger propio pintaria un segundo
// control para la misma accion.
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

// Los textos de cada caso, juntos y no repartidos por el JSX, para poder leer
// de un vistazo que se le dice al admin en cada uno.
//
// NINGUNO DE LOS DOS PROMETE UN RESULTADO EXACTO sobre la sancion, mismo
// criterio que DialogoFalta: quien decide es el trigger `apply_penalties` en el
// momento de la escritura, y precalcularlo aca duplicaria esa regla y quedaria
// obsoleto en cuanto otro operador marcara una falta entre medias.
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
    // EL AVISO CAMBIO EL 2026-08-15, y este comentario no existia antes: el
    // aviso vivia suelto en la cadena, sin nada al lado que explicara de donde
    // salia. Decia que la nota la leia cualquiera con sesion, que era cierto
    // -- Q-18, `unit_notes_select_auth` con `using (true)` -- y dejo de serlo
    // con la migracion 25
    // (supabase/migrations/20260815190010_unit_notes_staff_only.sql, D-69).
    // Se va la mitad de privacidad y se queda la de trazabilidad: la nota es
    // permanente y va con el nombre de quien la escribe, y eso es lo que hace
    // pensar antes de escribirla.
    ayuda:
      "Obligatorio. Queda en el historial del equipo y lo leen el personal del mostrador y los administradores.",
    confirmar: "Marcar como no devuelta",
  },
};

type DialogoEstadoReservaProps = {
  modo: ModoDialogo;
  reservaId: string;
  unidadId: string;
  // Para el titulo: de que reserva estamos hablando. Llega ya armado desde la
  // fila -- "Camara Sony A7 III · CAM-001" -- en vez de recibir los campos
  // sueltos y volver a componerlo aca.
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
  // del servidor -- cancelarReserva() con su propio `trim()`, marcarNoDevuelta()
  // a traves de insertarNota() --, por si algo llega alla sin pasar por aqui.
  const vacio = texto.trim() === "";

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      // `ruta` explicita en la segunda: marcarNoDevuelta() vive en
      // lib/mostrador/acciones.ts y revalida `/mostrador` por defecto, que es
      // una pantalla que el admin no esta mirando. Se le pasa la suya.
      const resultado: ResultadoAdmin =
        modo === "cancelar"
          ? await cancelarReserva(reservaId, texto)
          : await marcarNoDevuelta(reservaId, unidadId, texto, "/admin/reservas");

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      // CIERRA A MANO tras el exito, como DialogoEstadoUnidad y al reves que
      // DialogoFalta: alla la tarjeta entera se desmonta porque la reserva sale
      // del filtro de la consulta y el dialogo se va con ella. Aca la fila
      // SIGUE en la tabla con su estado nuevo -- esta pantalla trae los seis
      // estados a proposito --, asi que nadie lo cierra si no lo hace el.
      setTexto("");
      onCambioApertura(false);
    });
  }

  // El estado local se limpia tambien al cerrar sin confirmar: sin esto, abrir
  // el dialogo sobre OTRA fila mostraria el texto tecleado para la anterior --
  // y en el caso de "No se devolvio" eso seria escribir en el historial de un
  // equipo el relato de lo que paso con otro.
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
          {/* Pintado con `buttonVariants` en vez de envolver un <Button> con
              `asChild`, misma forma que el resto de los dialogos del proyecto.
              El texto dice "Volver" y no "Cancelar": en el modo cancelar,
              un boton "Cancelar" al lado de otro "Cancelar la reserva" es
              justo el par que hace pulsar el equivocado. */}
          <DialogClose className={buttonVariants({ variant: "outline" })}>Volver</DialogClose>
          <Button variant="destructive" onClick={confirmar} disabled={vacio || pendiente}>
            {pendiente ? "Guardando…" : t.confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
