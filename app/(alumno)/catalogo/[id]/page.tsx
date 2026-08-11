// Detalle de un producto, tarea 2A.6. Vive bajo app/(alumno)/, asi que exige
// sesion: el layout de este grupo (app/(alumno)/layout.tsx) ya comprobo
// getClaims() y redirigio a /login a quien no la tenia, y antes de eso
// proxy.ts ya rebota cualquier ruta que no este en RUTAS_PUBLICAS. Por eso
// esta pantalla SI puede leer `product_availability` -algo que la landing no
// puede porque a `anon` se le revoco el SELECT (D-18)- y ensenar cuantas
// unidades hay por sede.
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { detalleProducto, disponibilidadPorSede } from "@/lib/catalogo/consultas";

// Next.js 16: `params` llega como Promise y hay que esperarla antes de leer
// `id`. Escribirlo como un objeto sincrono -como en versiones anteriores de
// Next- no compila bajo `strict`: el tipo generado para esta ruta ya no es
// ese.
// `searchParams` se anadio en la tanda 2B para arrastrar la sede -correccion
// 32 de la 2A-. Es OPCIONAL a proposito: a esta pantalla se puede llegar por
// un enlace compartido sin `?sede=`, y el detalle no la necesita para nada de
// lo que muestra -ensena el stock de TODAS las sedes-. Solo la usa para no
// perderla al volver al catalogo.
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

  // notFound() y no un mensaje sobrio en la propia pagina: desde la tarea
  // 2A.4 el proyecto tiene su propia pantalla 404 (app/not-found.tsx), asi
  // que un id malformado o un UUID que no existe en la base -detalleProducto
  // no distingue los dos casos hacia afuera, solo hacia el log, ver el
  // comentario de esa funcion- enseñan ese 404 propio y no uno generico de
  // fabrica.
  if (producto === null) {
    notFound();
  }

  const sedes = await disponibilidadPorSede(producto.id);

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
            // La sede del enlace: la de la URL SI vino y el producto tiene
            // unidades ahi -comprobado contra `sedes`, que ya sale filtrada a
            // `in_stock = true` por disponibilidadPorSede()-; si no, la
            // PRIMERA de `sedes`. Nunca se manda `?sede=` vacio o inventado:
            // esta pantalla ya sabe, por `sedes`, en cuales SI hay algo que
            // reservar.
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
