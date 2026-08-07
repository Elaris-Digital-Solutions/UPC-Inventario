import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

// Esto es una FUNCION y jamas una constante de modulo. Un cliente de
// servidor lleva dentro las cookies de UNA peticion; un singleton en el
// ambito del modulo se comparte entre peticiones concurrentes y termina
// sirviendole a un alumno la sesion de otro. Es el fallo mas grave que esta
// fase puede introducir sin tocar una sola politica de la base de datos.
// (Decision D-24 del proyecto.)
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
            // Un Server Component no puede escribir cookies (se renderiza en
            // modo lectura). Quien las escribe de verdad es el proxy, en
            // lib/supabase/proxy.ts, que corre antes en cada peticion. Este
            // fallo es esperado y no un descuido: por eso el catch se deja
            // vacio a proposito.
          }
        },
      },
    },
  )
}
