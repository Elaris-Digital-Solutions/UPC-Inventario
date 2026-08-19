import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { FilaInventario } from "@/lib/admin/consultas";
import { plural } from "@/lib/admin/plural";

// La tabla del listado de inventario (F7). Server Component, sin
// "use client": no tiene ni un solo manejador de eventos ni estado -solo
// pinta lo que le llega y enlaza-. La interactividad de esta pantalla llega
// en las Tasks 2, 3 y 5, dentro de sus propios componentes de cliente.

type TablaInventarioProps = {
  filas: FilaInventario[];
};

export function TablaInventario({ filas }: TablaInventarioProps) {
  if (filas.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        Todavía no hay productos en el catálogo.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Máximo</TableHead>
            <TableHead className="text-right">Retorno</TableHead>
            <TableHead>Unidades</TableHead>
            {/* Antes decia "Imágenes" y contaba; ahora hay UNA foto, asi que el
                encabezado va en singular. No es cosmetica: un plural sobre una
                sola miniatura sugiere que faltan las demas. */}
            <TableHead>Imagen</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filas.map((fila) => (
            <TableRow key={fila.id}>
              <TableCell className="font-medium">
                {/* Enlaza a /admin/inventario/[id], que la Task 3 construye.
                    HASTA ENTONCES ES UN 404, y se pone igual -al reves que en
                    components/cabecera-personal.tsx, donde los enlaces a
                    /admin/* se dejaron fuera durante toda la T3A-. La
                    diferencia no es de criterio sino de plazo: alli faltaba
                    una TANDA entera, y aca faltan dos commits de esta misma
                    tanda. Un enlace roto en la cabecera lo ve el admin en
                    TODAS las pantallas; uno dentro de una tabla lo ve quien
                    esta mirando justo esa tabla. */}
                <Link href={`/admin/inventario/${fila.id}`} className="hover:underline">
                  {fila.nombre}
                </Link>
              </TableCell>

              {/* `categoria` es `text` NULLABLE en el esquema -- no todos los
                  productos tienen por que tenerla. En el catalogo real los 34
                  la tienen, pero el tipo admite null y la pantalla tambien:
                  que hoy no haya ninguno no es que no pueda haberlo. */}
              <TableCell>
                {fila.categoria ?? <span className="text-muted-foreground">Sin categoría</span>}
              </TableCell>

              <TableCell className="text-right">{fila.maxDuracionHoras} h</TableCell>
              <TableCell className="text-right">{fila.bufferMinutos} min</TableCell>

              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant="secondary">
                    {plural(fila.unidadesActive, "activa", "activas")}
                  </Badge>

                  {/* Los dos estados que NO son `active` solo se pintan si
                      hay alguno. No es estetica: es que un "0 en
                      mantenimiento" repetido en 34 filas esconde justamente
                      la fila donde ese numero no es cero. En el catalogo real
                      -medido el 2026-08-12- las 92 unidades estan `active`,
                      asi que hoy estas dos insignias no aparecen NUNCA en
                      produccion; el seed local si trae una en `maintenance`,
                      y por ahi se prueba que se ven cuando toca. */}
                  {fila.unidadesMaintenance > 0 && (
                    <Badge variant="outline">{fila.unidadesMaintenance} en mantenimiento</Badge>
                  )}
                  {fila.unidadesRetired > 0 && (
                    <Badge variant="outline">
                      {plural(fila.unidadesRetired, "retirada", "retiradas")}
                    </Badge>
                  )}

                  {/* La insignia que existe por una medicion y no por F7: 38
                      de las 92 unidades reales no tienen `asset_code`, y su
                      `unit_code` es un `AUTO-...` generado desde el nombre del
                      producto. Nadie las identifica en un estante. Que se vean
                      es VISIBILIDAD -que algo aparezca cuando debe-, y por eso
                      entra aunque la especificacion no la pida. */}
                  {fila.unidadesSinCodigo > 0 && (
                    <Badge variant="destructive">{fila.unidadesSinCodigo} sin código</Badge>
                  )}
                </div>
              </TableCell>

              {/* La miniatura sustituye al RECUENTO de imagenes (F3-T3). Un
                  numero no dice que equipo es; la foto identifica la fila de
                  un vistazo, que es lo que el admin necesita para no abrir 34
                  fichas buscando una.

                  `next/image` con medidas FIJAS y no `fill`: dentro de una
                  celda de tabla, `fill` exigiria un contenedor con posicion
                  relativa y alto propio, y eso si seria maquetar. Asi la celda
                  se comporta como cualquier otra.

                  El tamano es FUNCIONAL, no afinado: 56 px es lo minimo con lo
                  que se reconoce un equipo en una lista. Ajustarlo es de la
                  fase visual, que hace otra persona.

                  El respaldo es `/placeholder.svg`, el MISMO que usa
                  components/catalogo/tarjeta-producto.tsx: dos huecos
                  distintos para el mismo caso se leerian como dos estados
                  distintos. */}
              <TableCell>
                <Image
                  src={fila.imagenUrl ?? "/placeholder.svg"}
                  alt={fila.nombre}
                  width={56}
                  height={56}
                  className="bg-muted rounded object-cover"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
