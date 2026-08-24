import { NextResponse } from "next/server";

import { firmar } from "@/lib/cloudinary/firma";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════════════════
// YA NO ES "EL UNICO SITIO DONDE EL CLIENTE DECIDE". Corregido el 2026-08-23.
// ═══════════════════════════════════════════════════════════════════════════
//
// Hasta hoy esta cabecera abria diciendo que este handler era la excepcion del
// proyecto: que en todo lo demas autoriza RLS, y que aqui no, porque este
// archivo no habla con Postgres sino con Cloudinary y no hay ninguna politica
// detras que lo detenga. LA DESCRIPCION ERA EXACTA y la excepcion era real:
// leia `staff_members` y decidia en TypeScript.
//
// Lo que cambio es el diseno, no la lectura. H-2 movio la decision a
// `public.pedir_firma_cloudinary()`, que comprueba `private.is_admin()` y cuenta
// la firma en la misma transaccion. Quien autoriza volvio a ser la base, y este
// archivo pasa a hacer lo que hacen todos los demas: obedecer.
//
// LO QUE SIGUE SIENDO CIERTO, y no hay que perderlo de vista: detras de esta
// ruta no hay una tabla con RLS, hay una cuenta de Cloudinary que PAGA la
// universidad. Si alguien quita la llamada a la RPC de abajo, no aparece una
// pantalla vacia ni un 401: aparecen subidas ilimitadas y una factura.
//
// EL SECRETO NO SALE DE AQUI. `CLOUDINARY_API_SECRET` no lleva `NEXT_PUBLIC_` y
// no puede llevarlo: ese prefijo INLINEA la variable en el bundle del navegador
// (D-28), que es el defecto P0-4 con otro nombre. La respuesta devuelve `apiKey`,
// que es publica, pero NUNCA el secreto.

