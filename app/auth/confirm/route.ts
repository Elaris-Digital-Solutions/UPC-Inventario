import { type EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { destino } from '@/lib/auth/destino';
import { createClient } from '@/lib/supabase/server';

// LISTA BLANCA de los tipos de OTP. Hace falta en tiempo de EJECUCION: el tipo
// `EmailOtpType` termina en `(string & {})`, asi que a nivel de tipos admite
// cualquier cadena y el compilador no valida nada.
const TIPOS_VALIDOS = ['magiclink', 'signup', 'email'] as const;

// Location RELATIVO, sin nombrar el host, y con el destino armado aparte: el
// token_hash no sobrevive al salto. Ver el porque completo abajo.
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

  // El cast de abajo NO sustituye a la lista blanca de arriba: solo es lo que
  // exige el tipo del parametro de verifyOtp.
  //
  // ESTO ES UN ROUTE HANDLER, asi que escribir cookies SI esta permitido -el
  // catch vacio de lib/supabase/server.ts es para los Server Components-, y
  // verifyOtp deja la sesion puesta de verdad.
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash,
  });

  if (error) {
    return redirigirA('/auth/error', 'enlace');
  }

  // El reparto vive en un solo sitio, lib/auth/destino.ts; aqui solo se obedece.
  //
  // LAS DOS RAZONES DEL Location RELATIVO son distintas:
  //
  // 1. El destino se arma desde cero, asi que el token_hash -un secreto de un
  //    solo uso- no viaja en la URL de llegada, ni al historial, ni en el
  //    Referer hacia cualquier recurso externo de la pagina de destino.
  // 2. Las dos formas de construir uno absoluto emiten `localhost` aunque la
  //    peticion llegara a `127.0.0.1`. El navegador los trata como sitios
  //    distintos para las cookies, asi que cambiar de host a mitad del canje
  //    deja la sesion escrita en uno y al usuario aterrizando en el otro sin
  //    ella. Ver COMPORTAMIENTO_MEDIDO.md §3.
  return redirigirA(await destino());
}
