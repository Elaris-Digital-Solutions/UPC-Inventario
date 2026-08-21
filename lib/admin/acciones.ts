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
import { particionarPorDia, type RolStaff } from '@/lib/admin/filtros';
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

// ─────────────────────────────────────────────────────────────────────────────
// Task 9 · /admin/personal (D-52, D-53)
// ─────────────────────────────────────────────────────────────────────────────

// Traduce los rechazos que el ALTA de personal puede provocar de verdad.
// Mismo criterio de siempre -- texto propio SOLO para lo alcanzable, mensaje
// CRUDO para lo demas --.
//
// MEDIDO POR PostgREST el 2026-08-13, con un JWT de ADMIN firmado a mano
// contra el stack local:
//
//   POST con un user_id que YA es personal
//     -> HTTP 409, code "23505", constraint "staff_members_pkey"
//   POST con un user_id que no existe en auth.users
//     -> HTTP 409, code "23503", constraint "staff_members_user_id_fkey",
//        details 'Key is not present in table "users".'
//
// LOS DOS DAN EL MISMO HTTP -409- Y CODIGOS DISTINTOS: por eso se distinguen
// por el nombre de la restriccion en el mensaje, no por el status.
function mensajeDeRechazoPersonal(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('staff_members_pkey')) {
    return 'Esa persona ya es parte del personal.';
  }

  if (mensajeDelMotor.includes('staff_members_user_id_fkey')) {
    // OJO CON EL TEXTO: NO es "todavia no tiene acceso" -- para cuando este
    // codigo llega, darDeAltaPersonal() ya leyo `auth_user_id` de una fila de
    // `alumnos` que SI lo tenia. Si el motor igual rechaza el INSERT con este
    // codigo, es porque esa cuenta desaparecio de `auth.users` en el medio, y
    // decirle a alguien "entra primero con tu enlace" seria un consejo
    // equivocado para ese caso: la cuenta ya no esta, no es que nunca entro.
    return 'Esa cuenta ya no existe en el sistema de acceso. Puede haberse eliminado justo después de que la buscaste; vuelve a intentarlo.';
  }

  return mensajeDelMotor;
}

// Alta de personal (D-53: se busca por el CORREO COMPLETO, nunca con un
// buscador incremental ni trayendo todos los alumnos -- asi ninguna lectura
// de `alumnos` queda expuesta como endpoint invocable desde el navegador --).
//
// EL CORREO SE NORMALIZA con trim() y toLowerCase() antes de buscar: el
// trigger handle_new_auth_user
// (supabase/migrations/20260805194424_alumno_provisioning.sql:26-37) guarda
// `alumnos.email` en minusculas con lower(), asi que buscar con mayusculas no
// encontraria a nadie aunque la cuenta exista.
//
// TRES CAUSAS DISTINTAS PARA "no se puede dar de alta", con tres mensajes
// porque cada una la arregla una persona distinta:
//   1. No hay fila en `alumnos` con ese correo -- `GET
//      alumnos?email=eq.<correo que no existe>` da HTTP 200 con `[]`, medido,
//      no un error --. El mensaje dice las DOS causas posibles: nunca pidio
//      su enlace de acceso, o su correo no es @upc.edu.pe -- el trigger de
//      arriba solo crea la fila para ese dominio, asi que buscar en `alumnos`
//      ya filtra el dominio solo, sin escribir ninguna comprobacion aca --.
//   2. La fila EXISTE pero `auth_user_id` es `null`: alguien la registro --o
//      es una fila historica-- y nunca llego a pedir el magic link, que es lo
//      que rellena esa columna. Sin `auth_user_id` no hay a quien insertar en
//      `staff_members`, cuyo `user_id` referencia `auth.users`.
//   3. La fila y el `auth_user_id` existen, y el INSERT lo rechaza el motor:
//      ya es personal, o -- carrera entre el SELECT de arriba y este INSERT,
//      no un caso normal -- la cuenta desaparecio de `auth.users` justo en el
//      medio. Los dos mensajes se traducen abajo en mensajeDeRechazoPersonal().
export async function darDeAltaPersonal(correo: string, rol: RolStaff): Promise<ResultadoAdmin> {
  const correoNormalizado = correo.trim().toLowerCase();

  if (correoNormalizado === '') {
    return { error: 'Escribe el correo completo de la persona.' };
  }

  const supabase = await createClient();

  const { data: alumnos, error: errorAlumno } = await supabase
    .from('alumnos')
    .select('auth_user_id')
    .eq('email', correoNormalizado);

  if (errorAlumno) {
    return { error: errorAlumno.message };
  }

  if (alumnos.length === 0) {
    return {
      error:
        'No encontramos esa cuenta. O todavía no pidió nunca su enlace de acceso, o su correo no es @upc.edu.pe.',
    };
  }

  const authUserId = alumnos[0].auth_user_id;

  if (authUserId === null) {
    return {
      error:
        'Esa cuenta existe pero todavía no entró nunca con su enlace de acceso. Pídele que entre al menos una vez antes de darla de alta.',
    };
  }

  const { error: errorAlta } = await supabase
    .from('staff_members')
    .insert({ user_id: authUserId, role: rol })
    .select();

  if (errorAlta) {
    return { error: mensajeDeRechazoPersonal(errorAlta.message) };
  }

  revalidatePath('/admin/personal');

  return null;
}

