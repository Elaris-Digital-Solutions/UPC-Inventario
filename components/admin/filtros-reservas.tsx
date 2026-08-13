"use client";

// Los cuatro controles de /admin/reservas (F6: texto libre, rango de fecha,
// estado y tres ordenes) Y la tabla filtrada.
//
// PINTA TAMBIEN LA TABLA, igual que FiltroPorEntregar en el mostrador y por el
// mismo motivo: el estado de los filtros (`useState`) y la lista que depende de
// el no se pueden separar en dos componentes hermanos sin subir ese estado a un
// padre comun, y ese padre tendria que ser Client Component igual. La
// alternativa habria sido convertir app/(personal)/admin/reservas/page.tsx
// entera en Client Component y perder la lectura en el servidor.
import { useId, useState } from "react";

import { TablaReservas } from "@/components/admin/tabla-reservas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ETIQUETAS_ESTADO,
  ETIQUETAS_FECHA,
  ETIQUETAS_ORDEN,
  filtrarYOrdenar,
  ORDEN_ESTADOS,
  ORDEN_FECHAS,
  ORDEN_ORDENES,
  type FiltroEstado,
  type FiltroFechaReservas,
  type OrdenReservas,
} from "@/lib/admin/filtros";
import { plural } from "@/lib/admin/plural";
import type { ReservaAdmin } from "@/lib/admin/reservas";

type FiltrosReservasProps = {
  reservas: ReservaAdmin[];
  // El instante actual, como STRING ISO y no como `Date`. Es la frontera
  // servidor->cliente: page.tsx hace la UNICA lectura del reloj de la pagina
  // (regla M-7) y este componente la recibe en vez de volver a leerla. Viaja en
  // ISO porque un string es texto llano y no depende de como el framework
  // decida serializar un `Date` al cruzar -- mismo criterio que ya usa
  // FiltroPorEntregar en el mostrador.
  ahora: string;
};

export function FiltrosReservas({ reservas, ahora }: FiltrosReservasProps) {
  // Los cuatro arrancan SIN filtrar y por inicio descendente -- lo mas reciente
  // arriba, que es el orden que traia el panel de Vite por defecto --. Un
  // filtro que arranca puesto esconde trabajo sin que nadie lo haya pedido.
  const [busqueda, setBusqueda] = useState("");
  const [fecha, setFecha] = useState<FiltroFechaReservas>("todas");
  const [estado, setEstado] = useState<FiltroEstado>("todos");
  const [orden, setOrden] = useState<OrdenReservas>("inicio_desc");

  const idBusqueda = useId();
  const idFecha = useId();
  const idEstado = useId();
  const idOrden = useId();

  const visibles = filtrarYOrdenar(
    reservas,
    { busqueda, fecha, estado, orden },
    new Date(ahora),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor={idBusqueda}>Buscar</Label>
          <Input
            id={idBusqueda}
            type="search"
            value={busqueda}
            onChange={(evento) => setBusqueda(evento.target.value)}
            placeholder="Alumno, correo, equipo, código…"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={idFecha}>Fecha de inicio</Label>
          <Select value={fecha} onValueChange={(v) => setFecha(v as FiltroFechaReservas)}>
            <SelectTrigger id={idFecha} className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDEN_FECHAS.map((opcion) => (
                <SelectItem key={opcion} value={opcion}>
                  {ETIQUETAS_FECHA[opcion]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={idEstado}>Estado</Label>
          <Select value={estado} onValueChange={(v) => setEstado(v as FiltroEstado)}>
            <SelectTrigger id={idEstado} className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* "todos" primero y aparte del recorrido: no es un estado del
                  enum, es la ausencia de filtro. */}
              <SelectItem value="todos">Todos</SelectItem>
              {ORDEN_ESTADOS.map((opcion) => (
                <SelectItem key={opcion} value={opcion}>
                  {ETIQUETAS_ESTADO[opcion]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={idOrden}>Orden</Label>
          <Select value={orden} onValueChange={(v) => setOrden(v as OrdenReservas)}>
            <SelectTrigger id={idOrden} className="mt-1 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORDEN_ORDENES.map((opcion) => (
                <SelectItem key={opcion} value={opcion}>
                  {ETIQUETAS_ORDEN[opcion]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* El recuento dice las DOS cifras cuando el filtro esconde algo. Sin la
          segunda, "3 reservas" sobre una base de 9 no distingue una tabla
          filtrada de una base casi vacia -- que es exactamente el fallo que la
          T1 pago con `npm run dev` hablando con produccion.
          Con plural() por la misma razon que la Task 1: "1 reservas" es el
          defecto que ninguna de las cuatro herramientas marca. */}
      <p className="text-muted-foreground text-sm">
        {visibles.length === reservas.length
          ? plural(reservas.length, "reserva", "reservas")
          : `${visibles.length} de ${plural(reservas.length, "reserva", "reservas")}`}
      </p>

      <TablaReservas reservas={visibles} totalSinFiltrar={reservas.length} />
    </div>
  );
}
