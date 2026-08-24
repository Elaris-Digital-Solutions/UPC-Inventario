"use client";

// El dialogo de confirmacion para las dos faltas del mostrador. Es la primera
// vez que el proyecto sanciona a una persona de verdad, con bloqueo PERMANENTE
// en un caso.
//
// UN UNICO componente PARAMETRIZADO por `tipo` y no dos separados: hay DOS casos
// reales desde el principio, con textos y consecuencias distintas pero la MISMA
// forma. No es adivinar un caso futuro.
//
// EL TEXTO DE CADA CASO DICE LA CONSECUENCIA REAL, no un generico "¿estas
// seguro?". NINGUNO afirma si esta sera la primera o la segunda falta del
// alumno: eso lo cuenta el trigger `apply_penalties` en el momento, y
// precalcularlo aqui duplicaria esa regla y ademas quedaria obsoleto en cuanto
// otro operador marcara una falta del mismo alumno en otro mostrador. Por eso los
// textos avisan del PEOR CASO sin prometer un resultado exacto.
//
// NI EL TRIGGER NI EL BOTON DE CERRAR se envuelven con `asChild` alrededor de un
// <Button>: Button no usa `React.forwardRef`, y nadie confirmo en un navegador
// que esa cadena no deja una advertencia en consola. Se pintan con
// `buttonVariants` directo.
import { useId, useState, useTransition } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  marcarNoDevuelta,
  marcarNoRecogida,
  type ResultadoMostrador,
} from "@/lib/mostrador/acciones";

export type TipoFalta = "not_picked_up" | "not_returned";

type DialogoFaltaProps = {
  tipo: TipoFalta;
  reservationId: string;
  // Se pide SIEMPRE aunque solo la use `not_returned`: hacerla condicional
  // obligaria a quien monta el componente a saber cuando hace falta cada prop,
  // que es justo el acoplamiento que un componente parametrizado evita.
  unidadId: string;
  // El texto del alumno YA RESUELTO y no el objeto crudo: la tarjeta ya lo
  // calcula para pintarlo, y este dialogo lo reutiliza.
  alumno: string;
};

// Los textos por tipo en un solo lugar, para no repetir el `if (tipo === ...)`
// cuatro veces dentro del JSX. `consecuencia` es una funcion porque interpola el
// nombre del alumno.
//
// `boton` NO es redaccion de este archivo: son los nombres que F5 le da a estas
// dos acciones. `titulo` y `confirmar` siguen al boton en el mismo verbo.
const TEXTO: Record<
  TipoFalta,
  {
    boton: string;
    titulo: string;
    confirmar: string;
    confirmarPendiente: string;
    consecuencia: (alumno: string) => string;
  }
> = {
  not_picked_up: {
    boton: "No se retiró",
    titulo: "Marcar como no retirado",
    confirmar: "Marcar no retirado",
    confirmarPendiente: "Marcando…",
    // SIN GENERO GRAMATICAL a proposito: `alumno` es un nombre propio
    // interpolado, y "quedara bloqueado" concuerda mal con cualquier alumna.
    // Solo se ve leyendo la pantalla; ninguna herramienta lo marca.
    consecuencia: (alumno) =>
      `${alumno} no retiró el equipo en su horario reservado. Si esta es la segunda vez que no retira en los últimos 90 días, se le bloqueará 15 días.`,
  },
  not_returned: {
    boton: "No se devolvió",
    titulo: "Marcar como no devuelto",
    confirmar: "Marcar no devuelto",
    confirmarPendiente: "Marcando…",
    // El aviso sobre quien lee la nota es TRAZABILIDAD (D-2, acotado por D-69):
    // la nota es permanente y esta atada a la unidad, y este es el dialogo donde
    // mas probable es escribir el nombre de una persona, porque pide describir
    // una falta. Desde la migracion 25 solo la lee el personal.
    consecuencia: (alumno) =>
      `Esto bloquea a ${alumno} de forma permanente, y solo un administrador puede revertirlo. Describe abajo qué pasó con el equipo: la nota queda en el historial de la unidad y la leen el personal del mostrador y los administradores.`,
  },
};

export function DialogoFalta({ tipo, reservationId, unidadId, alumno }: DialogoFaltaProps) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idNota = useId();

  const texto = TEXTO[tipo];

  // Solo para `not_returned`, que es donde F5 exige el campo: en el otro caso no
  // hay nada que llenar y esta condicion nunca bloquea.
  const notaFalta = tipo === "not_returned" && nota.trim() === "";

  function confirmar() {
    setError(null);
    iniciarTransicion(async () => {
      const resultado: ResultadoMostrador =
        tipo === "not_picked_up"
          ? await marcarNoRecogida(reservationId)
          : await marcarNoDevuelta(reservationId, unidadId, nota);

      if (resultado?.error) {
        setError(resultado.error);
        return;
      }

      // SIN `setAbierto(false)` a mano: en exito la reserva pasa a un estado
      // TERMINAL que reservasMostrador() ya no trae, asi que la tarjeta entera se
      // DESMONTA y con ella este dialogo. No queda nada vivo que cerrar.
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        {texto.boton}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          {/* DialogTitle y DialogDescription son OBLIGATORIOS: sin ellos Radix
              deja una advertencia en consola, y son lo que un lector de pantalla
              anuncia al abrir el dialogo. */}
          <DialogTitle>{texto.titulo}</DialogTitle>
          <DialogDescription>{texto.consecuencia(alumno)}</DialogDescription>
        </DialogHeader>

        {tipo === "not_returned" && (
          <div>
            <Label htmlFor={idNota}>Nota sobre lo ocurrido</Label>
            {/* `Textarea` y no `Input`: puede necesitar mas de una linea. SIN
                `maxLength`, porque `note` es `text` sin ningun CHECK de longitud
                y un limite aqui seria la interfaz inventando una regla que el
                motor no tiene. */}
            <Textarea
              id={idNota}
              value={nota}
              onChange={(evento) => setNota(evento.target.value)}
              className="mt-1"
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive rounded-lg px-3 py-2 text-sm"
          >
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose className={buttonVariants({ variant: "ghost" })}>
            Volver
          </DialogClose>

          <Button
            type="button"
            variant="destructive"
            disabled={pendiente || notaFalta}
            onClick={confirmar}
          >
            {pendiente ? texto.confirmarPendiente : texto.confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
