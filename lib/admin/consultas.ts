import { imagenPrincipal } from '@/lib/imagenes/principal';
import { createClient } from '@/lib/supabase/server';

import type { Database } from '@/lib/database.types';

// Las lecturas del inventario para /admin/* (F7). Sigue la FORMA del resto de
// esta capa: tipo de fila declarado -nunca `.returns<>()`, que es un `as` con
// otro nombre (D-26)- y el error crudo hacia arriba.
//
// UN EMBED LLEGA COMO ARRAY O COMO OBJETO SEGUN DONDE VIVA LA FK: en la tabla
// embebida -uno a muchos, array- o en la que consulta -muchos a uno, objeto-.
// Que `products` embeba a sus hijos NO se dio por hecho: `product_availability`
// no embebe en ninguna direccion. Ver COMPORTAMIENTO_MEDIDO.md §1.3.

// Del esquema generado y NO una union escrita a mano (D-26).
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
  // Unidades sin `asset_code`. NO es decorativo: en el catalogo real son 38 de
  // 92, y todas llevan un `unit_code` con prefijo `AUTO-` que el sistema viejo
  // genero desde el nombre. Nadie puede identificarlas en un estante, asi que
  // verlas es VISIBILIDAD.
  unidadesSinCodigo: number;
  // ANTES ERA EL RECUENTO de imagenes, y la F3-T3 lo SUSTITUYE en vez de añadir
  // un campo al lado: llevar los dos obligaria a cada pantalla a decidir cual
  // mira. `| null` no es defensivo -el seed deja 2 de sus 4 productos sin
  // imagen, y esa es la mitad que prueba que el hueco se pinta bien-.
  imagenUrl: string | null;
};

type FilaCruda = {
  id: string;
  name: string;
  category: string | null;
  max_duration_hours: number;
  buffer_minutes: number;
  inventory_units: { status: EstadoUnidad; asset_code: string | null }[];
  // Las TRES columnas que decide `imagenPrincipal()`, y ni una mas. `format` y
  // `cloudinary_public_id` no entran porque no pueden decidir nada: son NULL en
  // las 34 filas de produccion.
  product_images: { secure_url: string; is_main: boolean; sort_order: number }[];
};

// Los cuatro conteos se calculan ACA y no con `count` de PostgREST: son cuatro
// agregados sobre la MISMA coleccion, y pedirselos al motor serian cuatro
// consultas o una vista nueva, que es SQL, y D-41 lo deja fuera.
//
// EL LIMITE SE DICE POR DELANTE en vez de descubrirlo tarde: con 34 productos y
// 92 unidades esto es trivial; con decenas de miles hay que mover los agregados
// a una vista. No es deuda oculta si esta escrita.
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
    // NO se reimplementa la regla: la decide imagenPrincipal(), que vive aparte
    // para que las tres capas que la necesitan no tengan copias que diverjan.
    imagenUrl: imagenPrincipal(fila.product_images),
  };
}

// El listado completo para /admin/inventario.
//
// SIN filtro de estado ni de sede, al reves que el catalogo del alumno: el admin
// tiene que ver TODO, incluidas las unidades en `maintenance` y `retired`, que
// son justo las que necesitan atencion. Un listado de administracion que esconde
// filas es un listado que miente.
export async function listarInventario(): Promise<FilaInventario[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      'id,name,category,max_duration_hours,buffer_minutes,inventory_units(status,asset_code),product_images(secure_url,is_main,sort_order)',
    )
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(filaAInventario);
}

export type UnidadDetalle = {
  id: string;
  unitCode: string;
  assetCode: string | null;
  estado: EstadoUnidad;
  sede: string;
};

// `cloudinaryPublicId` es `| null` y NO por precaucion: las 34 imagenes del
// catalogo real lo tienen en NULL, asi que estan en Cloudinary y nadie puede
// identificarlas alli. Las que suba esta pantalla si lo guardan, y la galeria
// convive con las dos poblaciones.
export type ImagenProducto = {
  id: string;
  url: string;
  cloudinaryPublicId: string | null;
  esPrincipal: boolean;
  orden: number;
};

