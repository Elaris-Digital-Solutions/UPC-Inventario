import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TituloSeccion } from "@/components/antetitulo";
import { coberturaDeLaSemana, type FormaDelDia } from "@/lib/admin/cobertura";
import { DIAS_SEMANA, etiquetaDia } from "@/lib/admin/semana";

// D-76: "cerrado" no es "sin operador", y esta es la pantalla donde se corrige.
//
// EL FALLO ES DELIBERADO Y ESTE PANEL ES SU CONTRAPESO. Con D-74, una sede sin
// turnos no muestra ni un bloque al alumno: es correcto y es indistinguible de
// un error de carga. Sin este panel, la pantalla vacia se lee como "hoy no hay
// nada" y nadie pregunta.
//
// SERVER COMPONENT: no tiene estado ni escucha nada, asi que no lleva "use
// client". El calculo es puro y ya viene hecho de lib/admin/cobertura.ts.

type AvisoSinOperadorProps = {
  sedes: { id: string; nombre: string; dias: Record<number, { apertura: string; cierre: string } | null> }[];
  turnos: { campusId: string; weekday: number; inicio: string; fin: string }[];
  // La UNICA lectura del reloj de la pagina baja por props (regla M-7), en
  // YYYY-MM-DD de Lima. Calcularlo aqui dentro haria que este componente no se
  // pudiera probar en la frontera de medianoche, que es donde importa.
  hoy: string;
  // `booking_window_days` (D-3), no un 7 escrito a mano: si la ventana crece, el
  // panel tiene que crecer con ella o avisaria tarde de los ultimos dias.
  ventanaDias: number;
};

const DISTINTIVO: Record<FormaDelDia, { texto: string; variante: "secondary" | "outline" | "destructive" }> = {
  cerrado: { texto: "Cerrado", variante: "outline" },
  "sin-operador": { texto: "Sin operador", variante: "destructive" },
  parcial: { texto: "Parcial", variante: "destructive" },
  cubierto: { texto: "Cubierto", variante: "secondary" },
};

function horasYMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function AvisoSinOperador({ sedes, turnos, hoy, ventanaDias }: AvisoSinOperadorProps) {
  const cobertura = coberturaDeLaSemana(sedes, turnos, hoy, ventanaDias);

  // Solo cuentan como aviso las dos formas que son un HUECO. "Cerrado" no entra:
  // es una decision del admin, no un descuido, y meterlo en el recuento haria que
  // el aviso saltara siempre en una sede que cierra los domingos.
  const huecos = cobertura.filter((d) => d.forma === "sin-operador" || d.forma === "parcial");

  const fechas = [...new Set(cobertura.map((d) => d.fecha))];

  return (
    <section className="space-y-3">
      <TituloSeccion>Los próximos {ventanaDias} días</TituloSeccion>

      {huecos.length === 0 ? (
        <p role="status" className="bg-muted rounded-lg px-4 py-3 text-sm">
          Todos los días con horario declarado tienen a alguien detrás. Los días marcados como
          cerrados no ofrecen franjas, y eso es lo esperado.
        </p>
      ) : (
        <p role="alert" className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
          Hay {huecos.length} día(s) de sede con horario declarado y sin nadie que lo cubra del todo.
          El alumno no ve ninguna franja en esos tramos, y desde su pantalla eso se parece a que no
          queda cupo. <strong>Cerrado no es lo mismo que sin operador:</strong> abajo se distinguen.
        </p>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Día</TableHead>
            {sedes.map((s) => (
              <TableHead key={s.id}>{s.nombre}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {fechas.map((fecha) => {
            const delDia = cobertura.filter((d) => d.fecha === fecha);
            const weekday = delDia[0]?.weekday ?? 0;
            const nombre = DIAS_SEMANA.find((d) => d.weekday === weekday)?.nombre;

            return (
              <TableRow key={fecha}>
                <TableCell>
                  {nombre ? etiquetaDia(nombre) : ""} <span className="text-muted-foreground">{fecha}</span>
                </TableCell>
                {sedes.map((sede) => {
                  const celda = delDia.find((d) => d.campusId === sede.id);
                  if (!celda) return <TableCell key={sede.id}>—</TableCell>;
                  const { texto, variante } = DISTINTIVO[celda.forma];

                  return (
                    <TableCell key={sede.id}>
                      <Badge variant={variante}>{texto}</Badge>
                      {celda.forma === "parcial" && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {horasYMinutos(celda.minutosDescubiertos)} sin cubrir
                        </span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </section>
  );
}
