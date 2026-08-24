import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// SOLO POST, NUNCA GET: un GET que cierra sesion lo dispara cualquier precarga
// del navegador o extension -todos asumen que un GET se repite sin efectos-, y
// el usuario se encontraria fuera sin haber hecho nada.
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // 303 y no el 307 por defecto: un 307 conserva el metodo, asi que el navegador
  // volveria a hacer POST contra "/", que responderia 405. El 303 le dice que
  // rehaga la peticion como GET.
  //
  // Location RELATIVO, mismo motivo que en app/auth/confirm/route.ts.
  return new NextResponse(null, { status: 303, headers: { Location: '/' } });
}
