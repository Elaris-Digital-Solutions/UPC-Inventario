// El calendario de reserva, Task 9 de la tanda 2B. Vive bajo app/(alumno)/,
// asi que exige sesion igual que el resto del grupo -el layout ya comprobo
// getClaims() antes de llegar aca (app/(alumno)/layout.tsx)-.
//
// Next.js 16: `params` y `searchParams` llegan como Promise y hay que
// esperarlos antes de leer sus propiedades, igual que en
// app/(alumno)/catalogo/[id]/page.tsx y app/(alumno)/catalogo/page.tsx.
//
// La sede llega por query param (`?sede=`) y no por el `params` de la ruta:
// una reserva es contra la unidad de UNA sede, y esta pantalla no tiene
// forma propia de saber cual sin que se la digan -a diferencia del detalle,
// que ensena el stock de todas-. Por eso, sin `?sede=` en la URL esta
// pagina no tiene nada valido que pintar y sale por notFound(), igual que un
// id de producto que no existe.
//
// El dia y la duracion tambien son query params -`?dia=` y `?duracion=`- y
// no estado de React, aunque los dos se puedan cambiar desde botones: el
// dato que decide que pintar (franjasDelDia) se calcula en el SERVIDOR, asi
// que el unico lugar donde "el dia elegido" puede vivir es la URL. Los
// componentes de cliente (SelectorDuracion, Calendario) solo navegan.
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Calendario } from "@/components/reservas/calendario";
import { SelectorDuracion } from "@/components/reservas/selector-duracion";
import { detalleProducto, sedesActivas } from "@/lib/catalogo/consultas";
import { ajustesReserva, diasInhabilitados, franjasDelDia } from "@/lib/reservas/consultas";
import { diasDeLaVentana, duracionesPosibles } from "@/lib/reservas/rejilla";

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sede?: string; dia?: string; duracion?: string }>;
}) {
  const { id } = await params;
  const { sede, dia, duracion } = await searchParams;

  // Sin sede no hay unidad contra la que reservar: no es un valor opcional
  // con un "por defecto" razonable, a diferencia de la sede del catalogo
  // (app/(alumno)/catalogo/page.tsx), que si puede caer en la primera activa
  // porque ahi solo decide que se MUESTRA, no contra que se reserva.
  if (sede === undefined) {
    notFound();
  }

  const producto = await detalleProducto(id);
  if (producto === null) {
    notFound();
  }

  // La sede NO se pasa cruda a la RPC: primero se comprueba que exista entre
  // las activas. Sin esta comprobacion, un `?sede=` inventado hace que
  // available_slots falle con `22P02` -"invalid input syntax for type uuid"-,
  // y franjasDelDia() se traga ese error y devuelve un array vacio, con lo
  // que la pantalla diria "no hay franjas para esta duracion" cuando lo que
  // pasa es que la URL esta mal.
  //
  // Es el mismo par de casos que la tarea 2A.6 ya separo en el detalle: un id
  // malformado y uno inexistente fallan distinto y solo uno es silencioso.
  // Aqui el silencioso seria peor, porque no se ve como un error sino como
  // una respuesta legitima.
  const sedes = await sedesActivas();
  if (!sedes.some((s) => s.id === sede)) {
    notFound();
  }

  const ajustes = await ajustesReserva();

  // Las mismas dos funciones puras que ya probo Task 8 (lib/reservas/rejilla.test.ts):
  // ninguna de las dos toca la base, asi que se calculan aca sin await.
  const dias = diasDeLaVentana(new Date(), ajustes.bookingWindowDays);
  const duraciones = duracionesPosibles(
    producto.maxDurationHours,
    ajustes.slotMinutes,
    ajustes.minDurationMinutes,
  );

  // Un `?dia=` o `?duracion=` que no casa con lo calculado -viejo, copiado a
  // mano, o de un producto con otra duracion maxima- cae al primer valor
  // valido en vez de romper la pagina: mismo criterio que ya uso el catalogo
  // con una `?sede=` que no existe (`sedes.find(...) ?? sedes[0]`).
  const diaElegido = dia !== undefined && dias.includes(dia) ? dia : dias[0];
  const duracionElegida =
    duracion !== undefined && duraciones.includes(Number(duracion))
      ? Number(duracion)
      : duraciones[0];

  const [franjas, ventanaInhabilitada] = await Promise.all([
    franjasDelDia(producto.id, sede, diaElegido, duracionElegida),
    diasInhabilitados(dias[0], dias[dias.length - 1]),
  ]);

  return (
    <main className="container flex-1 py-12">
      <Link
        href={`/catalogo/${producto.id}?sede=${sede}`}
        className="text-muted-foreground text-sm"
      >
        ← Volver a {producto.name}
      </Link>

      <h1 className="font-display text-upc-red mt-4 text-3xl sm:text-4xl">
        Reservar {producto.name}
      </h1>

      <section className="mt-8">
        <h2 className="font-display text-xl">Duración</h2>
        <div className="mt-3">
          <SelectorDuracion
            duraciones={duraciones}
            elegida={duracionElegida}
            sede={sede}
            dia={diaElegido}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Elige el día y la hora</h2>
        <div className="mt-3">
          <Calendario
            dias={dias}
            diaElegido={diaElegido}
            franjas={franjas}
            diasInhabilitados={ventanaInhabilitada}
            duracionMinutos={duracionElegida}
            sede={sede}
          />
        </div>
      </section>

      {/* Deshabilitado a proposito, igual que hizo la tarea 2A.6 con
          "Reservar (muy pronto)" en app/(alumno)/catalogo/[id]/page.tsx: la
          Server Action que llama a create_reservation es la Task 10. Un
          boton habilitado aca no tendria una accion real que ejecutar, y
          quien se llevaria ese hueco seria el alumno. */}
      <div className="mt-8">
        <Button size="lg" disabled>
          Confirmar reserva (muy pronto)
        </Button>
        <p className="text-muted-foreground mt-2 text-sm">
          La confirmación llega en la próxima entrega.
        </p>
      </div>
    </main>
  );
}
