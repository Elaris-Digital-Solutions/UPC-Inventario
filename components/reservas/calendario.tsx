"use client";

// La fila de dias de la ventana y la rejilla de franjas del dia elegido.
//
// NAVEGA en vez de llamar a un callback: esta pagina vive bajo un Server
// Component, y Next no deja pasarle una funcion de cliente por esa frontera
// salvo que sea una Server Action. Elegir un dia es un cambio de `?dia=`, porque
// quien vuelve a pedir la rejilla corre en el servidor.
//
// QUE MENSAJE MOSTRAR CUANDO NO HAY FRANJAS SE DECIDE AQUI y no en la capa de
// datos: interpretar bien un array vacio necesita CRUZAR dos respuestas que esa
// capa devuelve por separado. Los tres casos, en el orden en que se comprueban:
//
//   (a) El dia esta en `disabled_days`. PRIMERO, porque un dia inhabilitado
//       tambien devuelve cero franjas y sin este chequeo se confundiria con (b).
//   (b) Es HOY y no cabe ninguna franja de esta duracion en lo que queda.
//   (c) Cero franjas en un dia futuro: la sede abre y NINGUN TURNO la cubre
//       (D-74/D-76). Era una rama defensiva y desde la migracion 34 es un caso
//       normal. EL MENSAJE NO NOMBRA A NADIE a proposito: quien falta es dato de
//       PERSONAL, y al alumno le basta con saber que puede no haber atencion.
//   (d) Vinieron filas pero TODAS con `free = 0`: un dia lleno de verdad. Esto
//       llega con filas, no vacio, que es lo que lo separa de los anteriores.
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
  // A diferencia de dia y duracion, que navegan porque el servidor tiene que
  // volver a pedirlos, elegir una franja no pide nada nuevo a la base: vive en
  // el `useState` del formulario, y por eso llega como prop.
  franjaElegida: string | null;
  onElegirFranja: (slotStart: string) => void;
};

// Los elementos de `dias` son fechas CIVILES ya resueltas en Lima, no instantes.
// Formatearlas con `timeZone: "America/Lima"` las reinterpretaria una segunda
// vez y las correria un dia hacia atras. Por eso el formato pide UTC: la fecha no
// se reinterpreta, solo se pinta.
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

// `slot_start` SI es un instante real (`timestamptz`), asi que aqui la conversion
// a hora de Lima es la correcta y no una reinterpretacion de mas.
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
  // `dias[0]` es HOY por contrato de diasDeLaVentana(), no una fecha calculada de
  // nuevo aqui: resolver "que dia es hoy" en mas de un sitio es el fallo M-7.
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
          // El caso (c) de la cabecera: la sede abre y ningun turno cubre.
          <p className="text-muted-foreground border-border mt-4 rounded-lg border border-dashed py-8 text-center">
            No hay franjas disponibles para esta duración ese día. Puede que esa sede no tenga
            atención a esas horas; prueba con otro día, con otra sede o con una duración más
            corta.
          </p>
        )
      ) : franjasLibres.length === 0 ? (
        <p className="text-muted-foreground border-border mt-4 rounded-lg border border-dashed py-8 text-center">
          No queda ningún equipo libre ese día.
        </p>
      ) : (
        <>
          {/* Este aviso hace falta porque una sola reserva ya bloquea NUEVE
              franjas alrededor con el `buffer_minutes` de los productos reales.
              Sin la frase, nueve franjas grises por una reserva parecen un error
              de la pantalla y no el comportamiento real del sistema. */}
          {franjasOcupadas.length > 0 && (
            <p className="bg-muted text-muted-foreground mt-4 rounded-lg px-4 py-3 text-sm">
              Cada vez que alguien reserva este equipo, queda un tiempo extra
              bloqueado para revisarlo antes del siguiente préstamo. Por eso
              puedes ver varias franjas ocupadas alrededor de una sola
              reserva.
            </p>
          )}

          {/* Las de `free = 0` se muestran DESHABILITADAS y no se quitan: si
              desaparecieran, el aviso de arriba no tendria nada que señalar. Y no
              son clicables, a proposito: no hay nada que elegir en una franja sin
              unidades libres, y ofrecerla solo para que el envio la rechazara
              despues es peor que no ofrecerla. */}
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