// Cambia el rol de alguien que YA es personal (D-52: operator <-> admin, con
// el mismo GRANT y la misma politica que la baja de abajo).
//
// PIDE LA FILA DE VUELTA CON `.select()` Y TRATA EL VACIO COMO ERROR. Motivo
// MEDIDO: un PATCH de `staff_members` con un JWT de OPERADOR sobre la fila de
// OTRO -- el operador no tiene politica de UPDATE sobre esa tabla -- devolvio
// HTTP 200 con CUERPO VACIO `[]` y NINGUN ERROR. Sin este chequeo el fallo
// seria silencioso, exactamente lo que se midio.
export async function cambiarRolPersonal(userId: string, rol: RolStaff): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  // ESTO NO ES UN CONTROL, es VISIBILIDAD: quien de verdad decide si este
  // PATCH puede tocar una fila es RLS, y RLS SI deja al admin tocar la SUYA
  // propia -- medido: el admin desactivandose a si mismo da HTTP 200 CON LA
  // FILA --. El chequeo existe porque, DESPUES de eso, no hay forma de
  // revertirlo desde la aplicacion -- medido: ese mismo admin intentando
  // reactivarse da HTTP 200 con `[]`, porque private.is_admin() exige
  // `activo` y ya no lo esta --. Con un solo admin en produccion, ese clic
  // deja a todo el personal sin panel. El agujero por SQL directo sigue
  // abierto: esto no lo cierra, evita pisarlo desde esta pantalla.
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  if (sub === userId) {
    return { error: 'No puedes cambiar tu propio rol desde aquí.' };
  }

  // SIN mensajeDeRechazoPersonal() aca: esa traduccion es para el ALTA -- un
  // INSERT --, y ni 23505 (`staff_members_pkey`) ni 23503
  // (`staff_members_user_id_fkey`) son alcanzables desde un UPDATE de `role`
  // sobre una fila que ya existe. El mensaje crudo es lo que corresponde,
  // mismo criterio de siempre: texto propio SOLO para lo alcanzable.
  const { data, error } = await supabase
    .from('staff_members')
    .update({ role: rol })
    .eq('user_id', userId)
    .select();

  if (error) {
    return { error: error.message };
  }

  if (data.length === 0) {
    return { error: 'No se pudo cambiar el rol. Puede que esa persona ya no sea parte del personal.' };
  }

  revalidatePath('/admin/personal');

  return null;
}

