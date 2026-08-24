import { imagenPrincipal } from '@/lib/imagenes/principal';
import { createClient } from '@/lib/supabase/server';

// DOS REGLAS QUE VALEN PARA TODO EL ARCHIVO.
//
// 1. NADA DE `.returns<>()`: es un `as` con otro nombre. SUSTITUYE el tipo
//    inferido en vez de comprobarlo, asi que un `select` que cambie sin tocar el
//    tipo compilaria igual, afirmando la forma vieja. Es el modo de fallo contra
//    el que se escribio D-26 -"un tipo desactualizado no rompe la compilacion:
//    miente en silencio"-.
// 2. UN FALLO NUNCA SE TRAGA EN SILENCIO. Estas consultas degradan a lista vacia
//    -una vitrina vacia es preferible a una pantalla rota-, pero siempre con
//    `console.error`: sin el, un 401 de RLS y "no hay productos" se ven igual.

// La vitrina NO toca `product_availability` (D-21), y no es solo diseño: como
// anonimo esa vista devuelve HTTP 401, porque D-18 le revoco el SELECT. No es
// que la vitrina decida no enseñar stock, es que NO PUEDE, y por eso el fallo
// seria ruidoso si alguien añadiera ese embed.
export type ProductoVitrina = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  imagenUrl: string | null;
};

// Ordenada por `sort_order` y NO por `featured`: esa columna vale `false` en los
// 34 productos de produccion, asi que filtrar o priorizar por ella dejaria la
// vitrina VACIA en el sitio real y llena en local, con todos los checks en verde.
// Ver COMPORTAMIENTO_MEDIDO.md §7.
export async function productosVitrina(limite: number): Promise<ProductoVitrina[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, description, product_images(secure_url, is_main, sort_order)')
    .order('sort_order')
    .limit(limite);

  if (error) {
    console.error('productosVitrina: fallo la consulta a products', error.message);
    return [];
  }

  return data.map((producto) => ({
    id: producto.id,
    name: producto.name,
    category: producto.category,
    description: producto.description,
    imagenUrl: imagenPrincipal(producto.product_images),
  }));
}

export type Sede = {
  id: string;
  name: string;
  // D-77. NULLABLE igual que la columna: una sede puede darse de alta antes de
  // saber en que salon se devuelve, y ahi la ficha no promete nada.
  salonDevolucion: string | null;
};

// Ordenada por `name` y no por el orden de insercion: sin un `order()` explicito
// Postgres no promete ningun orden estable entre llamadas, y "la primera activa"
// -la que usa el catalogo sin `?sede=`- tiene que ser SIEMPRE la misma fila.
export async function sedesActivas(): Promise<Sede[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campuses')
    .select('id, name, salon_devolucion')
    .eq('activo', true)
    .order('name');

  if (error) {
    console.error('sedesActivas: fallo la consulta a campuses', error.message);
    return [];
  }

  return data.map((fila) => ({
    id: fila.id,
    name: fila.name,
    salonDevolucion: fila.salon_devolucion,
  }));
}

// DOS consultas y no un embed, y no es estilo: PostgREST devuelve PGRST200 al
// pedir products+product_availability embebidos, en las DOS direcciones. La causa
// es estructural -esa vista es agregada y no tiene FK propia-, asi que no hay
// sintaxis de embed que lo arregle. Ver COMPORTAMIENTO_MEDIDO.md §1.3.
export async function productosConStock(campusId: string): Promise<ProductoVitrina[]> {
  const supabase = await createClient();

  const { data: filasStock, error: errorStock } = await supabase
    .from('product_availability')
    .select('product_id')
    .eq('campus_id', campusId)
    .eq('in_stock', true);

  if (errorStock) {
    console.error(
      'productosConStock: fallo la consulta a product_availability',
      errorStock.message,
    );
    return [];
  }

  // `product_id` sale `| null` en los tipos generados y NO porque pueda serlo:
  // Postgres no propaga el NOT NULL de la tabla base a las columnas de una vista.
  // En la misma vista `campus_id` SI puede venir null de verdad, y por eso la
  // distincion importa: el tipo no las separa, los datos si.
  //
  // Se estrecha con un filtro y no con `as` (regla 1): un `as` equivocado habria
  // seguido adelante con un `null` dentro del array de ids.
  const ids = filasStock
    .map((fila) => fila.product_id)
    .filter((id): id is string => id !== null);

  // Cortocircuito por dos motivos: `in.()` con lista vacia es una llamada
  // MALFORMADA contra PostgREST -un error de sintaxis, no "cero resultados"-, y
  // ademas no hay nada que pedir.
  if (ids.length === 0) {
    return [];
  }

  const { data: productos, error: errorProductos } = await supabase
    .from('products')
    .select('id, name, category, description, product_images(secure_url, is_main, sort_order)')
    .in('id', ids)
    .order('sort_order');

  if (errorProductos) {
    console.error('productosConStock: fallo la consulta a products', errorProductos.message);
    return [];
  }

  // EL FILTRO DE SEDE ES BR-14 y se aplica EN LA CONSULTA -la lista `ids`-, nunca
  // despues en el cliente. Traer los 34 productos y descartar en memoria se veria
  // identico en pantalla, pero le mandaria a cada alumno el inventario ENTERO de
  // las dos sedes.
  return productos.map((producto) => ({
    id: producto.id,
    name: producto.name,
    category: producto.category,
    description: producto.description,
    imagenUrl: imagenPrincipal(producto.product_images),
  }));
}

