import { createClient } from '@/lib/supabase/server';

// Esta consulta NO toca `product_availability` a proposito (D-21): la landing
// es una vitrina y no promete disponibilidad. Y no es solo una preferencia de
// diseno -medido el 2026-08-08 contra el proyecto real: como anonimo,
// `product_availability` devuelve HTTP 401, porque D-18 le revoco el SELECT-.
// No es que la vitrina decida no ensenar stock: es que NO PUEDE, y por eso el
// fallo seria ruidoso -un 401 que se ve- y no silencioso. Si algun dia alguien
// anade ese embed aqui, se da cuenta enseguida.
export type ProductoVitrina = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  imagenUrl: string | null;
};

// La forma de las imagenes que devuelve el embed.
//
// El primer intento la FORZABA con `.returns<FilaProducto[]>()`, por miedo a
// que la inferencia se confundiera: `product_images` aparece con el mismo
// nombre de FK dos veces en los tipos generados -hacia `products` y hacia la
// vista `product_availability`, que comparte la columna `product_id`-. Se
// midio, y la inferencia resuelve bien sin ayuda.
//
// Se quito, y el motivo importa mas que el ahorro de una linea: `.returns<>()`
// es un `as` con otro nombre. SUSTITUYE el tipo inferido en vez de
// comprobarlo, asi que el dia que alguien cambie el `select` de abajo y no
// toque esto, el tipo seguiria afirmando la forma vieja y compilaria igual.
// Es exactamente el modo de fallo contra el que se escribio D-26 -"un tipo
// desactualizado no rompe la compilacion: miente en silencio"-.
//
// Tal como queda, este tipo se usa solo como parametro de imagenPrincipal(),
// asi que TypeScript lo CONTRASTA con lo que de verdad devuelve la consulta.
// Si el select y esta declaracion se separan, el typecheck falla. El mismo
// tipo escrito, pero verificado en lugar de impuesto.
type FilaProducto = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  product_images: {
    secure_url: string;
    is_main: boolean;
    sort_order: number;
  }[];
};

// De cada fila se necesita UNA imagen, no el array entero: la principal
// (`is_main`), o si nadie la marco, la de menor `sort_order`. El aplanado
// vive aqui y no en el componente que pinta la tarjeta, para que ese
// componente reciba un dato ya decidido -una URL o `null`- y no repita la
// regla de "cual es la imagen buena" en cada sitio que la use.
function imagenPrincipal(imagenes: FilaProducto['product_images']): string | null {
  if (imagenes.length === 0) {
    return null;
  }

  const principal = imagenes.find((imagen) => imagen.is_main);
  if (principal) {
    return principal.secure_url;
  }

  const ordenadas = [...imagenes].sort((a, b) => a.sort_order - b.sort_order);
  return ordenadas[0].secure_url;
}

