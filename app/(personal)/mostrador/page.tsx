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
import { TarjetaMostrador } from "@/components/mostrador/tarjeta-mostrador";
import { columnaDeReserva, type Columna } from "@/lib/mostrador/columnas";
import { reservasMostrador, type ReservaMostrador } from "@/lib/mostrador/consultas";

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

  return (
    <main className="container flex-1 py-12">
      <h1 className="font-display text-upc-red text-4xl">Mostrador</h1>

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
        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {COLUMNAS.map((columna) => (
            <section key={columna}>
              <h2 className="font-display text-xl">{TITULOS[columna]}</h2>
              <div className="mt-4 space-y-4">
                {columnas[columna].length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nada pendiente en esta columna.</p>
                ) : (
                  columnas[columna].map((reserva) => (
                    <TarjetaMostrador key={reserva.id} reserva={reserva} columna={columna} />
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
