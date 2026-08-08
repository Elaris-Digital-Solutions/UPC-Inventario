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
