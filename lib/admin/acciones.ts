'use server';

// Las Server Actions del area de administracion (F7 de
// ESPECIFICACION_FUNCIONAL.md). La Task 2 de la tanda 3B deja crearProducto();
// las Tasks 3, 5 y 10 agregan las suyas a este mismo archivo.
//
// POR QUE ACA Y NO EN lib/admin/ajustes.ts: ese archivo lo carga un test, y
// Vitest no conoce el alias `@/` -no hay vitest.config.ts-. Un modulo probado
// no puede importar el cliente de servidor. La separacion es por lo que Vitest
// puede resolver, no por capas.

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

export type ResultadoAdmin = { error: string } | null;

// Una unidad tal como la escribe el formulario. `assetCode` y `nota` llegan
// como cadena -posiblemente vacia- y no como `string | null`: el formulario
// siempre manda algo, y quien decide que una cadena vacia significa "sin
// codigo" es esta capa, no el componente.
export type UnidadNueva = {
  unitCode: string;
  assetCode: string;
  campusId: string;
  nota: string;
};

export type DatosProducto = {
  nombre: string;
  categoria: string;
  descripcion: string;
  maxDuracionHoras: number;
  bufferMinutos: number;
};

// Traduce los rechazos que ESTA pantalla puede provocar de verdad, con el
// mismo criterio que mensajeDeRechazo() y mensajeDeRechazoCancelacion() en
// lib/reservas/acciones.ts y mensajeDeRechazoMostrador() en
// lib/mostrador/acciones.ts: texto propio SOLO para lo alcanzable, mensaje
// CRUDO para lo demas, y lo no reconocido cae al crudo, NUNCA a un generico
// "algo salio mal".
//
// LOS CODIGOS Y SUS HTTP, MEDIDOS POR PostgREST el 2026-08-12 con un JWT de
// admin firmado a mano contra el stack local -no leidos del esquema-:
//
//   - Codigo de unidad repetido DENTRO del mismo producto:
//     code "23505", HTTP 409 -no 400-, message
//     'duplicate key value violates unique constraint
//      "inventory_units_product_id_unit_code_key"'.
//     Y lo importante: el INSERT del array falla ENTERO. Se probaron tres
//     unidades con dos codigos repetidos y quedaron CERO en la tabla, no una.
//
//   - El MISMO codigo en OTRO producto: HTTP 201, aceptado. La unicidad es
//     (product_id, unit_code) y no global, y esto lo MIDE en vez de leerlo de
//     la restriccion -- sin este contraejemplo, "es unico por producto" no se
//     distingue de "es unico y nadie repitio todavia".
function mensajeDeRechazoAdmin(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('inventory_units_product_id_unit_code_key')) {
    return 'Hay códigos de unidad repetidos. Dentro de un mismo producto cada código tiene que ser distinto.';
  }

  return mensajeDelMotor;
}

