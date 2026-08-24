"use client";

// Una reserva del mostrador con sus acciones.
//
// CLIENT COMPONENT y no un Server Component con los botones delegados: los dos
// botones directos no abren ningun dialogo, son un clic con un unico dato que
// esta tarjeta ya tiene. Los que SI necesitan estado propio y un campo de texto
// -las dos faltas y la nota- viven en su propio archivo y traen su disparador.
import { useState, useTransition } from "react";
import { CalendarDays, User } from "lucide-react";

import { MiniaturaAmpliable } from "@/components/imagenes/miniatura-ampliable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogoFalta } from "@/components/mostrador/dialogo-falta";
import { DialogoNota } from "@/components/mostrador/dialogo-nota";
import { entregar, recibir, type ResultadoMostrador } from "@/lib/mostrador/acciones";
import type { Columna } from "@/lib/mostrador/columnas";
import type { AlumnoMostrador, ReservaMostrador } from "@/lib/mostrador/consultas";
import type { NotaUnidad } from "@/lib/mostrador/notas";

// REPETIDAS y no importadas de tarjeta-reserva.tsx: alli son privadas, asi que
// reutilizar el criterio significa copiar las opciones de Intl.
//
// `America/Lima` porque `inicio` y `fin` son INSTANTES (`timestamptz`).
// `hour12: false` no es gusto: en `es-PE` el formato de 12 horas termina en
// "p. m." y ya costo un defecto visible en pantalla.
const FORMATO_DIA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const FORMATO_HORA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

// El texto del alumno, sin dejar nunca un hueco en blanco: un hueco se leeria
// como un error de carga, y este texto dice que el dato no esta disponible.
//
// `alumno === null` es hoy estructuralmente imposible con el filtro de
// reservasMostrador(), pero el TIPO lo admite.
//
// `nombre` y `apellido` pueden faltar por separado -el trigger crea la fila al
// PEDIR el magic link, antes de que el alumno diga como se llama-, asi que si
// faltan los dos se cae a `email`, que la tabla si exige NOT NULL.
function textoAlumno(alumno: AlumnoMostrador | null): string {
  if (alumno === null) {
    return "Alumno no disponible";
  }

  const nombreCompleto = [alumno.nombre, alumno.apellido].filter((parte) => parte !== null).join(" ");

  return nombreCompleto.length > 0 ? nombreCompleto : alumno.email;
}

type TarjetaMostradorProps = {
  reserva: ReservaMostrador;
  // YA CALCULADA desde la pagina: recalcularla aqui con un `new Date()` propio
  // seria una segunda lectura del reloj para la misma decision (fallo M-7).
  columna: Columna;
  // YA RESUELTAS desde la pagina, que llama a notasPorUnidad() UNA VEZ para
  // todas las tarjetas. Puede llegar vacio, y no es un error: es el caso normal
  // de un equipo que nunca dio problemas.
  notas: NotaUnidad[];
};

export function TarjetaMostrador({ reserva, columna, notas }: TarjetaMostradorProps) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // useTransition Y NO useActionState: estos dos botones no tienen NINGUN campo
  // de formulario, solo un id que la tarjeta ya conoce. `useActionState` existe
  // para coordinar un `<form>` -estado previo, FormData, campos que resetear-, y
  // aqui no hay ninguno.
  function ejecutar(accion: (id: string) => Promise<ResultadoMostrador>) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await accion(reserva.id);
      if (resultado?.error) {
        setError(resultado.error);
      }
      // Sin `else`: en exito la Server Action ya revalido, asi que la tarjeta se
      // DESMONTA y se vuelve a montar en otra columna, o desaparece si el estado
      // paso a terminal. No queda estado local que limpiar a mano.
    });
  }

  return (
    // JERARQUIA DE MOSTRADOR: manda la FRANJA -en cifras tabulares, que es contra
    // lo que se compara- y el NOMBRE en tinta plena; la sede, el dia y el codigo
    // bajan a una linea secundaria. El codigo va en monoespaciada porque se lee
    // contra la pegatina del equipo, y una serie tipo LAP-001 se coteja mejor con
    // cifras de ancho fijo.
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          {/* La miniatura: quien atiende tiene que reconocer el aparato que va a
              sacar del estante, y un nombre como "UGREEN 4K USB-C MULTIFUNCTION
              ADAPTER 7-IN-1" no le dice que buscar. MISMO COMPONENTE que la lista
              de inventario, asi que el placeholder y el caso sin imagen se
              deciden alli una sola vez.

              Va AGRUPADA con el titulo: el `justify-between` separa dos bloques
              -equipo a la izquierda, horario a la derecha-, y con la imagen suelta
              como tercer hijo el horario dejaria de quedar en su extremo. */}
          <div className="flex items-start gap-3">
            <MiniaturaAmpliable
              src={reserva.imagenUrl}
              alt={reserva.producto}
              tamano={48}
            />
            <CardTitle className="leading-snug">{reserva.producto}</CardTitle>
          </div>
          <span className="text-foreground shrink-0 font-mono text-sm tabular-nums">
            {FORMATO_HORA.format(new Date(reserva.inicio))}
            {" – "}
            {FORMATO_HORA.format(new Date(reserva.fin))}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-foreground flex items-center gap-1.5 font-medium">
          <User className="text-muted-foreground size-3.5 shrink-0" aria-hidden="true" />
          {textoAlumno(reserva.alumno)}
        </p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
          {FORMATO_DIA.format(new Date(reserva.inicio))}
          <span aria-hidden="true">·</span>
          {reserva.sede}
          <span aria-hidden="true">·</span>
          {/* La palabra "Unidad" se CONSERVA aunque el codigo se lea solo: los
              textos de interfaz no se recortan desde la capa visual. */}
          <span>
            Unidad <span className="font-mono">{reserva.unidad}</span>
          </span>
        </p>

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {/* Basta con mirar la COLUMNA y no `reserva.estado`: columnaDeReserva()
              ya solo pone reservas `reserved` en "por_entregar" y `active` en las
              otras dos. */}
          {columna === "por_entregar" && (
            <Button size="sm" disabled={pendiente} onClick={() => ejecutar(entregar)}>
              {pendiente ? "Entregando…" : "Producto entregado"}
            </Button>
          )}

          {/* En LAS DOS columnas de `active`: devolver tiene sentido tanto antes
              como despues de la hora de fin, que es lo unico que las separa. */}
          {(columna === "activas" || columna === "por_devolver") && (
            <Button size="sm" disabled={pendiente} onClick={() => ejecutar(recibir)}>
              {pendiente ? "Recibiendo…" : "Producto devuelto"}
            </Button>
          )}

          {columna === "por_entregar" && (
            <DialogoFalta
              tipo="not_picked_up"
              reservationId={reserva.id}
              unidadId={reserva.unidadId}
              alumno={textoAlumno(reserva.alumno)}
            />
          )}

          {(columna === "activas" || columna === "por_devolver") && (
            <DialogoFalta
              tipo="not_returned"
              reservationId={reserva.id}
              unidadId={reserva.unidadId}
              alumno={textoAlumno(reserva.alumno)}
            />
          )}

          {/* SIN condicion de columna, a diferencia de los cuatro de arriba:
              anotar() escribe en `inventory_unit_notes` y no depende del estado
              de la reserva, asi que dejar una nota sobre el equipo tiene sentido
              en las TRES columnas. */}
          <DialogoNota unidadId={reserva.unidadId} unidad={reserva.unidad} notas={notas} />
        </div>
      </CardContent>
    </Card>
  );
}
