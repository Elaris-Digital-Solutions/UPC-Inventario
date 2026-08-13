import { PanelEstadisticas } from "@/components/admin/panel-estadisticas";
import { calcularEstadisticas } from "@/lib/admin/estadisticas";
import { reservasParaEstadisticas } from "@/lib/admin/reservas";
import { Antetitulo, TituloSeccion } from "@/components/antetitulo";

// /admin/estadisticas, Task 8 de la tanda 3B (F9 de
// ESPECIFICACION_FUNCIONAL.md, ampliada por D-51: ocho indicadores en vez de
// los cinco que pide F9 -los seis estados mas el total mas la semana-, y el
// desglose por dia de la semana de D-50).
//
// Server Component: la lectura y el calculo se hacen aca, en el servidor, y
// el panel recibe el resultado YA CALCULADO por props -mismo reparto que
// app/(personal)/admin/dias/page.tsx-.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx y
// app/(personal)/admin/layout.tsx -que exige rol `admin`- ya los montan.
export default async function EstadisticasPage() {
  const reservas = await reservasParaEstadisticas();

  // LA UNICA LECTURA DEL RELOJ DE TODA LA PAGINA (regla M-7): la usa
  // calcularEstadisticas() solo para "Prestamos esta semana" (D-49), que es
  // una ventana movil hacia atras y necesita saber que dia es hoy en Lima.
  // No hace falta pasarla al panel: el panel recibe el resultado YA
  // CALCULADO -numeros sueltos, sin ningun `Date`-, no el instante.
  const ahora = new Date();
  const estadisticas = calcularEstadisticas(reservas, ahora);

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Antetitulo>Administración</Antetitulo>
          <TituloSeccion como="h1">Estadísticas</TituloSeccion>
        <p className="text-muted-foreground text-sm">
          Los préstamos se cuentan por el día en que empieza la reserva, en hora de Lima.
        </p>
      </div>

      <PanelEstadisticas estadisticas={estadisticas} />
    </main>
  );
}
