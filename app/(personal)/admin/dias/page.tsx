import { PanelDias } from "@/components/admin/panel-dias";
import { listarDiasInhabilitados, reservasVivas } from "@/lib/admin/dias";

// /admin/dias, Task 7 de la tanda 3B (F8 de ESPECIFICACION_FUNCIONAL.md,
// corregida por D-40).
//
// Server Component: las dos lecturas se hacen aca, en el servidor, y el
// formulario mas la lista viven en un Client Component que recibe los arrays
// ya traidos. Misma reparticion que app/(personal)/admin/reservas/page.tsx.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx y
// app/(personal)/admin/layout.tsx -- que exige rol `admin` -- ya los montan.
export default async function DiasPage() {
  const [dias, vivas] = await Promise.all([listarDiasInhabilitados(), reservasVivas()]);

  // LA UNICA LECTURA DEL RELOJ DE TODA LA PAGINA (regla M-7): baja al panel
  // por props en ISO, mismo patron que ReservasPage con FiltrosReservas.
  const ahora = new Date().toISOString();

  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Días inhabilitados</h1>
        <p className="text-muted-foreground text-sm">
          Marca feriados o días sin atención. Al inhabilitar un día se cancelan solas las reservas
          que todavía no se retiraron; los préstamos ya entregados siguen su curso normal.
        </p>
      </div>

      <PanelDias dias={dias} reservasVivas={vivas} ahora={ahora} />
    </main>
  );
}
