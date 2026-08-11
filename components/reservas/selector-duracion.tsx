"use client";

// Selector de duracion: botones y no un <select>, mismo patron que ya eligio
// el proyecto para las categorias del catalogo (components/catalogo/filtros.tsx).
// Con ocho opciones reales (30 a 240 con los datos de produccion) un
// desplegable no ahorra espacio y esconde las opciones detras de un click
// extra que los botones no necesitan.
//
// Este componente NO calcula que duraciones existen -eso lo decide
// duracionesPosibles() en lib/reservas/rejilla.ts, a partir de
// max_duration_hours del producto y slot_minutes/min_duration_minutes de
// app_settings (D-1, D-19)- ni llama a la rejilla. Solo pinta las que le
// llegan ya calculadas y navega.
//
// Y "navega" es literal, no una figura: la duracion elegida tiene que llegar
// al SERVIDOR, porque available_slots se llama alla (lib/reservas/consultas.ts),
// asi que cambiar de duracion no es setState sino un cambio de URL -la
// pagina completa (app/(alumno)/catalogo/[id]/reservar/page.tsx) vuelve a
// correr con `?duracion=` distinto-. Por eso este componente construye el
// href el mismo y usa router.push(), en vez de recibir un callback de la
// pagina que lo usa: esa pagina es un Server Component, y Next no deja pasar
// funciones de un Server Component a un Client Component -solo cruzan esa
// frontera las Server Actions, marcadas "use server", y esto no lo es-.
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type SelectorDuracionProps = {
  duraciones: number[];
  elegida: number;
  sede: string;
  dia: string;
};

// 90 -> "1 h 30" y no "1.5 h" ni "1h30m": el minuto suelto no lleva unidad
// propia porque ya la lleva la hora delante, y es la forma mas corta que
// sigue sin ambiguedad. Con los datos reales (slot_minutes 30) los minutos
// sueltos que puede haber son siempre 30, pero la funcion no asume ese
// numero -si `slot_minutes` cambiara algun dia, sigue formateando bien-.
function formatearDuracion(minutos: number): string {
  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  if (resto === 0) {
    return horas === 1 ? "1 h" : `${horas} h`;
  }

  return `${horas} h ${resto}`;
}

export function SelectorDuracion({ duraciones, elegida, sede, dia }: SelectorDuracionProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Los tres parametros se reescriben siempre juntos y no solo `duracion`:
  // esta pagina no tiene otra forma de saber la sede o el dia que ya estaban
  // elegidos, y omitirlos aqui los borraria de la URL en vez de conservarlos.
  function elegir(duracion: number) {
    const params = new URLSearchParams({ sede, dia, duracion: String(duracion) });
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Duración de la reserva">
      {duraciones.map((duracion) => (
        <Button
          key={duracion}
          type="button"
          variant={duracion === elegida ? "default" : "outline"}
          size="sm"
          aria-pressed={duracion === elegida}
          onClick={() => elegir(duracion)}
        >
          {formatearDuracion(duracion)}
        </Button>
      ))}
    </div>
  );
}
