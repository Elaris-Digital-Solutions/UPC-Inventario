// Cliente de navegador: solo se usa en Client Components ('use client').
// El cliente de servidor vive en un archivo aparte porque su ciclo de vida
// es distinto (uno por peticion, nunca compartido). Ver lib/supabase/server.ts.
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )
}
