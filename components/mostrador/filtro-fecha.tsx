"use client";

// El filtro de fecha sobre "Por entregar" (F5) Y TAMBIEN la lista filtrada de esa
// columna, y no es un exceso de alcance: el `useState` del filtro y la lista que
// depende de el no se pueden separar sin subir ese estado a un padre comun, y ese
// padre seria toda la pagina. Convertirla entera en Client Component perderia la
// lectura en servidor de las otras dos columnas.
import { useState } from "react";

import { TarjetaMostrador } from "@/components/mostrador/tarjeta-mostrador";
import { buttonVariants } from "@/components/ui/button";
import type { ReservaMostrador } from "@/lib/mostrador/consultas";
import {
  ETIQUETAS_FILTRO_FECHA,
  ORDEN_FILTROS_FECHA,
  pasaFiltroFecha,
  type FiltroFecha,
} from "@/lib/mostrador/filtro";
import type { NotaUnidad } from "@/lib/mostrador/notas";

type FiltroPorEntregarProps = {
  // Ya agrupadas por la pagina: la agrupacion es del servidor.
  reservas: ReservaMostrador[];
  // El instante actual como STRING ISO y no como `Date`: la pagina hace la UNICA
  // lectura del reloj (regla M-7), y un string es texto llano, sin depender de
  // como el framework serialice un `Date` al cruzar al cliente.
  ahora: string;
  // Ya resueltas por la pagina, en el mismo Record que reciben las otras dos
  // columnas. Cada tarjeta busca la suya por `unidadId`.
  notasPorUnidad: Record<string, NotaUnidad[]>;
};

export function FiltroPorEntregar({ reservas, ahora, notasPorUnidad }: FiltroPorEntregarProps) {
  // Arranca en "todas": el filtro no debe esconder nada hasta que alguien lo pida.
  // Quien abre el mostrador tiene que ver TODO su trabajo pendiente.
  const [filtro, setFiltro] = useState<FiltroFecha>("todas");

  const instante = new Date(ahora);
  const filtradas = reservas.filter((reserva) => pasaFiltroFecha(reserva.inicio, instante, filtro));

  return (
    <div className="space-y-4">
      {/* `size: "xs"` y no `"sm"`, y el CONTADOR al lado. Medido en pantalla
          el 2026-08-13: con cuatro chips de `sm` dentro de una columna que en
          un portatil mide unos 400px, "Todas" se caia sola a una segunda
          linea -y siendo la activa, en rojo, parecia un fallo de maquetacion
          y no un filtro puesto-. Con `xs` los cuatro entran en una linea.
          Son controles SECUNDARIOS -filtran una vista, no ejecutan nada sobre
          una reserva-, asi que bajar su tamano no toca la regla de los 44px
          que si aplica a los botones que entregan, reciben o marcan una falta.
          El numero de la derecha es el de las reservas que SE VEN, no el
          total: por eso vive aca y no en la cabecera de la columna. Con el
          filtro puesto, un contador que dijera el total contradiria a la
          lista que hay debajo. */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {ORDEN_FILTROS_FECHA.map((opcion) => (
            <button
              key={opcion}
              type="button"
              aria-pressed={opcion === filtro}
              onClick={() => setFiltro(opcion)}
              // La `variant` distinta no es estetica: saber cual filtro esta
              // aplicado es lo que evita creer que no hay reservas.
              className={buttonVariants({ variant: opcion === filtro ? "default" : "outline", size: "xs" })}
            >
              {ETIQUETAS_FILTRO_FECHA[opcion]}
            </button>
          ))}
        </div>
        <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
          {filtradas.length}
        </span>
      </div>

      {filtradas.length === 0 ? (
        reservas.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nada pendiente en esta columna.</p>
        ) : (
          // Distinto del mensaje de arriba A PROPOSITO: aqui SI hay reservas y el
          // filtro las esconde. Decir "nada pendiente" seria FALSO, y un operador
          // podria dar por cerrado un turno con equipos por entregar.
          <p className="text-muted-foreground text-sm">
            Hay reservas pendientes de entregar, pero ninguna entra en «
            {ETIQUETAS_FILTRO_FECHA[filtro]}». Prueba con otro filtro para verlas.
          </p>
        )
      ) : (
        filtradas.map((reserva) => (
          <TarjetaMostrador
            key={reserva.id}
            reserva={reserva}
            columna="por_entregar"
            notas={notasPorUnidad[reserva.unidadId] ?? []}
          />
        ))
      )}
    </div>
  );
}
