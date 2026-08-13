"use client";

import { useState } from "react";

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

// Las filas de unidad del alta de producto (F7: "una fila por unidad: codigo,
// sede, anotacion inicial").
//
// TODOS LOS VALORES VIVEN EN ESTADO, y esto NO es la primera decision: la
// primera version los dejaba en el DOM y los recogia el FormData del padre,
// con el argumento de no mantener dos copias del mismo dato. ESA VERSION
// ESTABA MAL, y lo destapo abrir la pantalla:
//
//   React RESETEA un <form action={...}> cuando la accion TERMINA, y lo hace
//   tambien cuando la accion devuelve un ERROR.
//
// Medido el 2026-08-12: se envio un alta con dos unidades de codigo repetido,
// la accion contesto con su mensaje de rechazo, y el campo "Nombre" -- y todas
// las filas -- quedaron VACIOS. Un admin que se equivoca en un codigo pierde
// el producto entero y las N filas que habia escrito, y tiene que teclearlo
// todo otra vez. Con un formulario de una linea seria molesto; con este, que
// puede llevar diez unidades, es inaceptable.
//
// `typecheck`, `lint`, `test` y `build` estaban los cuatro en VERDE con ese
// defecto dentro. Ninguna herramienta puede verlo: es comportamiento de React
// en el navegador, no una propiedad del texto del programa.
//
// Con los valores en estado, el reset del DOM no borra nada: React vuelve a
// pintar cada input desde su estado.

type Sede = { id: string; nombre: string };

export type FilaUnidad = {
  id: number;
  unitCode: string;
  assetCode: string;
  campusId: string;
  nota: string;
};

type FilasUnidadProps = {
  sedes: Sede[];
  sedePorDefecto: string;
};

let siguienteId = 0;

function filaVacia(campusId: string): FilaUnidad {
  return { id: siguienteId++, unitCode: "", assetCode: "", campusId, nota: "" };
}

export function FilasUnidad({ sedes, sedePorDefecto }: FilasUnidadProps) {
  const [filas, setFilas] = useState<FilaUnidad[]>([filaVacia(sedePorDefecto)]);

  const cambiar = (id: number, campo: keyof Omit<FilaUnidad, "id">, valor: string) =>
    setFilas((previas) => previas.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)));

  return (
    <div className="space-y-4">
      {filas.map((fila, indice) => (
        <div key={fila.id} className="border-border/60 grid gap-3 rounded-lg border p-4 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor={`unitCode-${fila.id}`}>Código de unidad</Label>
            {/* `name` REPETIDO y no indexado: lo lee getAll() en el orden del
                DOM, que es el orden que se ve en pantalla. Agregar o quitar una
                fila no obliga a renumerar nada. Ver el comentario de
                crearProductoAction() en lib/admin/acciones.ts. */}
            <Input
              id={`unitCode-${fila.id}`}
              name="unitCode"
              placeholder="CAM-004"
              value={fila.unitCode}
              onChange={(e) => cambiar(fila.id, "unitCode", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`assetCode-${fila.id}`}>Código de activo</Label>
            <Input
              id={`assetCode-${fila.id}`}
              name="assetCode"
              placeholder="00192164"
              value={fila.assetCode}
              onChange={(e) => cambiar(fila.id, "assetCode", e.target.value)}
            />
            {/* Se dice que es opcional en vez de dejarlo adivinar. En el
                catalogo real 38 de 92 unidades no lo tienen, y todas esas
                arrastran un unit_code `AUTO-...` que no identifica nada en un
                estante: el hueco existe y conviene no ampliarlo por descuido. */}
            <p className="text-muted-foreground text-xs">
              Opcional, pero sin él la unidad no se identifica en el estante.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor={`campus-${fila.id}`}>Sede</Label>
            {/* El Select de Radix NO participa en un FormData por si solo
                -- monta un boton, no un <select> nativo --, asi que la sede
                viaja en un input oculto. */}
            <Select
              value={fila.campusId}
              onValueChange={(valor) => cambiar(fila.id, "campusId", valor)}
            >
              <SelectTrigger id={`campus-${fila.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sedes.map((sede) => (
                  <SelectItem key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input type="hidden" name="campusId" value={fila.campusId} />
          </div>

          <div className="space-y-1">
            <Label htmlFor={`nota-${fila.id}`}>Anotación inicial</Label>
            <Input
              id={`nota-${fila.id}`}
              name="nota"
              placeholder="Opcional"
              value={fila.nota}
              onChange={(e) => cambiar(fila.id, "nota", e.target.value)}
            />
          </div>

          <div className="md:col-span-4">
            {/* La ULTIMA fila que queda no se puede quitar: el formulario
                siempre muestra al menos una, para que dar de alta un producto
                con unidades no exija pulsar "Agregar" primero. Una fila vacia
                no crea ninguna unidad -- crearProductoAction() descarta las de
                codigo vacio --, asi que dejarla no obliga a nada. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={filas.length === 1}
              onClick={() => setFilas((previas) => previas.filter((f) => f.id !== fila.id))}
            >
              Quitar unidad {indice + 1}
            </Button>
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => setFilas((previas) => [...previas, filaVacia(sedePorDefecto)])}
      >
        Agregar otra unidad
      </Button>
    </div>
  );
}
