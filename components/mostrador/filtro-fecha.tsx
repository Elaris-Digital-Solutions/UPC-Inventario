"use client";

// El filtro de fecha sobre "Por entregar" (F5, Task 8 de la tanda 3A) -y
// TAMBIEN la lista filtrada de tarjetas de esa columna. El plan nombra este
// archivo solo como "el filtro" en su "Estructura de archivos", asi que hay
// que dejar dicho por que acaba pintando tambien las tarjetas: el estado del
// filtro (`useState`) y la lista que depende de el NO se pueden separar en
// dos componentes hermanos sin subir ese estado a un padre comun -y ese
// padre tendria que ser Client Component igual, porque `useState` no existe
// en un Server Component-. La alternativa habria sido mover el `useState` a
// app/(personal)/mostrador/page.tsx entero, convirtiendo TODA la pagina en
// Client Component -las columnas "Activas" y "Por devolver" incluidas-, y
// perdiendo la lectura de datos en el servidor que la Task 4 ya dejo
// escrita para las tres columnas. Montar el selector Y la lista aca es lo
// que deja esas otras dos columnas exactamente como estaban.
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
  // Las reservas de "Por entregar", ya agrupadas por
  // app/(personal)/mostrador/page.tsx -este componente no vuelve a llamar
  // columnaDeReserva() ni reservasMostrador(), mismo criterio que ya sigue
  // TarjetaMostrador con su prop `columna`: la agrupacion es del servidor.
  reservas: ReservaMostrador[];
  // El instante actual, como STRING ISO y no como `Date`. Es la frontera
  // servidor->cliente: page.tsx (Server Component) hace la UNICA lectura
  // del reloj de toda la pagina (regla M-7) y este componente la recibe por
  // props en vez de volver a leerla. Viaja en ISO y no como `Date` porque
  // eso saca de la ecuacion COMO el framework decida serializar un `Date`
  // al cruzar de Server a Client Component -no medido aca, y no hace falta
  // medirlo-: un string ISO es texto llano, sin ninguna forma de llegar
  // distinto del otro lado. Se reconstruye con `new Date(...)` aca dentro,
  // una sola vez por render.
  ahora: string;
  // Las notas de TODAS las unidades que puede necesitar esta columna, ya
  // resueltas por notasPorUnidad() en la pagina -mismo Record que reciben
  // las otras dos columnas, no una copia recortada-. Cada tarjeta busca la
  // suya por `unidadId`, igual que ya hace page.tsx para "Activas" y "Por
  // devolver".
  notasPorUnidad: Record<string, NotaUnidad[]>;
};

export function FiltroPorEntregar({ reservas, ahora, notasPorUnidad }: FiltroPorEntregarProps) {
  // Arranca en "todas": el filtro NO debe esconder nada hasta que alguien lo
  // pida. Un operador que abre el mostrador por primera vez en su turno
  // tiene que ver TODO su trabajo pendiente en "Por entregar", no una
  // rebanada que dependa de que alguien haya tocado el filtro antes que el.
  const [filtro, setFiltro] = useState<FiltroFecha>("todas");

  const instante = new Date(ahora);
  const filtradas = reservas.filter((reserva) => pasaFiltroFecha(reserva.inicio, instante, filtro));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {ORDEN_FILTROS_FECHA.map((opcion) => (
          <button
            key={opcion}
            type="button"
            aria-pressed={opcion === filtro}
            onClick={() => setFiltro(opcion)}
            // El boton activo se distingue con una `variant` distinta -no
            // es una eleccion de estetica: saber cual filtro esta aplicado
            // es lo que evita creer que no hay reservas cuando en realidad
            // estan filtradas.
            className={buttonVariants({ variant: opcion === filtro ? "default" : "outline", size: "sm" })}
          >
            {ETIQUETAS_FILTRO_FECHA[opcion]}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        reservas.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nada pendiente en esta columna.</p>
        ) : (
          // Distinto del mensaje de arriba A PROPOSITO: aca SI hay
          // reservas, solo que el filtro las esconde. Decir "nada
          // pendiente" seria una afirmacion FALSA -el equipo pendiente
          // existe, el filtro solo lo tapa- con una consecuencia real: un
          // operador podria pensar que no le queda nada por entregar cuando
          // en realidad tiene reservas fuera de la ventana elegida.
          // El texto TUTEA, como todos los de esta aplicacion -"Actualiza la
          // pagina", "Describe abajo que paso con el equipo", "no escribas
          // datos personales"-. Los comentarios y los documentos del proyecto
          // vosean; la interfaz no, y mezclar los dos registros en la misma
          // pantalla se lee como un descuido.
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
