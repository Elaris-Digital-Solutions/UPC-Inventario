import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// Este layout NO autoriza nada, exactamente igual que app/(personal)/layout.tsx.
// Quien autoriza es private.is_admin() dentro de la base: las politicas
// *_admin_all de supabase/migrations/20260805195304_catalog_policies.sql le
// niegan la escritura a cualquiera que no sea admin, y lo hacen aunque este
// archivo no exista. Redirigir aca es COMODIDAD -que nadie se quede mirando
// una pantalla vacia sin entender por que-, no un control.
//
// Y esta MEDIDO, no deducido. El 2026-08-12, contra el stack local y por
// PostgREST -no por esta pantalla-, con JWT de alumno y de operador firmados a
// mano:
//
//   PATCH /rest/v1/products?id=eq....  ->  HTTP 200 con cuerpo `[]`
//
// Cero filas y NINGUN error: tienen el privilegio de columna -el GRANT es a
// `authenticated`, que los incluye a los dos- pero no tienen politica, asi que
// RLS los deja en cero en silencio. El mismo PATCH con JWT de admin devolvio
// la fila y movio `updated_at`, y el nombre del producto quedo intacto tras
// los tres intentos. Sin ese contraejemplo, "cero filas" no distinguiria una
// politica que bloquea de un PATCH malformado -que es justo el error que la
// T2A pago con tres sondas.
//
// Si borrar este archivo abriera un agujero, el agujero estaba en la base.
//
// AL MOSTRADOR Y NO A /auth/error, a diferencia del layout de (personal): un
// operador que llega aca no se equivoco de credenciales -las suyas son
// validas y su sesion es buena-, se equivoco de pantalla, y su sitio SI
// existe. Mandarlo a la pantalla de error le diria que algo se rompio.
//
// SIN CabeceraPersonal NI Pie: app/(personal)/layout.tsx ya los monta y este
// layout vive DENTRO de aquel. Ponerlos otra vez pintaria dos cabeceras, que
// es el mismo defecto que la T2A midio cuando notFound() dentro de un grupo
// renderizaba el 404 raiz dentro del layout del grupo.
//
// Tipo escrito a mano y no LayoutProps<...>, por el mismo motivo ya medido en
// app/(alumno)/layout.tsx, app/(perfil)/layout.tsx y app/(personal)/layout.tsx:
// los layouts de un grupo entre parentesis no aparecen en el LayoutRoutes que
// genera Next.
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

  // `activo = true` no es decorativo: private.is_admin() -el helper que usan
  // las politicas- tambien lo exige, asi que un admin desactivado no debe
  // entrar a una pantalla donde la base le negaria todo de todas formas.
  // Mismo criterio que ya aplican lib/auth/destino.ts y el layout de
  // (personal), copiado aca y no extraido como logica aparte.
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
