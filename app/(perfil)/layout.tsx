import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Este grupo existe por una sola razon: un layout de servidor no puede
// redirigir a una ruta que el mismo cubre. Si /completar-perfil viviera bajo
// (alumno), cuyo layout manda a /completar-perfil cuando el perfil esta
// incompleto, pedir esa ruta con el perfil incompleto ejecutaria ese mismo
// layout, que veria el perfil incompleto otra vez y volveria a redirigir a
// /completar-perfil. Bucle infinito. Y no se arregla exceptuando la ruta
// dentro del layout, porque un layout de servidor no recibe la ruta actual:
// no hay pathname en un Server Component para comparar contra nada.
//
// Por eso /completar-perfil vive en su propio grupo (perfil), que pide
// sesion y fila en alumnos pero NO exige el perfil completo -esa exigencia
// es justo lo que provocaria el bucle.
// El tipo va escrito a mano y no con LayoutProps<...>, que es lo que usa
// app/layout.tsx. Medido en .next/types/routes.d.ts: `type LayoutRoutes = "/"`,
// o sea que Next.js solo genera ese tipo para los layouts que ocupan un
// segmento de URL. Un grupo entre parentesis no aporta segmento -este layout
// CUBRE /completar-perfil pero no ES esa ruta-, asi que no aparece ahi y
// LayoutProps<"/completar-perfil"> no compila.
export default async function PerfilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  if (!sub) {
    redirect("/login");
  }

  const { data: alumno } = await supabase
    .from("alumnos")
    .select("id")
    .eq("auth_user_id", sub)
    .maybeSingle();

  if (!alumno) {
    redirect("/auth/error");
  }

  return children;
}
