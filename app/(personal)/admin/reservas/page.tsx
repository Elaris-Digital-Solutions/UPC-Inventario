import { FiltrosReservas } from "@/components/admin/filtros-reservas";
import { listarReservas } from "@/lib/admin/reservas";

// /admin/reservas, Task 6 de la tanda 3B (F6 de ESPECIFICACION_FUNCIONAL.md).
//
// Server Component: la lectura de las reservas se hace aca, en el servidor, y
// los filtros viven en un Client Component que recibe el array ya traido. Es la
// misma reparticion que app/(personal)/mostrador/page.tsx.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx ya los monta y
// app/(personal)/admin/layout.tsx -- que exige rol `admin` -- vive dentro.
export default async function ReservasPage() {
  const reservas = await listarReservas();

  // LA UNICA LECTURA DEL RELOJ DE TODA LA PAGINA, y baja a los filtros por
  // props en ISO. Es la regla M-7: si el filtro de fecha leyera `new Date()`
  // por su cuenta en el cliente, la pantalla podria estar comparando contra un
  // instante distinto del que uso el servidor para pintar, y en la frontera de
  // medianoche en Lima eso mueve reservas de dia. Mismo patron que ya usa el
  // mostrador con su filtro de "Por entregar".
  const ahora = new Date().toISOString();

  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Reservas</h1>
        <p className="text-muted-foreground text-sm">
          Todas las reservas del sistema, en cualquier estado. Desde aquí se cambia el estado de una
          reserva y se cancela con un motivo.
        </p>
      </div>

      <FiltrosReservas reservas={reservas} ahora={ahora} />
    </main>
  );
}
