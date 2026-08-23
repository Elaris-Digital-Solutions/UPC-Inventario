// Detalle de un producto. Bajo app/(alumno)/, asi que el layout ya exigio sesion.
// Por eso esta pantalla SI puede leer `product_availability` y enseñar cuantas
// unidades hay por sede: a `anon` se le revoco ese SELECT (D-18), que es lo que
// impide lo mismo en la landing.
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  detalleProducto,
  disponibilidadPorSede,
  sedesActivas,
} from "@/lib/catalogo/consultas";

// Next.js 16: `params` llega como Promise y hay que esperarla antes de leer
// `id`; escribirlo sincrono no compila bajo `strict`.
//
// `searchParams` es OPCIONAL a proposito: a esta pantalla se llega por un enlace
// compartido sin `?sede=`, y el detalle no la necesita para nada de lo que
// muestra -enseña el stock de TODAS las sedes-. Solo la arrastra para no perderla
// al volver al catalogo.
export default async function DetalleProductoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sede?: string }>;
}) {
  const { id } = await params;
  const { sede } = await searchParams;
  const producto = await detalleProducto(id);

  // notFound() y no un mensaje en la propia pagina: el proyecto tiene su 404
  // propio, y los dos casos -id malformado y UUID inexistente- acaban ahi.
  if (producto === null) {
    notFound();
  }

  const sedes = await disponibilidadPorSede(producto.id);

  // D-77: el salon vive en `campuses` y la disponibilidad sale de una VISTA que
  // no lo trae. Se pide aparte y se casa por id.
  const activas = await sedesActivas();
  const salonPorSede = new Map(activas.map((s) => [s.id, s.salonDevolucion]));

  return (
    <main className="container flex-1 py-12">
      {/* Conserva la sede si venimos con ella. Sin este `?sede=`, quien
          entraba desde San Miguel volvia a Monterrico -la sede por defecto-,
          que es la correccion 32 de la tanda 2A. Cuando no hay sede en la
          URL, el enlace pelado sigue siendo correcto: el catalogo cae en su
          sede por defecto, igual que antes. */}
      <Link
        href={sede === undefined ? '/catalogo' : `/catalogo?sede=${sede}`}
        className="text-muted-foreground text-sm"
      >
        ← Volver al catálogo
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="bg-muted relative aspect-[4/3] overflow-hidden rounded-lg">
            <Image
              src={producto.imagenes[0] ?? "/placeholder.svg"}
              alt={producto.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          </div>

          {/* El caso real hoy es UNA sola imagen -34 imagenes para 34
              productos, todas is_main, medido el 2026-08-10-. Por eso la
              galeria se diseña PARA una y ADMITE varias, no al reves: una
              tira de miniaturas con un solo elemento seria un adorno vacio,
              asi que solo aparece cuando de verdad hay mas de una. Y las
              secundarias se pintan todas a la vez -sin flecha ni indice- en
              vez de un carrusel, porque un carrusel exige estado y habria
              convertido esta pantalla en Client Component para resolver un
              caso que hoy no existe. */}
          {producto.imagenes.length > 1 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {producto.imagenes.slice(1).map((url, indice) => (
                <div
                  key={url}
                  className="bg-muted relative aspect-square overflow-hidden rounded-lg"
                >
                  <Image
                    src={url}
                    alt={`${producto.name} (imagen ${indice + 2})`}
                    fill
                    sizes="(min-width: 1024px) 12vw, 25vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {producto.category !== null && (
            <Badge variant="secondary">{producto.category}</Badge>
          )}

          <h1 className="font-display mt-3 text-3xl sm:text-4xl">{producto.name}</h1>

          {producto.description !== null && (
            <p className="text-muted-foreground mt-4">{producto.description}</p>
          )}

          <p className="mt-4">
            {producto.maxDurationHours === 1
              ? "Puedes reservarlo hasta 1 hora seguida"
              : `Puedes reservarlo hasta ${producto.maxDurationHours} horas seguidas`}
          </p>

          <div className="mt-8">
            <h2 className="font-display text-xl">Unidades por sede</h2>

            {sedes.length === 0 ? (
              <p className="text-muted-foreground mt-2">
                Este equipo no tiene unidades activas en ninguna sede.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {sedes.map((sede) => (
                  <li key={sede.campusId}>
                    {sede.campusName}:{" "}
                    {sede.unidades === 1 ? "1 unidad" : `${sede.unidades} unidades`}
                    {/* D-77. El condicional no es defensivo por costumbre: la
                        columna es nullable a proposito, asi que una sede sin
                        salon es un estado valido y no un error. */}
                    {salonPorSede.get(sede.campusId) ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · se devuelve en {salonPorSede.get(sede.campusId)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}

            {/* Que haya unidades no significa que esten libres en la franja
                que el alumno quiera: `active_units` cuenta unidades activas
                en la sede, no libres ahora mismo -eso depende de que nadie
                las tenga reservadas en ese horario, un dato que
                disponibilidadPorSede ni pide-. Prometer "disponible" aqui
                seria la misma mentira que D-21 descarta para la vitrina,
                repetida en el detalle con otro nombre. Esta pantalla SI
                puede enseñar el numero de unidades porque `authenticated`
                tiene permiso de SELECT sobre la vista y `anon` no. */}
            <p className="text-muted-foreground mt-2 text-sm">
              Que haya unidades no significa que estén libres en la franja que
              quieras: eso se ve al reservar.
            </p>
          </div>

          {/* Este comentario va por su SEGUNDA version -la primera ya habia
              reemplazado a otra que tambien dejo de ser cierta-:
                ~~"Sigue deshabilitado, pero YA NO por el motivo original...
                Lo que todavia no existe es la Server Action que llama a
                `create_reservation`, y esa es la 2B.10. Se habilita ahi y no
                aqui..."~~
              Desde la Task 10 esa Server Action existe
              (lib/reservas/acciones.ts) y el boton YA NO ESTA DESHABILITADO
              EN ABSOLUTO -salvo el caso real de mas abajo, sin sedes con
              stock-: es un enlace a la pantalla de reserva. Un comentario
              que era cierto y deja de serlo es peor que no tenerlo: compila
              igual y enseña lo contrario de lo que pasa. */}
          {sedes.length === 0 ? (
            <>
              {/* Sin ninguna sede con unidades activas no hay contra que
                  reservar, y `/catalogo/[id]/reservar` sin `?sede=` sale por
                  notFound() (ver el comentario de esa pagina) -un enlace
                  aca llevaria a un 404 real, no a "muy pronto". Se queda
                  deshabilitado, y esta vez por un motivo que si es
                  permanente: no hay ninguna sede valida contra la que
                  reservar. */}
              <Button size="lg" disabled className="mt-8 w-full sm:w-auto">
                Reservar
              </Button>
              <p className="text-muted-foreground mt-2 text-sm">
                Este equipo no tiene unidades activas en ninguna sede: no hay
                nada que reservar.
              </p>
            </>
          ) : (
            // La de la URL si vino Y el producto tiene unidades ahi; si no, la
            // primera de `sedes`. Nunca se manda un `?sede=` vacio o inventado:
            // esta pantalla ya sabe en cuales hay algo que reservar.
            //
            // NO comprueba sancion: quien llega por aqui cae en la pantalla de
            // reserva, que si la comprueba y explica el bloqueo alli.
            <Button asChild size="lg" className="mt-8 w-full sm:w-auto">
              <Link
                href={`/catalogo/${producto.id}/reservar?sede=${
                  sede !== undefined && sedes.some((s) => s.campusId === sede)
                    ? sede
                    : sedes[0].campusId
                }`}
              >
                Reservar
              </Link>
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
