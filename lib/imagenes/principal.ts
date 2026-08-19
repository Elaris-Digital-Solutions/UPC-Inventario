// Cual de las imagenes de un producto es LA que se muestra, como logica pura:
// sin React y sin base de datos, mismo espiritu que lib/mostrador/columnas.ts.
// Se puede PROBAR sin montar un escenario en la base, y la regla vive en UN
// SOLO SITIO -este-, no en cada capa que necesite elegir una foto.
//
// De cada producto se necesita UNA imagen, no el array entero: la principal
// (`is_main`), o si nadie la marco, la de menor `sort_order`. El aplanado vive
// en la capa de datos y no en el componente que pinta, para que ese componente
// reciba un dato ya decidido -una URL o `null`- y no repita la regla de "cual
// es la imagen buena" en cada sitio que la use.
//
// POR QUE ESTA EN UN MODULO PROPIO Y NO EN lib/catalogo/consultas.ts, que es
// de donde sale: hasta la F3-T3 la usaba solo el catalogo del alumno. Ahora la
// necesitan ademas la lista de inventario (lib/admin/consultas.ts) y el
// mostrador (lib/mostrador/consultas.ts), y copiarla dejaria la misma regla en
// TRES sitios -que es justo lo que su propio comentario existia para evitar-.
// Se movio TAL CUAL, sin "mejorarla" de paso: si algo de ella hay que cambiar,
// es un cambio aparte y con su motivo.

// La forma minima que necesita la eleccion. Se declara ESTRUCTURAL a proposito
// -no importada de `lib/database.types.ts`- para que las tres capas le pasen su
// propia fila sin que ninguna tenga que adaptarla: cada `select` pide estas
// tres columnas y ya satisface el tipo.
//
// `secure_url` sin `| null` porque la columna es NOT NULL, y medido ademas
// contra el proyecto real el 2026-08-19: 0 de las 34 filas lo tienen vacio.
export type ImagenElegible = {
  secure_url: string;
  is_main: boolean;
  sort_order: number;
};

/**
 * La URL de la imagen que representa al producto, o `null` si no tiene ninguna.
 *
 * La regla, en orden:
 *
 *   1. La marcada con `is_main`.
 *   2. Si nadie la marco, la de menor `sort_order`.
 *   3. Sin imagenes, `null` -y quien pinte decide que poner en su lugar-.
 *
 * SOBRE EL PASO 2, Y POR QUE IMPORTA QUE ESTE PROBADO: en produccion NO SE
 * EJERCITA NUNCA. Medido el 2026-08-19 contra el proyecto real: hay 34
 * productos, 34 filas en `product_images` -una por producto- y las 34 con
 * `is_main = true`. Esa rama es codigo que solo el seed local y las pruebas
 * pueden alcanzar, asi que su cobertura tiene que venir de Vitest y no de
 * mirar una pantalla. No se borra por no usarse hoy: `is_main` es NULLABLE en
 * el esquema y la galeria de administracion deja quitar la principal, asi que
 * el caso es alcanzable en cuanto alguien lo haga.
 *
 * NO ORDENA EN SITIO: `[...imagenes]` copia antes de ordenar. `Array.sort()`
 * muta el original, y este modulo recibe el array que la capa de datos acaba de
 * leer -reordenarlo cambiaria el orden de la galeria de administracion, que SI
 * depende de `sort_order` para pintar sus botones de subir y bajar-.
 */
export function imagenPrincipal(imagenes: readonly ImagenElegible[]): string | null {
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
