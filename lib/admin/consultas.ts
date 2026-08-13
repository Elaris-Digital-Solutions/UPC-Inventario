import { createClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// Las lecturas del inventario para /admin/* (F7 de ESPECIFICACION_FUNCIONAL.md).
// Sigue la FORMA de lib/mostrador/consultas.ts: tipo de fila medido y
// declarado, funcion de traduccion, y el error crudo hacia arriba.

// El enum del estado de una unidad, del esquema generado y NO una union
// escrita a mano (D-26). Si algun dia se agrega un cuarto estado, el
// typecheck lo dice solo.
export type EstadoUnidad = Database['public']['Enums']['unit_status'];

export type FilaInventario = {
  id: string;
  nombre: string;
  categoria: string | null;
  maxDuracionHoras: number;
  bufferMinutos: number;
  unidadesActive: number;
  unidadesMaintenance: number;
  unidadesRetired: number;
  // Unidades sin `asset_code`. NO es un conteo decorativo: en el catalogo real
  // -consultado el 2026-08-12- son 38 de 92, el 41 % del inventario, y todas
  // llevan un `unit_code` con prefijo `AUTO-` que el sistema viejo genero
  // desde el nombre del producto (`AUTO-mo-uh40-4k-60hz-hdmi-8-01`). La
  // correlacion es PERFECTA en los dos sentidos: no hay ninguna `AUTO-` con
  // asset_code ni ninguna no-`AUTO-` sin el. Nadie puede identificar esas
  // unidades en un estante, asi que verlas es VISIBILIDAD, no estetica.
  unidadesSinCodigo: number;
  imagenes: number;
};

// La forma MEDIDA de la fila que devuelve el embed. Misma tecnica que
// FilaMostrador en lib/mostrador/consultas.ts y FilaReserva en
// lib/reservas/consultas.ts: se declara la forma esperada y se usa como tipo
// del parametro de filaAInventario(), para que TypeScript la CONTRASTE contra
// lo que el `select` infiere, en vez de imponerla con `.returns<>()`, que
// seria un `as` con otro nombre. Si el select cambia y este tipo no, el
// typecheck falla en vez de mentir en silencio.
//
// `inventory_units` y `product_images` llegan como ARRAY -al reves que
// `products` o `campuses` en lib/mostrador/consultas.ts, que llegan como
// objeto-. La diferencia no es un capricho de PostgREST: ahi la FK vive en la
// tabla que consulta -muchos a uno-, y aca vive en la tabla embebida -uno a
// muchos-.
//
// MEDIDO EL 2026-08-12, y hacia falta medirlo: la T2A ya se topo con que
// PostgREST NO embebe `product_availability` desde `products` en ninguna de
// las dos direcciones (PGRST200), asi que "products embebe a sus hijos" NO se
// podia dar por hecho. Se probo con un JWT de admin firmado a mano contra el
// stack local:
//
//   GET /rest/v1/products?select=id,name,category,max_duration_hours,
//       buffer_minutes,inventory_units(status,asset_code),product_images(id)
//   -> HTTP 200 con las dos colecciones pobladas.
//
// Por eso esto es UNA sola consulta y no dos con agrupacion en TypeScript,
// que era el otro desenlace que el plan dejo escrito.
type FilaCruda = {
  id: string;
  name: string;
  category: string | null;
  max_duration_hours: number;
  buffer_minutes: number;
  inventory_units: { status: EstadoUnidad; asset_code: string | null }[];
  product_images: { id: string }[];
};

// Los cuatro conteos se calculan ACA y no con `count` de PostgREST: son cuatro
// agregados distintos sobre la MISMA coleccion -tres por estado y uno por
// `asset_code` nulo-, y pedirselos al motor serian cuatro consultas o una
// vista nueva. Una vista es SQL, y D-41 deja el SQL fuera de esta tanda.
//
// El limite se dice por delante en vez de descubrirlo tarde: con 34 productos
// y 92 unidades esto es trivial, y si algun dia el inventario llega a decenas
// de miles de unidades hay que mover los agregados a una vista. No es deuda
// oculta si esta escrita.
function filaAInventario(fila: FilaCruda): FilaInventario {
  const unidades = fila.inventory_units;

  return {
    id: fila.id,
    nombre: fila.name,
    categoria: fila.category,
    maxDuracionHoras: fila.max_duration_hours,
    bufferMinutos: fila.buffer_minutes,
    unidadesActive: unidades.filter((u) => u.status === 'active').length,
    unidadesMaintenance: unidades.filter((u) => u.status === 'maintenance').length,
    unidadesRetired: unidades.filter((u) => u.status === 'retired').length,
    unidadesSinCodigo: unidades.filter((u) => u.asset_code === null).length,
    imagenes: fila.product_images.length,
  };
}

// El listado completo del catalogo para /admin/inventario.
//
// SIN filtro de estado ni de sede, a proposito y al reves que
// lib/catalogo/consultas.ts: el alumno ve lo que puede reservar, y el admin
// tiene que ver TODO lo que existe -incluidas las unidades en `maintenance` y
// `retired`, que son justo las que necesitan atencion-. Un listado de
// administracion que esconde filas es un listado que miente.
//
// El error se devuelve crudo hacia arriba, mismo criterio que el resto del
// proyecto: esta consulta no tiene ningun rechazo ALCANZABLE navegando -el
// layout ya exigio rol admin, y products_select_all deja leer a cualquiera,
// hasta a `anon`-, asi que si algo falla aca es un DEFECTO en otro sitio y el
// mensaje del motor lo describe mejor que uno bonito que lo disimularia.
export async function listarInventario(): Promise<FilaInventario[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      'id,name,category,max_duration_hours,buffer_minutes,inventory_units(status,asset_code),product_images(id)',
    )
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(filaAInventario);
}

