"use client";

// El formulario de /admin/ajustes (D-39, D-54, M-12): las columnas editables de
// `app_settings`.
//
// TODOS LOS CAMPOS CONTROLADOS y NUNCA <form action={...}> con useActionState:
// React resetea un `<form action>` cuando la accion termina, TAMBIEN con error, y
// esta pantalla nace con los valores YA GUARDADOS, asi que un reseteo los
// borraria. Ver COMPORTAMIENTO_MEDIDO.md §6.
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { productosDesalineados } from "@/lib/admin/ajustes";
import { guardarAjustes } from "@/lib/admin/acciones";
import type { AjustesAdmin, ProductoConBuffer } from "@/lib/admin/configuracion";
import { plural } from "@/lib/admin/plural";

// Los OCHO valores que permite `app_settings_slot_divisor`. Desplegable y NO
// campo libre a proposito: 45 pasaria el rango 5-60 y moriria en ese check con un
// mensaje del motor, en vez de nunca poder escribirse.
const SLOTS_LEGALES = [5, 6, 10, 12, 15, 20, 30, 60];

type FormularioAjustesProps = {
  ajustes: AjustesAdmin;
  productos: ProductoConBuffer[];
};

export function FormularioAjustes({ ajustes, productos }: FormularioAjustesProps) {
  const [ventanaDias, setVentanaDias] = useState(String(ajustes.ventanaDias));
  const [slotMinutos, setSlotMinutos] = useState(String(ajustes.slotMinutos));
  const [duracionMinima, setDuracionMinima] = useState(String(ajustes.duracionMinima));
  const [limiteDiario, setLimiteDiario] = useState(String(ajustes.limiteDiario));
  const [margenCancelacion, setMargenCancelacion] = useState(String(ajustes.margenCancelacion));

  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarGuardado] = useTransition();

  // SEÑAL DE EXITO, y hace falta AQUI aunque otras pantallas no la necesiten:
  // los campos ya muestran, antes de guardar, lo que el admin acaba de escribir,
  // asi que guardar bien y no guardar nada se ven EXACTAMENTE IGUAL sin ella.
  //
  // DESAPARECE al editar cualquier campo, no solo al reintentar: fija, seguiria
  // diciendo "guardado" sobre valores que ya no son los guardados.
  const [guardadoOk, setGuardadoOk] = useState(false);

  // Apaga la señal de exito ANTES de aplicar el cambio, en un solo punto para
  // todos los campos.
  function editar<T>(setter: (valor: T) => void, valor: T) {
    setGuardadoOk(false);
    setter(valor);
  }

  const idVentana = useId();
  const idSlot = useId();
  const idDuracion = useId();
  const idLimite = useId();
  const idMargen = useId();

  const slotElegido = Number(slotMinutos);

  // LA COMPROBACION DE D-54 YA NO ESTA AQUI (D-91): esta pantalla dejo de tener
  // hora de apertura, y la regla la aplican dos disparadores de la migracion 33.
  // Si el bloque elegido desalinea algun horario, el rechazo llega del servidor.

  // El aviso de buffers NO bloquea: la base permite cualquier combinacion, asi
  // que impedir el guardado inventaria una regla que el motor no tiene. Se
  // recalcula en cada render, que es barato.
  const productosAfectados = productosDesalineados(productos, slotElegido);

  function confirmarGuardar() {
    setError(null);
    setGuardadoOk(false);
    iniciarGuardado(async () => {
      const resultado = await guardarAjustes({
        ventanaDias: Number(ventanaDias),
        slotMinutos: slotElegido,
        duracionMinima: Number(duracionMinima),
        limiteDiario: Number(limiteDiario),
        margenCancelacion: Number(margenCancelacion),
      });

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      setGuardadoOk(true);
      setConfirmando(false);
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <Label htmlFor={idVentana}>Ventana de reserva (días)</Label>
          {/* `min`/`max` son VISIBILIDAD, no control: el navegador los puede
              saltar, y quien impide de verdad 0 o 61 es el `check`. */}
          <Input
            id={idVentana}
            type="number"
            min={1}
            max={60}
            required
            value={ventanaDias}
            onChange={(e) => editar(setVentanaDias, e.target.value)}
            className="mt-1"
          />
          <p className="text-muted-foreground mt-1 text-xs">
            Cuántos días hacia adelante puede reservar un alumno. Entre 1 y 60.
          </p>
        </div>

        {/* D-91: el horario ESTUVO AQUI y se fue. Quien venga a buscarlo donde
            siempre estuvo tiene que encontrar adonde fue, o concluira que se
            perdio. */}
        <p className="text-muted-foreground text-xs">
          El horario de atención ya no se configura aquí: ahora es por sede y por día de la semana.
          Se edita en{" "}
          <Link href="/admin/horarios" className="underline">
            Horarios
          </Link>
          , junto con los turnos del personal.
        </p>

        <div>
          <Label htmlFor={idSlot}>Tamaño del bloque (minutos)</Label>
          {/* Select controlado, sin <input type="hidden">: el valor se manda a
              mano al llamar guardarAjustes(), no via FormData. */}
          <Select value={slotMinutos} onValueChange={(v) => editar(setSlotMinutos, v)}>
            <SelectTrigger id={idSlot} className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SLOTS_LEGALES.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s} min
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground mt-1 text-xs">
            El tamaño de cada franja del calendario de reserva. Solo se ofrecen los valores que
            dividen exacto a 60 minutos.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor={idDuracion}>Duración mínima (minutos)</Label>
            <Input
              id={idDuracion}
              type="number"
              min={5}
              max={480}
              required
              value={duracionMinima}
              onChange={(e) => editar(setDuracionMinima, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">Entre 5 y 480 minutos.</p>
          </div>

          <div>
            <Label htmlFor={idLimite}>Límite diario por producto</Label>
            <Input
              id={idLimite}
              type="number"
              min={1}
              max={10}
              required
              value={limiteDiario}
              onChange={(e) => editar(setLimiteDiario, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Cuántas reservas del mismo producto puede tener un alumno en un mismo día. Entre 1 y
              10.
            </p>
          </div>

          <div>
            <Label htmlFor={idMargen}>Antelación mínima para cancelar (minutos)</Label>
            <Input
              id={idMargen}
              type="number"
              min={0}
              max={1440}
              required
              value={margenCancelacion}
              onChange={(e) => editar(setMargenCancelacion, e.target.value)}
              className="mt-1"
            />
            <p className="text-muted-foreground mt-1 text-xs">
              Cuánto antes de empezar deja de poder cancelarse una reserva. Entre 0 y 1440 minutos;
              con 0 se puede cancelar hasta el momento de empezar.
            </p>
          </div>
        </div>

        <Button type="button" onClick={() => setConfirmando(true)}>
          Guardar ajustes
        </Button>

        {/* `role="status"` y no "alert": es una confirmacion, no un error. No
            hace falta condicionarla a `!error` porque confirmarGuardar() ya la
            apaga antes de reintentar. */}
        {guardadoOk && (
          <p role="status" className="bg-muted rounded-lg px-4 py-3 text-sm">
            Ajustes guardados.
          </p>
        )}
      </section>

      <Dialog open={confirmando} onOpenChange={setConfirmando}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar los ajustes</DialogTitle>
            <DialogDescription>
              Revisa los valores antes de confirmar: afectan al calendario de reserva de todos los
              alumnos.
            </DialogDescription>
          </DialogHeader>

          {/* Sin guardia: los campos nacen con los valores YA GUARDADOS y aqui
              no hay ningun Date ni Intl.format que pudiera lanzar con uno
              vacio. */}
          <div className="space-y-2 text-sm">
            <p>Vas a guardar estos ajustes:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Ventana de reserva: <strong>{plural(Number(ventanaDias), "día", "días")}</strong>.
              </li>
              <li>
                Tamaño del bloque: <strong>{slotMinutos} minutos</strong>.
              </li>
              <li>
                Duración mínima: <strong>{duracionMinima} minutos</strong>.
              </li>
              <li>
                Límite diario por producto: <strong>{limiteDiario}</strong>.
              </li>
              <li>
                Antelación mínima para cancelar: <strong>{margenCancelacion} minutos</strong>.
              </li>
            </ul>

            {/* D-39/Q-14: enumera CON NOMBRES y NO impide confirmar. */}
            {productosAfectados.length > 0 && (
              <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3">
                Cambiar el bloque a <strong>{slotMinutos} minutos</strong> dejará{" "}
                <strong>{plural(productosAfectados.length, "producto", "productos")}</strong> con un
                tiempo de retorno que ya no encaja en los bloques:{" "}
                {productosAfectados.map((p) => p.nombre).join(", ")}. Sus reservas seguirán
                funcionando, pero el bloqueo posterior terminará a mitad de bloque. Puedes corregir
                su tiempo de retorno desde el inventario.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>Volver</DialogClose>
            <Button onClick={confirmarGuardar} disabled={pendiente}>
              {pendiente ? "Guardando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
