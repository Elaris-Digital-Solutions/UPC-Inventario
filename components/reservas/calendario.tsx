"use client";

// El calendario de la Task 9: la fila de dias de la ventana y la rejilla de
// franjas del dia elegido. Igual que selector-duracion.tsx, navega en vez de
// llamar a un callback recibido por props: esta pagina vive bajo un Server
// Component (app/(alumno)/catalogo/[id]/reservar/page.tsx) y Next no deja
// pasarle una funcion de cliente a traves de esa frontera salvo que sea una
// Server Action. Elegir un dia es un cambio de `?dia=` en la URL, porque
// quien vuelve a pedir la rejilla -franjasDelDia(), en
// lib/reservas/consultas.ts- corre en el servidor.
//
// La logica de que MENSAJE mostrar cuando no hay franjas vive aca y no en
// lib/reservas/consultas.ts a proposito: interpretar bien un array vacio
// necesita CRUZAR dos respuestas -franjas del dia y diasInhabilitados()- que
// esa capa devuelve por separado. Juntarlas es trabajo de quien las consume.
//
// Los tres mensajes, en el orden en que se comprueban, y por que ese orden:
//
//   (a) El dia elegido esta en `disabled_days` -diasInhabilitados() lo trae
//       aparte-. Se comprueba PRIMERO porque un dia inhabilitado tambien
//       hace que available_slots devuelva cero filas, y sin este chequeo se
//       confundiria con el caso (b).
//
//   (b) Es HOY (el primer elemento de `dias`, por contrato de
//       diasDeLaVentana() en lib/reservas/rejilla.ts) y `franjas` vino
//       vacio: significa que ya no cabe ninguna franja de esta duracion en
//       lo que queda del dia. Medido hoy 2026-08-10 a las 19:31 de Lima: 30
//       minutos daba 4 filas (20:00 a 21:30) y 240 minutos daba CERO, porque
//       la ultima franja de 4 horas habria empezado a las 18:00 y ya paso
//       -y ese dia no estaba inhabilitado-.
//
//       Si `franjas` vino vacio y el dia NO es hoy, no deberia poder pasar
//       con los dias que este componente recibe -`dias` ya viene acotado a
//       la ventana movil (diasDeLaVentana), asi que la tercera causa medida
//       de cero filas ("fuera de ventana") no aplica a ningun dia de esta
//       lista-. Se deja un mensaje generico igual, y no un error, porque una
//       pantalla que se rompe por un caso que la teoria dice que no deberia
//       llegar es peor que una que se degrada con un texto sobrio.
//
//   (c) `franjas` trajo filas pero TODAS con `free = 0`: un dia lleno de
//       verdad, no vacio. Medido montando el escenario -la unica unidad del
//       producto puesta en `maintenance`-: la RPC devolvio sus 28 filas con
//       las 28 en `free = 0`, no cero filas. Es lo que separa este caso del
//       (a) y del (b), que si llegan vacios.
//
// Si ninguno de los tres aplica, se pinta la rejilla.
import { usePathname, useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import type { DiaInhabilitado, Franja } from "@/lib/reservas/consultas";

type CalendarioProps = {
  dias: string[];
  diaElegido: string;
  franjas: Franja[];
  diasInhabilitados: DiaInhabilitado[];
  duracionMinutos: number;
  sede: string;
  // Las dos props de la Task 10. A diferencia de dia/duracion -que navegan,
  // porque el servidor necesita volverlos a pedir- elegir una franja no pide
  // nada nuevo a la base: por eso vive en el `useState` de
  // formulario-reserva.tsx y no en la URL, y por eso este componente la
  // recibe como prop en vez de leerla el mismo. Ver el comentario de
  // formulario-reserva.tsx para el porque completo.
  franjaElegida: string | null;
  onElegirFranja: (slotStart: string) => void;
};

// Los elementos de `dias` son fechas civiles YA resueltas en Lima
// (diasDeLaVentana las calcula con America/Lima, ver lib/reservas/rejilla.ts):
// no son un instante que haya que convertir de nuevo. Formatear con
// `timeZone: "America/Lima"` las reinterpretaria una segunda vez -Date.UTC
// fija medianoche UTC, y pedirle a Intl que la lea "en Lima" la correria un
// dia hacia atras-, el mismo error de fondo que sumarDias() evita haciendo
// la aritmetica en UTC. Por eso el formato tambien pide UTC: la fecha no se
// reinterpreta, solo se pinta.
function formatearDia(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const instante = new Date(Date.UTC(anio, mes - 1, dia));
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(instante);
}

// `slot_start`, a diferencia de las fechas de arriba, SI es un instante real
// -una columna `timestamptz`-, asi que aca la conversion a hora de Lima es
// la correcta y no una reinterpretacion de mas.
function formatearHora(instante: string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(instante));
}