// Las categorias que YA EXISTEN en el catalogo, para el desplegable del alta.
//
// D-42, y es la correccion directa de un error que este proyecto ya pago tres
// veces. F7 manda "14 predefinidas + las ya existentes", y en el catalogo real
// -consultado el 2026-08-12- hay DIEZ: Tablets, Cables, Celulares, VR,
// Camaras, Perifericos, Audio, Proyectores, Otros y Monitores/TV. Una lista
// fija de catorce metería cuatro opciones sin un solo producto detras, y
// habria que recuperarla del tag legacy/vite-final.
//
// Leyendolas de la base no hay lista que se quede vieja: si mañana hay doce,
// salen doce. Es la misma regla que el seed enseño por las malas -- `featured`
// en la 2A, las imagenes en la 2B, los buffers en la 3A --: el codigo no debe
// afirmar sobre los datos lo que solo los datos pueden decir.
//
// SIN `distinct` de PostgREST, que no lo ofrece sobre una columna suelta: se
// leen las categorias y se deduplican aca. Con 34 productos es gratis, y el
// limite se dice por delante -- con decenas de miles habria que pedirle al
// motor una vista.
export async function listarCategorias(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('products').select('category');

  if (error) {
    throw new Error(error.message);
  }

  const vistas = new Set<string>();
  for (const fila of data ?? []) {
    // `category` es NULLABLE: un producto sin categoria no aporta ninguna
    // opcion al desplegable, y `null` no es una categoria llamada "null".
    if (fila.category !== null && fila.category.trim() !== '') {
      vistas.add(fila.category);
    }
  }

  // `localeCompare` y no el orden por defecto: con tildes y mayusculas, el
  // orden binario pone "Camaras" y "Ámbar" en sitios que nadie espera.
  return [...vistas].sort((a, b) => a.localeCompare(b, 'es'));
}

// Las sedes, para el desplegable de cada unidad. Son dos en produccion
// -- San Miguel y Monterrico, 46 unidades cada una --, y se leen igual que las
// categorias en vez de escribirlas a mano por el mismo motivo.
export async function listarSedes(): Promise<{ id: string; nombre: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campuses')
    .select('id,name')
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((c) => ({ id: c.id, nombre: c.name }));
}

// La fila de configuracion, de la que el formulario de alta necesita
// `slot_minutes` para ofrecer solo buffers multiplos (Q-14, primera mitad).
//
// `app_settings` es una fila unica -- clave primaria booleana con
// `check (id)`, supabase/migrations/20260806002459_reservation_settings.sql:34-50 --,
// asi que `.single()` es correcto y no una suposicion: no puede haber dos.
export async function leerSlotMinutes(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('app_settings').select('slot_minutes').single();

  if (error) {
    throw new Error(error.message);
  }

  return data.slot_minutes;
}
