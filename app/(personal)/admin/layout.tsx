import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// ESTE LAYOUT NO AUTORIZA NADA. Quien autoriza es `private.is_admin()` dentro de
// la base, y lo hace aunque este archivo no exista: un PATCH sin politica
// devuelve 200 con `[]` (COMPORTAMIENTO_MEDIDO.md §1.1). Redirigir aqui es
// COMODIDAD para que nadie se quede mirando una pantalla vacia. Si borrar este
// archivo abriera un agujero, el agujero estaba en la base.
//
// AL MOSTRADOR Y NO A /auth/error, al reves que el layout de (personal): un
// operador que llega aqui no se equivoco de credenciales, se equivoco de
// pantalla, y su sitio SI existe.
//
// SIN CabeceraPersonal NI Pie: el layout de arriba ya los monta, y ponerlos otra
// vez pintaria dos cabeceras.
//
// Tipo escrito a mano y no `LayoutProps<...>`: los layouts de un grupo entre
// parentesis no aparecen en el LayoutRoutes que genera Next.
export default async function AdminLayout({
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

  // `activo = true` no es decorativo: `private.is_admin()` tambien lo exige, asi
  // que un admin desactivado no debe entrar donde la base le negaria todo.
  const { data: staff } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", sub)
    .eq("activo", true)
    .maybeSingle();

  if (staff?.role !== "admin") {
    redirect("/mostrador");
  }

  return <>{children}</>;
}
