import { redirect } from "next/navigation";

import { CabeceraPersonal } from "@/components/cabecera-personal";
import { Pie } from "@/components/pie";
import { createClient } from "@/lib/supabase/server";

// Este layout NO autoriza nada. Quien autoriza es RLS: si un operador
// escribe a mano una URL de /admin/*, lo que lo detiene es private.is_admin()
// dentro de la base, no este archivo. Redirigir aqui es comodidad -que nadie
// se quede mirando una pantalla vacia sin entender por que-, no un control.
// Si borrar este layout abriera un agujero, el agujero estaba en la base.
//
// Tipo escrito a mano y no LayoutProps<...>, por el mismo motivo que ya
// midieron app/(alumno)/layout.tsx y app/(perfil)/layout.tsx: los layouts de
// un grupo entre parentesis no aparecen en el LayoutRoutes que genera Next.
export default async function PersonalLayout({
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

  // activo = true no es decorativo: private.current_staff_role() y
  // private.is_staff() -los helpers que usan las politicas RLS- tambien
  // exigen activo, asi que un miembro desactivado no debe entrar a una
  // pantalla donde la base le negaria todo de todas formas. Mismo criterio
  // que ya aplica lib/auth/destino.ts, copiado aqui y no repetido como logica
  // aparte.
  const { data: staff } = await supabase
    .from("staff_members")
    .select("role")
    .eq("user_id", sub)
    .eq("activo", true)
    .maybeSingle();

  if (!staff) {
    redirect("/auth/error");
  }

  return (
    <>
      <CabeceraPersonal role={staff.role} />
      {children}
      <Pie />
    </>
  );
}
