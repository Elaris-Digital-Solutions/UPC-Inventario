'use server';

// Server Actions del area de administracion (F7 de ESPECIFICACION_FUNCIONAL.md).
//
// POR QUE ACA Y NO EN lib/admin/ajustes.ts: ese archivo lo carga un test, y bajo
// Vitest el alias `@/` no resuelve, asi que un modulo probado no puede importar
// el cliente de servidor. La separacion es por lo que Vitest puede resolver, no
// por capas. Ver COMPORTAMIENTO_MEDIDO.md §5.

import { revalidatePath } from 'next/cache';

import { reservasVivas } from '@/lib/admin/dias';
import { particionarPorDia, type RolStaff } from '@/lib/admin/filtros';
import { hoyEnLima } from '@/lib/reservas/rejilla';
import { reportar } from '@/lib/seguridad/reportar';
import { createClient } from '@/lib/supabase/server';

// CINCO REGLAS QUE VALEN PARA TODO EL ARCHIVO. Se escriben una vez aqui en vez
// de repetirse en cada funcion que las aplica.
//
// 1. TRADUCCION DE RECHAZOS: texto propio SOLO para lo alcanzable desde la
//    pantalla; lo demas pasa por `reportar()`, que manda el CRUDO al log bajo
//    un id y devuelve un generico CON ese id.
//    ⚠ CORREGIDA EL 2026-08-23 (H-3). Antes decia "cae al mensaje CRUDO del
//    motor, nunca a un generico", y ese "nunca" era deliberado: un mapa de
//    traducciones que se queda viejo tiene que VERSE. El argumento se conserva
//    entero -- el crudo sigue completo, solo cambia de destinatario--, y el id
//    es lo que lo une al generico. Sin ese id esto seria un retroceso.
// 2. `.select()` Y VACIO COMO ERROR en cada escritura: RLS no deniega con 403,
//    devuelve 200 con `[]`. Sin el chequeo, "no tienes permiso" y "no habia
//    nada que cambiar" contestan igual. Ver COMPORTAMIENTO_MEDIDO.md §1.1.
// 3. COLUMNAS EXACTAS en INSERT y UPDATE. `created_by` y `updated_at` no estan
//    en ningun GRANT: mandarlas da 403/42501.
// 4. ORDEN ENTRE DOS ESCRITURAS SIN TRANSACCION: se elige el orden cuyo fallo
//    se VE. La API REST no da transaccion entre dos llamadas del cliente.
// 5. LOS CHEQUEOS DE IDENTIDAD SON VISIBILIDAD, NO CONTROL. Quien autoriza es
//    RLS; estos solo evitan pisar desde la pantalla lo que por SQL directo
//    sigue abierto.

export type ResultadoAdmin = { error: string } | null;

// `assetCode` y `nota` llegan como cadena -posiblemente vacia- y no como
// `string | null`: quien decide que una cadena vacia significa "sin codigo" es
// esta capa, no el componente.
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

// Un codigo repetido dentro del mismo producto da 23505/409. El mismo codigo en
// OTRO producto se acepta: la unicidad es (product_id, unit_code), no global.
// Ver COMPORTAMIENTO_MEDIDO.md §1.3.
function mensajeDeRechazoAdmin(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('inventory_units_product_id_unit_code_key')) {
    return 'Hay códigos de unidad repetidos. Dentro de un mismo producto cada código tiene que ser distinto.';
  }

  return mensajeDelMotor;
}

