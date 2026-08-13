// El mostrador, Task 1 de la tanda 3A para el andamio y Task 5 para las tres
// columnas de verdad. CORRECCION sobre el comentario original de este
// archivo (Task 1): decia que "las tres columnas... llegan en las
// siguientes tareas de esta tanda" -ya llegaron, y un comentario caducado
// compila igual que uno cierto.
//
// Server Component, sin "use client": la lectura de datos y el agrupamiento
// son del servidor. La interactividad de cada tarjeta -los botones y su
// estado pendiente/error- vive dentro de TarjetaMostrador
// (components/mostrador/tarjeta-mostrador.tsx), que SI es Client Component.
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

// El ORDEN de pintado, F5, como array explicito y no `Object.keys(TITULOS)`.
// `Object.keys()` devuelve `string[]`, y convertirlo a `Columna[]` exigiria
// un `as` que le mentiria al compilador sobre algo que si puede comprobar
// solo: escrito asi, si `Columna` ganara o perdiera un miembro algun dia, el
// typecheck de abajo (`columnas[columna]`) fallaria en vez de quedarse
// callado -la misma razon por la que este proyecto evita `as` en
// lib/reservas/acciones.ts (ver esMotivoValido()).
const COLUMNAS: readonly Columna[] = ["por_entregar", "activas", "por_devolver"];

// Una sola pasada agrupando en las tres columnas, siguiendo el MISMO patron
// que agruparReservas() en app/(alumno)/mi-panel/page.tsx: un unico `for`
// que llama a columnaDeReserva() UNA vez por reserva, no tres `.filter()`
// que cada uno volveria a evaluar la regla para cada fila.
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

    // columnaDeReserva() devuelve `Columna | null`, no `Columna`: tiene que
    // ser TOTAL sobre los seis valores de EstadoReserva (ver su comentario
    // en lib/mostrador/columnas.ts). `null` es para los cuatro estados
    // terminales, y reservasMostrador() ya filtra `status in ('reserved',
    // 'active')` en la consulta -asi que esta rama es estructuralmente
    // inalcanzable HOY-, pero se comprueba igual porque el tipo lo exige.
    if (columna !== null) {
      columnas[columna].push(reserva);
    }
  }

  return columnas;
}

export default async function MostradorPage() {
  const reservas = await reservasMostrador();

  // UNA SOLA lectura del reloj para TODA la pagina, pasada a
  // columnaDeReserva() para cada reserva. Es el mismo fallo M-7 que
  // app/(alumno)/mi-panel/page.tsx ya resolvio de esta forma: dos lecturas
  // del reloj para la misma decision podrian desincronizarse entre si -una
  // reserva que cruzara la frontera activas/por_devolver justo entre las dos
  // llamadas quedaria agrupada con un `ahora` distinto del que ve cada
  // tarjeta.
  const ahora = new Date();
  const columnas = agruparEnColumnas(reservas, ahora);

  // Las notas de TODAS las unidades que aparecen en esta pagina, en UNA sola
  // llamada -Task 7 de la tanda 3A-, mismo motivo que reservasMostrador() se
  // llama una unica vez arriba: notasPorUnidad() (lib/mostrador/notas.ts) ya
  // acepta un array entero y hace una sola consulta con `in.(...)`, asi que
  // pedirla aca, antes de pintar cualquier tarjeta, evita una consulta por
  // tarjeta. Puede haber `unit_id` repetidos si la misma unidad tiene mas de
  // una reserva viva sin solape de horario -el `EXCLUDE` anti-solape impide
  // que se solapen en el tiempo, no que existan dos reservas no simultaneas
  // sobre la misma unidad-, y eso no es un problema: un valor repetido
  // dentro de un `in.(...)` no cambia el resultado, solo lo pide dos veces.
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
        // Estado vacio DISEÑADO y no improvisado: el proyecto real tiene
        // CERO reservas hoy (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md, "La
        // forma real de los datos"), asi que esta es la PRIMERA pantalla que
        // va a ver cualquier operador o admin que entre a /mostrador. Mismo
        // criterio que app/(alumno)/mi-panel/page.tsx aplico para su propio
        // vacio: un titulo claro y una frase que diga que significa, no un
        // area en blanco sin explicacion.
        <div className="border-border mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium">No hay ningún equipo pendiente de entregar ni devolver</p>
          <p className="text-muted-foreground max-w-md text-sm">
            En cuanto un alumno reserve un equipo, va a aparecer aquí para que lo entregues o lo recibas.
          </p>
        </div>
      ) : (
        // Con reservas, las TRES columnas se pintan SIEMPRE, aunque alguna
        // este vacia -a diferencia de app/(alumno)/mi-panel/page.tsx, que
        // oculta una seccion sin contenido-. La diferencia es a proposito:
        // alla las secciones son tramos de la vida de UN alumno (en curso,
        // proximas, anteriores) y ocultar una vacia evita encabezados sin
        // sentido para esa persona. Aca las tres columnas son la ESTRUCTURA
        // FIJA del flujo de trabajo del mostrador (F5): que "Activas" este
        // vacia es informacion util para quien esta de turno -"no tengo
        // nada afuera ahora mismo"-, no un tramo que no aplique.
        // Las tres columnas como CARRILES y no como tres listas sueltas.
        // Antes eran un <h2> y tarjetas flotando sobre el fondo de la pagina,
        // asi que "Por devolver" vacia se leia como un hueco en blanco y no
        // como una columna sin nada. Ahora cada una tiene su plano, su regla
        // roja de cabecera y su contador.
        //
        // "Por devolver" ademas lleva acento de aviso: es la unica de las
        // tres cuyo contenido significa que algo se paso de hora. Que se vea
        // igual que las otras dos era plano en el sentido malo -toda la
        // pantalla con el mismo peso, y la urgencia enterrada.
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
                {/* El contador SOLO en las dos columnas que no se filtran. En
                    "Por entregar" el numero lo pinta FiltroPorEntregar, que es
                    quien sabe cuantas quedan tras el filtro: ponerlo aca daria
                    el total y contradiria a la lista de debajo -un "3" con una
                    sola tarjeta a la vista-. */}
                {columna !== "por_entregar" && (
                  <span className="text-muted-foreground font-mono text-xs tabular-nums">
                    {columnas[columna].length}
                  </span>
                )}
              </div>
              <div className="space-y-4 p-4">
                {columna === "por_entregar" ? (
                  // La UNICA columna con el filtro de fecha (F5, Task 8 de
                  // la tanda 3A). "Activas" y "Por devolver" NO cambian: se
                  // siguen pintando abajo exactamente igual que antes de
                  // esta tarea, mapeando columnas[columna] directo.
                  <FiltroPorEntregar
                    reservas={columnas.por_entregar}
                    // El MISMO `ahora` leido una sola vez arriba (regla
                    // M-7), no un segundo `new Date()` dentro del
                    // componente cliente: viaja como ISO porque esa es la
                    // frontera servidor->cliente que FiltroPorEntregar
                    // documenta en sus props.
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
                      // `?? []` NO es defensivo "por si acaso": una unidad
                      // sin ninguna nota simplemente NO aparece como clave
                      // en el `Record` que devuelve notasPorUnidad() -esa
                      // funcion solo agrega una clave cuando encuentra al
                      // menos una fila para agrupar-, asi que el caso normal
                      // de un equipo sin historial cae aca, no en un error.
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
