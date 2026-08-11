import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { etiquetaDeEstado, type Grupo } from "@/lib/reservas/agrupar";
import type { ReservaDelAlumno } from "@/lib/reservas/consultas";

// El dia se formatea en America/Lima, y NO en UTC como formatearDia() de
// components/reservas/calendario.tsx. No es una inconsistencia: `inicio` y
// `fin` aqui son INSTANTES reales -columnas `timestamptz`, el mismo tipo de
// dato que `slot_start`-, mientras que las fechas que formatearDia() recibe
// son civiles (`YYYY-MM-DD`, sin hora ni zona). Convertir un instante real a
// la zona del alumno es la lectura correcta; forzar una fecha civil a una
// zona que no tiene seria la reinterpretacion que el comentario de
// formatearDia() en calendario.tsx ya senala como error, y hacerlo al reves
// -dejar un instante real en UTC- seria ese mismo error del otro lado.
const FORMATO_DIA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "short",
  day: "numeric",
  month: "short",
});

// `hour12: false` no es un detalle de gusto: el resto del proyecto escribe
// la hora en 24 -formatearHora() en components/reservas/calendario.tsx y
// textoDeSancion() en lib/reservas/sancion.ts, los dos con este mismo
// `hour12: false`-, y en `es-PE` el formato de 12 horas termina en "p. m."
// con un punto que choca con la puntuacion de alrededor -ya costo un defecto
// VISIBLE en pantalla en la tarea anterior, documentado en el comentario de
// textoDeSancion()-. Copiar esa correccion aca evita repetir el mismo
// defecto en una tercera pantalla.
const FORMATO_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type TarjetaReservaProps = {
  reserva: ReservaDelAlumno;
  // El grupo llega YA CALCULADO desde la pagina, y esta tarjeta no lo vuelve
  // a deducir. Antes lo hacia: llamaba a grupoDeReserva() con su propio
  // `new Date()`, mientras app/(alumno)/mi-panel/page.tsx ya habia agrupado
  // con OTRO. Eran dos lecturas del reloj para la misma decision, que es
  // exactamente el fallo M-7 que este proyecto persigue por todos lados -y
  // contradecia al comentario de lib/reservas/agrupar.ts, que dice que el
  // grupo se decide en un solo sitio-. Una reserva que venciera entre las dos
  // llamadas habria salido bajo "Proximas" pintada como pasada.
  grupo: Grupo;
};

// Componente de servidor: no necesita estado ni eventos -solo pinta una
// reserva ya resuelta por lib/reservas/consultas.ts-, asi que NO lleva
// "use client". La misma razon por la que TarjetaProducto
// (components/catalogo/tarjeta-producto.tsx) tampoco lo lleva.
//
// SIN BOTON DE CANCELAR. Cancelar una reserva es la Task 13, todavia sin
// escribir; esta tarjeta solo muestra, no actua.
export function TarjetaReserva({ reserva, grupo }: TarjetaReservaProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="leading-snug">{reserva.producto}</CardTitle>
          {/* El color del badge sigue al GRUPO -en_curso se destaca, pasada se
              atenua- y no al estado crudo: un alumno no distingue seis
              estados de un vistazo, pero si distingue "esto es ahora" de
              "esto ya paso". */}
          <Badge variant={grupo === "en_curso" ? "default" : grupo === "proxima" ? "secondary" : "outline"}>
            {etiquetaDeEstado(reserva.estado)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="text-muted-foreground space-y-1 text-sm">
        <p>
          {reserva.sede} · Unidad {reserva.unidad}
        </p>
        <p>
          {FORMATO_DIA.format(new Date(reserva.inicio))}, {FORMATO_HORA.format(new Date(reserva.inicio))}
          {" – "}
          {FORMATO_HORA.format(new Date(reserva.fin))}
        </p>
        {reserva.motivo !== null && <p>Motivo: {reserva.motivo}</p>}

        {/* El motivo de la CANCELACION va aparte del de uso y con su propia
            etiqueta, porque son dos datos distintos que la tabla guarda en
            dos columnas distintas -`purpose` y `cancellation_reason`- y
            juntarlos bajo la palabra "Motivo" haria creer que la reserva se
            cancelo por lo que el alumno iba a hacer con el equipo. */}
        {reserva.motivoCancelacion !== null && (
          <p>Cancelada por: {reserva.motivoCancelacion}</p>
        )}

        {/* Una reserva que sigue en `reserved` pero cuya franja ya paso
            necesita esta linea, y no un estado inventado. El badge dice
            "Reservada" porque eso es LO QUE HAY en la base -cerrarla es
            trabajo del personal, y esa pantalla llega en la T3-, pero
            "Reservada" dentro de la seccion "Anteriores" se lee como una
            contradiccion si nadie la explica. Aca se explica sin tocar el
            estado: lo que cambia es el texto, no el dato. */}
        {reserva.estado === "reserved" && grupo === "pasada" && (
          <p>Esta reserva venció sin que se recogiera el equipo.</p>
        )}
      </CardContent>
    </Card>
  );
}
