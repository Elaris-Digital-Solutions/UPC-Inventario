import { DialogoEstadoUnidad } from "@/components/admin/dialogo-estado-unidad";
import { DialogoNota } from "@/components/mostrador/dialogo-nota";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EstadoUnidad, UnidadDetalle } from "@/lib/admin/consultas";
import type { NotaUnidad } from "@/lib/mostrador/notas";

// Las unidades de un producto, con su estado y su historial de notas (F7).
//
// Server Component, sin "use client": pinta y enlaza. Los dos dialogos que
// monta -- el de estado y el de nota -- SI son de cliente, cada uno con su
// propia directiva.
//
// REUTILIZA DialogoNota DE components/mostrador/, sin copiarlo. Escribe en la
// misma tabla con la misma politica y el mismo aviso de privacidad; lo unico
// que cambiaba era que ruta revalidar despues, y eso se resolvio agregandole
// un parametro con valor por defecto en vez de duplicar el dialogo entero.
// Que viva bajo `components/mostrador/` es una herencia del sitio donde nacio
// (Task 7 de la T3A), no una afirmacion de que solo sirva alli.

type PanelUnidadesProps = {
  productoId: string;
  unidades: UnidadDetalle[];
  notasPorUnidad: Record<string, NotaUnidad[]>;
};

const ETIQUETA_ESTADO: Record<EstadoUnidad, string> = {
  active: "Disponible",
  maintenance: "En mantenimiento",
  retired: "Retirada",
};

// `secondary` para la disponible y `outline` para las otras dos: lo que
// distingue no es el color sino que la disponible es el caso normal. No se
// afina nada mas -- la fase visual la hace otra persona.
const VARIANTE_ESTADO: Record<EstadoUnidad, "secondary" | "outline"> = {
  active: "secondary",
  maintenance: "outline",
  retired: "outline",
};

export function PanelUnidades({ productoId, unidades, notasPorUnidad }: PanelUnidadesProps) {
  if (unidades.length === 0) {
    return (
      <p className="text-muted-foreground py-6 text-sm">
        Este producto todavía no tiene unidades. Sin unidades no se puede reservar.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Código</TableHead>
            <TableHead>Código de activo</TableHead>
            <TableHead>Sede</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Notas</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {unidades.map((unidad) => {
            const notas = notasPorUnidad[unidad.id] ?? [];

            return (
              <TableRow key={unidad.id}>
                <TableCell className="font-medium">{unidad.unitCode}</TableCell>

                <TableCell>
                  {/* Sin codigo de activo se DICE, no se deja en blanco. Una
                      celda vacia no distingue "no tiene" de "no se cargo", y
                      en el catalogo real son 38 de 92 unidades: es el hueco
                      mas repetido del inventario. */}
                  {unidad.assetCode ?? (
                    <Badge variant="destructive">Sin código</Badge>
                  )}
                </TableCell>

                <TableCell>{unidad.sede}</TableCell>

                <TableCell>
                  <Badge variant={VARIANTE_ESTADO[unidad.estado]}>
                    {ETIQUETA_ESTADO[unidad.estado]}
                  </Badge>
                </TableCell>

                <TableCell>{notas.length}</TableCell>

                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <DialogoEstadoUnidad
                      unidadId={unidad.id}
                      unidad={unidad.unitCode}
                      estadoActual={unidad.estado}
                      productoId={productoId}
                    />
                    {/* `ruta` explicita: sin ella, anotar() revalidaria
                        /mostrador -- que el admin no esta mirando -- y esta
                        pantalla se quedaria con el historial viejo. */}
                    <DialogoNota
                      unidadId={unidad.id}
                      unidad={unidad.unitCode}
                      notas={notas}
                      ruta={`/admin/inventario/${productoId}`}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
