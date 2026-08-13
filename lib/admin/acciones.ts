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

import { reservasVivas } from '@/lib/admin/dias';
import { particionarPorDia } from '@/lib/admin/filtros';
import { hoyEnLima } from '@/lib/reservas/rejilla';
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

// ─────────────────────────────────────────────────────────────────────────────
// Task 6 · /admin/reservas (F6)
// ─────────────────────────────────────────────────────────────────────────────

// Traduce los rechazos que el CAMBIO DE ESTADO de una reserva puede producir.
// Mismo criterio de siempre -- texto propio SOLO para lo alcanzable, crudo para
// lo demas -- y mismo mensaje que ya escribe mensajeDeRechazoMostrador() en
// lib/mostrador/acciones.ts, porque el rechazo es literalmente el mismo trigger
// sobre la misma tabla.
//
// SE REPITE AQUI EN VEZ DE IMPORTARSE, y la razon no es descuido: esa funcion
// es PRIVADA de lib/mostrador/acciones.ts -- no esta exportada --, y ese
// archivo lleva 'use server', asi que exportarla convertiria una funcion de
// traduccion de texto en una Server Action invocable desde el navegador. La
// alternativa correcta el dia que haya un tercer consumidor es moverla a un
// modulo propio sin 'use server'; con dos, copiar cinco lineas cuesta menos que
// inventar esa capa.
//
// MEDIDO POR PostgREST el 2026-08-12, con un JWT de ADMIN firmado a mano contra
// el stack local -- la T3A ya lo habia medido con un JWT de operador, y esto lo
// confirma para el otro rol:
//
//   PATCH status=completed sobre una `reserved`
//     -> HTTP 400, code "23514", "Transicion no permitida: reserved -> completed"
//   PATCH status=active sobre una `reserved`
//     -> HTTP 200, la fila vuelve con status "active"
//   PATCH status=cancelled + cancellation_reason sobre una `active`
//     -> HTTP 400, code "23514", "Transicion no permitida: active -> cancelled"
//
// Ese TERCER caso es el que importa dejar escrito: NADIE cancela una reserva
// entregada, ni el admin ni por la RPC (ver cancelarReserva() mas abajo, donde
// esta medido por la otra puerta). Es la limitacion exacta que D-40 asume para
// el dia inhabilitado.
function mensajeDeRechazoReserva(mensajeDelMotor: string): string {
  if (mensajeDelMotor.startsWith('Transicion no permitida:')) {
    return 'Esta reserva ya cambió de estado, probablemente porque alguien la actualizó primero. Actualiza la página para ver su estado actual.';
  }

  return mensajeDelMotor;
}

// El cambio de estado desde el desplegable de cada fila (F6).
//
// UPDATE DIRECTO y no una RPC, igual que moverEstado() en
// lib/mostrador/acciones.ts y por el mismo motivo: `reservations_update_staff`
// le aplica al admin (`private.is_staff()` incluye los dos roles, D-16) y el
// GRANT de columna cubre `status`. No es que un UPDATE sea seguro en abstracto:
// es que ACA hay una politica que le abre esa puerta a quien llama.
//
// EL TIPO ADMITE SOLO TRES VALORES, y los otros tres del enum quedan fuera a
// proposito:
//   - `cancelled` va por cancelarReserva(), abajo: exige motivo, y la RPC ya
//     trae esa validacion escrita.
//   - `not_returned` va por marcarNoDevuelta() (lib/mostrador/acciones.ts, con
//     su parametro `ruta`): exige la nota obligatoria de F5 ANTES del cambio de
//     estado, y esta funcion no tiene forma de garantizar esa precondicion. Es
//     la misma razon por la que el tipo de moverEstado() tampoco lo admite.
//   - `reserved` no es destino de ninguna transicion valida: la maquina de
//     estados solo sale de el.
export async function cambiarEstadoReserva(
  reservationId: string,
  estado: 'active' | 'completed' | 'not_picked_up',
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('inventory_reservations')
    .update({ status: estado })
    .eq('id', reservationId);

  if (error) {
    return { error: mensajeDeRechazoReserva(error.message) };
  }

  revalidatePath('/admin/reservas');

  return null;
}