// Alta de producto con sus unidades, F7: "en un solo formulario".
//
// EL ORDEN ES OBLIGADO, no elegido: la clave foranea `inventory_units.product_id`
// exige que el producto exista antes que sus unidades, asi que no hay
// disyuntiva. Lo que si hay que decidir es que pasa si la segunda escritura
// falla, porque la API REST NO da una transaccion entre dos llamadas del
// cliente -- misma limitacion que ya documenta marcarNoDevuelta() en
// lib/mostrador/acciones.ts.
//
// El peor caso con este orden es UN PRODUCTO SIN UNIDADES. Es recuperable y,
// sobre todo, es VISIBLE: el listado de /admin/inventario pinta el recuento de
// unidades por fila, asi que un producto en cero salta a la vista y se arregla
// agregandole unidades desde la Task 3. No se borra el producto para
// "limpiar": ese borrado podria fallar tambien, y entonces habria dos errores
// encadenados en vez de uno con un rastro claro.
export async function crearProducto(
  datos: DatosProducto,
  unidades: UnidadNueva[],
): Promise<ResultadoAdmin | { productoId: string }> {
  const supabase = await createClient();

  const { data: producto, error: errorProducto } = await supabase
    .from('products')
    .insert({
      name: datos.nombre.trim(),
      // Una categoria vacia se guarda como NULL y no como cadena vacia: la
      // columna es NULLABLE y "sin categoria" ya tiene una representacion en
      // el esquema. Guardar '' inventaria una segunda forma de decir lo mismo,
      // y el listado tendria que conocer las dos.
      category: datos.categoria.trim() === '' ? null : datos.categoria.trim(),
      description: datos.descripcion.trim() === '' ? null : datos.descripcion.trim(),
      max_duration_hours: datos.maxDuracionHoras,
      buffer_minutes: datos.bufferMinutos,
    })
    .select('id')
    .single();

  if (errorProducto) {
    return { error: mensajeDeRechazoAdmin(errorProducto.message) };
  }

  if (unidades.length > 0) {
    // UN SOLO INSERT CON ARRAY, no un bucle. Una sentencia es atomica: o
    // entran todas las unidades o no entra ninguna. Un bucle dejaria "las tres
    // primeras si y la cuarta no", que es un estado a medias que nadie pidio.
    // Medido: con un codigo repetido, el array entero falla y quedan CERO.
    //
    // TODAS LAS FILAS LLEVAN EXACTAMENTE LAS MISMAS CLAVES, y esto NO es
    // estilo. PostgREST rechaza un INSERT multiple cuyos objetos no coincidan
    // en el juego de claves: devuelve `PGRST102 "All object keys must match"`
    // con HTTP 400. Medido el 2026-08-12 mandando una unidad CON `asset_code`
    // y otra SIN el. Por eso `asset_code` va SIEMPRE presente, con `null`
    // explicito cuando el formulario lo dejo vacio, en vez de omitir la clave.
    //
    // OJO CON EL CODIGO DE ERROR: `PGRST102` fue tambien el sintoma del BOM en
    // el cuerpo JSON durante la T3A -- Set-Content -Encoding utf8 --. Es el
    // MISMO codigo con una causa completamente distinta, asi que reconocerlo
    // no valida la explicacion de la vez anterior.
    const { error: errorUnidades } = await supabase.from('inventory_units').insert(
      unidades.map((u) => ({
        product_id: producto.id,
        campus_id: u.campusId,
        unit_code: u.unitCode.trim(),
        asset_code: u.assetCode.trim() === '' ? null : u.assetCode.trim(),
      })),
    );

    if (errorUnidades) {
      return { error: mensajeDeRechazoAdmin(errorUnidades.message) };
    }
  }

  // Las notas iniciales van DESPUES de las unidades y en su propia escritura,
  // porque necesitan el `id` de cada unidad, que solo existe una vez
  // insertadas. Se vuelven a leer por `unit_code` en lugar de confiar en el
  // orden del `insert` anterior: PostgREST no promete devolver las filas en el
  // orden en que se mandaron, y emparejar por posicion seria apostar a eso.
  const conNota = unidades.filter((u) => u.nota.trim() !== '');

  if (conNota.length > 0) {
    const { data: creadas, error: errorLectura } = await supabase
      .from('inventory_units')
      .select('id,unit_code')
      .eq('product_id', producto.id);

    if (errorLectura) {
      return { error: mensajeDeRechazoAdmin(errorLectura.message) };
    }

    const porCodigo = new Map((creadas ?? []).map((u) => [u.unit_code, u.id]));

    // Columnas EXACTAS `(unit_id, note)` y nada mas -ni `created_by`: el
    // DEFAULT auth.uid() lo rellena solo y el GRANT de INSERT ni siquiera
    // enumera esa columna (supabase/migrations/20260805195549_traceability.sql:26).
    // Mandarla da HTTP 403 con 42501, ya medido en la T3A.
    const notas = conNota
      .map((u) => ({ unit_id: porCodigo.get(u.unitCode.trim()), note: u.nota.trim() }))
      .filter((n): n is { unit_id: string; note: string } => n.unit_id !== undefined);

    if (notas.length > 0) {
      const { error: errorNotas } = await supabase.from('inventory_unit_notes').insert(notas);

      // El producto y sus unidades YA existen: una nota inicial que no entra
      // no justifica dar el alta por fallida, y menos deshacerla. Se devuelve
      // el error para que el admin lo vea y pueda volver a anotar desde la
      // pantalla de la unidad, que es donde viven las anotaciones.
      if (errorNotas) {
        return { error: mensajeDeRechazoAdmin(errorNotas.message) };
      }
    }
  }

  revalidatePath('/admin/inventario');

  return { productoId: producto.id };
}

