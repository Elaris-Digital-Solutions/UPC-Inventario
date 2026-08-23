import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'
import { construirCSP } from '@/lib/seguridad/csp'

// ESTE PROXY HACE EXACTAMENTE DOS COSAS: refrescar la cookie de sesion y
// redirigir de forma optimista al login cuando no hay sesion. NO ES UNA SOLUCION
// DE AUTORIZACION -la documentacion de Next.js 16 lo dice literal-. Quien
// autoriza es RLS; los layouts que ocultan una pantalla son comodidad.

// LISTA BLANCA A PROPOSITO: lo que no este declarado publico pide sesion, para
// que una pantalla nueva nazca protegida sin que nadie tenga que acordarse. Falla
// cerrada, y el precio es que abrir una ruta al publico sea un acto deliberado
// que se ve en el diff. Con lista negra, la pantalla que nadie recuerde añadir
// nace ABIERTA y no se entera nadie.
//
// Regla: cada pantalla publica nueva es una edicion de esta constante.
//
// OJO con '/manifest.webmanifest', que NO es una pantalla y entra igual: sin esta
// entrada el proxy lo rebota a /login con un 307 y la aplicacion no se puede
// instalar. NO se arregla iniciando sesion -el navegador lo pide sin
// credenciales- ni lo cubre el matcher, que excluye extensiones de imagen y no
// `.webmanifest`. Publicarlo no expone nada, y tiene que ser legible sin sesion
// por definicion: quien instala la aplicacion todavia no ha entrado.
const RUTAS_PUBLICAS = ['/', '/login', '/auth', '/faq', '/manifest.webmanifest']

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = construirCSP({
    nonce,
    esDesarrollo: process.env.NODE_ENV === 'development',
    urlSupabase: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  })

  // LA CSP VA POR LOS DOS LADOS, y no es redundancia. Next.js lee el nonce de la
  // cabecera DEL REQUEST al renderizar, para aplicarselo a los scripts que
  // genera; el navegador solo ve la DEL RESPONSE. Con solo la del response, las
  // paginas llegan con la cabecera correcta y los scripts SIN nonce, y la CSP los
  // bloquea todos: la aplicacion se rompe entera con el build en verde.
  const { response, claims } = await updateSession(request, {
    'x-nonce': nonce,
    'Content-Security-Policy': csp,
  })
  response.headers.set('Content-Security-Policy', csp)

  const pathname = request.nextUrl.pathname

  // '/' solo casa por IGUALDAD EXACTA: por prefijo, `startsWith('/')` es cierto
  // para cualquier ruta y toda la aplicacion quedaria publica sin querer. Las
  // demas si casan por prefijo, para cubrir subrutas como '/auth/callback'.
  const esPublica = RUTAS_PUBLICAS.some((ruta) =>
    ruta === '/' ? pathname === ruta : pathname === ruta || pathname.startsWith(ruta + '/'))

  if (!esPublica && claims === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirect = NextResponse.redirect(url)

    // UN REDIRECT RECIEN CREADO NACE VACIO y no hereda nada de `response`. Si
    // updateSession acaba de refrescar el token, ese Set-Cookie vive alli, y sin
    // copiarlo el refresco se pierde justo en la peticion que lo necesitaba.
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      redirect.cookies.set(name, value, options))
    redirect.headers.set('Cache-Control', 'private, no-store')
    // La CSP se copia por consistencia, no porque el destino la necesite: un 307
    // no lleva documento, y /login recibira la suya con su propio nonce.
    redirect.headers.set('Content-Security-Policy', csp)

    return redirect
  }

  return response
}

// Sin este matcher el proxy correria tambien sobre los assets, y esas peticiones
// no devuelven claims: se tratarian como si no hubiera sesion y bloquearian CSS,
// JS e imagenes en cada carga.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
