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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { agregarUnidad, type ResultadoAdmin } from "@/lib/admin/acciones";

// Alta de una unidad suelta sobre un producto que ya existe (F7: "alta
// individual -- codigo, sede, anotacion --").

type DialogoAgregarUnidadProps = {
  productoId: string;
  sedes: { id: string; nombre: string }[];
};

export function DialogoAgregarUnidad({ productoId, sedes }: DialogoAgregarUnidadProps) {
  const [abierto, setAbierto] = useState(false);
  const [unitCode, setUnitCode] = useState("");
  const [assetCode, setAssetCode] = useState("");
  const [campusId, setCampusId] = useState(sedes[0]?.id ?? "");
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idCodigo = useId();

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado: ResultadoAdmin = await agregarUnidad(productoId, {
        unitCode,
        assetCode,
        campusId,
        nota,
      });

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      // Limpia y cierra a mano, igual que dialogo-nota.tsx y
      // dialogo-estado-unidad.tsx: la pantalla sigue montada tras agregar la
      // unidad -- se le suma una fila a la tabla --, asi que nadie cierra
      // esto si no lo hace el.
      setUnitCode("");
      setAssetCode("");
      setNota("");
      setAbierto(false);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        Agregar unidad
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar una unidad</DialogTitle>
          <DialogDescription>
            Cada unidad es un equipo físico. Dentro de este producto, el código tiene que ser
            distinto de los que ya existen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor={idCodigo}>Código de unidad</Label>
          <Input
            id={idCodigo}
            value={unitCode}
            onChange={(e) => setUnitCode(e.target.value)}
            placeholder="CAM-004"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idCodigo}-activo`}>Código de activo</Label>
          <Input
            id={`${idCodigo}-activo`}
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            placeholder="00192164"
          />
          <p className="text-muted-foreground text-xs">
            Opcional, pero sin él la unidad no se identifica en el estante.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idCodigo}-sede`}>Sede</Label>
          <Select value={campusId} onValueChange={setCampusId}>
            <SelectTrigger id={`${idCodigo}-sede`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor={`${idCodigo}-nota`}>Anotación inicial</Label>
          <Input
            id={`${idCodigo}-nota`}
            value={nota}
            onChange={(e) => setNota(e.target.value)}
            placeholder="Opcional"
          />
          {/* El aviso va aunque la nota sea opcional: si se escribe, se guarda
              en `inventory_unit_notes` y queda ahi para siempre. LA RAZON
              CAMBIO EL 2026-08-15: este comentario decia "en la misma tabla
              que lee cualquiera con sesion (Q-18)", y esa frase ya es FALSA
              -- la migracion 25 (D-69) dejo la lectura solo para el personal.
              Lo que NO cambio es que la nota es permanente, y ese es el motivo
              por el que el aviso se queda. */}
          <p className="text-muted-foreground text-xs">
            Si la escribes, queda en el historial del equipo y la leen el personal del mostrador y
            los administradores.
          </p>
        </div>

        {error && (
          <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "outline" })}>Cancelar</DialogClose>
          <Button onClick={confirmar} disabled={unitCode.trim() === "" || pendiente}>
            {pendiente ? "Agregando…" : "Agregar unidad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