// Activa o desactiva a alguien que ya es personal. `activo=false` es la baja
// de verdad, no un simulacro: `private.is_staff()` y
// `private.current_staff_role()`
// (supabase/migrations/20260805193357_private_helpers.sql:59-65 y :78-86)
// exigen `activo` en su `where`, asi que desactivar corta el acceso al
// mostrador y a la administracion sin ambiguedad, sin depender de esta
// pantalla ni de ningun otro control del cliente.
export async function cambiarActivoPersonal(userId: string, activo: boolean): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  // Misma VISIBILIDAD que cambiarRolPersonal(), y por el mismo motivo medido:
  // RLS SI deja al admin desactivarse a si mismo, y despues no hay forma de
  // revertirlo desde la aplicacion. No es un control -- por SQL directo el
  // agujero sigue ahi --, es evitar el caso mas caro de pisar sin querer: con
  // un solo admin en produccion, un clic asi deja a todo el personal sin
  // panel y a nadie que pueda revertirlo desde la pantalla.
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  if (sub === userId) {
    return { error: 'No puedes cambiar tu propio acceso desde aquí.' };
  }

  // SIN mensajeDeRechazoPersonal() aca, mismo motivo que cambiarRolPersonal():
  // esa traduccion es para el INSERT del alta, y ninguno de sus dos codigos es
  // alcanzable desde este UPDATE.
  const { data, error } = await supabase
    .from('staff_members')
    .update({ activo })
    .eq('user_id', userId)
    .select();

  if (error) {
    return { error: error.message };
  }

  if (data.length === 0) {
    return { error: 'No se pudo cambiar el acceso. Puede que esa persona ya no sea parte del personal.' };
  }

  revalidatePath('/admin/personal');

  return null;
}

// POR QUE ESTA PANTALLA NO OFRECE UNA BAJA DE VERDAD (DELETE), Y NO ES UN
// OLVIDO: el privilegio esta concedido -- `grant insert, update, delete on
// public.staff_members to authenticated`
// (supabase/migrations/20260805194015_staff_policies.sql:14) --, y
// `staff_admin_all` es `for all`, asi que el admin SI podria borrar una fila
// por la API. No se ofrece a proposito, por dos motivos:
//   1. `activo=false` ya corta el acceso de verdad -- ver el comentario de
//      cambiarActivoPersonal() --, asi que borrar no gana nada que la baja no
//      gane ya.
//   2. Borrar NO ROMPE el historial -- y hay que decirlo con precision, no
//      solo en general. `reservation_status_log.changed_by` e
//      `inventory_unit_notes.created_by`
//      (supabase/migrations/20260805030123_baseline.sql:485 y :460) son FK a
//      `auth.users`, no a `staff_members`, y llevan `ON DELETE SET NULL`
//      sobre `auth.users`. Borrar la fila de `staff_members` no toca esas
//      columnas: el uuid se queda exactamente igual. `staff_members` tampoco
//      guarda nombre ni correo -- sus columnas son `user_id`, `role`,
//      `activo`, `created_at` y `updated_at`, que es justo por lo que existe
//      cruzarPersonal() -- asi que esta pantalla nunca "resuelve" con ella el
//      nombre de quien firmo una nota. Lo que SI se pierde al borrar es la
//      UNICA constancia de que ese uuid fue parte del personal y con que rol.
//      `activo=false` conserva esa constancia y corta el acceso igual (ver el
//      comentario de cambiarActivoPersonal()), asi que borrar no gana nada y
//      si pierde ese registro.

// ─────────────────────────────────────────────────────────────────────────────
// Task 10 · /admin/ajustes (D-54, Q-19)
// ─────────────────────────────────────────────────────────────────────────────

