import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

// El tipo de las claims se DERIVA del cliente tipado en vez de importarse:
// @supabase/auth-js, donde vive JwtPayload, no es una dependencia directa de
// package.json -solo llega via @supabase/supabase-js-.
type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>
type Claims = NonNullable<
  Awaited<ReturnType<SupabaseServerClient['auth']['getClaims']>>['data']
>['claims']

interface UpdateSessionResult {
  response: NextResponse
  claims: Claims | null
}

export async function updateSession(
  request: NextRequest,
  cabecerasExtra: Record<string, string> = {},
): Promise<UpdateSessionResult> {
  // ES UNA FUNCION Y NO UNA VARIABLE guardada una sola vez: `setAll` hace
  // `request.cookies.set(...)` antes de reconstruir la respuesta, y eso cambia la
  // cabecera `cookie` del request. Una copia tomada al principio seria anterior a
  // las cookies nuevas y se perderia la propagacion de la sesion refrescada.
  const cabecerasDelRequest = () => {
    const cabeceras = new Headers(request.headers)
    for (const [clave, valor] of Object.entries(cabecerasExtra)) {
      cabeceras.set(clave, valor)
    }
    return cabeceras
  }

  let response = NextResponse.next({ request: { headers: cabecerasDelRequest() } })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // LAS COOKIES VUELVEN POR LOS DOS LADOS: al `request` para que esta
          // misma peticion las vea actualizadas, y al `response` para que las
          // reciba el navegador. Falta cualquiera y la sesion se desincroniza.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request: { headers: cabecerasDelRequest() } })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    },
  )

  // NO SE EJECUTA NADA entre crear el cliente y llamar a getClaims(): cualquier
  // linea intermedia puede dejar pasar el refresco de token antes de que el
  // cliente pueda escribirlo, y el sintoma es un cierre de sesion intermitente
  // que nunca apunta a su causa.
  //
  // getClaims() y no getSession() (D-25): getSession() lee la cookie sin
  // revalidar la firma, y decidir con eso es el defecto P0-3 con otro nombre.
  const { data } = await supabase.auth.getClaims()

  // Los refrescos escriben Set-Cookie aqui. Detras de un CDN, una respuesta
  // cacheada con la cookie de sesion de alguien dentro se le serviria a otro.
  response.headers.set('Cache-Control', 'private, no-store')

  return { response, claims: data?.claims ?? null }
}