// Alta de producto con sus unidades, F7: "en un solo formulario".
//
// El orden lo obliga la FK. Peor caso (regla 4): UN PRODUCTO SIN UNIDADES, que
// el listado hace visible con su recuento por fila. No se borra el producto
// para "limpiar": ese borrado podria fallar tambien.
export async function crearProducto(
  datos: DatosProducto,
  unidades: UnidadNueva[],
): Promise<ResultadoAdmin | { productoId: string }> {
  const supabase = await createClient();

  const { data: producto, error: errorProducto } = await supabase
    .from('products')
    .insert({
      name: datos.nombre.trim(),
      // Vacia se guarda como NULL y no como cadena vacia: la columna es
      // NULLABLE y "sin categoria" ya tiene una representacion en el esquema.
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
    // UN SOLO INSERT CON ARRAY, no un bucle: una sentencia es atomica y un
    // bucle dejaria unidades a medias. Todas las filas llevan las MISMAS
    // claves -`asset_code` con `null` explicito, nunca omitida- o PostgREST
    // responde PGRST102. Ver COMPORTAMIENTO_MEDIDO.md §1.2.
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

  // Las notas necesitan el `id` de cada unidad, que solo existe una vez
  // insertadas. Se releen por `unit_code` y no por posicion: PostgREST no
  // promete devolver las filas en el orden en que se mandaron.
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

    const notas = conNota
      .map((u) => ({ unit_id: porCodigo.get(u.unitCode.trim()), note: u.nota.trim() }))
      .filter((n): n is { unit_id: string; note: string } => n.unit_id !== undefined);

    if (notas.length > 0) {
      const { error: errorNotas } = await supabase.from('inventory_unit_notes').insert(notas);

      // El producto y sus unidades YA existen: una nota inicial que no entra no
      // justifica dar el alta por fallida. Se devuelve el error para que el
      // admin pueda volver a anotar desde la pantalla de la unidad.
      if (errorNotas) {
        return { error: mensajeDeRechazoAdmin(errorNotas.message) };
      }
    }
  }

  revalidatePath('/admin/inventario');

  return { productoId: producto.id };
}

// LA BAJA DE UNA UNIDAD ES `retired`, NO UN DELETE, y no se puede hacer de otra
// forma: `inventory_reservations` no tiene GRANT ni politica de DELETE para
// nadie, y la FK `inventory_reservations_unit_id_fkey` no cascadea. La pantalla
// lo DICE en vez de limitarse a no ofrecer el boton.
//
// LA NOTA ES OBLIGATORIA por decision de esta capa, no del esquema: una unidad
// que desaparece del catalogo sin explicacion es justo lo que la trazabilidad
// existe para cubrir (D-2).
//
// PRIMERO la nota, DESPUES el estado (regla 4): asi el fallo deja una nota
// huerfana -recuperable-; al reves, una unidad retirada sin rastro de por que.
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

  const { error: errorNota } = await supabase
    .from('inventory_unit_notes')
    .insert({ unit_id: unitId, note: nota.trim() });

  if (errorNota) {
    return { error: reportar('cambiarEstadoUnidad', errorNota) };
  }

  const { error: errorEstado } = await supabase
    .from('inventory_units')
    .update({ status: estado })
    .eq('id', unitId);

  if (errorEstado) {
    return { error: mensajeDeRechazoAdmin(errorEstado.message) };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  // Tambien el listado: sus recuentos por estado cambian con esto.
  revalidatePath('/admin/inventario');

  return null;
}

// Alta de una unidad suelta sobre un producto que ya existe (F7).
//
// No hace falta comprobar contra el inventario entero: la unicidad es
// (product_id, unit_code), asi que la restriccion ya acota al producto correcto.
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

  // OPCIONAL aca, al reves que en cambiarEstadoUnidad(): dar de alta una unidad
  // nueva no esconde nada que haya que explicar, y retirarla si.
  if (unidad.nota.trim() !== '') {
    const { error: errorNota } = await supabase
      .from('inventory_unit_notes')
      .insert({ unit_id: data.id, note: unidad.nota.trim() });

    // La unidad YA existe: la nota que no entra no invalida el alta.
    if (errorNota) {
      return { error: reportar('agregarUnidad', errorNota) };
    }
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Edicion de los datos del producto.
//
// El formulario vuelve a filtrar el buffer por multiplosDeSlot(), igual que el
// alta: editar es OTRA PUERTA a `buffer_minutes`, y dejarla sin filtro reabriria
// Q-14 por detras.
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

// ─────────────────────────────────────────────────────────────────────────────
// Imagenes (F7). EL ARCHIVO NUNCA PASA POR ESTE SERVIDOR: el navegador pide la
// firma a /api/cloudinary/firma, sube DIRECTO a Cloudinary y solo entonces llama
// a registrarImagen(). Por eso ninguna de estas acciones recibe un binario.
// ─────────────────────────────────────────────────────────────────────────────

// Lo que Cloudinary devuelve tras una subida y se guarda tal cual.
export type ImagenSubida = {
  publicId: string;
  secureUrl: string;
  format: string | null;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

// GUARDA `cloudinary_public_id`, que es lo que hoy falta en produccion: las 34
// imagenes reales lo tienen en NULL, asi que estan en Cloudinary y nadie puede
// identificarlas alli. Las que pasen por aca si.
//
// `is_main` se decide contando: la primera imagen de un producto nace principal.
// Sin esto un producto recien creado se quedaria SIN principal.
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
    return { error: reportar('registrarImagen', errorConteo) };
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
    return { error: reportar('registrarImagen', error) };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Marca UNA imagen como principal.
//
// "Una sola principal por producto" NO LA DEFIENDE LA BASE: `product_images` no
// tiene ninguna restriccion sobre `is_main` (COMPORTAMIENTO_MEDIDO.md §1.3).
//
// PRIMERO apagar todas, DESPUES encender la elegida (regla 4): asi un fallo deja
// el producto SIN principal, que el catalogo degrada de forma visible; al reves
// dejaria DOS principales, incoherente y silencioso.
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
    return { error: reportar('fijarPrincipal', errorApagar) };
  }

  const { error: errorEncender } = await supabase
    .from('product_images')
    .update({ is_main: true })
    .eq('id', imagenId);

  if (errorEncender) {
    return { error: reportar('fijarPrincipal', errorEncender) };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Reordena las imagenes de un producto.
//
// RECIBE EL ORDEN COMPLETO y no "sube esta una posicion": la pantalla manda el
// estado final que quiere, no una secuencia de movimientos que podria aplicarse
// sobre un orden distinto del que el admin estaba viendo.
//
// SIN `upsert`: obligaria a mandar todas las columnas NOT NULL de cada fila. Son
// UPDATE por id. Con las galerias reales el costo es irrelevante; con decenas de
// imagenes esto pediria una RPC.
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

    // Se corta al primer fallo: seguir dejaria un orden a medias y el admin no
    // sabria cual de las dos mitades esta viendo.
    if (error) {
      return { error: reportar('reordenarImagenes', error) };
    }
  }

  revalidatePath(`/admin/inventario/${productoId}`);

  return null;
}

// Borra la FILA de la imagen. NO borra nada en Cloudinary, y no es una omision:
// F7 lo dice literal, y ademas seria imposible para las 34 imagenes reales, que
// no guardan `cloudinary_public_id`.
export async function borrarImagen(
  productoId: string,
  imagenId: string,
): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { error } = await supabase.from('product_images').delete().eq('id', imagenId);

  if (error) {
    return { error: reportar('borrarImagen', error) };
  }

  revalidatePath(`/admin/inventario/${productoId}`);
  revalidatePath('/admin/inventario');

  return null;
}

