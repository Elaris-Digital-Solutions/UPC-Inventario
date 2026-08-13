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