// Traduce los rechazos de `cancel_reservation` PARA EL ADMIN.
//
// NO REUTILIZA mensajeDeRechazoCancelacion() de lib/reservas/acciones.ts, y el
// plan daba por hecho que si -- su Step 1 dice "ya existe
// mensajeDeRechazoCancelacion() traduciendo sus rechazos" --. Dos motivos, y el
// segundo es el que decide:
//
//   1. Es PRIVADA de ese archivo, que ademas lleva 'use server': exportarla
//      convertiria una funcion de texto en una Server Action invocable desde el
//      navegador.
//   2. SUS TEXTOS ESTAN ESCRITOS PARA EL ALUMNO. El del caso 4 termina en
//      "contacta con el personal", y aca el personal es justamente quien lo
//      esta leyendo. Un mensaje que le dice al admin que hable consigo mismo no
//      es reutilizacion: es un texto equivocado con el trabajo ya hecho.
//
// DE LOS CINCO RECHAZOS DE LA RPC, aca solo UNO es alcanzable, y por eso solo
// uno lleva texto propio:
//
//   #1 motivo vacio      -> inalcanzable: el dialogo deshabilita el boton y
//                           cancelarReserva() repite la comprobacion abajo.
//   #2 inexistente       -> inalcanzable: el id sale de listarReservas().
//   #3 ajena             -> inalcanzable PARA EL PERSONAL: la comprobacion de
//                           propiedad esta guardada por `not private.is_staff()`.
//   #4 estado != reserved-> ALCANZABLE. Es una carrera entre dos personas: el
//                           admin tiene esta pantalla abierta, alguien entrega
//                           el equipo en el mostrador, y el admin pulsa
//                           cancelar sobre una reserva que ya paso a `active`.
//   #5 ya empezo         -> inalcanzable PARA EL PERSONAL, guardado por el
//                           mismo `not private.is_staff()`, y MEDIDO: la misma
//                           reserva que la alumna dueña no pudo cancelar,
//                           el admin la cancelo con HTTP 204.
//
// Empareja por PREFIJO y no por igualdad porque el motor interpola el estado
// actual al final del mensaje. Y por TEXTO y no por SQLSTATE porque `23514` lo
// comparten tres de los cinco rechazos.
function mensajeDeRechazoCancelacionAdmin(mensajeDelMotor: string): string {
  if (mensajeDelMotor.startsWith('Solo se cancela una reserva en estado reserved (esta en ')) {
    // DICE QUE SI SE PUEDE HACER, que es lo que distingue este texto del que
    // lee el alumno: el admin tiene delante las otras dos salidas en la misma
    // fila, asi que el mensaje lo lleva a ellas en vez de dejarlo parado.
    return 'El equipo ya se entregó, y una reserva entregada no se puede cancelar: la base no admite ese cambio. Ciérrala desde esta misma fila como «Devuelta» o como «No se devolvió», según lo que haya pasado.';
  }

  return mensajeDelMotor;
}

