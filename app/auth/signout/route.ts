import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Solo POST, nunca GET. Un GET que cierra sesion lo dispara cualquier
// precarga del navegador, un rastreador de enlaces o una extension -todos
// asumen que un GET se puede repetir sin efectos-, y el usuario se
// encontraria fuera sin haber hecho nada. Cerrar sesion tiene efecto, asi que
// solo puede llegar por POST, disparado desde un formulario.
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 y no el 307 por defecto de NextResponse.redirect: un 307 conserva el
  // metodo de la peticion original, asi que el navegador volveria a hacer
  // POST contra "/", que no acepta POST y responderia 405. El 303 le dice al
  // navegador que rehaga la peticion como GET, que es justo lo que hace falta
  // despues de enviar un formulario.
  //
  // El Location va RELATIVO -sin nombrar el host-, mismo motivo medido que en
  // app/auth/confirm/route.ts: las dos formas de construir uno absoluto
  // -`new URL(request.url).origin` y `request.nextUrl`- emiten `localhost`
  // aunque la peticion haya llegado a `127.0.0.1`, y las cookies de sesion son
  // por host, asi que un Location absoluto mal resuelto deja al usuario en un
  // host sin la sesion que se acaba de cerrar en el otro.
  return new NextResponse(null, { status: 303, headers: { Location: '/' } });
}
