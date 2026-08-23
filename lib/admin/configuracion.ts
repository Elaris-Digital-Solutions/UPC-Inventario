import { createClient } from '@/lib/supabase/server';

// Las DOS lecturas de /admin/ajustes (D-39/Q-14 y D-54/Q-19). Misma FORMA que
// lib/admin/dias.ts, y SIN 'use server' por el mismo motivo: son SELECTs.
//
// LOS DOS ERRORES SE PROPAGAN, y aca pesa tanto como en cualquier otra pantalla:
// unos ajustes leidos como CEROS por un fallo de red serian indistinguibles de
// una configuracion real -0 dias de ventana, bloque de cero minutos-, el
// formulario los pintaria como los valores de verdad y el admin los guardaria
// ENCIMA de los buenos sin ningun aviso.

export type AjustesAdmin = {
  ventanaDias: number; // `booking_window_days`
  slotMinutos: number; // `slot_minutes`
  duracionMinima: number; // `min_duration_minutes`
  limiteDiario: number; // `daily_limit_per_product`
  margenCancelacion: number; // `min_cancel_minutes`, M-12
};

type FilaAjustesCruda = {
  booking_window_days: number;
  slot_minutes: number;
  min_duration_minutes: number;
  daily_limit_per_product: number;
  min_cancel_minutes: number;
};

function filaAAjustes(fila: FilaAjustesCruda): AjustesAdmin {
  return {
    ventanaDias: fila.booking_window_days,
    slotMinutos: fila.slot_minutes,
    duracionMinima: fila.min_duration_minutes,
    limiteDiario: fila.daily_limit_per_product,
    margenCancelacion: fila.min_cancel_minutes,
  };
}

// Las CINCO columnas EDITABLES: ni `id` ni `updated_at`, que no se conceden a
// nadie y dan 403/42501 si se mandan.
//
// ERAN SIETE (D-91): `opening_time` y `closing_time` se fueron porque el horario
// dejo de ser global y vive en `campus_hours` por sede y por dia (D-74). Con
// ellas se fue el unico dato `time` que esta lectura devolvia.
//
// `.single()` es correcto y no una suposicion: la fila es unica, con PK booleana
// y `check (id)`.
export async function leerAjustes(): Promise<AjustesAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .select(
      'booking_window_days, slot_minutes, min_duration_minutes, daily_limit_per_product, min_cancel_minutes',
    )
    .eq('id', true)
    .single();

  if (error) {
    throw new Error(`leerAjustes: fallo la consulta a app_settings: ${error.message}`);
  }

  return filaAAjustes(data);
}

// La forma EXACTA que consume productosDesalineados(). Se declara AQUI y no se
// importa de lib/admin/ajustes.ts -que ademas tiene prohibido importar nada-
// porque esta funcion es quien PRODUCE el dato.
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

// TODO el catalogo, sin filtrar: a esta pantalla solo le importa
// `buffer_minutes`, para avisar ANTES de guardar un `slot_minutes` que desalinee
// alguno. `products_select_all` ya deja leer la tabla a cualquiera, asi que esta
// lectura no abre ningun privilegio nuevo.
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
