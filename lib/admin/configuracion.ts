import { createClient } from '@/lib/supabase/server';

// Las DOS lecturas de /admin/ajustes (Task 10, D-39/Q-14 y D-54/Q-19): la fila
// unica de configuracion, y el catalogo con su buffer que
// productosDesalineados() (lib/admin/ajustes.ts) necesita para avisar antes de
// guardar un `slot_minutes` nuevo. Misma FORMA que lib/admin/dias.ts: tipo de
// fila cruda declarado a mano, funcion de traduccion, y el error se PROPAGA
// con throw en vez de devolver un valor por defecto.
//
// SIN 'use server' A PROPOSITO, mismo motivo que lib/admin/dias.ts: con 'use
// server' TODO export de un modulo se vuelve invocable desde el navegador
// como un endpoint -asi lo exige Next.js-, y las dos lecturas de aca no son
// acciones: son SELECTs sin ningun motivo para exponerse como una RPC que
// cualquiera con sesion pudiera llamar. La Server Action de esta pantalla,
// guardarAjustes(), vive en lib/admin/acciones.ts, donde 'use server' es
// correcto porque SI es una operacion que el formulario dispara.
//
// LOS DOS ERRORES SE PROPAGAN, mismo criterio que listarDiasInhabilitados(),
// reservasVivas(), listarReservas() y listarPersonal(), y aca pesa TANTO como
// en cualquiera de esas: unos ajustes que se leyeran como CEROS o VACIOS por
// un fallo de red serian indistinguibles de una configuracion real -0 dias de
// ventana, "00:00" de apertura, un buffer en cero- y el formulario los
// pintaria como si fueran los valores de verdad. El admin los editaria un
// poco y los guardaria ENCIMA de los buenos, sin ningun aviso de que lo que
// vio nunca fue lo que habia. Es el mismo riesgo que ya evita ajustesReserva()
// en lib/reservas/consultas.ts, que lee la misma tabla del lado del alumno.

export type AjustesAdmin = {
  ventanaDias: number; // `booking_window_days`
  apertura: string; // `opening_time`, "HH:MM:SS" tal cual llega
  cierre: string; // `closing_time`, "HH:MM:SS" tal cual llega
  slotMinutos: number; // `slot_minutes`
  duracionMinima: number; // `min_duration_minutes`
  limiteDiario: number; // `daily_limit_per_product`
};

// La forma medida de la fila que devuelve el `select` de abajo -mismo
// criterio que FilaDiaCruda en lib/admin/dias.ts: se declara la forma
// esperada y se usa como tipo del parametro de la traduccion, para que
// TypeScript la CONTRASTE contra lo que el `select` infiere.
type FilaAjustesCruda = {
  booking_window_days: number;
  opening_time: string;
  closing_time: string;
  slot_minutes: number;
  min_duration_minutes: number;
  daily_limit_per_product: number;
};

function filaAAjustes(fila: FilaAjustesCruda): AjustesAdmin {
  return {
    ventanaDias: fila.booking_window_days,
    apertura: fila.opening_time,
    cierre: fila.closing_time,
    slotMinutos: fila.slot_minutes,
    duracionMinima: fila.min_duration_minutes,
    limiteDiario: fila.daily_limit_per_product,
  };
}

// Las seis columnas EDITABLES de la fila unica de `app_settings` -ni `id` ni
// `updated_at`, que no se conceden a nadie: mandarlas en un PATCH da HTTP 403
// con 42501, medido el 2026-08-13-. `.eq('id', true).single()`, mismo filtro
// que ajustesReserva() en lib/reservas/consultas.ts: la fila es unica -PK
// booleana con `check (id)`-, asi que `.single()` es correcto y no una
// suposicion.
//
// LOS TIEMPOS LLEGAN CON SEGUNDOS -"08:00:00", medido el 2026-08-13-, y esta
// funcion los deja TAL CUAL: no le corresponde a una lectura decidir si el
// formulario los recorta a "HH:MM" para un `<input type="time">`. La base
// acepta las dos formas por igual -tambien medido-, asi que recortar aca no
// arreglaria nada que el guardado fuera a rechazar.
export async function leerAjustes(): Promise<AjustesAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select(
      'booking_window_days, opening_time, closing_time, slot_minutes, min_duration_minutes, daily_limit_per_product',
    )
    .eq('id', true)
    .single();

  if (error) {
    throw new Error(`leerAjustes: fallo la consulta a app_settings: ${error.message}`);
  }

  return filaAAjustes(data);
}

// La forma EXACTA que consume productosDesalineados() (lib/admin/ajustes.ts):
// `{ id, nombre, bufferMinutos }`. Se declara AQUI y no se importa de aquel
// archivo -que ademas TIENE PROHIBIDO importar nada, ver su cabecera- porque
// esta funcion es quien produce el dato, no quien lo consume.
export type ProductoConBuffer = {
  id: string;
  nombre: string;
  bufferMinutos: number;
};

type FilaProductoBufferCruda = {
  id: string;
  name: string;
  buffer_minutes: number;
};

function filaAProductoConBuffer(fila: FilaProductoBufferCruda): ProductoConBuffer {
  return {
    id: fila.id,
    nombre: fila.name,
    bufferMinutos: fila.buffer_minutes,
  };
}

// TODO el catalogo, sin filtrar por estado de sus unidades ni por sede: a
// esta pantalla solo le importa `buffer_minutes` de cada producto, para
// avisar ANTES de guardar un `slot_minutes` que desalinee alguno.
// `products_select_all` deja leer la tabla entera a cualquiera con sesion
// -hasta a `anon`, segun el comentario de listarInventario() en
// lib/admin/consultas.ts:106-108-, asi que esta lectura no abre ningun
// privilegio nuevo.
export async function productosConBuffer(): Promise<ProductoConBuffer[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, buffer_minutes')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`productosConBuffer: fallo la consulta a products: ${error.message}`);
  }

  return (data ?? []).map(filaAProductoConBuffer);
}
