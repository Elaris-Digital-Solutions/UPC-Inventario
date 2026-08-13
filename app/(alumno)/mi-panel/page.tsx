// El panel del alumno, Task 12 de la tanda 2B. Vive bajo app/(alumno)/, asi
// que exige sesion igual que el resto del grupo -el layout ya comprobo
// getClaims() antes de llegar aca (app/(alumno)/layout.tsx)-.
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { TarjetaReserva } from "@/components/reservas/tarjeta-reserva";
import { grupoDeReserva, type Grupo } from "@/lib/reservas/agrupar";
import { miEncuesta, misReservas, type ReservaDelAlumno } from "@/lib/reservas/consultas";
import { EncabezadoSeccion } from "@/components/antetitulo";

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
  // En paralelo, y no en secuencia: las dos consultas son independientes -una
  // lee inventory_reservations, la otra final_satisfaction_surveys- y ninguna
  // necesita el resultado de la otra para ejecutarse.
  const [reservas, encuesta] = await Promise.all([misReservas(), miEncuesta()]);

  // UNA SOLA lectura del reloj para toda la pantalla, reutilizada tanto para
  // agrupar como para pasarla a cada <TarjetaReserva>. Es el fallo M-7 que ya
  // senala el comentario de TarjetaReservaProps: dos lecturas del reloj para
  // la misma decision pueden desincronizarse entre si -una reserva que
  // venciera justo entre las dos llamadas quedaria agrupada con un `ahora` y
  // evaluada por seOfreceCancelar() con otro.
  const ahora = new Date();
  const { en_curso, proxima, pasada } = agruparReservas(reservas, ahora);

  return (
    <main className="container flex-1 py-12">
      <EncabezadoSeccion
        antetitulo="Tu actividad"
        titulo="Mis reservas"
        como="h1"
      />

      {/* La invitacion a la encuesta (BR-18), Task 14 de la tanda 2B.
          Aparece SOLO si el alumno no la contesto todavia Y tiene al menos
          una reserva -`reservas` ya esta cargado arriba para pintar las
          secciones de mas abajo, asi que su `.length` se reutiliza en vez de
          anadir una tercera consulta solo para esta condicion-.

          La especificacion (F10, MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md
          linea 185) dice que se dispara "si el alumno tiene alguna reserva
          CREADA DESPUES DEL 2026-03-20 y aun no la respondio". Esta pantalla
          no compara esa fecha por ninguna parte, y no es un recorte que
          falte: la base de este proyecto se reconstruyo en agosto de 2026 -Fase
          1, cerrada el 2026-08-05-, asi que NINGUNA reserva del sistema nuevo
          puede tener una fecha de creacion anterior a ese corte. La condicion
          de fecha de BR-18 se cumple sola con solo existir la fila, y por eso
          la invitacion se decide con "tiene al menos una reserva" y no
          repitiendo una comparacion de fechas que nunca podria fallar. */}
      {encuesta === null && reservas.length > 0 && (
        <div className="border-border bg-secondary mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
          <p>¿Cómo te fue con el sistema de reservas? Cuéntanoslo en la encuesta de satisfacción.</p>
          <Button asChild size="sm">
            <Link href="/encuesta">Responder encuesta</Link>
          </Button>
        </div>
      )}

      {/* Si ya la contesto, la invitacion NO SE REPITE -Step 4 del plan-,
          pero queda un enlace discreto para editarla: `surveys_update_own`
          existe justamente para eso (F10), y una encuesta editable a la que
          no se puede volver desde ninguna pantalla seria una funcion
          muerta. */}
      {encuesta !== null && (
        <p className="text-muted-foreground mt-6 text-sm">
          <Link href="/encuesta" className="underline underline-offset-2">
            Editar mi encuesta de satisfacción
          </Link>
        </p>
      )}

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
                  <TarjetaReserva key={reserva.id} reserva={reserva} grupo="en_curso" ahora={ahora} />
                ))}
              </div>
            </section>
          )}

          {proxima.length > 0 && (
            <section>
              <h2 className="font-display text-xl">Próximas</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {proxima.map((reserva) => (
                  <TarjetaReserva key={reserva.id} reserva={reserva} grupo="proxima" ahora={ahora} />
                ))}
              </div>
            </section>
          )}

          {pasada.length > 0 && (
            <section>
              <h2 className="font-display text-xl">Anteriores</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pasada.map((reserva) => (
                  <TarjetaReserva key={reserva.id} reserva={reserva} grupo="pasada" ahora={ahora} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
