// La presentacion de las notas de una unidad, Task 7 de la tanda 3A. Recibe
// las notas YA ORDENADAS -mas recientes primero, tal como las entrega
// notasPorUnidad() en lib/mostrador/notas.ts- y las pinta tal cual: NO
// reordena aca. Reordenar seria una SEGUNDA fuente de verdad sobre el orden,
// que podria desincronizarse de la consulta si algun dia cambia el criterio
// alla y no aca.
//
// Sin "use client": es un componente puro, sin `useState` ni ningun otro
// hook, igual que Button (components/ui/button.tsx) o Textarea
// (components/ui/textarea.tsx) tampoco lo llevan. Que su unico consumidor
// hoy -dialogo-nota.tsx- sea un Client Component no lo obliga a serlo: no
// usa ninguna API de servidor, asi que Next lo trata como parte de ese
// arbol sin que haga falta la directiva.
//
// NO MUESTRA QUIEN ESCRIBIO CADA NOTA, y esto es una AUSENCIA DELIBERADA, no
// un olvido. Tres motivos, y los tres estan comprobados:
//
//   1. `inventory_unit_notes.created_by` referencia `auth.users`, y
//      PostgREST NO PUEDE embeber ese esquema desde una tabla de `public`
//      -medido: pedir `staff_members(full_name)` desde las notas devuelve
//      `PGRST200`, "no matches were found".
//   2. Aunque se resolviera con una segunda consulta manual -leer
//      `created_by` y despues buscarlo en `staff_members`-, la politica
//      `staff_select_self` (`20260805194015_staff_policies.sql:17-19`) deja
//      que un operador SOLO se vea A SI MISMO: no hay forma de que esta
//      pantalla resuelva el nombre de UN COMPAÑERO, ni con dos consultas.
//   3. Mostrar el autor exigiria SQL nuevo -una politica que le abra a
//      cualquier operador ver al resto del personal, o una funcion que
//      exponga el nombre sin exponer la fila entera-, y esta tanda tiene
//      vetado tocar SQL salvo un desvio registrado por delante ("Global
//      Constraints" del plan). Se deja escrito en vez de resuelto.
import type { NotaUnidad } from "@/lib/mostrador/notas";

// Formato PROPIO, y NO una reutilizacion de FORMATO_DIA/FORMATO_HORA de
// tarjeta-mostrador.tsx. No es una copia del mismo criterio: es OTRO
// formato, porque el dato es otro. Aquellos pintan el dia de una RESERVA,
// que vive en una ventana acotada de dias o semanas, y por eso se pintan SIN
// año. Una nota puede ser de hace DOS AÑOS -no tiene ninguna ventana de
// vigencia-, y sin año "15 ago" no dice de que año esta hablando.
// `hour12: false` tampoco es gusto: es el mismo motivo ya medido en
// tarjeta-mostrador.tsx y en lib/reservas/acciones.ts -en `es-PE` el formato
// de 12 horas termina en "p. m.", y eso ya costo un defecto VISIBLE en
// pantalla.
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
