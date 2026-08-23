// Pinta las notas de una unidad. Llegan YA ORDENADAS y se pintan tal cual:
// reordenar aqui seria una SEGUNDA fuente de verdad sobre el orden.
//
// Sin "use client": es puro, sin hooks. Que su unico consumidor sea un Client
// Component no lo obliga a serlo.
//
// NO MUESTRA QUIEN ESCRIBIO CADA NOTA, y es una AUSENCIA DELIBERADA con tres
// motivos comprobados:
//   1. `created_by` referencia `auth.users`, y PostgREST no puede embeber ese
//      esquema desde `public`: devuelve PGRST200.
//   2. Ni con una segunda consulta: `staff_select_self` deja que un operador
//      SOLO se vea a si mismo, asi que no hay forma de resolver el nombre de un
//      compañero.
//   3. Mostrarlo exigiria SQL nuevo -una politica o una funcion-, y eso es un
//      desvio que hay que registrar por delante.
import type { NotaUnidad } from "@/lib/mostrador/notas";

// Formato PROPIO y no el de las reservas, porque el dato es otro: una reserva
// vive en una ventana de dias y se pinta SIN año; una nota puede ser de hace dos
// años, y sin año "15 ago" no dice de cual habla.
//
// `hour12: false` por el motivo de siempre: en `es-PE` el formato de 12 horas
// termina en "p. m." y ya costo un defecto visible.
const FORMATO_FECHA_NOTA = new Intl.DateTimeFormat("es-PE", {
  timeZone: "America/Lima",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

type HistorialNotasProps = {
  notas: NotaUnidad[];
};

export function HistorialNotas({ notas }: HistorialNotasProps) {
  if (notas.length === 0) {
    return <p className="text-muted-foreground text-sm">Esta unidad todavía no tiene notas.</p>;
  }

  return (
    <ul className="space-y-2">
      {notas.map((nota) => (
        <li key={nota.id} className="text-sm">
          <p className="text-muted-foreground text-xs">
            {FORMATO_FECHA_NOTA.format(new Date(nota.fecha))}
          </p>
          <p>{nota.texto}</p>
        </li>
      ))}
    </ul>
  );
}