// Sale ordenada por `sort_order` y NO por `featured`. Medido el 2026-08-08
// contra el proyecto real: `featured` vale `false` en los 34 productos, asi
// que filtrar o priorizar por ella dejaria la vitrina VACIA en produccion. El
// `seed.sql` local la pone en `true` en 2 de sus 4, asi que en local se veria
// llena -llena en local y vacia en el sitio real, con typecheck, lint y build
// los tres en verde-. `featured` queda sin usar hasta que la tanda 3 le de
// interfaz al admin para marcarla con intencion.
export async function productosVitrina(limite: number): Promise<ProductoVitrina[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, category, description, product_images(secure_url, is_main, sort_order)')
    .order('sort_order')
    .limit(limite);

  // Una vitrina vacia es preferible a una pantalla rota, pero el fallo no se
  // traga en silencio: sin este console.error, un 401 de RLS o un corte de
  // red se verian identicos a "no hay productos que mostrar", que es
  // precisamente el modo de fallo mas dificil de diagnosticar. Es la leccion
  // del proyecto -se comprueba el efecto, y un fallo mudo es el peor de los
  // dos-, aplicada aqui.
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

// Una sede activa, tal como la necesita el catalogo: solo lo que hace falta
// para pintar una pestana y para filtrar la consulta de stock (b mas abajo).
export type Sede = {
  id: string;
  name: string;
};

// Ordenada por `name` y no por el orden de insercion de la tabla: sin un
// `order()` explicito, Postgres no promete ningun orden estable entre
// llamadas. "La primera activa" (la que usa el catalogo cuando no llega
// `?sede=` en la URL, tarea 2A.5) tiene que ser SIEMPRE la misma fila, y hoy
// esa primera es Monterrico -San Miguel va segundo, alfabeticamente-.
export async function sedesActivas(): Promise<Sede[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campuses')
    .select('id, name')
    .eq('activo', true)
    .order('name');

  if (error) {
    console.error('sedesActivas: fallo la consulta a campuses', error.message);
    return [];
  }

  return data;
}

// DOS consultas y no un embed, y no es una eleccion de estilo: medido por
// HTTP el 2026-08-10 contra el STACK LOCAL -127.0.0.1:54321, no el proyecto
// real; da igual cual, porque el esquema es el mismo y lo que falla es la
// inferencia de relaciones, no los datos-, PostgREST devuelve
// PGRST200 "Could not find a relationship" al pedir products+product_availability
// embebidos, en las DOS direcciones. La causa es estructural y no un embed mal
// escrito: PostgREST infiere relaciones de claves foraneas reales, y
// `product_availability` es una vista agregada -no tiene una FK propia hacia
// `products`, aunque el `SELECT` de su definicion si lea de ahi-. No hay
// sintaxis de embed que arregle esto: hacen falta dos viajes.
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

  // `product_id` sale `| null` en los tipos generados, y NO porque pueda
  // serlo: la vista lo saca de `p.id`, el lado izquierdo de sus dos LEFT JOIN
  // (20260805030123_baseline.sql), asi que nunca viene vacio. Es que Postgres
  // no propaga el NOT NULL de la tabla base a las columnas de una vista, y el
  // generador las marca todas nullable por igual. En esa misma vista si hay
  // una que puede venir null de verdad -`campus_id`, cuando un producto no
  // tiene ninguna unidad-, y por eso la distincion importa: el tipo no
  // distingue entre las dos, pero los datos si.
  //
  // Se estrecha con un filtro y no con `as`: D-26 es clara con que un tipo
  // impuesto no se comprueba. Un filtro que no encuentre nada devuelve una
  // lista vacia, que el cortocircuito de abajo trata; un `as` equivocado
  // habria seguido adelante con un `null` dentro del array de ids.
  const ids = filasStock
    .map((fila) => fila.product_id)
    .filter((id): id is string => id !== null);

  // Cortocircuito antes de la segunda consulta, por dos motivos y no uno
  // solo: `in.()` con una lista vacia es una llamada malformada contra
  // PostgREST -no "cero resultados", sino un error de sintaxis del filtro-, y
  // ademas no hay nada que pedir: cero productos en stock en esta sede es una
  // respuesta valida, no una falla.
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

  // Se reutiliza ProductoVitrina y no un tipo nuevo: la forma que necesita
  // TarjetaProducto es identica en los dos casos. Lo que cambia entre vitrina
  // y catalogo no es el DATO sino el CONJUNTO que se pide -todos los
  // productos vs. solo los que tienen stock en esta sede- y si la tarjeta
  // lleva `href` (aqui si, en la landing no).
  //
  // Y el filtro de sede es BR-14: se aplica EN LA CONSULTA de arriba -la
  // lista `ids` que entra en `.in('id', ids)`-, nunca despues en el cliente.
  // Traer los 34 productos y descartar en memoria los que no tienen stock
  // aqui se veria identico en pantalla, pero le habria mandado por la red a
  // cada alumno el inventario ENTERO de las dos sedes -34 productos, cuando
  // esta sede tiene 18 o 16-. La lista de ids que viaja a la segunda consulta
  // ES el filtro: no hay otro sitio donde la sede se decida.
  return productos.map((producto) => ({
    id: producto.id,
    name: producto.name,
    category: producto.category,
    description: producto.description,
    imagenUrl: imagenPrincipal(producto.product_images),
  }));
}