// La cancelacion con motivo (F6: "al pasar a `cancelled` se exige una razon por
// dialogo").
//
// POR LA RPC `cancel_reservation` Y NO POR UN UPDATE DIRECTO, y la decision no
// se reabre aca -- esta tomada en el Step 1 del plan --. Las dos puertas estan
// abiertas para el personal: el GRANT de columna cubre `status` y
// `cancellation_reason`, y las dos viajarian en un solo PATCH, asi que la
// diferencia NO es la atomicidad. Es que la RPC ya trae escrita la validacion
// del motivo, y reescribir esa misma regla en un UPDATE termina con las dos
// copias separadas. (Los MENSAJES si se traducen aparte, arriba, y por que se
// explica alli: los del alumno no le sirven al admin.)
//
// QUE LA RPC LE SIRVA AL PERSONAL SOBRE UNA RESERVA AJENA ESTA MEDIDO, y no
// solo leido del SQL. El 2026-08-12, por PostgREST contra el stack local, sobre
// LA MISMA reserva -- de Ana, en `reserved`, con el inicio YA PASADO:
//
//   JWT de la alumna DUEÑA -> HTTP 400, code "23514",
//                             "No puedes cancelar una reserva que ya empezo"
//   JWT de ADMIN           -> HTTP 204, cancelada
//
// El contraejemplo es lo que hace valida la medicion: sin el, el 204 del admin
// no distinguiria "la regla existe y exime al personal" de "la regla no esta".
// Las dos comprobaciones que la RPC salta para el personal -- la de propiedad y
// la de D-38 -- estan guardadas por `not private.is_staff()`
// (supabase/migrations/20260812053243_cancel_before_start.sql:46-49 y 59-61).
//
// LO QUE SIGUE SIN PODER NADIE es cancelar una reserva ya entregada, y esta
// medido por las DOS puertas el mismo dia: por la RPC contesta HTTP 400 /
// "Solo se cancela una reserva en estado reserved (esta en active)", y por
// UPDATE directo contesta HTTP 400 / "Transicion no permitida: active ->
// cancelled". Por eso el desplegable solo ofrece cancelar sobre `reserved`.
export async function cancelarReserva(
  reservationId: string,
  motivo: string,
): Promise<ResultadoAdmin> {
  // Barrera de SERVIDOR, aunque el dialogo ya deje el boton deshabilitado con
  // el motivo vacio tras `trim()`. La RPC tambien lo rechazaria por su cuenta
  // -- `btrim`, paso 1 --, asi que esto no es la unica ni la ultima barrera:
  // es la que da un mensaje util en vez del crudo del motor.
  const motivoRecortado = motivo.trim();
  if (motivoRecortado === '') {
    return { error: 'Explica por qué se cancela: el alumno va a leer este motivo.' };
  }

  const supabase = await createClient();

  // Se manda RECORTADO por el mismo motivo que cancelar() en
  // lib/reservas/acciones.ts: el `update` final de la RPC guarda
  // `cancellation_reason = p_reason` TAL CUAL -- `btrim` solo se usa para
  // decidir el rechazo, dos lineas antes --, asi que sin este trim un espacio
  // de mas se guardaria dentro y se veria al leerlo.
  const { error } = await supabase.rpc('cancel_reservation', {
    p_reservation_id: reservationId,
    p_reason: motivoRecortado,
  });

  if (error) {
    return { error: mensajeDeRechazoCancelacionAdmin(error.message) };
  }

  revalidatePath('/admin/reservas');

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Task 7 · /admin/dias (F8, D-40)
// ─────────────────────────────────────────────────────────────────────────────

// Traduce el rechazo del INSERT de disabled_days que esta pantalla puede
// provocar de verdad. Mismo criterio de siempre -- texto propio SOLO para lo
// alcanzable, mensaje CRUDO para lo demas --.
//
// MEDIDO POR PostgREST el 2026-08-12, con un JWT de ADMIN firmado a mano
// contra el stack local: un POST sobre una fecha YA inhabilitada devolvio
// HTTP 409, code "23505", message 'duplicate key value violates unique
// constraint "disabled_days_date_key"'.
function mensajeDeRechazoDia(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('disabled_days_date_key')) {
    return 'Ese día ya está inhabilitado.';
  }

  return mensajeDelMotor;
}

// El texto de D-47: el motivo del dia viaja al `cancellation_reason` que lee
// el alumno. Admite `motivo: string | null` porque asi es exactamente
// `disabled_days.reason` en el esquema -- D-46 hace obligatorio lo que se
// ESCRIBE desde hoy, pero el tipo sigue admitiendo `null` por las filas
// HISTORICAS, las dos que hay hoy en produccion, medidas el 2026-08-10 con
// `reason` en NULL --.
//
// LA RAMA VACIA ES INALCANZABLE DESDE inhabilitarDia(), mas abajo: el
// `motivoRecortado` que le llega a esta funcion ya paso la barrera del Paso 1
// -- `motivo.trim() === ''` devuelve un error ANTES de llegar aca --, asi que
// nunca la invoca con cadena vacia ni con `null`. Se escribe tolerante igual
// porque el nombre del parametro y su tipo describen la COLUMNA, no esta
// unica llamada: si algun dia esta pantalla ofreciera re-generar el texto de
// una fila HISTORICA con `reason = NULL`, esta es la rama que produciria el
// texto de F8 a secas -la primera opcion del operador ternario de abajo, SIN
// el motivo interpolado- en vez de fabricar un motivo que esa fila nunca tuvo.
function textoCancelacionPorDiaInhabilitado(motivo: string | null): string {
  const motivoLimpio = motivo?.trim() ?? '';

  return motivoLimpio === ''
    ? 'Cancelado por la administración (Día inhabilitado)'
    : `Cancelado por la administración (Día inhabilitado: ${motivoLimpio})`;
}

