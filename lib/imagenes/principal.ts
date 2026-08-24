// Cual de las imagenes de un producto es LA que se muestra, como logica pura.
//
// El aplanado vive en la capa de datos y no en el componente que pinta, para que
// ese componente reciba un dato ya decidido -una URL o `null`- y no repita la
// regla en cada sitio que la use. Tiene modulo propio porque la necesitan TRES
// capas: catalogo, inventario de admin y mostrador.

// Forma ESTRUCTURAL a proposito -no importada de database.types.ts- para que las
// tres capas le pasen su propia fila sin adaptarla: cada `select` pide estas tres
// columnas y ya satisface el tipo.
//
// `secure_url` sin `| null` porque la columna es NOT NULL.
export type ImagenElegible = {
  secure_url: string;
  is_main: boolean;
  sort_order: number;
};

/**
 * La URL de la imagen que representa al producto, o `null` si no tiene ninguna.
 *
 *   1. La marcada con `is_main`.
 *   2. Si nadie la marco, la de menor `sort_order`.
 *   3. Sin imagenes, `null`, y quien pinte decide que poner en su lugar.
 *
 * EL PASO 2 NO SE EJERCITA NUNCA EN PRODUCCION: hay 34 productos, 34 imagenes y
 * las 34 con `is_main = true`. Esa rama solo la alcanzan el seed local y las
 * pruebas, asi que su cobertura tiene que venir de Vitest y no de mirar una
 * pantalla. No se borra: `is_main` es NULLABLE y la galeria de administracion
 * deja quitar la principal, asi que el caso es alcanzable en cuanto alguien lo
 * haga.
 *
 * NO ORDENA EN SITIO: `Array.sort()` muta, y este modulo recibe el array que la
 * capa de datos acaba de leer. Reordenarlo cambiaria el orden de la galeria de
 * administracion, que SI depende de `sort_order` para sus botones.
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
