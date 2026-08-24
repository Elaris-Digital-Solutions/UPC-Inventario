import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

// ES UNA FUNCION Y JAMAS UNA CONSTANTE DE MODULO (D-24). Un cliente de servidor
// lleva dentro las cookies de UNA peticion; un singleton se comparte entre
// peticiones concurrentes y termina sirviendole a un alumno la sesion de otro.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options))
          } catch {
            // Un Server Component no puede escribir cookies: se renderiza en
            // modo lectura. Quien las escribe es el proxy, que corre antes en
            // cada peticion. El fallo es esperado, y por eso el catch va vacio
            // a proposito. En un Route Handler si esta permitido.
          }
        },
      },
    },
  )
}