// Inhabilita un dia (F8, corregida por D-40) y cancela solas las reservas
// `reserved` de esa fecha. Las `active` -- equipo ya entregado -- se
// respetan: `active -> cancelled` NO esta entre las transiciones validas de
// `enforce_reservation_transition()`
// (20260806005731_reservation_state_machine.sql, lineas 38-39), asi que
// incluirlas en el UPDATE haria fallar la sentencia ENTERA por el trigger --
// medido en el hecho 5 de esta pantalla: un PATCH sin `status=eq.reserved`
// sobre un dia con 3 `reserved` y 1 `active` devolvio HTTP 400 y las CUATRO
// filas quedaron SIN CAMBIO --.
export async function inhabilitarDia(fecha: string, motivo: string): Promise<ResultadoAdmin> {
  // Paso 1, D-46: el motivo es OBLIGATORIO desde hoy. Barrera de SERVIDOR,
  // aunque la pantalla ya deje el boton deshabilitado con el motivo vacio
  // tras `trim()`.
  const motivoRecortado = motivo.trim();
  if (motivoRecortado === '') {
    return {
      error:
        'Explica por qué se inhabilita el día: el motivo es obligatorio y queda escrito en la reserva de cada alumno afectado.',
    };
  }

  // Paso 2: solo fechas de HOY en adelante. NO ES UN CONTROL -- `disabled_days`
  // no tiene ningun `check` sobre `date` en la base, asi que nada impide
  // insertar un dia pasado por aca --. Es VISIBILIDAD: inhabilitar ayer no
  // cancela nada util, porque las reservas de un dia que ya paso ya estan
  // resueltas en algun otro estado. `hoyEnLima()` recibe `new Date()` DIRECTO
  // y no un `ahora` por parametro -- al reves que las funciones puras de
  // lib/reservas/rejilla.ts y lib/admin/filtros.ts --, y no es una
  // inconsistencia: esta funcion es una Server Action, el borde real donde
  // "ahora" tiene que ser el instante VERDADERO del envio, no el de cuando se
  // pinto la pagina. Si el admin deja la pestaña abierta de un dia para otro,
  // el `ahora` que baja a page.tsx por props quedaria viejo; esta
  // comprobacion no puede usar ese valor.
  const hoy = hoyEnLima(new Date());
  if (fecha < hoy) {
    return { error: 'No puedes inhabilitar un día que ya pasó.' };
  }

  const supabase = await createClient();

  // Paso 3: el INSERT del dia PRIMERO, con columnas EXACTAS `(date, reason)`.
  // `created_by` lo pone el DEFAULT auth.uid() y el GRANT de INSERT ni
  // siquiera enumera esa columna -- se acoto en la migracion de trazabilidad,
  // supabase/migrations/20260805195549_traceability.sql:31-32: `revoke insert
  // on public.disabled_days from authenticated;` seguido de `grant insert
  // (date, reason) on public.disabled_days to authenticated;` --. Mandar
  // `created_by` a mano da HTTP 403 con 42501 "permission denied for table
  // disabled_days", medido el 2026-08-12.
  const { error: errorDia } = await supabase
    .from('disabled_days')
    .insert({ date: fecha, reason: motivoRecortado });

  // Paso 4: si el INSERT fallo -- por ejemplo con el 23505 medido arriba --
  // se traduce y se corta aca. Sin dia, no hay nada que cancelar.
  if (errorDia) {
    return { error: mensajeDeRechazoDia(errorDia.message) };
  }

  // Paso 5: las cancelaciones van DESPUES del dia, nunca antes. El ORDEN es
  // una DECISION con su peor caso, no un detalle de implementacion:
  //   - DIA PRIMERO (el elegido aca): si lo de abajo falla, queda un dia
  //     inhabilitado con reservas vivas dentro. Acotado -- el dia ya no
  //     admite reservas NUEVAS, `create_reservation` lo rechazaria por el
  //     mismo `disabled_days` --, y las que quedan se ven y se cancelan a
  //     mano desde /admin/reservas.
  //   - AL REVES (cancelar primero): si el INSERT del dia fallara despues,
  //     quedarian alumnos SIN reserva en un dia que SIGUE habilitado, sin
  //     ningun rastro real de por que -- irreversible sin tocar la base a
  //     mano --.
  // Esto es RAZONAMIENTO sobre un fallo que no se provoco, no algo medido.
  const vivas = await reservasVivas();
  const { reservadas } = particionarPorDia(vivas, fecha);

  if (reservadas.length > 0) {
    // LA LISTA DE IDS LA CALCULA EL SERVIDOR, releyendo reservasVivas() y
    // particionando de nuevo aca -- NO la que la pantalla ya calculo para
    // enseñar el numero antes de confirmar. Quien se cancela no lo decide un
    // array que viajo por el navegador: un cliente manipulado podria mandar
    // cualquier lista de ids, y esta funcion ni siquiera la recibe como
    // parametro.
    //
    // UNA SOLA sentencia y no un bucle de `cancel_reservation()`: el GRANT de
    // columna es `update (status, cancellation_reason)` y
    // `reservations_update_staff`
    // (20260806005731_reservation_state_machine.sql:62-68) le aplica al
    // admin, asi que las dos columnas viajan JUNTAS en un solo PATCH -- que es
    // lo que exige que cancelar lleve motivo: el trigger las ve a la vez --.
    // Un bucle dejaria "las tres primeras canceladas y la cuarta no" si algo
    // fallara a mitad.
    //
    // EL `.eq('status', 'reserved')` ES DOBLEMENTE NECESARIO, y las dos
    // razones estan escritas por separado porque las dos son ciertas a la
    // vez:
    //   - D-40: solo se cancela lo NO retirado. Una `active` no se toca, y
    //     esta claro desde el filtro de `particionarPorDia()` de mas arriba.
    //   - Y es el SEGURO contra la carrera -- medido en los hechos 5 y 7 de
    //     esta pantalla --: si entre leer `reservasVivas()` y este PATCH
    //     alguien entrega el equipo en el mostrador (`reserved -> active`),
    //     esa reserva sale del resultado del UPDATE en vez de tumbar la
    //     sentencia ENTERA. Sin este filtro -- hecho 5 --, una sola reserva ya
    //     entregada dentro del `.in('id', ...)` hace fallar el PATCH completo,
    //     y con el, las cancelaciones que si eran posibles.
    const { error: errorCancelar } = await supabase
      .from('inventory_reservations')
      .update({
        status: 'cancelled',
        cancellation_reason: textoCancelacionPorDiaInhabilitado(motivoRecortado),
      })
      .in(
        'id',
        reservadas.map((r) => r.id),
      )
      .eq('status', 'reserved');

    if (errorCancelar) {
      return { error: errorCancelar.message };
    }
  }

  revalidatePath('/admin/dias');
  revalidatePath('/admin/reservas');
  // Y /mi-panel: al alumno cuya reserva se acaba de cancelar le acaban de
  // tocar la unica pantalla donde la ve.
  revalidatePath('/mi-panel');

  return null;
}

