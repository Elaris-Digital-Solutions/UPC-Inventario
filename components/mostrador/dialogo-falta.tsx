"use client";

// El dialogo de confirmacion para las dos faltas del mostrador, Task 6 de la
// tanda 3A -"la tarea delicada": es la primera vez que el proyecto sanciona
// a una persona de verdad, con bloqueo PERMANENTE en un caso.
//
// UN UNICO componente PARAMETRIZADO por `tipo`, y no dos componentes
// separados -decision ya tomada en el plan
// (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md, "Task 6 - Las dos faltas"): a
// diferencia de dialogo-cancelar.tsx, que tenia UN UNICO caso real al
// escribirse y por eso NO generalizo -su propio comentario lo explica-, aca
// hay DOS casos reales desde el principio, `not_picked_up` y `not_returned`,
// con textos y consecuencias distintas pero la MISMA forma: un boton
// disparador, un dialogo modal, confirmacion explicita antes de ejecutar, y
// `useTransition` para la Server Action. Generalizar aca no es adivinar un
// caso futuro -la trampa que dialogo-cancelar.tsx evito-: es la misma forma
// escrita una vez para los dos casos que ya existen hoy.
//
// EL TEXTO DE CADA CASO DICE LA CONSECUENCIA REAL, no un generico "¿estas
// seguro?": para `not_picked_up`, que una SEGUNDA falta en 90 dias bloquea
// 15 dias; para `not_returned`, que el bloqueo es PERMANENTE y solo un
// administrador lo revierte. NINGUNO de los dos textos afirma si esta
// marcacion sera la primera o la segunda falta del alumno: eso lo decide el
// trigger `apply_penalties`
// (supabase/migrations/20260806013146_penalties.sql) en el momento, contando
// `not_picked_up` de los ultimos 90 dias contra `updated_at`. Precalcular
// ese conteo aca, desde el cliente, obligaria a duplicar la MISMA regla que
// ya vive en el trigger -y una copia en dos sitios se puede desincronizar si
// alguno cambia sin el otro-, ademas de una consulta extra solo para un
// numero que el propio boton de confirmar va a volver obsoleto en cuanto
// otro operador marque una falta sobre CUALQUIER reserva del mismo alumno,
// en cualquier mostrador, entre que esta pantalla se pinto y que se pulsa el
// boton. Por eso los dos textos avisan del PEOR CASO posible ("si esta es la
// segunda vez...") sin prometer un resultado exacto.
//
// SOBRE components/ui/dialog.tsx: este es su PRIMER consumidor propio
// -dialogo-nota.tsx, Task 7, sera el segundo-. dialogo-cancelar.tsx (T2B)
// construye el suyo directo sobre `radix-ui` a proposito, con un comentario
// que dice que un SEGUNDO consumidor de un dialogo modal es el momento de
// extraer el envoltorio comun; ese momento ya llego -la Task 1 de esta tanda
// instalo components/ui/dialog.tsx con `shadcn add`- y este componente es el
// primero en usarlo.
//
// Igual que en dialogo-cancelar.tsx, ni el trigger ni el boton de cerrar se
// envuelven con `asChild` alrededor de un <Button>: Button
// (components/ui/button.tsx) no usa `React.forwardRef`, y nadie confirmo en
// un navegador que esa cadena no deja una advertencia en consola. DialogTrigger
// y DialogClose (components/ui/dialog.tsx) reenvian a `DialogPrimitive.Trigger`
// y `DialogPrimitive.Close` sin envolver nada, asi que basta con pintarlos con
// `buttonVariants` directo -el mismo truco que ya usa dialogo-cancelar.tsx-.
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
  // Se pide SIEMPRE, aunque solo la use el caso `not_returned`: es la misma
  // FK cruda que ReservaMostrador ya trae en `unidadId`
  // (lib/mostrador/consultas.ts), y hacerla condicional obligaria a quien
  // monta este componente a saber, ademas del tipo, cuando hace falta cada
  // prop -exactamente el acoplamiento que un componente PARAMETRIZADO
  // deberia evitar. `marcarNoRecogida()` simplemente no la usa.
  unidadId: string;
  // El texto del alumno YA RESUELTO, no el objeto crudo: mismo criterio que
  // `producto` en DialogoCancelarProps (dialogo-cancelar.tsx) -quien ya
  // tiene el dato se lo pasa-. TarjetaMostrador ya calcula este texto con
  // textoAlumno() para pintarlo en la tarjeta; este dialogo lo reutiliza en
  // vez de volver a resolver `alumno === null` por su cuenta.
  alumno: string;
};

