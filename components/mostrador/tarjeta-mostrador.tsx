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
// La Task 6 SI agrega dialogos -components/mostrador/dialogo-falta.tsx, con
// confirmacion explicita y, solo para `not_returned`, una nota obligatoria-
// y SI van en su propio archivo, por la misma razon que separa
// DialogoCancelar: necesitan su propio estado de apertura y (uno de los dos
// casos) un campo de texto. Esta tarjeta los monta en el hueco que quedaba
// marcado mas abajo, pero no los construye aca: DialogoFalta trae su propio
// boton disparador, y esta tarjeta solo le pasa los datos que ya tiene.
import Image from "next/image";
import { useState, useTransition } from "react";
import { CalendarDays, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DialogoFalta } from "@/components/mostrador/dialogo-falta";
import { DialogoNota } from "@/components/mostrador/dialogo-nota";
import { entregar, recibir, type ResultadoMostrador } from "@/lib/mostrador/acciones";
import type { Columna } from "@/lib/mostrador/columnas";
import type { AlumnoMostrador, ReservaMostrador } from "@/lib/mostrador/consultas";
import type { NotaUnidad } from "@/lib/mostrador/notas";

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
  // Las notas de LA UNIDAD de esta reserva, Task 7 de la tanda 3A. Llegan
  // YA RESUELTAS desde la pagina -mismo criterio que `columna`, arriba-: la
  // pagina llama a notasPorUnidad() UNA VEZ para todas las tarjetas
  // (app/(personal)/mostrador/page.tsx), y esta tarjeta no vuelve a
  // consultar por su cuenta. Puede llegar vacio -una unidad sin ninguna
  // nota-, y eso no es un caso de error: es el caso normal para un equipo
  // que nunca dio problemas.
  notas: NotaUnidad[];
};

export function TarjetaMostrador({ reserva, columna, notas }: TarjetaMostradorProps) {
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
      // pintar con la reserva en su columna nueva -entregar() la lleva de
      // "Por entregar" a "Activas"- o fuera de la lista entera -recibir()
      // la deja en `completed`, terminal, y reservasMostrador() solo trae
      // `reserved` y `active`-. Una version anterior de estas lineas daba
      // ese segundo caso por "una tarea futura", y ya no lo es: lo produce
      // recibir(), de la Task 5, y tambien los dos botones de falta de
      // DialogoFalta, de la Task 6. Esta tarjeta se
      // DESMONTA de donde estaba montada y, si sigue viva, se vuelve a
      // montar en otra seccion: no queda ningun estado local que limpiar a
      // mano, la misma propiedad ESTRUCTURAL que ya explica el comentario de
      // DialogoCancelar sobre por que ese dialogo se cierra solo.
    });
  }

  return (
    // JERARQUIA DE MOSTRADOR, reordenada el 2026-08-13. Los tres datos iban
    // en tres parrafos del mismo tamano y el mismo gris: sede y unidad
    // primero, luego el horario, y el alumno al final. Ese orden es el de la
    // consulta, no el del trabajo.
    //
    // Quien atiende tiene delante a una persona y una hora, y con eso decide.
    // Asi que ahora manda la FRANJA -en cifras tabulares, arriba a la derecha,
    // que es contra lo que se compara- y el NOMBRE en tinta plena; la sede, el
    // dia y el codigo de unidad bajan a una linea secundaria. El codigo va en
    // monoespaciada porque es lo que se lee contra la pegatina del equipo, y
    // una serie tipo LAP-001 se coteja mejor con cifras de ancho fijo.
    //
    // Ni un dato nuevo ni uno menos: exactamente los mismos cuatro, con otro
    // peso.
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          {/* La miniatura del equipo (F3-T3). El mostrador no mostraba NINGUNA
              imagen, y quien atiende tiene que reconocer el aparato que va a
              sacar del estante: un nombre como "UGREEN 4K USB-C MULTIFUNCTION
              ADAPTER 7-IN-1" no le dice que buscar.

              Va PEGADA al nombre y no en una fila propia: es el identificador
              visual del mismo dato, no un dato mas.

              `/placeholder.svg` de respaldo, el mismo que usan el catalogo y
              la lista de inventario. Tamano funcional, no afinado: la fase
              visual la hace otra persona. */}
          {/* La miniatura y el titulo van AGRUPADOS: el `justify-between` del
              contenedor separa dos bloques -equipo a la izquierda, horario a
              la derecha-, y con la imagen suelta como tercer hijo el horario
              habria dejado de quedar en su extremo. */}
          <div className="flex items-start gap-3">
            <Image
              src={reserva.imagenUrl ?? "/placeholder.svg"}
              alt={reserva.producto}
              width={48}
              height={48}
              className="bg-muted shrink-0 rounded object-cover"
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
          {/* La palabra "Unidad" se CONSERVA aunque el codigo ya se lea solo:
              los textos de interfaz no se recortan desde la capa visual. Lo
              unico que cambia es que el codigo va en monoespaciada. */}
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

          {/* "No se retiro": reserved -> not_picked_up, sobre por_entregar
              -mismo criterio de columna que "Producto entregado" arriba: no
              hace falta comprobar `reserva.estado` aparte-. DialogoFalta
              (components/mostrador/dialogo-falta.tsx) trae su propio boton
              disparador y su dialogo de confirmacion; esta tarjeta solo le
              pasa los tres datos que ya tiene por props o que ya calculo
              arriba para pintarse a si misma. */}
          {columna === "por_entregar" && (
            <DialogoFalta
              tipo="not_picked_up"
              reservationId={reserva.id}
              unidadId={reserva.unidadId}
              alumno={textoAlumno(reserva.alumno)}
            />
          )}

          {/* "No se devolvio": active -> not_returned, sobre LAS DOS columnas
              que agrupan `active` -activas y por_devolver-, mismo criterio
              que "Producto devuelto" arriba: marcar que no se devolvio tiene
              sentido tanto ANTES como DESPUES de la hora de fin. */}
          {(columna === "activas" || columna === "por_devolver") && (
            <DialogoFalta
              tipo="not_returned"
              reservationId={reserva.id}
              unidadId={reserva.unidadId}
              alumno={textoAlumno(reserva.alumno)}
            />
          )}

          {/* "Anotar unidad": SIN ninguna condicion de columna, a diferencia
              de los cuatro botones de arriba. anotar() (Task 7,
              lib/mostrador/acciones.ts) no depende del estado de esta
              reserva -escribe en inventory_unit_notes, no en
              inventory_reservations-, asi que este boton se ofrece en las
              TRES columnas por igual: dejar una nota sobre el equipo tiene
              sentido tanto si esta todavia por entregar, como si esta
              activo o por devolver. */}
          <DialogoNota unidadId={reserva.unidadId} unidad={reserva.unidad} notas={notas} />
        </div>
      </CardContent>
    </Card>
  );
}