// Traduce los rechazos por `check` que `app_settings` puede dar. Mismo
// criterio de siempre -texto propio SOLO para lo alcanzable, mensaje CRUDO
// para lo demas, y lo no reconocido cae al crudo y nunca a un generico-.
//
// LOS SEIS SON `23514`, y se distinguen por el NOMBRE de la restriccion en
// el `message`, nunca por el HTTP ni por el codigo -los seis dan HTTP 400-.
// MEDIDOS POR PostgREST con un JWT de ADMIN firmado a mano contra el stack
// local; los cinco primeros el 2026-08-13 y el ultimo el 2026-08-15, que es
// cuando M-12 trajo la columna:
//
//   slot_minutes: 45            -> constraint "app_settings_slot_divisor"
//   booking_window_days: 61     -> constraint "app_settings_booking_window_days_check"
//   min_duration_minutes: 4     -> constraint "app_settings_min_duration_minutes_check"
//   daily_limit_per_product: 11 -> constraint "app_settings_daily_limit_per_product_check"
//   min_cancel_minutes: 1441    -> constraint "app_settings_min_cancel_minutes_check"
//
// OJO -F3-T4, migracion 35, D-91-: ERAN SEIS Y AHORA SON CINCO.
// `app_settings_horario` -closing_time > opening_time- se fue con las dos
// columnas, y en su lugar entra un rechazo que NO es un `check` de tabla sino
// un TRIGGER: `app_settings_respeta_horarios` (migracion 33) impide bajar
// `slot_minutes` si eso dejaria aperturas de `campus_hours` sin alinear. Es la
// puerta de atras de D-54 despues de la mudanza, y llega con errcode 23514
// igual que los demas, pero su `message` NO trae nombre de restriccion: se
// reconoce por su texto, que lo escribe esta casa y no Postgres.
//
// SOLO CINCO llevan texto propio, y hay que decir por que:
// `app_settings_slot_divisor` NO ES ALCANZABLE desde esta pantalla. El Step 1
// de la Task 10 ofrece `slot_minutes` como un DESPLEGABLE de los ocho valores
// legales -5, 6, 10, 12, 15, 20, 30, 60-, no como un campo libre de 5 a 60:
// 45 nunca sale del navegador. Escribirle un mensaje seria darle texto a un
// rechazo que nadie va a provocar desde el formulario, y ese texto quedaria
// sin nadie que lo leyera nunca. Si algun dia el desplegable se reemplazara
// por un campo libre, este rechazo volveria a ser alcanzable y caeria al
// mensaje CRUDO hasta que alguien le escriba el suyo.
//
// Y `pg_constraint` ENUMERA MAS `check` SOBRE ESTA TABLA QUE LOS SEIS DE
// ARRIBA -nueve al 2026-08-15, medidos-, lo cual NO es un olvido: los otros
// tres no llegan a la base desde esta pantalla. `app_settings_singleton`
// cubre `id`, que nunca va en el body. `app_settings_slot_minutes_check` lo
// tapa el mismo desplegable que tapa a `slot_divisor`. Y
// `app_settings_apertura_alineada` -migracion 24, D-55- la intercepta
// aperturaDesalineada() unas lineas mas abajo, que corre en el SERVIDOR y
// contesta con su propio mensaje sin llegar a tocar la base. El criterio es
// el mismo de siempre: se traduce lo alcanzable, y lo que tiene una barrera
// delante no lo es.
function mensajeDeRechazoAjustes(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('app_settings_booking_window_days_check')) {
    return 'La ventana de reserva tiene que ser de entre 1 y 60 días.';
  }

  if (mensajeDelMotor.includes('sin alinear')) {
    return 'Con ese tamaño de bloque, alguna hora de apertura de sede dejaría de caer justo en un bloque. Ajusta primero los horarios en /admin/horarios.';
  }

  if (mensajeDelMotor.includes('app_settings_min_duration_minutes_check')) {
    return 'La duración mínima tiene que ser de entre 5 y 480 minutos.';
  }

  if (mensajeDelMotor.includes('app_settings_daily_limit_per_product_check')) {
    return 'El límite diario por producto tiene que ser de entre 1 y 10.';
  }

  if (mensajeDelMotor.includes('app_settings_min_cancel_minutes_check')) {
    return 'La antelación mínima para cancelar tiene que ser de entre 0 y 1440 minutos.';
  }

  return mensajeDelMotor;
}

