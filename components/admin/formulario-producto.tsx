"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

import { FilasUnidad } from "@/components/admin/filas-unidad";
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
import { crearProductoAction, type ResultadoAdmin } from "@/lib/admin/acciones";

// El alta de producto con sus unidades, F7 "en un solo formulario".
// Client Component: tiene estado -- la categoria nueva, el buffer -- y monta
// las filas de unidad, que se agregan y quitan.

type FormularioProductoProps = {
  categorias: string[];
  sedes: { id: string; nombre: string }[];
  // Los buffers que se pueden elegir, ya calculados en el servidor con
  // multiplosDeSlot(slotMinutes, 480). Llegan hechos y no se calculan aca:
  // `slot_minutes` vive en app_settings y leerlo es del servidor.
  buffersPosibles: number[];
  slotMinutes: number;
};

const CATEGORIA_NUEVA = "__nueva__";

export function FormularioProducto({
  categorias,
  sedes,
  buffersPosibles,
  slotMinutes,
}: FormularioProductoProps) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<
    ResultadoAdmin | { productoId: string },
    FormData
  >(crearProductoAction, null);

  // TODOS LOS CAMPOS SON CONTROLADOS, y el motivo esta medido: React RESETEA
  // un <form action={...}> cuando la accion termina, TAMBIEN cuando devuelve
  // un error. Con los campos sin controlar, un alta rechazada -- por un codigo
  // de unidad repetido, por ejemplo -- dejaba el nombre, la descripcion y
  // todas las filas de unidad EN BLANCO, y el admin tenia que teclearlo todo
  // otra vez. Verificado en pantalla el 2026-08-12; los cuatro comandos
  // estaban en verde con el defecto dentro. El detalle completo esta en el
  // comentario de cabecera de components/admin/filas-unidad.tsx.
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [maxDuracion, setMaxDuracion] = useState("4");
  const [categoriaNueva, setCategoriaNueva] = useState("");
  const [categoriaElegida, setCategoriaElegida] = useState<string>(
    categorias[0] ?? CATEGORIA_NUEVA,
  );
  // 120 es el buffer de los 34 productos reales, asi que es el valor que casi
  // siempre corresponde. Si no estuviera entre los posibles -- porque
  // `slot_minutes` no divide a 120 --, se cae al primero que si.
  const [buffer, setBuffer] = useState<string>(
    String(buffersPosibles.includes(120) ? 120 : (buffersPosibles[1] ?? 0)),
  );

  // Al crearse el producto se va a su detalle, que es donde se sigue
  // trabajando: agregar mas unidades, cambiarles el estado y subir imagenes.
  // `useEffect` y no un redirect dentro de la Server Action porque el
  // resultado tambien puede ser un error, y esa rama tiene que quedarse aca
  // para poder pintarlo.
  useEffect(() => {
    if (estado !== null && "productoId" in estado) {
      router.push(`/admin/inventario/${estado.productoId}`);
    }
  }, [estado, router]);

  const hayError = estado !== null && "error" in estado;

  return (
    <form action={accion} className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Producto</h2>

        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre</Label>
          <Input
            id="nombre"
            name="nombre"
            required
            placeholder="Cámara Sony A7 III"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="categoria-selector">Categoría</Label>
          {/* D-42: las opciones salen de la base y no de una lista fija de 14.
              En produccion hay 10 categorias reales; una lista fija metería
              cuatro sin un solo producto detras y se quedaria vieja sola. */}
          <Select value={categoriaElegida} onValueChange={setCategoriaElegida}>
            <SelectTrigger id="categoria-selector">
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

          {categoriaElegida === CATEGORIA_NUEVA ? (
            <Input
              name="categoria"
              placeholder="Nombre de la categoría nueva"
              className="mt-2"
              value={categoriaNueva}
              onChange={(e) => setCategoriaNueva(e.target.value)}
            />
          ) : (
            <input type="hidden" name="categoria" value={categoriaElegida} />
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="descripcion">Descripción</Label>
          <Textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="maxDuracionHoras">Duración máxima del préstamo</Label>
            {/* 1 a 8 es el `check (max_duration_hours between 1 and 8)` de la
                columna, no un limite inventado aca. */}
            <Input
              id="maxDuracionHoras"
              name="maxDuracionHoras"
              type="number"
              min={1}
              max={8}
              required
              value={maxDuracion}
              onChange={(e) => setMaxDuracion(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">Entre 1 y 8 horas.</p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="buffer-selector">Tiempo de retorno</Label>
            {/* Q-14, PRIMERA MITAD, hecha pantalla. La base solo exige
                `between 0 and 480`: que sea multiplo de `slot_minutes` NO lo
                defiende ninguna restriccion, y por eso lo defiende este
                desplegable (D-39). Con `slot_minutes = 30` no ofrece 45.
                La OTRA mitad de Q-14 -- que cambiar `slot_minutes` desalinee
                buffers ya guardados -- es de /admin/ajustes, Task 10. */}
            <Select value={buffer} onValueChange={setBuffer}>
              <SelectTrigger id="buffer-selector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {buffersPosibles.map((b) => (
                  <SelectItem key={b} value={String(b)}>
                    {b} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="bufferMinutos" value={buffer} />
            <p className="text-muted-foreground text-xs">
              Cuánto tarda el equipo en volver a estar prestable: revisar, cargar batería, limpiar.
              Solo se ofrecen múltiplos de {slotMinutes} minutos, que es el tamaño del bloque horario.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Unidades</h2>
        <p className="text-muted-foreground text-sm">
          Cada unidad es un equipo físico. Dentro de un mismo producto, cada código tiene que ser
          distinto. Si dejas una fila sin código, no se crea ninguna unidad con ella.
        </p>
        <FilasUnidad sedes={sedes} sedePorDefecto={sedes[0]?.id ?? ""} />
      </section>

      {hayError && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm"
        >
          {estado.error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pendiente}>
        {pendiente ? "Creando…" : "Crear producto"}
      </Button>
    </form>
  );
}