// Adaptador para useActionState. crearProducto() se queda como el nucleo TIPADO
// -recibe datos ya convertidos y no sabe nada de FormData- y esto solo traduce.
//
// LAS UNIDADES VIAJAN COMO CAMPOS REPETIDOS y se leen con getAll(): el orden es
// el del DOM, que es el que el admin ve, y agregar o quitar una fila no obliga a
// renumerar indices que podrian desincronizarse.
//
// Los tres arrays se recorren por el indice del PRIMERO: con el DOM manipulado a
// mano, las filas de mas se ignoran en vez de crear unidades con la sede de otra.
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
  // formulario nace con una fila en blanco, y quien solo quiere dar de alta el
  // producto no tiene por que borrarla a mano.
  const unidades: UnidadNueva[] = codigos
    .map((unitCode, i) => ({
      unitCode,
      assetCode: assetCodes[i] ?? '',
      campusId: campusIds[i] ?? '',
      nota: notas[i] ?? '',
    }))
    .filter((u) => u.unitCode.trim() !== '');

  // El repetido se detecta ACA ademas de en el motor, y no es duplicacion
  // ociosa: la base rechaza el array ENTERO con 23505 y ese mensaje no dice
  // CUAL codigo se repitio. La barrera de verdad sigue siendo la base.
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
// /admin/reservas (F6)
// ─────────────────────────────────────────────────────────────────────────────

// Mismo texto que mensajeDeRechazoMostrador(): es el mismo trigger sobre la
// misma tabla. SE REPITE EN VEZ DE IMPORTARSE porque aquella es privada de un
// archivo con 'use server', y exportarla la convertiria en una Server Action
// invocable desde el navegador.
function mensajeDeRechazoReserva(mensajeDelMotor: string): string {
  if (mensajeDelMotor.startsWith('Transicion no permitida:')) {
    return 'Esta reserva ya cambió de estado, probablemente porque alguien la actualizó primero. Actualiza la página para ver su estado actual.';
  }

  return mensajeDelMotor;
}