export function Calendario({
  dias,
  diaElegido,
  franjas,
  diasInhabilitados,
  duracionMinutos,
  sede,
  franjaElegida,
  onElegirFranja,
}: CalendarioProps) {
  const router = useRouter();
  const pathname = usePathname();

  const inhabilitadosPorFecha = new Map(diasInhabilitados.map((d) => [d.date, d]));
  // `dias[0]` es HOY por contrato de diasDeLaVentana() -"empezando por
  // hoy"-, no una fecha calculada de nuevo aca: resolver "que dia es hoy" en
  // mas de un sitio es exactamente el fallo M-7 que rejilla.ts existe para
  // evitar.
  const hoy = dias[0];

  function elegirDia(dia: string) {
    const params = new URLSearchParams({ sede, dia, duracion: String(duracionMinutos) });
    router.push(`${pathname}?${params.toString()}`);
  }

  const inhabilitadoElegido = inhabilitadosPorFecha.get(diaElegido);
  const franjasOcupadas = franjas.filter((franja) => franja.free === 0);
  const franjasLibres = franjas.filter((franja) => franja.free > 0);

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Día de la reserva">
        {dias.map((fecha) => {
          const inhabilitado = inhabilitadosPorFecha.get(fecha);
          const seleccionado = fecha === diaElegido;
          return (
            <button
              key={fecha}
              type="button"
              disabled={inhabilitado !== undefined}
              aria-current={seleccionado ? "date" : undefined}
              title={inhabilitado !== undefined ? (inhabilitado.reason ?? "Sin atención") : undefined}
              onClick={() => elegirDia(fecha)}
              className={cn(
                "flex min-w-20 shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-sm capitalize",
                seleccionado ? "border-upc-red bg-upc-red/10 font-bold" : "border-border",
                inhabilitado !== undefined && "text-muted-foreground cursor-not-allowed opacity-50",
              )}
            >
              {formatearDia(fecha)}
            </button>
          );
        })}
      </div>

      {inhabilitadoElegido !== undefined ? (
        <p className="text-muted-foreground border-border mt-4 rounded-lg border border-dashed py-8 text-center">
          {inhabilitadoElegido.reason === null
            ? "Ese día no hay atención."
            : `Ese día no hay atención: ${inhabilitadoElegido.reason}.`}
        </p>
      ) : franjas.length === 0 ? (
        diaElegido === hoy ? (
          <p className="text-muted-foreground border-border mt-4 rounded-lg border border-dashed py-8 text-center">
            Hoy ya no queda ninguna franja libre para esta duración. Prueba
            con una duración más corta o elige otro día.
          </p>
        ) : (
          // Caso defensivo y no uno medido: con los `dias` que recibe este
          // componente -acotados a la ventana movil- no deberia darse un dia
          // futuro, no inhabilitado, con cero franjas. Se cubre igual para
          // que la pantalla nunca se quede sin nada que decir.
          <p className="text-muted-foreground border-border mt-4 rounded-lg border border-dashed py-8 text-center">
            No hay franjas disponibles para esta duración ese día. Prueba con
            otro día o con una duración más corta.
          </p>
        )
      ) : franjasLibres.length === 0 ? (
        <p className="text-muted-foreground border-border mt-4 rounded-lg border border-dashed py-8 text-center">
          No queda ningún equipo libre ese día.
        </p>
      ) : (
        <>
          {/* Este aviso es necesario porque una sola reserva ya dice bastante
              con los datos reales: 30 minutos reservados sobre un producto
              con `buffer_minutes = 120` -el valor de los 34 productos de
              produccion- dejan NUEVE franjas en `free = 0` alrededor, medido
              hoy 2026-08-10 (08:00 a 12:00 quedan bloqueadas y la primera
              libre es 12:30). Sin esta frase, nueve franjas grises por una
              sola reserva parecen un error de la pantalla y no el
              comportamiento real del sistema. */}
          {franjasOcupadas.length > 0 && (
            <p className="bg-muted text-muted-foreground mt-4 rounded-lg px-4 py-3 text-sm">
              Cada vez que alguien reserva este equipo, queda un tiempo extra
              bloqueado para revisarlo antes del siguiente préstamo. Por eso
              puedes ver varias franjas ocupadas alrededor de una sola
              reserva.
            </p>
          )}

          {/* Las franjas con `free = 0` se muestran DESHABILITADAS -grises,
              con el texto "Ocupado"- y no se quitan de la rejilla. Si desaparecieran,
              el aviso de arriba no tendria nada que senalar: son justamente
              esas nueve franjas grises las que hacen falta a la vista para
              que la explicacion tenga sentido.

              ~~Y ninguna franja, libre u ocupada, es un <button> con onClick:
              elegir una franja concreta todavia no tiene a donde ir -la
              accion de reservar es la Task 10-. Ofrecerlas como clicables
              aca repetiria, con otro nombre, el mismo caso que el detalle ya
              resolvio con su boton deshabilitado
              (app/(alumno)/catalogo/[id]/page.tsx): una interaccion que no
              lleva a ningun lado es peor que no ofrecerla.~~
              Desde la Task 10 eso ya NO es cierto: la accion de reservar
              existe (lib/reservas/acciones.ts), asi que elegir una franja SI
              tiene a donde ir. Por eso solo las de `free > 0` se volvieron
              <button>: las de `free = 0` siguen sin ser interactivas, y a
              proposito -no hay nada que elegir en una franja sin unidades
              libres, y ofrecerla como clicable solo para que el envio la
              rechazara despues seria el mismo error que el comentario viejo
              ya evitaba, con otro nombre. */}
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {franjas.map((franja) => {
              const elegida = franja.slotStart === franjaElegida;
              const contenido = (
                <>
                  <span className="block font-medium">{formatearHora(franja.slotStart)}</span>
                  <span className="text-muted-foreground block text-xs">
                    {franja.free === 0
                      ? "Ocupado"
                      : franja.free === 1
                        ? "1 equipo libre"
                        : `${franja.free} equipos libres`}
                  </span>
                </>
              );

              if (franja.free === 0) {
                return (
                  <li
                    key={franja.slotStart}
                    className="text-muted-foreground rounded-lg border border-dashed px-3 py-2 text-sm opacity-60"
                  >
                    {contenido}
                  </li>
                );
              }

              return (
                <li key={franja.slotStart}>
                  <button
                    type="button"
                    aria-pressed={elegida}
                    onClick={() => onElegirFranja(franja.slotStart)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm",
                      elegida
                        ? "border-upc-red bg-upc-red/10 font-bold"
                        : "border-border",
                    )}
                  >
                    {contenido}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
