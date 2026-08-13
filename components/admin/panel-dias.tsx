"use client";

// El panel de /admin/dias (F8, corregida por D-40): elegir una fecha futura,
// escribir por que se inhabilita (D-46) y ver ANTES de confirmar cuantas
// reservas se van a cancelar y cuantos prestamos ya entregados siguen
// vigentes. Debajo, la lista de dias ya inhabilitados con su boton de
// revertir para los futuros.
//
// PINTA TAMBIEN LA LISTA, mismo motivo que FiltrosReservas
// (components/admin/filtros-reservas.tsx): el formulario de alta y la lista
// comparten estado -- inhabilitar un dia tiene que hacer aparecer la fila
// nueva sin recargar --, y separarlos en dos componentes hermanos obligaria a
// subir ese estado a un padre comun que igual tendria que ser Client
// Component.
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { habilitarDia, inhabilitarDia } from "@/lib/admin/acciones";
import type { DiaInhabilitadoAdmin, ReservaViva } from "@/lib/admin/dias";
import { particionarPorDia } from "@/lib/admin/filtros";
import { plural } from "@/lib/admin/plural";
import { hoyEnLima } from "@/lib/reservas/rejilla";

// Formato de fecha para pantalla, misma FORMA que FORMATO_FECHA_HORA de
// components/admin/tabla-reservas.tsx, FORMATO_DIA de
// components/mostrador/tarjeta-mostrador.tsx y FORMATO_FECHA_NOTA de
// components/mostrador/historial-notas.tsx: la constante de
// Intl.DateTimeFormat se declara a nivel de modulo, no dentro del
// componente.
//
// PERO con una zona horaria DISTINTA a esas tres, y no por descuido: `fecha`
// y `dia.fecha` son columnas `date` -- fechas CIVILES sin hora
// (`YYYY-MM-DD`) --, no instantes (`timestamptz`) como los que formatean
// esos tres archivos. `new Date('2026-09-15')` lo interpreta como
// medianoche UTC, asi que formatear con `America/Lima` (UTC-5) retrocede un
// dia -- medido con node -e: "15 set. 2026" en UTC contra "14 set. 2026" en
// America/Lima, misma fecha de entrada --. La zona correcta para leer de
// vuelta una fecha civil es la misma en la que `Date` la interpreto: UTC.
const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

type PanelDiasProps = {
  dias: DiaInhabilitadoAdmin[];
  reservasVivas: ReservaViva[];
  // El instante actual, como STRING ISO y no como `Date`. page.tsx hace la
  // UNICA lectura del reloj DE LA PAGINA (regla M-7) y este componente la
  // recibe, igual que `ahora` en FiltrosReservas. El boton de inhabilitar SI
  // vuelve a leer el reloj, pero DENTRO de inhabilitarDia(), en el servidor
  // -- ver el comentario de esa funcion en lib/admin/acciones.ts --: si el
  // admin deja la pestaña abierta de un dia para otro, la comprobacion de
  // "fecha pasada" tiene que usar el instante REAL del envio, no el de cuando
  // se pinto esta pagina.
  ahora: string;
};

