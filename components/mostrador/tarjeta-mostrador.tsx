"use client";

// Una reserva del mostrador con sus acciones, Task 5 de la tanda 3A -y el
// hueco que la propia "Estructura de archivos" del plan deja marcado, pero
// que ninguna tarea de la lista crea: el mismo tipo de correccion que ya
// dejo anotada la Task 1 sobre app/(personal)/mostrador/page.tsx.
//
// CLIENT COMPONENT, y no un Server Component con un dialogo delegado como
// hace TarjetaReserva (components/reservas/tarjeta-reserva.tsx) con
// DialogoCancelar: ahi la tarjeta en si es de solo lectura y el UNICO
// pedazo interactivo -un dialogo con motivo obligatorio- se separa aparte
// porque necesita su propio estado de apertura. Aca la propia lista de
// archivos del plan describe este componente como "una reserva del
// mostrador CON SUS ACCIONES" -no delega los botones a otro archivo-, y los
// dos botones de esta tarea no abren ningun dialogo: son un clic que llama
// a una Server Action con un unico dato, el id que esta tarjeta ya tiene.
// Partir eso en un tercer archivo solo para separar cliente de servidor
// habria sido la misma sobre-generalizacion que dialogo-cancelar.tsx ya
// evito una vez -"generalizar con un unico caso real todavia no es
// generalizar, es adivinar"-.
//
// La Task 6 SI agrega dialogos -dialogo-falta.tsx, con confirmacion y una
// nota obligatoria- y esos SI van en su propio archivo, por la misma razon
// que separa DialogoCancelar: necesitan su propio estado de apertura y un
// campo de texto. Ese hueco queda marcado mas abajo, sin construirse.
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { entregar, recibir, type ResultadoMostrador } from "@/lib/mostrador/acciones";
import type { Columna } from "@/lib/mostrador/columnas";
import type { AlumnoMostrador, ReservaMostrador } from "@/lib/mostrador/consultas";

// Mismo criterio que components/reservas/tarjeta-reserva.tsx, REPETIDO y no
// importado: esas dos constantes no estan exportadas de ese archivo -son
// privadas suyas-, asi que reutilizar el criterio significa copiar las
// mismas opciones de Intl, no importar el modulo. `America/Lima` porque
// `inicio` y `fin` son INSTANTES reales (`timestamptz`), igual que alla.
// `hour12: false` NO es un detalle de gusto: en `es-PE` el formato de 12
// horas termina en "p. m.", y eso ya costo un defecto VISIBLE en pantalla
// -ver el comentario de FORMATO_HORA en tarjeta-reserva.tsx y de
// textoDeSancion() en lib/reservas/sancion.ts-. No se cambia aca.
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

// El texto del alumno, sin nunca dejar un hueco en blanco. `alumno === null`
// es el caso que el Step 0 de la Task 4 midio por PostgREST -RLS bloqueando
// el embed- y que hoy es ESTRUCTURALMENTE imposible con el filtro de
// reservasMostrador() (ver el comentario de ReservaMostrador en
// lib/mostrador/consultas.ts), pero el TIPO lo admite igual, asi que esta
// pantalla tiene que leerse bien sin el aunque nunca lo vea en la practica.
// Un hueco en blanco se leeria como un error de carga; este texto dice
// explicitamente que el dato no esta disponible.
//
// `nombre` y `apellido` pueden ser `null` por separado incluso con el
// alumno presente -el trigger crea la fila al PEDIR el magic link, antes de
// que el alumno diga cómo se llama (20260805194424_alumno_provisioning.sql,
// ver el comentario de AlumnoMostrador)-, asi que si los dos faltan se cae a
// `email`, que la tabla si exige `NOT NULL`.
function textoAlumno(alumno: AlumnoMostrador | null): string {
  if (alumno === null) {
    return "Alumno no disponible";
  }

  const nombreCompleto = [alumno.nombre, alumno.apellido].filter((parte) => parte !== null).join(" ");

  return nombreCompleto.length > 0 ? nombreCompleto : alumno.email;
}

type TarjetaMostradorProps = {
  reserva: ReservaMostrador;
  // La columna llega YA CALCULADA desde la pagina -mismo motivo que `grupo`
  // en TarjetaReservaProps (tarjeta-reserva.tsx): no se vuelve a calcular
  // aca con un `new Date()` propio, que seria una segunda lectura del reloj
  // para la misma decision (fallo M-7).
  columna: Columna;
};

