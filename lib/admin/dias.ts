import { createClient } from '@/lib/supabase/server';

import type { EstadoReserva } from '@/lib/reservas/consultas';

// Las DOS lecturas de /admin/dias (F8, corregida por D-40): la tabla de dias
// inhabilitados y las reservas "vivas" -- reserved y active -- que
// particionarPorDia() (lib/admin/filtros.ts) usa para calcular cuantas se
// cancelarian y cuantos prestamos ya entregados siguen vigentes en el dia que
// el admin elija. Misma FORMA que lib/admin/reservas.ts: tipo de fila medido
// y declarado, funcion de traduccion, y el error se PROPAGA con throw en vez
// de devolver un array vacio.
//
// SIN 'use server' A PROPOSITO, y esto contradice a proposito la "Estructura
// de archivos" del plan (MIGRATION_DOCS/PLANES/FASE_2_TANDA_3B.md:610), que
// dice "dias.ts -- Server Actions de /admin/dias". Con 'use server' TODO
// export de un modulo se vuelve invocable desde el navegador como un
// endpoint -- asi lo exige Next.js --, y las dos lecturas de aca no son
// acciones: son SELECTs sin ningun motivo para exponerse como una RPC que
// cualquiera con sesion pudiera llamar. Las Server Actions de esta pantalla
// (inhabilitarDia, habilitarDia) viven en lib/admin/acciones.ts, donde ya
// estan las otras once y donde 'use server' es correcto: cada una de ellas SI
// es una operacion que el formulario dispara.
//
// El error se PROPAGA en las dos funciones, mismo criterio que
// listarReservas(), y aca pesa MAS: produccion tiene DOS filas en
// disabled_days -- medido el 2026-08-10 -- y cero reservas, asi que un array
// vacio por un fallo de red o de RLS se leeria exactamente igual que "no hay
// nada que mostrar", que ademas casi coincide con el estado real. El admin no
// podria distinguir una pantalla rota de una base casi vacia, y en el caso de
// reservasVivas() el numero equivocado es el que la pantalla usa para decidir
// CUANTAS reservas va a cancelar.

export type DiaInhabilitadoAdmin = {
  id: string;
  fecha: string; // `date`, YYYY-MM-DD tal cual llega
  // D-46: el motivo es obligatorio para lo que se ESCRIBE desde hoy, pero el
  // tipo sigue admitiendo `null` porque los dos dias que hay hoy en
  // produccion -medidos el 2026-08-10- tienen `reason` en NULL. Un tipo que
  // exigiera `string` aca dejaria de poder LEER esas dos filas.
  motivo: string | null;
  registro: string; // `created_at` en ISO, mismo nombre de campo que usa ReservaAdmin para el suyo
};

// La forma medida de la fila que devuelve el `select` de abajo -- mismo
// criterio que FilaCruda en lib/admin/reservas.ts: se declara la forma
// esperada y se usa como tipo del parametro de la traduccion, para que
// TypeScript la CONTRASTE contra lo que el `select` infiere.
type FilaDiaCruda = {
  id: string;
  date: string;
  reason: string | null;
  created_at: string;
};

function filaADiaInhabilitado(fila: FilaDiaCruda): DiaInhabilitadoAdmin {
  return {
    id: fila.id,
    fecha: fila.date,
    motivo: fila.reason,
    registro: fila.created_at,
  };
}

// Toda la tabla, para /admin/dias. SIN filtro de rango, al reves que
// diasInhabilitados() en lib/reservas/consultas.ts, que si acota entre
// `desde` y `hasta` porque esa pantalla solo pinta los dias que YA va a
// ofrecer el calendario del alumno. Aca la pantalla es la administracion de
// la tabla ENTERA: un dia pasado sigue teniendo que verse, marcado como
// pasado (F8: "los pasados quedan en gris"), y un filtro de rango lo
// esconderia.
export async function listarDiasInhabilitados(): Promise<DiaInhabilitadoAdmin[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('disabled_days')
    .select('id, date, reason, created_at')
    .order('date', { ascending: false });

  if (error) {
    throw new Error(`listarDiasInhabilitados: fallo la consulta a disabled_days: ${error.message}`);
  }

  return (data ?? []).map(filaADiaInhabilitado);
}

// La forma que particionarPorDia() (lib/admin/filtros.ts) necesita: exactamente
// los tres campos de ReservaDelDia, ya con nombres traducidos. Se declara AQUI
// -- y no se importa el tipo de filtros.ts -- porque esta funcion es quien
// produce el dato, no quien lo consume; el consumo estructural es cosa del
// generico `T extends ReservaDelDia` del otro archivo.
export type ReservaViva = {
  id: string;
  inicio: string; // `start_at`, ISO tal cual llega
  estado: EstadoReserva;
};

type FilaReservaVivaCruda = {
  id: string;
  start_at: string;
  status: EstadoReserva;
};

function filaAReservaViva(fila: FilaReservaVivaCruda): ReservaViva {
  return {
    id: fila.id,
    inicio: fila.start_at,
    estado: fila.status,
  };
}

// Las reservas `reserved` y `active`, para que la pantalla calcule -- con
// particionarPorDia() -- cuantas se cancelarian y cuantos prestamos ya
// entregados siguen vigentes en el dia elegido. SOLO estas tres columnas: la
// pantalla no pinta ni producto ni alumno de esta lista, solo cuenta.
//
// SIN FILTRO DE FECHA en la consulta, con su limite dicho por delante, mismo
// criterio que listarReservas(): produccion tiene CERO reservas hoy y la
// escala esperada es de decenas, asi que traer todas las vivas y particionar
// en memoria es correcto y barato. La alternativa -- filtrar por fecha en el
// servidor -- exigiria convertir el dia civil YYYY-MM-DD que elige el admin en
// un rango de instantes UTC, que es EXACTAMENTE lo que particionarPorDia()
// evita al comparar con fechaEnLima() en vez de con un rango -- ver el
// comentario de esa funcion en lib/admin/filtros.ts, que cita por que
// fechaEnLima() usa Intl y no una resta de horas escrita a mano.
export async function reservasVivas(): Promise<ReservaViva[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_reservations')
    .select('id, start_at, status')
    .in('status', ['reserved', 'active'])
    .order('start_at');

  if (error) {
    throw new Error(`reservasVivas: fallo la consulta a inventory_reservations: ${error.message}`);
  }

  return (data ?? []).map(filaAReservaViva);
}
