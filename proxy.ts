import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Este proxy hace EXACTAMENTE DOS COSAS: refrescar la cookie de sesion (via
// updateSession) y redirigir de forma optimista al login cuando no hay
// sesion. NO es una solucion de autorizacion. La documentacion de Next.js 16
// lo dice literal: "it should not be used as a full session management or
// authorization solution" (node_modules/next/dist/docs/01-app/01-getting-
// started/16-proxy.md). Quien autoriza de verdad es RLS en la base de
// datos; el proxy solo redirige, y los layouts que ocultan una pantalla son
// comodidad, no control.

// Lista blanca a proposito: lo que no este declarado publico pide sesion,
// para que una pantalla nueva nazca protegida sin que nadie tenga que
// acordarse de anadirla aqui. Falla cerrada.
//
// Y este es el precio de esa propiedad, cobrado por primera vez en la tanda
// 2A: '/faq' figura como publica en el diseno desde que se escribio, pero sin
// esta linea rebotaba a /login como cualquier otra. NO es un defecto. Es que
// abrir una ruta al publico tiene que ser un acto deliberado, que se ve en el
// diff y que alguien revisa. Con lista negra, la pantalla que nadie se acuerde
// de anadir nace ABIERTA y no se entera nadie.
//
// Regla: cada pantalla publica nueva es una edicion de esta constante.
const RUTAS_PUBLICAS = ['/', '/login', '/auth', '/faq']

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  // La entrada '/' solo puede casar por IGUALDAD EXACTA. Si se comparara
  // tambien por prefijo, pathname.startsWith('/') es cierto para cualquier
  // ruta de la aplicacion y toda ella quedaria publica sin querer. Las
  // demas entradas si casan por prefijo (mas '/'), para cubrir subrutas
  // como '/auth/callback'.
  const esPublica = RUTAS_PUBLICAS.some((ruta) =>
    ruta === '/' ? pathname === ruta : pathname === ruta || pathname.startsWith(ruta + '/'))

  if (!esPublica && claims === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirect = NextResponse.redirect(url)

    // Un NextResponse.redirect() recien creado nace vacio: no hereda nada
    // de `response`. Si updateSession acaba de refrescar el token, ese
    // Set-Cookie vive en `response` y no en `redirect`; sin copiarlo aqui,
    // el refresco se pierde justo en la peticion que lo necesitaba y la
    // sesion puede caerse sin motivo aparente. Lo mismo con Cache-Control:
    // sin ella, un CDN podria servirle esta respuesta de otra persona.
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      redirect.cookies.set(name, value, options))
    redirect.headers.set('Cache-Control', 'private, no-store')

    return redirect
  }

  return response
}

// Sin este matcher, el proxy correria tambien sobre _next/static,
// _next/image y los assets sueltos de public/, y esas peticiones no
// devuelven claims: se tratarian como si no hubiera sesion y bloquearian
// CSS, JS e imagenes en cada carga.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