// UPDATE DIRECTO y no una RPC: `reservations_update_staff` le aplica al admin
// (D-16) y el GRANT de columna cubre `status`. No es que un UPDATE sea seguro en
// abstracto: es que aca hay una politica que le abre esa puerta a quien llama.
//
// EL TIPO ADMITE SOLO TRES VALORES; los otros tres del enum quedan fuera a
// proposito: `cancelled` va por cancelarReserva() -exige motivo-, `not_returned`
// por marcarNoDevuelta() -exige la nota de F5 ANTES del cambio-, y `reserved` no
// es destino de ninguna transicion valida.
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
// NO REUTILIZA mensajeDeRechazoCancelacion() de lib/reservas/acciones.ts: SUS
// TEXTOS ESTAN ESCRITOS PARA EL ALUMNO -uno termina en "contacta con el
// personal", y aca el personal es quien lo lee-.
//
// De los cinco rechazos de la RPC solo UNO es alcanzable: la carrera en la que
// alguien entrega el equipo mientras el admin tiene la pantalla abierta.
//
// Empareja por PREFIJO porque el motor interpola el estado al final, y por TEXTO
// y no por SQLSTATE porque `23514` lo comparten tres de los cinco.
function mensajeDeRechazoCancelacionAdmin(mensajeDelMotor: string): string {
  if (mensajeDelMotor.startsWith('Solo se cancela una reserva en estado reserved (esta en ')) {
    // DICE QUE SI SE PUEDE HACER: el admin tiene las otras dos salidas en la
    // misma fila, asi que el mensaje lo lleva a ellas en vez de dejarlo parado.
    return 'El equipo ya se entregó, y una reserva entregada no se puede cancelar: la base no admite ese cambio. Ciérrala desde esta misma fila como «Devuelta» o como «No se devolvió», según lo que haya pasado.';
  }

  return mensajeDelMotor;
}

// La cancelacion con motivo (F6).
//
// POR LA RPC y no por un UPDATE directo: las dos puertas estan abiertas para el
// personal, asi que la diferencia NO es la atomicidad, es que la RPC ya trae
// escrita la validacion del motivo y reescribirla dejaria dos copias.
//
// NADIE puede cancelar una reserva ya entregada, por ninguna de las dos puertas
// (COMPORTAMIENTO_MEDIDO.md §2). Por eso el desplegable solo la ofrece sobre
// `reserved`.
export async function cancelarReserva(
  reservationId: string,
  motivo: string,
): Promise<ResultadoAdmin> {
  // Barrera de SERVIDOR, aunque el dialogo ya deshabilite el boton y la RPC lo
  // rechace por su cuenta: esta es la que da un mensaje util en vez del crudo.
  const motivoRecortado = motivo.trim();
  if (motivoRecortado === '') {
    return { error: 'Explica por qué se cancela: el alumno va a leer este motivo.' };
  }

  const supabase = await createClient();

  // Se manda RECORTADO: la RPC guarda `cancellation_reason = p_reason` tal cual
  // -el `btrim` solo decide el rechazo-, asi que sin esto un espacio de mas se
  // guardaria dentro y se veria al leerlo.
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
// /admin/dias (F8, D-40)
// ─────────────────────────────────────────────────────────────────────────────

// Una fecha ya inhabilitada da 23505/409 sobre `disabled_days_date_key`.
function mensajeDeRechazoDia(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('disabled_days_date_key')) {
    return 'Ese día ya está inhabilitado.';
  }

  return mensajeDelMotor;
}

// D-47: el motivo del dia viaja al `cancellation_reason` que lee el alumno.
//
// Admite `null` porque asi es `disabled_days.reason` en el esquema: D-46 hace
// obligatorio lo que se ESCRIBE desde hoy, pero quedan filas historicas con
// `reason` en NULL. La rama vacia es inalcanzable desde inhabilitarDia() -su
// barrera corta antes-; se escribe tolerante porque el tipo describe la COLUMNA,
// no esta unica llamada.
function textoCancelacionPorDiaInhabilitado(motivo: string | null): string {
  const motivoLimpio = motivo?.trim() ?? '';

  return motivoLimpio === ''
    ? 'Cancelado por la administración (Día inhabilitado)'
    : `Cancelado por la administración (Día inhabilitado: ${motivoLimpio})`;
}

