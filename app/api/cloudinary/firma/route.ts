import { NextResponse } from "next/server";

import { firmar } from "@/lib/cloudinary/firma";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════════════════
// EL UNICO SITIO DEL PROYECTO DONDE EL CLIENTE DECIDE, y hay que saberlo.
// ═══════════════════════════════════════════════════════════════════════════
//
// En todo lo demas quien autoriza es RLS y el codigo de cliente es COMODIDAD:
// si quitar una comprobacion del cliente abre un agujero, la comprobacion
// estaba en el sitio equivocado.
//
// ACA NO SE CUMPLE, y no por descuido: este handler no habla con Postgres,
// habla con Cloudinary, y no hay ninguna politica detras que lo detenga. Sin la
// comprobacion de abajo, CUALQUIERA CON SESION obtiene firmas validas para subir
// lo que quiera a la cuenta de la universidad. QUITARLA ABRE UN AGUJERO DE
// VERDAD.
//
// EL DATO SI VIENE PROTEGIDO: la fila de `staff_members` se lee con la sesion de
// QUIEN LLAMA, y `staff_select_self` deja ver SOLO la propia. Lo que decide este
// archivo es que hacer con lo que la politica le deja leer.
//
// EL SECRETO NO SALE DE AQUI. `CLOUDINARY_API_SECRET` no lleva `NEXT_PUBLIC_` y
// no puede llevarlo: ese prefijo INLINEA la variable en el bundle del navegador
// (D-28), que es el defecto P0-4 con otro nombre. La respuesta devuelve `apiKey`,
// que es publica, pero NUNCA el secreto.

// SIN PARAMETRO `request`, Y ES UNA PROPIEDAD DE SEGURIDAD: este handler NO LEE
// NADA DEL CLIENTE. El `timestamp` lo pone el reloj del servidor y el `folder`
// sale del entorno, asi que el navegador no puede pedir una firma para otra
// carpeta ni para ningun parametro que se le ocurra.
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

  // `activo = true` no es decorativo: `private.is_admin()` tambien lo exige, asi
  // que un admin desactivado no debe conseguir una firma.
  const { data: staff } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", sub)
    .eq("activo", true)
    .maybeSingle();

  // 403 y no 404: la sesion es valida y la ruta existe; lo que falta es el
  // permiso. Y ESTE es el rechazo que cierra P0-4 -- un alumno con sesion
  // legitima pidiendo una firma.
  if (staff?.role !== "admin") {
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
      "[cloudinary/firma] Falta configuracion de Cloudinary en el entorno del servidor.",
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
