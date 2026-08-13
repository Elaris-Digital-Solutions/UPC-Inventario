import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogoCancelar } from "@/components/reservas/dialogo-cancelar";
import { etiquetaDeEstado, seOfreceCancelar, type Grupo } from "@/lib/reservas/agrupar";
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
  // El reloj llega YA CALCULADO desde la pagina, igual que `grupo` dos lineas
  // arriba y por el mismo motivo: esta tarjeta NO vuelve a leer el reloj con
  // un `new Date()` propio. Se usa para decidir si se ofrece el boton de
  // cancelar -ver seOfreceCancelar(), lib/reservas/agrupar.ts- comparandolo
  // contra `reserva.inicio` (D-38).
  ahora: Date;
};

// Componente de servidor: no necesita estado ni eventos propios -solo pinta
// una reserva ya resuelta por lib/reservas/consultas.ts-, asi que NO lleva
// "use client". La misma razon por la que TarjetaProducto
// (components/catalogo/tarjeta-producto.tsx) tampoco lo lleva. Que ahora
// pinte <DialogoCancelar> -que SI es Client Component, Task 13- no cambia
// esto: un Server Component puede renderizar un Client Component sin
// volverse cliente el mismo, que es exactamente lo que hace falta aca.
//
// DESDE ESTA TAREA SI TIENE BOTON DE CANCELAR -este comentario decia lo
// contrario; se corrige aca porque un comentario caducado compila igual que
// uno cierto y enseña lo contrario de lo que pasa-, pero NO en toda reserva:
// ver la condicion de mas abajo, justo antes de pintar <DialogoCancelar>.
export function TarjetaReserva({ reserva, grupo, ahora }: TarjetaReservaProps) {
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
            juntarlos bajo la palabra "Motivo" a secas haria creer que la
            reserva se cancelo por lo que el alumno iba a hacer con el
            equipo. Por eso la etiqueta no es "Motivo:" sino "Motivo de la
            cancelacion:", que sigue nombrando la columna sin confundirla con
            `purpose`.
            Antes decia "Cancelada por:", y con un motivo escrito a mano
            -"ya no lo necesito"- se leia bien. La Task 7 de la T3B
            (/admin/dias) empezo a generar motivos que ya arrancan con
            "Cancelado por la administracion (...)" (F8 de
            ESPECIFICACION_FUNCIONAL.md), y la etiqueta duplicaba el texto:
            "Cancelada por: Cancelado por la administracion (...)". */}
        {reserva.motivoCancelacion !== null && (
          <p>Motivo de la cancelación: {reserva.motivoCancelacion}</p>
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

        {/* El boton de cancelar se PINTA -y no solo se deshabilita- bajo TRES
            condiciones a la vez, decididas por seOfreceCancelar()
            (lib/reservas/agrupar.ts) y no de forma inline: son TRES
            DECISIONES DISTINTAS que solo coinciden en esa unica llamada.
              1. `reserva.estado === "reserved"`. En `active` el boton
                 DESAPARECE en vez de quedar deshabilitado, porque una
                 reserva ya entregada no se cancela, se devuelve -y la RPC
                 la rechazaria igual, es el rechazo #4 de
                 mensajeDeRechazoCancelacion() en lib/reservas/acciones.ts-.
              2. `grupo === "proxima"` (D-35). Esto excluye la reserva que
                 sigue en `reserved` pero cuya franja YA PASO -la del parrafo
                 de arriba, "vencio sin que se recogiera"-: cancelarla
                 borraria el unico rastro de que la franja se vencio sin
                 devolucion, que es la marca `not_picked_up` que el personal
                 todavia puede poner -`cancelled` es un estado TERMINAL,
                 leido en
                 supabase/migrations/20260806005731_reservation_state_machine.sql-,
                 y esa marca es la que CUENTA para la sancion. Con
                 precision, porque la version anterior de esta linea decia
                 "es la que dispara la sancion" y eso estira el alcance:
                 UNA sola `not_picked_up` NO sanciona a nadie. El trigger
                 apply_penalties() solo bloquea 15 dias cuando encuentra
                 `v_count >= 2` en los ultimos 90 dias -leido en
                 supabase/migrations/20260806013146_penalties.sql:44-, asi
                 que la primera falta no hace nada visible y la segunda si.
                 Lo que se pierde al cancelar, entonces, no es una sancion
                 inmediata sino el registro que HABILITA la siguiente.
              3. `new Date(reserva.inicio) > ahora` (D-38). Excluye la
                 reserva cuyo INICIO ya paso, aunque el FIN siga en el
                 futuro -el caso de una reserva de 10:00 a 10:30 vista a las
                 10:15-.

            D-38 cierra la MITAD de M-12 de
            MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md -"cancelacion con
            antelacion minima"-: ahora no se cancela DESPUES de que la
            reserva empezo, y desde la migracion 23
            (supabase/migrations/20260812053243_cancel_before_start.sql) eso
            lo hace cumplir el MOTOR, no solo esta pantalla. M-12 SIGUE
            PENDIENTE en su OTRA mitad: cancelar un minuto ANTES de que
            empiece sigue sin ninguna restriccion -M-12 pide una antelacion
            minima, y eso todavia no esta resuelto.

            Esto tambien corrige lo que este comentario decia antes sobre la
            condicion 2: "el motor SI la aceptaria, y quien llame a la RPC
            por su cuenta puede cancelarla igual". Eso YA NO ES CIERTO para
            el alumno en el caso del INICIO ya pasado -el motor lo rechaza
            desde la migracion 23-, y de hecho, para una reserva `reserved`,
            un FIN ya pasado implica un INICIO ya pasado -`inicio < fin`
            siempre-, asi que en la practica la condicion 2 (D-35) y la
            condicion 3 (D-38) SE SOLAPAN: cualquier reserva que la condicion
            2 excluye, la condicion 3 ya la habria excluido tambien, y el
            motor ya la rechaza si quien llama es el alumno. Lo que el motor
            SIGUE permitiendo, con precision, es que el PERSONAL cancele por
            esta misma RPC -o por UPDATE directo- una reserva `reserved` ya
            empezada: la comprobacion nueva de la migracion 23 esta guardada
            por `not private.is_staff()`, asi que no lo alcanza. Ocultar el
            boton aca no toca esa via en absoluto -este componente solo se usa
            en /mi-panel, la pantalla del alumno-, solo deja de OFRECERSELO
            al alumno.

            `grupo` y `ahora` se usan TAL CUAL llegan por props, sin
            recalcularlos: ver el comentario de TarjetaReservaProps mas
            arriba -volver a leer el reloj aca seria repetir el fallo que ese
            comentario ya explica. */}
        {seOfreceCancelar(reserva.estado, grupo, reserva.inicio, ahora) && (
          <DialogoCancelar reservationId={reserva.id} producto={reserva.producto} />
        )}
      </CardContent>
    </Card>
  );
}
