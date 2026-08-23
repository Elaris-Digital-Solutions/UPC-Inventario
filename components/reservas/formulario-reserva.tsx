"use client";

// El formulario de reserva. Envuelve al Calendario y le
// anade lo que falta para poder terminar: el motivo, el
// boton de confirmar, y la Server Action que llama a `create_reservation`
// (lib/reservas/acciones.ts).
//
// Vive en su propio archivo y no dentro de calendario.tsx porque junta DOS
// piezas de estado que Calendario no necesita conocer -la franja elegida y el
// motivo- con el envio del formulario. Calendario sigue siendo "tonto": solo
// pinta lo que le llega y avisa cuando se toca una franja.
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendario } from "@/components/reservas/calendario";
import { reservar, type EstadoReserva } from "@/lib/reservas/acciones";
import { MOTIVOS, type Motivo } from "@/lib/reservas/motivos";
import type { DiaInhabilitado, Franja } from "@/lib/reservas/consultas";

type FormularioReservaProps = {
  productoId: string;
  sede: string;
  dias: string[];
  diaElegido: string;
  franjas: Franja[];
  diasInhabilitados: DiaInhabilitado[];
  duracionMinutos: number;
};

export function FormularioReserva({
  productoId,
  sede,
  dias,
  diaElegido,
  franjas,
  diasInhabilitados,
  duracionMinutos,
}: FormularioReservaProps) {
  // La franja elegida es `useState` y NO un query param, al reves que el dia
  // y la duracion -esos SI viven en la URL, ver el comentario de
  // app/(alumno)/catalogo/[id]/reservar/page.tsx-. La diferencia no es
  // estetica: el dia y la duracion tienen que llegar a la URL porque el
  // SERVIDOR los necesita para volver a pedir la rejilla -`franjasDelDia()`
  // corre alla, en lib/reservas/consultas.ts, y solo un Server Component
  // puede llamarla-. Elegir una franja no cambia nada de lo que hay que
  // pedirle a la base: la rejilla ya llego completa, con esa franja adentro y
  // su `free` ya calculado. No hay ningun viaje al servidor que dar solo para
  // recordar cual se toco, asi que el estado se queda en el cliente.
  const [franjaElegida, setFranjaElegida] = useState<string | null>(null);
  const [motivo, setMotivo] = useState<Motivo | null>(null);
  const [estado, accionFormulario, pendiente] = useActionState<EstadoReserva, FormData>(
    reservar,
    null,
  );

  return (
    <form action={accionFormulario}>
      {/* Pasarle una funcion a un Client Component desde OTRO Client
          Component SI se puede: la frontera que Next prohibe cruzar con una
          funcion es la que sale de un SERVER Component, no cualquier
          frontera entre componentes. Es justo lo contrario de lo que hace el
          archivo de al lado, selector-duracion.tsx -y de lo que hacia este
          mismo Calendario antes de la Task 10-: esos navegan con
          router.push() en vez de recibir un callback porque a ellos los monta
          directamente app/(alumno)/catalogo/[id]/reservar/page.tsx, que ES un
          Server Component. Aca en cambio el padre de Calendario es ESTE
          archivo -"use client" arriba, igual que calendario.tsx-, asi que
          `onElegirFranja={setFranjaElegida}` es una funcion de verdad
          cruzando props entre dos componentes de cliente, y esa frontera
          nunca estuvo prohibida. */}
      <Calendario
        dias={dias}
        diaElegido={diaElegido}
        franjas={franjas}
        diasInhabilitados={diasInhabilitados}
        duracionMinutos={duracionMinutos}
        sede={sede}
        franjaElegida={franjaElegida}
        onElegirFranja={setFranjaElegida}
      />

      <section className="mt-8">
        <h2 className="font-display text-xl">Motivo</h2>
        <div
          role="radiogroup"
          aria-label="Motivo de la reserva"
          className="mt-3 flex flex-col gap-2"
        >
          {MOTIVOS.map((opcion) => (
            <label key={opcion} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="motivo-radio"
                value={opcion}
                checked={motivo === opcion}
                onChange={() => setMotivo(opcion)}
              />
              {opcion}
            </label>
          ))}
        </div>
      </section>

      {/* Cuatro campos ocultos y no una llamada directa a la RPC desde este
          componente: el envio pasa por la Server Action `reservar()` porque
          es alla, y no aca, donde se puede llamar a `create_reservation` -un
          Client Component no tiene acceso a `createClient()` de
          lib/supabase/server.ts-. `slotStart` lleva el valor tal cual salio
          de `franjaElegida`, sin tocarlo: el porque completo esta en el
          comentario de reservar() en lib/reservas/acciones.ts. */}
      <input type="hidden" name="productId" value={productoId} />
      <input type="hidden" name="campusId" value={sede} />
      <input type="hidden" name="slotStart" value={franjaElegida ?? ""} />
      <input type="hidden" name="duracionMinutos" value={duracionMinutos} />
      <input type="hidden" name="motivo" value={motivo ?? ""} />

      {franjaElegida === null && (
        <p className="text-muted-foreground mt-4 text-sm">
          Elige primero un día y una hora en el calendario de arriba.
        </p>
      )}

      {estado?.error && (
        <p
          role="alert"
          className="bg-destructive/10 text-destructive mt-4 rounded-lg px-4 py-3 text-sm"
        >
          {estado.error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="mt-4"
        disabled={franjaElegida === null || motivo === null || pendiente}
      >
        {pendiente ? "Reservando…" : "Confirmar reserva"}
      </Button>
    </form>
  );
}
