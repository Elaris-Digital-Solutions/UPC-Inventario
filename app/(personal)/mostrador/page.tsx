// El mostrador (F5), Server Component: la lectura de datos y el agrupamiento son
// del servidor. La interactividad de cada tarjeta vive dentro de
// TarjetaMostrador, que SI es Client Component.
import { FiltroPorEntregar } from "@/components/mostrador/filtro-fecha";
import { TarjetaMostrador } from "@/components/mostrador/tarjeta-mostrador";
import { columnaDeReserva, type Columna } from "@/lib/mostrador/columnas";
import { reservasMostrador, type ReservaMostrador } from "@/lib/mostrador/consultas";
import { notasPorUnidad } from "@/lib/mostrador/notas";
import { EncabezadoSeccion } from "@/components/antetitulo";

const TITULOS: Record<Columna, string> = {
  por_entregar: "Por entregar",
  activas: "Activas",
  por_devolver: "Por devolver",
};

// Array EXPLICITO y no `Object.keys(TITULOS)`: eso devuelve `string[]` y
// convertirlo exigiria un `as`. Asi, si `Columna` cambiara, el typecheck de
// `columnas[columna]` falla en vez de quedarse callado.
const COLUMNAS: readonly Columna[] = ["por_entregar", "activas", "por_devolver"];

// UNA sola pasada: un `for` que llama a columnaDeReserva() una vez por reserva,
// no tres `.filter()` que la evaluarian tres veces cada una.
function agruparEnColumnas(
  reservas: ReservaMostrador[],
  ahora: Date,
): Record<Columna, ReservaMostrador[]> {
  const columnas: Record<Columna, ReservaMostrador[]> = {
    por_entregar: [],
    activas: [],
    por_devolver: [],
  };

  for (const reserva of reservas) {
    const columna = columnaDeReserva(reserva.estado, reserva.fin, ahora);

    // `null` es para los cuatro estados terminales, que la consulta ya filtra:
    // rama inalcanzable hoy, comprobada igual porque el tipo lo exige.
    if (columna !== null) {
      columnas[columna].push(reserva);
    }
  }

  return columnas;
}

export default async function MostradorPage() {
  const reservas = await reservasMostrador();

  // UNA SOLA lectura del reloj para TODA la pagina (regla M-7): con dos, una
  // reserva que cruzara la frontera activas/por_devolver entre ambas quedaria
  // agrupada con un `ahora` distinto del que ve su tarjeta.
  const ahora = new Date();
  const columnas = agruparEnColumnas(reservas, ahora);

  // Las notas de TODAS las unidades en UNA sola llamada, antes de pintar nada:
  // evita una consulta por tarjeta. Puede haber ids repetidos -una unidad con dos
  // reservas vivas no simultaneas- y no es problema: un valor repetido dentro de
  // un `in.(...)` no cambia el resultado.
  const unidadIds = reservas.map((reserva) => reserva.unidadId);
  const porUnidad = await notasPorUnidad(unidadIds);

  return (
    <main className="container flex-1 py-12">
      <EncabezadoSeccion
        antetitulo="Atención al público"
        titulo="Mostrador"
        como="h1"
      />

      {reservas.length === 0 ? (
        // Estado vacio DISEÑADO: produccion tiene cero reservas, asi que esta
        // es la PRIMERA pantalla que ve cualquiera que entre al mostrador.
        <div className="border-border mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">No hay ningún equipo pendiente de entregar ni devolver</p>
          <p className="text-muted-foreground max-w-md text-sm">
            En cuanto un alumno reserve un equipo, va a aparecer aquí para que lo entregues o lo recibas.
          </p>
        </div>
      ) : (
        // LAS TRES COLUMNAS SIEMPRE, aunque alguna este vacia, al reves que
        // /mi-panel: alla las secciones son tramos de la vida de un alumno, y
        // aqui son la ESTRUCTURA FIJA del flujo de trabajo. Que "Activas" este
        // vacia es informacion util para quien esta de turno.
        //
        // "Por devolver" lleva acento de aviso: es la unica cuyo contenido
        // significa que algo se paso de hora.
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          {COLUMNAS.map((columna) => (
            <section
              key={columna}
              className={
                columna === "por_devolver"
                  ? "border-destructive/30 bg-destructive/5 rounded-xl border"
                  : "border-border bg-card rounded-xl border"
              }
            >
              <div className="border-border/60 flex items-center justify-between gap-3 border-b px-4 py-3">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase">
                  <span
                    aria-hidden="true"
                    className={
                      columna === "por_devolver"
                        ? "bg-destructive h-3.5 w-0.5"
                        : "bg-primary h-3.5 w-0.5"
                    }
                  />
                  {TITULOS[columna]}
                </h2>
                {/* SOLO en las columnas que no se filtran: en "Por entregar" el
                    numero lo pinta quien sabe cuantas quedan tras el filtro, o
                    diria "3" con una sola tarjeta a la vista. */}
                {columna !== "por_entregar" && (
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {columnas[columna].length}
                  </span>
                )}
              </div>
              <div className="space-y-4 p-4">
                {columna === "por_entregar" ? (
                  // La UNICA columna con filtro de fecha (F5).
                  <FiltroPorEntregar
                    reservas={columnas.por_entregar}
                    // El MISMO `ahora` de arriba (regla M-7), en ISO por la
                    // frontera servidor->cliente.
                    ahora={ahora.toISOString()}
                    notasPorUnidad={porUnidad}
                  />
                ) : columnas[columna].length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nada pendiente en esta columna.</p>
                ) : (
                  columnas[columna].map((reserva) => (
                    <TarjetaMostrador
                      key={reserva.id}
                      reserva={reserva}
                      columna={columna}
                      // `?? []` NO es defensivo: una unidad sin notas no
                      // aparece como clave en el Record, asi que el caso normal
                      // de un equipo sin historial cae aqui.
                      notas={porUnidad[reserva.unidadId] ?? []}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