// Los cuatro textos por tipo, en un solo lugar para no repetir el `if
// (tipo === ...)` cuatro veces dentro del JSX. `consecuencia` es una funcion
// y no un string fijo porque necesita interpolar el nombre del alumno, que
// solo se conoce al montar el componente.
//
// `boton` NO es una eleccion de redaccion de este archivo: son los nombres
// que F5 ya le da a estas dos acciones -"«No se retiro» -> not_picked_up" y
// "«No se devolvio» -> not_returned", MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md
// :136 y :138-. Una version anterior decia "No recogido" y "No devuelto", y
// se alinearon con la especificacion el 2026-08-12 para que la pantalla y el
// documento no se contradigan. `titulo` y `confirmar` siguen al boton en el
// mismo verbo -retirar, devolver- y no son de la especificacion: los cuatro
// solo existen aca.
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
    consecuencia: (alumno) =>
      `${alumno} no retiró el equipo en su horario reservado. Si esta es la segunda vez que no retira en los últimos 90 días, quedará bloqueado 15 días.`,
  },
  not_returned: {
    boton: "No se devolvió",
    titulo: "Marcar como no devuelto",
    confirmar: "Marcar no devuelto",
    confirmarPendiente: "Marcando…",
    consecuencia: (alumno) =>
      `Esto bloquea a ${alumno} de forma permanente, y solo un administrador puede revertirlo. Describe abajo qué pasó con el equipo: la nota queda en el historial de la unidad.`,
  },
};

export function DialogoFalta({ tipo, reservationId, unidadId, alumno }: DialogoFaltaProps) {
  const [abierto, setAbierto] = useState(false);
  const [nota, setNota] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciarTransicion] = useTransition();
  const idNota = useId();

  const texto = TEXTO[tipo];

  // Deshabilitado mientras la nota este vacia TRAS `trim()`, y SOLO para
  // `not_returned` -mismo patron que dialogo-cancelar.tsx usa para el
  // motivo, aplicado unicamente donde F5 realmente exige el campo: para
  // `not_picked_up` no hay ningun campo que llenar, asi que esta condicion
  // nunca bloquea ese caso.
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

      // SIN `setAbierto(false)` a mano, mismo razonamiento ESTRUCTURAL que
      // ya deja escrito dialogo-cancelar.tsx: en exito, la Server Action ya
      // llamo a `revalidatePath('/mostrador')`, y la reserva paso a un
      // estado TERMINAL -`not_picked_up` o `not_returned`- que
      // reservasMostrador() ya no trae -filtra `status in ('reserved',
      // 'active')`, lib/mostrador/consultas.ts-. TarjetaMostrador entera se
      // DESMONTA de la pagina, y con ella este dialogo y su `abierto =
      // true`: no queda ningun componente vivo que necesite cerrarse a
      // mano. Es incluso mas fuerte que el caso de DialogoCancelar -alla la
      // reserva seguia viendose, solo cambiaba de seccion; aca desaparece
      // del mostrador por completo-.
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
          {/* DialogTitle y DialogDescription son OBLIGATORIOS, mismo motivo
              que ya deja escrito dialogo-cancelar.tsx: sin ellos Radix
              escribe una advertencia en consola, y la consola sin una sola
              advertencia es el criterio de cierre de este proyecto. No son
              un adorno: son lo que un lector de pantalla anuncia al abrir
              el dialogo, y aca ademas es donde vive la consecuencia real
              que el Step 3 del plan exige decir. */}
          <DialogTitle>{texto.titulo}</DialogTitle>
          <DialogDescription>{texto.consecuencia(alumno)}</DialogDescription>
        </DialogHeader>

        {tipo === "not_returned" && (
          <div>
            <Label htmlFor={idNota}>Nota sobre lo ocurrido</Label>
            {/* `Textarea` y no `Input`: es el primer campo de nota de este
                proyecto que puede necesitar mas de una linea -"que paso con
                el equipo"-, a diferencia del motivo de cancelar() en
                dialogo-cancelar.tsx. SIN `maxLength`: `note` es `text` sin
                ningun `CHECK` de longitud -confirmado leyendo
                supabase/migrations/20260805030123_baseline.sql:187-193,
                donde `note` es la unica columna de texto de la tabla y no
                lleva ningun `CHECK`, solo `NOT NULL`-, asi que un limite aca
                seria la interfaz inventando una regla que el motor no
                tiene. */}
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
