import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ETIQUETAS_DIA,
  ETIQUETAS_ESTADO_PLURAL,
  ORDEN_DIAS,
  type Estadisticas,
} from "@/lib/admin/estadisticas";

type PanelEstadisticasProps = {
  estadisticas: Estadisticas;
};

// El panel de /admin/estadisticas (F9, ampliada por D-51): ocho tarjetas de
// indicador y un desglose por dia de la semana. Server Component -SIN "use
// client"- porque no tiene un solo manejador de eventos ni estado propio:
// solo pinta numeros que ya llegaron calculados desde la pagina
// (app/(personal)/admin/estadisticas/page.tsx).
export function PanelEstadisticas({ estadisticas }: PanelEstadisticasProps) {
  // ESTADO VACIO: si todavia no hay ninguna reserva registrada, se pinta
  // SOLO un aviso y nada mas -ni las ocho tarjetas ni el desglose-. El
  // motivo es que ocho ceros sin contexto se leen como un fallo de carga y
  // no como "no hay datos todavia", y produccion esta HOY exactamente en
  // ese caso: cero reservas, medido. Sin este aviso, la primera vez que un
  // admin de produccion abra esta pantalla veria ocho tarjetas en cero y
  // ningun texto que le diga si eso es lo esperado o si algo se rompio.
  if (estadisticas.registradas === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Todavía no hay ninguna reserva registrada. Los indicadores van a aparecer en cuanto exista la
        primera.
      </p>
    );
  }

  // Las seis tarjetas de estado, con su etiqueta y su texto de ayuda, como
  // DATOS y no como seis <Card> repetidas a mano en el JSX: D-51 pide que
  // los seis estados aparezcan y que su suma coincida con "Reservas
  // registradas" a simple vista, y una lista se recorre y se verifica mas
  // facil que seis bloques calcados. Las etiquetas salen de
  // ETIQUETAS_ESTADO_PLURAL y no se escriben a mano aca, para que el
  // vocabulario no se separe del que ya usa /admin/reservas.
  const tarjetasEstado: { etiqueta: string; ayuda: string; numero: number }[] = [
    {
      etiqueta: ETIQUETAS_ESTADO_PLURAL.reserved,
      ayuda: "Pedidas y todavía sin entregar.",
      numero: estadisticas.porEstado.reserved,
    },
    {
      etiqueta: ETIQUETAS_ESTADO_PLURAL.active,
      ayuda: "El equipo está fuera y todavía sin devolver.",
      numero: estadisticas.porEstado.active,
    },
    {
      etiqueta: ETIQUETAS_ESTADO_PLURAL.completed,
      ayuda: "El préstamo terminó bien.",
      numero: estadisticas.porEstado.completed,
    },
    {
      etiqueta: ETIQUETAS_ESTADO_PLURAL.cancelled,
      ayuda: "Anuladas antes de entregar.",
      numero: estadisticas.porEstado.cancelled,
    },
    {
      etiqueta: ETIQUETAS_ESTADO_PLURAL.not_picked_up,
      ayuda: "El alumno no vino a recoger el equipo.",
      numero: estadisticas.porEstado.not_picked_up,
    },
    {
      etiqueta: ETIQUETAS_ESTADO_PLURAL.not_returned,
      ayuda: "El equipo no volvió.",
      numero: estadisticas.porEstado.not_returned,
    },
  ];

  // Si hay reservas registradas pero la suma del desglose por dia da cero,
  // es que ninguna se retiro todavia -por ejemplo, una base con solo
  // reservas `reserved` sin entregar-. Sin una linea que lo explique, siete
  // ceros al lado de un total distinto de cero se leen como un error y no
  // como el estado real.
  const sumaPorDia = ORDEN_DIAS.reduce((total, dia) => total + estadisticas.porDia[dia], 0);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Las dos primeras tarjetas no salen del array de arriba porque no
            son un estado de la reserva: "Reservas registradas" es el total
            -la suma de los seis, visible de un vistazo por D-51- y
            "Prestamos esta semana" es la ventana movil de D-49, que cuenta
            un subconjunto de estados y no uno solo. */}
        <Card>
          <CardHeader>
            <CardTitle>Reservas registradas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{estadisticas.registradas}</p>
            <p className="text-muted-foreground text-sm">Todas las reservas, en cualquier estado.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Préstamos esta semana</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{estadisticas.prestamosSemana}</p>
            <p className="text-muted-foreground text-sm">
              Retirados en los últimos 7 días, hoy incluido.
            </p>
          </CardContent>
        </Card>

        {tarjetasEstado.map((tarjeta) => (
          <Card key={tarjeta.etiqueta}>
            <CardHeader>
              <CardTitle>{tarjeta.etiqueta}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{tarjeta.numero}</p>
              <p className="text-muted-foreground text-sm">{tarjeta.ayuda}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-2">
        <h2 className="font-display text-lg font-semibold">Préstamos por día de la semana</h2>

        {/* PARES ETIQUETA-VALOR, y no una frase con verbo conjugado -es
            DELIBERADO-. El proyecto ya arrastro dos veces el defecto de
            concordancia de numero -"1 activas" (ver el comentario de
            lib/admin/plural.ts) y "se entrego" con sujeto que no siempre
            concordaba (T2B)-, y un par como "Jueves" / "3" no tiene verbo
            que concuerde con nada: no hay singular ni plural que errar. Por
            eso esta lista NO usa plural() de lib/admin/plural.ts -esa
            funcion resuelve "1 activa" / "3 activas", un problema de
            concordancia que aca no existe porque no hay ningun sustantivo
            pegado al numero, solo una etiqueta al lado-. */}
        <ul className="space-y-1">
          {ORDEN_DIAS.map((dia) => (
            <li key={dia} className="flex items-center justify-between gap-4 text-sm">
              <span>{ETIQUETAS_DIA[dia]}</span>
              <span className="font-medium">{estadisticas.porDia[dia]}</span>
            </li>
          ))}
        </ul>

        {sumaPorDia === 0 && (
          <p className="text-muted-foreground text-sm">Todavía no se retiró ninguna reserva.</p>
        )}
      </section>
    </div>
  );
}