// Edicion de los cinco ajustes globales de reserva (D-39/Q-14 y M-12/D-70).
//
// OJO -F3-T4, migracion 35, D-91-: ERAN SIETE. Apertura y cierre ya no se
// editan aqui: el horario dejo de ser global y vive en `campus_hours` por sede
// y por dia (D-74), en /admin/horarios.
//
// Y CON ELLOS SE FUE LA BARRERA DE SERVIDOR DE D-54, que aqui llamaba a
// aperturaDesalineada() antes de tocar la base. No se ha perdido la regla: se
// mudo a DOS DISPARADORES en la migracion 33 -uno sobre `campus_hours` y otro
// sobre `app_settings` para la puerta de atras de `slot_minutes`-, o sea que
// la aplica la base, que es donde Q-19 pedia que estuviera. aperturaDesalineada()
// SIGUE EXISTIENDO en lib/admin/ajustes.ts con sus pruebas: la va a necesitar
// /admin/horarios para avisar antes de guardar, que es visibilidad y no control.
//
// SOLO CINCO COLUMNAS EN EL BODY, nunca `id` ni `updated_at`: mandarlas da HTTP
// 403 con 42501 "permission denied for table app_settings", medido el
// 2026-08-13 -ninguna de las dos se concede a nadie, y `updated_at` la mueve
// sola el trigger `trg_app_settings_updated_at`-.
//
// `.eq('id', true)` ES OBLIGATORIO, y no un adorno: un PATCH SIN filtro,
// con JWT de admin y un cuerpo valido, devolvio HTTP 400 con code "21000",
// "UPDATE requires a WHERE clause", medido el 2026-08-13. Esto NO esta en el
// plan, y sin el filtro esta pantalla fallaria SIEMPRE -con typecheck, lint y
// build en verde-: ninguna de esas tres herramientas lo hubiera encontrado.
//
// PIDE LA FILA DE VUELTA CON `.select()` Y TRATA EL VACIO COMO ERROR, mismo
// criterio que habilitarDia() y cambiarRolPersonal() mas arriba. Motivo
// MEDIDO: un PATCH `?id=eq.true` con JWT de OPERADOR o de ALUMNO -ninguno
// tiene politica de UPDATE sobre `app_settings`, solo `app_settings_update_admin`
// se la da al admin- devolvio HTTP 200 con CUERPO VACIO `[]` y NINGUN ERROR,
// los dos medidos el 2026-08-13. Sin este chequeo, un PATCH que no cambio
// nada contestaria exactamente igual que uno que si.
export async function guardarAjustes(ajustes: {
  ventanaDias: number;
  slotMinutos: number;
  duracionMinima: number;
  limiteDiario: number;
  margenCancelacion: number;
}): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_settings')
    .update({
      booking_window_days: ajustes.ventanaDias,
      slot_minutes: ajustes.slotMinutos,
      min_duration_minutes: ajustes.duracionMinima,
      daily_limit_per_product: ajustes.limiteDiario,
      min_cancel_minutes: ajustes.margenCancelacion,
    })
    .eq('id', true)
    .select();

  if (error) {
    return { error: mensajeDeRechazoAjustes(error.message) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo guardar. Puede que no tengas permiso para hacerlo.' };
  }

  // DOS revalidatePath, porque estos ajustes los lee TAMBIEN el calendario
  // del alumno, no solo esta pantalla -lib/reservas/consultas.ts,
  // ajustesReserva(), es quien lo consume del otro lado, y
  // `diasDeLaVentana()` (lib/reservas/rejilla.ts) es quien usa
  // `booking_window_days` para decidir cuantos dias ofrecer-. Es el efecto
  // que el Step 4 del plan pide comprobar a mano: cambiar la ventana aca y
  // verla reflejada en /catalogo/[id]/reservar, no en esta pantalla.
  //
  // LA RUTA ES DINAMICA (`[id]`), asi que hace falta el segundo parametro
  // 'page' con el patron de archivo -incluido el grupo de rutas `(alumno)`-,
  // no la URL literal: sin el, Next.js exigiria un `id` de producto exacto,
  // que esta funcion no tiene. Documentado en
  // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/
  // revalidatePath.md, seccion "Revalidating a Page path". Esto es lectura
  // de la documentacion de Next.js, no una medicion contra PostgREST.
  //
  // NO SE REVALIDA /admin/inventario ni sus formularios, aunque tambien leen
  // `app_settings` -leerSlotMinutes() en lib/admin/consultas.ts, para el
  // desplegable de buffer de crearProducto()/editarProducto()-: decision
  // deliberada, no un olvido. Ese desplegable es una CONVENIENCIA sobre una
  // relacion que la base no exige -Q-14 ya establece que `buffer_minutes` y
  // `slot_minutes` no estan atados por ningun `check`-, mientras que
  // `booking_window_days` SI cambia cuantos dias puede reservar el alumno de
  // verdad. Si esto resulta insuficiente, es un desvio a registrar, no un
  // hecho medido hoy.
  revalidatePath('/admin/ajustes');
  revalidatePath('/(alumno)/catalogo/[id]/reservar', 'page');

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin/horarios · el horario de cada sede (F3-T4, D-74/D-75)
// ─────────────────────────────────────────────────────────────────────────────

// Traduce los rechazos que `campus_hours` puede dar, mismo criterio que
// mensajeDeRechazoAjustes() mas arriba: texto propio SOLO para lo alcanzable
// desde esta pantalla, y lo no reconocido cae al CRUDO y nunca a un generico
// que escondiera una causa que nadie previo.
//
// SON DOS, Y UNO NO ES UN `check` DE TABLA sino un TRIGGER, lo cual cambia
// como se reconoce:
//
//   closes_at <= opens_at  -> constraint "campus_hours_orden", 23514
//   opens_at desalineada   -> trigger campus_hours_alineacion, tambien 23514
//                             pero SIN nombre de restriccion en el message
//
// Por eso el segundo se busca por su TEXTO -"no cae en un bloque"-, que lo
// escribe la migracion 33 y no Postgres. Buscarlo por el codigo no serviria:
// los dos son 23514.
//
// `campus_hours_weekday_check` NO lleva texto propio y no es un olvido: el
// `weekday` no sale de ningun campo del formulario, lo pone la fila de la
// tabla que se esta editando. Igual que `app_settings_slot_divisor`, es un
// rechazo que nadie puede provocar desde esta pantalla.
function mensajeDeRechazoHorario(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('campus_hours_orden')) {
    return 'La hora de cierre tiene que ser posterior a la de apertura.';
  }

  if (mensajeDelMotor.includes('no cae en un bloque')) {
    return 'La hora de apertura tiene que caer justo en un bloque. Ajusta sus minutos o cambia el tamaño del bloque en /admin/ajustes.';
  }

  return mensajeDelMotor;
}