export type ProductoDetalle = {
  id: string;
  nombre: string;
  categoria: string | null;
  descripcion: string | null;
  maxDuracionHoras: number;
  bufferMinutos: number;
  unidades: UnidadDetalle[];
  imagenes: ImagenProducto[];
};

// Devuelve `null` cuando no hay fila y la pantalla llama a notFound(). NO se
// lanza: un id que no existe es una URL equivocada, no un fallo del sistema.
//
// `.maybeSingle()` y no `.single()`: `single()` convierte "cero filas" en un
// ERROR, que es justo lo que no se quiere.
export async function leerProducto(id: string): Promise<ProductoDetalle | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      'id,name,category,description,max_duration_hours,buffer_minutes,inventory_units(id,unit_code,asset_code,status,campuses(name)),product_images(id,secure_url,cloudinary_public_id,is_main,sort_order)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    // Un id MALFORMADO llega como `22P02`: es la otra mitad del mismo caso, no
    // un fallo del sistema. Se trata como "no existe".
    if (error.code === '22P02') {
      return null;
    }
    throw new Error(error.message);
  }

  if (data === null) {
    return null;
  }

  return {
    id: data.id,
    nombre: data.name,
    categoria: data.category,
    descripcion: data.description,
    maxDuracionHoras: data.max_duration_hours,
    bufferMinutos: data.buffer_minutes,
    unidades: data.inventory_units
      .map((u) => ({
        id: u.id,
        unitCode: u.unit_code,
        assetCode: u.asset_code,
        estado: u.status,
        sede: u.campuses?.name ?? '—',
      }))
      // Ordenadas ACA y no en el `select`: PostgREST no ordena una tabla
      // embebida por una columna suya, y son pocas unidades por producto.
      .sort((a, b) => a.unitCode.localeCompare(b.unitCode, 'es')),
    imagenes: data.product_images
      .map((i) => ({
        id: i.id,
        url: i.secure_url,
        cloudinaryPublicId: i.cloudinary_public_id,
        esPrincipal: i.is_main,
        orden: i.sort_order,
      }))
      // Con el `id` como desempate: la base permite dos imagenes con el mismo
      // `sort_order`, y sin desempate la galeria se "moveria sola" al recargar.
      .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id)),
  };
}

// Las categorias que YA EXISTEN, para el desplegable del alta (D-42).
//
// F7 manda "14 predefinidas + las ya existentes", y en el catalogo real hay
// DIEZ: una lista fija de catorce meteria cuatro opciones sin un solo producto
// detras. Leyendolas de la base no hay lista que se quede vieja. Es la regla que
// el seed ya enseño por las malas con `featured`: el codigo no debe afirmar
// sobre los datos lo que solo los datos pueden decir.
//
// SIN `distinct`, que PostgREST no ofrece sobre una columna suelta: se deduplica
// aca. Con 34 productos es gratis; con decenas de miles haria falta una vista.
export async function listarCategorias(): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('products').select('category');

  if (error) {
    throw new Error(error.message);
  }

  const vistas = new Set<string>();
  for (const fila of data ?? []) {
    // `category` es NULLABLE, y `null` no es una categoria llamada "null".
    if (fila.category !== null && fila.category.trim() !== '') {
      vistas.add(fila.category);
    }
  }

  // `localeCompare` y no el orden binario: con tildes y mayusculas, el binario
  // pone "Camaras" y "Ámbar" en sitios que nadie espera.
  return [...vistas].sort((a, b) => a.localeCompare(b, 'es'));
}

// Las sedes, leidas igual que las categorias y por el mismo motivo.
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

// `slot_minutes`, para que el alta ofrezca solo buffers multiplos (Q-14).
//
// `app_settings` es una fila unica -PK booleana con `check (id)`-, asi que
// `.single()` es correcto y no una suposicion: no puede haber dos.
export async function leerSlotMinutes(): Promise<number> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('app_settings').select('slot_minutes').single();

  if (error) {
    throw new Error(error.message);
  }

  return data.slot_minutes;
}