// La ficha completa para /catalogo/[id]: trae el array entero de imagenes -la
// galeria enseña mas de una si existe- y `max_duration_hours`.
export type DetalleProducto = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  maxDurationHours: number;
  imagenes: string[];
};

export type StockSede = {
  campusId: string;
  campusName: string;
  unidades: number;
};

// Un id malformado y un UUID valido que no existe llegan por CAMINOS DISTINTOS:
// `22P02` con 400 el primero, `[]` con 200 el segundo. Distinguirlos es lo que
// deja que /catalogo/cualquier-cosa llegue callado a notFound() mientras un fallo
// de verdad -RLS, red- sigue gritando en los logs.
export async function detalleProducto(id: string): Promise<DetalleProducto | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, category, description, max_duration_hours, product_images(secure_url, is_main, sort_order)',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    if (error.code === '22P02') {
      return null;
    }

    console.error('detalleProducto: fallo la consulta a products', error.message);
    return null;
  }

  if (data === null) {
    return null;
  }

  // Mismo orden que imagenPrincipal() pero para el array entero: primero la
  // `is_main`, luego por `sort_order`.
  const imagenesOrdenadas = [...data.product_images].sort((a, b) => {
    if (a.is_main !== b.is_main) {
      return a.is_main ? -1 : 1;
    }
    return a.sort_order - b.sort_order;
  });

  return {
    id: data.id,
    name: data.name,
    category: data.category,
    description: data.description,
    // Se LEE de la fila y no se escribe "4 h" a mano, aunque hoy valga 4 en los
    // 34 productos: D-1 dice que la duracion maxima es por producto.
    maxDurationHours: data.max_duration_hours,
    imagenes: imagenesOrdenadas.map((imagen) => imagen.secure_url),
  };
}

// `product_availability` y NO `inventory_units`: la vista agregada ya da lo que
// esta pantalla enseña. Leer la tabla le entregaria al alumno el `unit_code` y el
// `asset_code` de cada unidad fisica -RLS se lo permite, pero una pantalla que no
// necesita ese detalle no tiene por que pedirlo-.
export async function disponibilidadPorSede(productId: string): Promise<StockSede[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('product_availability')
    .select('campus_id, campus_name, active_units')
    .eq('product_id', productId)
    .eq('in_stock', true);

  if (error) {
    console.error(
      'disponibilidadPorSede: fallo la consulta a product_availability',
      error.message,
    );
    return [];
  }

  // Aqui `campus_id` SI puede venir null de verdad: un producto sin ninguna
  // unidad en ninguna sede sale con esa columna vacia. El filtro lo deja fuera y
  // el producto sale con lista vacia, que es lo que la pantalla debe enseñar.
  return data
    .filter(
      (fila): fila is { campus_id: string; campus_name: string; active_units: number } =>
        fila.campus_id !== null && fila.campus_name !== null && fila.active_units !== null,
    )
    .map((fila) => ({
      campusId: fila.campus_id,
      campusName: fila.campus_name,
      unidades: fila.active_units,
    }));
}