// Las DOS rutas que hay que revalidar al tocar un horario, y la segunda es la
// que importa: el techo de la sede es de donde nace la rejilla del alumno
// -migracion 34-, asi que cambiarlo aca y no revalidar alli dejaria al alumno
// viendo el calendario viejo. Mismo par y mismo motivo que guardarAjustes().
function revalidarHorarios(): void {
  revalidatePath('/admin/horarios');
  revalidatePath('/(alumno)/catalogo/[id]/reservar', 'page');
}

// Guardar el horario de un dia de una sede. Es un UPSERT y no un INSERT
// porque la clave primaria de `campus_hours` es (campus_id, weekday): abrir un
// dia cerrado y cambiar el horario de uno abierto son la misma operacion desde
// la pantalla, y partirlas obligaria a que el formulario supiera cual de las
// dos esta haciendo.
//
// PIDE LA FILA DE VUELTA CON `.select()` Y TRATA EL VACIO COMO ERROR, mismo
// criterio que guardarAjustes(). El motivo esta MEDIDO en este proyecto y es
// contraintuitivo: una escritura que RLS no deja ver NO lanza 42501, filtra a
// cero filas y termina bien. Sin este chequeo, una llamada sin permiso
// contestaria exactamente igual que una que guardo.
export async function guardarHorarioDia(
  campusId: string,
  weekday: number,
  apertura: string,
  cierre: string,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campus_hours')
    .upsert(
      { campus_id: campusId, weekday, opens_at: apertura, closes_at: cierre },
      { onConflict: 'campus_id,weekday' },
    )
    .select();

  if (error) {
    return { error: mensajeDeRechazoHorario(error.message) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo guardar. Puede que no tengas permiso para hacerlo.' };
  }

  revalidarHorarios();

  return null;
}

// Cerrar un dia: se BORRA la fila, porque en este modelo "un dia sin fila es
// un dia cerrado" (D-75). No hay columna `cerrado` que poner en true, y anadir
// una seria inventar un tercer estado que ni las RPC ni D-76 conocen.
//
// NO PIDE CONFIRMACION AQUI: la pide la pantalla, que es donde el admin ve lo
// que va a pasar. Y NO comprueba si hay reservas ese dia -eso es D-92 y vale
// para los TURNOS, no para el techo de la sede-: cerrar un dia entero es una
// decision del admin sobre el servicio, del mismo genero que /admin/dias.
export async function cerrarDia(campusId: string, weekday: number): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('campus_hours')
    .delete()
    .eq('campus_id', campusId)
    .eq('weekday', weekday)
    .select();

  if (error) {
    return { error: mensajeDeRechazoHorario(error.message) };
  }

  // Cero filas aca tiene DOS causas y las dos son un problema que el admin
  // tiene que ver: o RLS no dejo borrar, o el dia ya estaba cerrado y la
  // pantalla esta pintando algo que la base no tiene. Un `null` silencioso
  // haria pasar las dos por exito.
  if (data.length === 0) {
    return {
      error: 'No se pudo cerrar el día. Puede que no tengas permiso, o que ya estuviera cerrado.',
    };
  }

  revalidarHorarios();

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin/horarios · los turnos del personal (D-74, D-90, D-92, D-93)
// ─────────────────────────────────────────────────────────────────────────────

// Traduce los rechazos que `staff_shifts` puede dar desde esta pantalla. Son
// DOS, y ninguno es el mismo que los de `campus_hours`:
//
//   ends_at <= starts_at -> constraint "staff_shifts_orden", 23514
//   staff_id inexistente -> constraint "staff_shifts_staff_id_fkey", 23503
//
// NO HAY RESTRICCION DE ALINEACION SOBRE LOS TURNOS, y no es un olvido: la
// rejilla nace de `campus_hours` y los turnos solo la RECORTAN, asi que un turno
// que empiece a las 09:07 no puede desalinear nada. Esta escrito en la cabecera
// de la migracion 33 y se repite aqui porque desde la pantalla parece que
// deberia haberla.
//
// TAMPOCO se traduce nada sobre solapes: dos turnos que se pisan son LEGALES y
// deseables -es el caso que D-90 existe para cubrir-, y la migracion 33 no puso
// ninguna exclusion.
function mensajeDeRechazoTurno(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('staff_shifts_orden')) {
    return 'La hora de fin del turno tiene que ser posterior a la de inicio.';
  }

  if (mensajeDelMotor.includes('staff_shifts_staff_id_fkey')) {
    return 'Esa persona ya no está en el personal.';
  }

  return mensajeDelMotor;
}