export function PanelDias({ dias, reservasVivas, ahora }: PanelDiasProps) {
  const hoy = hoyEnLima(new Date(ahora));

  const [fecha, setFecha] = useState("");
  const [motivo, setMotivo] = useState("");
  const [confirmando, setConfirmando] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const [pendienteCrear, iniciarCrear] = useTransition();

  const [errorRevertir, setErrorRevertir] = useState<string | null>(null);
  const [fechaRevirtiendo, setFechaRevirtiendo] = useState<string | null>(null);
  const [pendienteRevertir, iniciarRevertir] = useTransition();

  const idFecha = useId();
  const idMotivo = useId();

  // El valor de <input type="date"> sale en `YYYY-MM-DD` -- el formato que
  // el estandar HTML fija para ese control -- que coincide con el que
  // devuelve fechaEnLima(). No hay ninguna conversion entre la pantalla y
  // particionarPorDia().
  const { reservadas, activas } =
    fecha === "" ? { reservadas: [], activas: [] } : particionarPorDia(reservasVivas, fecha);

  const motivoVacio = motivo.trim() === "";
  const puedeAbrirConfirmacion = fecha !== "" && !motivoVacio;

  // Vista previa del motivo para que el admin vea el texto exacto ANTES de
  // confirmar (D-47). Es una COPIA para pintar, no la fuente de verdad: el
  // texto AUTORITATIVO lo calcula textoCancelacionPorDiaInhabilitado() en el
  // servidor (lib/admin/acciones.ts), con el motivo que de verdad llego alli.
  const razonCancelacion = `Cancelado por la administración (Día inhabilitado: ${motivo.trim()})`;

  function confirmarInhabilitar() {
    setErrorCrear(null);
    iniciarCrear(async () => {
      const resultado = await inhabilitarDia(fecha, motivo);

      if (resultado?.error) {
        setErrorCrear(resultado.error);
        return;
      }

      setFecha("");
      setMotivo("");
      setConfirmando(false);
    });
  }

  function revertir(fechaDia: string) {
    setErrorRevertir(null);
    setFechaRevirtiendo(fechaDia);
    iniciarRevertir(async () => {
      const resultado = await habilitarDia(fechaDia);

      if (resultado?.error) {
        setErrorRevertir(resultado.error);
      }

      setFechaRevirtiendo(null);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <Label htmlFor={idFecha}>Fecha a inhabilitar</Label>
          {/* `min` es VISIBILIDAD, no control: el navegador puede saltarselo
              -- DevTools, un formulario armado a mano --, y quien impide de
              verdad un dia pasado es inhabilitarDia() en el servidor, que
              repite esta misma comprobacion con el reloj real del momento del
              envio. */}
          <Input
            id={idFecha}
            type="date"
            min={hoy}
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={idMotivo}>Motivo</Label>
          <Textarea
            id={idMotivo}
            value={motivo}
            onChange={(evento) => setMotivo(evento.target.value)}
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Obligatorio: no puedes inhabilitar un día sin escribir por qué.
          </p>
        </div>

        {fecha !== "" && (
          <p className="text-muted-foreground text-sm">
            Reservas que se cancelan (aún no retiradas):{" "}
            {plural(reservadas.length, "reserva", "reservas")}. Préstamos que siguen vigentes (ya
            entregados): {plural(activas.length, "préstamo", "préstamos")}.
          </p>
        )}

        <Button type="button" disabled={!puedeAbrirConfirmacion} onClick={() => setConfirmando(true)}>
          Inhabilitar día
        </Button>
      </section>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar el día inhabilitado</DialogTitle>
            <DialogDescription>
              Revisa los números antes de confirmar: esto cancela reservas de verdad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {/* `fecha` puede ser "" en este punto -- el contenido del dialogo
                se evalua en cada render de PanelDias sin importar si esta
                abierto, porque son hijos de JSX normales -- y
                `FORMATO_FECHA.format(new Date(""))` lanza RangeError, medido
                con node -e. De ahi el guardia. */}
            <p>
              Vas a inhabilitar el{" "}
              <strong>{fecha === "" ? "" : FORMATO_FECHA.format(new Date(fecha))}</strong> con este
              motivo: «{motivo.trim()}».
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Reservas que se cancelan (aún no retiradas):{" "}
                {plural(reservadas.length, "reserva", "reservas")}.
              </li>
              <li>
                Préstamos que siguen vigentes (ya entregados):{" "}
                {plural(activas.length, "préstamo", "préstamos")}.
              </li>
            </ul>
            <p className="text-muted-foreground">
              Cada alumno afectado va a leer «{razonCancelacion}» como motivo de su cancelación. Los
              préstamos ya entregados no se tocan: un equipo que ya se entregó no se puede cancelar,
              así que ese préstamo sigue vigente hasta que el alumno lo devuelva.
            </p>
          </div>

          {errorCrear && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
              {errorCrear}
            </p>
          )}

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>Volver</DialogClose>
            <Button variant="destructive" onClick={confirmarInhabilitar} disabled={pendienteCrear}>
              {pendienteCrear ? "Inhabilitando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Días inhabilitados</h2>

        <p className="text-muted-foreground text-sm">
          Revertir un día no descancela nada: las reservas que ya se cancelaron se quedan
          canceladas, porque ese estado es definitivo.
        </p>

        {errorRevertir && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {errorRevertir}
          </p>
        )}

        {dias.length === 0 ? (
          <p className="text-muted-foreground text-sm">No hay ningún día inhabilitado.</p>
        ) : (
          <ul className="space-y-2">
            {dias.map((dia) => {
              const esFuturo = dia.fecha >= hoy;
              return (
                <li
                  key={dia.id}
                  className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{FORMATO_FECHA.format(new Date(dia.fecha))}</p>
                    <p className="text-muted-foreground text-sm">{dia.motivo ?? "Sin motivo registrado"}</p>
                  </div>

                  {esFuturo ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pendienteRevertir}
                      onClick={() => revertir(dia.fecha)}
                    >
                      {pendienteRevertir && fechaRevirtiendo === dia.fecha
                        ? "Revirtiendo…"
                        : "Volver a habilitar"}
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">Pasado</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
