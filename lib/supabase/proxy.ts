import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/lib/database.types'

// Tipo de las claims que devuelve getClaims(), derivado del propio cliente
// tipado con Database en vez de importado a mano: @supabase/auth-js, donde
// vive JwtPayload, no es una dependencia directa del proyecto (solo llega
// via @supabase/supabase-js), y no hay razon para atarse a un paquete que
// package.json no declara pudiendo derivar el tipo del que si declara.
type SupabaseServerClient = ReturnType<typeof createServerClient<Database>>
type Claims = NonNullable<
  Awaited<ReturnType<SupabaseServerClient['auth']['getClaims']>>['data']
>['claims']

interface UpdateSessionResult {
  response: NextResponse
  claims: Claims | null
}

export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Las cookies tienen que volver por los dos lados. Al `request`
          // primero, para que esta misma peticion vea las cookies ya
          // actualizadas si algo mas adelante vuelve a leerlas; al
          // `response` despues (reconstruido desde ese `request`), para que
          // el navegador las reciba en el viaje de vuelta. Falta cualquiera
          // de los dos lados y la sesion se desincroniza.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options))
        },
      },
    },
  )

  // No se ejecuta NADA entre crear el cliente y llamar a getClaims(). Lo
  // exige la documentacion de Supabase: cualquier linea intermedia puede
  // dejar pasar el refresco de token antes de que el cliente este listo
  // para escribirlo, y el efecto es un cierre de sesion intermitente y al
  // azar, de los fallos mas caros de diagnosticar porque el sintoma nunca
  // apunta a la causa.
  const { data } = await supabase.auth.getClaims()

  // getClaims() y no getSession(). getSession() lee la cookie sin revalidar
  // la firma, y decidir con eso es otra vez el defecto P0-3 que esta fase
  // existe para cerrar, con otro nombre. Los propios tipos de la libreria
  // avisan de que el user que devuelve getSession() no debe considerarse de
  // fiar. (Decision D-25.)

  // Los refrescos de token escriben Set-Cookie en esta respuesta. Si la
  // aplicacion queda detras de un CDN o proxy inverso (Vercel, Netlify,
  // Cloudflare), una respuesta cacheada con la cookie de sesion de alguien
  // dentro se le serviria a otra persona. El aviso sale de los propios
  // tipos de @supabase/ssr 0.12.4.
  response.headers.set('Cache-Control', 'private, no-store')

  return { response, claims: data?.claims ?? null }
}