// El aviso de D-92, que cierra Q-21: cuantas reservas quedan DESCUBIERTAS si se
// borra o se acorta este turno. NO impide nada; el admin decide con el dato
// delante.
//
// LA CUENTA LA HACE LA BASE -public.reservas_descubiertas(), migracion 36- y no
// esta capa, y el motivo esta en la cabecera de esa migracion: la cobertura ya
// esta escrita dos veces en la 34 y una tercera copia en JavaScript seria la
// unica que nadie puede probar con pgTAP.
//
// `null` en las dos horas significa "el turno desaparece"; con valores, "el
// turno pasa a ser este". Una sola funcion para las dos operaciones, porque la
// pregunta es la misma.
//
// NO VA A SENTRY aunque el recuento falle: consultar el impacto de un cambio es
// una accion esperada del admin, no un incidente (regla 3 de errores). Si la
// consulta falla se devuelve `null` y la pantalla lo dice; inventar un 0 seria
// peor que no saber, porque el 0 es justamente la respuesta tranquilizadora.
export async function contarDescubiertas(
  turnoId: string,
  inicio: string | null,
  fin: string | null,
): Promise<number | null> {
  const supabase = await createClient();

  // OJO: los tipos generados declaran los dos `time` con DEFAULT como
  // `string | undefined`, no como `string | null`. Se omiten en vez de mandarse
  // en null, que es lo que PostgREST entiende por "usa el default" -- y el
  // default de la funcion es justamente NULL, o sea "el turno desaparece".
  const { data, error } =
    inicio === null || fin === null
      ? await supabase.rpc('reservas_descubiertas', { p_shift_id: turnoId })
      : await supabase.rpc('reservas_descubiertas', {
          p_shift_id: turnoId,
          p_starts_at: inicio,
          p_ends_at: fin,
        });

  if (error) {
    return null;
  }

  return data;
}