// Inhabilita un dia (F8, corregida por D-40) y cancela solas las reservas
// `reserved` de esa fecha. Las `active` -equipo ya entregado- se respetan:
// `active -> cancelled` no es una transicion valida, asi que incluirlas haria
// fallar la sentencia ENTERA. Ver COMPORTAMIENTO_MEDIDO.md §1.2.
export async function inhabilitarDia(fecha: string, motivo: string): Promise<ResultadoAdmin> {
  // D-46: el motivo es OBLIGATORIO. Barrera de SERVIDOR, aunque la pantalla ya
  // deshabilite el boton.
  const motivoRecortado = motivo.trim();
  if (motivoRecortado === '') {
    return {
      error:
        'Explica por qué se inhabilita el día: el motivo es obligatorio y queda escrito en la reserva de cada alumno afectado.',
    };
  }

  // NO ES UN CONTROL -la base no tiene ningun `check` sobre `date`-, es
  // VISIBILIDAD: inhabilitar ayer no cancela nada util.
  //
  // `hoyEnLima()` recibe `new Date()` DIRECTO y no un `ahora` por parametro, al
  // reves que las funciones puras: esta es una Server Action, el borde donde
  // "ahora" tiene que ser el instante del envio. Si el admin deja la pestaña
  // abierta de un dia para otro, el `ahora` que bajo por props ya esta viejo.
  const hoy = hoyEnLima(new Date());
  if (fecha < hoy) {
    return { error: 'No puedes inhabilitar un día que ya pasó.' };
  }

  const supabase = await createClient();

  const { error: errorDia } = await supabase
    .from('disabled_days')
    .insert({ date: fecha, reason: motivoRecortado });

  // Sin dia, no hay nada que cancelar.
  if (errorDia) {
    return { error: mensajeDeRechazoDia(errorDia.message) };
  }

  // EL DIA PRIMERO, LAS CANCELACIONES DESPUES, por su peor caso: asi un fallo
  // deja un dia inhabilitado con reservas vivas dentro -acotado, porque el dia
  // ya no admite reservas nuevas, y se cancelan a mano desde /admin/reservas-.
  // Al reves quedarian alumnos sin reserva en un dia que sigue habilitado, sin
  // rastro de por que e irreversible sin tocar la base.
  //
  // Esto es RAZONAMIENTO sobre un fallo que no se provoco, no algo medido.
  const vivas = await reservasVivas();
  const { reservadas } = particionarPorDia(vivas, fecha);

  if (reservadas.length > 0) {
    // LA LISTA DE IDS LA CALCULA EL SERVIDOR, releyendo y particionando de nuevo
    // aca: quien se cancela no lo decide un array que viajo por el navegador.
    // Esta funcion ni siquiera lo recibe como parametro.
    //
    // UNA SOLA sentencia y no un bucle: las dos columnas viajan JUNTAS en un
    // PATCH, que es lo que exige que cancelar lleve motivo -el trigger las ve a
    // la vez-. Un bucle dejaria cancelaciones a medias.
    //
    // EL `.eq('status', 'reserved')` ES DOBLEMENTE NECESARIO: por D-40 -solo se
    // cancela lo no retirado- y como SEGURO contra la carrera. Si entre leer y
    // escribir alguien entrega el equipo, esa reserva sale del resultado en vez
    // de tumbar la sentencia entera y llevarse por delante las que si eran
    // posibles.
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
      return { error: reportar('inhabilitarDia', errorCancelar) };
    }
  }

  revalidatePath('/admin/dias');
  revalidatePath('/admin/reservas');
  // Y /mi-panel: es la unica pantalla donde el alumno ve su reserva cancelada.
  revalidatePath('/mi-panel');

  return null;
}

