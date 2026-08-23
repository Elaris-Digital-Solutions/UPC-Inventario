// El calendario de reserva. Bajo app/(alumno)/, asi que el layout del grupo ya
// exigio sesion.
//
// Next.js 16: `params` y `searchParams` llegan como Promise y hay que esperarlos
// antes de leer sus propiedades.
//
// LA SEDE VIENE POR `?sede=` y no por el `params` de la ruta: una reserva es
// contra la unidad de UNA sede, y esta pantalla no tiene forma propia de saber
// cual. Sin ella no hay nada valido que pintar, asi que sale por notFound().
//
// EL DIA Y LA DURACION TAMBIEN SON QUERY PARAMS y no estado de React: lo que
// decide que pintar se calcula en el SERVIDOR, asi que el unico sitio donde
// pueden vivir es la URL. La franja elegida SI es estado de cliente, porque no
// pide nada nuevo a la base: la guarda FormularioReserva.
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FormularioReserva } from "@/components/reservas/formulario-reserva";
import { SelectorDuracion } from "@/components/reservas/selector-duracion";
import { detalleProducto, sedesActivas } from "@/lib/catalogo/consultas";
import {
  ajustesReserva,
  diasInhabilitados,
  franjasDelDia,
  sancionDelAlumno,
} from "@/lib/reservas/consultas";
import { diasDeLaVentana, duracionesPosibles } from "@/lib/reservas/rejilla";
import { sancionVigente, textoDeSancion } from "@/lib/reservas/sancion";
import { createClient } from "@/lib/supabase/server";

export default async function ReservarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sede?: string; dia?: string; duracion?: string }>;
}) {
  const { id } = await params;
  const { sede, dia, duracion } = await searchParams;

  // Sin sede no hay unidad contra la que reservar, y no hay "por defecto"
  // razonable: en el catalogo si lo hay, porque alli solo decide que se MUESTRA.
  if (sede === undefined) {
    notFound();
  }

  // D-79: LA PUERTA DEL PERFIL VIVE AQUI y no en el layout del grupo.
  //
  // Resolver la sesion otra vez NO es duplicacion: un layout no le pasa props a su
  // pagina, y lo que se comprueba tampoco es lo mismo -alli que exista, aqui que
  // este completa-.
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  if (!sub) {
    redirect("/login");
  }

  const { data: alumno } = await supabase
    .from("alumnos")
    .select("nombre, apellido, carrera_id, confirmo_facultad")
    .eq("auth_user_id", sub)
    .maybeSingle();

  if (!alumno) {
    redirect("/auth/error");
  }

  // `confirmo_facultad` entra en la condicion y `es_profesor` NO, y la
  // diferencia importa: no haber confirmado es un perfil incompleto, pero NO
  // SER PROFESOR ES UNA RESPUESTA VALIDA. Si es_profesor entrara aca, ningun
  // alumno pasaria nunca de esta linea.
  if (
    !alumno.nombre ||
    !alumno.apellido ||
    !alumno.carrera_id ||
    !alumno.confirmo_facultad
  ) {
    // El destino viaja en la URL para que rellenar los datos no expulse de la
    // reserva que se estaba haciendo.
    const volverA = `/catalogo/${id}/reservar?sede=${sede}`;
    redirect(`/completar-perfil?volver=${encodeURIComponent(volverA)}`);
  }

  const producto = await detalleProducto(id);
  if (producto === null) {
    notFound();
  }

  // LA SEDE NO SE PASA CRUDA A LA RPC: un `?sede=` inventado haria fallar
  // `available_slots` con `22P02`, franjasDelDia() se traga ese error y devuelve
  // vacio, y la pantalla diria "no hay franjas" cuando lo que pasa es que la URL
  // esta mal. Ese silencio es peor que un error: parece una respuesta legitima.
  const sedes = await sedesActivas();
  if (!sedes.some((s) => s.id === sede)) {
    notFound();
  }

  // ANTES de pedir nada del calendario: si el alumno esta sancionado,
  // `create_reservation` va a rechazar pase lo que pase, asi que las tres
  // consultas de la rejilla serian trabajo tirado. Y enseñarla igual seria
  // ofrecer un calendario con el que no se puede terminar.
  const bannedUntil = await sancionDelAlumno();
  const sancion = sancionVigente(bannedUntil, new Date());

  if (sancion !== null) {
    return (
      <main className="container flex-1 py-12">
        <Link
          href={`/catalogo/${producto.id}?sede=${sede}`}
          className="text-muted-foreground text-sm"
        >
          ← Volver a {producto.name}
        </Link>

        <h1 className="font-display mt-4 text-3xl leading-tight font-bold text-balance sm:text-4xl">
          Reservar {producto.name}
        </h1>

        {/* role="alert": aqui no hay calendario ni formulario, nada que llevara
            a una reserva que el motor va a rechazar igual. */}
        <p
          role="alert"
          className="bg-destructive/10 text-destructive mt-8 rounded-lg px-4 py-3 text-sm"
        >
          {textoDeSancion(sancion)}
        </p>
      </main>
    );
  }

  const ajustes = await ajustesReserva();

  // Las dos son puras y no tocan la base, asi que se calculan sin await.
  const dias = diasDeLaVentana(new Date(), ajustes.bookingWindowDays);
  const duraciones = duracionesPosibles(
    producto.maxDurationHours,
    ajustes.slotMinutes,
    ajustes.minDurationMinutes,
  );

  // Un `?dia=` o `?duracion=` que no casa -viejo, o de un producto con otra
  // duracion maxima- cae al primer valor valido en vez de romper la pagina.
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

      <h1 className="font-display mt-4 text-3xl leading-tight font-bold text-balance sm:text-4xl">
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
          {/* La `key` NO es decorativa. Cambiar de dia o de duracion es un
              router.push() a esta misma ruta, asi que React reconcilia el arbol
              y el estado de cliente SOBREVIVE. Sin ella, elegir las 10:00 del
              martes y cambiar al miercoles dejaria el hidden `slotStart` con el
              instante del martes: se reservaria una franja que ya no se eligio,
              sin que nada en pantalla lo delatara. */}
          <FormularioReserva
            key={`${diaElegido}-${duracionElegida}`}
            productoId={producto.id}
            sede={sede}
            dias={dias}
            diaElegido={diaElegido}
            franjas={franjas}
            diasInhabilitados={ventanaInhabilitada}
            duracionMinutos={duracionElegida}
          />
        </div>
      </section>
    </main>
  );
}