// Alta de un turno. SE OFRECE TODO EL PERSONAL ACTIVO, ADMIN INCLUIDO (D-93):
// `staff_shifts.staff_id` referencia `staff_members(user_id)` SIN filtro de rol,
// y nunca lo tuvo. Hoy el unico personal que existe en produccion es un admin,
// asi que atarlo al rol `operator` dejaria el calendario vacio para siempre.
//
// QUIEN FILTRA POR `activo` ES LA PANTALLA y no hay `check` en la base: la baja
// de personal es DESACTIVAR y nunca borrar, asi que un miembro desactivado
// conserva su fila y podria recibir turnos nuevos. Eso si se impide, y se impide
// donde se elige a la persona -el desplegable solo lista activos-. Sus turnos
// VIEJOS no se tocan: borrarlos perderia la constancia de que esa persona
// atendio ese dia.
export async function crearTurno(
  staffId: string,
  campusId: string,
  weekday: number,
  inicio: string,
  fin: string,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('staff_shifts')
    .insert({ staff_id: staffId, campus_id: campusId, weekday, starts_at: inicio, ends_at: fin })
    .select();

  if (error) {
    return { error: mensajeDeRechazoTurno(error.message) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo crear el turno. Puede que no tengas permiso para hacerlo.' };
  }

  revalidarHorarios();

  return null;
}

// Edicion: solo las horas. Cambiar de persona o de sede es borrar un turno y
// crear otro, y se deja asi a proposito: son turnos DISTINTOS, y tratarlos como
// el mismo haria que el aviso de D-92 midiera un cambio que no es el que se
// esta haciendo.
export async function guardarTurno(
  turnoId: string,
  inicio: string,
  fin: string,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('staff_shifts')
    .update({ starts_at: inicio, ends_at: fin })
    .eq('id', turnoId)
    .select();

  if (error) {
    return { error: mensajeDeRechazoTurno(error.message) };
  }

  // Cero filas es RLS filtrando en silencio, medido en este proyecto: un UPDATE
  // que la politica no deja ver NO lanza 42501, filtra a cero y termina bien.
  if (data.length === 0) {
    return { error: 'No se pudo guardar el turno. Puede que no tengas permiso para hacerlo.' };
  }

  revalidarHorarios();

  return null;
}

// Baja de un turno. AQUI SI SE BORRA LA FILA, al reves que con la baja de
// PERSONAL -que desactiva y nunca borra-, y la diferencia no es un descuido: la
// fila de `staff_members` es la constancia de que alguien fue personal y con que
// rol, mientras que un turno solo dice "esta persona atiende los martes", una
// afirmacion sobre el futuro que deja de ser cierta.
//
// NO SE IMPIDE AUNQUE HAYA RESERVAS DESCUBIERTAS (D-92). El aviso lo da la
// pantalla antes de llamar aqui; esta funcion no vuelve a contar ni a decidir.
// El argumento esta en D-92 y es cual de los dos danos es reversible: un turno
// huerfano deja a un alumno frente a un mostrador vacio -visible y arreglable-,
// e impedir el borrado deja al admin sin poder reflejar que alguien se fue,
// salvo cancelando reservas de alumnos una a una.
export async function borrarTurno(turnoId: string): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('staff_shifts').delete().eq('id', turnoId).select();

  if (error) {
    return { error: mensajeDeRechazoTurno(error.message) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo borrar el turno. Puede que no tengas permiso para hacerlo.' };
  }

  revalidarHorarios();

  return null;
}
