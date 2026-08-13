import { NextResponse } from "next/server";

import { firmar } from "@/lib/cloudinary/firma";
import { createClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════════════════
// EL UNICO SITIO DEL PROYECTO DONDE EL CLIENTE DECIDE, y hay que saberlo.
// ═══════════════════════════════════════════════════════════════════════════
//
// Todas las demas escrituras de esta aplicacion hablan con Postgres, asi que
// quien autoriza es RLS y el codigo de cliente es COMODIDAD. Esta escrito en
// app/(personal)/layout.tsx, en app/(personal)/admin/layout.tsx y en media
// docena de comentarios mas: si quitar una comprobacion del cliente abre un
// agujero, la comprobacion estaba en el sitio equivocado.
//
// ACA NO SE CUMPLE, y no por descuido: este handler NO habla con Postgres,
// habla con Cloudinary. No hay ninguna politica detras que lo detenga. Sin la
// comprobacion de abajo, CUALQUIERA CON SESION -- un alumno de primer ciclo --
// obtiene firmas validas para subir lo que quiera a la cuenta de Cloudinary de
// la universidad, y no hay RLS que lo salve.
//
// QUITAR ESTA COMPROBACION ABRE UN AGUJERO DE VERDAD. Es lo contrario de lo
// que dicen los layouts, y las dos afirmaciones son correctas en su sitio:
// alli hay RLS debajo, aca no hay nada.
//
// EL DATO SI VIENE PROTEGIDO POR UNA POLITICA, y esa parte no se reinventa: la
// fila de `staff_members` se lee con la sesion de QUIEN LLAMA, y
// `staff_select_self` (supabase/migrations/20260805194015_staff_policies.sql:17-19)
// deja ver SOLO la propia. Nadie puede hacerse pasar por otro leyendo esa
// tabla. Lo que decide este archivo es que hacer con lo que la politica le
// deja leer.
//
// EL SECRETO NO SALE DE AQUI. `CLOUDINARY_API_SECRET` no lleva prefijo
// `NEXT_PUBLIC_` y no puede llevarlo: en Next.js ese prefijo INLINEA la
// variable en el bundle del navegador (D-28), que es exactamente el defecto
// P0-4 con otro prefijo. La respuesta devuelve `apiKey` -- que es publica y
// viaja en la peticion de subida -- pero NUNCA el secreto.

// SIN PARAMETRO `request`, Y ESO ES UNA PROPIEDAD DE SEGURIDAD, no un
// descuido. Este handler NO LEE NADA DEL CLIENTE: el `timestamp` lo pone el
// reloj del servidor y el `folder` sale del entorno. El navegador no puede
// influir en lo que se firma, asi que no hay forma de que pida una firma para
// otra carpeta, otro `public_id` o cualquier parametro que se le ocurra.
//
// El linter marco `request` como no usado en la primera version y TENIA RAZON.
// La respuesta correcta no era esquivarlo -- la T3A ya retiro un
// `{role === "admin" && null}` escrito solo para callar a ESLint -- sino
// quitar el parametro y dejar dicho por que no hace falta.
export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  // 401 y no 403: sin sesion no se sabe QUIEN es, asi que la respuesta
  // correcta es "identificate", no "no puedes".
  //
  // ESTA RAMA ES INALCANZABLE DESDE FUERA, y esta MEDIDO: una peticion sin
  // sesion no llega hasta aca. `proxy.ts` usa LISTA BLANCA -- se declara lo
  // publico y todo lo demas pide sesion (T1) --, y `/api/cloudinary/firma` no
  // esta declarada, asi que el proxy contesta **307 a /login** antes de que
  // este handler exista. Comprobado el 2026-08-12 con curl, con y sin cabecera
  // `Origin`: 307 en los dos casos.
  //
  // NO SE ARREGLA metiendo `/api` en la lista blanca, y el criterio ya esta
  // sentado: la T2A se topo con lo mismo -- su 404 propio tampoco se alcanza
  // sin sesion -- y lo acepto escrito, porque la unica alternativa es que el
  // proxy deje pasar lo NO declarado, que es justo la propiedad que la T1
  // compro. Un 307 hacia una pantalla de login es una respuesta rara para un
  // `fetch()`, pero el unico cliente de este endpoint es la pantalla de admin,
  // que por definicion ya tiene sesion.
  //
  // Se deja igualmente escrita como defensa en profundidad: si algun dia
  // alguien agrega `/api` a la lista blanca, esta rama es lo que evita que el
  // cambio regale firmas a cualquiera.
  if (!sub) {
    return NextResponse.json({ error: "Hace falta iniciar sesión." }, { status: 401 });
  }

  // `activo = true` no es decorativo: private.is_admin() -- el helper que usan
  // las politicas -- tambien lo exige, asi que un admin desactivado no debe
  // conseguir una firma. Mismo criterio que los dos layouts.
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

  // 500 con un mensaje que NO nombra cual falta. Que la configuracion este
  // incompleta es un fallo del servidor, no del usuario, y enumerar las
  // variables ausentes le contaria a quien pregunte como se llama cada una.
  // El detalle va al log del servidor, donde solo lo lee quien opera.
  if (!cloudName || !apiKey || !apiSecret) {
    console.error(
      "[cloudinary/firma] Falta configuracion de Cloudinary en el entorno del servidor.",
    );
    return NextResponse.json(
      { error: "La subida de imágenes no está configurada en este entorno." },
      { status: 500 },
    );
  }

  // El `timestamp` lo pone EL SERVIDOR y no el cliente. Cloudinary rechaza una
  // firma cuyo timestamp se aleje demasiado de su reloj, asi que dejar que lo
  // mande el navegador solo agregaria una forma de que la subida falle por el
  // reloj de la maquina del admin.
  //
  // `Math.floor(Date.now() / 1000)` -- segundos, no milisegundos. Es la misma
  // trampa del epoch que ya costo un PGRST303 en la T3A, con otra cara: alli
  // era la zona horaria, aca la unidad.
  const timestamp = Math.floor(Date.now() / 1000);

  // Se firma EXACTAMENTE lo que la subida va a mandar, ni mas ni menos. Si el
  // navegador agregara un parametro firmable que no este aca, Cloudinary
  // calcularia otra firma y rechazaria -- por eso components/admin/subida-imagenes.tsx
  // (Task 5) manda solo estos.
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