// Revierte un dia inhabilitado: el DELETE por `date` (F8: "los futuros se
// pueden revertir").
//
// PIDE LA FILA DE VUELTA CON `.select()` Y TRATA EL VACIO COMO ERROR. Motivo
// MEDIDO (hecho 9 de esta pantalla): un DELETE de `disabled_days` con un JWT
// de OPERADOR -- que no tiene politica de DELETE sobre esa tabla -- devolvio
// HTTP 200 con CUERPO VACIO `[]` y NINGUN ERROR. Sin este chequeo, un
// operador pulsaria "Volver a habilitar", veria la pantalla contestar sin
// ninguna queja -- PostgREST no le dio ningun motivo para pensar lo
// contrario --, y el dia seguiria inhabilitado. Convertir ese silencio en un
// mensaje es el punto entero de este chequeo.
export async function habilitarDia(fecha: string): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('disabled_days').delete().eq('date', fecha).select();

  if (error) {
    return { error: error.message };
  }

  if (data.length === 0) {
    return { error: 'No se pudo revertir el día. Puede que ya no exista, o que no tengas permiso para hacerlo.' };
  }

  // REVERTIR NO DESCANCELA NADA, y no es una limitacion de esta funcion: es
  // que `cancelled` es TERMINAL en `enforce_reservation_transition()` --
  // ningun estado sale de ahi --. Las reservas que este mismo dia cancelo
  // inhabilitarDia() se quedan `cancelled` para siempre. La pantalla tiene
  // que decir esto ANTES de que el admin pulse el boton, no solo el codigo.
  revalidatePath('/admin/dias');

  return null;
}
