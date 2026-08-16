"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cambiarEstadoUnidad, type ResultadoAdmin } from "@/lib/admin/acciones";
import type { EstadoUnidad } from "@/lib/admin/consultas";

// El cambio de estado de una unidad (F7). Sigue la forma de
// components/mostrador/dialogo-falta.tsx y dialogo-nota.tsx: `Dialog` de
// components/ui/dialog.tsx, trigger y DialogClose pintados con
// `buttonVariants` en vez de envolver un <Button> con `asChild`.
//
// CIERRA A MANO tras el exito, como dialogo-nota.tsx y AL REVES que
// dialogo-falta.tsx. El criterio es el mismo que aquel comentario deja
// escrito, aplicado a este caso: alli la tarjeta entera se DESMONTA porque la
// reserva sale del filtro de la consulta, y el dialogo se va con ella. Aca la
// fila de la unidad SIGUE EN LA TABLA despues de cambiarle el estado -- una
// unidad `retired` se sigue viendo en el detalle del producto, que es
// justamente el punto --, asi que nadie cierra el dialogo si no lo hace el.

const ETIQUETAS: Record<EstadoUnidad, string> = {
  active: "Disponible",
  maintenance: "En mantenimiento",
  retired: "Retirada",
};

type DialogoEstadoUnidadProps = {
  unidadId: string;
  unidad: string;
  estadoActual: EstadoUnidad;
  productoId: string;
};

export function DialogoEstadoUnidad({
  unidadId,
  unidad,
  estadoActual,
  productoId,
}: DialogoEstadoUnidadProps) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<EstadoUnidad>(estadoActual);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idNota = useId();

  // Barrera del CLIENTE. cambiarEstadoUnidad() repite la misma regla del lado
  // del SERVIDOR, por si algo llega hasta alla sin pasar por este boton --
  // mismo patron que anotar() y dialogo-nota.tsx en la T3A.
  const notaVacia = nota.trim() === "";

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado: ResultadoAdmin = await cambiarEstadoUnidad(
        unidadId,
        estado,
        nota,
        productoId,
      );

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      setNota("");
      setAbierto(false);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Cambiar estado
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Estado de {unidad}</DialogTitle>
          {/* El mismo aviso que dialogo-nota.tsx, y cambio con el: hasta el
              2026-08-15 un JWT de alumno leyendo `inventory_unit_notes`
              recibia HTTP 200 con todas las notas, porque
              `unit_notes_select_auth` era `for select to authenticated using
              (true)` (supabase/migrations/20260805195549_traceability.sql:37-38).
              Eso era Q-18, y lo cerro la migracion 25
              (supabase/migrations/20260815190010_unit_notes_staff_only.sql)
              con D-69: hoy es `unit_notes_select_staff` con
              `using ((select private.is_staff()))`.
              DOS COSAS DE ESTE COMENTARIO ERAN FALSAS Y SE CORRIGEN FECHADAS,
              no se borran. La primera es la politica de arriba. La segunda es
              que decia "aparcado a la T4 por D-41", y la T4 NO lo hizo: D-55
              lo mando a una tanda propia justamente porque recortar la lectura
              obligaba a reverificar pantallas ya cerradas.
              Lo que sigue en pie es el motivo por el que este dialogo nacio
              con aviso: la asimetria entre dos dialogos que escriben en la
              MISMA tabla ya fue un defecto real en la T3A -- el que faltaba
              era justo el mas expuesto. */}
          <DialogDescription>
            El motivo queda en el historial del equipo, con la fecha, y no se puede deshacer. Lo
            leen el personal del mostrador y los administradores.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor={`estado-${unidadId}`}>Estado</Label>
          <Select value={estado} onValueChange={(v) => setEstado(v as EstadoUnidad)}>
            <SelectTrigger id={`estado-${unidadId}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{ETIQUETAS.active}</SelectItem>
              <SelectItem value="maintenance">{ETIQUETAS.maintenance}</SelectItem>
              <SelectItem value="retired">{ETIQUETAS.retired}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* EL TEXTO QUE F7 OBLIGA A ESCRIBIR. La especificacion manda un
            borrado en cascada que NO se puede hacer, y el admin va a buscar
            ese boton. No basta con que no exista: la pantalla tiene que decir
            por que, o su ausencia se lee como un defecto. Solo aparece al
            elegir "Retirada", que es cuando la pregunta se hace. */}
        {estado === "retired" && (
          <p className="bg-muted rounded-lg px-4 py-3 text-sm">
            <strong>Dar de baja no borra la unidad.</strong> La pasa a «retirada»: deja de estar
            disponible para reservar y conserva su historial de préstamos y anotaciones. Una unidad
            con reservas registradas no se puede borrar, y es a propósito — borrarla dejaría
            reservas apuntando a un equipo que ya no existe.
          </p>
        )}

        <div>
          <Label htmlFor={idNota}>Motivo</Label>
          <Textarea
            id={idNota}
            value={nota}
            onChange={(evento) => setNota(evento.target.value)}
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Obligatorio. Un equipo que sale del catálogo sin explicación deja al resto del personal
            sin saber si está roto, prestado o perdido.
          </p>
        </div>

        {error && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "outline" })}>Cancelar</DialogClose>
          <Button onClick={confirmar} disabled={notaVacia || pendiente}>
            {pendiente ? "Guardando…" : "Guardar cambio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