// Revierte un dia inhabilitado (F8: "los futuros se pueden revertir").
//
// Regla 2: sin el chequeo del vacio, un operador sin permiso veria la pantalla
// contestar sin queja y el dia seguiria inhabilitado.
export async function habilitarDia(fecha: string): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  const { data, error } = await supabase.from('disabled_days').delete().eq('date', fecha).select();

  if (error) {
    return { error: reportar('habilitarDia', error) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo revertir el día. Puede que ya no exista, o que no tengas permiso para hacerlo.' };
  }

  // REVERTIR NO DESCANCELA NADA: `cancelled` es terminal en la maquina de
  // estados. La pantalla tiene que decirlo ANTES de que el admin pulse.
  revalidatePath('/admin/dias');

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin/personal (D-52, D-53)
// ─────────────────────────────────────────────────────────────────────────────

// Los dos rechazos del alta dan el MISMO HTTP -409- y codigos distintos, asi que
// se distinguen por el nombre de la restriccion y no por el status: `pkey` es
// "ya es personal", `user_id_fkey` es "esa cuenta ya no existe".
function mensajeDeRechazoPersonal(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('staff_members_pkey')) {
    return 'Esa persona ya es parte del personal.';
  }

  if (mensajeDelMotor.includes('staff_members_user_id_fkey')) {
    // NO es "todavia no tiene acceso": cuando este codigo llega, ya se leyo un
    // `auth_user_id` que existia. Si el motor rechaza igual es porque la cuenta
    // desaparecio en el medio.
    return 'Esa cuenta ya no existe en el sistema de acceso. Puede haberse eliminado justo después de que la buscaste; vuelve a intentarlo.';
  }

  return mensajeDelMotor;
}

// Alta de personal (D-53: se busca por el CORREO COMPLETO, nunca con un buscador
// incremental ni trayendo todos los alumnos, para que ninguna lectura de
// `alumnos` quede expuesta como endpoint invocable desde el navegador).
//
// EL CORREO SE NORMALIZA antes de buscar: el trigger handle_new_auth_user guarda
// `alumnos.email` en minusculas.
//
// TRES CAUSAS DISTINTAS para "no se puede dar de alta", con tres mensajes porque
// cada una la arregla una persona distinta:
//   1. No hay fila en `alumnos`: nunca pidio su enlace, o su correo no es
//      @upc.edu.pe -el trigger solo crea la fila para ese dominio, asi que
//      buscar ahi ya filtra el dominio sin escribir ninguna comprobacion-.
//   2. La fila existe con `auth_user_id` en null: nunca llego a pedir el magic
//      link, que es lo que rellena esa columna.
//   3. El motor rechaza el INSERT: ya es personal, o la cuenta desaparecio en
//      medio de la carrera. Los traduce mensajeDeRechazoPersonal().
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
    return { error: reportar('darDeAltaPersonal', errorAlumno) };
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

// Cambia el rol de alguien que YA es personal (D-52).
export async function cambiarRolPersonal(userId: string, rol: RolStaff): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  // Regla 5. RLS SI deja al admin tocar su propia fila, y despues no hay forma
  // de revertirlo desde la aplicacion: al desactivarse deja de cumplir
  // `private.is_admin()`. Con un solo admin en produccion, ese clic deja a todo
  // el personal sin panel.
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  if (sub === userId) {
    return { error: 'No puedes cambiar tu propio rol desde aquí.' };
  }

  // SIN mensajeDeRechazoPersonal(): esa traduccion es para el INSERT del alta, y
  // ninguno de sus dos codigos es alcanzable desde un UPDATE de `role`.
  const { data, error } = await supabase
    .from('staff_members')
    .update({ role: rol })
    .eq('user_id', userId)
    .select();

  if (error) {
    return { error: reportar('cambiarRolPersonal', error) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo cambiar el rol. Puede que esa persona ya no sea parte del personal.' };
  }

  revalidatePath('/admin/personal');

  return null;
}

// `activo=false` es la baja de verdad, no un simulacro: `private.is_staff()` y
// `private.current_staff_role()` exigen `activo`, asi que desactivar corta el
// acceso sin depender de esta pantalla ni de ningun control del cliente.
export async function cambiarActivoPersonal(userId: string, activo: boolean): Promise<ResultadoAdmin> {
  const supabase = await createClient();

  // Regla 5, mismo caso que cambiarRolPersonal().
  const { data: claims } = await supabase.auth.getClaims();
  const sub = claims?.claims.sub;

  if (sub === userId) {
    return { error: 'No puedes cambiar tu propio acceso desde aquí.' };
  }

  // SIN mensajeDeRechazoPersonal(), mismo motivo que cambiarRolPersonal().
  const { data, error } = await supabase
    .from('staff_members')
    .update({ activo })
    .eq('user_id', userId)
    .select();

  if (error) {
    return { error: reportar('cambiarActivoPersonal', error) };
  }

  if (data.length === 0) {
    return { error: 'No se pudo cambiar el acceso. Puede que esa persona ya no sea parte del personal.' };
  }

  revalidatePath('/admin/personal');

  return null;
}