// SIN PARAMETRO `request`, Y ES UNA PROPIEDAD DE SEGURIDAD: este handler NO LEE
// NADA DEL CLIENTE. El `timestamp` lo pone el reloj del servidor y el `folder`
// sale del entorno, asi que el navegador no puede pedir una firma para otra
// carpeta ni para ningun parametro que se le ocurra.
//
// ═══════════════════════════════════════════════════════════════════════════
// LA RUTA ES `/firmas` EN PLURAL DESDE EL 2026-08-23 (H-7), y NO devuelve 201.
// ═══════════════════════════════════════════════════════════════════════════
//
// El plural sale de las reglas de API REST del curso de Ingenieria de Software
// -Teoria05, §1.5, regla 1-. Es la unica ruta de API del proyecto y era la unica
// que se apartaba.
//
// EL 200 SE QUEDA, Y ESO CONTRADICE LA PRIMERA LECTURA DE ESA MISMA GUIA, que
// dice "201 Created para POST". La guia define 201 como "crea un recurso nuevo,
// devuelve el recurso creado" y recomienda acompanarlo del header `Location`.
//
// AQUI NO SE CREA NINGUN RECURSO DIRECCIONABLE: una firma es un COMPUTO
// efimero -HMAC sobre un timestamp-, no queda guardada en ninguna parte y no hay
// nada que pedir despues con un GET. No existe URL que poner en `Location`, y
// un 201 afirmaria que algo nacio y se puede ir a buscar. SERIA UNA MENTIRA
// SOBRE LO QUE PASO, y el codigo de estado es justo lo que el cliente lee para
// saber que paso.
//
// Aplicar una regla sin su condicion es peor que no aplicarla. Si algun dia esto
// llega a guardar la firma emitida -por ejemplo para auditarla-, entonces si.
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  // 401 y no 403: sin sesion no se sabe QUIEN es, asi que la respuesta correcta
  // es "identificate", no "no puedes".
  //
  // RAMA INALCANZABLE DESDE FUERA: la lista blanca de proxy.ts no declara esta
  // ruta, asi que una peticion sin sesion recibe un 307 a /login antes de llegar
  // aqui. Se deja escrita como defensa en profundidad: si alguien añadiera `/api`
  // a esa lista, esto es lo que evita que el cambio regale firmas.
  if (!sub) {
    return NextResponse.json({ error: "Hace falta iniciar sesión." }, { status: 401 });
  }

  // UNA RPC Y NO UNA CONSULTA A `staff_members` DESDE EL 2026-08-23 (H-2).
  //
  // Antes, este archivo leia la fila de `staff_members` y decidia aqui. La
  // cabecera de arriba lo declaraba como la excepcion del proyecto: "el unico
  // sitio donde el cliente decide". YA NO LO ES. `pedir_firma_cloudinary()`
  // comprueba `private.is_admin()` y cuenta la firma en LA MISMA TRANSACCION,
  // asi que no hay ventana entre comprobar y contar, y quien autoriza vuelve a
  // ser la base.
  const { error: errorPermiso } = await supabase.rpc("pedir_firma_cloudinary");

  if (errorPermiso) {
    // 429 y no 403 cuando lo que sobro fue el ritmo: el cliente tiene que poder
    // distinguir "no puedes" de "no tan rapido". Se empareja por el SQLSTATE
    // `54000`, elegido en la migracion justo por no compartirlo nadie mas.
    //
    // Se compara SOLO el `code`, nunca el texto del mensaje: es la regla 2 de
    // lib/reservas/acciones.ts al reves, y a proposito. Alli el emparejamiento
    // va por texto porque `23514` lo comparten varios rechazos distintos; aqui
    // el `54000` se eligio para que no lo comparta nadie, asi que el codigo
    // basta y ademas sobrevive a que alguien reescriba el mensaje.
    //
    // Un error de RED llega sin `code`, no entra en esta rama y cae al 403 de
    // abajo. No es lo ideal -es un fallo de infraestructura, no de permiso-,
    // pero el mensaje generico no miente sobre nada y la alternativa seria
    // clasificar fallos de red aqui, que no es el trabajo de este archivo.
    if (errorPermiso.code === "54000") {
      return NextResponse.json(
        { error: "Demasiadas subidas seguidas. Espera unos minutos y vuelve a intentarlo." },
        { status: 429 },
      );
    }

    // 403 y no 404: la sesion es valida y la ruta existe; lo que falta es el
    // permiso. Y ESTE es el rechazo que cierra P0-4 -- un alumno con sesion
    // legitima pidiendo una firma.
    //
    // El mensaje NO reenvia `errorPermiso.message`: seria devolver el crudo del
    // motor al navegador, que es justo lo que cerro H-3.
    return NextResponse.json(
      { error: "Solo un administrador puede subir imágenes." },
      { status: 403 },
    );
  }

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const folder = process.env.CLOUDINARY_FOLDER ?? "";

  // 500 con un mensaje que NO nombra cual falta: enumerar las variables ausentes
  // le contaria a quien pregunte como se llama cada una. El detalle va al log.
  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "[cloudinary/firmas] Falta configuracion de Cloudinary en el entorno del servidor.",
    );
    return NextResponse.json(
      { error: "La subida de imágenes no está configurada en este entorno." },
      { status: 500 },
    );
  }

  // El `timestamp` lo pone EL SERVIDOR: Cloudinary rechaza una firma cuyo
  // timestamp se aleje de su reloj, y dejarselo al navegador solo añadiria una
  // forma de fallar por el reloj de la maquina del admin.
  //
  // SEGUNDOS, no milisegundos: la misma trampa del epoch que ya costo un
  // PGRST303, con otra cara -alli la zona, aqui la unidad-.
  const timestamp = Math.floor(Date.now() / 1000);

  // Se firma EXACTAMENTE lo que la subida va a mandar: un parametro firmable de
  // mas daria otra firma y Cloudinary rechazaria.
  const params: Record<string, string | number> = { timestamp, folder };
  const signature = await firmar(params, apiSecret);

  return NextResponse.json({
    timestamp,
    signature,
    apiKey,
    cloudName,
    folder,
  });
}
