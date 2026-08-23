"use client";

// El formulario de la encuesta final de satisfaccion
// (BR-18). Sirve para las DOS situaciones a la vez -crear y editar-: recibe
// la encuesta existente por props (o `null`) y pinta los valores ya rellenos
// cuando el alumno vuelve a abrirla, exactamente como pide el Step 3 del
// plan ("si ya existe, se edita").
//
// Las cinco valoraciones usan RADIOS NATIVOS, igual que formulario-reserva.tsx
// hace con el motivo: no hay componente de radio en components/ui/, y un
// unico consumidor no lo justifica -mismo criterio que ya explica el
// comentario de dialogo-cancelar.tsx sobre por que ese dialogo no se extrae
// todavia a components/ui/.
import { useActionState, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { guardarEncuesta, type EstadoEncuesta } from "@/lib/reservas/acciones";
import type { EncuestaDelAlumno } from "@/lib/reservas/consultas";

type FormularioEncuestaProps = {
  encuestaExistente: EncuestaDelAlumno | null;
};

type NombreValoracion =
  | "platformRating"
  | "serviceRating"
  | "reservationProcessRating"
  | "supportClarityRating"
  | "equipmentConditionRating";

// Las CINCO etiquetas son las de la especificacion funcional -F10,
// MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md linea 186: "plataforma, servicio,
// facilidad del proceso, claridad de la informacion, estado del equipo"-, y
// el `name` de cada una coincide con el campo que lee guardarEncuesta() en
// lib/reservas/acciones.ts.
const VALORACIONES: { name: NombreValoracion; etiqueta: string }[] = [
  { name: "platformRating", etiqueta: "Plataforma" },
  { name: "serviceRating", etiqueta: "Servicio" },
  { name: "reservationProcessRating", etiqueta: "Facilidad del proceso" },
  { name: "supportClarityRating", etiqueta: "Claridad de la información" },
  { name: "equipmentConditionRating", etiqueta: "Estado del equipo" },
];

// `would_recommend` llega como `boolean | null` desde la base y esta pantalla
// lo trabaja como "si" | "no" | null -las mismas dos cadenas que mandan los
// radios del formulario, mas abajo-. `null` es un tercer estado real y
// distinto -"no contesto todavia"-, no un tercer valor inventado: por eso
// esta funcion no colapsa nada, solo traduce.
function comoSiONo(valor: boolean | null): "si" | "no" | null {
  if (valor === null) {
    return null;
  }
  return valor ? "si" : "no";
}

export function FormularioEncuesta({ encuestaExistente }: FormularioEncuestaProps) {
  const [valoraciones, setValoraciones] = useState<Record<NombreValoracion, number | null>>(() => ({
    platformRating: encuestaExistente?.platformRating ?? null,
    serviceRating: encuestaExistente?.serviceRating ?? null,
    reservationProcessRating: encuestaExistente?.reservationProcessRating ?? null,
    supportClarityRating: encuestaExistente?.supportClarityRating ?? null,
    equipmentConditionRating: encuestaExistente?.equipmentConditionRating ?? null,
  }));
  const [wouldRecommend, setWouldRecommend] = useState<"si" | "no" | null>(() =>
    comoSiONo(encuestaExistente?.wouldRecommend ?? null),
  );

  const [estado, accionFormulario, pendiente] = useActionState<EstadoEncuesta, FormData>(
    guardarEncuesta,
    null,
  );

  // Congelado en el MONTAJE, con `useState` perezoso, y NO derivado del prop
  // `encuestaExistente` en cada render: tras guardar con exito,
  // guardarEncuesta() llama a `revalidatePath('/encuesta')`, y ese re-fetch
  // hace que este prop deje de ser `null` incluso si el envio fue el
  // PRIMERO -ya existe la fila, recien creada-. Leer el prop DESPUES de
  // enviar no distinguiria "estaba editando una encuesta previa" de "acabo de
  // crear la primera", que es justo lo que el acuse de recibo, mas abajo,
  // tiene que distinguir. Esta variable es la UNICA fuente de verdad de esa
  // distincion, leida una sola vez, en el instante en que la pantalla se
  // abrio.
  const [teniaEncuestaAlAbrir] = useState(() => encuestaExistente !== null);

  const idMejor = useId();
  const idMejorar = useId();
  const idComentarios = useId();

  const faltaAlgunCampoObligatorio =
    VALORACIONES.some(({ name }) => valoraciones[name] === null) || wouldRecommend === null;

  return (
    <form action={accionFormulario}>
      {VALORACIONES.map(({ name, etiqueta }) => (
        <section key={name} className="mt-8">
          <h2 className="font-display text-xl">{etiqueta}</h2>
          <div role="radiogroup" aria-label={etiqueta} className="mt-3 flex flex-wrap items-center gap-4">
            <span className="text-muted-foreground text-xs">1 = la calificación más baja</span>
            {[1, 2, 3, 4, 5].map((valor) => (
              <label key={valor} className="flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={name}
                  value={valor}
                  checked={valoraciones[name] === valor}
                  onChange={() => setValoraciones((anteriores) => ({ ...anteriores, [name]: valor }))}
                />
                {valor}
              </label>
            ))}
            <span className="text-muted-foreground text-xs">5 = la calificación más alta</span>
          </div>
        </section>
      ))}

      <section className="mt-8">
        <h2 className="font-display text-xl">¿Recomendarías el servicio?</h2>
        {/* Dos radios explicitos, si y no, y NUNCA una casilla: una casilla
            sin marcar se enviaria como `false` -"no lo recomiendo"-, que no
            es lo mismo que "no conteste esto". Con radios sin preseleccionar,
            "no contestado" (`wouldRecommend === null`, arriba) sigue siendo
            distinguible, y es justo lo que mantiene el boton de enviar
            deshabilitado hasta que el alumno elija uno de los dos. */}
        <div
          role="radiogroup"
          aria-label="¿Recomendarías el servicio?"
          className="mt-3 flex gap-4"
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="wouldRecommend"
              value="si"
              checked={wouldRecommend === "si"}
              onChange={() => setWouldRecommend("si")}
            />
            Sí
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="wouldRecommend"
              value="no"
              checked={wouldRecommend === "no"}
              onChange={() => setWouldRecommend("no")}
            />
            No
          </label>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl">Comentarios (opcional)</h2>
        {/* Los tres textos son OPCIONALES -decision de Alejandro, 2026-08-11-,
            asi que van sin marcar como obligatorios y no cuentan para
            `faltaAlgunCampoObligatorio` de arriba. `Input` de
            components/ui/input.tsx, ya existente, y SIN `maxLength`: las tres
            columnas son `text` sin ningun limite, y ponerlo aca inventaria
            una regla que el motor no tiene -mismo razonamiento que ya dejo
            escrito dialogo-cancelar.tsx para el motivo de cancelacion-. */}
        <div className="mt-3 space-y-4">
          <div>
            <label htmlFor={idMejor} className="text-sm font-medium">
              ¿Qué es lo mejor del servicio?
            </label>
            <Input
              id={idMejor}
              name="bestFeature"
              type="text"
              autoComplete="off"
              defaultValue={encuestaExistente?.bestFeature ?? ""}
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor={idMejorar} className="text-sm font-medium">
              ¿Qué se podría mejorar?
            </label>
            <Input
              id={idMejorar}
              name="improvementArea"
              type="text"
              autoComplete="off"
              defaultValue={encuestaExistente?.improvementArea ?? ""}
              className="mt-1"
            />
          </div>

          <div>
            <label htmlFor={idComentarios} className="text-sm font-medium">
              Comentarios adicionales
            </label>
            <Input
              id={idComentarios}
              name="comments"
              type="text"
              autoComplete="off"
              defaultValue={encuestaExistente?.comments ?? ""}
              className="mt-1"
            />
          </div>
        </div>
      </section>

      {estado && "error" in estado && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive mt-6 rounded-lg px-4 py-3 text-sm"
        >
          {estado.error}
        </p>
      )}

      {/* El acuse de recibo lee `teniaEncuestaAlAbrir`, congelado arriba, y NO
          `encuestaExistente !== null`: para cuando este mensaje se pinta, ese
          prop YA es distinto de `null` en los dos casos -crear y editar-,
          porque la fila ya existe en los dos. Sin esta distincion, quien
          respondia por primera vez leeria un texto que da por hecho que ya
          lo habia hecho antes. */}
      {estado && "guardada" in estado && (
        <p className="bg-secondary mt-6 rounded-lg px-4 py-3 text-sm">
          {teniaEncuestaAlAbrir
            ? "Tu encuesta se actualizó. Puedes volver a editarla cuando quieras."
            : "Gracias por completar la encuesta. Puedes volver a editarla cuando quieras."}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-6"
        disabled={faltaAlgunCampoObligatorio || pendiente}
      >
        {pendiente ? "Guardando…" : "Guardar encuesta"}
      </Button>
    </form>
  );
}