// POR QUE ESTA PANTALLA NO OFRECE UN DELETE, Y NO ES UN OLVIDO: el privilegio
// esta concedido y `staff_admin_all` es `for all`, asi que el admin SI podria
// borrar la fila por la API. No se ofrece porque `activo=false` ya corta el
// acceso, y borrar pierde la UNICA constancia de que ese uuid fue personal y con
// que rol -el historial no se rompe: `changed_by` y `created_by` son FK a
// `auth.users`, no a `staff_members`-.

// ─────────────────────────────────────────────────────────────────────────────
// /admin/ajustes (D-54, Q-19)
// ─────────────────────────────────────────────────────────────────────────────

// LOS CINCO SON `23514` y se distinguen por el NOMBRE de la restriccion en el
// `message`, nunca por el HTTP ni por el codigo.
//
// UNO NO ES UN `check` DE TABLA sino un TRIGGER: `app_settings_respeta_horarios`
// impide bajar `slot_minutes` si eso dejaria aperturas de `campus_hours` sin
// alinear. Su `message` NO trae nombre de restriccion, asi que se reconoce por
// su texto, que lo escribe esta casa y no Postgres.
//
// `app_settings_slot_divisor` NO LLEVA TEXTO PROPIO y no es un olvido: no es
// alcanzable desde esta pantalla, porque `slot_minutes` es un DESPLEGABLE de los
// ocho valores legales y no un campo libre. Si algun dia fuera libre, caeria al
// mensaje CRUDO hasta que alguien le escriba el suyo. Mismo criterio para los
// otros `check` de la tabla que ninguna barrera deja llegar.
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

// Los CINCO ajustes globales de reserva (D-39/Q-14 y M-12/D-70).
//
// ERAN SIETE (D-91): apertura y cierre ya no se editan aqui, el horario dejo de
// ser global y vive en `campus_hours` por sede y por dia (D-74). Con ellos se
// fue la barrera de servidor de D-54, que no se ha perdido: la aplican dos
// disparadores en la base, que es donde Q-19 pedia que estuviera.
//
// `.eq('id', true)` ES OBLIGATORIO: un PATCH sin filtro devuelve 400/`21000`
// "UPDATE requires a WHERE clause". Sin el, esta pantalla fallaria SIEMPRE, con
// typecheck, lint y build en verde.
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

  // DOS revalidatePath: estos ajustes los lee TAMBIEN el calendario del alumno,
  // no solo esta pantalla.
  //
  // La ruta es DINAMICA, asi que hace falta el segundo parametro 'page' con el
  // patron de archivo -grupo `(alumno)` incluido-, no la URL literal.
  //
  // NO se revalida /admin/inventario aunque tambien lea `app_settings`: ese
  // desplegable de buffer es una conveniencia sobre una relacion que la base no
  // exige (Q-14), mientras que `booking_window_days` si cambia cuantos dias
  // puede reservar el alumno de verdad.
  revalidatePath('/admin/ajustes');
  revalidatePath('/(alumno)/catalogo/[id]/reservar', 'page');

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// /admin/horarios · el horario de cada sede (D-74, D-75)
// ─────────────────────────────────────────────────────────────────────────────

// SON DOS, Y UNO NO ES UN `check` DE TABLA sino un TRIGGER, lo cual cambia como
// se reconoce: `campus_hours_orden` trae nombre de restriccion, y la alineacion
// no -se busca por su texto, que lo escribe esta casa-. Los dos son 23514.
//
// `campus_hours_weekday_check` no lleva texto propio: el `weekday` no sale de
// ningun campo del formulario, lo pone la fila que se esta editando.
function mensajeDeRechazoHorario(mensajeDelMotor: string): string {
  if (mensajeDelMotor.includes('campus_hours_orden')) {
    return 'La hora de cierre tiene que ser posterior a la de apertura.';
  }

  if (mensajeDelMotor.includes('no cae en un bloque')) {
    return 'La hora de apertura tiene que caer justo en un bloque. Ajusta sus minutos o cambia el tamaño del bloque en /admin/ajustes.';
  }

  return mensajeDelMotor;
}

