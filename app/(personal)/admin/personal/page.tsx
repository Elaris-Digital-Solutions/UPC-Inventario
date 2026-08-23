import { TablaPersonal } from "@/components/admin/tabla-personal";
import { listarPersonal } from "@/lib/admin/personal";
import { createClient } from "@/lib/supabase/server";
import { Antetitulo, TituloSeccion } from "@/components/antetitulo";

// /admin/personal (D-52, D-53).
//
// Server Component: la lectura del personal se hace aca, en el servidor, y
// el formulario de alta mas la tabla viven en un Client Component que recibe
// los datos ya traidos. Misma reparticion que
// app/(personal)/admin/dias/page.tsx con components/admin/panel-dias.tsx.
//
// TAMBIEN LEE QUIEN ESTA MIRANDO, y no solo el personal: la tabla necesita
// el `sub` de quien tiene la sesion para esconder, sobre su propia fila, los
// controles de cambiar rol y desactivar (ver el comentario de TablaPersonal
// mas abajo, en components/admin/tabla-personal.tsx). El layout de este
// grupo -- app/(personal)/admin/layout.tsx -- ya exige rol admin antes de
// llegar aca, asi que esto NO es una comprobacion de autorizacion: es la
// misma lectura que ya hacen cambiarRolPersonal() y cambiarActivoPersonal()
// (lib/admin/acciones.ts), del lado de lo que se PINTA y no de lo que se
// autoriza.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx y
// app/(personal)/admin/layout.tsx ya los montan.
export default async function PersonalPage() {
  const supabase = await createClient();

  const [personal, { data }] = await Promise.all([
    listarPersonal(),
    supabase.auth.getClaims(),
  ]);

  const sub = data?.claims.sub;

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Antetitulo>Administración</Antetitulo>
          <TituloSeccion como="h1">Personal</TituloSeccion>
        <p className="text-muted-foreground text-sm">
          Quién tiene acceso al mostrador y a la administración. Da de alta a alguien nuevo, cambia su rol
          o desactiva su acceso.
        </p>
      </div>

      <TablaPersonal personal={personal} miUserId={sub} />
    </main>
  );
}
