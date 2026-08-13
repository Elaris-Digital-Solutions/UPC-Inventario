"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { editarProducto, type ResultadoAdmin } from "@/lib/admin/acciones";
import type { ProductoDetalle } from "@/lib/admin/consultas";

// Edicion de los datos del producto (F7).
//
// ARCHIVO QUE EL PLAN NO PREVIO, igual que dialogo-agregar-unidad.tsx: la
// Task 3 pide `editarProducto()` en acciones.ts pero no le asigna pantalla.
//
// NO usa useActionState y su <form action={...}>, al reves que
// formulario-producto.tsx: se dispara con useTransition sobre un onClick. El
// motivo es el defecto que se midio en la Task 2 -- React RESETEA un
// <form action> cuando la accion termina, tambien al fallar --, que alli
// obligo a controlar todos los campos. Aca los campos ya nacen controlados
// porque arrancan con los valores del producto, asi que no hay nada que
// reconstruir, y evitar el reset de raiz es mas simple que compensarlo.

type FormularioEditarProductoProps = {
  producto: ProductoDetalle;
  categorias: string[];
  buffersPosibles: number[];
  slotMinutes: number;
};

const CATEGORIA_NUEVA = "__nueva__";

export function FormularioEditarProducto({
  producto,
  categorias,
  buffersPosibles,
  slotMinutes,
}: FormularioEditarProductoProps) {
  const [nombre, setNombre] = useState(producto.nombre);
  const [descripcion, setDescripcion] = useState(producto.descripcion ?? "");
  const [maxDuracion, setMaxDuracion] = useState(String(producto.maxDuracionHoras));
  const [buffer, setBuffer] = useState(String(producto.bufferMinutos));
  const [categoriaElegida, setCategoriaElegida] = useState(
    producto.categoria ?? CATEGORIA_NUEVA,
  );
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pendiente, iniciarTransicion] = useTransition();

  // EL BUFFER GUARDADO PUEDE NO ESTAR ENTRE LOS POSIBLES, y eso no es un caso
  // teorico: es exactamente la SEGUNDA MITAD de Q-14 vista desde esta
  // pantalla. Si alguien cambia `slot_minutes` en /admin/ajustes (Task 10),
  // los productos con un buffer que ya no es multiplo quedan con un valor que
  // este desplegable no puede ofrecer. Se le agrega su propio valor para que
  // el desplegable pueda MOSTRAR lo que hay -- si no, el <Select> aparecería
  // vacío y guardar cambiaría el buffer sin que nadie lo pidiera.
  const opcionesBuffer = buffersPosibles.includes(producto.bufferMinutos)
    ? buffersPosibles
    : [...buffersPosibles, producto.bufferMinutos].sort((a, b) => a - b);

  const desalineado = !buffersPosibles.includes(producto.bufferMinutos);

  function guardar() {
    setError(null);
    setGuardado(false);
    iniciarTransicion(async () => {
      const resultado: ResultadoAdmin = await editarProducto(producto.id, {
        nombre,
        categoria: categoriaElegida === CATEGORIA_NUEVA ? categoriaNueva : categoriaElegida,
        descripcion,
        maxDuracionHoras: Number(maxDuracion),
        bufferMinutos: Number(buffer),
      });

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      setGuardado(true);
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="editar-nombre">Nombre</Label>
        <Input id="editar-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="editar-categoria">Categoría</Label>
        <Select value={categoriaElegida} onValueChange={setCategoriaElegida}>
          <SelectTrigger id="editar-categoria">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
            <SelectItem value={CATEGORIA_NUEVA}>Escribir una nueva…</SelectItem>
          </SelectContent>
        </Select>
        {categoriaElegida === CATEGORIA_NUEVA && (
          <Input
            className="mt-2"
            value={categoriaNueva}
            onChange={(e) => setCategoriaNueva(e.target.value)}
            placeholder="Nombre de la categoría nueva"
          />
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="editar-descripcion">Descripción</Label>
        <Textarea
          id="editar-descripcion"
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="editar-duracion">Duración máxima del préstamo</Label>
          <Input
            id="editar-duracion"
            type="number"
            min={1}
            max={8}
            value={maxDuracion}
            onChange={(e) => setMaxDuracion(e.target.value)}
          />
          <p className="text-muted-foreground text-xs">Entre 1 y 8 horas.</p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="editar-buffer">Tiempo de retorno</Label>
          {/* Q-14, primera mitad, por la OTRA puerta. Editar es otra via a
              `buffer_minutes`, y dejarla sin filtro reabriria por detras lo
              que el alta cierra por delante. */}
          <Select value={buffer} onValueChange={setBuffer}>
            <SelectTrigger id="editar-buffer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {opcionesBuffer.map((b) => (
                <SelectItem key={b} value={String(b)}>
                  {b} min{!buffersPosibles.includes(b) ? " (no encaja en los bloques)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            Solo se ofrecen múltiplos de {slotMinutes} minutos, que es el tamaño del bloque horario.
          </p>
          {desalineado && (
            <p className="text-destructive text-xs">
              El valor actual ({producto.bufferMinutos} min) no es múltiplo de {slotMinutes}. El
              bloqueo posterior a una reserva termina a mitad de bloque.
            </p>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          {error}
        </p>
      )}

      {guardado && !error && (
        <p role="status" className="bg-muted rounded-lg px-4 py-3 text-sm">
          Cambios guardados.
        </p>
      )}

      <Button onClick={guardar} disabled={nombre.trim() === "" || pendiente}>
        {pendiente ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}
