// El panel del alumno, Task 12 de la tanda 2B. Vive bajo app/(alumno)/, asi
// que exige sesion igual que el resto del grupo -el layout ya comprobo
// getClaims() antes de llegar aca (app/(alumno)/layout.tsx)-.
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TarjetaReserva } from "@/components/reservas/tarjeta-reserva";
import { grupoDeReserva, type Grupo } from "@/lib/reservas/agrupar";
import { misReservas, type ReservaDelAlumno } from "@/lib/reservas/consultas";

// Una sola pasada agrupando, en vez de tres `.filter()` -uno por seccion-
// que cada uno volveria a llamar grupoDeReserva() para cada reserva. Con las
// pocas reservas que un alumno real va a tener esto no cambia nada medible,
// pero evita que la logica de "a que grupo pertenece" quede repetida tres
// veces en este archivo con la excusa de que es barata.
function agruparReservas(
  reservas: ReservaDelAlumno[],
  ahora: Date,
): Record<Grupo, ReservaDelAlumno[]> {
  const grupos: Record<Grupo, ReservaDelAlumno[]> = {
    en_curso: [],
    proxima: [],
    pasada: [],
  };

  for (const reserva of reservas) {
    grupos[grupoDeReserva(reserva.estado, reserva.fin, ahora)].push(reserva);
  }

  return grupos;
}

export default async function MiPanelPage() {
  const reservas = await misReservas();
  const { en_curso, proxima, pasada } = agruparReservas(reservas, new Date());

  return (
    <main className="container flex-1 py-12">
      <h1 className="font-display text-upc-red text-4xl">Mis reservas</h1>

      {reservas.length === 0 ? (
        // La pantalla vacia se diseña en serio y no se improvisa: CERO
        // RESERVAS es el estado real de produccion hoy -no hay ninguna
        // reserva creada fuera de un escenario de prueba-, asi que esta es
        // la primera pantalla que va a ver cualquiera que entre a
        // /mi-panel apenas se abra el sitio. Un titulo claro, una frase que
        // diga que hacer, y un boton que lleve al catalogo -no un parrafo
        // suelto sin salida, como si el alumno tuviera que adivinar el
        // siguiente paso-.
        <div className="border-border mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">Todavía no tienes reservas</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Explora el catálogo y elige un equipo para reservarlo en el campus y el horario que te
            convengan.
          </p>
          <Button asChild>
            <Link href="/catalogo">Ir al catálogo</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {/* Las tres secciones solo se pintan si tienen contenido: un
              alumno con una unica reserva proxima no deberia ver dos
              encabezados vacios -"En curso" y "Anteriores"- antes de llegar
              a la unica seccion que le importa. */}
          {en_curso.length > 0 && (
            <section>
              <h2 className="font-display text-xl">En curso</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {en_curso.map((reserva) => (
                  <TarjetaReserva key={reserva.id} reserva={reserva} grupo="en_curso" />
                ))}
              </div>
            </section>
          )}

          {proxima.length > 0 && (
            <section>
              <h2 className="font-display text-xl">Próximas</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {proxima.map((reserva) => (
                  <TarjetaReserva key={reserva.id} reserva={reserva} grupo="proxima" />
                ))}
              </div>
            </section>
          )}

          {pasada.length > 0 && (
            <section>
              <h2 className="font-display text-xl">Anteriores</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pasada.map((reserva) => (
                  <TarjetaReserva key={reserva.id} reserva={reserva} grupo="pasada" />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
