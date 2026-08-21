import { sumarDias } from '../reservas/rejilla';

// D-76: "cerrado" no es "sin operador", y la pantalla tiene que poder decirlo.
//
// EL FALLO QUE ESTO EXISTE PARA HACER VISIBLE, y que el diseño de la fase pone
// por escrito como algo DELIBERADO: con D-74, una sede sin turnos cargados no
// muestra ni un bloque. Es correcto, y es indistinguible de un error de carga.
// Sin este panel, la pantalla vacia se lee como "hoy no hay nada" y nadie
// pregunta por que.
//
// PURA Y SIN RED, mismo espiritu que lib/admin/filtros.ts y lib/admin/ajustes.ts,
// y con IMPORTS RELATIVOS: Vitest no resuelve el alias `@/` -vitest.config.mts no
// declara ninguno-, asi que un modulo probado no puede usarlo. Por eso esto no
// vive en lib/admin/semana.ts, que si importa con `@/`.

// Las TRES formas de §5.3 del diseño, mas la cuarta que es "no pasa nada". Se
// nombran las cuatro y no solo las que avisan: un dia CUBIERTO tiene que poder
// distinguirse de un dia que no se pudo calcular.
export type FormaDelDia =
  | 'cerrado' // Sin fila en campus_hours. Es una decision del admin.
  | 'sin-operador' // Hay horario y no lo cubre ningun turno. Es un hueco.
  | 'parcial' // Lo cubre a medias: el resto del dia si se ofrece.
  | 'cubierto';

export type DiaDeCobertura = {
  fecha: string; // YYYY-MM-DD
  weekday: number;
  campusId: string;
  forma: FormaDelDia;
  // Minutos del horario de la sede que no cubre ningun turno. Cero salvo en
  // 'parcial'; en 'sin-operador' seria el dia entero, y decirlo alli seria
  // repetir con un numero lo que la forma ya dice con una palabra.
  minutosDescubiertos: number;
};

type HorarioDeSede = { apertura: string; cierre: string } | null;

type SedeParaCobertura = {
  id: string;
  dias: Record<number, HorarioDeSede>;
};

type TurnoParaCobertura = {
  campusId: string;
  weekday: number;
  inicio: string;
  fin: string;
};

// "HH:MM" o "HH:MM:SS" a minutos desde medianoche. Los segundos se ignoran a
// proposito: `campus_hours` y `staff_shifts` son `time` sin fraccion y ninguna
// pantalla los ofrece, asi que un segundo suelto seria un dato que nadie pudo
// escribir.
function aMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}

// El dia de la semana de una fecha CIVIL, con 0 = domingo, que es la convencion
// de `campus_hours.weekday`.
//
// Se construye en UTC A PROPOSITO y no con `new Date('2026-08-21')`: esa forma
// tambien parsea como UTC, pero `getDay()` la devolveria en la zona del
// navegador, y en Lima -UTC-5- eso corre la fecha un dia hacia atras. Aqui no
// hay instante ninguno que convertir: una fecha civil cae en un dia de la semana
// y punto.
function weekdayDe(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();
}

/**
 * Cuantos minutos del tramo [desde, hasta) no cubre ningun turno.
 *
 * LOS TURNOS SE UNEN, no se cuentan por separado (D-90): dos que se solapan
 * cubren su union, y contarlos uno a uno daria mas minutos cubiertos que los que
 * hay. Se ordenan y se recorre una vez.
 *
 * Un turno que se pase del techo se RECORTA y no lo levanta, que es la lectura
 * literal de D-74.
 */
function minutosSinCubrir(desde: number, hasta: number, turnos: TurnoParaCobertura[]): number {
  const tramos = turnos
    .map((t) => ({
      inicio: Math.max(desde, aMinutos(t.inicio)),
      fin: Math.min(hasta, aMinutos(t.fin)),
    }))
    .filter((t) => t.fin > t.inicio)
    .sort((a, b) => a.inicio - b.inicio);

  let descubierto = 0;
  let cursor = desde;

  for (const tramo of tramos) {
    if (tramo.inicio > cursor) {
      descubierto += tramo.inicio - cursor;
    }
    cursor = Math.max(cursor, tramo.fin);
  }

  return descubierto + Math.max(0, hasta - cursor);
}

/**
 * La cobertura de cada sede en los proximos `dias` dias, empezando por `hoy`.
 *
 * `dias` sale de `app_settings.booking_window_days` (D-3) y NO de un 7 escrito a
 * mano: la ventana movil es configurable, y un panel que mirase siete dias
 * mientras el alumno puede reservar a diez avisaria tarde de los tres ultimos.
 */
export function coberturaDeLaSemana(
  sedes: SedeParaCobertura[],
  turnos: TurnoParaCobertura[],
  hoy: string,
  dias: number,
): DiaDeCobertura[] {
  const resultado: DiaDeCobertura[] = [];

  for (let i = 0; i < dias; i += 1) {
    const fecha = sumarDias(hoy, i);
    const weekday = weekdayDe(fecha);

    for (const sede of sedes) {
      const horario = sede.dias[weekday] ?? null;

      if (horario === null) {
        resultado.push({ fecha, weekday, campusId: sede.id, forma: 'cerrado', minutosDescubiertos: 0 });
        continue;
      }

      const delDia = turnos.filter((t) => t.campusId === sede.id && t.weekday === weekday);

      if (delDia.length === 0) {
        resultado.push({
          fecha,
          weekday,
          campusId: sede.id,
          forma: 'sin-operador',
          minutosDescubiertos: 0,
        });
        continue;
      }

      const descubiertos = minutosSinCubrir(
        aMinutos(horario.apertura),
        aMinutos(horario.cierre),
        delDia,
      );

      resultado.push({
        fecha,
        weekday,
        campusId: sede.id,
        forma: descubiertos === 0 ? 'cubierto' : 'parcial',
        minutosDescubiertos: descubiertos,
      });
    }
  }

  return resultado;
}
