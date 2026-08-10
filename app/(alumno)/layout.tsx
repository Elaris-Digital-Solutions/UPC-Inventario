import { redirect } from "next/navigation";

import { CabeceraSesion } from "@/components/cabecera-sesion";
import { Pie } from "@/components/pie";
import { createClient } from "@/lib/supabase/server";

// Este si puede redirigir a /completar-perfil, a diferencia del layout de
// (perfil): esa ruta ya no esta debajo suyo, vive en su propio grupo. Ahi
// esta la diferencia con el bucle que describe el comentario de
// app/(perfil)/layout.tsx.
// Tipo escrito a mano y no LayoutProps<"/catalogo">, por el mismo motivo que
// en app/(perfil)/layout.tsx: los layouts de un grupo entre parentesis no
// aparecen en el LayoutRoutes que genera Next.
export default async function AlumnoLayout({
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
    .select("nombre, apellido, carrera_id")
    .eq("auth_user_id", sub)
    .maybeSingle();

  if (!alumno) {
    redirect("/auth/error");
  }

  if (!alumno.nombre || !alumno.apellido || !alumno.carrera_id) {
    redirect("/completar-perfil");
  }

  // CabeceraSesion y no Cabecera: aqui ya hay sesion comprobada arriba, asi
  // que la cabecera ensena Salir sin volver a preguntarlo. Ver el comentario
  // de components/cabecera-sesion.tsx.
  return (
    <>
      <CabeceraSesion />
      {children}
      <Pie />
    </>
  );
}
