import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { destino } from '@/lib/auth/destino';
import { createClient } from '@/lib/supabase/server';

// Lista blanca de los tipos de OTP que este sistema reconoce. El tipo
// EmailOtpType de la libreria termina en `(string & {})` -un truco para dar
// autocompletado sin cerrar el conjunto de valores posibles-, asi que a nivel
// de TIPOS admite cualquier cadena: `'basura' as EmailOtpType` compilaria sin
// quejarse. El compilador no valida esto: la comprobacion tiene que hacerse
// en tiempo de ejecucion, contra esta lista literal.
const TIPOS_VALIDOS = ['magiclink', 'signup', 'email'] as const;

// Redirige con un Location RELATIVO, sin nombrar el host. La ruta de destino
// se arma aparte y nunca arrastra el query de entrada, asi que el token_hash
// no sobrevive al salto.
function redirigirA(pathname: string, motivo?: string) {
  const destino = motivo ? `${pathname}?motivo=${motivo}` : pathname;
  return new NextResponse(null, { status: 307, headers: { Location: destino } });
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  // Falta de dato es mas fundamental que dato invalido, asi que se comprueba
  // primero: sin token_hash no hay nada que canjear, sea cual sea el type.
  if (!token_hash) {
    return redirigirA('/auth/error', 'incompleto');
  }

  if (!type || !(TIPOS_VALIDOS as readonly string[]).includes(type)) {
    return redirigirA('/auth/error', 'tipo');
  }

  // A partir de aqui `type` ya paso la lista blanca en tiempo de ejecucion,
  // que es la unica comprobacion real: el cast de abajo no la sustituye, solo
  // es lo que exige el tipo del parametro de verifyOtp.
  //
  // createClient() escribe la sesion en la cookie a traves de cookies() de
  // next/headers. El catch vacio que hay en lib/supabase/server.ts es para
  // cuando lo llama un Server Component, que se renderiza en modo lectura y
  // no puede escribir cookies. ESTO es un Route Handler: aqui escribir
  // cookies si esta permitido, asi que verifyOtp deja la sesion puesta de
  // verdad y no hay que compensarlo en ningun otro sitio.
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash,
  });

  if (error) {
    return redirigirA('/auth/error', 'enlace');
  }

  // El reparto vive en un solo sitio, lib/auth/destino.ts; aca solo se
  // obedece. Cualquier logica de a donde va cada perfil se escribe alli, no
  // aca ni en ningun otro punto de entrada.
  //
  // redirigirA no nombra el host, y las dos razones son distintas:
  //
  // 1. El destino se arma desde cero, asi que el token_hash no viaja en la
  //    URL de llegada. Es un secreto de un solo uso: si sobreviviera al salto
  //    quedaria en el historial del navegador y viajaria en la cabecera
  //    Referer a cualquier recurso externo que cargue la pagina de destino.
  // 2. El Location es RELATIVO. Se probaron antes las dos formas de construir
  //    uno absoluto -`new URL(request.url).origin` y `request.nextUrl`- y las
  //    DOS emiten `localhost` aunque la peticion haya llegado a `127.0.0.1`.
  //    Medido, no supuesto. El navegador trata esos dos como sitios distintos
  //    para las cookies, asi que cambiar de host a mitad del canje deja la
  //    sesion escrita en un host y al usuario aterrizando en el otro sin ella.
  //    Un Location relativo no puede equivocarse de host porque no lo nombra.
  return redirigirA(await destino());
}
