"use client";

// El panel de /admin/dias (F8, D-40): elegir una fecha futura, escribir por que
// se inhabilita (D-46) y ver ANTES de confirmar cuantas reservas se cancelan.
//
// PINTA TAMBIEN LA LISTA porque comparten estado: inhabilitar un dia tiene que
// hacer aparecer la fila sin recargar, y separarlos obligaria a subir ese estado
// a un padre comun que seria Client Component igual.
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

// EN UTC y no en America/Lima como las otras pantallas, y no por descuido:
// `fecha` es una columna `date` -una fecha CIVIL-, no un instante.
// `new Date('2026-09-15')` la interpreta como medianoche UTC, asi que formatearla
// en Lima retrocederia un dia. La zona correcta para leer de vuelta una fecha
// civil es la misma en la que `Date` la interpreto.
const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
  year: "numeric",
});

type PanelDiasProps = {
  dias: DiaInhabilitadoAdmin[];
  reservasVivas: ReservaViva[];
  // El instante actual como STRING ISO: la pagina hace la UNICA lectura del reloj
  // (regla M-7). El boton SI vuelve a leerlo, pero dentro de inhabilitarDia(), en
  // el servidor: con la pestaña abierta de un dia para otro, "fecha pasada" tiene
  // que usar el instante REAL del envio.
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

  // `<input type="date">` sale en `YYYY-MM-DD`, el mismo formato que devuelve
  // fechaEnLima(): no hay ninguna conversion de por medio.
  const { reservadas, activas } =
    fecha === "" ? { reservadas: [], activas: [] } : particionarPorDia(reservasVivas, fecha);

  const motivoVacio = motivo.trim() === "";
  const puedeAbrirConfirmacion = fecha !== "" && !motivoVacio;

  // Vista previa para que el admin vea el texto exacto ANTES de confirmar (D-47).
  // Es una COPIA para pintar: el texto autoritativo lo calcula el servidor.
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