// LA BAJA DE UNA UNIDAD ES `retired`, NO UN DELETE, y no es una limitacion que
// se descubra al intentarlo: F7 de ESPECIFICACION_FUNCIONAL.md manda un
// "borrado forzado en cascada manual -- notas, luego reservas, luego la
// unidad --", y ESO NO SE PUEDE HACER, a proposito.
//
//   - `inventory_reservations` no tiene NINGUN `GRANT` de `DELETE` para nadie
//     ni ninguna politica de `DELETE`. No es que el admin no la tenga: no la
//     tiene nadie.
//   - La clave foranea `inventory_reservations_unit_id_fkey` NO cascadea
//     (supabase/migrations/20260805030123_baseline.sql:455, sin
//     ON DELETE CASCADE), asi que borrar una unidad con historial falla.
//
// `retired` existe justo para esto. Y la pantalla lo DICE en vez de limitarse
// a no ofrecer el boton: un boton ausente sin explicacion se lee como un
// defecto, y alguien acabaria pidiendolo o -- peor -- borrando filas por SQL.
//
// LA NOTA ES OBLIGATORIA, y la decide ESTE PLAN, no el esquema. F7 no la exige
// para el cambio de estado -- solo F5 la fuerza para "No se devolvio" --, pero
// una unidad que desaparece del catalogo sin explicacion es exactamente el
// caso que la trazabilidad existe para cubrir (D-2). Mismo criterio que la
// T3A aplico a marcarNoDevuelta().
//
// Y EL MISMO ORDEN QUE marcarNoDevuelta(), por el mismo motivo: PRIMERO la
// nota, DESPUES el estado. La API REST no da una transaccion entre dos
// llamadas del cliente, asi que el orden decide cual es el peor caso.
//   - Con este orden: si el INSERT falla, la unidad NO cambia y el admin
//     reintenta. Una nota huerfana es el costo -- medido de verdad en la T3A
//     provocando la carrera --, y es recuperable.
//   - Al reves: una unidad retirada SIN ningun rastro de por que. El equipo
//     desaparece del catalogo y nadie sabe si esta roto, prestado a un
//     profesor o perdido.
export async function cambiarEstadoUnidad(
  unitId: string,
  estado: 'active' | 'maintenance' | 'retired',
  nota: string,
  productoId: string,
): Promise<ResultadoAdmin> {
  if (nota.trim() === '') {
    return { error: 'Explica el motivo del cambio: queda en el historial de la unidad.' };
  }

  const supabase = await createClient();

  // Columnas EXACTAS `(unit_id, note)`. `created_by` lo pone el DEFAULT
  // auth.uid() y el GRANT de INSERT ni siquiera enumera esa columna
  // (supabase/migrations/20260805195549_traceability.sql:26); mandarla da 403
  // con 42501, ya medido en la T3A.
  const { error: errorNota } = await supabase
    .from('inventory_unit_notes')
    .insert({ unit_id: unitId, note: nota.trim() });

  if (errorNota) {
    return { error: errorNota.message };
  }

  const { error: errorEstado } = await supabase
    .from('inventory_units')
    .update({ status: estado })
    .eq('id', unitId);

  if (errorEstado) {
    return { error: mensajeDeRechazoAdmin(errorEstado.message) };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  // Tambien el listado: sus tres recuentos por estado y el de "sin codigo"
  // cambian con esto, y sin revalidar mostraria los de antes.
  revalidatePath('/admin/inventario');

  return null;
}

// Alta de una unidad suelta sobre un producto que ya existe (F7: "alta
// individual -- codigo, sede, anotacion --; rechaza codigos duplicados dentro
// del producto").
//
// La unicidad es (product_id, unit_code) y NO global -- medido el 2026-08-12
// creando el mismo codigo en otro producto, que se acepto con HTTP 201 --, asi
// que aca no hace falta comprobar contra el inventario entero: la restriccion
// de la base ya acota al producto correcto.
export async function agregarUnidad(
  productoId: string,
  unidad: UnidadNueva,
): Promise<ResultadoAdmin> {
  if (unidad.unitCode.trim() === '') {
    return { error: 'La unidad necesita un código.' };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('inventory_units')
    .insert({
      product_id: productoId,
      campus_id: unidad.campusId,
      unit_code: unidad.unitCode.trim(),
      asset_code: unidad.assetCode.trim() === '' ? null : unidad.assetCode.trim(),
    })
    .select('id')
    .single();

  if (error) {
    return { error: mensajeDeRechazoAdmin(error.message) };
  }

  // La anotacion inicial es OPCIONAL aca -- al reves que en
  // cambiarEstadoUnidad(), donde es obligatoria --, y la diferencia no es
  // capricho: dar de alta una unidad nueva no esconde nada que haya que
  // explicar, y retirarla si.
  if (unidad.nota.trim() !== '') {
    const { error: errorNota } = await supabase
      .from('inventory_unit_notes')
      .insert({ unit_id: data.id, note: unidad.nota.trim() });

    // La unidad YA existe: una nota inicial que no entra no justifica dar el
    // alta por fallida. Se devuelve el error para que el admin lo vea y pueda
    // volver a anotar desde el historial de la unidad.
    if (errorNota) {
      return { error: errorNota.message };
    }
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Edicion de los datos del producto.
//
// VUELVE A OFRECER EL BUFFER POR multiplosDeSlot(), igual que el alta, y eso
// NO es una repeticion ociosa: editar es OTRA PUERTA a `buffer_minutes`.
// Dejarla sin filtro reabriria por detras exactamente lo que la Task 2 cierra
// por delante, y Q-14 seguiria abierto con la pantalla de alta impecable.
export async function editarProducto(
  productoId: string,
  datos: DatosProducto,
): Promise<ResultadoAdmin> {
  if (datos.nombre.trim() === '') {
    return { error: 'El producto necesita un nombre.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('products')
    .update({
      name: datos.nombre.trim(),
      category: datos.categoria.trim() === '' ? null : datos.categoria.trim(),
      description: datos.descripcion.trim() === '' ? null : datos.descripcion.trim(),
      max_duration_hours: datos.maxDuracionHoras,
      buffer_minutes: datos.bufferMinutos,
    })
    .eq('id', productoId);

  if (error) {
    return { error: mensajeDeRechazoAdmin(error.message) };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// IMAGENES (Task 5). F7: carga multiple, imagen principal, reordenar, eliminar.
// ═══════════════════════════════════════════════════════════════════════════
//
// EL ARCHIVO NUNCA PASA POR ESTE SERVIDOR. El navegador pide la firma a
// /api/cloudinary/firma, sube DIRECTO a Cloudinary con ella, y solo entonces
// llama a registrarImagen() con lo que Cloudinary devolvio. Por eso ninguna de
// estas acciones recibe un binario.

// Los datos que Cloudinary devuelve tras una subida y que se guardan tal cual.
export type ImagenSubida = {
  publicId: string;
  secureUrl: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

// Guarda la fila DESPUES de que Cloudinary confirme la subida.
//
// GUARDA `cloudinary_public_id`, Y ESO ES LO QUE HOY FALTA EN PRODUCCION: las
// 34 imagenes reales tienen esa columna en NULL -- consultado el 2026-08-12 --,
// asi que estan en Cloudinary y NADIE PUEDE IDENTIFICARLAS alli. Las que pasen
// por aca si se pueden.
//
// `is_main` se decide contando: la primera imagen de un producto nace
// principal, y las siguientes no. Sin esto, un producto recien creado se
// quedaria SIN principal y el catalogo tendria que adivinar cual mostrar.
export async function registrarImagen(
  productoId: string,
  imagen: ImagenSubida,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { count, error: errorConteo } = await supabase
    .from('product_images')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', productoId);

  if (errorConteo) {
    return { error: errorConteo.message };
  }

  const yaHabia = count ?? 0;

  const { error } = await supabase.from('product_images').insert({
    product_id: productoId,
    secure_url: imagen.secureUrl,
    cloudinary_public_id: imagen.publicId,
    format: imagen.format,
    width: imagen.width,
    height: imagen.height,
    bytes: imagen.bytes,
    is_main: yaHabia === 0,
    sort_order: yaHabia,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Marca UNA imagen como principal.
//
// SON DOS ESCRITURAS Y NO HAY TRANSACCION ENTRE ELLAS, porque "una sola
// principal por producto" NO LA DEFIENDE LA BASE. Medido el 2026-08-12: se
// insertaron dos imagenes del mismo producto con `is_main: true` las dos y
// PostgREST contesto **HTTP 201** con las dos filas dentro. `product_images`
// solo tiene `PRIMARY KEY (id)` y `UNIQUE (cloudinary_public_id)`: ninguna
// restriccion sobre `is_main`.
//
// EL ORDEN, POR SU PEOR CASO -- primero apagar todas, despues encender la
// elegida:
//   - Con este orden, si la segunda escritura falla el producto queda SIN
//     principal. El catalogo cae en la primera por `sort_order`, que es una
//     degradacion VISIBLE y recuperable pulsando otra vez.
//   - Al reves quedarian DOS principales, que es un dato incoherente y
//     SILENCIOSO: nadie lo nota hasta que el catalogo elige la que no era.
// Mismo criterio que ya aplicaron marcarNoDevuelta() (T3A) y
// cambiarEstadoUnidad(): entre dos escrituras sin transaccion, se elige el
// orden cuyo fallo se ve.
//
// El apagado es UNA sentencia con filtro -- `is_main=eq.true` sobre el
// producto --, no un bucle: medido, PATCH devolvio HTTP 200 y apago las dos de
// golpe.
export async function fijarPrincipal(
  productoId: string,
  imagenId: string,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { error: errorApagar } = await supabase
    .from('product_images')
    .update({ is_main: false })
    .eq('product_id', productoId)
    .eq('is_main', true);

  if (errorApagar) {
    return { error: errorApagar.message };
  }

  const { error: errorEncender } = await supabase
    .from('product_images')
    .update({ is_main: true })
    .eq('id', imagenId);

  if (errorEncender) {
    return { error: errorEncender.message };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Reordena las imagenes de un producto.
//
// RECIBE EL ORDEN COMPLETO Y NO "sube esta una posicion": asi la pantalla
// manda el estado final que quiere, y no una secuencia de movimientos que
// podria aplicarse sobre un orden distinto del que el admin estaba viendo.
//
// SIN `upsert`: haria falta mandar TODAS las columnas NOT NULL de cada fila
// -- `secure_url` entre ellas --, y esta funcion no las tiene ni tiene por que
// leerlas. Son `UPDATE` por id, uno por imagen. Con una imagen por producto en
// el catalogo real -- y ninguna galeria de mas de un puñado --, el costo es
// irrelevante; si algun dia hubiera decenas, esto pide una RPC, que es SQL.
export async function reordenarImagenes(
  productoId: string,
  idsEnOrden: string[],
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  for (const [indice, id] of idsEnOrden.entries()) {
    const { error } = await supabase
      .from('product_images')
      .update({ sort_order: indice })
      .eq('id', id);

    // Se corta al primer fallo en vez de seguir: continuar dejaria un orden a
    // medias que nadie pidio, y el admin no sabria cual de las dos mitades
    // esta viendo.
    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath(`/admin/inventario/${productoId}`);

  return null;
}

// Borra la FILA de la imagen. NO borra nada en Cloudinary.
//
// Y NO ES UNA OMISION: F7 dice literalmente "eliminar (borra la fila; no borra
// de Cloudinary)". Ademas seria IMPOSIBLE para las 34 imagenes reales, que no
// guardan `cloudinary_public_id` y por tanto no se pueden nombrar alli.
//
// El DELETE esta concedido y la politica lo permite -- `product_images_admin_all`
// es `for all` --, medido: como admin devuelve la fila borrada con HTTP 200, y
// con un JWT de ALUMNO devuelve `[]` con HTTP 200, cero filas SIN ERROR. El
// modo de fallo silencioso de siempre.
export async function borrarImagen(
  productoId: string,
  imagenId: string,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { error } = await supabase.from('product_images').delete().eq('id', imagenId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// El adaptador que consume useActionState desde el formulario, con la misma
// forma que reservar() en lib/reservas/acciones.ts: (estadoPrevio, formData).
// crearProducto() de arriba se queda como el nucleo TIPADO -- recibe datos ya
// convertidos y no sabe nada de FormData --, y esto solo traduce.
//
// LAS UNIDADES VIAJAN COMO CAMPOS REPETIDOS y se leen con getAll(), no con
// nombres indexados tipo `unidad-codigo-0`. Dos motivos: el orden de getAll()
// es el orden del DOM, que es el que el admin ve en pantalla; y agregar o
// quitar una fila no obliga a renumerar nada, asi que no hay indices que se
// desincronicen al borrar la fila del medio.
//
// Los tres arrays se recorren por el indice del PRIMERO. Si el navegador
// mandara distinto numero de codigos que de sedes -- lo que solo pasaria con
// el DOM manipulado a mano --, las filas de mas se ignoran en vez de crear
// unidades con la sede de otra. El motor las rechazaria igual: `campus_id` es
// NOT NULL.
export async function crearProductoAction(
  _estadoPrevio: ResultadoAdmin | { productoId: string },
  formData: FormData,
): Promise<ResultadoAdmin | { productoId: string }> {
  const leer = (campo: string) => String(formData.get(campo) ?? '');
  const leerTodos = (campo: string) => formData.getAll(campo).map((v) => String(v));

  const nombre = leer('nombre').trim();
  if (nombre === '') {
    return { error: 'El producto necesita un nombre.' };
  }

  const codigos = leerTodos('unitCode');
  const assetCodes = leerTodos('assetCode');
  const campusIds = leerTodos('campusId');
  const notas = leerTodos('nota');

  // Las filas con el codigo vacio se descartan en silencio y a proposito: el
  // formulario nace con una fila en blanco, y un admin que solo quiere dar de
  // alta el producto -- sin unidades todavia -- no tiene por que borrarla a
  // mano. Un `unit_code` vacio ademas no identifica nada.
  const unidades: UnidadNueva[] = codigos
    .map((unitCode, i) => ({
      unitCode,
      assetCode: assetCodes[i] ?? '',
      campusId: campusIds[i] ?? '',
      nota: notas[i] ?? '',
    }))
    .filter((u) => u.unitCode.trim() !== '');

  // El codigo repetido se detecta ACA ademas de en el motor. No es una
  // duplicacion ociosa: la restriccion de la base rechaza el array ENTERO con
  // 23505, y ese mensaje no dice CUAL codigo se repitio. Comprobarlo antes
  // permite nombrarlo. La barrera de verdad sigue siendo la base -- si esta
  // comprobacion se borrara, el alta seguiria sin poder crear duplicados.
  const vistos = new Set<string>();
  for (const u of unidades) {
    const codigo = u.unitCode.trim();
    if (vistos.has(codigo)) {
      return { error: `El código de unidad "${codigo}" está repetido. Cada unidad necesita uno distinto.` };
    }
    vistos.add(codigo);
  }

  return crearProducto(
    {
      nombre,
      categoria: leer('categoria'),
      descripcion: leer('descripcion'),
      maxDuracionHoras: Number(leer('maxDuracionHoras')),
      bufferMinutos: Number(leer('bufferMinutos')),
    },
    unidades,
  );
}