export function TarjetaMostrador({ reserva, columna }: TarjetaMostradorProps) {
  const [pendiente, iniciarTransicion] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // POR QUE useTransition Y NO useActionState, al contrario que
  // DialogoCancelar (lib/reservas/acciones.ts + dialogo-cancelar.tsx): esos
  // dos botones ("Producto entregado", "Producto devuelto") no tienen NINGUN
  // campo de formulario -ni un motivo, ni nada que el operador escriba-,
  // solo un id que esta tarjeta ya conoce por props. `useActionState` existe
  // para coordinar un `<form>`: el estado previo, el FormData y el pendiente
  // que expone son utiles cuando hay campos que resetear o validar, y aca no
  // hay ninguno. La documentacion de Next 16 lo dice explicito -tabla de
  // "Next steps" en node_modules/next/dist/docs/01-app/02-guides/interactive-apps.md-:
  // "Async work needs pending state, error handling, or coordinated UI
  // updates" -> `useTransition`; "A form needs pending, reset, and result
  // state" -> `useActionState`. Este es el primer caso, no el segundo. La
  // misma guia tambien deja escrito que un Server Function se puede invocar
  // "from a form, or from an event handler ... wrapped in startTransition"
  // (node_modules/next/dist/docs/01-app/02-guides/server-actions.md, linea 22),
  // que es exactamente lo que hace ejecutar() mas abajo.
  function ejecutar(accion: (id: string) => Promise<ResultadoMostrador>) {
    setError(null);
    iniciarTransicion(async () => {
      const resultado = await accion(reserva.id);
      if (resultado?.error) {
        setError(resultado.error);
      }
      // Sin `else` que limpie nada mas: en exito, la Server Action ya llamo
      // a `revalidatePath('/mostrador')`, asi que la pagina se vuelve a
      // pintar con la reserva en su columna nueva -o fuera de la lista si
      // paso a un estado terminal en una tarea futura-. Esta tarjeta se
      // DESMONTA de donde estaba montada y, si sigue viva, se vuelve a
      // montar en otra seccion: no queda ningun estado local que limpiar a
      // mano, la misma propiedad ESTRUCTURAL que ya explica el comentario de
      // DialogoCancelar sobre por que ese dialogo se cierra solo.
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="leading-snug">{reserva.producto}</CardTitle>
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
        <p>{textoAlumno(reserva.alumno)}</p>

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {/* "Producto entregado": reserved -> active. Solo en por_entregar
              -no hace falta comprobar `reserva.estado` aparte: la pagina ya
              solo pone en esta columna las reservas `reserved`
              (columnaDeReserva(), lib/mostrador/columnas.ts). */}
          {columna === "por_entregar" && (
            <Button size="sm" disabled={pendiente} onClick={() => ejecutar(entregar)}>
              {pendiente ? "Entregando…" : "Producto entregado"}
            </Button>
          )}

          {/* "Producto devuelto": active -> completed. En LAS DOS columnas
              que agrupan reservas `active` -activas y por_devolver, la unica
              diferencia entre ambas es si `fin` ya paso
              (lib/mostrador/columnas.ts)-, porque devolver un equipo tiene
              sentido tanto ANTES como DESPUES de su hora de fin: la reserva
              sigue siendo `active` en los dos casos, solo cambia si el
              alumno se paso de hora. */}
          {(columna === "activas" || columna === "por_devolver") && (
            <Button size="sm" disabled={pendiente} onClick={() => ejecutar(recibir)}>
              {pendiente ? "Recibiendo…" : "Producto devuelto"}
            </Button>
          )}

          {/* HUECO MARCADO, no construido aca: los botones de las dos faltas
              -"No recogido" (reserved -> not_picked_up, sobre por_entregar)
              y "No devuelto" (active -> not_returned, sobre activas y
              por_devolver, con nota obligatoria)- llegan en la Task 6, con
              su propio dialogo de confirmacion en
              components/mostrador/dialogo-falta.tsx. Esta tarea no los
              construye: "NO toques components/mostrador/dialogo-falta.tsx
              ni nada de las faltas" es una restriccion explicita de esta
              tarea. */}
        </div>
      </CardContent>
    </Card>
  );
}