// La segunda ruta es la que importa: el techo de la sede es de donde nace la
// rejilla del alumno, asi que cambiarlo sin revalidar alli lo deja viendo el
// calendario viejo.
function revalidarHorarios(): void {
  revalidatePath('/admin/horarios');
  revalidatePath('/(alumno)/catalogo/[id]/reservar', 'page');
}

// UPSERT y no INSERT porque la clave de `campus_hours` es (campus_id, weekday):
// abrir un dia cerrado y cambiar el horario de uno abierto son la misma
// operacion desde la pantalla.
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

// Cerrar un dia BORRA la fila: en este modelo "un dia sin fila es un dia
// cerrado" (D-75). Anadir una columna `cerrado` seria inventar un tercer estado
// que ni las RPC ni D-76 conocen.
//
// NO comprueba si hay reservas ese dia: eso es D-92 y vale para los TURNOS, no
// para el techo de la sede.
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

  // Cero filas tiene DOS causas y las dos son un problema que el admin tiene que
  // ver: o RLS no dejo borrar, o la pantalla esta pintando algo que la base no
  // tiene.
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

// NO HAY RESTRICCION DE ALINEACION SOBRE LOS TURNOS, y no es un olvido: la
// rejilla nace de `campus_hours` y los turnos solo la RECORTAN, asi que un turno
// que empiece a las 09:07 no puede desalinear nada.
//
// TAMPOCO hay nada sobre solapes: dos turnos que se pisan son LEGALES y
// deseables, que es el caso que D-90 existe para cubrir.
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
// LA CUENTA LA HACE LA BASE y no esta capa: la cobertura ya esta escrita dos
// veces en SQL, y una tercera copia en JavaScript seria la unica que nadie puede
// probar con pgTAP.
//
// `null` en las dos horas significa "el turno desaparece"; con valores, "el
// turno pasa a ser este".
//
// NO VA A SENTRY aunque falle: consultar el impacto de un cambio es una accion
// esperada, no un incidente. Se devuelve `null` y la pantalla lo dice; inventar
// un 0 seria peor, porque el 0 es justamente la respuesta tranquilizadora.
export async function contarDescubiertas(
  turnoId: string,
  inicio: string | null,
  fin: string | null,
): Promise<number | null> {
  const supabase = await createClient();

  // Los tipos generados declaran los dos `time` con DEFAULT como
  // `string | undefined`, no `string | null`. Se omiten en vez de mandarse en
  // null, que es lo que PostgREST entiende por "usa el default".
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

// SE OFRECE TODO EL PERSONAL ACTIVO, ADMIN INCLUIDO (D-93): `staff_shifts` no
// filtra por rol y nunca lo hizo. Hoy el unico personal en produccion es un
// admin, asi que atarlo a `operator` dejaria el calendario vacio para siempre.
//
// QUIEN FILTRA POR `activo` ES LA PANTALLA y no hay `check` en la base: la baja
// de personal es DESACTIVAR, asi que un miembro desactivado conserva su fila y
// podria recibir turnos nuevos. Sus turnos VIEJOS no se tocan: borrarlos
// perderia la constancia de que esa persona atendio ese dia.
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

// Solo las horas. Cambiar de persona o de sede es borrar un turno y crear otro,
// a proposito: son turnos DISTINTOS, y tratarlos como el mismo haria que el
// aviso de D-92 midiera un cambio que no es el que se esta haciendo.
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

  if (data.length === 0) {
    return { error: 'No se pudo guardar el turno. Puede que no tengas permiso para hacerlo.' };
  }

  revalidarHorarios();

  return null;
}

// AQUI SI SE BORRA LA FILA, al reves que con la baja de PERSONAL: la fila de
// `staff_members` es la constancia de que alguien fue personal y con que rol,
// mientras que un turno solo dice "esta persona atiende los martes", una
// afirmacion sobre el futuro que deja de ser cierta.
//
// NO SE IMPIDE AUNQUE HAYA RESERVAS DESCUBIERTAS (D-92): el aviso lo da la
// pantalla antes de llamar aqui. El argumento es cual de los dos danos es
// reversible: un turno huerfano deja a un alumno frente a un mostrador vacio
// -visible y arreglable-, e impedir el borrado deja al admin sin poder reflejar
// que alguien se fue.
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
